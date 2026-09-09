const src = new URL("./src/", import.meta.url);

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    return nextResolve(`./${specifier.slice(2)}`, {
      ...context,
      parentURL: new URL("./dummy.ts", src).href,
    });
  }
  return nextResolve(specifier, context);
}
