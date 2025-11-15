import { Chrome } from "../utils";

type HeaderOperation = chrome.declarativeNetRequest.ModifyHeaderInfo &
  browser.declarativeNetRequest._RuleActionResponseHeaders;

// build a list of csp-related headers to remove
const cspHeaders = [
  "content-security-policy",
  "content-security-policy-report-only",
  "reporting-endpoints",
];
const removeHeaders: HeaderOperation[] = [];

for (const header of cspHeaders) {
  removeHeaders.push(
    { header, operation: "remove" },
    { header: "x-" + header, operation: "remove" }
  );
}

export class CspService {
  /** Remove content-security-policy headers from tab. */
  disableCSPHeaders(tabId: number) {
    Chrome.declarativeNetRequest?.updateSessionRules({
      removeRuleIds: [1],
      addRules: [
        {
          id: 1,
          priority: 1,
          action: {
            type: "modifyHeaders",
            responseHeaders: removeHeaders,
          },
          condition: {
            resourceTypes: ["main_frame"],
            tabIds: [tabId],
          },
        },
      ],
    });
  }

  /** Disable rule for removing content-security-policy headers from tab. */
  enableCSPHeaders() {
    Chrome.declarativeNetRequest?.updateSessionRules({
      removeRuleIds: [1],
    });
  }
}

export const cspService = new CspService();
