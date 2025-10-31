/** Determines if a domain pattern, e.g. `*.domain.com` is a superset of another domain pattern,
 * e.g. `sub.sub.domain.com`.
 *
 * -----
 *
 * `*.domain.com` *is* a superset of:
 *
 * ```diff
 * + *.domain.com
 * + domain.com
 * + sub.domain.com
 * + sub.sub.domain.com
 * + *.sub.domain.com
 * ```
 *
 * `*.domain.com` *is not* a superset of:
 *
 * ```diff
 * - domain.org
 * - example.com
 * - *.domain.example.com
 * - somedomain.com
 * - *.com
 * ```
 *
 * -----
 *
 * Domains not prefixed with `*.` are exclusively a superset of themselves:
 *
 * `domain.com` *is* a superset of:
 *
 * ```diff
 * + domain.com
 * ```
 *
 * `domain.com` *is not* a superset of:
 *
 * ```diff
 * - *.domain.com
 * - sub.domain.com
 * - *.com
 * ```
 */
export const isDomainSupersetOf = (superset: string, subset: string) => {
  superset = superset.toLowerCase();
  subset = subset.toLowerCase();

  return (
    superset === subset ||
    (superset.startsWith("*.") &&
      subset.startsWith(superset.slice(2)) &&
      (subset.length === superset.length - 2 ||
        subset[subset.length - superset.length] === "."))
  );
};
