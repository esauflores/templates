const VAR = /\{\{\s*([\w.-]+)\s*\}\}/g;

/** Distinct `{{variable}}` names in a prompt body, in first-seen order. */
export const promptVars = (body: string): string[] => [...new Set([...body.matchAll(VAR)].map((m) => m[1]))];

/** Replace `{{name}}` with `values.name`; unknown vars are left as-is. */
export const fillTemplate = (body: string, values: Record<string, string>): string =>
  body.replace(VAR, (whole, name: string) => values[name]?.trim() || whole);
