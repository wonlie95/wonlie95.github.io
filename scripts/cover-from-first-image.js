'use strict';

// Use the first Markdown image in an article as its homepage cover unless the
// article already explicitly declares `cover` in its front matter.
hexo.extend.filter.register('before_post_render', (data) => {
  if (data.cover || !data.content) return data;

  const firstImage = data.content.match(/!\[[^\]]*\]\(([^\s)]+)(?:\s+['"][^)]*['"])?\)/);
  if (firstImage) data.cover = firstImage[1];

  return data;
});
