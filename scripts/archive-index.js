'use strict'

/**
 * The upstream root archive template produces malformed HTML.  Keep the
 * ShokaX page shell but replace its contents with a valid chronological list.
 */
const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const formatDate = (value, pattern) => {
  if (value && typeof value.format === 'function') return value.format(pattern)
  const date = new Date(value)
  return pattern === 'YYYY'
    ? String(date.getFullYear())
    : String(date.getMonth() + 1).padStart(2, '0')
}

const postUrl = (path) => {
  const root = (hexo.config.root || '/').replace(/\/$/, '')
  const postPath = String(path).replace(/^\/+/, '')
  return root ? `${root}/${postPath}` : `/${postPath}`
}

const renderArchive = () => {
  const posts = hexo.locals.get('posts').sort('date', -1).toArray()
  const years = new Map()

  posts.forEach((post) => {
    const year = formatDate(post.date, 'YYYY')
    if (!years.has(year)) years.set(year, [])
    years.get(year).push(post)
  })

  const yearMarkup = Array.from(years.entries()).map(([year, entries]) => {
    const links = entries.map((post) => {
      const month = formatDate(post.date, 'MM')
      const title = escapeHtml(post.title || 'Untitled post')
      const href = escapeHtml(post.link || postUrl(post.path))
      const external = post.link ? ' target="_blank" rel="noopener noreferrer"' : ''
      const dateTime = escapeHtml(post.date.toISOString ? post.date.toISOString() : post.date)
      return `<li class="timeline-archive__post"><time datetime="${dateTime}">${month}&#x6708;</time><a href="${href}"${external}>${title}</a></li>`
    }).join('')

    return `<section class="timeline-archive__year"><h2>${year}</h2><ol>${links}</ol></section>`
  }).join('')

  return `<div class="timeline-archive wrap" aria-label="archive"><p class="timeline-archive__summary">&#x5171; ${posts.length} &#x7bc7;&#x6587;&#x7ae0;</p>${yearMarkup}</div>`
}

hexo.extend.filter.register('after_render:html', (html, data) => {
  if (data.path !== 'archives/index.html') return html
  return html.replace(
    /<div class="collapse wrap">[\s\S]*?(<div id="sidebar">)/,
    `${renderArchive()}</div>$1`
  )
})
