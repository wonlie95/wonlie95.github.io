/**
 * Lightweight, dependency-free cursor snowfall for ShokaX.
 * Injecting the script through the theme keeps it active after PJAX navigation
 * while the cap and short lifetime prevent long pages from accumulating nodes.
 */
hexo.extend.filter.register('theme_inject', (injects) => {
  injects.bodyEnd.raw('snowfall.pug', `
script.
  (() => {
    if (window.__cursorSnowfallInstalled) return;
    window.__cursorSnowfallInstalled = true;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let lastDrop = 0;
    let active = 0;
    const maxFlakes = 36;

    const dropSnow = (event) => {
      if (reduceMotion.matches || active >= maxFlakes) return;
      const now = performance.now();
      if (now - lastDrop < 55) return;
      lastDrop = now;

      const flake = document.createElement('span');
      const size = 4 + Math.random() * 7;
      const drift = (Math.random() - 0.5) * 90;
      const duration = 1100 + Math.random() * 900;
      flake.className = 'cursor-snowflake';
      flake.style.cssText = \
        'left:' + (event.clientX - size / 2) + 'px;' +
        'top:' + (event.clientY - size / 2) + 'px;' +
        'width:' + size + 'px;height:' + size + 'px;' +
        '--snow-drift:' + drift + 'px;' +
        '--snow-duration:' + duration + 'ms;';
      document.body.appendChild(flake);
      active += 1;
      flake.addEventListener('animationend', () => {
        flake.remove();
        active -= 1;
      }, { once: true });
    };

    document.addEventListener('pointermove', dropSnow, { passive: true });
  })();
`);
});
