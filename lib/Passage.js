/**
 * An object representing a passage. The current passage will be `window.passage`
 *
 * @class Passage
 */

class Passage {
  constructor (id, name, tags, source) {
    // Test for jQuery
    if (!(typeof $ !== 'undefined' && $ !== null)) {
      throw new Error("Global '$' not defined!");
    }

    // Test for underscore
    if (!(typeof _ !== 'undefined' && _ !== null)) {
      throw new Error("Global '_' not defined!");
    }

    // Test for marked
    if (!(typeof marked !== 'undefined' && marked !== null)) {
      throw new Error("Global 'marked' not defined!");
    }

    /**
     * @property {number} id - id number of passage
     * @type {number}
     */

    this.id = id || 1;

    /**
     * @property {string} name - The name of passage
     * @type {string}
     */

    this.name = name || 'Default';

    /**
     * @property {Array} tags - The tags of the passage.
     * @type {Array}
     */

    this.tags = tags || [];

    /**
     * @property {string} source - The passage source code.
     * @type {string}
     */

    this.source = _.unescape(source);
  }

  /**
   * Produce HTML from Markdown input
   *
   * @function render
   * @param {string} source - Source to parse
   */

  render (source) {
    // Test if 'source' is defined or not
    if (!(typeof source !== 'undefined' && source !== null)) {
      // Assume that 'this.source' is the correct source
      source = this.source;
    }

    let result = '';

    try {
      result = _.template(source)({ s: window.story.state, $: $ });
    } catch (error) {
      $.event.trigger('sm.story.error', [
        null,
        error,
        'Passage.render() using _.template()'
      ]);
    }

    /**
     * An internal helper function that converts markup like #id.class into HTML
     * attributes.
     *
     * @function renderAttrs
     * @private
     * @param {string} attrs - an attribute shorthand, i.e. #myId.className. There are
     *  two special leading prefixes: - (minus) will hide an element, and 0 will
     *  give it a href property that does nothing.
     * @returns {string} HTML source code
     */
    function renderAttrs (attrs) {
      let result = '';

      for (let i = 0; attrs[i] === '-' || attrs[i] === '0'; i++) {
        switch (attrs[i]) {
          case '-':
            result += 'style="display:none" ';
            break;

          case '0':
            result += 'href="javascript:void(0)" ';
            break;
        }
      }

      const classes = [];
      let id = null;
      /* eslint-disable no-useless-escape */
      const classOrId = /([#\.])([^#\.]+)/g;
      /* eslint-enable no-useless-escape */
      let matches = classOrId.exec(attrs);

      while (matches !== null) {
        switch (matches[1]) {
          case '#':
            id = matches[2];
            break;

          case '.':
            classes.push(matches[2]);
            break;
        }

        matches = classOrId.exec(attrs);
      }

      if (id !== null) {
        result += 'id="' + id + '" ';
      }

      if (classes.length > 0) {
        result += 'class="' + classes.join(' ') + '"';
      }

      return result.trim();
    }

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

    /**
     * Transform class, ID, hidden, and link shorthands in HTML tags.
     * <a-0.class#id> becomes
     * <a href="javascript:void(0)" style="display: none" class="class" id="id">
     */

    /* eslint-disable no-useless-escape */
    result = result.replace(
      /<([a-z]+)([\.#\-0].*?)(?=[\s>])/gi,
      function (match, tagName, attrs) {
        return '<' + tagName + ' ' + renderAttrs(attrs);
      }
    );
    /* eslint-enable no-useless-escape */

    // look into modding this for 'answers'
    /* [[links]] with extra markup {#id.class} */
    result = result.replace(
      /\[\[(.*?)\]\]\{(.*?)\}/g,
      function (match, target, attrs) {
        let display = target;

        /* display|target format */

        const barIndex = target.indexOf('|');

        if (barIndex !== -1) {
          display = target.substr(0, barIndex);
          target = target.substr(barIndex + 1);
        } else {
          /* display->target format */

          const rightArrIndex = target.indexOf('->');

          if (rightArrIndex !== -1) {
            display = target.substr(0, rightArrIndex);
            target = target.substr(rightArrIndex + 2);
          } else {
            /* target<-display format */

            const leftArrIndex = target.indexOf('<-');

            if (leftArrIndex !== -1) {
              display = target.substr(leftArrIndex + 2);
              target = target.substr(0, leftArrIndex);
            }
          }
        }

        return (
          '<a href="javascript:void(0)" data-passage="' +
               target +
               '" ' +
               renderAttrs(attrs) +
               '>' +
               display +
               '</a>'
        );
      }
    );

    /* QUESTIONS (creates a p with .question class) */
    result = result.replace(
      /QUESTION:([\s\S]+?)\/QUESTION/g,
      function (match, target) {
        const question = target;
        return '<p class="question">' + question + '</p>';
      }
    );

    /* REDIRECTS (creates a button with with a .redirect class that links to URL in new tab) */
    result = result.replace(
      /REDIRECT:([\s\S]+?)\/REDIRECT/g,
      function (match, target) {
        const textMatch = target.match(/\[[\s\S]+?\]/)[0];
        const text = textMatch.slice(1, -1);
        const linkMatch = target.match(/\([\s\S]+?\)/)[0];
        const link = linkMatch.slice(1, -1);
        return (
          '<p class="redirect-container"><a href="' +
               link +
               '" class="redirect" target="_blank">' +
               text +
               '<span class="redirect-arrow">↗</span></a></p>'
        );
      }
    );

    /* FORMFIELDS (creates a formfield linked to a variable in state) */
    result = result.replace(
      /FORMFIELD:([\s\S]+?)\/FORMFIELD/g,
      function (match, target) {
        const textMatch = target.match(/\[[\s\S]+?\]/)[0];
        const text = textMatch.slice(1, -1);
        const varMatch = target.match(/\{[\s\S]+?\}/)[0];
        const variable = varMatch.slice(1, -1);
        const typeRegex = /\([\s\S]+?\)/;
        const typeMatch =
               target.match(typeRegex) === null
                 ? '(text)'
                 : target.match(typeRegex)[0];

        const type = typeMatch.slice(1, -1);
        switch (type) {
          case 'number':
            return (
              '<div class="form-field"><p class="input-label"><strong>' +
                     text +
                     '</strong></p><p class="input-label"><input type="number" required class="input-num" data-bind="' +
                     variable +
                     '" /><span class="error error-hidden">Please enter a number here</span></p></div>'
            );
          case 'text-long':
            return (
              '<div class="form-field-long"><p class="input-label"><strong>' +
                     text +
                     '</strong></p><p class="input-label"><textarea class="input-text-long" required rows="4" cols="50" data-bind="' +
                     variable +
                     '"></textarea><span class="error error-hidden">Please enter text here</span></p></div>'
            );
          case 'text':
          default:
            return (
              '<div class="form-field"><p class="input-label"><strong>' +
                     text +
                     '</strong></p><p class="input-label"><input class="input-text" required data-bind="' +
                     variable +
                     '" /><span class="error error-hidden">Please enter text here</span></p></div>'
            );
        }
      }
    );

    /* CHECKBOX (created a checkbox linked to a variable in state) */
    result = result.replace(
      /CHECKBOX:([\s\S]+?)\/CHECKBOX/g,
      function (match, target) {
        const textMatch = target.match(/\[[\s\S]+?\]/)[0];
        const text = textMatch.slice(1, -1);
        const varMatch = target.match(/\{[\s\S]+?\}/)[0];
        const variable = varMatch.slice(1, -1);
        return (
          '<div class="form-field-checkbox"><p class="input-label"><label class="checkbox-container"><input type="checkbox" class="input-checkbox" data-bind="' +
               variable +
               '" /><span/></label></p><p class="input-label">' +
               text +
               '</p></div>'
        );
      }
    );

    /* Special [[links]] - aka SUBMITS  */
    result = result.replace(
      /\[\[([\s\S]+?)!!([\s\S]+?)!!([\s\S]+?)\]\]/g,
      function (match, display, params, target) {
        const displayText = display.replace('->', '');
        const targetName = target.replace('->', '');

        // if override spam filters is set,
        // do not add the trick field
        return window.config.overrideSpamFilters === true
          ? '<a href="javascript:void(0)" class="submit" ' +
          'data-passage="' +
          targetName +
          '" data-submit="' +
          params +
          '">' +
          displayText +
          '</a>'
          : '<label class="uhoh" for="name-123"></label><input class="uhoh" autocomplete="off" required type="text" id="name-123" name="name-123" placeholder="Your name here">' +
                    '<a href="javascript:void(0)" class="submit" ' +
                    'data-passage="' +
                    targetName +
                    '" data-submit="' +
                    params +
                    '">' +
                    displayText +
                    '</a>';
      }
    );

    /* Classic [[links]] - aka ANSWERS  */
    result = result.replace(/\[\[(.*?)\]\]/g, function (match, target) {
      let display = target;

      /* display|target format */
      const barIndex = target.indexOf('|');

      if (barIndex !== -1) {
        display = target.substr(0, barIndex);
        target = target.substr(barIndex + 1);
      } else {
        /* display->target format */
        const rightArrIndex = target.indexOf('->');

        if (rightArrIndex !== -1) {
          display = target.substr(0, rightArrIndex);
          target = target.substr(rightArrIndex + 2);
        } else {
          /* target<-display format */

          const leftArrIndex = target.indexOf('<-');

          if (leftArrIndex !== -1) {
            display = target.substr(leftArrIndex + 2);
            target = target.substr(0, leftArrIndex);
          }
        }
      }

      return (
        '<p><a href="javascript:void(0)" data-passage="' +
            target +
            '" class="answer">' +
            display +
            '</a></p>'
      );
    });

    /* SUBMITSUMMARY  */
    result = result.replace(/SUBMITSUMMARY/g, function (match, target) {
      const formdata = window.witch.formdata;
      console.log(formdata);
      return (
        '<h3 class="message-summary">MESSAGE SUMMARY</h3><table><tbody>' +
            formdata
              .map((form) => {
                if (Object.keys(form)[0] === 'upload') {
                  if (form.upload.name !== undefined) {
                    return (
                      '<tr><td><strong>UPLOAD</strong></td><td>' +
                           form.upload.name +
                           '</td></tr>'
                    );
                  } else { return '<tr><td><strong>UPLOAD</strong></td><td></td></tr>'; }
                } else {
                  return (
                    '<tr><td><strong>' +
                        Object.keys(form)[0]
                          .split('_')
                          .join(' ')
                          .toUpperCase() +
                        '</strong></td><td>' +
                        escapeString(form[Object.keys(form)[0]]) +
                        '</td></tr>'
                  );
                }
              })
              .join('') +
            '</tbody></table>'
      );
    });

    /* UPLOADS (input type 'file', accept images and pdfs) */
    result = result.replace(
      /UPLOAD:([\s\S]+?)\/UPLOAD/g,
      function (match, target) {
        if (window.config.allowUploads) {
          return (
            '<div class="form-field"><p class="input-label"><strong>' +
                  target +
                  '</strong></p><p class="input-label">Upload an image file, PDF or Word document (.doc, .docx) of 5mb and less<input type="file" name="upload" accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*,application/pdf" data-bind="upload" id="upload"/><br/>Or paste the URL of an attachment here:<input name="upload-link" id="upload-link" data-bind="upload-link" /></p></div>'
          );
        } else {
          return (
            '<div class="form-field"><p class="input-label"><strong>' +
                  target +
                  '</strong></p><p class="input-label">We only accept links. Paste the URL here to attach:<input name="upload-link" id="upload-link" data-bind="upload-link" /></p></div>'
          );
        }
      }
    );

    // Prevent template() from triggering markdown code blocks
    // Skip producing code blocks completely
    const renderer = new marked.Renderer();
    renderer.code = function (code) {
      return code;
    };

    marked.setOptions({ smartypants: false, renderer: renderer });
    const newResult = marked(result);

    // // Test for new <p> tags from Marked
    // if (!result.endsWith("</p>\n") && newResult.endsWith("</p>\n")) {
    //    newResult = newResult.replace(/^<p>|<\/p>$|<\/p>\n$/g, "");
    // }

    // console.log(newResult);
    return newResult;
  }
}

module.exports = Passage;
