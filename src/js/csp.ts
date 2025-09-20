export type CSPValueType =
  | "none"
  | "nonce"
  | "hash"
  | "host"
  | "scheme"
  | "self"
  | "unsafe-eval"
  | "wasm-unsafe-eval"
  | "unsafe-inline"
  | "unsafe-hashes"
  | "inline-speculation-rules"
  | "strict-dynamic"
  | "report-sample"
  | "any";

const keywordValueTypes: Record<string, CSPValueType> = {
  "'none'": "none",
  "'self'": "self",
  "'unsafe-inline'": "unsafe-inline",
  "'unsafe-eval'": "unsafe-eval",
  "'unsafe-hashes'": "unsafe-hashes",
  "'wasm-unsafe-eval'": "wasm-unsafe-eval",
  "'strict-dynamic'": "strict-dynamic",
  "'report-sample'": "report-sample",
  "'inline-speculation-rules'": "inline-speculation-rules",
};
Object.setPrototypeOf(keywordValueTypes, null);

export type CSPDirectiveType =
  // fetch directives
  | "default-src"
  | "script-src"
  | "style-src"
  | "img-src"
  | "connect-src"
  | "font-src"
  | "object-src"
  | "media-src"
  | "manifest-src"
  | "worker-src"
  | "child-src"
  | "frame-src"
  | "prefetch-src"
  | "fenced-frame-src"
  | "script-src-attr"
  | "script-src-elem"
  | "style-src-attr"
  | "style-src-elem"
  // reporting
  | "report-uri"
  | "report-to"
  // other directives
  | "base-uri"
  | "form-action"
  | "frame-ancestors"
  | "sandbox"
  | "upgrade-insecure-requests"
  | "block-all-mixed-content"
  | "trusted-types"
  | "require-trusted-types-for"
  | "navigate-to"
  | "plugin-types";

// classes

const base64urlDecode = (value: string) => {
  return atob(value.replace(/[-_]/g, (m) => ({ "-": "+", _: "/" }[m]!)));
};

export class CSPValue {
  public text: string = "";
  public type: CSPValueType = "any";
  public hash?: string;
  public nonce?: string;
  public host?: string;
  public scheme?: string;

  constructor(text: string) {
    this.type =
      text in keywordValueTypes
        ? keywordValueTypes[text]
        : /^'nonce-.*'$/.test(text)
        ? "nonce"
        : /^'sha(256|384|512)-.*'$/.test(text)
        ? "hash"
        : /^[a-z]+:$/.test(text)
        ? "scheme"
        : "host";

    switch (this.type) {
      case "nonce":
        this.nonce = text.match(/^'nonce-(.*)'$/)?.[1] ?? "";
        break;
      case "hash":
        this.hash = base64urlDecode(text.match(/^'sha\d+-(.*)'$/)?.[1] ?? "");
        break;
      case "host":
        this.host = text;
        break;
      case "scheme":
        this.scheme = text.slice(0, -1);
        break;
    }
  }

  clone() {
    return new CSPValue(this.text);
  }

  toString() {
    return this.text;
  }
}

export class CSPDirective {
  public type: CSPDirectiveType = "default-src";
  public values: CSPValue[] = [];

  constructor(type: CSPDirectiveType, values?: CSPValue[]) {
    this.type = type;
    this.values = values ?? [];
  }

  static fromString(raw: string): CSPDirective {
    const [type, ...values] = raw.trim().split(/\s+/);

    return new CSPDirective(
      type as CSPDirectiveType,
      values.map((raw) => new CSPValue(raw))
    );
  }

  clone() {
    return new CSPDirective(
      this.type,
      this.values.map((value) => value.clone())
    );
  }

  isEmpty() {
    return !this.values.length;
  }

  toString() {
    return `${this.type} ${this.values.join(" ")}`;
  }
}

export class CSPPolicy {
  public directives: CSPDirective[] = [];

  constructor(directives?: CSPDirective[]) {
    this.directives = directives ?? [];
  }

  static fromString(raw: string): CSPPolicy {
    return new CSPPolicy(
      raw
        .trim()
        .split(/\s*;\s*/)
        .map((directive) => CSPDirective.fromString(directive))
    );
  }

  clone() {
    return new CSPPolicy(this.directives.map((directive) => directive.clone()));
  }

  isEmpty() {
    return this.directives.every((directive) => directive.isEmpty());
  }

  toString() {
    return this.directives
      .filter((directive) => !directive.isEmpty())
      .join("; ");
  }

  setDirective(newDirective: CSPDirective) {
    this.directives = [
      ...this.directives.filter(
        (directive) => directive.type !== newDirective.type
      ),
      newDirective,
    ];
  }
  deleteDirective(type: CSPDirectiveType) {
    this.directives = this.directives.filter(
      (directive) => directive.type !== type
    );
  }
  getDirective(type: CSPDirectiveType) {
    return this.directives.find((directive) => directive.type === type);
  }
}

export class CSPHeader {
  public policies: CSPPolicy[] = [];

  constructor(policies?: CSPPolicy[]) {
    this.policies = policies ?? [];
  }

  static fromString(headerString: string): CSPHeader {
    const header = new CSPHeader();
    header.policies = headerString
      .trim()
      .split(/\s*,\s*/)
      .map((policy) => CSPPolicy.fromString(policy));
    return header;
  }

  clone() {
    return new CSPHeader(this.policies.map((policy) => policy.clone()));
  }

  isEmpty() {
    return this.policies.every((policy) => policy.isEmpty());
  }

  toString() {
    return this.policies.filter((policy) => !policy.isEmpty()).join(", ");
  }
}
