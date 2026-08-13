'use strict'

// ShokaX writes its browser bundle to this ignored, generated directory.
// Remove it before each run so changes to the theme patch are recompiled.
const fs = require('fs')
const path = require('path')

const cache = path.join(__dirname, '..', 'shokaxTemp')
if (fs.existsSync(cache)) fs.rmSync(cache, { recursive: true, force: true })
