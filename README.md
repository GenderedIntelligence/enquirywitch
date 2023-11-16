# EnquiryWitch: a "pseudo chatbot" for Twine

EnquiryWitch is a Twine 2 story format designed to make a dynamic "contact wizard" (or witch!)\* for organisations that have specific and varied remits, such as charities and community organisations.

It is built on top of Snowman, a minimal Twine 2 story format designed for people who already know JavaScript and CSS originally created by Chris Klimas. Snowman is currently maintained by Dan Cox.

note \* (wizards are bureacratic and patriarchal, and witches are holistic and community-focused)

##

[Link to the format to import to Twine](https://geeksforsocialchange.github.io/enquirywitch/dist/enquirywitch-0.0.1/format.js)

## Get started

This is a WIP so not all of this is currently possible.

1. Add EnquiryWitch as a format to your Twine.
1. Build your witch.
1. Set up Netlify action.
1. Set up an email service.
1. Export your Twine witch and integrate her with your site.
1. Say 'Abracadabra' aloud three times.
1. Voila!

## Spellbook

### Spell to transmogrify a link into an email submit

```
[[!Submit->SUBMIT PARAMS->submit-email]]
```

Any internal link leading to a passage that contains 'submit' in its name is transformed into a 'submit' button, which sends a ping to the email server.

#### Submit params

Params are case insensitive, seperate params must be separated by a `->`

Send to: `[SENDTO]glinda[/SENDTO]`

CC: `[CC]wizardofoz[/CC]`

Urgent: `[URGENT]`

Full example:

```
[[!Submit->[SENDTO]glinda[/SENDTO]->[CC]wizardofoz[/CC]->[URGENT]->submit-email]]
```

### Spell to transport between worlds

```
[REDIRECT][Click to go anywhere](https://en.wikipedia.org/wiki/Special:Random)[/REDIRECT]
```

Allows transportation to external pages, opens in a new window or tab. The portal looks more like a button than a link.

### Spell to ask the spirits a question

```
[QUESTION]Where can I find eye of newt?[/QUESTION]
```

Tbh all this currently does is make it bold. But it will do more eventually. It is also used to keep a record of the spirit's correspondence.

All internal links to other Twine passages are treated as ANSWERS to the last question asked.

### Spell of gathering

```
[FORMFIELD][Type of familiar]{familiar_type}(text)[/FORMFIELD]
```

Formfields take 3 bits of information - the `[Label]`, the `{variable_name}` and the `(type)`. The available types are `text`, `text-long` and `number`.

```
Are you a good witch or a bad witch?

[CHECKBOX][Good witch]{good_witch}[/CHECKBOX]
[CHECKBOX][Bad witch]{bad_witch}[/CHECKBOX]
```

Checkboxes take a `[Label]` and a `{variable_name}`.

## Developing locally

1. install Twine locally using your package manager or from the [releases page](https://github.com/klembot/twinejs/releases)
1. `git clone https://github.com/geeksforsocialchange/enquirywitch.git && cd enquirywitch`
1. Run `npm install` to install dependancies
1. `npm run build` will create a Twine 2-ready story format under `dist/`.
1. `npm start` will spin up a server for development
1. start up the twine desktop app
1. go to `library -> import -> choose file` select `GI_Contact_Page.twee` from the project root
1. go to `Twin -> Story Formats -> Add` and add in the URL provided by the NPM server
1. Test the format by `Build -> Test` it should open a browser window with the twine story
1. The Twine app does not register changes to the story format file. To preview changes you must `Twin -> Story Formats -> Remove` then re-add it. 
1. To run unit tests, run `npm run test`.

EnquiryWitch is built on top of Snowman, and uses [jQuery](https://jquery.com/), [Underscore](https://underscorejs.org/) & [Marked](https://github.com/markedjs/marked).

The [official Snowman documentation](https://videlais.github.io/snowman/2/) has more details about Snowman including multiple examples of how to do various tasks.
