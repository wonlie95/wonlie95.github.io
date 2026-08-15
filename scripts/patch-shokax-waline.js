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
const nyxAudioPlayer = path.join(
  __dirname,
  '..',
  'node_modules',
  'nyx-player',
  'src',
  'components',
  'AudioPlayer.vue'
)
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

// Nyx Player 0.1.1 awaits the remote Meting request in <script setup>.
// Vue therefore keeps the whole player inside Suspense until that third-party
// endpoint responds, delaying the show-button listener as well.  Fetch the
// playlist in the background so the shell opens immediately on every page.
if (fs.existsSync(nyxAudioPlayer)) {
  let source = fs.readFileSync(nyxAudioPlayer, 'utf8')
  const backgroundPlaylistFetch = `if (!playingStore.playlists.some(playlist => playlist.playlist.length > 0)) {
  // Discard an empty list persisted by a previous interrupted request.
  playingStore.playlists.splice(0)
  const requests = props.playlistURLs.map(async (url, index) => {
    const playlist = new PlayList(url.url, url.name, index)
    playingStore.playlists.push(playlist)
    playlist.parserURL()
    await playlist.fetchPlaylist()
  })
  Promise.allSettled(requests).then(() => {
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
  const autoplayFirstWhenReady = `  Promise.allSettled(requests).then(() => {
    // Start from the first song as soon as the remote playlist is ready.
    if (!startFirstTrack())
      playingStore.currentId++
  })`
  if (source.includes(oldPlaylistReady)) {
    source = source.replace(oldPlaylistReady, autoplayFirstWhenReady)
    fs.writeFileSync(nyxAudioPlayer, source)
  }

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
  const autoplayWatcher = `let resumeOnFirstGesture: (() => void) | undefined
let userGestureUnlocked = false
let volumeFadeFrame: number | undefined
const volumeFadeDuration = 1600
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

function startFirstTrack() {
  const firstPlaylist = playingStore.playlists[0]
  if (!firstPlaylist?.playlist?.length)
    return false
  playingStore.currentPlaylistIndex = 0
  firstPlaylist.index = 0
  playingStore.currentTime = 0
  if (audioPlayer.value)
    audioPlayer.value.currentTime = 0
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
  resumeOnFirstGesture = () => {
    disarmFirstGesturePlayback()
    userGestureUnlocked = true
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
      player.muted = userGestureUnlocked ? !playingStore.enableVolume : true
    }
    await player.play()
    if (userGestureUnlocked) {
      disarmFirstGesturePlayback()
      player.muted = !playingStore.enableVolume
      fadeVolume(1)
      return
    }
    requestAnimationFrame(() => {
      if (!playingStore.playing)
        return
      player.muted = !playingStore.enableVolume
      fadeVolume(1)
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
  fs.writeFileSync(mainLayout, source)
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
