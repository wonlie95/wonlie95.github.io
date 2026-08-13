'use strict'

// ShokaX 0.4.25 calls its Waline "recent comments" renderer on every page,
// even when the optional recent-comments widget (and therefore #new-comment)
// is not present.  The renderer then throws on the homepage.  Keep normal
// article comments and page-view counts intact; only skip that invalid call.
const fs = require('fs')
const path = require('path')

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'hexo-theme-shokax',
  'source',
  'js',
  '_app',
  'pjax',
  'refresh.ts'
)

const original = `  if (__shokax_waline__) {
    import('../components/comments').then(async ({walineRecentComments}) => {
      await walineRecentComments()
    })
  }
`

if (fs.existsSync(target)) {
  const source = fs.readFileSync(target, 'utf8')
  if (!source.includes('// Local fix: avoid rendering recent comments without its widget.')) {
    if (!source.includes(original)) {
      throw new Error('Unsupported ShokaX refresh.ts: Waline recent-comments block was not found.')
    }

    const replacement = `  // Local fix: avoid rendering recent comments without its widget.
  // Article comments and page views are initialized separately above.
`

    fs.writeFileSync(target, source.replace(original, replacement))
  }
}
