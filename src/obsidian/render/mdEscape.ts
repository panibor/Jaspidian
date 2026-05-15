/**
 * src-v2/obsidian/render/mdEscape.ts
 * Escaping utilities for YAML and Markdown.
 */

/**
 * Escape a string for YAML frontmatter.
 * Multiline strings use block scalar.
 */
export function escapeYamlString(s: string): string {
  if (!s) return '""';
  if (s.includes('\n')) {
    // Block scalar for multiline
    return '|\n  ' + s.split('\n').join('\n  ');
  }
  // Check if needs quoting
  if (/[:,#\[\]{}&*!|>'"%@`]/.test(s)) {
    return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  return s;
}

/**
 * Escape a string for Markdown link target.
 */
export function escapeMdLink(s: string): string {
  return s.replace(/[\[\]()\\`]/g, (ch) => '\\' + ch);
}

/**
 * Escape a string for Markdown table cell.
 */
export function escapeMdTableCell(s: string): string {
  return s.replace(/[|\\\n]/g, (ch) => {
    if (ch === '|') return '\\|';
    if (ch === '\\') return '\\\\';
    if (ch === '\n') return ' ';
    return ch;
  });
}
