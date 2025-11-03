import { Button } from "../components/core/Button";
import { PopupScriptRow } from "../components/PopupScriptRow";
import { Spinner } from "../components/core/Spinner";
import { useFutureCallback } from "../hooks/core/useFutureCallback";
import { usePopupData } from "../hooks/usePopupData";
import { messageService } from "../includes/services/messageService";
import type { StoredScript } from "../includes/types";
import { hostnameFromURL } from "../includes/utils";

export const PopupFrame = () => {
  const { data, available } = usePopupData();

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
            script={script}
            running={data.runningScripts?.includes(script.id) ?? false}
            onChange={(running) => handleToggle(script, running)}
            onEdit={() => handleOpenScripts(script.id)}
          />
        ))
      ) : (
        <p className="text-center py-4">No Scripts</p>
      )}
      <Button className="block w-full" onClick={() => handleOpenScripts()}>
        Open Scripts &raquo;
      </Button>
    </div>
  );
};
