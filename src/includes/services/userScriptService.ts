import { CodePack } from "../core/codepack";
import type { OnlyRequire } from "../core/types/utility";
import { Chrome, chromiumVersion } from "../utils";
import { typescriptService } from "./typescriptService";
import { wrapAsyncLast } from "../core/wrapAsync";
import { storageService } from "./storageService";
import { patternService } from "./patternService";
import type { ExecutionWorld, StoredScript, WhenTime } from "../types";

/** Type of a registered userScript. */
export type UserScript = chrome.userScripts.RegisteredUserScript;

export type UserScriptsErrorType =
  | "allowUserScripts"
  | "enableDeveloperMode"
  | "";

export type UserScriptRunAt = chrome.extensionTypes.RunAt;

export type UserScriptWorld = chrome.userScripts.ExecutionWorld;

const whenTimeToRunAt: Record<WhenTime, UserScriptRunAt> = {
  start: "document_start",
  end: "document_end",
  idle: "document_idle",
};
const worldToUserScriptWorld: Record<ExecutionWorld, UserScriptWorld> = {
  main: "MAIN",
  isolated: "USER_SCRIPT",
};

export class UserScriptService {
  private userScripts: (typeof chrome)["userScripts"] | null = null;
  private userScriptsError: UserScriptsErrorType | "" = "";

  /** Initiate userScripts access. */
  async initiateUserScripts() {
    try {
      this.userScriptsError = "";
      await Chrome.userScripts!.getScripts();
      this.userScripts = Chrome.userScripts as (typeof chrome)["userScripts"];
    } catch (_err) {
      this.userScriptsError =
        chromiumVersion >= 138 ? "allowUserScripts" : "enableDeveloperMode";
    }
  }

  /** Get the userScripts utility, or capture an error indicating which toggle must be
   * enabled. */
  async getUserScripts() {
    await this.initiateUserScripts();
    return this.userScripts;
  }

  /** Get the message indicating which toggle must be enabled for userScripts to work. */
  getUserScriptsError() {
    return this.userScriptsError;
  }

  /** Convert a stored script to a user script. */
  storedScriptToUserScript(script: StoredScript): UserScript {
    const codePrefix = patternService.toCode(script.match);
    const source = typescriptService.compile(
      CodePack.unpack(script.code),
      script.language
    );
    const code = `(async()=>{\n// apply precise pattern match test:\n${codePrefix}\n${source}\n})();`;
    const matches = patternService.toDomainPatterns(script.match);
    const runAt: UserScriptRunAt =
      whenTimeToRunAt[script.when] ?? "document_start";
    const world: UserScriptWorld =
      worldToUserScriptWorld[script.world] ?? "MAIN";

    const userScript: UserScript = {
      id: script.id,
      js: [{ code }],
      allFrames: false,
      runAt,
      world,
      matches: matches.include,
      excludeMatches: matches.exclude,
    };

    if (!userScript.matches!.length) {
      userScript.matches = ["*://bad.invalid/*"];
    }
    if (!userScript.excludeMatches!.length) {
      delete userScript.excludeMatches;
    }

    return userScript;
  }

  /** Update all user scripts to match the list of stored scripts. Adds missing, removes
   * deleted, and updates other user scripts to synchronize user scripts with stored scripts. */
  resynchronizeUserScripts = wrapAsyncLast(async () => {
    const userScripts = await this.getUserScripts();
    if (!userScripts) return;

    const storedScripts = await storageService.loadScripts();
    const registeredScripts = await userScripts.getScripts();

    const storedMap = storedScripts.reduce(
      (map, obj) => (map.set(obj.id, obj), map),
      new Map<string, StoredScript>()
    );
    const registeredMap = registeredScripts.reduce(
      (map, obj) => (map.set(obj.id, obj), map),
      new Map<string, UserScript>()
    );

    const removeList: string[] = [];
    const updateList: UserScript[] = [];
    const addList: UserScript[] = [];

    // find difference between registered scripts and stored scripts

    // search for removed scripts
    for (const script of registeredScripts) {
      if (!storedMap.has(script.id)) {
        removeList.push(script.id);
      }
    }
    // add or update existing scripts
    for (const script of storedScripts) {
      const userScript = this.storedScriptToUserScript(script);

      if (registeredMap.has(script.id)) {
        updateList.push(userScript);
      } else {
        addList.push(userScript);
      }
    }

    // apply updates

    // remove old scripts
    if (removeList.length) await userScripts.unregister({ ids: removeList });
    // update existing scripts
    if (updateList.length) await userScripts.update(updateList);
    // add new scripts
    if (addList.length) await userScripts.register(addList);
  });

  /** Resynchronize a single user script associated with the given stored script. If the script
   * doesn't exist, it will be added. If it does, it will be updated. */
  async resynchronizeUserScript(script: StoredScript) {
    const userScripts = await this.getUserScripts();
    if (!userScripts) return;

    const exists =
      (await userScripts.getScripts({ ids: [script.id] })).length > 0;

    const userScript = this.storedScriptToUserScript(script);

    if (exists) {
      await userScripts.update([userScript]);
    } else {
      await userScripts.register([userScript]);
    }
  }

  /** Remove the user script registered for the given stored script. */
  async removeUserScript(script: OnlyRequire<StoredScript, "id">) {
    const userScripts = await this.getUserScripts();
    if (!userScripts) return;

    await userScripts.unregister({ ids: [script.id] });
  }

  /** Test if a tab is scriptable, by attempting to execute a no-op script. */
  async testScriptableTab(tabId?: number | null): Promise<boolean> {
    if (tabId == null) return false;

    // try getting userscripts
    const userScripts = await this.getUserScripts();

    // try injecting a noop script
    try {
      const results = await userScripts?.execute?.({
        injectImmediately: true,
        target: { tabId },
        js: [{ code: "(function(){})();" }],
      });
      if (results?.[0].error) {
        throw results?.[0].error;
      }
    } catch (err) {
      // if injection fails, page probably isn't scriptable
      console.warn(err);
      return false;
    }

    // otherwise, it can be scripted
    return true;
  }
}

export const userScriptService = new UserScriptService();
