'use strict';

const player = `
<link rel="stylesheet" href="/css/site-player.css">
<section id="site-player" aria-label="网站音乐播放器">
  <div class="site-player-panel">
    <p class="site-player-title">♪ キミの記憶 -Reload-</p>
    <div class="site-player-controls">
      <button class="site-player-play" type="button" aria-label="播放或暂停"></button>
      <input class="site-player-volume" type="range" min="0" max="1" step="0.05" aria-label="音量">
    </div>
    <p class="site-player-status" aria-live="polite">准备播放</p>
  </div>
  <button class="site-player-toggle" type="button" aria-label="打开音乐播放器">♪</button>
  <audio preload="metadata"><source src="/songs/about.mp3" type="audio/mpeg"></audio>
</section>
<script defer src="/js/site-player.js"></script>`;

hexo.extend.filter.register('after_render:html', (html) => {
  if (html.includes('id="site-player"')) return html;
  return html.replace('</body>', `${player}\n</body>`);
});
