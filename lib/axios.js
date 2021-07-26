const axios = require('axios');

/**
 * Simple function to determine whether formdata has uploads that need encoding
 *
 * @param {Array} formdata - array of formdata from window.witch
 * @returns {boolean} - true if formdata contains uploads
 */
function doesFormdataHaveUploads (formdata) {
  const uploads = formdata.filter(
    (formfield) =>
      Object.keys(formfield)[0] === 'upload' && formfield.upload !== ''
  );
  return uploads.length > 0;
}

/**
 * Function to take an array of form data and encode the parts that need encoding
 *
 * @param {Array} formdata - array of formdata from window.witch
 * @returns {Promise} - array of promises for uploads that need converting to base64
 */
function getBase64 (formdata) {
  const promiseArray = formdata
    .map((field, fieldIndex) => {
      if (field.upload !== undefined && field.upload !== '') {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(field.upload);
          reader.onload = () =>
            resolve({
              name: field.upload.name,
              file: reader.result,
              index: fieldIndex
            });
          reader.onerror = (error) => {
            reject(error);
          };
        });
      } else return '';
    })
    .filter((field) => field !== '');
  return Promise.all(promiseArray);
}

/**
 * Function that processes the submit data string into parameters to send to the submit endpoint
 *
 * @param {string} string - string of data to be processed
 * @returns {object} - object of data to send to the endpoint
 */
function getData (string) {
  const splitParams = string.split(';');

  // Construct an array of parameters to be added to the object
  let submitParams;
  if (splitParams.length === 1 && splitParams[0].includes(':') === false) {
    submitParams = [{ sendTo: splitParams[0] }];
  } else {
    submitParams = splitParams.map((param) => {
      if (param.includes(':')) {
        const splitParam = param.split(':');
        if (splitParam.length > 2) {
          $.event.trigger('sm.story.error', [
            null,
            {
              name: 'SUBMIT ERROR',
              message:
                        'Submit syntax has too many :, check for param ' + param
            },
            'submit'
          ]);
          return { [splitParam[0]]: splitParam[1] };
          // this needs to be error handled better
        } else return { [splitParam[0]]: splitParam[1] };
      } else {
        return { [param]: true };
      }
    });
  }

  // Construct the object to send
  const paramObj = {};
  submitParams.forEach((param) =>
    Object.keys(param).forEach((key) => (paramObj[key] = param[key]))
  );

  // Return the object
  return paramObj;
}

/**
 * Function to check the start time and honeypot field values
 * Returns true if it passes, returns false if it fails the conditions
 *
 * @param {number} startTime - start time to compare
 * @param {string} honeypotValue - value of the honeypot field
 * @returns {boolean} - true if it passes the time and honeypot test, false if it fails one
 */
function doesItPass (startTime, honeypotValue) {
  if (Date.now() - startTime < 10000) return false;
  else if (honeypotValue !== '') return false;
  else return true;
  // if time now is less than 10 seconds after start time
  // or if honeypot value is not empty string
  // return false
  // else return true
}

window.sendEmail = function (e, data) {
  e.stopPropagation();
  const postURL = window.config.postURL;

  if (postURL === undefined) {
    $.event.trigger('sm.story.error', [
      null,
      {
        name: 'POST ERROR',
        message:
               'window.config.postURL undefined and preview set to false! Either set preview to true or set a window.config.postURL to send the message to'
      },
      'submit'
    ]);
  }

  /**
   * @param {object} body - body to post
   * @returns {Promise} - promise that posts the body with axios
   */
  function postBody (body) {
    const tagsToReplace = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;'
    };

    /**
     * @param {string} tag  - tag to replace
     * @returns {string} - replaced tag
     */
    function replaceTag (tag) {
      return tagsToReplace[tag] || tag;
    }

    /**
     * @param {string} str - string to escape
     * @returns {string} - escaped string
     */
    function escapeString (str) {
      if (typeof str === 'boolean') return str;
      return str.replace(/[&<>]/g, replaceTag);
    }

    const destination = $(e.target).data('passage');
    const sanitisedBody = escapeString(JSON.stringify(body));
    return axios
      .post(postURL, sanitisedBody)
      .then(function () {
        $('#loading').addClass('hidden');
        window.story.show(destination);
        $('.passage').fadeIn(500);
      })
      .catch(function (err) {
        $('#loading').addClass('hidden');
        $.event.trigger('sm.sending.error', [
          err,
          {
            name: 'POST ERROR',
            message: 'Error sending email - email was not sent'
          },
          'submit'
        ]);
        // console.dir(err);
        // console.log(err);
        // console.error(err);
      });
  }

  /**
   * @returns {Promise} - returns a promise which converts uploads if necessary then posts body, or just posts body
   */
  function convertUploadsAndPost () {
    if (doesFormdataHaveUploads(window.witch.formdata) === false) {
      const body = { ...getData(data), formData: window.witch.formdata };
      return postBody(body);
    } else {
      return getBase64(window.witch.formdata).then(function (
        encodedFileArray
      ) {
        encodedFileArray.forEach((file) => {
          window.witch.formdata[file.index].upload = {
            file: file.file,
            name: file.name
          };
        });
        const body = { ...getData(data), formData: window.witch.formdata };
        return postBody(body);
      });
    }
  }

  // Check the formfields that are currently on the submit page
  // to validate etc.
  const formfields = $('[data-bind]');
  const honeypotValue = $('#name-123').val();
  let prevent = false;
  formfields.each(function () {
    const $this = $(this);
    if ($this.prop('required') === true) {
      if (!$this.val()) {
        $this.addClass('input-error');
        $this.parent().children('.error').removeClass('error-hidden');
        prevent = true;
      }
    }
  });
  if (prevent === false) {
    $('.passage').fadeOut(500, function () {
      $('#startagain').removeClass('not-hidden');
      $('#startagain').addClass('hidden');
      /**
       *
       */
      function loop () {
        const loading = $('#loading');
        if (loading.hasClass('hidden')) return;
        loading.fadeToggle('slow', 'swing', function () {
          loop();
        });
      }

      $('#loading').removeClass('hidden');
      loop();

      if (window.config.overrideSpamFilters === true) {
        return convertUploadsAndPost();
      } else {
        if (doesItPass(window.witch.startTime, honeypotValue) === false) {
          if (window.config.enableCaptcha === true) {
            const siteKey = window.config.captchaKey;
            const validateURL = window.config.captchaURL;

            if (siteKey === undefined || validateURL === undefined) {
              $('#loading').addClass('hidden');
              $.event.trigger('sm.story.error', [
                null,
                {
                  name: 'CAPTCHA ERROR',
                  message:
                              'window.config.enableCaptcha is true but window.config.captchaURL and window.config.captchaKey both need to be setup to allow captcha security'
                },
                'submit'
              ]);
            } else {
              $('#loading').addClass('hidden');
              $('tw-passage').html(
                '<p>Please fill in the captcha below in order to send the message and to prove you are not spam.</p><div class="h-captcha" data-callback="validateToken" data-sitekey="' +
                           siteKey +
                           '"></div><script src="https://hcaptcha.com/1/api.js" async defer></script>'
              );
              $('.passage').fadeIn(500);
              $(window).one('captcha.answer', (event, isValid) => {
                if (isValid === 'true' || isValid === true) {
                  $('tw-passage').empty();
                  $('#loading').removeClass('hidden');
                  loop();
                  return convertUploadsAndPost();
                } else {
                  $('tw-story').html(
                    '<h3>Spam detected</h3><p>You have failed the CAPTCHA. Unfortunately we have determined your message is spam, if this is not the case please try again.</p>'
                  );
                }
              });
            }
            // if enableCaptcha is true
            // check if captchaURL and captchaKey are defined
            // if not, throw a sending error
            // if they are defined, load the captcha and validate it
            // if it is validated, allow sending to progress
            // if not, put a message saying spam has been detected

            // if enableCaptcha is false
            // check if overrideSpamFilters is true or false
            // if false, put a message saying spam has been detected
            // if true, send message anyway
          } else {
            $('#loading').addClass('hidden');
            $('tw-story').html(
              '<h3>Spam detected</h3><p>Unfortunately we have identified this message as spam so we are not able to send this email. If this is an error, please try again.</p>'
            );
          }
        } else convertUploadsAndPost();
      }
    });
  }
  //  else console.log("prevent is true");
};

window.validateToken = function (token) {
  const validateURL = window.config.captchaURL;
  return axios
    .post(validateURL, {
      token,
      siteKey: window.config.captchaKey
    })
    .then((res) => {
      // console.log(res);
      // console.log(res.data);
      // console.log(typeof res.data);
      $.event.trigger('captcha.answer', [res.data]);
    })
    .catch((err) => {
      // console.log(err);
      $.event.trigger('sm.story.error', [
        err,
        {
          name: 'CAPTCHA ERROR',
          message:
                  'There has been an error verifying your CAPTCHA. The service may be down. Please try again.'
        },
        'submit'
      ]);
    });
};
