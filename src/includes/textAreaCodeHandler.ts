export type TextAreaController = ReturnType<typeof createTextAreaController>;
export type Direction = "forward" | "backward" | "none";

const textAreaControllers = new WeakMap<
  HTMLTextAreaElement,
  TextAreaController
>();

const tabSize = 4;

const navigationKeys: string[] = [
  "arrowleft",
  "arrowright",
  "arrowup",
  "arrowdown",
  "home",
  "end",
  "pageup",
  "pagedown",
];

const wrappers: Record<string, string | undefined> = {
  '"': '"',
  "'": "'",
  "[": "]",
  "(": ")",
  "{": "}",
};
Object.setPrototypeOf(wrappers, null);

const { min, max } = Math;

/** Create and return a new textarea code controller. */
export const createTextAreaController = (textArea: HTMLTextAreaElement) => {
  type HistoryPositionState = [number, number, Direction];
  type HistoryState = {
    // 'before change' value == 'after change' value of previous entry
    b: HistoryPositionState; // 'before change' cursor state
    a: HistoryPositionState; // 'after change' cursor state
    v: string; // 'after change' value
    n: boolean; // if navigation occurred after change; if so, a new undo state must be pushed
  };

  const history: HistoryState[] = [];

  // indicates position between history entries (1 is the earliest: just after the first entry)
  // undo / redo steps over previous / next entry, applying the action
  let historyPos = 0; // starts at 0, but pushUndo is called immediately below to initiate

  // indicates cursor's most recent position state
  // when undo is pushed, this is used as the 'before change' cursor state
  let latestCursor: HistoryPositionState = [0, 0, "none"];

  const ctl = {
    get length() {
      return textArea.value.length;
    },
    get start() {
      return textArea.selectionStart;
    },
    set start(start: number) {
      textArea.selectionStart = min(max(start, 0), ctl.length);
    },
    get end() {
      return textArea.selectionEnd;
    },
    set end(end: number) {
      textArea.selectionEnd = min(max(end, 0), ctl.length);
    },
    get direction() {
      return textArea.selectionDirection;
    },
    set direction(dir: "forward" | "backward" | "none") {
      textArea.selectionDirection =
        ctl.start === ctl.end ? "none" : dir === "none" ? "forward" : dir;
    },
    set startEnd(pos: number) {
      ctl.start = ctl.end = pos;
      ctl.direction = "none";
    },
    get cursor() {
      return ctl.direction === "forward" ? ctl.end : ctl.start;
    },
    set cursor(pos: number) {
      if (ctl.direction === "forward") {
        if (pos > ctl.start) {
          ctl.end = pos;
        } else {
          // reverse direction if needed
          ctl.end = ctl.start;
          ctl.start = pos;
          ctl.direction = "backward";
        }
      } else {
        if (pos < ctl.end) {
          ctl.start = pos;
        } else {
          // reverse direction if needed
          ctl.start = ctl.end;
          ctl.end = pos;
          ctl.direction = "forward";
        }
      }
    },
    get isSelecting() {
      return ctl.start !== ctl.end;
    },
    get isMultilineSelection() {
      return ctl.linePosStart(ctl.start) !== ctl.linePosStart(ctl.end);
    },
    get value(): string {
      return textArea.value;
    },
    set value(value: string) {
      textArea.value = value;
    },
    get selected(): string {
      return ctl.value.slice(ctl.start, ctl.end);
    },

    undoSize() {
      return history.length;
    },
    get canUndo() {
      return historyPos > 1;
    },
    get canRedo() {
      return historyPos < history.length;
    },
    /** Mark navigation as occurred, after which undo does not merge. */
    navigated() {
      if (historyPos > 0) history[historyPos - 1].n = true;
    },
    /** Updates latest cursor state for undo history. */
    updateCursor() {
      if (
        latestCursor[0] !== ctl.start ||
        latestCursor[1] !== ctl.end ||
        latestCursor[2] !== ctl.direction
      ) {
        latestCursor[0] = ctl.start;
        latestCursor[1] = ctl.end;
        latestCursor[2] = ctl.direction;
        // if navigation occurred, undo state cannot be merged
        ctl.navigated();
      }
    },
    /** Push state to undo stack. */
    pushUndo(n: boolean = false) {
      ctl.navigated();

      history.length = historyPos;
      const b = latestCursor.slice() as HistoryPositionState;
      ctl.updateCursor();
      const a = latestCursor.slice() as HistoryPositionState;

      if (
        historyPos &&
        history[historyPos - 1].v === ctl.value &&
        b[0] === a[0] &&
        b[1] === a[1] &&
        b[2] === a[2]
      ) {
        // don't push undo if nothing changed
        return;
      }

      history[historyPos++] = { b, a, v: ctl.value, n };
    },
    /** Update the current undo state without pushing a new state. */
    updateUndo() {
      // if navigation occurred, push new state
      if (history[historyPos - 1].n) {
        ctl.pushUndo();
        return;
      }

      // else, update latest undo state
      history.length = historyPos;
      ctl.updateCursor();
      const a = latestCursor.slice() as HistoryPositionState;

      const state = history[historyPos - 1];
      state.a = a;
      state.v = ctl.value;
    },
    /** Step back in undo/redo history. */
    undo() {
      if (historyPos <= 1) return false;

      ctl.navigated();
      const state = history[--historyPos];
      ctl.value = history[historyPos - 1].v;
      ctl.start = state.b[0];
      ctl.end = state.b[1];
      ctl.direction = state.b[2];
      ctl.updateCursor();
      return true;
    },
    /** Step forward in undo/redo history. */
    redo() {
      if (historyPos >= history.length) return false;
      const state = history[historyPos++];
      ctl.value = state.v;
      ctl.start = state.a[0];
      ctl.end = state.a[1];
      ctl.direction = state.a[2];
      ctl.navigated();
      ctl.updateCursor();
      return true;
    },

    /** Index of line that pos lands on. Starts at 0. */
    line(pos: number) {
      return ctl.value.slice(0, pos).match(/\n/g)?.length ?? 0;
    },
    /** Column at position on line. 0 is before the line's first character. */
    column(pos: number) {
      return pos - ctl.linePosStart(pos);
    },
    /** Position of beginning of the line that pos lands on.
     * Position is 0 or immediately follows '\n'. */
    linePosStart(pos: number) {
      return ctl.value.lastIndexOf("\n", pos - 1) + 1;
    },
    /** Position of ending of the line that pos lands on.
     * Position is end of string or immediately precedes '\n'. */
    linePosEnd(pos: number) {
      const index = ctl.value.indexOf("\n", pos);
      return index < 0 ? ctl.length : index;
    },
    /** Gets the full text of the line that pos lands on. */
    linePosText(pos: number) {
      return ctl.value.slice(ctl.linePosStart(pos), ctl.linePosEnd(pos) + 1);
    },
    /** Get the position of the start of the given line index.
     * Position is 0 or immediately follows '\n'. */
    lineIndexStart(index: number) {
      let pos = 0;
      for (; index > 0; index--) {
        pos = ctl.value.indexOf("\n", pos);
        if (pos < 0) return ctl.length;
        pos++;
      }
      return pos;
    },
    /** Get the position of the end of the given line index.
     * Position is end of string or immediately precedes '\n'. */
    lineIndexEnd(index: number) {
      return ctl.linePosEnd(ctl.lineIndexStart(index));
    },
    /** Get the string of the given line index. */
    lineIndexText(index: number) {
      const start = ctl.lineIndexStart(index);
      const end = ctl.linePosEnd(start);
      return ctl.value.slice(start, end);
    },
    /** Insert text at position. */
    insertAt(pos: number, text: string, includeOnEdge?: boolean) {
      const E = includeOnEdge;
      const v = ctl.value;
      const s = ctl.start;
      const e = ctl.end;
      const d = ctl.direction;
      const len = text.length;
      ctl.value = v.slice(0, pos) + text + v.slice(pos);
      ctl.start = s < pos ? s : s > pos ? s + len : E ? s : s + len;
      ctl.end = e < pos ? e : e > pos || E ? e + len : max(ctl.start, e);
      ctl.direction = d;
    },
    /** Replace a range of text. */
    replaceRange(
      start: number,
      end: number,
      text: string,
      includeOnEdge?: boolean
    ) {
      const E = includeOnEdge;
      if (start > end) [end, start] = [start, end];
      const v = ctl.value;
      const s = ctl.start;
      const e = ctl.end;
      const d = ctl.direction;
      const delta = text.length - (end - start);
      ctl.value = v.slice(0, start) + text + v.slice(end);
      ctl.start = s < start ? s : s > end ? s + delta : E ? start : end;
      ctl.end =
        e < start ? e : e > end ? e + delta : E ? end : max(ctl.start, start);
      ctl.direction = d;
    },
    /** Replace selected text. */
    replaceSelection(text: string) {
      const v = ctl.value;
      const s = ctl.start;
      const e = ctl.end;
      const d = ctl.direction;
      ctl.value = v.slice(0, s) + text + v.slice(e);
      ctl.start = s;
      ctl.end = s + text.length;
      ctl.direction = d;
    },
    /** Delete text range. */
    deleteRange(start: number, end: number) {
      if (start > end) [end, start] = [start, end];
      if (start === end) return;
      const v = ctl.value;
      const s = ctl.start;
      const e = ctl.end;
      const d = ctl.direction;
      const len = end - start;
      ctl.value = v.slice(0, start) + v.slice(end);
      ctl.start = s < start ? s : s < end ? start : s - len;
      ctl.end = e < start ? e : e < end ? start : e - len;
      ctl.direction = d;
    },
    /** Delete the selected text. */
    deleteSelected() {
      const v = ctl.value;
      const s = ctl.start;
      const e = ctl.end;
      ctl.value = v.slice(0, s) + v.slice(e);
      ctl.startEnd = s;
      ctl.direction = "none";
    },
    /** Iterate over line starts and ends for all lines touched by the given range. 'reverse'
     * indicates if lines should iterate from last to first.
     *
     * **Notice:** Default for 'reverse' is `true`. This is to allow line mutations during
     * iteration. */
    *iterateLinesInRange(
      start: number,
      end: number,
      reverse: boolean = true
    ): Generator<[number, number]> {
      if (start > end) [end, start] = [start, end];

      start = ctl.linePosStart(start);
      end = ctl.linePosEnd(max(end - 1, start));

      if (reverse) {
        let spos = ctl.linePosStart(end);
        let epos = end;
        for (; spos > start; epos = spos - 1, spos = ctl.linePosStart(epos)) {
          yield [spos, epos];
        }
        yield [spos, epos];
      } else {
        let spos = start;
        let epos = ctl.linePosEnd(start);
        for (; epos < end; spos = epos + 1, epos = ctl.linePosEnd(spos)) {
          yield [spos, epos];
        }
        yield [spos, epos];
      }
    },
  };

  // store the initial state
  ctl.pushUndo(true); // prevent updates to initial undo state

  return ctl;
};

/** Get a textarea's attached code controller, or create and attach a new one. */
export const getTextAreaController = (textArea: HTMLTextAreaElement) => {
  let ctl = textAreaControllers.get(textArea);

  if (!ctl) {
    ctl = createTextAreaController(textArea);
    textAreaControllers.set(textArea, ctl);
  }
  return ctl;
};

/** Handler for automatically configuring code controller for textarea.
 * Attach this one handler to the following events:
 * - keydown
 * - keyup
 * - focus
 * - blur
 * - mousedown
 * - mouseup
 *
 * Attaching to other event handlers is unnecessary, but will not break functionality.
 * Unnecessary invocations will be reported to help avoid accidental bindings. */
export const textAreaCodeHandler = (
  evt: MouseEvent | FocusEvent | KeyboardEvent | InputEvent
) => {
  const target = evt.target;
  if (!(target instanceof HTMLTextAreaElement)) return;

  const ctl = getTextAreaController(target);

  if (evt instanceof MouseEvent) {
    if (evt.type === "mousedown" || evt.type === "mouseup") {
      ctl.updateCursor();
      return;
    }
  }
  if (evt instanceof FocusEvent) {
    if (evt.type === "focus" || evt.type === "blur") {
      ctl.updateCursor();
      return;
    }
  }
  if (evt instanceof KeyboardEvent) {
    if (evt.type === "keydown") {
      const shortcut = [
        evt.ctrlKey ? "ctrl+" : "",
        evt.altKey ? "alt+" : "",
        evt.shiftKey ? "shift+" : "",
        evt.metaKey ? "meta+" : "",
        evt.key.toLowerCase(),
      ].join("");

      let pushUndo = true;

      switch (shortcut) {
        case "ctrl+]":
        case "tab": {
          if (shortcut === "ctrl+]" || ctl.isMultilineSelection) {
            // indent selected lines
            for (const [s, e] of ctl.iterateLinesInRange(ctl.start, ctl.end)) {
              const white = ctl.value.slice(s, e).match(/^[ \t]*/)![0].length;

              ctl.insertAt(
                s + white,
                " ".repeat(tabSize - (white % tabSize)),
                false
              );
            }
          } else {
            // add mid-text tab
            const white = tabSize - (ctl.column(ctl.start) % tabSize);
            ctl.replaceSelection(" ".repeat(white));
            ctl.start = ctl.end;
          }
          break;
        }
        case "ctrl+[":
        case "shift+tab": {
          // unindent selected lines
          for (const [s, e] of ctl.iterateLinesInRange(ctl.start, ctl.end)) {
            const white = ctl.value.slice(s, e).match(/^[ \t]*/)![0].length;
            const remove = white % tabSize || tabSize;
            ctl.deleteRange(max(s + white - remove, s), s + white);
          }
          break;
        }
        case "backspace": {
          if (!ctl.isSelecting && ctl.start > 0) {
            // backspace tab
            const s = ctl.linePosStart(ctl.start);
            const toStart = ctl.value.slice(s, ctl.start);
            if (/^[ \t]+$/.test(toStart)) {
              const remove = toStart.length % tabSize || tabSize;
              ctl.deleteRange(ctl.start - remove, ctl.start);
              break;
            }

            if (ctl.end < ctl.length) {
              const prev = ctl.value[ctl.start - 1];
              const next = ctl.value[ctl.start];
              if (prev in wrappers && next === wrappers[prev]) {
                ctl.deleteRange(ctl.start - 1, ctl.start + 1);
                break;
              }
            }
          }
          return; // fall back to default action
        }
        case "ctrl+backspace": {
          if (ctl.isSelecting) {
            ctl.deleteSelected();
          } else if (ctl.start > 0) {
            const str = ctl.value.slice(0, ctl.start);
            let match = str.match(/([ \t]+|[\r\n]+|[(){}[\]]+|[\w]+)$/);
            match ??= str.match(/[^ \t\r\n(){}[\]\w]+$/);
            if (match) {
              ctl.deleteRange(ctl.start - match[0].length, ctl.start);
              break;
            }
          }
          return; // fall back to default action
        }
        case 'shift+"':
        case "'":
        case "[":
        case "shift+(":
        case "shift+{":
        case "shift+}":
        case "shift+)":
        case "]": {
          const char = evt.key;
          const a = char;
          const b = wrappers[char];

          if (b) {
            // handle wrap text
            if (ctl.isSelecting) {
              ctl.insertAt(ctl.end, b, false);
              ctl.insertAt(ctl.start, a, false);
              break;
            }
            // handle auto-pair
            if (ctl.end === ctl.length || /\s/.test(ctl.value[ctl.end])) {
              if (
                !`'"`.includes(char) ||
                ctl.start === 0 ||
                (!/\w/.test(ctl.value[ctl.start - 1]) &&
                  ctl.value[ctl.start - 1] !== char)
              ) {
                ctl.insertAt(ctl.end, a + b);
                ctl.startEnd = ctl.end - 1;
                break;
              }
            }
          }

          // handle type-over closer
          if (
            !ctl.isSelecting &&
            ctl.end < ctl.length &&
            !"([{".includes(char) &&
            ctl.value[ctl.end] === char
          ) {
            ctl.startEnd = ctl.end + 1;
            break;
          }

          return; // fall back to default action
        }
        case "ctrl+l": {
          // select full line
          ctl.start = ctl.linePosStart(ctl.start);
          ctl.end = ctl.linePosEnd(ctl.end) + 1;
          ctl.updateCursor();
          break;
        }
        case "shift+home":
        case "home": {
          // jump after line tabs
          const pos = ctl.cursor;
          const lineStart = ctl.linePosStart(pos);
          const white = ctl.value.slice(lineStart).match(/^[ \t]*/)![0].length;
          if (!white) return; // no tabs at start: fall back to default action

          if (pos === lineStart + white) {
            if (shortcut === "shift+home") {
              ctl.cursor = lineStart;
            } else {
              ctl.startEnd = lineStart;
            }
          } else {
            if (shortcut === "shift+home") {
              ctl.cursor = lineStart + white;
            } else {
              ctl.startEnd = lineStart + white;
            }
          }
          break;
        }
        case "ctrl+shift+backspace": {
          // delete to line start
          ctl.deleteSelected();
          const s = ctl.linePosStart(ctl.start);
          ctl.deleteRange(s, ctl.start);
          break;
        }
        case "enter": {
          // new line: smart tabs
          const white = "\n" + ctl.linePosText(ctl.start).match(/^[ \t]*/)![0];
          ctl.replaceSelection(white);
          ctl.start = ctl.end;
          break;
        }
        case "ctrl+enter": {
          // new line below: smart tabs
          const white = "\n" + ctl.linePosText(ctl.cursor).match(/^[ \t]*/)![0];
          const pos = ctl.linePosEnd(ctl.cursor);
          ctl.insertAt(pos, white);
          ctl.startEnd = pos + white.length;
          break;
        }
        case "ctrl+shift+enter": {
          // new line above
          const white = ctl.linePosText(ctl.cursor).match(/^[ \t]*/)![0] + "\n";
          const pos = ctl.linePosStart(ctl.cursor);
          ctl.insertAt(pos, white);
          ctl.startEnd = pos + white.length - 1;
          break;
        }
        case "alt+arrowup":
        case "ctrl+shift+arrowup": {
          // move line(s) up
          const s = ctl.linePosStart(ctl.start);
          const e = ctl.linePosEnd(ctl.end);
          if (s > 0) {
            const prev = ctl.linePosStart(s - 1);
            const v = ctl.value;
            const ss = ctl.start;
            const ee = ctl.end;
            const above = v.slice(prev, s - 1);
            ctl.value =
              v.slice(0, prev) + v.slice(s, e) + "\n" + above + v.slice(e);
            const delta = above.length + 1;
            ctl.start = ss - delta;
            ctl.end = ee - delta;
          }
          break;
        }
        case "alt+arrowdown":
        case "ctrl+shift+arrowdown": {
          // move line(s) down
          const s = ctl.linePosStart(ctl.start);
          const e = ctl.linePosEnd(ctl.end);
          if (e < ctl.length) {
            const next = ctl.linePosEnd(e + 1);
            const v = ctl.value;
            const ss = ctl.start;
            const ee = ctl.end;
            const below = v.slice(e + 1, next);
            ctl.value =
              v.slice(0, s) + below + "\n" + v.slice(s, e) + v.slice(next);
            const delta = below.length + 1;
            ctl.start = ss + delta;
            ctl.end = ee + delta;
          }
          break;
        }
        case "ctrl+z": {
          // undo
          pushUndo = false;
          ctl.undo();
          break;
        }
        case "ctrl+shift+z": {
          // redo
          pushUndo = false;
          ctl.redo();
          break;
        }
        default:
          // console.log(shortcut); // debug
          if (navigationKeys.includes(evt.key.toLowerCase())) {
            ctl.navigated();
          }
          return;
      }

      if (pushUndo) ctl.pushUndo();

      evt.preventDefault();
      return;
    }
    if (evt.type === "keyup") {
      ctl.updateCursor();
      return;
    }
  }
  if (evt instanceof InputEvent) {
    if (evt.type === "input") {
      ctl.updateUndo();
      return;
    }
  }

  console.warn(
    `textAreaCodeHandler unnecessarily bound to event type '${evt.type}'`
  );
};

export const textAreaReactHandlers = {
  onKeyDown: textAreaCodeHandler,
  onKeyUp: textAreaCodeHandler,
  onMouseDown: textAreaCodeHandler,
  onMouseUp: textAreaCodeHandler,
  onFocus: textAreaCodeHandler,
  onBlur: textAreaCodeHandler,
  onInput: textAreaCodeHandler,
} satisfies React.HTMLAttributes<HTMLTextAreaElement>;
