'use strict'

// ShokaX may fail to mount Waline when its lazy IntersectionObserver misses
// the comments area. Mount it explicitly on article pages as a fallback.
hexo.extend.filter.register('theme_inject', (injects) => {
  injects.head.raw('waline-fallback-style.pug', `
link(rel="stylesheet" href="https://unpkg.com/@waline/client@v3/dist/waline.css")
  `)
  injects.bodyEnd.raw('waline-fallback.pug', `
script(type="module").
  (() => {
    const mount = async () => {
      const el = document.querySelector('#comments');
      // Let ShokaX's normal initializer win if it has already rendered.
      if (!el || el.dataset.walineMounted === 'true' || el.querySelector('.wl-comment')) return;
      el.dataset.walineMounted = 'true';
      try {
        const { init } = await import('https://unpkg.com/@waline/client@v3/dist/waline.js');
        init({
          el,
          serverURL: 'https://waline-ice-world.vercel.app',
          lang: 'zh-CN',
          path: window.location.pathname,
          meta: ['nick', 'link'],
          requiredMeta: [],
          login: 'disable',
          pageSize: 10,
          pageview: true
        });
      } catch (error) {
        el.dataset.walineMounted = 'false';
        console.error('[Waline] fallback mount failed', error);
      }
    };
    mount();
    document.addEventListener('pjax:success', mount);
  })();
  `)
})
