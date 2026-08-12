import { createHash } from 'node:crypto';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const token = process.env.NOTION_TOKEN;
const dataSourceId = process.env.NOTION_DATA_SOURCE_ID || '81e7a5d6-c649-47f9-83fa-a0954480c65f';
const postsDirectory = path.resolve('source/_posts/notion');
const aboutDirectory = path.resolve('source/about');
const imagesDirectory = path.resolve('source/images/notion');
const permanentPostSettings = {
  '3b9af7157eab80068e21f640913458be': {
    permalink: 'about/',
    date: '2023-09-27T00:00:00.000Z',
  },
};

const aboutPageId = '3b9af7157eab80068e21f640913458be';
const aboutMusicPlayer = `
<section class="about-music-player" aria-label="About 页面音乐播放器">
  <p class="about-music-player__title">♪ 正在播放：キミの記憶 -Reload-</p>
  <audio id="about-music" controls autoplay preload="auto">
    <source src="/songs/about.mp3" type="audio/mpeg">
    你的浏览器不支持音频播放。
  </audio>
  <p id="about-music-status" class="about-music-player__status" aria-live="polite"></p>
</section>

<style>
  .about-music-player { margin: 0 0 2rem; padding: 1rem 1.2rem; border-radius: 12px; background: rgba(255,255,255,.72); box-shadow: 0 4px 18px rgba(0,0,0,.08); }
  .about-music-player__title { margin: 0 0 .6rem; font-weight: 600; }
  .about-music-player audio { display: block; width: 100%; }
  .about-music-player__status { margin: .6rem 0 0; font-size: .86em; opacity: .7; }
</style>

<script>
  (() => {
    const startMusic = () => {
      const player = document.getElementById('about-music');
      const status = document.getElementById('about-music-status');
      if (!player || player.dataset.started) return;
      player.dataset.started = 'true';
      player.volume = 0.55;
      player.play().then(() => {
        if (status) status.textContent = '音乐正在播放';
      }).catch(() => {
        if (status) status.textContent = '浏览器拦截了自动播放，请点击播放按钮。';
      });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startMusic, { once: true });
    else startMusic();
  })();
</script>
`.trim();

if (!token) throw new Error('NOTION_TOKEN is required. Add it as a GitHub Actions repository secret.');

const request = async (url, options = {}) => {
  const response = await fetch(`https://api.notion.com/v1${url}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2025-09-03',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`Notion API ${response.status}: ${await response.text()}`);
  return response.json();
};

const escapeYaml = (value) => JSON.stringify(String(value ?? ''));
const idOf = (page) => page.id.replaceAll('-', '');
const propertyText = (property) => (property?.title || property?.rich_text || []).map((item) => item.plain_text).join('');
const propertyTags = (property) => (property?.multi_select || []).map((item) => item.name);
const isExcludedFromBlog = (page) => propertyTags(page.properties['分类'])
  .some((tag) => tag.trim().toUpperCase() === 'NO');
const richText = (parts = []) => parts.map((part) => {
  let text = part.plain_text || '';
  if (part.href) text = `[${text}](${part.href})`;
  if (part.annotations?.code) text = `\`${text}\``;
  if (part.annotations?.bold) text = `**${text}**`;
  if (part.annotations?.italic) text = `*${text}*`;
  if (part.annotations?.strikethrough) text = `~~${text}~~`;
  return text;
}).join('');

async function children(blockId) {
  const blocks = [];
  let cursor;
  do {
    const page = await request(`/blocks/${blockId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`);
    blocks.push(...page.results);
    cursor = page.next_cursor;
  } while (cursor);
  return blocks;
}

function extension(contentType, source) {
  if (/png/.test(contentType) || /\.png(?:\?|$)/i.test(source)) return '.png';
  if (/gif/.test(contentType) || /\.gif(?:\?|$)/i.test(source)) return '.gif';
  if (/webp/.test(contentType) || /\.webp(?:\?|$)/i.test(source)) return '.webp';
  if (/svg/.test(contentType) || /\.svg(?:\?|$)/i.test(source)) return '.svg';
  return '.jpg';
}

async function localImage(url, pageId) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return url;
    const bytes = Buffer.from(await response.arrayBuffer());
    const name = `${createHash('sha1').update(url).digest('hex').slice(0, 16)}${extension(response.headers.get('content-type') || '', url)}`;
    const folder = path.join(imagesDirectory, pageId);
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, name), bytes);
    return `/images/notion/${pageId}/${name}`;
  } catch (error) {
    console.warn(`Could not download image; keeping its original URL: ${error.message}`);
    return url;
  }
}

async function renderBlocks(blocks, pageId, depth = 0) {
  const rendered = [];
  for (const block of blocks) {
    const data = block[block.type] || {};
    const nested = block.has_children ? await renderBlocks(await children(block.id), pageId, depth + 1) : '';
    const text = richText(data.rich_text);
    switch (block.type) {
      case 'paragraph': rendered.push(`${text}${nested ? `\n${nested}` : ''}`); break;
      case 'heading_1': rendered.push(`# ${text}`); break;
      case 'heading_2': rendered.push(`## ${text}`); break;
      case 'heading_3': rendered.push(`### ${text}`); break;
      case 'bulleted_list_item': rendered.push(`${'  '.repeat(depth)}- ${text}${nested ? `\n${nested}` : ''}`); break;
      case 'numbered_list_item': rendered.push(`${'  '.repeat(depth)}1. ${text}${nested ? `\n${nested}` : ''}`); break;
      case 'to_do': rendered.push(`${'  '.repeat(depth)}- [${data.checked ? 'x' : ' '}] ${text}`); break;
      case 'quote': rendered.push(`> ${text}`); break;
      case 'callout': rendered.push(`> ${data.icon?.emoji || '💡'} ${text}`); break;
      case 'code': rendered.push(`\`\`\`${data.language || ''}\n${text}\n\`\`\``); break;
      case 'divider': rendered.push('---'); break;
      case 'bookmark': rendered.push(`[${data.caption?.length ? richText(data.caption) : data.url}](${data.url})`); break;
      case 'image': {
        const source = data.type === 'external' ? data.external.url : data.file.url;
        rendered.push(`![${richText(data.caption) || '图片'}](${await localImage(source, pageId)})`);
        break;
      }
      default: if (text) rendered.push(text);
    }
  }
  return rendered.filter(Boolean).join('\n\n');
}

async function allPages() {
  const pages = [];
  let cursor;
  do {
    const result = await request(`/data_sources/${dataSourceId}/query`, {
      method: 'POST', body: JSON.stringify({ page_size: 100, start_cursor: cursor }),
    });
    pages.push(...result.results.filter((page) => !page.archived && !page.in_trash && !isExcludedFromBlog(page)));
    cursor = result.next_cursor;
  } while (cursor);
  return pages;
}

await mkdir(postsDirectory, { recursive: true });
await mkdir(aboutDirectory, { recursive: true });
const pages = await allPages();
const names = new Set();
for (const page of pages) {
  const id = idOf(page);
  const title = propertyText(page.properties.Name) || 'Untitled';
  const tags = propertyTags(page.properties['分类']);
  const settings = permanentPostSettings[id] || {};
  const date = settings.date || page.created_time || new Date().toISOString();
  const renderedBody = await renderBlocks(await children(page.id), id);
  const body = id === aboutPageId ? `${aboutMusicPlayer}\n\n${renderedBody}` : renderedBody;
  const cover = renderedBody.match(/!\[[^\]]*\]\(([^\s)]+)/)?.[1];
  const frontMatter = [
    '---', `title: ${escapeYaml(title)}`, `date: ${date}`, `updated: ${page.last_edited_time || date}`, 'toc: true',
    ...(cover ? [`cover: ${escapeYaml(cover)}`] : []),
    ...(settings.permalink ? [`permalink: ${settings.permalink}`] : []),
    ...(settings.showIn ? ['show_in:', ...settings.showIn.map((location) => `  - ${location}`)] : []),
    'categories:', ...(tags.length ? tags.map((tag) => `  - ${escapeYaml(tag)}`) : ['  - 未分类']),
    'tags:', ...(tags.length ? tags.map((tag) => `  - ${escapeYaml(tag)}`) : ['  - Notion']),
    `notion_url: ${escapeYaml(page.url)}`, '---', '', body || '_此文章暂无正文。_', '',
  ].join('\n');
  const filename = `notion-${id}.md`;
  if (id === aboutPageId) {
    await writeFile(path.join(aboutDirectory, 'index.md'), frontMatter, 'utf8');
  } else {
    names.add(filename);
    await writeFile(path.join(postsDirectory, filename), frontMatter, 'utf8');
  }
}
for (const entry of await readdir(postsDirectory)) {
  if (entry.startsWith('notion-') && entry.endsWith('.md') && !names.has(entry)) await rm(path.join(postsDirectory, entry));
}
console.log(`Synced ${pages.length} Notion pages.`);
