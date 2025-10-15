// select only js / ts languages
import "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js";
import "monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution.js";
import "monaco-editor/esm/vs/language/typescript/monaco.contribution.js";
// import editor components
import "monaco-editor/esm/vs/editor/browser/editorBrowser.js";
import "monaco-editor/esm/vs/editor/edcore.main.js";
// import front-facing api components
import {
  editor as MonacoEditor,
  languages as MonacoLanguages,
} from "monaco-editor/esm/vs/editor/editor.api.js";
// import theme
import Monokai from "monaco-themes/themes/Monokai.json";

MonacoEditor.defineTheme("theme", Monokai as MonacoEditor.IStandaloneThemeData);

// monaco TextModel has methods not visible on ITextModel
export type TextModel = MonacoEditor.ITextModel & {
  setLanguage(languageIdOrSelection: string, source?: string): void;
};

export { MonacoEditor, MonacoLanguages };
