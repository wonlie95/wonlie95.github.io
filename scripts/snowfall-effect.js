/**
 * Visible cursor snowfall that survives ShokaX PJAX navigation.
 */
hexo.extend.filter.register('theme_inject', (injects) => {
  injects.bodyEnd.raw('snowfall.pug', `
script.
  (() => {
    if (window.__cursorSnowfallInstalled) return;
    window.__cursorSnowfallInstalled = true;

    let lastDrop = 0;
    let active = 0;
    const maxFlakes = 18;

    const dropSnow = (event) => {
      if (active >= maxFlakes) return;
      const now = performance.now();
      if (now - lastDrop < 90) return;
      lastDrop = now;

      const flake = document.createElement('span');
      const size = 12 + Math.random() * 10;
      const drift = (Math.random() - 0.5) * 90;
      const duration = 1200 + Math.random() * 900;
      flake.className = 'cursor-snowflake';
      flake.textContent = '\\u2744';
      flake.style.cssText = 'left:' + event.clientX + 'px;' +
        'top:' + event.clientY + 'px;' +
        'font-size:' + size + 'px;' +
        '--snow-drift:' + drift + 'px;' +
        '--snow-duration:' + duration + 'ms;';
      document.body.appendChild(flake);
      active += 1;
      flake.addEventListener('animationend', () => {
        flake.remove();
        active -= 1;
      }, { once: true });
      window.setTimeout(() => {
        if (flake.isConnected) {
          flake.remove();
          active -= 1;
        }
      }, duration + 150);
    };

    document.addEventListener('pointermove', dropSnow, { passive: true });
  })();
`);
});
