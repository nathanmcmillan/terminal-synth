/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

let CANVAS = null

let WIDTH = 0
let HEIGHT = 0

let TERMINAL = null

const MENU = ['FILE', 'EDIT', 'TRACK', 'ABOUT']

const FILE_OPTIONS = ['LOCAL SAVE', 'LOCAL LOAD', 'OPEN FILE', 'EXPORT']
const EDIT_OPTIONS = ['NAME', 'SIGNATURE', 'TEMPO']
const TRACK_OPTIONS = [
  'NAME',
  'SYNTHESIZER',
  'TUNING',
  'COPY',
  'COPY NOTES',
  'COPY SYNTHESIZER',
  'MOVE UP',
  'MOVE DOWN',
  'CLEAR NOTES',
  'DELETE',
]
const ABOUT_OPTIONS = [
  'F - FILE',
  'E - EDIT',
  'T - TRACK',
  'A - ABOUT',
  '------------------------',
  '^ - GO TO START OF TRACK',
  '$ - GO TO END OF TRACK',
  'LEFT  | H - MOVE LEFT',
  'RIGHT | L - MOVE RIGHT',
  'UP    | K - MOVE UP',
  'DOWN  | J - MOVE DOWN',
  '------------------------',
  'P   - PLAY MUSIC',
  'N   - PLAY NOTE',
  '0-9 - SET NOTE',
]

let CONTEXT = null

let MUSIC = null

const STATUS_DEFAULT = 0
const STATUS_FILE = 1
const STATUS_EDIT = 2
const STATUS_TRACK = 3
const STATUS_ABOUT = 4

let STATUS = STATUS_DEFAULT

let EDIT_TRACK = 0
let EDIT_POSITION = 0

let DIALOG_LINE = 0
let DIALOG_OPTIONS = null

let NAME_BOX = null

const PITCH_ROWS = 3
const NOTE_START = 4
const NOTE_ROWS = PITCH_ROWS + 1

const MUSIC_SLICE = 100

class Synth {
  constructor() {
    this.name = null
    this.parameters = new Array(PARAMETER_COUNT).fill(0)
    this.tuning = 0
    this.notes = []
    this.c = 0
    this.r = 2
    this.save = 0
    this.i = 0
  }
}

class Music {
  constructor() {
    this.name = null
    this.root = null
    this.mode = null
    this.scale = null
    this.tempo = 120
    this.origin = 0
    this.time = 0
    this.paused = 0
    this.start = 0
    this.to = 0
    this.length = 0
    this.done = 0
    this.sounds = []
    this.tracks = []
  }
}

function defaultMusic() {
  const music = new Music()
  music.name = 'UNTITLED'
  music.root = 'C'
  music.mode = 'MAJOR'
  music.scale = musicScale(music.root, music.mode)

  const sine = new Synth()
  {
    sine.name = 'SINE'
    sine.notes[0] = 40
    sine.notes[1] = 9
    sine.notes[2] = 0
    sine.notes[3] = 40
    sine.notes[4] = -1
    const parameters = sine.parameters
    parameters[WAVE] = 1
    parameters[ATTACK] = 1
    parameters[DECAY] = 1
    parameters[VOLUME] = 1.0
    parameters[SUSTAIN] = 1
    parameters[FREQ] = 40
    parameters[LENGTH] = 1000
  }
  music.tracks[0] = sine

  const triangle = new Synth()
  {
    triangle.name = 'TRIANGLE'
    triangle.notes[0] = 0
    const parameters = triangle.parameters
    parameters[WAVE] = 4
    parameters[ATTACK] = 1
    parameters[DECAY] = 1
    parameters[VOLUME] = 2.0
    parameters[SUSTAIN] = 1
    parameters[FREQ] = 40
    parameters[LENGTH] = 1000
  }
  music.tracks[1] = triangle

  return music
}

function newMusic(content) {
  const wad = parseWad(content)

  const music = new Music()
  music.name = wad.get('music')
  music.signature = wad.get('signature')

  music.tracks = []
  for (const data of wad.get('synthesizers')) {
    const name = data.get('name')
    const parameters = data.get('parameters')
    const synth = new Synth()
    synth.name = name
    readSynthParameters(synth.parameters, parameters)
    synth.tuning = parseInt(data.get('tuning'))
    music.tracks.push(synth)
  }

  for (const section of wad.get('sections')) {
    const _tempo = parseInt(section.get('tempo'))
    for (const data of section.get('synthesizers')) {
      for (const note of data.get('notes')) {
        const a = parseInt(note[0])
        const b = parseInt(note[1])
        const c = parseInt(note[2])
        const d = parseInt(note[3])
        synth.notes.push([a, b, c, d])
      }
    }
  }

  music.length = musicCalcTiming(music.tempo, music.tracks)
}

function _updateMusic(music) {
  const now = Date.now()

  if (now >= music.done) {
    music.play()
    return
  }

  if (now < music.time) return

  const origin = music.origin
  const start = music.start
  const end = music.to

  const tracks = music.tracks
  const size = tracks.length
  for (let t = 0; t < size; t++) {
    const track = tracks[t]
    const notes = track.notes
    const count = notes.length
    for (let n = track.i; n < count; n++) {
      const note = notes[n]
      const current = note[NOTE_START]
      if (current < start) continue
      else if (current >= end) {
        track.i = n
        break
      }
      const when = origin + current / 1000.0
      musicPlayNote(music.tempo, track, note, when, music.sounds)
    }
  }

  music.time += MUSIC_SLICE
  music.start = music.to
  music.to += MUSIC_SLICE
}

function playMusic(music) {
  for (const sound of music.sounds) sound.stop()
  music.sounds.length = 0

  const tracks = music.tracks
  const size = tracks.length
  for (let t = 0; t < size; t++) tracks[t].i = 0

  music.time = Date.now()
  music.start = 0
  music.to = music.start + MUSIC_SLICE * 2
  music.origin = synthTime() - music.start / 1000.0
  music.done = music.time + music.length
  music.update()
}

function _pauseMusic(music) {
  for (const sound of music.sounds) sound.stop()
  music.sounds.length = 0
  music.paused = Date.now()
}

function _resumeMusic(music) {
  const difference = Date.now() - music.paused
  music.time += difference
  music.origin += difference / 1000.0
  music.done += difference
}

function main() {
  CANVAS = document.getElementById('canvas')
  CANVAS.style.display = 'block'

  MUSIC = defaultMusic()

  size(20, 20)
  render()
  resize()

  document.onkeydown = down

  window.onresize = resize
}

function down(down) {
  const code = down.key
  if (NAME_BOX !== null) {
    if (code === 'Enter') {
      if (STATUS === STATUS_EDIT) {
        const option = DIALOG_OPTIONS[DIALOG_LINE]
        if (option === 'NAME') {
          STATUS = STATUS_DEFAULT
          if (NAME_BOX.length === 0) MUSIC.name = 'UNTITLED'
          else MUSIC.name = NAME_BOX
        } else if (option === 'TEMPO') {
          if (NAME_BOX.length === 0) {
            STATUS = STATUS_DEFAULT
          } else {
            try {
              const number = parseInt(NAME_BOX)
              if (Number.isNaN(number) || number < 1 || number > 999) return
              STATUS = STATUS_DEFAULT
              MUSIC.tempo = number
            } catch (_e) {
              return
            }
          }
        }
      } else if (STATUS === STATUS_TRACK) {
        STATUS = STATUS_DEFAULT
        const track = MUSIC.tracks[EDIT_TRACK]
        if (NAME_BOX.length === 0) track.name = 'UNTITLED'
        else MUSIC.tracks[EDIT_TRACK].name = NAME_BOX
      }
      NAME_BOX = null
      render()
    } else if (code === 'Backspace') {
      if (NAME_BOX.length > 0) {
        NAME_BOX = NAME_BOX.slice(0, -1)
        render()
      }
    } else if (NAME_BOX.length === 8) {
    } else if (code.length > 1) {
    } else {
      const value = code.charCodeAt(0)
      if (value >= 48 && value <= 57) {
        NAME_BOX += code
        render()
      } else if (value >= 97 && value <= 122) {
        NAME_BOX += code.toUpperCase()
        render()
      }
    }
    return
  }
  switch (code) {
    case 'Enter':
      if (STATUS === STATUS_FILE) {
        STATUS = STATUS_DEFAULT
        const option = DIALOG_OPTIONS[DIALOG_LINE]
        if (option === 'LOCAL SAVE') fileSave()
        if (option === 'LOCAL LOAD') fileLoad()
        else if (option === 'OPEN FILE') fileRead()
        else if (option === 'EXPORT') fileExport()
        break
      } else if (STATUS === STATUS_EDIT) {
        const option = DIALOG_OPTIONS[DIALOG_LINE]
        if (option === 'NAME') NAME_BOX = MUSIC.name
        else if (option === 'TEMPO') NAME_BOX = '' + MUSIC.tempo
      } else if (STATUS === STATUS_TRACK) {
        const option = DIALOG_OPTIONS[DIALOG_LINE]
        if (option === 'NAME') {
          NAME_BOX = MUSIC.tracks[EDIT_TRACK].name
        } else if (option === 'COPY') {
          STATUS = STATUS_DEFAULT
          const track = MUSIC.tracks[EDIT_TRACK]
          const copy = new Synth()
          copy.name = track.name
          for (let i = 0; i < track.notes.length; i++) copy.notes[i] = track.notes[i]
          for (let i = 0; i < track.parameters.length; i++) copy.parameters[i] = track.parameters[i]
          if (EDIT_TRACK === MUSIC.tracks.length - 1) {
            MUSIC.tracks.push(copy)
          } else {
            MUSIC.tracks.push(null)
            EDIT_TRACK++
            for (let c = MUSIC.tracks.length - 1; c > EDIT_TRACK; c--) {
              MUSIC.tracks[c] = MUSIC.tracks[c - 1]
            }
            MUSIC.tracks[EDIT_TRACK] = copy
          }
        } else if (option === 'MOVE UP') {
          if (EDIT_TRACK === 0) return
          STATUS = STATUS_DEFAULT
          const track = MUSIC.tracks[EDIT_TRACK]
          EDIT_TRACK--
          const swap = MUSIC.tracks[EDIT_TRACK]
          MUSIC.tracks[EDIT_TRACK] = track
          MUSIC.tracks[EDIT_TRACK + 1] = swap
        } else if (option === 'MOVE DOWN') {
          if (EDIT_TRACK === MUSIC.tracks.length - 1) return
          STATUS = STATUS_DEFAULT
          const track = MUSIC.tracks[EDIT_TRACK]
          EDIT_TRACK++
          const swap = MUSIC.tracks[EDIT_TRACK]
          MUSIC.tracks[EDIT_TRACK] = track
          MUSIC.tracks[EDIT_TRACK - 1] = swap
        } else if (option === 'CLEAR NOTES') {
          STATUS = STATUS_DEFAULT
          const track = MUSIC.tracks[EDIT_TRACK]
          for (let i = 0; i < track.notes.length; i++) track.notes[i] = 0
        } else if (option === 'DELETE') {
          if (MUSIC.tracks.length === 1) return
          STATUS = STATUS_DEFAULT
          MUSIC.tracks.splice(EDIT_TRACK, 1)
        }
      }
      break
    case 'Escape':
      STATUS = STATUS_DEFAULT
      break
    case 'f':
      if (STATUS === STATUS_FILE) {
        STATUS = STATUS_DEFAULT
      } else {
        DIALOG_LINE = 0
        DIALOG_OPTIONS = FILE_OPTIONS
        STATUS = STATUS_FILE
      }
      break
    case 'e':
      if (STATUS === STATUS_EDIT) {
        STATUS = STATUS_DEFAULT
      } else {
        DIALOG_LINE = 0
        DIALOG_OPTIONS = EDIT_OPTIONS
        STATUS = STATUS_EDIT
      }
      break
    case 't':
      if (STATUS === STATUS_TRACK) {
        STATUS = STATUS_DEFAULT
      } else {
        DIALOG_LINE = 0
        DIALOG_OPTIONS = TRACK_OPTIONS
        STATUS = STATUS_TRACK
      }
      break
    case 'a':
      if (STATUS === STATUS_ABOUT) {
        STATUS = STATUS_DEFAULT
      } else {
        DIALOG_LINE = 0
        DIALOG_OPTIONS = ABOUT_OPTIONS
        STATUS = STATUS_ABOUT
      }
      break
    case 'p':
    case ' ':
      playMusic(MUSIC)
      return
    case 'n': {
      const track = MUSIC.tracks[EDIT_TRACK]
      const note = track.notes[EDIT_POSITION]
      if (note <= 0) return
      let duration = 3
      for (let n = EDIT_POSITION + 1; n < track.notes.length; n++) {
        if (track.notes[n] === -1) duration--
        else if (track.notes[n] === -2) duration++
        else break
      }
      track.parameters[FREQ] = note + track.tuning
      track.parameters[LENGTH] = musicNoteDuration(MUSIC.tempo, duration)
      playSynth(track.parameters)
      return
    }
    case 'k':
    case 'ArrowUp': {
      if (STATUS !== STATUS_DEFAULT) {
        if (DIALOG_LINE > 0) DIALOG_LINE--
      } else {
        if (EDIT_TRACK > 0) EDIT_TRACK--
        const s = MUSIC.tracks[EDIT_TRACK]
        while (EDIT_POSITION >= s.notes.length) s.notes.push(0)
      }
      break
    }
    case 'j':
    case 'ArrowDown': {
      if (STATUS !== STATUS_DEFAULT) {
        if (DIALOG_LINE < DIALOG_OPTIONS.length - 1) DIALOG_LINE++
      } else {
        if (EDIT_TRACK < MUSIC.tracks.length - 1) EDIT_TRACK++
        const s = MUSIC.tracks[EDIT_TRACK]
        while (EDIT_POSITION >= s.notes.length) s.notes.push(0)
      }
      break
    }
    case 'h':
    case 'ArrowLeft': {
      const s = MUSIC.tracks[EDIT_TRACK]
      if (EDIT_POSITION === s.notes.length - 1) {
        let empty = true
        for (let i = 0; i < MUSIC.tracks.length; i++) {
          const notes = MUSIC.tracks[i].notes
          if (EDIT_POSITION === notes.length - 1) {
            if (notes[EDIT_POSITION] !== 0) {
              empty = false
              break
            }
          }
        }
        if (empty) {
          for (let i = 0; i < MUSIC.tracks.length; i++) {
            const notes = MUSIC.tracks[i].notes
            if (EDIT_POSITION === notes.length - 1) {
              notes.pop()
            }
          }
        }
      }
      if (EDIT_POSITION > 0) EDIT_POSITION--
      break
    }
    case 'l':
    case 'ArrowRight': {
      EDIT_POSITION++
      const s = MUSIC.tracks[EDIT_TRACK]
      while (EDIT_POSITION >= s.notes.length) s.notes.push(0)
      break
    }
    case '+': {
      const s = MUSIC.tracks[EDIT_TRACK]
      s.notes[EDIT_POSITION] = -1
      break
    }
    case '%': {
      const s = MUSIC.tracks[EDIT_TRACK]
      s.notes[EDIT_POSITION] = -2
      break
    }
    case '0':
    case '1':
    case '2':
    case '3':
    case '4':
    case '5':
    case '6':
    case '7':
    case '8':
    case '9': {
      const number = parseInt(code)
      const s = MUSIC.tracks[EDIT_TRACK]
      const current = s.notes[EDIT_POSITION]
      s.notes[EDIT_POSITION] = current < 1 ? number : current >= 10 ? number : current * 10 + number
      break
    }
    case '^':
      EDIT_POSITION = 0
      break
    case '$':
      EDIT_POSITION = MUSIC.tracks[EDIT_TRACK].notes.length - 1
      break
    default:
      return
  }
  render()
}

function fileRead() {
  const button = document.createElement('input')
  button.type = 'file'
  button.onchange = (e) => {
    const file = e.target.files[0]
    console.info(file)
    const reader = new FileReader()
    reader.readAsText(file, 'utf-8')
    reader.onload = (event) => {
      const content = event.target.result
      console.log('Importing:', content)
      MUSIC = newMusic(content)
    }
  }
  button.click()
}

function fileExport() {
  const content = musicExport(MUSIC)
  const download = document.createElement('a')
  download.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content)
  download.download = MUSIC.name + '.wad'
  download.click()
}

function fileSave() {
  const content = musicExport(MUSIC)
  console.info('Saving', content)
  localStorage.setItem('music', content)
}

function fileLoad() {
  const content = localStorage.getItem('music')
  console.info('Loading:', content)
  MUSIC = newMusic(content)
}

function _put(x, y, c) {
  TERMINAL[y * WIDTH + x] = c
}

function text(x, y, text) {
  const line = y * WIDTH
  for (let c = 0; c < text.length; c++) {
    TERMINAL[line + x + c] = text[c]
  }
}

function sptext(x, y, text) {
  const line = y * WIDTH
  for (let c = 0; c < text.length; c++) {
    const v = text[c]
    TERMINAL[line + x + c] = v === ' ' ? '&nbsp;' : v
  }
}

// '<span style="text-decoration: underline">'
const LIGHT = '<span style="color: red">'
const END_LIGHT = '</span>'

function hisptext(x, y, text) {
  const line = y * WIDTH
  if (text.length === 1) {
    if (text[0] === ' ') TERMINAL[line + x] = '&nbsp;'
    else TERMINAL[line + x] = LIGHT + text[0] + END_LIGHT
    return
  }
  TERMINAL[line + x] = LIGHT + (text[0] === ' ' ? '&nbsp;' : text[0])
  let c = 1
  while (c < text.length - 1) {
    const v = text[c]
    TERMINAL[line + x + c] = v === ' ' ? '&nbsp;' : v
    c++
  }
  const v = text[c]
  TERMINAL[line + x + c] = (v === ' ' ? '&nbsp;' : v) + END_LIGHT
}

function hitext(x, y, text) {
  const line = y * WIDTH
  if (text.length === 1) {
    TERMINAL[line + x] = LIGHT + text[0] + END_LIGHT
    return
  }
  TERMINAL[line + x] = LIGHT + text[0]
  let c = 1
  while (c < text.length - 1) {
    TERMINAL[line + x + c] = text[c]
    c++
  }
  TERMINAL[line + x + c] = text[c] + END_LIGHT
}

function title(x, y, text) {
  const line = y * WIDTH
  TERMINAL[line + x] = LIGHT + text[0] + END_LIGHT
  for (let c = 1; c < text.length; c++) {
    TERMINAL[line + x + c] = text[c]
  }
}

function dialog(title, options, top, left, position) {
  let width = title.length
  for (let i = 0; i < options.length; i++) {
    width = Math.max(width, options[i].length)
  }
  width += 3

  const height = options.length + 3

  const _bottom = top + height
  const right = left + width

  let y = top * WIDTH
  let x = left

  TERMINAL[y + left] = '-'
  while (++x < right) {
    TERMINAL[y + x] = '-'
  }
  TERMINAL[y + x] = '-'

  y += WIDTH
  TERMINAL[y + left] = ':'
  TERMINAL[y + left + 1] = '&nbsp;'
  x = left + 2
  for (let i = 0; i < title.length; i++) {
    TERMINAL[y + x] = title[i]
    x++
  }
  while (x < right) {
    TERMINAL[y + x] = '&nbsp;'
    x++
  }
  TERMINAL[y + x] = ':'

  y += WIDTH
  x = left
  TERMINAL[y + left] = ':'
  while (++x < right) {
    TERMINAL[y + x] = '-'
  }
  TERMINAL[y + x] = ':'
  // TERMINAL[y + left] = ':'
  // x++
  // TERMINAL[y + x] = '&nbsp;'
  // while (++x < right - 1) {
  //   TERMINAL[y + x] = '-'
  // }
  // TERMINAL[y + x] = '&nbsp;'
  // x++
  // TERMINAL[y + x] = ':'

  for (let i = 0; i < options.length; i++) {
    const name = options[i]
    y += WIDTH
    TERMINAL[y + left] = ':'
    TERMINAL[y + left + 1] = '&nbsp;'
    x = left + 2
    if (position === i) {
      TERMINAL[y + x] = LIGHT + (name[0] === ' ' ? '&nbsp;' : name[0])
      let c = 1
      while (c < name.length - 1) {
        TERMINAL[y + x + c] = name[c] === ' ' ? '&nbsp;' : name[c]
        c++
      }
      TERMINAL[y + x + c] = (name[c] === ' ' ? '&nbsp;' : name[c]) + END_LIGHT
      x += name.length
    } else {
      for (let n = 0; n < name.length; n++) {
        TERMINAL[y + x] = name[n] === ' ' ? '&nbsp;' : name[n]
        x++
      }
    }
    while (x < right) {
      TERMINAL[y + x] = '&nbsp;'
      x++
    }
    TERMINAL[y + x] = ':'
  }

  y += WIDTH
  x = left
  TERMINAL[y + left] = '-'
  while (++x < right) {
    TERMINAL[y + x] = '-'
  }
  TERMINAL[y + x] = '-'
}

function user() {
  for (let i = 0; i < WIDTH * HEIGHT; i++) {
    TERMINAL[i] = '&nbsp;'
  }

  let m = 0
  for (let i = 0; i < MENU.length; i++) {
    title(m, 0, MENU[i])
    m += 3 + MENU[i].length
  }

  text(WIDTH - MUSIC.name.length, 0, MUSIC.name)

  const line = WIDTH
  for (let w = 0; w < WIDTH; w++) {
    TERMINAL[line + w] = '-'
  }

  const status = MUSIC.root + ' ' + MUSIC.mode + ' / ' + MUSIC.tempo
  text(WIDTH - status.length, HEIGHT - 1, status)

  const track = MUSIC.tracks[EDIT_TRACK]
  const active = track.notes[EDIT_POSITION]
  if (active <= 0) {
    text(0, HEIGHT - 1, '-')
  } else {
    const scale = MUSIC.scale
    const value = active - SEMITONES
    const on = scale.includes(semitoneNoOctave(value))
    let current = semitoneName(value)
    let duration = 3
    for (let n = EDIT_POSITION + 1; n < track.notes.length; n++) {
      if (track.notes[n] === -1) duration--
      else if (track.notes[n] === -2) duration++
      else break
    }
    current +=
      ' / ' + musicLengthName(duration) + ' (' + (musicNoteDuration(MUSIC.tempo, duration) / 1000.0).toFixed(2) + ')'
    if (on) text(0, HEIGHT - 1, current)
    else hitext(0, HEIGHT - 1, current)
  }

  const tracks = MUSIC.tracks

  let f = 0
  let w = 0
  for (let i = 0; i < tracks.length; i++) {
    const s = tracks[i]
    f = Math.max(f, s.name.length)
    w = Math.max(w, s.notes.length)
  }

  for (let i = 0; i < tracks.length; i++) {
    const s = tracks[i]
    const name = ' '.repeat(f - s.name.length) + s.name + ':'
    const y = 3 + i
    sptext(0, y, name)
    let x = f + 2
    let n = 0
    while (n < s.notes.length) {
      const note = s.notes[n]
      if (i === EDIT_TRACK && n === EDIT_POSITION) {
        if (note === 0) hitext(x, y, '--')
        else if (note === -1) hitext(x, y, '++')
        else if (note === -2) hitext(x, y, '%%')
        else if (note < 10) hisptext(x, y, ' ' + note)
        else hitext(x, y, '' + note)
      } else {
        if (note === 0) text(x, y, '--')
        else if (note === -1) text(x, y, '++')
        else if (note === -2) text(x, y, '%%')
        else if (note < 10) sptext(x, y, ' ' + note)
        else text(x, y, '' + note)
      }
      x += 3
      n++
    }
    while (n < w) {
      text(x, y, '--')
      x += 3
      n++
    }
  }

  if (STATUS === STATUS_FILE) {
    const title = 'FILE'
    const top = 1
    const left = 0
    dialog(title, DIALOG_OPTIONS, top, left, DIALOG_LINE)
  } else if (STATUS === STATUS_EDIT) {
    const title = 'EDIT'
    const top = 1
    const left = 6
    dialog(title, DIALOG_OPTIONS, top, left, DIALOG_LINE)
  } else if (STATUS === STATUS_TRACK) {
    const title = 'TRACK / ' + MUSIC.tracks[EDIT_TRACK].name
    const top = 10
    const left = 10
    dialog(title, DIALOG_OPTIONS, top, left, DIALOG_LINE)
  } else if (STATUS === STATUS_ABOUT) {
    const title = 'ABOUT'
    const top = 10
    const left = 10
    dialog(title, DIALOG_OPTIONS, top, left, DIALOG_LINE)
  }

  if (NAME_BOX !== null) {
    const title = NAME_BOX
    const top = 20
    const left = 20
    dialog(title, ['FOO'], top, left, 0)
  }
}

function canvas() {
  let string = ''
  for (let h = 0; h < HEIGHT; h++) {
    const line = h * WIDTH
    for (let w = 0; w < WIDTH; w++) {
      string += TERMINAL[line + w]
    }
    string += '</br>'
  }
  CANVAS.innerHTML = string
}

function render() {
  user()
  canvas()
}

function size(width, height) {
  WIDTH = width
  HEIGHT = height
  TERMINAL = new Array(WIDTH * HEIGHT).fill('&nbsp;')
}

function resize() {
  const x = Math.ceil(CANVAS.clientWidth / WIDTH)
  const y = Math.ceil(CANVAS.clientHeight / HEIGHT)
  const width = Math.floor(window.innerWidth / x)
  const height = Math.floor(window.innerHeight / y)
  if (width === WIDTH && height === HEIGHT) {
    return
  }
  size(width, height)
  render()
}

function wadSkip(s, i) {
  i++
  let c = s[i]
  if (c !== '\n' && c !== ' ') {
    return i - 1
  }
  const size = s.length
  do {
    i++
    if (i === size) {
      return i
    }
    c = s[i]
  } while (c === '\n' || c === ' ')
  return i - 1
}

function parseWad(s) {
  const wad = new Map()
  const stack = [wad]
  let key = ''
  let value = ''
  let pc = ''
  let naming = true
  const size = s.length
  for (let i = 0; i < size; i++) {
    const c = s[i]
    if (c === '#') {
      pc = c
      i++
      while (i < size && s[c] !== '\n') {
        i++
      }
    } else if (c === '\n') {
      if (!naming && pc !== '}' && pc !== ']') {
        if (stack[0].constructor === Array) {
          stack[0].push(value)
        } else {
          stack[0].set(key.trim(), value)
          key = ''
          naming = true
        }
        value = ''
      }
      pc = c
      i = wadSkip(s, i)
    } else if (c === '=') {
      naming = false
      pc = c
      i = wadSkip(s, i)
    } else if (c === ' ') {
      if (!naming && pc !== '}' && pc !== ']') {
        if (stack[0].constructor === Array) {
          stack[0].push(value)
        } else {
          stack[0].set(key.trim(), value)
          key = ''
          naming = true
        }
        value = ''
      }
      pc = c
      i = wadSkip(s, i)
    } else if (c === '{') {
      const map = new Map()
      if (stack[0].constructor === Array) {
        stack[0].push(map)
        naming = true
      } else {
        stack[0].set(key.trim(), map)
        key = ''
      }
      stack.unshift(map)
      pc = c
      i = wadSkip(s, i)
    } else if (c === '[') {
      const array = []
      if (stack[0].constructor === Array) {
        stack[0].push(array)
      } else {
        stack[0].set(key.trim(), array)
        key = ''
      }
      stack.unshift(array)
      naming = false
      pc = c
      i = wadSkip(s, i)
    } else if (c === '}') {
      if (pc !== ' ' && pc !== '{' && pc !== ']' && pc !== '}' && pc !== '\n') {
        stack[0].set(key.trim(), value)
        key = ''
        value = ''
      }
      stack.shift()
      naming = stack[0].constructor !== Array
      pc = c
      i = wadSkip(s, i)
    } else if (c === ']') {
      if (pc !== ' ' && pc !== '[' && pc !== ']' && pc !== '}' && pc !== '\n') {
        stack[0].push(value)
        value = ''
      }
      stack.shift()
      naming = stack[0].constructor !== Array
      pc = c
      i = wadSkip(s, i)
    } else if (naming) {
      pc = c
      key += c
    } else {
      if (c === '"') {
        i++
        let e = s[i]
        while (i < size) {
          if (e === '"') {
            break
          }
          if (e === '\n') {
            throw 'Unclosed string in wad: ' + value
          }
          if (e === '\\' && i + 1 < size && s[i + 1] === '"') {
            value += '"'
            i += 2
            e = s[i]
          } else {
            value += e
            i++
            e = s[i]
          }
        }
      } else {
        value += c
      }
      pc = c
    }
  }
  if (pc !== ' ' && pc !== ']' && pc !== '}' && pc !== '\n') {
    stack[0].set(key.trim(), value)
  }
  return wad
}

const NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B']

const MUSIC_SCALE = new Map()

MUSIC_SCALE.set('MAJOR', [2, 2, 1, 2, 2, 2, 1])
MUSIC_SCALE.set('MINOR', [2, 1, 2, 2, 1, 2, 2])
MUSIC_SCALE.set('PENTATONIC MAJOR', [2, 2, 3, 2, 3])
MUSIC_SCALE.set('PENTATONIC MAJOR', [3, 2, 2, 3, 2])
MUSIC_SCALE.set('HARMONIC MAJOR', [2, 2, 1, 2, 1, 3, 1])
MUSIC_SCALE.set('HARMONIC MINOR', [2, 1, 2, 2, 1, 3, 1])
MUSIC_SCALE.set('MELODIC HARMONIC', [2, 1, 2, 2, 2, 2, 1])
MUSIC_SCALE.set('AUGMENTED', [3, 1, 3, 1, 3, 1])
MUSIC_SCALE.set('BLUES', [3, 2, 1, 1, 3, 2])
MUSIC_SCALE.set('WHOLE TONE', [2, 2, 2, 2, 2, 2])
MUSIC_SCALE.set('ALGERIAN', [2, 1, 3, 1, 1, 3, 1, 2, 1, 2])

function musicScale(root, mode) {
  const steps = MUSIC_SCALE.get(mode)
  const out = [root]
  let index = NOTES.indexOf(root)
  for (let i = 0; i < steps.length; i++) {
    index += steps[i]
    if (index >= NOTES.length) index -= NOTES.length
    out.push(NOTES[index])
  }
  return out
}

function musicNoteDuration(tempo, note) {
  if (note === 0) return (240 / tempo) * 1000
  else if (note === 1) return (120 / tempo) * 1000
  else if (note === 2) return (60 / tempo) * 1000
  else if (note === 3) return (30 / tempo) * 1000
  else if (note === 4) return (15 / tempo) * 1000
  else return (7.5 / tempo) * 1000
}

const SYNTH_RATE = 44100

const SEMITONES = 49

const WAVE = 0
const CYCLE = 1
const FREQ = 2
const SPEED = 3
const ACCEL = 4
const JERK = 5
const ATTACK = 6
const DECAY = 7
const SUSTAIN = 8
const LENGTH = 9
const RELEASE = 10
const VOLUME = 11
const VIBRATO_WAVE = 12
const VIBRATO_FREQ = 13
const VIBRATO_PERC = 14
const TREMOLO_WAVE = 15
const TREMOLO_FREQ = 16
const TREMOLO_PERC = 17
const BIT_CRUSH = 18
const NOISE = 19
const DISTORTION = 20
const LOW_PASS = 21
const HIGH_PASS = 22
const REPEAT = 23
const HARMONIC_MULT_A = 24
const HARMONIC_GAIN_A = 25
const HARMONIC_MULT_B = 26
const HARMONIC_GAIN_B = 27
const HARMONIC_MULT_C = 28
const HARMONIC_GAIN_C = 29
const PARAMETER_COUNT = 30

const WAVEFORMS = ['None', 'Sine', 'Square', 'Pulse', 'Triangle', 'Sawtooth', 'Noise', 'Static']

const WAVE_GROUP = ['Wave', 'Cycle']
const FREQ_GROUP = ['Frequency', 'Speed', 'Accel', 'Jerk']
const VOLUME_GROUP = ['Attack', 'Decay', 'Sustain', 'Length', 'Release', 'Volume']
const VIBRATO_GROUP = ['Vibrato Wave', 'Vibrato Freq', 'Vibrato %']
const TREMOLO_GROUP = ['Tremolo Wave', 'Tremolo Freq', 'Tremolo %']
const OTHER_GROUP = ['Bit Crush', 'Noise', 'Distortion', 'Low Pass', 'High Pass', 'Repeat']
const HARMONIC_GROUP = [
  'Harmonic Mult A',
  'Harmonic Gain A',
  'Harmonic Mult B',
  'Harmonic Gain B',
  'Harmonic Mult C',
  'Harmonic Gain C',
]

const SYNTH_ARGUMENTS = []
  .concat(WAVE_GROUP)
  .concat(FREQ_GROUP)
  .concat(VOLUME_GROUP)
  .concat(VIBRATO_GROUP)
  .concat(TREMOLO_GROUP)
  .concat(OTHER_GROUP)
  .concat(HARMONIC_GROUP)

const SYNTH_IO = SYNTH_ARGUMENTS.map((x) => x.toLowerCase().replaceAll(' ', '-'))

function musicLengthName(num) {
  switch (num) {
    case 0:
      return 'WHOLE'
    case 1:
      return 'HALF'
    case 2:
      return 'QUARTER'
    case 3:
      return 'EIGTH'
    case 4:
      return 'SIXTEENTH'
    case 5:
      return 'THIRTY SECOND'
    default:
      return null
  }
}

const _INTERVAL = 0
const _INCREMENT = 1

const _COUNT = 1

const rate = 1.0 / SYNTH_RATE
const pi = Math.PI
const tau = 2.0 * pi

function synthTime() {
  return CONTEXT.currentTime
}

function _exportSynthParameters(parameters) {
  let content = 'parameters {\n'
  for (let i = 0; i < parameters.length; i++) {
    content += '  ' + SYNTH_IO[i] + ' = '
    if (i === WAVE) content += WAVEFORMS[parameters[i]] + '\n'
    else content += parameters[i] + '\n'
  }
  content += '}'
  return content
}

function normalize(min, max, value) {
  return ((value + 1.0) * (max - min)) / 2.0 + min
}

const DISTORTION_CURVE = new Float32Array(SYNTH_RATE)

function distortionCurve(amount) {
  const curve = DISTORTION_CURVE
  for (let i = 0; i < SYNTH_RATE; i++) {
    const x = (i * 2.0) / SYNTH_RATE - 1.0
    curve[i] = ((3.0 + amount) * Math.atan(Math.sinh(x * 0.25) * 5.0)) / (pi + amount * Math.abs(x))
  }
  return curve
}

function processCurve(input, curve) {
  const samples = curve.length - 1
  const index = (samples * (input + 1.0)) / 2.0
  if (index < 0.0) {
    return curve[0]
  } else {
    const low = Math.floor(index)
    if (low >= samples) {
      return curve[samples]
    } else {
      const high = low + 1
      const factor = index - low
      return (1.0 - factor) * curve[low] + factor * curve[high]
    }
  }
}

function processSine(amplitude, phase) {
  return amplitude * Math.sin(phase)
}

function processSquare(amplitude, phase) {
  return phase < pi ? amplitude : -amplitude
}

function processPulse(amplitude, phase, extra) {
  return phase < extra[_INTERVAL] ? amplitude : -amplitude
}

function processTriangle(amplitude, phase) {
  const cycle = (2.0 * amplitude) / pi
  if (phase < pi) return -amplitude + cycle * phase
  return 3 * amplitude - cycle * phase
}

function processSawtooth(amplitude, phase) {
  return amplitude - (amplitude / pi) * phase
}

function processNoise(amplitude, phase, extra) {
  return phase + extra[_INCREMENT] > tau ? amplitude * (2.0 * Math.random() - 1.0) : 0.0
}

function processStatic(amplitude) {
  return amplitude * (2.0 * Math.random() - 1.0)
}

function process(data, parameters) {
  const proc = processFromIndex(parameters[WAVE])

  let attack = parameters[ATTACK]
  let decay = parameters[DECAY]
  let length = parameters[LENGTH]
  let release = parameters[RELEASE]

  if (attack === 0) attack = 4
  if (decay === 0) decay = 4
  if (release === 0) release = 4

  attack = Math.floor((attack / 1000) * SYNTH_RATE)
  decay = Math.floor((decay / 1000) * SYNTH_RATE)
  length = Math.floor((length / 1000) * SYNTH_RATE)
  release = Math.floor((release / 1000) * SYNTH_RATE)

  const volume = parameters[VOLUME]
  const sustain = parameters[SUSTAIN]
  const hold = volume * sustain

  const attackRate = volume / attack
  const decayRate = (volume - hold) / decay
  const releaseRate = hold / release

  const decayEnd = attack + decay
  const lengthEnd = decayEnd + length

  let amplitude = 0.0

  const startFrequency = diatonic(parameters[FREQ] - SEMITONES)
  const startSpeed = parameters[SPEED]
  const startAcceleration = parameters[ACCEL] / SYNTH_RATE
  const jerk = parameters[JERK] / SYNTH_RATE / SYNTH_RATE

  let frequency = startFrequency
  let speed = startSpeed
  let acceleration = startAcceleration

  const vibratoWave = parameters[VIBRATO_WAVE]
  const vibratoFreq = parameters[VIBRATO_FREQ]
  const vibratoPerc = parameters[VIBRATO_PERC]

  let vibratoPhase = 0.0

  const tremoloWave = parameters[TREMOLO_WAVE]
  const tremoloFreq = parameters[TREMOLO_FREQ]
  const tremoloPerc = parameters[TREMOLO_PERC]

  let tremoloPhase = 0.0

  const crush = parameters[BIT_CRUSH]
  const noise = parameters[NOISE]
  const distortion = parameters[DISTORTION]
  const low = parameters[LOW_PASS]
  const high = parameters[HIGH_PASS]
  const repeat = Math.floor(parameters[REPEAT] * SYNTH_RATE)

  let distort = null
  if (distortion !== 0.0) {
    distort = distortionCurve(Math.ceil(distortion * 100.0))
  }

  let lpfid1 = 0.0
  let lpfid2 = 0.0
  let lpfod1 = 0.0
  let lpfod2 = 0.0

  let lpfcb0 = 0.0
  let lpfcb1 = 0.0
  let lpfcb2 = 0.0
  let lpfca1 = 0.0
  let lpfca2 = 0.0

  if (low !== 0.0) {
    const cutoff = low
    const q = 1.0

    const g = Math.pow(10.0, -0.05 * q)
    const w0 = pi * cutoff
    const cosw0 = Math.cos(w0)
    const alpha = 0.5 * Math.sin(w0) * g

    const b1 = 1.0 - cosw0
    const b0 = 0.5 * b1
    const b2 = b0
    const a0 = 1.0 + alpha
    const a1 = -2.0 * cosw0
    const a2 = 1.0 - alpha

    const inverse = 1.0 / a0

    lpfcb0 = b0 * inverse
    lpfcb1 = b1 * inverse
    lpfcb2 = b2 * inverse
    lpfca1 = a1 * inverse
    lpfca2 = a2 * inverse
  }

  let hpfid1 = 0.0
  let hpfid2 = 0.0
  let hpfod1 = 0.0
  let hpfod2 = 0.0

  let hpfcb0 = 0.0
  let hpfcb1 = 0.0
  let hpfcb2 = 0.0
  let hpfca1 = 0.0
  let hpfca2 = 0.0

  if (high !== 0.0) {
    const cutoff = high
    const q = 1.0

    const g = Math.pow(10.0, -0.05 * q)
    const w0 = pi * cutoff
    const cosw0 = Math.cos(w0)
    const alpha = 0.5 * Math.sin(w0) * g

    const b1 = -1.0 - cosw0
    const b0 = -0.5 * b1
    const b2 = b0
    const a0 = 1.0 + alpha
    const a1 = -2.0 * cosw0
    const a2 = 1.0 - alpha

    const inverse = 1.0 / a0

    hpfcb0 = b0 * inverse
    hpfcb1 = b1 * inverse
    hpfcb2 = b2 * inverse
    hpfca1 = a1 * inverse
    hpfca2 = a2 * inverse
  }

  const harmonicA = parameters[HARMONIC_MULT_A]
  const harmonicB = parameters[HARMONIC_MULT_B]
  const harmonicC = parameters[HARMONIC_MULT_C]

  const harmonicGainA = parameters[HARMONIC_GAIN_A]
  const harmonicGainB = parameters[HARMONIC_GAIN_B]
  const harmonicGainC = parameters[HARMONIC_GAIN_C]

  let harmonicPhaseA = 0.0
  let harmonicPhaseB = 0.0
  let harmonicPhaseC = 0.0

  const extra = new Array(_COUNT)
  extra[_INTERVAL] = tau * parameters[CYCLE]

  const size = data.length
  let phase = 0.0

  let out = 0.0

  for (let i = 0; i < size; i++) {
    if (i < attack) amplitude += attackRate
    else if (i < decayEnd) amplitude -= decayRate
    else if (i > lengthEnd) amplitude -= releaseRate
    else amplitude = hold

    let calculate = true

    if (crush !== 0.0) {
      if (i % Math.floor(crush * 100) !== 0) calculate = false
    }

    let freq = frequency

    if (vibratoWave !== 0) {
      const proc = processFromIndex(vibratoWave)
      const vibrato = proc(1.0, vibratoPhase, extra)

      freq += vibrato * vibratoPerc * 100
      // freq *= Math.pow(2, (vibrato * vibratoPerc * 100) / 1200)

      const increment = tau * vibratoFreq * rate
      vibratoPhase += increment
      if (vibratoPhase > tau) vibratoPhase -= tau
    }

    const increment = tau * freq * rate

    if (calculate) {
      let amp = 1.0

      if (tremoloWave !== 0) {
        const proc = processFromIndex(tremoloWave)
        const tremolo = proc(1.0, tremoloPhase, extra)
        amp *= 1.0 - normalize(0.0, tremoloPerc, tremolo)

        const increment = tau * tremoloFreq * rate
        tremoloPhase += increment
        if (tremoloPhase > tau) tremoloPhase -= tau
      }

      extra[_INCREMENT] = increment

      out = proc(amp, phase, extra)

      if (harmonicA !== 1.0) {
        const overtone = proc(harmonicGainA, harmonicPhaseA, extra)
        out += overtone
      }

      if (harmonicB !== 1.0) {
        const overtone = proc(harmonicGainB, harmonicPhaseB, extra)
        out += overtone
      }

      if (harmonicC !== 1.0) {
        const overtone = proc(harmonicGainC, harmonicPhaseC, extra)
        out += overtone
      }

      if (noise !== 0.0) {
        out = out - out * noise * (1.0 - (((Math.sin(i) + 1.0) * 1e9) % 2))
      }

      if (distort !== null) {
        out = processCurve(out, distort)
      }

      if (low !== 0.0) {
        const pure = out
        out = lpfcb0 * pure + lpfcb1 * lpfid1 + lpfcb2 * lpfid2 - lpfca1 * lpfod1 - lpfca2 * lpfod2

        lpfid2 = lpfid1
        lpfid1 = pure
        lpfod2 = lpfod1
        lpfod1 = out
      }

      if (high !== 0.0) {
        const pure = out
        out = hpfcb0 * pure + hpfcb1 * hpfid1 + hpfcb2 * hpfid2 - hpfca1 * hpfod1 - hpfca2 * hpfod2

        hpfid2 = hpfid1
        hpfid1 = pure
        hpfod2 = hpfod1
        hpfod1 = out
      }
    }

    data[i] = out * amplitude

    phase += increment
    if (phase > tau) phase -= tau

    frequency += speed
    speed += acceleration
    acceleration += jerk

    if (repeat !== 0) {
      if (i % repeat === 0) {
        frequency = startFrequency
        speed = startSpeed
        acceleration = startAcceleration
      }
    }

    if (harmonicA !== 1.0) {
      const increment = tau * frequency * harmonicA * rate
      harmonicPhaseA += increment
      if (harmonicPhaseA > tau) harmonicPhaseA -= tau
    }

    if (harmonicB !== 1.0) {
      const increment = tau * frequency * harmonicB * rate
      harmonicPhaseB += increment
      if (harmonicPhaseB > tau) harmonicPhaseB -= tau
    }

    if (harmonicC !== 1.0) {
      const increment = tau * frequency * harmonicC * rate
      harmonicPhaseC += increment
      if (harmonicPhaseC > tau) harmonicPhaseC -= tau
    }
  }
}

function playSynth(parameters, when = 0) {
  if (CONTEXT == null) {
    CONTEXT = new window.AudioContext()
  }
  const seconds = (parameters[ATTACK] + parameters[DECAY] + parameters[LENGTH] + parameters[RELEASE]) / 1000
  const buffer = CONTEXT.createBuffer(1, Math.ceil(SYNTH_RATE * seconds), SYNTH_RATE)
  const data = buffer.getChannelData(0)
  process(data, parameters)
  const source = CONTEXT.createBufferSource()
  source.buffer = buffer
  source.connect(CONTEXT.destination)
  source.start(when)
  return source
}

function processFromIndex(index) {
  switch (index) {
    case 0:
      return null
    case 1:
      return processSine
    case 2:
      return processSquare
    case 3:
      return processPulse
    case 4:
      return processTriangle
    case 5:
      return processSawtooth
    case 6:
      return processNoise
    case 7:
      return processStatic
  }
  console.error('Bad process index: ' + index)
  return null
}

function semitoneNoOctave(semitone) {
  semitone += 9
  let note = semitone % 12
  while (note < 0) note += 12
  return NOTES[note]
}

function semitoneName(semitone) {
  const octave = 4 + Math.floor((semitone + 9) / 12)
  return semitoneNoOctave(semitone) + octave
}

function diatonic(semitone) {
  return 440 * Math.pow(2, semitone / 12)
}

function musicCalcTiming(tempo, tracks) {
  let end = 0
  const size = tracks.length
  for (let t = 0; t < size; t++) {
    const track = tracks[t]
    track.i = 0
    const notes = track.notes
    const count = notes.length
    let time = 0
    for (let n = 0; n < count; n++) {
      const note = notes[n]
      note[NOTE_START] = time
      time += musicNoteDuration(tempo, note[0])
    }
    end = Math.max(end, time)
  }
  return end
}

function musicPlayNote(tempo, track, note, when, out) {
  const parameters = track.parameters.slice()
  parameters[LENGTH] = musicNoteDuration(tempo, note[0])
  for (let r = 1; r < NOTE_ROWS; r++) {
    const num = note[r]
    if (num === 0) continue
    parameters[FREQ] = num + track.tuning
    out.push(playSynth(parameters, when))
  }
}

function readSynthParameters(out, parameters) {
  for (const [name, value] of parameters) {
    for (let a = 0; a < SYNTH_IO.length; a++) {
      if (SYNTH_IO[a] === name) {
        if (name === 'wave') {
          for (let w = 0; w < WAVEFORMS.length; w++) {
            if (WAVEFORMS[w] === value) {
              out[a] = w
              break
            }
          }
        } else {
          out[a] = parseFloat(value)
        }
        break
      }
    }
  }
}

main()
