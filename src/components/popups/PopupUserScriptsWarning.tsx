import type { ComponentChildren } from "preact";
import type { UserScriptsErrorType } from "../../includes/webscripts";
import { PopupAlert } from "./PopupAlert";
import { TriangleAlertIcon } from "lucide-preact";

const messageTable: Record<UserScriptsErrorType, ComponentChildren> = {
  allowUserScripts: (
    <div>
      <p className="mb-3">
        You must enable <em>Allow User Scripts</em> for this extension in order
        to be able to use it.
      </p>
      <p className="mb-3">
        Go to <code>chrome://extensions</code>, find the <em>WebScripts</em>{" "}
        extension, and switch on the <em>Allow User Scripts</em> option.
      </p>
    </div>
  ),
  enableDeveloperMode: (
    <div>
      <p className="mb-3">
        You must enable <em>Developer Mode</em> in extensions in order to be
        able to use this extension.
      </p>
      <p className="mb-3">
        Go to <code>chrome://extensions</code>, and at the top-right look for
        and toggle on the <em>Developer Mode</em> switch.
      </p>
    </div>
  ),
  "": (
    <div>
      <p className="mb-3">
        An unknown error prevented the extension from accessing the userScripts
        API. Be sure to enable this extension's <em>Allow User Scripts</em>{" "}
        option, or <em>Developer Mode</em>.
      </p>
    </div>
  ),
};

export interface PopupUserScriptsWarningProps {
  errorType?: UserScriptsErrorType;
}

export const PopupUserScriptsWarning = ({
  errorType = "",
}: PopupUserScriptsWarningProps) => {
  const message = messageTable[errorType] ?? messageTable[""];

  return (
    <PopupAlert
      title="User Scripts Not Allowed"
      message={
        <div className="flex flex-row items-start">
          <TriangleAlertIcon
            className="text-destructive px-4 py-1.5 box-content shrink-0"
            size={40}
          />
          {message}
        </div>
      }
    />
  );
};
