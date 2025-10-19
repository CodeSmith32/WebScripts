import { KeyCode, KeyMod, MonacoEditor, type IDisposable } from "./monacoSetup";
import { array, object, optional, string, unknown } from "zod/mini";

export const keyMapping = {
  backspace: KeyCode.Backspace,
  tab: KeyCode.Tab,
  enter: KeyCode.Enter,
  // shift: KeyCode.Shift,
  // ctrl: KeyCode.Ctrl,
  // alt: KeyCode.Alt,
  pausebreak: KeyCode.PauseBreak,
  capslock: KeyCode.CapsLock,
  escape: KeyCode.Escape,
  space: KeyCode.Space,
  pageup: KeyCode.PageUp,
  pagedown: KeyCode.PageDown,
  end: KeyCode.End,
  home: KeyCode.Home,
  left: KeyCode.LeftArrow,
  up: KeyCode.UpArrow,
  right: KeyCode.RightArrow,
  down: KeyCode.DownArrow,
  insert: KeyCode.Insert,
  delete: KeyCode.Delete,
  0: KeyCode.Digit0,
  1: KeyCode.Digit1,
  2: KeyCode.Digit2,
  3: KeyCode.Digit3,
  4: KeyCode.Digit4,
  5: KeyCode.Digit5,
  6: KeyCode.Digit6,
  7: KeyCode.Digit7,
  8: KeyCode.Digit8,
  9: KeyCode.Digit9,
  a: KeyCode.KeyA,
  b: KeyCode.KeyB,
  c: KeyCode.KeyC,
  d: KeyCode.KeyD,
  e: KeyCode.KeyE,
  f: KeyCode.KeyF,
  g: KeyCode.KeyG,
  h: KeyCode.KeyH,
  i: KeyCode.KeyI,
  j: KeyCode.KeyJ,
  k: KeyCode.KeyK,
  l: KeyCode.KeyL,
  m: KeyCode.KeyM,
  n: KeyCode.KeyN,
  o: KeyCode.KeyO,
  p: KeyCode.KeyP,
  q: KeyCode.KeyQ,
  r: KeyCode.KeyR,
  s: KeyCode.KeyS,
  t: KeyCode.KeyT,
  u: KeyCode.KeyU,
  v: KeyCode.KeyV,
  w: KeyCode.KeyW,
  x: KeyCode.KeyX,
  y: KeyCode.KeyY,
  z: KeyCode.KeyZ,
  // meta: KeyCode.Meta,
  contextmenu: KeyCode.ContextMenu,
  f1: KeyCode.F1,
  f2: KeyCode.F2,
  f3: KeyCode.F3,
  f4: KeyCode.F4,
  f5: KeyCode.F5,
  f6: KeyCode.F6,
  f7: KeyCode.F7,
  f8: KeyCode.F8,
  f9: KeyCode.F9,
  f10: KeyCode.F10,
  f11: KeyCode.F11,
  f12: KeyCode.F12,
  f13: KeyCode.F13,
  f14: KeyCode.F14,
  f15: KeyCode.F15,
  f16: KeyCode.F16,
  f17: KeyCode.F17,
  f18: KeyCode.F18,
  f19: KeyCode.F19,
  f20: KeyCode.F20,
  f21: KeyCode.F21,
  f22: KeyCode.F22,
  f23: KeyCode.F23,
  f24: KeyCode.F24,
  numlock: KeyCode.NumLock,
  scrolllock: KeyCode.ScrollLock,
  ";": KeyCode.Semicolon,
  "=": KeyCode.Equal,
  ",": KeyCode.Comma,
  "-": KeyCode.Minus,
  ".": KeyCode.Period,
  "/": KeyCode.Slash,
  "`": KeyCode.Backquote,
  "[": KeyCode.BracketLeft,
  "\\": KeyCode.Backslash,
  "]": KeyCode.BracketRight,
  '"': KeyCode.Quote,
  oem_8: KeyCode.OEM_8,
  intl_backslash: KeyCode.IntlBackslash,
  numpad0: KeyCode.Numpad0,
  numpad1: KeyCode.Numpad1,
  numpad2: KeyCode.Numpad2,
  numpad3: KeyCode.Numpad3,
  numpad4: KeyCode.Numpad4,
  numpad5: KeyCode.Numpad5,
  numpad6: KeyCode.Numpad6,
  numpad7: KeyCode.Numpad7,
  numpad8: KeyCode.Numpad8,
  numpad9: KeyCode.Numpad9,
  numpad_multiply: KeyCode.NumpadMultiply,
  numpad_add: KeyCode.NumpadAdd,
  numpad_separator: KeyCode.NUMPAD_SEPARATOR,
  numpad_subtract: KeyCode.NumpadSubtract,
  numpad_decimal: KeyCode.NumpadDecimal,
  numpad_divide: KeyCode.NumpadDivide,
  key_in_composition: KeyCode.KEY_IN_COMPOSITION,
  abnt_c1: KeyCode.ABNT_C1,
  abnt_c2: KeyCode.ABNT_C2,
  audio_volume_mute: KeyCode.AudioVolumeMute,
  audio_volume_up: KeyCode.AudioVolumeUp,
  audio_volume_down: KeyCode.AudioVolumeDown,
  browser_search: KeyCode.BrowserSearch,
  browser_home: KeyCode.BrowserHome,
  browser_back: KeyCode.BrowserBack,
  browser_forward: KeyCode.BrowserForward,
  media_track_next: KeyCode.MediaTrackNext,
  media_track_previous: KeyCode.MediaTrackPrevious,
  media_stop: KeyCode.MediaStop,
  media_play_pause: KeyCode.MediaPlayPause,
  launch_media_player: KeyCode.LaunchMediaPlayer,
  launch_mail: KeyCode.LaunchMail,
  launch_app2: KeyCode.LaunchApp2,
  clear: KeyCode.Clear,
};
Object.setPrototypeOf(keyMapping, null);

export const keybindingSchema = array(
  object({
    key: string(),
    command: string(),
    args: optional(unknown()),
    when: optional(string()),
  })
);

export class KeybindingManager {
  #bindingsSubscription: IDisposable | null = null;
  #lastErrors: string[] = [];

  readonly helpUrl: string =
    "https://code.visualstudio.com/docs/configure/keybindings#_keyboard-rules";

  private parseKeyCode(key: string): number | null {
    // split chord
    const chords = key.toLowerCase().trim().split(/\s+/);

    // validate number of chords
    if (chords.length > 2) {
      this.#lastErrors.push("Invalid key: Key has too many chords: " + key);
      return null;
    }

    // parse chords
    let i = 0;
    let code = 0;
    for (const chord of chords) {
      const combo = new Set(chord.split("+"));
      const get = (key: string) =>
        combo.has(key) ? (combo.delete(key), true) : false;

      let subCode = 0;

      // extract modifiers
      if (get("ctrl") || get("cmd") || get("meta")) {
        subCode |= KeyMod.CtrlCmd;
      }
      if (get("win")) {
        subCode |= KeyMod.WinCtrl;
      }
      if (get("alt")) {
        subCode |= KeyMod.Alt;
      }
      if (get("shift")) {
        subCode |= KeyMod.Shift;
      }

      // extract key
      const remaining = [...combo];
      if (remaining.length !== 1 || !(remaining[0] in keyMapping)) {
        this.#lastErrors.push(
          "Invalid key: Key format for combo is wrong: " + chord
        );
        return null;
      }

      // build key code
      subCode |= keyMapping[remaining[0] as keyof typeof keyMapping];
      code |= subCode << i;
      i += 16;
    }

    return code;
  }

  private parseKeybindings(
    json: string
  ): MonacoEditor.IKeybindingRule[] | null {
    this.#lastErrors = [];

    let jsonData: unknown;
    try {
      jsonData = JSON.parse(json);
    } catch (err) {
      this.#lastErrors.push((err as Error).message);
      return null;
    }

    const keybindingsParsed = keybindingSchema.safeParse(jsonData);
    if (!keybindingsParsed.success) {
      this.#lastErrors.push(keybindingsParsed.error.message);
      return null;
    }

    const keybindings = keybindingsParsed.data;

    const bindings: MonacoEditor.IKeybindingRule[] = [];
    for (const { key, command, args, when } of keybindings) {
      const keybinding = this.parseKeyCode(key);

      if (keybinding !== null) {
        bindings.push({ keybinding, command, commandArgs: args, when });
      }
    }

    return bindings;
  }

  validateKeybindings(json: string): boolean {
    return !!this.parseKeybindings(json);
  }

  setKeybindings(json: string): boolean {
    this.#bindingsSubscription?.dispose();

    const keybindings = this.parseKeybindings(json);
    if (!keybindings) return false;

    this.#bindingsSubscription = MonacoEditor.addKeybindingRules(keybindings);
    return true;
  }

  revokeKeybindings() {
    this.#bindingsSubscription?.dispose();
    this.#bindingsSubscription = null;
  }

  getErrors(): string[] {
    return this.#lastErrors;
  }
}

export const keybindingManager = new KeybindingManager();
