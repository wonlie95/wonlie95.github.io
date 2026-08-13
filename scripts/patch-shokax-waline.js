'use strict'

// ShokaX 0.4.25 starts Waline from a scroll observer near the page bottom.
// Let the non-blocking fallback own mounting so a slow comment request cannot
// freeze bottom-of-page interaction.
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

const observer = `          if (__shokax_waline__) {
            import('../components/comments').then(({walinePageview, walineComment}) => {
              walinePageview()
              walineComment()
            })
          }
`

if (fs.existsSync(target)) {
  let source = fs.readFileSync(target, 'utf8')
  if (source.includes(original)) {
    source = source.replace(original, `  // Local fix: avoid rendering recent comments without its widget.
  // Article comments and page views are initialized separately above.
`)
  }
  if (source.includes(observer)) {
    source = source.replace(observer, `          // Local fix: Waline is mounted by the non-blocking fallback.
          // Do not start network work from the bottom scroll observer.
`)
  }
  fs.writeFileSync(target, source)
}
