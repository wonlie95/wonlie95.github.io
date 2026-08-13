'use strict'

// Waline is bundled by ShokaX. This file now only provides a small status
// placeholder; the theme's own client mounts comments without a second CDN.
hexo.extend.filter.register('theme_inject', (injects) => {
  injects.comment.raw('waline-status.pug', `
p(class="waline-status" aria-live="polite") 评论区正在加载…
  `)
})
