const MARKDOWN_CONTROL_CHARACTER = /([\\`*_[\]{}()#+!|~-])/g;

/**
 * Escapes untrusted inline text before placing it in generated Markdown.
 * Newlines are converted only after HTML and Markdown characters are escaped,
 * so the generated <br> is trusted markup rather than user-supplied HTML.
 */
export function escapeMarkdownText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(MARKDOWN_CONTROL_CHARACTER, "\\$1")
    .replace(/\r\n?|\n/g, "<br>");
}
