import prettier from "prettier/standalone";
import prettierBabel from "prettier/plugins/babel";
import prettierEstree from "prettier/plugins/estree";
import { prettierConfigManager } from "../managers/prettierConfigManager";
import { webScripts } from "./webScriptService";
import type { MonacoEditor } from "../monacoSetup";

export class PrettierService {
  async format(
    code: string,
    monaco?: {
      model?: MonacoEditor.ITextModel;
      editor?: MonacoEditor.IStandaloneCodeEditor;
    }
  ): Promise<string | null> {
    const originalCode = code;

    // prettify header comment
    const data = webScripts.parseHeader(originalCode);
    const header = webScripts.extractHeader(originalCode);
    const newHeader = webScripts.updateHeader(header, data);
    code = newHeader + originalCode.slice(header.length);
    const headerOffset = newHeader.length - header.length; // cursor shift

    // prepare prettier options
    const prettierOptions = {
      ...prettierConfigManager.getPrettierConfig(),
      parser: "babel-ts",
      plugins: [prettierEstree, prettierBabel],
      cursorOffset: -1,
    };

    // apply prettier transform
    try {
      if (monaco?.model && monaco?.editor) {
        // editor is available: maintain cursor position
        let pos = monaco.editor.getPosition();
        let offset = pos ? monaco.model.getOffsetAt(pos) + headerOffset : 0;

        prettierOptions.cursorOffset = offset;

        const { formatted, cursorOffset: newOffset } =
          await prettier.formatWithCursor(code, prettierOptions);
        if (formatted === originalCode) return formatted;

        if (newOffset !== -1) offset = newOffset;

        monaco.model.pushEditOperations(
          [],
          [{ range: monaco.model.getFullModelRange(), text: formatted }],
          () => null
        );

        pos = monaco.model.getPositionAt(offset);
        monaco.editor.setPosition(pos);

        return formatted;
      } else {
        // editor not available: just format the code
        const formatted = await prettier.format(code, prettierOptions);
        if (formatted === originalCode) return formatted;

        if (monaco?.model) {
          monaco.model.pushEditOperations(
            [],
            [{ range: monaco.model.getFullModelRange(), text: formatted }],
            () => null
          );
        }

        return formatted;
      }
    } catch (_err) {}

    return null;
  }
}

export const prettierService = new PrettierService();
