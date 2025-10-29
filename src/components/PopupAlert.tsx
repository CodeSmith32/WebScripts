import type { ComponentChildren } from "preact";
import { usePopup } from "./popups/ClassPopup";
import { Popup, type PopupProps } from "./popups/Popup";
import { Button, type ButtonVariantType } from "./core/Button";
import { cn } from "../includes/core/classes";

export interface PopupAlertProps extends PopupProps {
  message?: ComponentChildren;
  okLabel?: ComponentChildren;
  okVariant?: ButtonVariantType;
}

export const PopupAlert = ({
  message,
  okLabel = "OK",
  okVariant = "primary",
  contentClassName,
  ...props
}: PopupAlertProps) => {
  const popup = usePopup<void>();

  const handleClose = () => {
    popup.close();
  };

  if (typeof message === "string") {
    message = <p>{message}</p>;
  }

  return (
    <Popup
      contentClassName={cn("flex flex-col gap-2", contentClassName)}
      {...props}
    >
      {message}
      <div className="flex flex-row justify-center mt-4">
        <Button variant={okVariant} onClick={handleClose}>
          {okLabel}
        </Button>
      </div>
    </Popup>
  );
};
