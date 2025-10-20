export type Direction = "forward" | "backward" | "none";

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

export interface CodeAreaEvents {
  change: { type: "change"; value: string };
}

export type CodeAreaEventName = keyof CodeAreaEvents;

export type CodeAreaEventHandler<T extends CodeAreaEventName> = (
  event: CodeAreaEvents[T]
) => void;

type HistoryPositionState = [number, number, Direction];
type HistoryState = {
  // 'before change' value == 'after change' value of previous entry
  b: HistoryPositionState; // 'before change' cursor state
  a: HistoryPositionState; // 'after change' cursor state
  v: string; // 'after change' value
  n: boolean; // if navigation occurred after change; if so, a new undo state must be pushed
};

export interface CodeAreaOptions {
  tabSize?: number;
}

/** Create and return a new textarea code controller. */
export class CodeArea {
  static #controllerMap = new WeakMap<HTMLTextAreaElement, CodeArea>();

  #history: HistoryState[] = [];

  // indicates position between history entries (1 is the earliest: just after the first entry)
  // undo / redo steps over previous / next entry, applying the action
  #historyPos = 0; // starts at 0, but pushUndo is called immediately below to initiate

  // indicates cursor's most recent position state
  // when undo is pushed, this is used as the 'before change' cursor state
  #latestCursor: HistoryPositionState = [0, 0, "none"];

  #eventHandlers = Object.create(null) as {
    [event in CodeAreaEventName]?: Set<CodeAreaEventHandler<event>>;
  };

  textArea: HTMLTextAreaElement;
  tabSize: number;

  constructor(
    textArea: HTMLTextAreaElement,
    { tabSize = 2 }: CodeAreaOptions = {}
  ) {
    this.textArea = textArea;
    this.tabSize = tabSize;

    // store the initial state
    this.pushUndo(true); // prevent updates to initial undo state
  }

  get length() {
    return this.textArea.value.length;
  }
  get start() {
    return this.textArea.selectionStart;
  }
  set start(start: number) {
    this.textArea.selectionStart = min(max(start, 0), this.length);
  }
  get end() {
    return this.textArea.selectionEnd;
  }
  set end(end: number) {
    this.textArea.selectionEnd = min(max(end, 0), this.length);
  }
  get direction() {
    return this.textArea.selectionDirection;
  }
  set direction(dir: "forward" | "backward" | "none") {
    this.textArea.selectionDirection =
      this.start === this.end ? "none" : dir === "none" ? "forward" : dir;
  }
  set startEnd(pos: number) {
    this.start = this.end = pos;
    this.direction = "none";
  }
  get cursor() {
    return this.direction === "forward" ? this.end : this.start;
  }
  set cursor(pos: number) {
    if (this.direction === "forward") {
      if (pos > this.start) {
        this.end = pos;
      } else {
        // reverse direction if needed
        this.end = this.start;
        this.start = pos;
        this.direction = "backward";
      }
    } else {
      if (pos < this.end) {
        this.start = pos;
      } else {
        // reverse direction if needed
        this.start = this.end;
        this.end = pos;
        this.direction = "forward";
      }
    }
  }
  get isSelecting() {
    return this.start !== this.end;
  }
  get isMultilineSelection() {
    return this.linePosStart(this.start) !== this.linePosStart(this.end);
  }
  get value(): string {
    return this.textArea.value;
  }
  set value(value: string) {
    this.textArea.value = value;
  }
  get selected(): string {
    return this.value.slice(this.start, this.end);
  }

  undoSize() {
    return this.#history.length;
  }
  get canUndo() {
    return this.#historyPos > 1;
  }
  get canRedo() {
    return this.#historyPos < this.#history.length;
  }
  /** Mark navigation as occurred, after which undo does not merge. */
  navigated() {
    if (this.#historyPos > 0) this.#history[this.#historyPos - 1].n = true;
  }
  /** Updates latest cursor state for undo history. */
  updateCursor() {
    if (
      this.#latestCursor[0] !== this.start ||
      this.#latestCursor[1] !== this.end ||
      this.#latestCursor[2] !== this.direction
    ) {
      this.#latestCursor[0] = this.start;
      this.#latestCursor[1] = this.end;
      this.#latestCursor[2] = this.direction;
      // if navigation occurred, undo state cannot be merged
      this.navigated();
    }
  }
  /** Push state to undo stack. */
  pushUndo(n: boolean = false) {
    this.navigated();

    this.#history.length = this.#historyPos;
    const b = this.#latestCursor.slice() as HistoryPositionState;
    this.updateCursor();
    const a = this.#latestCursor.slice() as HistoryPositionState;

    if (
      this.#historyPos &&
      this.#history[this.#historyPos - 1].v === this.value &&
      b[0] === a[0] &&
      b[1] === a[1] &&
      b[2] === a[2]
    ) {
      // don't push undo if nothing changed
      return;
    }

    this.#history[this.#historyPos++] = { b, a, v: this.value, n };
  }
  /** Update the current undo state without pushing a new state. */
  updateUndo() {
    // if navigation occurred, push new state
    if (this.#history[this.#historyPos - 1].n) {
      this.pushUndo();
      return;
    }

    // else, update latest undo state
    this.#history.length = this.#historyPos;
    this.updateCursor();
    const a = this.#latestCursor.slice() as HistoryPositionState;

    const state = this.#history[this.#historyPos - 1];
    state.a = a;
    state.v = this.value;
  }
  /** Step back in undo/redo history. */
  undo() {
    if (this.#historyPos <= 1) return false;

    this.navigated();
    const state = this.#history[--this.#historyPos];
    this.value = this.#history[this.#historyPos - 1].v;
    this.start = state.b[0];
    this.end = state.b[1];
    this.direction = state.b[2];
    this.updateCursor();
    return true;
  }
  /** Step forward in undo/redo history. */
  redo() {
    if (this.#historyPos >= this.#history.length) return false;
    const state = this.#history[this.#historyPos++];
    this.value = state.v;
    this.start = state.a[0];
    this.end = state.a[1];
    this.direction = state.a[2];
    this.navigated();
    this.updateCursor();
    return true;
  }

  /** Index of line that pos lands on. Starts at 0. */
  line(pos: number) {
    return this.value.slice(0, pos).match(/\n/g)?.length ?? 0;
  }
  /** Column at position on line. 0 is before the line's first character. */
  column(pos: number) {
    return pos - this.linePosStart(pos);
  }
  /** Position of beginning of the line that pos lands on.
   * Position is 0 or immediately follows '\n'. */
  linePosStart(pos: number) {
    return this.value.lastIndexOf("\n", pos - 1) + 1;
  }
  /** Position of ending of the line that pos lands on.
   * Position is end of string or immediately precedes '\n'. */
  linePosEnd(pos: number) {
    const index = this.value.indexOf("\n", pos);
    return index < 0 ? this.length : index;
  }
  /** Gets the full text of the line that pos lands on. */
  linePosText(pos: number) {
    return this.value.slice(this.linePosStart(pos), this.linePosEnd(pos) + 1);
  }
  /** Get the position of the start of the given line index.
   * Position is 0 or immediately follows '\n'. */
  lineIndexStart(index: number) {
    let pos = 0;
    for (; index > 0; index--) {
      pos = this.value.indexOf("\n", pos);
      if (pos < 0) return this.length;
      pos++;
    }
    return pos;
  }
  /** Get the position of the end of the given line index.
   * Position is end of string or immediately precedes '\n'. */
  lineIndexEnd(index: number) {
    return this.linePosEnd(this.lineIndexStart(index));
  }
  /** Get the string of the given line index. */
  lineIndexText(index: number) {
    const start = this.lineIndexStart(index);
    const end = this.linePosEnd(start);
    return this.value.slice(start, end);
  }
  /** Insert text at position. */
  insertAt(pos: number, text: string, includeOnEdge?: boolean) {
    const E = includeOnEdge;
    const v = this.value;
    const s = this.start;
    const e = this.end;
    const d = this.direction;
    const len = text.length;
    this.value = v.slice(0, pos) + text + v.slice(pos);
    this.start = s < pos ? s : s > pos ? s + len : E ? s : s + len;
    this.end = e < pos ? e : e > pos || E ? e + len : max(this.start, e);
    this.direction = d;
  }
  /** Replace a range of text. */
  replaceRange(
    start: number,
    end: number,
    text: string,
    includeOnEdge?: boolean
  ) {
    const E = includeOnEdge;
    if (start > end) [end, start] = [start, end];
    const v = this.value;
    const s = this.start;
    const e = this.end;
    const d = this.direction;
    const delta = text.length - (end - start);
    this.value = v.slice(0, start) + text + v.slice(end);
    this.start = s < start ? s : s > end ? s + delta : E ? start : end;
    this.end =
      e < start ? e : e > end ? e + delta : E ? end : max(this.start, start);
    this.direction = d;
  }
  /** Replace selected text. */
  replaceSelection(text: string) {
    const v = this.value;
    const s = this.start;
    const e = this.end;
    const d = this.direction;
    this.value = v.slice(0, s) + text + v.slice(e);
    this.start = s;
    this.end = s + text.length;
    this.direction = d;
  }
  /** Delete text range. */
  deleteRange(start: number, end: number) {
    if (start > end) [end, start] = [start, end];
    if (start === end) return;
    const v = this.value;
    const s = this.start;
    const e = this.end;
    const d = this.direction;
    const len = end - start;
    this.value = v.slice(0, start) + v.slice(end);
    this.start = s < start ? s : s < end ? start : s - len;
    this.end = e < start ? e : e < end ? start : e - len;
    this.direction = d;
  }
  /** Delete the selected text. */
  deleteSelected() {
    const v = this.value;
    const s = this.start;
    const e = this.end;
    this.value = v.slice(0, s) + v.slice(e);
    this.startEnd = s;
    this.direction = "none";
  }
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

    start = this.linePosStart(start);
    end = this.linePosEnd(max(end - 1, start));

    if (reverse) {
      let spos = this.linePosStart(end);
      let epos = end;
      for (; spos > start; epos = spos - 1, spos = this.linePosStart(epos)) {
        yield [spos, epos];
      }
      yield [spos, epos];
    } else {
      let spos = start;
      let epos = this.linePosEnd(start);
      for (; epos < end; spos = epos + 1, epos = this.linePosEnd(spos)) {
        yield [spos, epos];
      }
      yield [spos, epos];
    }
  }

  on<T extends CodeAreaEventName>(type: T, handler: CodeAreaEventHandler<T>) {
    const set = (this.#eventHandlers[type] ??= new Set() as never);
    set.add(handler);
  }
  off<T extends CodeAreaEventName>(type: T, handler: CodeAreaEventHandler<T>) {
    const set = this.#eventHandlers[type];
    set?.delete(handler);
  }
  emit<T extends CodeAreaEventName>(type: T, event: CodeAreaEvents[T]) {
    const set = this.#eventHandlers[type];
    if (!set) return;

    for (const handler of [...set]) {
      handler(event);
    }
  }

  /** Get a textarea's attached code controller, or create and attach a new one. */
  static getController(textArea: HTMLTextAreaElement) {
    let ctl = CodeArea.#controllerMap.get(textArea);

    if (!ctl) {
      ctl = new CodeArea(textArea);
      CodeArea.#controllerMap.set(textArea, ctl);
    }
    return ctl;
  }

  #mouseHandler(_evt: MouseEvent) {
    this.updateCursor();
  }
  #focusHandler(_evt: FocusEvent) {
    this.updateCursor();
  }
  #inputHandler(_evt: InputEvent) {
    this.updateUndo();
    this.emit("change", {
      type: "change",
      value: this.value,
    });
  }
  #keyupHandler(_evt: KeyboardEvent) {
    this.updateCursor();
  }
  #keydownHandler(evt: KeyboardEvent) {
    const shortcut = [
      evt.ctrlKey ? "ctrl+" : "",
      evt.altKey ? "alt+" : "",
      evt.shiftKey ? "shift+" : "",
      evt.metaKey ? "meta+" : "",
      evt.key.toLowerCase(),
    ].join("");

    let pushUndo = true;

    const prevValue = this.value;

    switch (shortcut) {
      case "ctrl+]":
      case "tab": {
        if (shortcut === "ctrl+]" || this.isMultilineSelection) {
          // indent selected lines
          for (const [s, e] of this.iterateLinesInRange(this.start, this.end)) {
            const white = this.value.slice(s, e).match(/^[ \t]*/)![0].length;

            this.insertAt(
              s + white,
              " ".repeat(this.tabSize - (white % this.tabSize)),
              false
            );
          }
        } else {
          // add mid-text tab
          const white = this.tabSize - (this.column(this.start) % this.tabSize);
          this.replaceSelection(" ".repeat(white));
          this.start = this.end;
        }
        break;
      }
      case "ctrl+[":
      case "shift+tab": {
        // unindent selected lines
        for (const [s, e] of this.iterateLinesInRange(this.start, this.end)) {
          const white = this.value.slice(s, e).match(/^[ \t]*/)![0].length;
          const remove = white % this.tabSize || this.tabSize;
          this.deleteRange(max(s + white - remove, s), s + white);
        }
        break;
      }
      case "backspace": {
        if (!this.isSelecting && this.start > 0) {
          // backspace tab
          const s = this.linePosStart(this.start);
          const toStart = this.value.slice(s, this.start);
          if (/^[ \t]+$/.test(toStart)) {
            const remove = toStart.length % this.tabSize || this.tabSize;
            this.deleteRange(this.start - remove, this.start);
            break;
          }

          if (this.end < this.length) {
            const prev = this.value[this.start - 1];
            const next = this.value[this.start];
            if (prev in wrappers && next === wrappers[prev]) {
              this.deleteRange(this.start - 1, this.start + 1);
              break;
            }
          }
        }
        return; // fall back to default action
      }
      case "ctrl+backspace": {
        if (this.isSelecting) {
          this.deleteSelected();
        } else if (this.start > 0) {
          const str = this.value.slice(0, this.start);
          let match = str.match(/([ \t]+|[\r\n]+|[(){}[\]]+|[\w]+)$/);
          match ??= str.match(/[^ \t\r\n(){}[\]\w]+$/);
          if (match) {
            this.deleteRange(this.start - match[0].length, this.start);
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
          if (this.isSelecting) {
            this.insertAt(this.end, b, false);
            this.insertAt(this.start, a, false);
            break;
          }
          // handle auto-pair
          if (this.end === this.length || /\s/.test(this.value[this.end])) {
            if (
              !`'"`.includes(char) ||
              this.start === 0 ||
              (!/\w/.test(this.value[this.start - 1]) &&
                this.value[this.start - 1] !== char)
            ) {
              this.insertAt(this.end, a + b);
              this.startEnd = this.end - 1;
              break;
            }
          }
        }

        // handle type-over closer
        if (
          !this.isSelecting &&
          this.end < this.length &&
          !"([{".includes(char) &&
          this.value[this.end] === char
        ) {
          this.startEnd = this.end + 1;
          break;
        }

        return; // fall back to default action
      }
      case "ctrl+l": {
        // select full line
        this.start = this.linePosStart(this.start);
        this.end = this.linePosEnd(this.end) + 1;
        this.updateCursor();
        break;
      }
      case "shift+home":
      case "home": {
        // jump after line tabs
        const pos = this.cursor;
        const lineStart = this.linePosStart(pos);
        const white = this.value.slice(lineStart).match(/^[ \t]*/)![0].length;
        if (!white) return; // no tabs at start: fall back to default action

        if (pos === lineStart + white) {
          if (shortcut === "shift+home") {
            this.cursor = lineStart;
          } else {
            this.startEnd = lineStart;
          }
        } else {
          if (shortcut === "shift+home") {
            this.cursor = lineStart + white;
          } else {
            this.startEnd = lineStart + white;
          }
        }
        break;
      }
      case "ctrl+shift+backspace": {
        // delete to line start
        this.deleteSelected();
        const s = this.linePosStart(this.start);
        this.deleteRange(s, this.start);
        break;
      }
      case "enter": {
        // new line: smart tabs
        const white = "\n" + this.linePosText(this.start).match(/^[ \t]*/)![0];
        this.replaceSelection(white);
        this.start = this.end;
        break;
      }
      case "ctrl+enter": {
        // new line below: smart tabs
        const white = "\n" + this.linePosText(this.cursor).match(/^[ \t]*/)![0];
        const pos = this.linePosEnd(this.cursor);
        this.insertAt(pos, white);
        this.startEnd = pos + white.length;
        break;
      }
      case "ctrl+shift+enter": {
        // new line above
        const white = this.linePosText(this.cursor).match(/^[ \t]*/)![0] + "\n";
        const pos = this.linePosStart(this.cursor);
        this.insertAt(pos, white);
        this.startEnd = pos + white.length - 1;
        break;
      }
      case "alt+arrowup":
      case "ctrl+shift+arrowup": {
        // move line(s) up
        const s = this.linePosStart(this.start);
        const e = this.linePosEnd(this.end);
        if (s > 0) {
          const prev = this.linePosStart(s - 1);
          const v = this.value;
          const ss = this.start;
          const ee = this.end;
          const above = v.slice(prev, s - 1);
          this.value =
            v.slice(0, prev) + v.slice(s, e) + "\n" + above + v.slice(e);
          const delta = above.length + 1;
          this.start = ss - delta;
          this.end = ee - delta;
        }
        break;
      }
      case "alt+arrowdown":
      case "ctrl+shift+arrowdown": {
        // move line(s) down
        const s = this.linePosStart(this.start);
        const e = this.linePosEnd(this.end);
        if (e < this.length) {
          const next = this.linePosEnd(e + 1);
          const v = this.value;
          const ss = this.start;
          const ee = this.end;
          const below = v.slice(e + 1, next);
          this.value =
            v.slice(0, s) + below + "\n" + v.slice(s, e) + v.slice(next);
          const delta = below.length + 1;
          this.start = ss + delta;
          this.end = ee + delta;
        }
        break;
      }
      case "ctrl+z": {
        // undo
        pushUndo = false;
        this.undo();
        break;
      }
      case "ctrl+shift+z": {
        // redo
        pushUndo = false;
        this.redo();
        break;
      }
      default:
        // console.log(shortcut); // debug
        if (navigationKeys.includes(evt.key.toLowerCase())) {
          this.navigated();
        }
        return;
    }

    if (pushUndo) this.pushUndo();

    evt.preventDefault();

    if (this.value !== prevValue) {
      this.emit("change", {
        type: "change",
        value: this.value,
      });
    }
    return;
  }

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
  static autoHandler(
    evt: MouseEvent | FocusEvent | KeyboardEvent | InputEvent
  ) {
    const target = evt.target;
    if (!(target instanceof HTMLTextAreaElement)) return;

    const ctl = CodeArea.getController(target);

    if (evt instanceof MouseEvent) {
      if (evt.type === "mousedown" || evt.type === "mouseup") {
        ctl.#mouseHandler(evt);
        return;
      }
    }
    if (evt instanceof FocusEvent) {
      if (evt.type === "focus" || evt.type === "blur") {
        ctl.#focusHandler(evt);
        return;
      }
    }
    if (evt instanceof InputEvent) {
      if (evt.type === "input") {
        ctl.#inputHandler(evt);
        return;
      }
    }
    if (evt instanceof KeyboardEvent) {
      if (evt.type === "keydown") {
        ctl.#keydownHandler(evt);
        return;
      }
      if (evt.type === "keyup") {
        ctl.#keyupHandler(evt);
        return;
      }
    }

    console.warn(
      `textAreaCodeHandler unnecessarily bound to event type '${evt.type}'`
    );
  }

  /** A map of React handler props. Simply spread this object into any React <textarea/> to get
   * automatic code editor handling. Note that attaching a handler to the TextAreaController's
   * "change" event is necessary for controlled components. */
  static reactHandlers = {
    onKeyDown: CodeArea.autoHandler,
    onKeyUp: CodeArea.autoHandler,
    onMouseDown: CodeArea.autoHandler,
    onMouseUp: CodeArea.autoHandler,
    onFocus: CodeArea.autoHandler,
    onBlur: CodeArea.autoHandler,
    onInput: CodeArea.autoHandler,
  } satisfies React.HTMLAttributes<HTMLTextAreaElement>;
}
