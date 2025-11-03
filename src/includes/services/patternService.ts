import { isDomainSupersetOf } from "../core/isDomainSupersetOf";
import { hostnameFromURL } from "../utils";

export interface PatternParts {
  /** The type of pattern, if it's a regex (`/pattern/`), or a domain with wildcards
   * (`*.domain.com`). */
  type: "regex" | "domain";
  /** The original pattern, without the negation `-` flag. */
  original: string;
  /** A regex pattern string to use for this match pattern. */
  pattern: string;
  /** A regex flags string to use for this match pattern. */
  flags: string;
  /** What the pattern should be tested on: The full url, or just the hostname. */
  target: "url" | "host";
  /** If the match is negated. If `true`, when this pattern matches, the script should *not*
   * load. */
  negated: boolean;
}

export interface IncludesExcludes {
  include: string[];
  exclude: string[];
}

const rgxPatternRegex = /^(-?)\s*\/(.*)\/(\w*)$/;
const rgxPatternDomain = /^(-?)\s*([\w\.\*-]+)$/;

export class PatternService {
  /** Parse pattern and return regex parts. */
  parse(original: string): PatternParts | null {
    let m: RegExpMatchArray | null; // pattern match

    if ((m = original.match(rgxPatternRegex))) {
      // pattern is a regex: m[] 1: negated, 2: pattern, 3: flags
      const [, negated, pattern, flags] = m;

      return {
        type: "regex",
        original: original.replace(/^-\s*/, ""),
        pattern,
        flags: flags.replace(/[^ugimsy]/g, ""),
        negated: !!negated,
        target: "url",
      };
    }
    if ((m = original.match(rgxPatternDomain))) {
      // pattern is a domain: m[] 1: negated, 2: domain
      const [, negated, domain] = m;

      const pattern = domain.replace(/^\*\.|\.\*$|\.(\*\.)*/g, (m) => {
        if (m === "*.") return "(.+\\.)?";
        if (m === ".*") return "(\\..+)?";
        if (m === ".") return "\\.";
        return "\\.(.+\\.)?";
      });

      return {
        type: "domain",
        original: original.replace(/^-\s*/, ""),
        pattern: `^${pattern}$`,
        flags: "i",
        negated: !!negated,
        target: "host",
      };
    }
    return null;
  }

  /** Check if url matches the pattern-list for a user script. */
  match(url: string, patterns: string[]): boolean {
    let found = false;
    const hostname = hostnameFromURL(url);

    // iterate patterns
    for (const matchPattern of patterns) {
      // parse pattern
      const parts = this.parse(matchPattern);
      if (!parts) continue;

      // build regex
      const { pattern, flags, negated, target } = parts;
      const regex = new RegExp(pattern, flags);
      const urlHost = target === "host" ? hostname : url;
      if (!urlHost) continue;

      // apply test
      if (regex.test(urlHost)) found = !negated;
    }

    return found;
  }

  /** Convert the match patterns to a standard host match pattern set.
   *
   * This process is not an exact conversion, since host matching doesn't support regexs. But
   * the generated patterns will at least be loose enough to cover any host that matches the
   * original patterns. */
  toDomainPatterns(patterns: string[]): IncludesExcludes {
    let include: string[] = [];
    let exclude: string[] = [];

    for (const matchPattern of patterns) {
      // parse the pattern
      const parts = this.parse(matchPattern);
      if (!parts) continue;

      const { type, negated, original } = parts;

      if (type === "regex") {
        // if it's a regex, we cannot know what it will match: match everything
        if (!negated) {
          include = ["<all_urls>", "file:///*"];
          exclude = [];
        }
      } else if (type === "domain") {
        // if it's a domain...
        if (/^\*?[^*]*$/.test(original)) {
          // if it only has a wildcard at the start, add it to exclusions or inclusions
          // dependent on the negation flag
          if (negated) {
            exclude.push(`*://${original}/*`);
          } else {
            const newInclude = original.toLowerCase();

            // remove exclusions that are culled or would otherwise cull the newest inclusion
            exclude = exclude.filter((exclude) => {
              exclude = exclude.slice(4, -2).toLowerCase(); // cut off *:// and /*

              // remove in any of the three cases:

              // exclusion equals inclusion
              // (because exclusion has no effect)
              // match  -www.google.com
              // match  www.google.com
              if (exclude === newInclude) {
                return false;
              }

              // exclusion is a subset of inclusion
              // (because exclusion has no effect)
              // match  -www.google.com
              // match  *.google.com
              if (isDomainSupersetOf(newInclude, exclude)) {
                return false;
              }

              // inclusion is a subset of exclusion
              // (because exclusions are applied after inclusions in userScripts)
              // match  -*.google.com
              // match  www.google.com
              if (isDomainSupersetOf(exclude, newInclude)) {
                return false;
              }

              return true;
            });

            // add the new inclusion
            include.push(`*://${original}/*`);
          }
        } else {
          // if it has wildcards not at the start, we cannot know what it will match, other than
          // that it's a non-file url
          if (!negated) {
            include = ["<all_urls>"];
            exclude = [];
          }
        }
      }
    }

    return { include, exclude };
  }

  /** Convert the match patterns to a piece of code that will test the url and return if
   * matching fails. */
  toCode(patterns: string[]): string {
    // initialize condition: final decision is to fail match
    const conditions: string[] = ["true"];

    for (const matchPattern of patterns) {
      // parse pattern
      const parts = this.parse(matchPattern);
      if (!parts) continue;

      // generate regex and test condition
      const pattern = JSON.stringify(parts.pattern);
      const flags = JSON.stringify(parts.flags);
      const target =
        parts.target === "host" ? "location.hostname" : "location.href";
      const negated = JSON.stringify(parts.negated);

      // push in reverse order (last expression takes highest precedence)
      conditions.unshift(
        `new RegExp(${pattern}, ${flags}).test(${target}) ? ${negated}\n : `
      );
    }

    // join and return condition code
    return `if(${conditions.join("")}) return;\n`;
  }

  /** Add or remove a domain from the list of pattern matches. */
  setDomainForPatterns(
    patterns: string[],
    domain: string,
    enable: boolean
  ): string[] {
    domain = domain.toLowerCase();

    // if domain is not valid, bail with no changes
    if (!/^[\da-z]+(\.[\da-z]+)+$/.test(domain)) return patterns;

    // remove any existing patterns that match this domain
    patterns = patterns.filter((pattern) => {
      const parts = this.parse(pattern);

      if (parts && parts.type === "domain" && parts.original === domain) {
        return false;
      }
      return true;
    });

    // append domain match
    patterns.push((enable ? "" : "-") + domain);

    return patterns;
  }
}

export const patternService = new PatternService();
