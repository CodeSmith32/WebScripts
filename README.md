# WebScripts

WebScripts is an open source user scripts Chromium extension that integrates Microsoft's Monaco code editor, and allows writing user scripts in either JavaScript or TypeScript. An open-sourced, modern, zero-tracking alternative to [Tampermonkey](https://www.tampermonkey.net/).

### Features:

- [Monaco editor](https://microsoft.github.io/monaco-editor/) with full editor and shortcut configurations
- Write scripts in JavaScript or [TypeScript](https://www.typescriptlang.org/)
- Beautify code on save with [Prettier](https://prettier.io/)
- Bulk script import / export for migrations
- Regex URL testing

### Gotchas

- This is a very new extension. There may still be bugs. Please report any issues you experience, and **use at your own risk**.
- This extension was currently only tested with Chromium browsers. It does not yet support Firefox, Safari, Opera, or mobile browsers.
- There is no central repository for custom scripts from other users, nor is there any script update system. This extension is for developers, rather than everyday browser users, and expects the user to be the one writing scripts. If you're looking for an extension that lets you install scripts written by other developers, [Tampermonkey](https://www.tampermonkey.net/) may be a better choice.

---

### Script options:

#### `name`

Title for the script.

#### `version`

Script version.

#### `author`

Author name.

#### `description`

Description for the script.

#### `language`

The language the script is written in - either JavaScript or TypeScript.

#### `prettify`

If the code should be formatted with prettier when saved.

#### `locked`

When enabled, the switch in the extension popup for this script will be disabled to prevent accidental modification.

#### `when`

When to execute the script during the page startup time.

**Start:** (Default) Before the page starts loading (DOCUMENT_START). At this time, the html of the page has started loading, and no page JavaScript has run yet.

**End:** After the document html finishes loading (DOCUMENT_END). At this time, the html has loaded, but external resources (images, css, js) may have not finished loading.

**Idle:** After the document and all assets finish loading (DOCUMENT_IDLE). At this time, the document html has loaded, and all images, css, and js referenced in the immediate document have also finished loading.

#### `world`

The execution environment to run the script in.

**Main:** (Default) Runs the user script in the same execution environment as the rest of the JavaScript on the page.

**Isolated:** Runs the user script in an isolated execution environment, separate from the JavaScript on the page. This means that the JS globals from the script will not interfere with the JS globals on the page. Isolated scripts can still interact with the page by modifying the DOM, and by messaging JS in the main world via `postMessage`.

#### `csp`

Allows disabling the Content-Security-Policy for matched pages. **For security purposes, avoid this option if possible.** User scripts execute regardless of CSP constraints, and disabling the CSP is only necessary if the script requires specific actions that the page's CSP prevents.

#### `match`

The match patterns are used to determine which URLs the script should run on. URLs can be matched by regex or domains with wildcard parts.

Domain pattern examples:

- `*.google.com`
- `example.com`
- `robots.*`
- `app.*.cdn.net`

Regex pattern examples:

- `/^https://example\.com/i`
- `/^file:///.*/`
- `/^https?://(www\.)?facebook\.com/i`;

Match patterns exclude matched URLs if prefixed with a `-`:

- `- *.google.com`
- `-www.example.com`
- `- /\bsecure\b/i`

Multiple match headers are used to match and/or exclude various URLs. Matches apply from top-to-bottom, where lower match pattern takes precedence over patterns above them. The bottom pattern takes highest precedence:

All subdomains of `google.com`, but not `google.com` itself:

```
match:  *.google.com
match:  - google.com
```

A list of domains:

```
match:  example.com
match:  app.net
match:  iamawesome.com
```

Every website and file URL:

```
match:  /.*/
```

All websites, but no file URLs (domain patterns do not match file URLs):

```
match:  *
```

Or

```
match:   /.*/
match:   - /^file:///.*/i
```
