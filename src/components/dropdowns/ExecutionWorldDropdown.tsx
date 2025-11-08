import type { ExecutionWorld } from "../../includes/types";
import { Dropdown, Option, type DropdownProps } from "../core/Dropdown";

export interface ExecutionWorldDropdownProps
  extends Omit<DropdownProps, "onValueChange"> {
  onValueChange?: (value: ExecutionWorld) => void;
}

export const ExecutionWorldDropdown = ({
  onValueChange,
  ...props
}: ExecutionWorldDropdownProps) => {
  return (
    <Dropdown
      onValueChange={(world) => {
        onValueChange?.(world as ExecutionWorld);
      }}
      {...props}
    >
      <Option value="main">Main: Same as the page</Option>
      <Option value="isolated">Isolated world</Option>
    </Dropdown>
  );
};
