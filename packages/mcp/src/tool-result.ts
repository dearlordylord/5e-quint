export function extractTextResult(
  result:
    | { readonly content?: ReadonlyArray<{ readonly text?: string }> }
    | unknown,
) {
  if (typeof result !== "object" || result == null || !("content" in result)) {
    return result;
  }
  const content = (
    result as { readonly content?: ReadonlyArray<{ readonly text?: string }> }
  ).content;
  const text = content?.[0]?.text;
  return typeof text === "string" ? JSON.parse(text) : result;
}
