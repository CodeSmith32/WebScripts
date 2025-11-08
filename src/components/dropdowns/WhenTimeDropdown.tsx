import type { WhenTime } from "../../includes/types";
import { Dropdown, Option, type DropdownProps } from "../core/Dropdown";

export interface WhenTimeDropdownProps
  extends Omit<DropdownProps, "onValueChange"> {
  onValueChange?: (value: WhenTime) => void;
}

export const WhenTimeDropdown = ({
  onValueChange,
  ...props
}: WhenTimeDropdownProps) => {
  return (
    <Dropdown
      onValueChange={(when) => {
        onValueChange?.(when as WhenTime);
      }}
      {...props}
    >
      <Option value="start">Document Start</Option>
      <Option value="end">Document End</Option>
      <Option value="idle">Document Idle</Option>
    </Dropdown>
  );
};
