import type { CSPAction } from "../../includes/types";
import { Dropdown, Option, type DropdownProps } from "../core/Dropdown";

export interface CSPActionDropdownProps
  extends Omit<DropdownProps, "onValueChange"> {
  onValueChange?: (value: CSPAction) => void;
}

export const CSPActionDropdown = ({
  onValueChange,
  ...props
}: CSPActionDropdownProps) => {
  return (
    <Dropdown
      onValueChange={(cspAction) => {
        onValueChange?.(cspAction as CSPAction);
      }}
      {...props}
    >
      <Option value="leave">Leave Unchanged</Option>
      <Option value="disable">Disable / Remove CSP Header</Option>
    </Dropdown>
  );
};
