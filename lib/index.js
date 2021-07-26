/* eslint-disable no-unused-vars */
const polyfill = require('@babel/polyfill');
const $ = (window.$ = window.jQuery = require('jquery'));
const _ = (window._ = require('underscore'));
const marked = (window.marked = require('marked'));
const Story = (window.Story = require('./Story.js'));
const Passage = (window.Passage = require('./Passage.js'));
require('./Misc.js');
require('./axios.js');
/* eslint-enable no-unused-vars */

// used this as guide for formfields setup
// https://codepen.io/john-cheesman/pen/rVbNrJ

$(function () {
  // set once at beginning
  window.witch = {};
  window.witch.setStartTime = function () {
    window.witch.startTime = Date.now();
  };

  // default config options to be overwritten by user JS
  window.config = {
    postURL: undefined,
    captchaURL: undefined,
    captchaKey: undefined,
    enablePreview: false,
    backupEmail: undefined,
    enableCaptcha: false,
    overrideSpamFilters: false,
    allowUploads: false
  };

  const storySetup = function () {
    const passages = $('.passage');
    if (passages.length > 0) {
      passages.fadeOut(500, function () {
        $('tw-story').empty();
        window.story = new Story($('tw-storydata'));
        window.story.start($('tw-story'));
      });
    } else {
      $('tw-story').empty();
      window.story = new Story($('tw-storydata'));
      window.story.start($('tw-story'));
    }
  };

  const windowSetup = function () {
    // set the start time
    window.witch.setStartTime();
    // set an empty form data array
    window.witch.formdata = [];
  };

  const formSetup = function () {
    /**
     * @param {string} key - name of field to be updated in formdata
     * @param {string} value - value of field to be updated in formdata
     */
    function updateFormdata (key, value) {
      const fieldIndex = window.witch.formdata.findIndex(
        (formObj) => Object.keys(formObj)[0] === key
      );
      if (fieldIndex === -1) {
        window.witch.formdata.push({ [key]: value });
      } else {
        window.witch.formdata[fieldIndex][key] = value;
      }
    }

    /**
     *
     */
    function detectFormfields () {
      const formfields = $('[data-bind]');
      formfields.on('change', function (e) {
        const $this = $(this);
        $this.removeClass('input-error');
        $this.parent().children('.error').addClass('error-hidden');
        if ($this.attr('type') === 'checkbox') {
          updateFormdata(
            $this.data('bind'),
            $this.prop('checked') === true
          );
        } else if ($this.attr('type') === 'file') {
          updateFormdata($this.data('bind'), $this.prop('files')[0]);
        } else {
          updateFormdata($this.data('bind'), $this.val() || '');
        }

        $(document).trigger('updateDisplay');
      });

      //  Add a reference to each bindable element in viewData.
      formfields.each(function () {
        const $this = $(this);
        if ($this.attr('type') === 'checkbox') {
          updateFormdata(
            $this.data('bind'),
            $this.prop('checked') === true
          );
        } else updateFormdata($this.data('bind'), '');
      });
    }

    // Trigger this event to manually update the list of bindable elements, useful when dynamically loading form fields.
    $(document).on('updateFormfields', detectFormfields);

    detectFormfields();

    // $('.formfield').val(function () {

    // })
    // $('.formfield').on('change', function (event) {

    // })
  };

  const addSubmitFunctionality = function () {
    const submits = $('[data-submit]');
    submits.on('click', function (e) {
      e.stopPropagation();
      // should this below be moved to send email func? probably
      if (window.config.enablePreview === false) {
        window.sendEmail(e, $(this).data('submit'));
      } else {
        // console.log(
        //    "preview is true, would have submitted ",
        //    $(this).data("submit")
        // );
        const formfields = $('[data-bind]');
        let prevent = false;
        formfields.each(function () {
          const $this = $(this);
          if ($this.prop('required') === true) {
            if (!$this.val()) {
              $this.addClass('input-error');
              $this
                .parent()
                .children('.error')
                .removeClass('error-hidden');
              prevent = true;
            }
          }
        });
        if (prevent === false) {
          const destination = $(e.target).data('passage');
          $('.passage').fadeOut(500, function () {
            window.story.show(destination);
            $('.passage').fadeIn(500);
          });
        }
      }
    });
  };

  const hideStartAgainIfStart = function () {
    const startAgainButton = $('#startagain');

    if (window.story.startPassage === window.passage.id) {
      startAgainButton.addClass('hidden').removeClass('not-hidden');
    } else {
      startAgainButton.removeClass('hidden').addClass('not-hidden');
    }
  };

  const animationSetup = function () {
    const passage = $('tw-passage');
    passage.on('click', 'a[data-passage]', function (e) {
      const formfields = $('[data-bind]');
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
        const destination = $(e.target).data('passage');
        $('.passage').fadeOut(500, function () {
          window.story.show(destination);
          $('.passage').fadeIn(500);
        });
      }
      e.stopPropagation();
    });
  };

  const afterInit = function () {
    windowSetup();
    formSetup();
    addSubmitFunctionality();
    hideStartAgainIfStart();
    animationSetup();
  };

  const init = function () {
    $('tw-story').one('sm.passage.shown', function () {
      $('.passage').hide(0).fadeIn(500);
      afterInit();
    });
    storySetup();
  };

  init();

  $('#startagain').on('click', init);
  $(document).on('sm.passage.shown', formSetup);
  $(document).on('sm.passage.shown', addSubmitFunctionality);
  $(document).on('sm.passage.shown', hideStartAgainIfStart);
  // $(document).on("sm.passage.shown", function (e) {
  //    console.log("passage shown", window.witch, window.config);
  // });
});

// when formfield, set value in global object and bind to input field
// when checkbox, set value in global object and bind to input field
