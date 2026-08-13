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

const handles = path.join(
  __dirname,
  '..',
  'node_modules',
  'hexo-theme-shokax',
  'source',
  'js',
  '_app',
  'globals',
  'handles.ts'
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
const bundledObserver = `          // Mount only the bundled Waline comment UI. Page views stay off.
          import('../components/comments').then(({walineComment}) => {
            walineComment()
          }).catch(console.error)
`
const immediateComments = `    if (__shokax_waline__) {
      import('../components/comments').then(({walineComment}) => {
        walineComment()
        document.querySelector('.waline-status')?.remove()
      }).catch((error) => {
        console.error(error)
        const status = document.querySelector('.waline-status')
        if (status) status.textContent = '评论区暂时无法加载，请稍后刷新重试。'
      })
    }
`
const immediateCommentBlock = `  const cpel = document.getElementById('copyright')
  if (cpel) {
${immediateComments}    if (__shokax_twikoo__) {
      import('../components/tcomments').then(({twikooComment}) => {
        twikooComment()
      }).catch(console.error)
    }
  }
`
const katex = "  await import('katex/dist/contrib/copy-tex.mjs')"
const postBeauty = "  const pagePost = await import('../page/post')\n  await pagePost.postBeauty()"

if (fs.existsSync(target)) {
  let source = fs.readFileSync(target, 'utf8')
  if (source.includes(original)) {
    source = source.replace(original, `  // Local fix: avoid rendering recent comments without its widget.
  // Article comments and page views are initialized separately above.
`)
  }
  if (source.includes(observer)) {
    source = source.replace(observer, immediateComments)
  } else if (source.includes(bundledObserver)) {
    source = source.replace(bundledObserver, immediateComments)
  } else if (source.includes('// Local fix: Waline is mounted by the non-blocking fallback.')) {
    source = source.replace(`          // Local fix: Waline is mounted by the non-blocking fallback.
          // Do not start network work from the bottom scroll observer.
`, `          // Mount only the bundled Waline comment UI. Page views stay off.
          import('../components/comments').then(({walineComment}) => {
            walineComment()
          }).catch(console.error)
`)
  }
  // ShokaX normally waits for the copyright card to intersect the viewport.
  // That couples comment startup to scrolling and caused the page to lock at
  // the exact point where the observer fired. Initialize once with the page.
  source = source.replace(
    /  const cpel = document\.getElementById\('copyright'\)[\s\S]*?\n  }\n\n  \/\/ Local fix:/,
    `${immediateCommentBlock}\n  // Local fix:`
  )
  source = source.replace(katex, "  if (LOCAL.copy_tex) import('katex/dist/contrib/copy-tex.mjs').catch(console.error)")
  source = source.replace(postBeauty, "  import('../page/post').then(({postBeauty}) => postBeauty()).catch(console.error)")
  fs.writeFileSync(target, source)
}

if (fs.existsSync(handles)) {
  let source = fs.readFileSync(handles, 'utf8')
  const sidebarAffix = "  sideBar.classList.toggle('affix', window.scrollY > headerHight && document.body.offsetWidth >= 991)"
  if (source.includes(sidebarAffix)) {
    source = source.replace(sidebarAffix, "  // Local fix: keep the desktop sidebar in normal flow to avoid scroll jumps.")
  }
  fs.writeFileSync(handles, source)
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
  const originalCategoryLine = '  const cat = page.categories.toArray();'
  const safeCategoryLine = "  const cat = typeof page.categories.toArray === 'function' ? page.categories.toArray() : page.categories;"
  if (source.includes(originalCategoryLine)) source = source.replace(originalCategoryLine, safeCategoryLine)
  fs.writeFileSync(helper, source)
}
