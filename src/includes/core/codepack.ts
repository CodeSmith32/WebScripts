const al: string =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_$";
const la: Record<string, number> = {};
const le = al.length;
for (let i = 0; i < le; i++) la[al[i]] = i;

const rgxWord = /[a-zA-Z0-9_$]+/g;
const rgxPack = /^([^:]*):([\s\S]*)$/;
const rgxInvalidDictChar = /[^a-zA-Z0-9_$,]/;

/** Convert number to alphanumeric string.
 * `0 = a, 1 = b, 26 = A, 64 = ba, 115903 = $sC` */
const numToStr = (n: number) => {
  let s = "";
  while (n) {
    s += al[n % le];
    n = (n / le) | 0;
  }
  return s ? s : al[0];
};

/** Convert alphanumeric string to number.
 * `a = 0, b = 1, A = 26, ba = 64, $sC = 115903` */
const strToNum = (s: string) => {
  let n = 0;
  let v = 1;
  for (const c of s) {
    n += la[c] * v;
    v *= le;
  }
  return n;
};

export const CodePack = {
  /** Compress a code string. */
  pack(code: string) {
    const dict: string[] = [];

    code = code.replace(rgxWord, (m) => {
      let i = dict.indexOf(m);
      if (i === -1) i = dict.push(m) - 1;

      return numToStr(i);
    });

    return dict.join(",") + ":" + code;
  },
  /** Decompress a packed code string. */
  unpack(packed: string) {
    const parts = packed.match(rgxPack);
    if (!parts) return "";

    const [, dictStr, code] = parts;
    const dict = dictStr.split(",");

    return (code || "").replace(rgxWord, (m) => dict[strToNum(m)] || "");
  },
  /** Validates a packed code string. Throws an error on any detected issues. */
  validate(packed: string) {
    const parts = packed.match(rgxPack);
    if (!parts) {
      throw new SyntaxError(
        "Decompression Failed: Missing dictionary-content separator."
      );
    }

    const [, dictStr] = parts;

    const invalid = dictStr.match(rgxInvalidDictChar);
    if (invalid) {
      throw new SyntaxError(
        "Decompression Failed: Invalid character in dictionary: " + invalid[0]
      );
    }
    if (/^,|,$|,,/.test(dictStr)) {
      throw new SyntaxError(
        "Decompression Failed: Blank dictionary word detected."
      );
    }

    return true;
  },
};
