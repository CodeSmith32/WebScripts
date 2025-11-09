export class RegexService {
  validateRegex(pattern: string, flags: string): RegExp | null {
    try {
      return new RegExp(pattern, flags);
    } catch (_err) {
      return null;
    }
  }
}

export const regexService = new RegexService();
