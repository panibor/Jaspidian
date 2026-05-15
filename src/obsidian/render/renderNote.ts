/**
 * src-v2/obsidian/render/renderNote.ts
 * Orchestrates rendering an ExtractedFacebookPostV2 into Obsidian markdown.
 */
import type { ExtractedFacebookPostV2, CommentMode, TextDirection } from '../../shared/types';
import { renderFrontmatter } from './renderFrontmatter';
import { renderBody } from './renderBody';
import { renderComments } from './renderComments';
import { buildFilename } from '../../obsidian/filename/buildFilename';
import { DEFAULT_VAULT_PATTERN, DEFAULT_ATTACHMENTS_FOLDER } from '../../shared/constants';

export interface RenderOptions {
  commentMode: CommentMode;
  vaultPattern: string;
  attachmentsFolder: string;
  capturedAt: string;
  language?: string;
  direction?: TextDirection;
}

export interface RenderedNote {
  filename: string;
  folder: string;
  attachmentFolder: string;
  markdown: string;
  warnings: string[];
}

/**
 * Render an extracted post into Obsidian markdown with YAML frontmatter.
 *
 * @param post Extracted post.
 * @param opts Render options.
 * @returns RenderedNote.
 */
export function renderNote(post: ExtractedFacebookPostV2, opts: RenderOptions): RenderedNote {
  const warnings: string[] = [];

  // Build filename + folder.
  // Attachment pattern always gets a per-post {{postId}} subfolder appended so that
  // images from different posts never share a folder (and image-01.jpg never overwrites).
  const baseAttachmentDir = opts.attachmentsFolder || DEFAULT_ATTACHMENTS_FOLDER;
  const filenames = buildFilename(post, {
    vaultPattern: opts.vaultPattern || DEFAULT_VAULT_PATTERN,
    attachmentPattern: baseAttachmentDir + '/{{postId}}',
    unicode: false,
  });

  // Always use the fully-expanded per-post folder — never the raw base dir.
  const attachmentFolder = filenames.attachmentFolder;

  // Render the three sections
  const optsWithAttachments: RenderOptions = { ...opts, attachmentsFolder: attachmentFolder };

  // Effective language: post body is the ground truth; fall back to caller hint then English
  const lang = post.language || opts.language || 'en';
  const optsWithLang: RenderOptions = { ...optsWithAttachments, language: lang };

  let frontmatter: string;
  try {
    frontmatter = renderFrontmatter(post, optsWithLang);
  } catch (err) {
    warnings.push('renderFrontmatter failed: ' + String(err));
    frontmatter = '---\n---';
  }

  let body: string;
  try {
    body = renderBody(post, optsWithLang);
  } catch (err) {
    warnings.push('renderBody failed: ' + String(err));
    body = '*(body render failed)*';
  }

  let commentsSection: string;
  try {
    commentsSection = renderComments(
      post.comments,
      opts.commentMode,
      post.engagementCommentCount,
      lang,
    );
  } catch (err) {
    warnings.push('renderComments failed: ' + String(err));
    commentsSection = '## Comments\n\n*(comments render failed)*';
  }

  const markdown = [frontmatter, '', body, '', commentsSection, ''].join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd() + '\n';

  return {
    filename: filenames.filename,
    folder: filenames.folder,
    attachmentFolder,
    markdown,
    warnings,
  };
}
