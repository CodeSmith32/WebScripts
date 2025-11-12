import { Button } from "../components/core/Button";
import {
  PopupScriptRow,
  type WarningTypes,
} from "../components/PopupScriptRow";
import { Spinner } from "../components/core/Spinner";
import { useFutureCallback } from "../hooks/core/useFutureCallback";
import { usePopupData } from "../hooks/usePopupData";
import { messageService } from "../includes/services/messageService";
import type { StoredScript } from "../includes/types";
import { hostnameFromURL, type URLType } from "../includes/utils";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { patternService } from "../includes/services/patternService";
import type { ComponentChildren } from "preact";
import { useCarried } from "../hooks/core/useCarried";
import { LockIcon, ShieldAlertIcon } from "lucide-preact";
import { Anchor } from "../components/core/Anchor";
import { helpLinks } from "../includes/constants";

const urlTypeMessages: Partial<Record<URLType, ComponentChildren>> = {
  notab: (
    <p>
      Please open a tab to
      <br />
      allow toggling scripts.
    </p>
  ),
  internal: (
    <p>
      This is an internal browser page.
      <br />
      Scripts cannot be injected into it.
    </p>
  ),
  file: (
    <p>
      This tab is a file url. It can only
      <br />
      be matched with a regex, e.g.
      <br />
      <code>/^file:\/\/\//i</code>
    </p>
  ),
  unscriptable: (
    <p>
      This page is specially protected.
      <br />
      It does not allow executing scripts.
    </p>
  ),
};

const scriptWarningMessages: Record<WarningTypes, ComponentChildren> = {
  csp: (
    <div className="flex flex-row justify-center items-center gap-2">
      <ShieldAlertIcon className="text-secondary shrink-0" size={24} />
      <p className="text-left">
        Scripts with this icon disable the
        <br />
        page's{" "}
        <Anchor href={helpLinks.contentSecurityPolicy}>
          Content Security Policy.
        </Anchor>
      </p>
    </div>
  ),
};

const refreshMessage = <p>Refresh page to apply changes.</p>;
const lockedScriptMessage = (
  <div className="flex flex-row justify-center items-center gap-2">
    <LockIcon className="text-destructive shrink-0" size={24} />
    <p className="text-left">
      This script explicitly sets <code>locked</code> to <code>true</code>.
      <br />
      Edit it to change what sites it matches.
    </p>
  </div>
);

const commonMessages = new Set<ComponentChildren>(
  (Object.keys(urlTypeMessages) as URLType[]).map((key) => urlTypeMessages[key])
);

export const PopupFrame = () => {
  const { data, available, refresh } = usePopupData();
  const [message, setMessage] = useState<ComponentChildren>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  // get table mapping script id to if it's executing on the tab
  const matchingScripts = useMemo(() => {
    if (!data?.allScripts || !data?.tab?.url) return {};

    const matching: Record<string, boolean> = {};
    for (const script of data.allScripts) {
      matching[script.id] = patternService.match(data.tab.url, script.match);
    }
    return matching;
  }, [data?.allScripts, data?.tab?.url]);

  // if page has no domain, show notification message
  const carried = useCarried({ message });
  useEffect(() => {
    // get message for url type
    const newMessage = (
      urlTypeMessages as Record<string, ComponentChildren | undefined>
    )[data?.urlType ?? ""];

    if (newMessage) {
      setMessage(newMessage);
    } else if (commonMessages.has(carried.message)) {
      setMessage(null);
    } else {
      if (data?.allScripts) {
        const mismatching = data.allScripts.some((script) => {
          const matching = !!matchingScripts[script.id];
          const running = !!data.runningScripts[script.id];
          return matching !== running;
        });
        if (mismatching) setMessage(refreshMessage);
      }
    }
  }, [data?.urlType]);

  // refresh scripts / active scripts when page reloads while popup is open
  useEffect(() => {
    messageService.listen("reloaded", () => {
      refresh();
    });
  }, []);

  const handleToggle = useFutureCallback(
    (script: StoredScript, running: boolean) => {
      if (!data?.tab?.url || data?.urlType !== "normal") {
        return;
      }

      const domain = hostnameFromURL(data.tab.url);
      if (!domain) return;

      messageService.send("toggleDomain", {
        id: script.id,
        domain,
        enabled: running,
      });

      setMessage(refreshMessage);
    }
  );
  const handleOpenScripts = useFutureCallback(async (refer: string = "") => {
    await messageService.openEditor(refer);
  });
  const scrollToMessage = useFutureCallback(() => {
    setTimeout(() => {
      messageRef.current?.scrollIntoView();
    }, 100);
  });

  return (
    <div className="bg-background p-2 text-white min-w-xs">
      {!available ? (
        <div className="flex flex-col items-center gap-1.5 my-3">
          <Spinner />
          <p className="text-center opacity-70">Loading...</p>
        </div>
      ) : data.allScripts.length ? (
        data.allScripts.map((script) => (
          <PopupScriptRow
            disabled={!data.scriptable || data.urlType !== "normal"}
            script={script}
            running={!!data.runningScripts[script.id]}
            initialValue={data.scriptable && !!matchingScripts[script.id]}
            onChange={(running) => handleToggle(script, running)}
            onEdit={() => handleOpenScripts(script.id)}
            onClickLocked={
              script.locked
                ? () => {
                    setMessage(lockedScriptMessage);
                    scrollToMessage();
                  }
                : undefined
            }
            onWarn={(type) => {
              setMessage(scriptWarningMessages[type]);
              scrollToMessage();
            }}
          />
        ))
      ) : (
        <p className="text-center py-4">No Scripts</p>
      )}
      <Button className="block w-full mt-2" onClick={() => handleOpenScripts()}>
        Open Scripts &raquo;
      </Button>

      {message && (
        <div
          className="my-3 text-sm text-center opacity-70 relative"
          ref={messageRef}
        >
          {message}
        </div>
      )}
    </div>
  );
};
