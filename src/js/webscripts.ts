import { CSPHeader, CSPValue } from "./csp";
import { Chrome, hostFromURL } from "./utils";

export interface StoredScript {
  id: string;
  name: string;
  patterns: string[];
  code: string;
}

export type MessageTypes = {
  cmd: "listRunning";
};

class WebScripts {
  async saveScripts(scripts: StoredScript[]): Promise<void> {
    await Chrome?.storage.local.set({ scripts });
  }

  async loadScripts(): Promise<StoredScript[]> {
    return (await Chrome?.storage.local.get("scripts"))?.scripts ?? [];
  }

  match(url: string, patterns: string[]): boolean {
    let m: RegExpMatchArray | null; // pattern match
    let found = false;
    const host = hostFromURL(url);

    // iterate patterns
    for (const pattern of patterns) {
      if ((m = pattern.match(/^(-?)\s*\/(.*)\/(\w*)$/))) {
        // pattern is a regex: m[] 1: negated, 2: pattern, 3: flags

        const [, negated, regexPattern, regexFlags] = m;
        const regex = new RegExp(
          regexPattern,
          regexFlags.replace(/[^ugimsy]/g, "")
        );

        if (regex.test(url)) found = negated ? false : true;
      } else if ((m = pattern.match(/^(-?)\s*([\w\.\*-]+)$/))) {
        // pattern is a domain: m[] 1: negated, 2: domain

        const [, negated, domain] = m;
        if (!host) continue;

        const regexPattern = domain.replace(/\./g, "\\.").replace(/\*/g, ".*");
        const regex = new RegExp("^" + regexPattern + "$", "i");

        if (regex.test(host)) found = negated ? false : true;
      }
    }

    return found;
  }

  processCSPHeader(header: string): string {
    // parse csp header string
    const csp = CSPHeader.fromString(header);

    // iterate and tweak policies
    for (const policy of csp.policies) {
      // remove reporting
      policy.deleteDirective("report-to");
      policy.deleteDirective("report-uri");

      // find script policy
      const scriptDirective = (
        policy.getDirective("script-src-elem") ??
        policy.getDirective("script-src") ??
        policy.getDirective("object-src")
      )?.clone();

      // if some policy is in place for scripts...
      if (scriptDirective) {
        // clear nonce / hash allowances (not allowed when 'unsafe-inline' is set)
        scriptDirective.values = scriptDirective.values.filter(
          (value) => value.type !== "nonce" && value.type !== "hash"
        );
        // allow 'unsafe-inline'
        scriptDirective.values.push(new CSPValue("'unsafe-inline'"));

        // assign as the 'script-src-elem' directive
        scriptDirective.type = "script-src-elem";
        policy.setDirective(scriptDirective);
      }
    }

    // re-serialize to csp header string
    return csp.toString();
  }

  async openEditor(refer: string) {
    await Chrome?.storage.local.set({ refer });
    await Chrome?.runtime.openOptionsPage();
  }
}
export const webScripts = new WebScripts();
