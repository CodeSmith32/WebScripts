import type { ScriptLanguage } from "../../includes/types";
import { Dropdown, Option, type DropdownProps } from "../core/Dropdown";

export interface LanguageDropdownProps
  extends Omit<DropdownProps, "onValueChange"> {
  onValueChange?: (value: ScriptLanguage) => void;
}

export const LanguageDropdown = ({
  onValueChange,
  ...props
}: LanguageDropdownProps) => {
  return (
    <Dropdown
      onValueChange={(language) => {
        onValueChange?.(language as ScriptLanguage);
      }}
      {...props}
    >
      <Option value="javascript">JavaScript</Option>
      <Option value="typescript">TypeScript</Option>
    </Dropdown>
  );
};
