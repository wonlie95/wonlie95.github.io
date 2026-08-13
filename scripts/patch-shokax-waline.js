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

const head = path.join(
  __dirname,
  '..',
  'node_modules',
  'hexo-theme-shokax',
  'layout',
  '_partials',
  'head',
  'head_com.pug'
)
const layoutRoot = path.join(__dirname, '..', 'node_modules', 'hexo-theme-shokax', 'layout')

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

// ShokaX 0.5 expects page.tags to be a Hexo Query object.  Static pages
// imported from Notion may expose a plain array instead.
if (fs.existsSync(head)) {
  const source = fs.readFileSync(head, 'utf8')
  const oldLine = "- var keywords='',tmp=page?.tags?.toArray()"
  const newLine = "- var keywords='',tmp=page?.tags ? (typeof page.tags.toArray === 'function' ? page.tags.toArray() : page.tags) : undefined"
  if (source.includes(oldLine)) fs.writeFileSync(head, source.replace(oldLine, newLine))
}

if (fs.existsSync(layoutRoot)) {
  const files = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (full.endsWith('.pug')) files.push(full)
    }
  }
  walk(layoutRoot)
  for (const file of files) {
    let source = fs.readFileSync(file, 'utf8')
    source = source.replace(/(post|page)\.tags\.toArray\(\)/g, (match, name) => `(typeof ${name}.tags.toArray === 'function' ? ${name}.tags.toArray() : ${name}.tags)`)
    source = source.replace(/(post|page)\.categories\.toArray\(\)/g, (match, name) => `(typeof ${name}.categories.toArray === 'function' ? ${name}.categories.toArray() : ${name}.categories)`)
    if (source !== fs.readFileSync(file, 'utf8')) fs.writeFileSync(file, source)
  }
}

const helper = path.join(layoutRoot, '..', 'scripts', 'helpers', 'list_categories.js')
if (fs.existsSync(helper)) {
  let source = fs.readFileSync(helper, 'utf8')
  source = source.replace(/page\.categories\.toArray\(\)/g, "(typeof page.categories.toArray === 'function' ? page.categories.toArray() : page.categories)")
  fs.writeFileSync(helper, source)
}
