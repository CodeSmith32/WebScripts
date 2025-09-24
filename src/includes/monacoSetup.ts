import "monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution.js";
import "monaco-editor/esm/vs/language/typescript/monaco.contribution.js";
import "monaco-editor/esm/vs/language/typescript/ts.worker.js";
import "monaco-editor/esm/vs/editor/browser/editorBrowser.js";
import "monaco-editor/esm/vs/editor/edcore.main.js";
import Monokai from "monaco-themes/themes/Monokai.json";
import {
  editor as MonacoEditor,
  languages as MonacoLanguages,
} from "monaco-editor/esm/vs/editor/editor.api.js";

MonacoEditor.defineTheme("theme", Monokai as MonacoEditor.IStandaloneThemeData);

export { MonacoEditor, MonacoLanguages };
