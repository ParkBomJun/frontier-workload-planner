const SINGLE_LINE_INPUT_TYPES = new Set([
  "date",
  "email",
  "number",
  "search",
  "tel",
  "text",
  "url",
]);

export function shouldPreventImplicitFormSubmit(
  key: string,
  inputType: string,
  isComposing: boolean,
): boolean {
  return key === "Enter" && !isComposing && SINGLE_LINE_INPUT_TYPES.has(inputType);
}
