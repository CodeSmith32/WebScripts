import type { ComponentChildren } from "preact";
import { Popup, type PopupProps } from "./popups/Popup";
import { usePopup } from "./popups/ClassPopup";
import { cn } from "../includes/core/classes";
import { Button, type ButtonVariantType } from "./core/Button";

export interface PopupConfirmCloseData {
  decision: boolean | null;
}

export interface PopupConfirmProps extends PopupProps {
  message?: ComponentChildren;
  yesLabel?: ComponentChildren;
  yesVariant?: ButtonVariantType;
  noLabel?: ComponentChildren;
  noVariant?: ButtonVariantType;
}

export const PopupConfirm = ({
  message,
  children: _,
  contentClassName,
  yesLabel = "OK",
  yesVariant = "primary",
  noLabel = "Cancel",
  noVariant = "secondary",
  ...props
}: PopupConfirmProps) => {
  const popup = usePopup<PopupConfirmCloseData>();

  if (typeof message === "string") {
    message = <p>{message}</p>;
  }

  const handleYes = () => {
    popup.close({ decision: true });
  };
  const handleNo = () => {
    popup.close({ decision: false });
  };
  const handleCancel = () => {
    popup.close({ decision: null });
  };

  return (
    <Popup
      onClickX={handleCancel}
      onEnter={handleYes}
      onEscape={handleNo}
      contentClassName={cn("flex flex-col gap-2", contentClassName)}
      {...props}
    >
      {message}
      <div className="flex flex-row justify-between mt-4">
        <Button variant={yesVariant} onClick={handleYes}>
          {yesLabel}
        </Button>

        <Button variant={noVariant} onClick={handleNo}>
          {noLabel}
        </Button>
      </div>
    </Popup>
  );
};
