import {
  FileCode,
  FileType,
  ScrollTextIcon,
  type LucideProps,
} from "lucide-preact";
import type { StoredScript } from "../includes/types";

export interface ScriptIconProps extends LucideProps {
  script: StoredScript;
}

export const ScriptIcon = ({ script, ...props }: ScriptIconProps) => {
  return script.language === "javascript" ? (
    <FileCode size={20} {...props} />
  ) : script.language === "typescript" ? (
    <FileType size={20} {...props} />
  ) : (
    <ScrollTextIcon size={20} {...props} />
  );
};
