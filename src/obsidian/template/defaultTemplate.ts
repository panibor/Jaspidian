/**
 * src-v2/obsidian/template/defaultTemplate.ts
 * Default note template (unused in v2, but shipped for UI completeness).
 */
import type { NoteTemplate } from './templateTypes';

export const DEFAULT_TEMPLATE: NoteTemplate = {
  id: 'default-v2',
  name: 'Default',
  raw: `---
title: {{title}}
source: {{source}}
post_id: {{post_id}}
source_url: {{source_url}}
permalink: {{permalink}}
author: {{author}}
author_url: {{author_url}}
context_kind: {{context_kind}}
group_name: {{group_name}}
group_url: {{group_url}}
page_name: {{page_name}}
page_url: {{page_url}}
profile_name: {{profile_name}}
profile_url: {{profile_url}}
posted_at: {{posted_at}}
posted_at_text: {{posted_at_text}}
captured_at: {{captured_at}}
language: {{language}}
direction: {{direction}}
comment_mode: {{comment_mode}}
comment_count_total: {{comment_count_total}}
comment_count_included: {{comment_count_included}}
image_count: {{image_count}}
has_video: {{has_video}}
has_shared_post: {{has_shared_post}}
tags: {{tags}}
---

# {{title}}

Posted by [{{author}}]({{author_url}}) in {{context_name}}

## Post

{{body}}

## Media

{{media_embeds}}

## Comments

{{comments}}
`,
};
