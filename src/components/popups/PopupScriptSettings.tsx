import { useMemo, useRef, useState } from "preact/hooks";
import type { StoredScript } from "../../includes/types";
import { usePopup } from "../core/popups/ClassPopup";
import { Popup } from "../core/popups/Popup";
import { Button } from "../core/Button";
import {
  BanIcon,
  CheckIcon,
  CircleXIcon,
  EllipsisIcon,
  GlobeIcon,
  GripVerticalIcon,
  PlusIcon,
  RegexIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-preact";
import { TextBox } from "../core/TextBox";
import { LanguageDropdown } from "../dropdowns/LanguageDropdown";
import { Checkbox } from "../core/Checkbox";
import { WhenTimeDropdown } from "../dropdowns/WhenTimeDropdown";
import { ExecutionWorldDropdown } from "../dropdowns/ExecutionWorldDropdown";
import { Anchor } from "../core/Anchor";
import { helpLinks } from "../../includes/constants";
import { CSPActionDropdown } from "../dropdowns/CSPActionDropdown";
import { patternService } from "../../includes/services/patternService";
import { IconButton } from "../core/IconButton";
import { cn } from "../../includes/core/classes";
import { usePopupManager } from "../core/popups/ClassPopupManager";
import { PopupConfirm, type PopupConfirmCloseData } from "./PopupConfirm";
import { useRefresh } from "../../hooks/core/useRefresh";
import { useFutureCallback } from "../../hooks/core/useFutureCallback";
import { debounce } from "../../includes/core/debounce";

export type PopupScriptSettingsCloseData = StoredScript | null;

interface PatternWithId {
  pattern: string;
  id: number;
}

interface PatternMatchRowProps {
  pattern: PatternWithId;
  first: boolean;
  onRemove?: () => void;
  onAddBelow?: () => void;
  refresh?: () => void;
}

const PatternMatchRow = ({
  pattern,
  first,
  onRemove,
  onAddBelow,
  refresh: parentRefresh,
}: PatternMatchRowProps) => {
  const parts = patternService.parse(pattern.pattern);

  parentRefresh = useFutureCallback(parentRefresh ?? (() => {}));

  const debounceParentRefresh = useMemo(() => {
    return debounce(parentRefresh, 500);
  }, [parentRefresh]);

  const refresh = useRefresh();

  const background = !parts
    ? "bg-neutral-500/50"
    : parts.negated
      ? "bg-destructive/50"
      : "bg-success/50";

  const { icon, iconTitle, patternType } =
    parts?.type === "regex"
      ? {
          icon: <RegexIcon />,
          iconTitle: "Regular Expression URL Test",
          patternType: "URL regular expression test",
        }
      : parts?.type === "domain"
        ? {
            icon: <GlobeIcon />,
            iconTitle: "Domain Pattern Match",
            patternType: "domain pattern test",
          }
        : {
            icon: <CircleXIcon />,
            iconTitle: "Invalid Pattern",
            patternType: "",
          };

  const popupManager = usePopupManager();

  return (
    <div className="pattern-match-row flex flex-col" data-id={pattern.id}>
      <p className="opacity-50">
        {!parts
          ? "No-op (Pattern is invalid)"
          : !parts.negated
            ? first
              ? `First, include by ${patternType}`
              : `Then, include by ${patternType}`
            : first
              ? "No-op (exclusions at the start have no effect)"
              : `Then, exclude by ${patternType}`}
      </p>
      <div className="flex flex-row gap-px my-1">
        <IconButton
          className={cn("w-10 h-10 rounded-l-md rounded-r-none", background)}
        >
          <GripVerticalIcon />
        </IconButton>

        <TextBox
          value={pattern.pattern}
          onValueChange={(value) => {
            pattern.pattern = value;
            refresh();
            debounceParentRefresh();
          }}
          className={cn("pattern-input h-10 rounded-none grow", background)}
          onKeyDown={(evt) => {
            const focusRow = (dir: number) => {
              const target = evt.target as HTMLInputElement;
              // get row element
              const row = target?.closest?.(".pattern-match-row");
              // get prev/next row
              const other =
                dir < 0 ? row?.previousElementSibling : row?.nextElementSibling;
              // get input of that row
              const otherInput = other?.querySelector(".pattern-input");
              // if look-up found input, continue
              if (otherInput instanceof HTMLInputElement) {
                // copy the cursor position to make it feel intuitive
                let position =
                  target.selectionDirection === "forward"
                    ? target.selectionEnd
                    : target.selectionStart;

                position = Math.min(position ?? 0, otherInput.value.length);
                otherInput.focus();
                otherInput.selectionStart = otherInput.selectionEnd = position;
                return true;
              }
              return false;
            };

            // keyboard shortcuts
            if (evt.key === "Backspace") {
              // delete when backspacing empty
              if (pattern.pattern === "") {
                evt.preventDefault();
                onRemove?.();
                focusRow(-1) || focusRow(1);
              }
            } else if (evt.key === "Enter") {
              evt.preventDefault();
              // create on enter
              onAddBelow?.();
            } else if (evt.key === "ArrowUp" || evt.key === "ArrowDown") {
              evt.preventDefault();
              // navigate to prev / next via arrow keys
              focusRow(evt.key === "ArrowUp" ? -1 : 1);
            }
          }}
        />

        <div
          title={iconTitle}
          className={cn(
            "w-10 h-10 mr-2 rounded-r-md flex justify-center items-center",
            background
          )}
        >
          {icon}
        </div>

        <IconButton
          title="Delete Pattern"
          onClick={async () => {
            const result = await popupManager.open<PopupConfirmCloseData>(
              <PopupConfirm
                title="Delete Pattern"
                yesLabel={
                  <>
                    <Trash2Icon size={20} className="-ml-1" /> Delete
                  </>
                }
                yesVariant="destructive"
                message={
                  <>
                    <p>Are you sure you want to delete this pattern?</p>
                    <p
                      title={pattern.pattern}
                      className="px-3 py-2 min-h-10 rounded-md bg-black/50 truncate"
                    >
                      <code>{pattern.pattern}</code>
                    </p>
                  </>
                }
              />
            ).waitClose;

            if (result.decision === true) onRemove?.();
          }}
        >
          <Trash2Icon size={20} />
        </IconButton>

        <IconButton title="Add Pattern Below" onClick={() => onAddBelow?.()}>
          <PlusIcon size={20} />
        </IconButton>
      </div>
    </div>
  );
};

export interface PopupScriptSettingsProps {
  script: StoredScript;
}

export const PopupScriptSettings = ({
  script: originalScript,
}: PopupScriptSettingsProps) => {
  const popup = usePopup<PopupScriptSettingsCloseData>();
  const [script, setScript] = useState<StoredScript>(originalScript);

  const refresh = useRefresh();

  const patternListRef = useRef<HTMLDivElement>(null);

  const originalPatterns: PatternWithId[] = useMemo(
    () => originalScript.patterns.map((pattern, id) => ({ pattern, id })),
    [originalScript.patterns]
  );
  const nextPatternId = useRef(originalPatterns.length);
  const getNextPatternId = () => nextPatternId.current++;

  const [patterns, setPatterns] = useState<PatternWithId[]>(originalPatterns);

  const [testURL, setTestURL] = useState("");
  const testURLMatches = testURL
    ? patternService.match(
        testURL,
        patterns.map(({ pattern }) => pattern)
      )
    : null;
  const testURLColor =
    testURLMatches === null
      ? "bg-neutral-500/20"
      : testURLMatches
        ? "bg-success/50"
        : "bg-destructive/50";

  // close handlers
  const handleCancel = () => {
    popup.close(null);
  };
  const handleSave = () => {
    popup.close({
      ...script,
      patterns: patterns.map(({ pattern }) => pattern),
    });
  };

  // pattern operators
  const removePattern = (id: number) => {
    setPatterns((patterns) => patterns.filter((pattern) => pattern.id !== id));
  };
  const addPattern = (newPattern: string, belowId: number) => {
    const id = getNextPatternId();
    setPatterns((patterns) => {
      const newPatterns = [...patterns];
      const index = newPatterns.findIndex((pattern) => pattern.id === belowId);
      newPatterns.splice(index + 1, 0, { pattern: newPattern, id });
      return newPatterns;
    });
    setTimeout(() => {
      const targetInput = patternListRef.current?.querySelector(
        `.pattern-match-row[data-id='${id}'] .pattern-input`
      );
      if (targetInput instanceof HTMLInputElement) {
        targetInput.focus();
      }
    }, 10);
  };
  // TODO: implement drag-drop

  return (
    <Popup
      title="Script Settings"
      popupClassName="w-4xl"
      contentClassName="flex flex-col p-0"
    >
      <div className="flex flex-col gap-4 p-4 overflow-y-auto">
        <div className="flex flex-col gap-2 p-2">
          <p>Script Title</p>
          <TextBox className="w-full text-2xl py-3 font-bold rounded-xl" />
        </div>
        <div className="flex flex-row p-2 gap-8">
          {/* Left column */}
          <div className="w-0 grow flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span>Language</span>
              <LanguageDropdown
                value={script.language}
                onValueChange={(language) =>
                  setScript((script) => ({ ...script, language }))
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <span>Prettify</span>
              <Checkbox
                label="Format code with Prettier on save"
                checked={script.prettify}
                onValueChange={(prettify) =>
                  setScript((script) => ({ ...script, prettify }))
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <span>Locked</span>
              <Checkbox
                label="Lock the script's toggle switch"
                checked={script.locked}
                onValueChange={(locked) =>
                  setScript((script) => ({ ...script, locked }))
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <span>Execution Time</span>
              <WhenTimeDropdown
                value={script.when}
                onValueChange={(when) =>
                  setScript((script) => ({ ...script, when }))
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <span>Execution World</span>
              <ExecutionWorldDropdown
                value={script.world}
                onValueChange={(world) =>
                  setScript((script) => ({ ...script, world }))
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <span>
                <Anchor href={helpLinks.contentSecurityPolicy}>
                  Content-Security-Policy
                </Anchor>{" "}
                Action
              </span>
              <CSPActionDropdown
                value={script.csp}
                onValueChange={(csp) =>
                  setScript((script) => ({ ...script, csp }))
                }
              />
            </div>
          </div>

          {/* Right column */}
          <div className="w-0 grow flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p>URL Pattern Matches</p>
              <div className="flex flex-col" ref={patternListRef}>
                {patterns.map((pattern, index) => {
                  return (
                    <PatternMatchRow
                      key={pattern.id}
                      first={index === 0}
                      pattern={pattern}
                      onRemove={() => removePattern(pattern.id)}
                      onAddBelow={() => addPattern("", pattern.id)}
                      refresh={refresh}
                    />
                  );
                })}

                {!patterns.length && (
                  <div className="w-full flex flex-row justify-between items-center">
                    <p className="opacity-50">
                      No patterns. Click + to add first.
                    </p>

                    <IconButton
                      title="Add First Pattern"
                      onClick={() => addPattern("", -1)}
                    >
                      <PlusIcon size={20} />
                    </IconButton>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-row justify-between p-6">
        <Button variant="primary" onClick={handleSave}>
          <SaveIcon size={20} className="-ml-1" /> Save
        </Button>

        <div className="w-20" />

        <TextBox
          className={cn("grow h-10 rounded-r-none", testURLColor)}
          placeholder="Enter URL to test match: https://..."
          value={testURL}
          onValueChange={(value) => setTestURL(value)}
        />
        <div
          title={
            testURLMatches === null
              ? "Enter URL to test..."
              : testURLMatches
                ? "URL matches patterns"
                : "URL is excluded by patterns"
          }
          className={cn(
            "w-10 h-10 flex justify-center items-center ml-px rounded-r-md",
            testURLColor
          )}
        >
          {testURLMatches === null ? (
            <EllipsisIcon />
          ) : testURLMatches ? (
            <CheckIcon />
          ) : (
            <BanIcon />
          )}
        </div>

        <div className="w-20" />

        <Button variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </Popup>
  );
};
