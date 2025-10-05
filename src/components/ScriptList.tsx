import {
  FileCode,
  FilePlus2Icon,
  FileType,
  ScrollTextIcon,
  TrashIcon,
} from "lucide-preact";
import { cn } from "../includes/classes";
import type { StoredScript } from "../includes/webscripts";
import { IconButton } from "./IconButton";
import { Button } from "./Button";

export interface ScriptListProps {
  scripts?: StoredScript[];
  active?: StoredScript | symbol | null;
  onAdd?: () => void;
  onDelete?: (script: StoredScript) => void;
  onSelect?: (script: StoredScript) => void;
}

export const ScriptList = ({
  scripts = [],
  active = null,
  onAdd,
  onDelete,
  onSelect,
}: ScriptListProps) => {
  return (
    <div className="grow px-2">
      {scripts.length ? (
        scripts.map((script) => (
          <div
            className={cn(
              "pl-2 pr-1 py-1 gap-2 mb-2 rounded-md cursor-pointer flex flex-row items-center group " +
                "hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-white",
              active === script && "bg-white/10"
            )}
            tabIndex={0}
            onClick={() => onSelect?.(script)}
          >
            {script.language === "javascript" ? (
              <FileCode size={20} />
            ) : script.language === "typescript" ? (
              <FileType size={20} />
            ) : (
              <ScrollTextIcon size={20} />
            )}
            <span className="w-0 grow text-nowrap overflow-hidden text-ellipsis">
              {script.name}
            </span>
            <IconButton
              onClick={() => onDelete?.(script)}
              className="w-9 h-9 p-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              title="Delete"
            >
              <TrashIcon size={16} />
            </IconButton>
          </div>
        ))
      ) : (
        <div className="my-10">
          <p className="opacity-50 text-center px-3 py-2">No scripts yet!</p>
          <p className="text-sm opacity-30 text-balance text-center px-3 pb-4">
            Click the 'Add New' button below to get started
          </p>
        </div>
      )}

      <div className="flex flex-row gap-1 mb-5">
        <Button
          onClick={onAdd}
          className="flex flex-row gap-2 items-center px-2 py-1 w-full text-sm text-white/30 hover:text-white"
          title="Add New"
        >
          <FilePlus2Icon size={16} className="mx-0.5" />
          Add New
        </Button>
      </div>
    </div>
  );
};
