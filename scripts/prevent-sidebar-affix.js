'use strict'

// ShokaX adds `.affix` to the desktop sidebar during every scroll. Its built-in
// CSS then changes the sidebar from normal flow to fixed positioning and alters
// panel height. At the document bottom this changes max scroll position and
// browsers clamp/anchor the view upward. Remove only that desktop sidebar state
// after ShokaX's own scroll listener has run; mobile sidebar behaviour is left
// untouched.
hexo.extend.filter.register('theme_inject', (injects) => {
  injects.bodyEnd.raw('prevent-sidebar-affix.pug', `script.
    (() => {
      const desktop = () => window.matchMedia('(min-width: 992px)').matches;
      const releaseSidebar = () => {
        if (desktop()) document.getElementById('sidebar')?.classList.remove('affix');
      };
      window.addEventListener('DOMContentLoaded', () => {
        releaseSidebar();
        window.addEventListener('scroll', releaseSidebar, { passive: true });
        new MutationObserver(releaseSidebar).observe(document.getElementById('sidebar'), {
          attributes: true,
          attributeFilter: ['class']
        });
      }, { once: true });
    })();
  `)
})
