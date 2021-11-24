const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;
const LZString = require('lz-string');

const jsdom = require('jsdom');
const dom = new jsdom.JSDOM(
   `<tw-storydata name="Test" startnode="1" creator="jasmine" creator-version="1.2.3">
    <tw-passagedata pid="1" name="Test Passage" tags="tag1 tag2">Hello world</tw-passagedata>
    <tw-passagedata pid="2" name="Test Passage 2" tags="tag1 tag2">Hello world 2</tw-passagedata>
    <tw-passagedata pid="3" name="Test Passage 3" tags=""><div><p><span>Test</span><p></div></tw-passagedata>
    <tw-passagedata pid="4" name="Test Passage 4" tags=""><% print(; %></tw-passagedata>
    <tw-passagedata pid="5" name="Test Passage 5" tags="">[[Test Passage]]</tw-passagedata>
    <script type="text/twine-javascript">window.scriptRan = true;</script>
    <style type="text/twine-css">body { color: blue }</style>
   </tw-storydata>`,
   { url: 'https://localhost/', runScripts: 'dangerously' }
).window;

// Pretend this is a browser setting and define some globals
// This is not a good idea, but jQuery will not load in Node otherwise!
// https://github.com/jsdom/jsdom/wiki/Don't-stuff-jsdom-globals-onto-the-Node-global
global.window = dom.window;
global.document = window.document;
global.jQuery = global.$ = window.$ = window.jQuery = require('jquery');
global._ = window._ = require('underscore');
global.marked = window.marked = require('marked');
global.window.config = { overrideSpamFilters: true };
global.window.witch = {
  formdata: [
    { name: 'Jazz' },
    { email_address: 'jazz@jazz.com' },
    { message_body: 'Hello' }
  ]
};
const { formdata } = global.window.witch;

const Story = require('../lib/Story.js');
// Run Story tests
describe('Story', function () {
  let storyEl;
  let story;

  before(function () {
    storyEl = $('tw-storydata');
    story = new Story(storyEl);
  });

  describe('#constructor()', function () {
    it('Should throw error if $ does not exist', function () {
      delete global.$;
      expect(() => {
        const s = new Story(storyEl);
        s();
      }).to.throw();
      global.$ = window.$;
    });

    it('Should throw error if _ does not exist', function () {
      delete global._;
      expect(() => {
        const s = new Story(storyEl);
        s();
      }).to.throw();
      global._ = window._;
    });

    it('Should set the story name from the element attribute', function () {
      expect(story.name).to.equal('Test');
    });

    it('Should set the story creator from the element attribute', function () {
      expect(story.creator).to.equal('jasmine');
    });

    it('Should set the story creator version from the element attribute', function () {
      expect(story.creatorVersion).to.equal('1.2.3');
    });

    it('Should set startPassage to parseInt(startNode)', function () {
      expect(story.startPassage).to.equal(1);
    });

    it("Should set the story's scripts from the element", function () {
      expect(story.userScripts.length).to.equal(1);
      expect(story.userScripts[0]).to.equal('window.scriptRan = true;');
    });

    it("Should set the story's styles from the element", function () {
      expect(story.userStyles.length).to.equal(1);
      expect(story.userStyles[0]).to.equal('body { color: blue }');
    });
  });

  describe('#render()', function () {
    it('Should render a passage by ID', function () {
      window.story = { state: {} };
      expect(story.render(1)).to.equal('<p>Hello world</p>\n');
    });

    it('Should render a passage by name', function () {
      window.story = { state: {} };
      expect(story.render('Test Passage')).to.equal('<p>Hello world</p>\n');
    });

    it('Should throw error when name or ID is not found in passages', function () {
      window.story = { state: {} };
      expect(() => {
        story.render('Not Found');
      }).to.throw();
    });
  });

  describe('#passage()', function () {
    it('Should find a passage by ID with passage()', function () {
      expect(story.passage(1).name).to.equal('Test Passage');
    });

    it('Should find a passage by name with passage()', function () {
      expect(story.passage('Test Passage').name).to.equal('Test Passage');
    });

    it('Should return null if no passage exists with that ID or name', function () {
      expect(story.passage('Testing')).to.equal(null);
    });
  });

  describe('#start()', function () {
    it('Should run story scripts with start()', function () {
      window.scriptRan = false;
      story.start($('nowhere'));
      expect(window.scriptRan).to.equal(true);
    });

    it('Should add story styles with start()', function () {
      const $el = $('<div></div>');

      story.start($el);

      const $styles = $el.find('style');

      expect($styles.length).to.equal(1);
      expect($styles.eq(0).html()).to.equal('body { color: blue }');
    });
  });

  describe('#show()', function () {
    it('Should display content in a .passage element with show()', function () {
      const $el = $('<div></div>');
      story.start($el);
      story.show('Test Passage');
      expect($el.find('.passage').html()).to.equal('<p>Hello world</p>\n');
    });

    it('Should trigger a sm.passage.hidden event when show() is called', function () {
      const $el = $('<div></div>');
      let eventHappened = false;
      $el.on('sm.passage.hidden', () => {
        eventHappened = true;
      });
      story.start($el);
      story.show('Test Passage 2');
      expect(eventHappened).to.equal(true);
    });

    it('Should trigger a sm.passage.showing event when show() is called', function () {
      const $el = $('<div></div>');
      let eventHappened = false;

      $el.on('sm.passage.showing', () => {
        eventHappened = true;
      });
      story.start($el);
      story.show('Test Passage 2');
      expect(eventHappened).to.equal(true);
    });

    it('Should trigger a sm.passage.shown event when show() is called', function () {
      const $el = $('<div></div>');
      let eventHappened = false;
      $el.on('sm.passage.shown', () => {
        eventHappened = true;
      });
      story.start($el);
      story.show('Test Passage 2');
      expect(eventHappened).to.equal(true);
    });

    it('Should trigger sm.checkpoint.added when checkpoint() used before show()', function () {
      const $window = $(window);
      let eventHappened = false;
      $window.on('sm.checkpoint.added', () => {
        eventHappened = true;
      });
      story.checkpoint('Test');
      story.show('Test Passage 2');
      expect(eventHappened).to.equal(true);
    });

    it('Should render nested HTML into passage element correctly', function () {
      const $el = $('<div></div>');
      story.start($el);
      story.show('Test Passage 3');
      expect($el.find('.passage').children().find('span').text()).to.equal(
        'Test'
      );
    });

    it('Should throw error if passage cannot be found', function () {
      expect(() => {
        story.show('Test Passage 10');
      }).to.throw();
    });

    it('Should trigger error when passage contents malformed JS', function () {
      const $el = $('<div></div>');
      story.start($el);
      story.show('Test Passage 4');
    });

    it('Should trigger sm.checkpoint.failed during failure', function () {
      const temp = window.history.pushState;
      const temp2 = window.history.replaceState;
      window.history.pushState = null;
      window.history.replaceState = null;
      const $window = $(window);
      let eventHappened = false;
      $window.on('sm.checkpoint.failed', () => {
        eventHappened = true;
      });
      story.checkpoint('Testing');
      story.show('Test Passage 2', false);
      window.history.pushState = temp;
      window.history.replaceState = temp2;
      expect(eventHappened).to.equal(true);
    });
  });

  describe('#checkpoint()', function () {
    it('Should trigger sm.checkpoint.adding event', function () {
      let eventHappened = false;
      const $win = $(window);
      $win.on('sm.checkpoint.adding', () => {
        eventHappened = true;
      });
      story.checkpoint();
      expect(eventHappened).to.equal(true);
    });

    it('Should change the document title when pased an argument', function () {
      story.checkpoint('Test');
      expect(document.title).to.equal(story.name + ': Test');
    });

    it('Should set atCheckpoint to be true', function () {
      story.checkpoint('Test');
      expect(story.atCheckpoint).to.equal(true);
    });
  });

  describe('#save()', function () {
    it("Should save the story's state to the location hash", function () {
      story.start($('nowhere'));
      const hash = story.saveHash();
      story.save(hash);
      expect(window.location.hash).not.to.equal('');
    });

    it('Should trigger sm.story.saved event', function () {
      let eventHappened = false;
      const $win = $(window);
      $win.on('sm.story.saved', () => {
        eventHappened = true;
      });
      const hash = story.saveHash();
      story.save(hash);
      expect(eventHappened).to.equal(true);
    });
  });

  describe('#saveHash()', function () {
    it('Should return correct LZString', function () {
      const testHash = LZString.compressToBase64(
        JSON.stringify({
          state: story.state,
          history: story.history,
          checkpointName: story.checkpointName
        })
      );

      expect(story.saveHash()).to.equal(testHash);
    });
  });

  describe('#restore()', function () {
    it('Should return false on invalid (non LZString) hash argument', function () {
      expect(story.restore()).to.equal(false);
    });

    it('Should trigger sm.restore.failed event on failure', function () {
      let eventHappened = false;
      const $win = $(window);
      $win.on('sm.restore.failed', () => {
        eventHappened = true;
      });
      story.restore();
      expect(eventHappened).to.equal(true);
    });

    it('Should return true upon successful parsing', function () {
      const hash = story.saveHash();
      expect(story.restore(hash)).to.equal(true);
    });

    it('Should trigger sm.restore.success event upon successful parsing', function () {
      let eventHappened = false;
      const $win = $(window);
      $win.on('sm.restore.success', () => {
        eventHappened = true;
      });
      const hash = story.saveHash();
      story.restore(hash);
      expect(eventHappened).to.equal(true);
    });
  });
});

const Passage = require('../lib/Passage.js');

// eslint-disable-next-line
describe("Passage", function () {
  describe('#constructor()', function () {
    it('Should throw error if $ does not exist', function () {
      delete global.$;
      expect(() => {
        const p = new Passage();
        p();
      }).to.throw();
      global.$ = window.$;
    });

    it('Should throw error if _ does not exist', function () {
      delete global._;
      expect(() => {
        const p = new Passage();
        p();
      }).to.throw();
      global._ = window._;
    });

    it('Should throw error if marked does not exist', function () {
      delete global.marked;
      expect(() => {
        const p = new Passage();
        p();
      }).to.throw();
      global.marked = window.marked;
    });

    it('Should contain default values when initialized with no arguments', function () {
      const p = new Passage();
      expect(p.name).to.equal('Default');
    });
  });

  describe('#render()', function () {
    before(function () {
      // Setup a dummy window.story.state
      window.story = {
        state: {}
      };
    });

    it('Should render empty string', function () {
      const p = new Passage();
      expect(p.render('')).to.equal('');
    });

    it('Should render QUESTION:Hello?/QUESTION into question class', function () {
      const p = new Passage();
      expect(p.render('[QUESTION]Hello?[/QUESTION]')).to.equal(
        '<p class="question">Hello?</p>'
      );
    });

    it('Should render a REDIRECT:[Google](google.com)/REDIRECT into a redirect button', function () {
      const p = new Passage();
      expect(p.render('[REDIRECT][Google](google.com)[/REDIRECT]')).to.equal(
        '<p class="redirect-container"><a href="google.com" class="redirect" target="_blank">Google<span class="redirect-arrow">↗</span></a></p>'
      );
    });

    it('Should render a text field', function () {
      const p = new Passage();
      expect(p.render('[FORMFIELD][Name]{name}(text)[/FORMFIELD]')).to.equal(
        '<div class="form-field"><p class="input-label"><strong>Name</strong></p><p class="input-label"><input class="input-text" required data-bind="name" /><span class="error error-hidden">Please enter text here</span></p></div>'
      );
    });

    it('Should render a number field', function () {
      const p = new Passage();
      expect(p.render('[FORMFIELD][Age]{age}(number)[/FORMFIELD]')).to.equal(
        '<div class="form-field"><p class="input-label"><strong>Age</strong></p><p class="input-label"><input type="number" required class="input-num" data-bind="age" /><span class="error error-hidden">Please enter a number here</span></p></div>'
      );
    });

    it('Should render a longer text input', function () {
      const p = new Passage();
      expect(
        p.render('[FORMFIELD][Message]{message_body}(text-long)[/FORMFIELD]')
      ).to.equal(
        '<div class="form-field-long"><p class="input-label"><strong>Message</strong></p><p class="input-label"><textarea class="input-text-long" required rows="4" cols="50" data-bind="message_body"></textarea><span class="error error-hidden">Please enter text here</span></p></div>'
      );
    });

    it('Should render a text input if the type is unknown', function () {
      const p = new Passage();
      expect(
        p.render('[FORMFIELD][Message]{message_body}(dfdjf)[/FORMFIELD]')
      ).to.equal(
        '<div class="form-field"><p class="input-label"><strong>Message</strong></p><p class="input-label"><input class="input-text" required data-bind="message_body" /><span class="error error-hidden">Please enter text here</span></p></div>'
      );
    });

    it('Should render a text input if there is no type', function () {
      const p = new Passage();
      expect(
        p.render('[FORMFIELD][Message]{message_body}[/FORMFIELD]')
      ).to.equal(
        '<div class="form-field"><p class="input-label"><strong>Message</strong></p><p class="input-label"><input class="input-text" required data-bind="message_body" /><span class="error error-hidden">Please enter text here</span></p></div>'
      );
    });

    it('Should render a checkbox', function () {
      const p = new Passage();
      expect(p.render('[CHECKBOX][Well?]{well_well_well}[/CHECKBOX]')).to.equal(
        '<div class="form-field-checkbox"><p class="input-label"><label class="checkbox-container"><input type="checkbox" class="input-checkbox" data-bind="well_well_well" /><span/></label></p><p class="input-label">Well?</p></div>'
      );
    });

    it('Should render a submit button with lazy params if override spam is true', function () {
      const p = new Passage();
      expect(
        p.render('[[!Submit button->jasmine->submit-jasmine]]')
      ).to.equal(
        '<p><a href="javascript:void(0)" class="submit" data-passage="submit-jasmine" data-submit="jasmine">Submit button</a></p>\n'
      );
    });
    it('Should render a submit with CCs', function () {
      const p = new Passage();
      expect(
        p.render(
          '[[!Submit button->[SENDTO]jasmine[/sendto]->[cc]jazz[/cc]->submit-jasmine]]'
        )
      ).to.equal(
        '<p><a href="javascript:void(0)" class="submit" data-passage="submit-jasmine" data-submit="sendTo:jasmine;cc:jazz">Submit button</a></p>\n'
      );
    });
    it('Should render a submit with urgent flag', function () {
      const p = new Passage();
      expect(
        p.render(
          '[[!Submit button->[SENDTO]jasmine[/sendto]->[urgent]->submit-jasmine]]'
        )
      ).to.equal(
        '<p><a href="javascript:void(0)" class="submit" data-passage="submit-jasmine" data-submit="sendTo:jasmine;urgent">Submit button</a></p>\n'
      );
    });
    it('Should render a submit with a type', function () {
      const p = new Passage();
      expect(
        p.render(
          '[[!Submit button->[SENDTO]jasmine[/sendto]->[type]Special enquiry[/type]->submit-jasmine]]'
        )
      ).to.equal(
        '<p><a href="javascript:void(0)" class="submit" data-passage="submit-jasmine" data-submit="sendTo:jasmine;type:Special enquiry">Submit button</a></p>\n'
      );
    });

    it('Should render a submit summary', function () {
      const p = new Passage();
      expect(p.render('[SUMMARY]')).to.equal(
        '<h3 class="message-summary">MESSAGE SUMMARY</h3><table><tbody><tr><td><strong>NAME</strong></td><td>Jazz</td></tr><tr><td><strong>EMAIL ADDRESS</strong></td><td>jazz@jazz.com</td></tr><tr><td><strong>MESSAGE BODY</strong></td><td>Hello</td></tr></tbody></table>'
      );
    });

    it('Should render a submit summary including upload', function () {
      formdata.push({ upload: { name: 'hello.jpg' } });
      const p = new Passage();
      expect(p.render('[SUMMARY]')).to.equal(
        '<h3 class="message-summary">MESSAGE SUMMARY</h3><table><tbody><tr><td><strong>NAME</strong></td><td>Jazz</td></tr><tr><td><strong>EMAIL ADDRESS</strong></td><td>jazz@jazz.com</td></tr><tr><td><strong>MESSAGE BODY</strong></td><td>Hello</td></tr><tr><td><strong>UPLOAD</strong></td><td>hello.jpg</td></tr></tbody></table>'
      );
    });

    it('Should render a submit summary including empty upload', function () {
      formdata[3].upload = '';
      const p = new Passage();
      expect(p.render('[SUMMARY]')).to.equal(
        '<h3 class="message-summary">MESSAGE SUMMARY</h3><table><tbody><tr><td><strong>NAME</strong></td><td>Jazz</td></tr><tr><td><strong>EMAIL ADDRESS</strong></td><td>jazz@jazz.com</td></tr><tr><td><strong>MESSAGE BODY</strong></td><td>Hello</td></tr><tr><td><strong>UPLOAD</strong></td><td></td></tr></tbody></table>'
      );
    });

    it('Should render an upload if uploads are allowed', function () {
      global.window.config.allowUploads = true;
      const p = new Passage();
      expect(p.render('UPLOAD:Please upload something/UPLOAD')).to.equal(
        '<div class="form-field"><p class="input-label"><strong>Please upload something</strong></p><p class="input-label">Upload an image file, PDF or Word document (.doc, .docx) of 5mb and less<input type="file" name="upload" accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*,application/pdf" data-bind="upload" id="upload"/><br/>Or paste the URL of an attachment here:<input name="upload-link" id="upload-link" data-bind="upload-link" /></p></div>'
      );
    });

    it('Should render an upload if uploads are not allowed', function () {
      global.window.config.allowUploads = false;
      const p = new Passage();
      expect(p.render('UPLOAD:Send an image/UPLOAD')).to.equal(
        '<div class="form-field"><p class="input-label"><strong>Send an image</strong></p><p class="input-label">We only accept links. Paste the URL here to attach:<input name="upload-link" id="upload-link" data-bind="upload-link" /></p></div>'
      );
    });

    it('Should render [[Passage]] into correct link', function () {
      const p = new Passage();
      expect(p.render('[[Passage]]')).to.equal(
        '<p><a href="javascript:void(0)" data-passage="Passage" class="answer">Passage</a></p>'
      );
    });

    it('Should render [[Passage->Another]] into correct link', function () {
      const p = new Passage();
      expect(p.render('[[Passage->Another]]')).to.equal(
        '<p><a href="javascript:void(0)" data-passage="Another" class="answer">Passage</a></p>'
      );
    });

    it('Should render [[Passage|Another]] into correct link', function () {
      const p = new Passage();
      expect(p.render('[[Passage|Another]]')).to.equal(
        '<p><a href="javascript:void(0)" data-passage="Another" class="answer">Passage</a></p>'
      );
    });

    it('Should render [[Passage<-Another]] into correct link', function () {
      const p = new Passage();
      expect(p.render('[[Passage<-Another]]')).to.equal(
        '<p><a href="javascript:void(0)" data-passage="Passage" class="answer">Another</a></p>'
      );
    });

    it('Should render [[Passage]]{#test} into correct link with ID markup', function () {
      const p = new Passage();
      expect(p.render('[[Passage]]{#test}')).to.equal(
        '<p><a href="javascript:void(0)" data-passage="Passage" id="test">Passage</a></p>\n'
      );
    });

    it('Should render [[Passage]]{.test} into correct link with CLASS markup', function () {
      const p = new Passage();
      expect(p.render('[[Passage]]{.test}')).to.equal(
        '<p><a href="javascript:void(0)" data-passage="Passage" class="test">Passage</a></p>\n'
      );
    });

    it('Should render [[Passage]]{.test.test2} into correct link with CLASS markup', function () {
      const p = new Passage();
      expect(p.render('[[Passage]]{.test.test2}')).to.equal(
        '<p><a href="javascript:void(0)" data-passage="Passage" class="test test2">Passage</a></p>\n'
      );
    });

    it('Should render [[Passage<-Another]]{#test} into correct link', function () {
      const p = new Passage();
      expect(p.render('[[Passage<-Another]]{#test}')).to.equal(
        '<p><a href="javascript:void(0)" data-passage="Passage" id="test">Another</a></p>\n'
      );
    });

    it('Should render [[Passage<-Another]]{.test} into correct link', function () {
      const p = new Passage();
      expect(p.render('[[Passage<-Another]]{.test}')).to.equal(
        '<p><a href="javascript:void(0)" data-passage="Passage" class="test">Another</a></p>\n'
      );
    });

    it('Should render [[Passage<-Another]]{.test.test2} into correct link', function () {
      const p = new Passage();
      expect(p.render('[[Passage<-Another]]{.test.test2}')).to.equal(
        '<p><a href="javascript:void(0)" data-passage="Passage" class="test test2">Another</a></p>\n'
      );
    });

    it('Should render [[Passage->Another]]{.test} into correct link', function () {
      const p = new Passage();
      expect(p.render('[[Passage->Another]]{.test}')).to.equal(
        '<p><a href="javascript:void(0)" data-passage="Another" class="test">Passage</a></p>\n'
      );
    });

    it('Should render [[Passage->Another]]{.test.test2} into correct link', function () {
      const p = new Passage();
      expect(p.render('[[Passage->Another]]{.test.test2}')).to.equal(
        '<p><a href="javascript:void(0)" data-passage="Another" class="test test2">Passage</a></p>\n'
      );
    });

    it('Should render [[Passage|Another]]{#test} into correct link', function () {
      const p = new Passage();
      expect(p.render('[[Passage|Another]]{#test}')).to.equal(
        '<p><a href="javascript:void(0)" data-passage="Another" id="test">Passage</a></p>\n'
      );
    });

    it('Should render [[Passage|Another]]{.test} into correct link', function () {
      const p = new Passage();
      expect(p.render('[[Passage|Another]]{.test}')).to.equal(
        '<p><a href="javascript:void(0)" data-passage="Another" class="test">Passage</a></p>\n'
      );
    });

    it('Should render [[Passage|Another]]{.test.test2} into correct link', function () {
      const p = new Passage();
      expect(p.render('[[Passage|Another]]{.test.test2}')).to.equal(
        '<p><a href="javascript:void(0)" data-passage="Another" class="test test2">Passage</a></p>\n'
      );
    });

    it('Should render <a-0.class#id> correctly', function () {
      const p = new Passage();
      expect(p.render('<a-0.class#id>')).to.equal(
        '<a style="display:none" href="javascript:void(0)" id="id" class="class">'
      );
    });

    it('Should passthrough any <script> tags', function () {
      const p = new Passage();
      expect(
        p.render('<div><script>console.log("Hello world")</script></div>')
      ).to.equal('<div><script>console.log("Hello world")</script></div>');
    });

    it('Should render in-line markdown: Emphasis', function () {
      const p = new Passage();
      expect(p.render('*Emphasis* or _Emphasis_.')).to.equal(
        '<p><em>Emphasis</em> or <em>Emphasis</em>.</p>\n'
      );
    });

    it('Should render in-line markdown: Strong Emphasis', function () {
      const p = new Passage();
      expect(
        p.render('**Strong emphasis** or __Strong emphasis__.')
      ).to.equal(
        '<p><strong>Strong emphasis</strong> or <strong>Strong emphasis</strong>.</p>\n'
      );
    });

    it('Should render in-line markdown: Strikethrough', function () {
      const p = new Passage();
      expect(p.render('Hello ~~Strikethrough~~ hi')).to.equal(
        '<p>Hello <del>Strikethrough</del> hi</p>\n'
      );
    });

    it('Should render in-line markdown: Header 5', function () {
      const p = new Passage();
      expect(p.render('##### Header 5')).to.equal(
        '<h5 id="header-5">Header 5</h5>\n'
      );
    });

    it('Should render multi-line markdown: Ordered List', function () {
      const p = new Passage();
      expect(
        p.render('1. First ordered list item\n2. Another item')
      ).to.equal(
        '<ol>\n<li>First ordered list item</li>\n<li>Another item</li>\n</ol>\n'
      );
    });

    it('Should render multi-line links correctly', function () {
      const p = new Passage();
      expect(p.render('Rooms:\n- [[Front Room]]\n- [[Back Room]]')).to.equal(
        '<p>Rooms:</p>\n<ul>\n<li><p><a href="javascript:void(0)" data-passage="Front Room" class="answer">Front Room</a></p></li>\n<li><p><a href="javascript:void(0)" data-passage="Back Room" class="answer">Back Room</a></p></li>\n</ul>\n'
      );
    });

    it('Should not trigger markdown code blocks', function () {
      const p = new Passage();
      window.setup = {};
      window.setup.example = true;
      const test = `<% if(window.setup.example) { %>
        <div>[[Testing]]</div>
      <% } %>`;
      expect(p.render(test)).to.equal(
        '    <div><p><a href="javascript:void(0)" data-passage="Testing" class="answer">Testing</a></p></div>\n  '
      );
    });
  });
});

// Load additional functions
require('../lib/Misc.js');

describe('Misc', function () {
  describe('#either()', function () {
    it('Should return nothing when given nothing', function () {
      expect(window.either()).to.equal();
    });

    it('Should non-Array single value', function () {
      expect(window.either(1)).to.equal(1);
    });

    it('Should return value within single Array', function () {
      expect(window.either([1])).to.equal(1);
    });

    it('Should return one of the arguments passed to it', function () {
      expect(window.either('A', 'B', 'C', 'D')).to.be.an('string');
    });

    it('Should return one of the arguments passed to it with arrays', function () {
      expect(window.either('A', 'B', 'C', 'D', ['E', 'F'])).to.be.an(
        'string'
      );
    });
  });

  describe('#hasVisited()', function () {
    before(function () {
      const storyEl = $('tw-storydata');
      const story = new Story(storyEl);
      window.story = story;
    });

    it('Should return true if passage id visited', function () {
      window.story.history = [1];
      expect(window.hasVisited(1)).to.equal(true);
    });

    it('Should return false if passage id not visited', function () {
      window.story.history = [];
      expect(window.hasVisited(1)).to.equal(false);
    });

    it('Should return false if passage name not visited', function () {
      window.story.history = [];
      expect(window.hasVisited('Random')).to.equal(false);
    });

    it('Should return true if passage name visited', function () {
      window.story.history = [1];
      expect(window.hasVisited('Test Passage')).to.equal(true);
    });

    it('Should return true if multiple passage names visited', function () {
      window.story.history = [1, 4];
      expect(window.hasVisited('Test Passage', 'Test Passage 4')).to.equal(
        true
      );
    });

    it('Should return false if any multiple passage names not visited', function () {
      window.story.history = [1, 4];
      expect(window.hasVisited('Random', 'Another')).to.equal(false);
    });
  });

  describe('#visited()', function () {
    before(function () {
      const storyEl = $('tw-storydata');
      const story = new Story(storyEl);
      window.story = story;
    });

    it('Should return 0 if passage does not exist', function () {
      window.story.history = [1, 1];
      expect(window.visited(7)).to.equal(0);
    });

    it('Should return number of passage visits for single id', function () {
      window.story.history = [1, 1];
      expect(window.visited(1)).to.equal(2);
    });

    it('Should return number of passage visits for single name', function () {
      window.story.history = [1, 1];
      expect(window.visited('Test Passage')).to.equal(2);
    });

    it('Should return lowest number of passage visits for multiple ids', function () {
      window.story.history = [1, 1, 1, 2, 2];
      expect(window.visited(1, 2)).to.equal(2);
    });

    it('Should return lowest number of passage visits for multiple names', function () {
      window.story.history = [1, 1, 1, 2, 2];
      expect(window.visited('Test Passage', 'Test Passage 2')).to.equal(2);
    });
  });

  describe('#renderToSelector()', function () {
    before(function () {
      const storyEl = $('tw-storydata');
      const story = new Story(storyEl);
      window.story = story;
    });

    it('Should do nothing when passed nothing', function () {
      expect(window.renderToSelector()).to.equal();
    });

    it('Should do nothing when selector does not exist', function () {
      expect(window.renderToSelector(null)).to.equal();
    });

    it('Should do nothing when selector and passage do not exist', function () {
      expect(window.renderToSelector(null, null)).to.equal();
    });

    it('Should overwrite HTML content with passage content', function () {
      window.renderToSelector('[name="Test Passage 2"]', 'Test Passage');
      expect($('[name="Test Passage 2"]').html()).to.equal(
        '<p>Hello world</p>\n'
      );
    });
  });

  describe('getStyles()', function () {
    it('Should return Promise', function () {
      expect(window.getStyles()).to.be.a('Object');
    });

    it('Should load single CSS file', function () {
      const promise = window.getStyles(
        'https://maxcdn.bootstrapcdn.com/bootstrap/3.4.0/css/bootstrap.min.css'
      );
      return expect(promise).to.eventually.be.fulfilled;
    });

    it('Should load multiple CSS files', function () {
      const promise = window.getStyles(
        'https://maxcdn.bootstrapcdn.com/bootstrap/3.4.0/css/bootstrap.min.css',
        'https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.css'
      );
      return expect(promise).to.eventually.be.fulfilled;
    });
  });
});
