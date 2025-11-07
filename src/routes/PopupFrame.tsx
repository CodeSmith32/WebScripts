import { Button } from "../components/core/Button";
import { PopupScriptRow } from "../components/PopupScriptRow";
import { Spinner } from "../components/core/Spinner";
import { useFutureCallback } from "../hooks/core/useFutureCallback";
import { usePopupData } from "../hooks/usePopupData";
import { messageService } from "../includes/services/messageService";
import type { StoredScript } from "../includes/types";
import { hostnameFromURL } from "../includes/utils";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { patternService } from "../includes/services/patternService";
import type { ComponentChildren } from "preact";
import { useCarried } from "../hooks/core/useCarried";

const noDomainMessage = (
  <p>
    This tab does not have a domain.
    <br />
    Scripts cannot be injected into it.
  </p>
);

export const PopupFrame = () => {
  const { data, available, refresh } = usePopupData();
  const [message, setMessage] = useState<ComponentChildren>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  // detect if page has a domain
  const hasDomain = useMemo(() => {
    if (!data?.tab) return true;

    return data.tab.url ? !!hostnameFromURL(data.tab.url) : false;
  }, [data]);

  // get table mapping script id to if it's executing on the tab
  const matchingScripts = useMemo(() => {
    if (!data?.allScripts || !data?.tab?.url) return {};

    const matching: Record<string, boolean> = {};
    for (const script of data.allScripts) {
      matching[script.id] = patternService.match(data.tab.url, script.patterns);
    }
    return matching;
  }, [data]);

  // if page has no domain, show notification message
  const carried = useCarried({ message });
  useEffect(() => {
    if (!hasDomain) {
      setMessage(noDomainMessage);
    } else if (carried.message === noDomainMessage) {
      setMessage(null);
    }
  }, [hasDomain]);

  // refresh scripts / active scripts when page reloads while popup is open
  useEffect(() => {
    messageService.listen("reloaded", () => {
      refresh();
    });
  }, []);

  const handleToggle = useFutureCallback(
    (script: StoredScript, running: boolean) => {
      if (!available || !data.tab?.url) return;

      const domain = hostnameFromURL(data.tab.url);
      if (!domain) return;

      messageService.send("toggleDomain", {
        id: script.id,
        domain,
        enabled: running,
      });

      setMessage(<p>Refresh page to apply changes.</p>);
    }
  );
  const handleOpenScripts = useFutureCallback(async (refer: string = "") => {
    await messageService.openEditor(refer);
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
            disabled={!hasDomain}
            script={script}
            running={data.runningScripts?.includes(script.id) ?? false}
            initialValue={!!matchingScripts[script.id]}
            onChange={(running) => handleToggle(script, running)}
            onEdit={() => handleOpenScripts(script.id)}
            onWarn={(message) => {
              setMessage(message);
              setTimeout(() => {
                messageRef.current?.scrollIntoView();
              }, 100);
            }}
          />
        ))
      ) : (
        <p className="text-center py-4">No Scripts</p>
      )}
      <Button className="block w-full" onClick={() => handleOpenScripts()}>
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
