/**
 * Aether starts before Hexo applies _config.shokax.yml, so it escapes the
 * existing HTML player in the preserved About source. Decode that known-safe
 * first block before ShokaX applies its page layout; Notion posts are untouched.
 */
hexo.extend.filter.register('after_post_render', (data) => {
  if (!data.source?.replace(/\\/g, '/').endsWith('about/index.md')) return data;

  const headingAt = data.content.indexOf('<h2');
  if (headingAt < 0) return data;

  const player = data.content.slice(0, headingAt)
    .replace(/<\/?p>/g, '')
    .replace(/<br\s*\/?>(?:\r?\n)?/g, '\n')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/=&gt;/g, '=>');

  data.content = player + data.content.slice(headingAt);
  return data;
});
