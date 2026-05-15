/**
 * src-v2/obsidian/render/tagsFromHashtags.ts
 * Extract hashtags and convert to Obsidian tags.
 */

/**
 * Extract hashtags from text (#word patterns).
 */
export function extractHashtags(body: string): string[] {
  const matches = body.match(/#[\w-]+/g) || [];
  const tags = matches
    .map((m) => m.slice(1).toLowerCase())
    .filter((t, i, arr) => arr.indexOf(t) === i); // dedupe
  return tags;
}

/**
 * Convert a string to a valid Obsidian tag.
 */
export function obsidianTagFromString(s: string): string {
  let tag = s
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-/]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Ensure no leading digit
  if (/^\d/.test(tag)) {
    tag = '_' + tag;
  }

  return tag || 'tag';
}
