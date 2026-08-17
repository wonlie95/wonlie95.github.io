'use strict'

// ShokaX 0.4.25 starts Waline from a scroll observer near the page bottom.
// Let the non-blocking fallback own mounting so a slow comment request cannot
// freeze bottom-of-page interaction.
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

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
const themeConfig = path.join(__dirname, '..', 'node_modules', 'hexo-theme-shokax', '_config.yml')
const nyxPlayerRoot = path.join(__dirname, '..', 'node_modules', 'nyx-player')
const nyxPlayerCss = path.join(nyxPlayerRoot, 'dist', 'nyx-player.css')
const nyxMainPlayer = path.join(nyxPlayerRoot, 'src', 'NyxPlayer.vue')
const nyxAudioPlayer = path.join(
  nyxPlayerRoot,
  'src',
  'components',
  'AudioPlayer.vue'
)
const nyxAudioCover = path.join(nyxPlayerRoot, 'src', 'components', 'preview', 'AudioCover.vue')
const nyxPlayingStore = path.join(nyxPlayerRoot, 'src', 'components', 'playingStore.ts')
const nyxVolumeButton = path.join(nyxPlayerRoot, 'src', 'components', 'controller', 'VolumeBtn.vue')
const nyxMetingConstants = path.join(nyxPlayerRoot, 'src', 'components', 'metingapi', 'constants.ts')
const nyxPlaylist = path.join(nyxPlayerRoot, 'src', 'components', 'metingapi', 'playlist.ts')
const nyxLyric = path.join(nyxPlayerRoot, 'src', 'components', 'metingapi', 'lrc.ts')
const nyxMusicLyric = path.join(nyxPlayerRoot, 'src', 'components', 'preview', 'info', 'MusicLRC.vue')
const nyxPresets = path.join(nyxPlayerRoot, 'src', 'presets.ts')
const nyxPlaylistSnapshot = path.join(__dirname, '..', 'source', 'assets', 'nyx-playlist-12584824470.json')
const themeColor = path.join(
  __dirname,
  '..',
  'node_modules',
  'hexo-theme-shokax',
  'source',
  'js',
  '_app',
  'globals',
  'themeColor.ts'
)
const mainLayout = path.join(layoutRoot, '_partials', 'layout.pug')
const siteInitSource = path.join(
  __dirname,
  '..',
  'node_modules',
  'hexo-theme-shokax',
  'source',
  'js',
  '_app',
  'pjax',
  'siteInit.ts'
)

// Hexo deep-merges theme defaults with _config.shokax.yml, so omitting the
// Alipay key in the site config would otherwise keep the theme's default item.
if (fs.existsSync(themeConfig)) {
  const source = fs.readFileSync(themeConfig, 'utf8')
  const withoutAlipay = source.replace(/^\s{4}alipay:\s*\/alipay\.png\s*\r?\n/m, '')
  if (source !== withoutAlipay) fs.writeFileSync(themeConfig, withoutAlipay)
}

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

if (fs.existsSync(nyxPlayingStore)) {
  let source = fs.readFileSync(nyxPlayingStore, 'utf8')
  source = source.replace('      volume: 0.3,', '      volume: 0.15,')
  if (!source.includes('volume: 0.15')) {
    source = source.replace(
      '      enableVolume: true,',
      '      enableVolume: true,\n      volume: 0.15,',
    )
  }
  fs.writeFileSync(nyxPlayingStore, source)
}

if (fs.existsSync(nyxVolumeButton)) {
  fs.writeFileSync(nyxVolumeButton, `<script setup lang="ts">
import { computed } from 'vue'
import { usePlayingStore } from '../playingStore'

const playingStore = usePlayingStore()

const enableVolume = computed(() => playingStore.enableVolume)
const volumePercent = computed(() => Math.round(normalizedVolume() * 100))

function normalizedVolume() {
  const value = Number(playingStore.volume)
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.15
}

function toggleVolume() {
  playingStore.enableVolume = !playingStore.enableVolume
  if (playingStore.enableVolume && normalizedVolume() === 0)
    playingStore.volume = 0.15
}

function updateVolume(event: Event) {
  const input = event.target as HTMLInputElement
  playingStore.volume = Math.min(1, Math.max(0, Number(input.value)))
  playingStore.enableVolume = playingStore.volume > 0
}
</script>

<template>
  <div class="volume-control flex items-center gap-1.5" title="调整音量">
    <div
      class="volume-icon flex-shrink-0 text-xl"
      :class="{ 'i-ri:volume-up-line': enableVolume && volumePercent > 0, 'i-ri:volume-mute-line': !enableVolume || volumePercent === 0 }"
      title="静音/恢复声音"
      @click="toggleVolume"
    />
    <input
      class="volume-slider"
      type="range"
      min="0"
      max="1"
      step="0.01"
      :value="normalizedVolume()"
      :aria-label="\`音量 \${volumePercent}%\`"
      @input="updateVolume"
    >
    <span class="volume-value">{{ volumePercent }}%</span>
  </div>
</template>

<style scoped>
.volume-control {
  width: 30% !important;
  min-width: 7.5rem;
  cursor: default;
}

.volume-icon {
  width: 1.25rem !important;
  cursor: pointer;
}

.volume-slider {
  width: 4.5rem;
  height: 0.25rem;
  cursor: pointer;
  accent-color: var(--primary-color);
}

.volume-value {
  min-width: 2.2rem;
  color: var(--secondary-text);
  font-size: 0.72rem;
  text-align: right;
}
</style>
`)
}
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

// Nyx Player 0.1.1 awaits the remote Meting request in <script setup>.
// Vue therefore keeps the whole player inside Suspense until that third-party
// endpoint responds, delaying the show-button listener as well.  Fetch the
// playlist in the background so the shell opens immediately on every page.
if (fs.existsSync(nyxAudioPlayer)) {
  let source = fs.readFileSync(nyxAudioPlayer, 'utf8')
  const originalNyxSource = source
  const cachedPlaylistCondition = `const playlistCacheUsesBrokenAPI = playingStore.playlists.some(playlist =>
  playlist.playlist.some(song => song.url?.includes('api.injahow.cn') || song.url?.includes('meting.mikus.ink')),
)
if (playlistCacheUsesBrokenAPI || !playingStore.playlists.some(playlist => playlist.playlist.length > 0)) {`
  source = source.replace(
    "playlist.playlist.some(song => song.url?.includes('api.injahow.cn'))",
    "playlist.playlist.some(song => song.url?.includes('api.injahow.cn') || song.url?.includes('meting.mikus.ink'))",
  )
  source = source.replace(
    "if (event.target instanceof Element && event.target.closest('#playBtn'))\n      return",
    `if (event.target instanceof Element) {
      const originalPlayButton = event.target.closest(
        '#playBtn, [class*="play-circle-fill"], [class*="pause-circle-fill"]',
      )
      if (originalPlayButton)
        return
    }`,
  )
  source = source.replace(
    'if (!playingStore.playlists.some(playlist => playlist.playlist.length > 0)) {',
    cachedPlaylistCondition,
  )
  const backgroundPlaylistFetch = `${cachedPlaylistCondition}
  // Discard an empty or obsolete list persisted by a previous request.
  playingStore.playlists.splice(0)
  const requests = props.playlistURLs.map(async (url, index) => {
    const playlist = new PlayList(url.url, url.name, index)
    playingStore.playlists.push(playlist)
    playlist.parserURL()
    await playlist.fetchPlaylist()
  })
  Promise.allSettled(requests).then((results) => {
    results.forEach((result) => {
      if (result.status === 'rejected')
        console.error('Nyx playlist fetch failed:', result.reason)
    })
    // Start from the first song as soon as the remote playlist is ready.
    if (!startFirstTrack())
      playingStore.currentId++
  })
}`
  const blockingPlaylistPattern = /if \(playingStore\.playlists\.length === 0\) \{\r?\n  await Promise\.all\(props\.playlistURLs\.map\(async \(url, index\) => \{\r?\n    const playlist = new PlayList\(url\.url, url\.name, index\)\r?\n    playingStore\.playlists\.push\(playlist\)\r?\n    playlist\.parserURL\(\)\r?\n    await playlist\.fetchPlaylist\(\)\r?\n  \}\)\)\r?\n\}/
  if (blockingPlaylistPattern.test(source)) {
    source = source.replace(blockingPlaylistPattern, backgroundPlaylistFetch)
    fs.writeFileSync(nyxAudioPlayer, source)
  }
  else if (source.includes('if (playingStore.playlists.length === 0) {\n  const requests =')) {
    source = source.replace(
      'if (playingStore.playlists.length === 0) {\n  const requests =',
      'if (!playingStore.playlists.some(playlist => playlist.playlist.length > 0)) {\n  // Discard an empty list persisted by a previous interrupted request.\n  playingStore.playlists.splice(0)\n  const requests ='
    )
    fs.writeFileSync(nyxAudioPlayer, source)
  }

  const oldPlaylistReady = `  Promise.allSettled(requests).then(() => {
    // Refresh computed song data after the remote playlists settle.
    playingStore.currentId++
  })`
  const autoplayFirstWhenReady = `  Promise.allSettled(requests).then((results) => {
    results.forEach((result) => {
      if (result.status === 'rejected')
        console.error('Nyx playlist fetch failed:', result.reason)
    })
    // Start from the first song as soon as the remote playlist is ready.
    if (!startFirstTrack())
      playingStore.currentId++
  })`
  if (source.includes(oldPlaylistReady)) {
    source = source.replace(oldPlaylistReady, autoplayFirstWhenReady)
    fs.writeFileSync(nyxAudioPlayer, source)
  }
  source = source.replace(
    'Promise.allSettled(requests).then(() => {\n    // Start from the first song',
    `Promise.allSettled(requests).then((results) => {
    results.forEach((result) => {
      if (result.status === 'rejected')
        console.error('Nyx playlist fetch failed:', result.reason)
    })
    // Start from the first song`,
  )

  const originalPlaybackWatcher = `onMounted(() => {
  watch(() => playingStore.currentId, async () => {
    if (audioPlayer.value !== null) {
      if (playingStore.playing) {
        if (playingStore.mode === 'loop') {
          audioPlayer.value.loop = true
        }
        await audioPlayer.value.play()
      }
      else {
        audioPlayer.value.pause()
      }
    }
  })
})`
  const autoplayWatcher = `let resumeOnFirstGesture: ((event: Event) => void) | undefined
let userGestureUnlocked = false
let volumeFadeFrame: number | undefined
const volumeFadeDuration = 1600
let initialTrackSelected = false
const gestureEvents = ['pointerdown', 'touchstart', 'keydown', 'click'] as const

function fadeVolume(target: number, done?: () => void) {
  const player = audioPlayer.value
  if (!player)
    return
  if (volumeFadeFrame !== undefined)
    cancelAnimationFrame(volumeFadeFrame)
  const initialVolume = player.volume
  const startedAt = performance.now()
  const step = (now: number) => {
    const progress = Math.min((now - startedAt) / volumeFadeDuration, 1)
    // Smoothstep keeps both ends of the fade soft instead of abrupt.
    const eased = progress * progress * (3 - 2 * progress)
    player.volume = initialVolume + (target - initialVolume) * eased
    if (progress < 1)
      volumeFadeFrame = requestAnimationFrame(step)
    else {
      volumeFadeFrame = undefined
      done?.()
    }
  }
  volumeFadeFrame = requestAnimationFrame(step)
}

function preferredVolume() {
  const value = Number(playingStore.volume)
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.15
}

function startFirstTrack() {
  const firstPlaylist = playingStore.playlists[0]
  if (!firstPlaylist?.playlist?.length)
    return false
  // A new document always begins with the first song. Seamless navigation
  // keeps this player instance alive, so later page changes do not reset it.
  if (!initialTrackSelected) {
    playingStore.currentPlaylistIndex = 0
    firstPlaylist.index = 0
    playingStore.currentTime = 0
    playingStore.lastPage = window.location.pathname
    if (audioPlayer.value)
      audioPlayer.value.currentTime = 0
    initialTrackSelected = true
  }
  playingStore.playing = true
  playingStore.currentId++
  return true
}

function disarmFirstGesturePlayback() {
  if (!resumeOnFirstGesture)
    return
  gestureEvents.forEach(event => window.removeEventListener(event, resumeOnFirstGesture!, true))
  resumeOnFirstGesture = undefined
}

function armFirstGesturePlayback() {
  if (resumeOnFirstGesture)
    return
  resumeOnFirstGesture = (event: Event) => {
    disarmFirstGesturePlayback()
    userGestureUnlocked = true
    // The theme play button toggles the store during bubbling. Let its own
    // handler own that click, otherwise this capture handler starts and the
    // button immediately pauses the same track.
    if (event.target instanceof Element) {
      const originalPlayButton = event.target.closest(
        '#playBtn, [class*="play-circle-fill"], [class*="pause-circle-fill"]',
      )
      if (originalPlayButton)
        return
    }
    if (!playingStore.currentSong)
      startFirstTrack()
    playingStore.playing = true
    syncPlayback()
  }
  gestureEvents.forEach(event => window.addEventListener(event, resumeOnFirstGesture!, { once: true, capture: true, passive: true }))
}

async function syncPlayback() {
  const player = audioPlayer.value
  if (player === null)
    return
  if (!playingStore.playing) {
    fadeVolume(0, () => {
      if (!playingStore.playing)
        player.pause()
    })
    return
  }
  if (playingStore.mode === 'loop')
    player.loop = true
  const starting = player.paused
  try {
    if (!userGestureUnlocked)
      armFirstGesturePlayback()
    if (starting) {
      // Muted media is allowed to start automatically by modern browsers.
      // Once a real gesture unlocks media, start audibly inside that gesture.
      player.volume = 0
      player.muted = userGestureUnlocked ? !playingStore.enableVolume || preferredVolume() === 0 : true
    }
    await player.play()
    if (userGestureUnlocked) {
      disarmFirstGesturePlayback()
      player.muted = !playingStore.enableVolume || preferredVolume() === 0
      fadeVolume(preferredVolume())
      return
    }
    requestAnimationFrame(() => {
      if (!playingStore.playing)
        return
      player.muted = !playingStore.enableVolume || preferredVolume() === 0
      fadeVolume(preferredVolume())
      window.setTimeout(() => {
        // Safari may pause when a muted autoplay is programmatically unmuted.
        if (playingStore.playing && player.paused) {
          playingStore.playing = false
          armFirstGesturePlayback()
        }
      }, 250)
    })
  }
  catch {
    player.muted = !playingStore.enableVolume
    playingStore.playing = false
    armFirstGesturePlayback()
  }
}

onMounted(() => {
  watch(() => playingStore.currentId, syncPlayback)
  watch(() => playingStore.volume, () => {
    const player = audioPlayer.value
    if (!player || !playingStore.playing)
      return
    if (volumeFadeFrame !== undefined) {
      cancelAnimationFrame(volumeFadeFrame)
      volumeFadeFrame = undefined
    }
    player.volume = preferredVolume()
    player.muted = !playingStore.enableVolume || preferredVolume() === 0
  })
  // Keep a capture-phase fallback ready even if the autoplay promise settles
  // differently across browsers.
  armFirstGesturePlayback()
  if (audioPlayer.value)
    audioPlayer.value.volume = 0
  startFirstTrack()
})`
  const customizedPlaybackPattern = /let (?:waitingForFirstGesture = false|resumeOnFirstGesture:[\s\S]*?undefined)[\s\S]*?onMounted\(\(\) => \{[\s\S]*?\n\}\)(?=\r?\n\r?\nif \(!playingStore\.playlists)/
  if (source.includes(originalPlaybackWatcher)) {
    source = source.replace(originalPlaybackWatcher, autoplayWatcher)
    fs.writeFileSync(nyxAudioPlayer, source)
  }
  else if (customizedPlaybackPattern.test(source)) {
    source = source.replace(customizedPlaybackPattern, autoplayWatcher)
    fs.writeFileSync(nyxAudioPlayer, source)
  }
  else {
    const playbackWatcherPattern = /onMounted\(\(\) => \{\r?\n  watch\(\(\) => playingStore\.currentId, async \(\) => \{\r?\n    if \(audioPlayer\.value !== null\) \{\r?\n      if \(playingStore\.playing\) \{\r?\n        if \(playingStore\.mode === 'loop'\) \{\r?\n          audioPlayer\.value\.loop = true\r?\n        \}\r?\n        await audioPlayer\.value\.play\(\)\r?\n      \}\r?\n      else \{\r?\n        audioPlayer\.value\.pause\(\)\r?\n      \}\r?\n    \}\r?\n  \}\)\r?\n\}\)/
    if (playbackWatcherPattern.test(source)) {
      source = source.replace(playbackWatcherPattern, autoplayWatcher)
      fs.writeFileSync(nyxAudioPlayer, source)
    }
  }
  source = source.replace(
    /function restoreSavedPosition\(player: HTMLAudioElement\) \{[\s\S]*?\n\}\r?\n\r?\n(?=function startFirstTrack)/,
    '',
  )
  if (!source.includes('function preferredVolume()')) {
    source = source.replace(
      'function startFirstTrack() {',
      `function preferredVolume() {
  const value = Number(playingStore.volume)
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.15
}

function startFirstTrack() {`,
    )
  }
  source = source
    .replace(/fadeVolume\(1\)/g, 'fadeVolume(preferredVolume())')
    .replace(/player\.muted = userGestureUnlocked \? !playingStore\.enableVolume : true/g, 'player.muted = userGestureUnlocked ? !playingStore.enableVolume || preferredVolume() === 0 : true')
    .replace(/player\.muted = !playingStore\.enableVolume(?! \|\| preferredVolume)/g, 'player.muted = !playingStore.enableVolume || preferredVolume() === 0')
  if (!source.includes('watch(() => playingStore.volume')) {
    source = source.replace(
      '  watch(() => playingStore.currentId, syncPlayback)',
      `  watch(() => playingStore.currentId, syncPlayback)
  watch(() => playingStore.volume, () => {
    const player = audioPlayer.value
    if (!player || !playingStore.playing)
      return
    if (volumeFadeFrame !== undefined) {
      cancelAnimationFrame(volumeFadeFrame)
      volumeFadeFrame = undefined
    }
    player.volume = preferredVolume()
    player.muted = !playingStore.enableVolume || preferredVolume() === 0
  })`,
    )
  }
  if (!source.includes('let initialTrackSelected = false')) {
    source = source.replace(
      'const volumeFadeDuration = 1600',
      'const volumeFadeDuration = 1600\nlet initialTrackSelected = false',
    )
  }
  source = source.replace(
    /function startFirstTrack\(\) \{[\s\S]*?\n\}(?=\r?\n\r?\nfunction disarmFirstGesturePlayback)/,
    `function startFirstTrack() {
  const firstPlaylist = playingStore.playlists[0]
  if (!firstPlaylist?.playlist?.length)
    return false
  // A new document always begins with the first song. Seamless navigation
  // keeps this player instance alive, so later page changes do not reset it.
  if (!initialTrackSelected) {
    playingStore.currentPlaylistIndex = 0
    firstPlaylist.index = 0
    playingStore.currentTime = 0
    playingStore.lastPage = window.location.pathname
    if (audioPlayer.value)
      audioPlayer.value.currentTime = 0
    initialTrackSelected = true
  }
  playingStore.playing = true
  playingStore.currentId++
  return true
}`,
  )
  if (source !== originalNyxSource)
    fs.writeFileSync(nyxAudioPlayer, source)
}

if (fs.existsSync(nyxMetingConstants)) {
  let source = fs.readFileSync(nyxMetingConstants, 'utf8')
  source = source.replace(
    /https:\/\/(?:api\.injahow\.cn\/meting\/|meting\.mikus\.ink\/api)/,
    "https://meting-api-ten.vercel.app/api",
  )
  fs.writeFileSync(nyxMetingConstants, source)
}

if (fs.existsSync(nyxPlaylist)) {
  let source = fs.readFileSync(nyxPlaylist, 'utf8')
  source = source.replace(
    'const res = await fetch(`${METING_API}?type=${this.accessibleURL.type}&id=${this.accessibleURL.id}&server=${this.accessibleURL.provider}`)\n    const songs',
    `const res = await fetch(\`${'${METING_API}'}?type=${'${this.accessibleURL.type}'}&id=${'${this.accessibleURL.id}'}&server=${'${this.accessibleURL.provider}'}\`)
    const contentType = res.headers.get('content-type') ?? ''
    if (!res.ok || !contentType.includes('application/json'))
      throw new Error(\`Meting playlist request failed: ${'${res.status}'} ${'${contentType}'}\`)
    const songs`,
  )
  source = source.replace(
    'this.playlist = await res.json() as APIResponse[]',
    `const songs = await res.json() as Array<APIResponse & { title?: string, author?: string }>
    this.playlist = songs.map(song => ({
      ...song,
      name: song.name ?? song.title ?? '',
      artist: song.artist ?? song.author ?? '',
    }))`,
  )
  const simplePlaylistRequest = /    const res = await fetch\(`\$\{METING_API\}[^\n]+\n(?:    .*\n)*?    this\.playlist = songs\.map\(song => \(\{\n      \.\.\.song,\n      name: song\.name \?\? song\.title \?\? '',\n      artist: song\.artist \?\? song\.author \?\? '',\n    \}\)\)/
  if (!source.includes('const maxAttempts = 3')) {
    source = source.replace(simplePlaylistRequest, `    const endpoint = \`${'${METING_API}'}?type=${'${this.accessibleURL.type}'}&id=${'${this.accessibleURL.id}'}&server=${'${this.accessibleURL.provider}'}\`
    const maxAttempts = 3
    let lastError: unknown
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = typeof fetch === 'function'
          ? await fetch(endpoint).then(async res => ({
              ok: res.ok,
              status: res.status,
              contentType: res.headers.get('content-type') ?? '',
              data: await res.json(),
            }))
          : await new Promise<{ ok: boolean, status: number, contentType: string, data: unknown }>((resolve, reject) => {
              const xhr = new XMLHttpRequest()
              xhr.open('GET', endpoint)
              xhr.timeout = 20000
              xhr.onload = () => {
                try {
                  resolve({
                    ok: xhr.status >= 200 && xhr.status < 300,
                    status: xhr.status,
                    contentType: xhr.getResponseHeader('content-type') ?? '',
                    data: JSON.parse(xhr.responseText),
                  })
                }
                catch (error) {
                  reject(error)
                }
              }
              xhr.onerror = () => reject(new Error('Meting playlist network error'))
              xhr.ontimeout = () => reject(new Error('Meting playlist request timed out'))
              xhr.send()
            })
        if (!response.ok || !response.contentType.includes('application/json'))
          throw new Error(\`Meting playlist request failed: ${'${response.status}'} ${'${response.contentType}'}\`)
        const songs = response.data as Array<APIResponse & { title?: string, author?: string }>
        this.playlist = songs.map(song => ({
          ...song,
          name: song.name ?? song.title ?? '',
          artist: song.artist ?? song.author ?? '',
        }))
        return
      }
      catch (error) {
        lastError = error
        if (attempt < maxAttempts)
          await new Promise(resolve => setTimeout(resolve, 750 * attempt))
      }
    }
    throw lastError`)
  }
  source = source
    .replace(
      /    const requestEndpoints = this\.accessibleURL\.provider[\s\S]*?    const maxAttempts = 3/,
      '    const maxAttempts = 3',
    )
    .replace(
      '        const requestEndpoint = requestEndpoints[Math.min(attempt - 1, requestEndpoints.length - 1)]\n',
      '',
    )
    .replace('await fetch(requestEndpoint)', 'await fetch(endpoint)')
    .replace("xhr.open('GET', requestEndpoint)", "xhr.open('GET', endpoint)")

  source = source.replace(
    /    \/\/ CODEX_STATIC_PLAYLIST_START[\s\S]*?    \/\/ CODEX_STATIC_PLAYLIST_END\n/,
    '',
  )
  if (fs.existsSync(nyxPlaylistSnapshot)) {
    const snapshot = JSON.parse(fs.readFileSync(nyxPlaylistSnapshot, 'utf8'))
    const embeddedPlaylist = JSON.stringify(snapshot)
    source = source.replace(
      '    const endpoint = `${METING_API}?type=${this.accessibleURL.type}&id=${this.accessibleURL.id}&server=${this.accessibleURL.provider}`',
      `    // CODEX_STATIC_PLAYLIST_START
    if (this.accessibleURL.provider === 'netease' && this.accessibleURL.type === 'playlist' && this.accessibleURL.id === '12584824470') {
      const songs = ${embeddedPlaylist} as Array<APIResponse & { title?: string, author?: string }>
      this.playlist = songs.map(song => ({
        ...song,
        name: song.name ?? song.title ?? '',
        artist: song.artist ?? song.author ?? '',
      }))
      return
    }
    // CODEX_STATIC_PLAYLIST_END
    const endpoint = \`${'${METING_API}'}?type=${'${this.accessibleURL.type}'}&id=${'${this.accessibleURL.id}'}&server=${'${this.accessibleURL.provider}'}\``,
    )
  }
  fs.writeFileSync(nyxPlaylist, source)
}

if (fs.existsSync(nyxPresets)) {
  let source = fs.readFileSync(nyxPresets, 'utf8')
  source = source
    .replaceAll("playerBackground: 'alpha(#fdfdfd, 0.7)'", "playerBackground: 'rgba(253, 253, 253, 0.94)'")
    .replaceAll("playerBackground: 'alpha(#22222, 0.7)'", "playerBackground: 'rgba(34, 34, 34, 0.94)'")
    .replaceAll("playListLine: 'alpha(#000, 0.1)'", "playListLine: 'rgba(0, 0, 0, 0.1)'")
    .replaceAll("playListLine: 'alpha(#fff, 0.1)'", "playListLine: 'rgba(255, 255, 255, 0.1)'")
  fs.writeFileSync(nyxPresets, source)
}

if (fs.existsSync(nyxLyric)) {
  let source = fs.readFileSync(nyxLyric, 'utf8')
  source = source.replace(
    'const timePattern = /\\[(\\d{2}):(\\d{2})(?:\\.(\\d{2,3}))?\\]/',
    'const timePattern = /\\[(\\d{2}):(\\d{2})(?:\\.(\\d{1,3}))?\\]/',
  )
  source = source.replace(
    "Number.parseInt(match[3]) / (match[3].length === 2 ? 100 : 1000)",
    "Number.parseInt(match[3]) / 10 ** match[3].length",
  )
  source = source.replace(
    "const lines = this.rawContent.split('\\n').filter(Boolean)",
    "const lines = this.rawContent.split('\\n').filter(line => /\\[\\d{2}:\\d{2}(?:\\.\\d{1,3})?\\]/.test(line))",
  )
  fs.writeFileSync(nyxLyric, source)
}

if (fs.existsSync(nyxMusicLyric)) {
  let source = fs.readFileSync(nyxMusicLyric, 'utf8')
  source = source.replace(
    'showLyric.value = lrcRes.value.slice(idx, Math.min(idx + 4, lrcRes.value.length))',
    'showLyric.value = lrcRes.value.slice(idx, Math.min(idx + 1, lrcRes.value.length))',
  )
  if (!source.includes('max-height: 2.5rem')) {
    source = source.replace(
      /\.lrc p\.current \{[\s\S]*?\n\}/,
      `.lrc {
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lrc p.current {
  opacity: 1;
  overflow: hidden;
  height: auto !important;
  max-height: 2.5rem;
  line-height: 1.25rem !important;
}`,
    )
  }
  fs.writeFileSync(nyxMusicLyric, source)
}

if (fs.existsSync(nyxAudioCover)) {
  let source = fs.readFileSync(nyxAudioCover, 'utf8')
  source = source.replace(
    /      <Transition name="blurx" mode="out-in">\r?\n        (<div :key="src"[\s\S]*?<\/div>)\r?\n      <\/Transition>/,
    '      $1',
  )
  source = source
    .replace(/@keyframes blur \{[\s\S]*?\r?\n\}\r?\n\r?\n/, '')
    .replace(/\.blurx-enter-active \{[\s\S]*?\r?\n\}\r?\n\r?\n/, '')
  fs.writeFileSync(nyxAudioCover, source)
}

if (fs.existsSync(nyxMainPlayer)) {
  let source = fs.readFileSync(nyxMainPlayer, 'utf8')
  const modeBlock = /const currentMode = ref<'light' \| 'dark'>\('light'\)[\s\S]*?else \{\n  currentMode\.value = 'light'\n\}/
  source = source.replace(
    modeBlock,
    `const currentMode = ref<'light' | 'dark'>(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

onMounted(() => {
  const syncTheme = () => {
    currentMode.value = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  }
  syncTheme()
  const observer = new MutationObserver(syncTheme)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})`,
  )
  fs.writeFileSync(nyxMainPlayer, source)
}

// ShokaX imports nyx-player's compiled dist entry. Rebuild that entry from the
// patched Vue source instead of editing minified JavaScript by hand.
if (fs.existsSync(nyxAudioPlayer)) {
  // The npm package omits its UnoCSS config. Rebuilding must keep the freshly
  // generated scoped component CSS (its data-v hashes match the new JS), then
  // append only the publisher-built UnoCSS utility tail that contains icon
  // masks, dimensions and positioning helpers.
  const publishedNyxCss = fs.existsSync(nyxPlayerCss)
    ? fs.readFileSync(nyxPlayerCss, 'utf8')
    : undefined
  const unoCssMarker = '*,:before,:after{--un-rotate:'
  const publishedUnoCss = publishedNyxCss?.includes(unoCssMarker)
    ? publishedNyxCss.slice(publishedNyxCss.indexOf(unoCssMarker))
    : undefined
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const nyxBuild = spawnSync(npmCommand, ['run', 'build'], {
    cwd: nyxPlayerRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: 'inherit',
  })
  if (nyxBuild.status !== 0)
    throw new Error(`nyx-player build failed with exit code ${nyxBuild.status}`)
  if (publishedUnoCss) {
    const generatedNyxCss = fs.readFileSync(nyxPlayerCss, 'utf8')
    fs.writeFileSync(nyxPlayerCss, `${generatedNyxCss}\n${publishedUnoCss}`)
  }
}

// Render the initial document in dark mode so there is no white flash before
// the client bundle loads. Migrate the old default once; later manual choices
// made with ShokaX's theme button are still respected.
if (fs.existsSync(mainLayout)) {
  let source = fs.readFileSync(mainLayout, 'utf8')
  source = source.replace(
    "html(lang=page.language?page.language:config.language, style=theme.grayMode ? 'filter: grayscale(1);':'' )",
    "html(lang=page.language?page.language:config.language, data-theme='dark', style=theme.grayMode ? 'filter: grayscale(1);':'' )"
  )
  if (!source.includes("script(src='/js/seamless-nav.js' defer)")) {
    source = source.replace(
      "        != _js('siteInit.js')",
      "        != _js('siteInit.js')\n        script(src='/js/seamless-nav.js' defer)",
    )
  }
  fs.writeFileSync(mainLayout, source)
}

if (fs.existsSync(siteInitSource)) {
  let source = fs.readFileSync(siteInitSource, 'utf8')
  if (!source.includes('__shokaxSiteRefresh')) {
    source = source.replace(
      'const siteInit = async () => {',
      `;(window as any).__shokaxSiteRefresh = siteRefresh

const siteInit = async () => {`,
    )
  }
  fs.writeFileSync(siteInitSource, source)
}

if (fs.existsSync(themeColor)) {
  let source = fs.readFileSync(themeColor, 'utf8')
  const savedTheme = "  const t = localStorage.getItem('theme')"
  const darkDefault = `  const darkDefaultVersion = 'shokax-dark-default-v1'
  if (localStorage.getItem(darkDefaultVersion) !== 'applied') {
    localStorage.setItem('theme', 'dark')
    localStorage.setItem(darkDefaultVersion, 'applied')
  }
  const t = localStorage.getItem('theme')`
  const repeatedDarkDefault = /(?:  const darkDefaultVersion = 'shokax-dark-default-v1'\r?\n  if \(localStorage\.getItem\(darkDefaultVersion\) !== 'applied'\) \{\r?\n    localStorage\.setItem\('theme', 'dark'\)\r?\n    localStorage\.setItem\(darkDefaultVersion, 'applied'\)\r?\n  \}\r?\n)+  const t = localStorage\.getItem\('theme'\)/
  if (repeatedDarkDefault.test(source))
    source = source.replace(repeatedDarkDefault, darkDefault)
  else if (source.includes(savedTheme))
    source = source.replace(savedTheme, darkDefault)
  fs.writeFileSync(themeColor, source)
}

// ShokaX 0.5 expects tag/category collections to be Hexo Query objects.
// Notion pages can expose arrays instead. Normalize the complete Pug statement
// so this patch stays idempotent even when npm runs postinstall repeatedly.
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
    source = source.replace(
      /^(\s*each\s+\w+(?:,\w+)?\s+in\s+).*?\b(post|page)\.(tags|categories).*$/gm,
      (match, prefix, name, collection) => `${prefix}(typeof ${name}.${collection}.toArray === 'function' ? ${name}.${collection}.toArray() : ${name}.${collection})`,
    )
    if (file === head) {
      source = source.replace(
        /^\s*- var keywords='',tmp=.*$/m,
        "- var keywords='',tmp=page?.tags ? (typeof page.tags.toArray === 'function' ? page.tags.toArray() : page.tags) : undefined",
      )
    }
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
