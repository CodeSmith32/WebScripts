import { Button } from "../components/Button";
import { PopupScriptRow } from "../components/PopupScriptRow";
import { Spinner } from "../components/Spinner";
import { useFutureCallback } from "../hooks/useFutureCallback";
import { usePopupData } from "../hooks/usePopupData";
import { webScripts, type StoredScript } from "../includes/webscripts";

export const PopupFrame = () => {
  const { data, available } = usePopupData();

  const handleToggle = useFutureCallback((script: StoredScript) => {
    console.log("toggle " + script.name + " " + script.id);
  });

  const handleOpenScripts = useFutureCallback(async (refer: string = "") => {
    await webScripts.openEditor(refer);
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
            name={script.name}
            switched={data.runningScripts?.includes(script.id) ?? false}
            onSwitch={() => handleToggle(script)}
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
