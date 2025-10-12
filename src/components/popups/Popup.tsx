import type { ComponentChildren, TargetedMouseEvent } from "preact";
import { cn } from "../../includes/classes";
import { IconButton } from "../IconButton";
import { XIcon } from "lucide-preact";
import { useEffect, useRef } from "preact/hooks";

export interface PopupProps {
  children?: ComponentChildren;
  popupClassName?: string;
  overlayClassName?: string;
  contentClassName?: string;
  showHeader?: boolean;
  title?: ComponentChildren;
  onClickOut?: (evt: TargetedMouseEvent<HTMLDialogElement>) => void;
  onClickX?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
}

export const Popup = ({
  children,
  popupClassName,
  overlayClassName,
  contentClassName,
  showHeader = true,
  title,
  onClickOut,
  onClickX,
  onEnter,
  onEscape,
}: PopupProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    // using a modal <dialog> prevents navigating to the background with tab/shift-tab
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        "popup-background-overlay text-text fixed z-10 inset-0 w-[100vw] h-[100vh] bg-black/20 backdrop-blur-[2px]",
        overlayClassName
      )}
      onClick={(evt) => {
        const target = evt.target as HTMLDialogElement;
        if (target.classList.contains("popup-background-overlay")) {
          onClickOut?.(evt);
        }
      }}
      onKeyDown={(evt) => {
        const target = evt.target as HTMLElement;
        const tag = target.tagName.toLowerCase();

        switch (evt.key) {
          case "Enter":
            if (tag === "textarea") break;
            onEnter?.();
            break;
          case "Escape":
            onEscape?.();
            break;
        }
      }}
    >
      <div
        className={cn(
          "w-md absolute left-1/2 top-1/2 transform-[translate(-50%,-50%)] bg-background rounded-md overflow-hidden shadow-[0_0_5px_#ffffff60]",
          popupClassName
        )}
      >
        {showHeader && (
          <div className="h-10 flex flex-row justify-between items-center pl-3">
            <span>{title}</span>
            {onClickX && (
              <IconButton className="p-0.5 w-8 h-8 mr-1" onClick={onClickX}>
                <XIcon />
              </IconButton>
            )}
          </div>
        )}
        <div className={cn("p-4 bg-background-dark", contentClassName)}>
          {children}
        </div>
      </div>
    </dialog>
  );
};
