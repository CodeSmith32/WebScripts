# WebScripts

WebScripts is an open source user scripts Chromium extension that integrates Microsoft's Monaco code editor, and allows writing user scripts in either JavaScript or TypeScript. An open-sourced, modern, zero-tracking alternative to [Tampermonkey](https://www.tampermonkey.net/).

## Features:

- [Monaco editor](https://microsoft.github.io/monaco-editor/) with full editor and shortcut configurations
- Write scripts in JavaScript or [TypeScript](https://www.typescriptlang.org/)
- Beautify code on save with [Prettier](https://prettier.io/)
- Bulk script import / export for migrations
- Regex URL testing

## Gotchas

- This is a very new extension. There may still be bugs. Please report any issues you experience, and **use at your own risk**.
- This extension was currently only tested with Chromium browsers. It does not yet support Firefox, Safari, Opera, or mobile browsers.
- There is no central repository for custom scripts from other users, nor is there any script update system. This extension is for developers, rather than everyday browser users, and expects the user to be the one writing scripts. If you're looking for an extension that lets you install scripts written by other developers, [Tampermonkey](https://www.tampermonkey.net/) may be a better choice.

---

## Script options:

### `/// name: ...`

Title for the script.

### `/// version: ...`

Script version.

### `/// author: ...`

Author name.

### `/// description: ...`

Description for the script.

### `/// language: ...`

The language the script is written in - either JavaScript or TypeScript.

### `/// prettify: ...`

If the code should be formatted with prettier when saved.

### `/// locked: ...`

When enabled, the switch in the extension popup for this script will be disabled to prevent accidental modification.

### `/// when: ...`

When to execute the script during the page startup time.

**Start:** (Default) Before the page starts loading (DOCUMENT_START). At this time, the html of the page has started loading, and no page JavaScript has run yet.

**End:** After the document html finishes loading (DOCUMENT_END). At this time, the html has loaded, but external resources (images, css, js) may have not finished loading.

**Idle:** After the document and all assets finish loading (DOCUMENT_IDLE). At this time, the document html has loaded, and all images, css, and js referenced in the immediate document have also finished loading.

### `/// world: ...`

The execution environment to run the script in.

**Main:** (Default) Runs the user script in the same execution environment as the rest of the JavaScript on the page.

**Isolated:** Runs the user script in an isolated execution environment, separate from the JavaScript on the page. This means that the JS globals from the script will not interfere with the JS globals on the page. Isolated scripts can still interact with the page by modifying the DOM, and by messaging JS in the main world via `postMessage`.

### `/// csp: ...`

Allows disabling the Content-Security-Policy for matched pages. **For security purposes, avoid this option if possible.** User scripts execute regardless of CSP constraints, and disabling the CSP is only necessary if the script requires specific actions that the page's CSP prevents.

### `/// match: ...`

The match patterns are used to determine which URLs the script should run on. URLs can be matched by regex or domains with wildcard parts.

#### Domain pattern examples:

- `*.google.com`
- `example.com`
- `robots.*`
- `app.*.cdn.net`

Where `*` matches zero or more domain parts. (`*.google.com` also matches `google.com`.)

#### Regex pattern examples:

- `/^https://example\.com/i`
- `/^file:///.*/`
- `/^https?://(www\.)?facebook\.com/i`;

Whereas domain patterns only match the domain, regex patterns apply to the entire url. If start-anchored, be sure to match for the URL protocol.

#### Match patterns exclude matched URLs if prefixed with a `-`:

- `- *.google.com`
- `-www.example.com`
- `- /\bsecure\b/i`

Multiple match headers are used to match and/or exclude various URLs. Matches apply from top-to-bottom, where lower match pattern takes precedence over patterns above them. The bottom pattern takes highest precedence. In contrast, exclusions at the top have no effect because they have nothing to exclude from.

All subdomains of `google.com`, but not `google.com` itself:

```js
/// match:  *.google.com
/// match:  - google.com
```

A list of domains:

```js
/// match:  example.com
/// match:  app.net
/// match:  iamawesome.com
```

Every website and file URL:

```js
/// match:  /.*/
```

All websites, but no file URLs (domain patterns do not match file URLs):

```js
/// match:  *
```

Or, alternatively:

```js
/// match:   /.*/
/// match:   - /^file:///.*/i
```

## Build Instructions

To build this repository,

- Install node.js (v22.12.0) and npm (v10.9.0)
- From the package root, execute `npm install`
- Then execute `npm run build`

## Built With

[![TypeScript](https://img.shields.io/badge/typescript-007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Preact](https://img.shields.io/badge/preact-673AB8.svg?style=for-the-badge&logo=preact&logoColor=white)](https://preactjs.com/)
[![TailwindCSS](https://img.shields.io/badge/tailwind_css-030712.svg?style=for-the-badge&logo=tailwindcss&logoColor=00BCFF)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/vite-646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![ESLint](https://img.shields.io/badge/eslint-101828.svg?style=for-the-badge&logo=eslint&logoColor=white)]()
