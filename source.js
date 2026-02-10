/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

let CANVAS = null

let WIDTH = 0
let HEIGHT = 0

let TERMINAL = null

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

const WAVEFORMS = ['NONE', 'SINE', 'SQUARE', 'PULSE', 'TRIANGLE', 'SAWTOOTH', 'NOISE', 'STATIC']

const WAVE_GROUP = ['WAVE', 'CYCLE']
const FREQ_GROUP = ['FREQUENCY', 'SPEED', 'ACCEL', 'JERK']
const VOLUME_GROUP = ['ATTACK', 'DECAY', 'SUSTAIN', 'LENGTH', 'RELEASE', 'VOLUME']
const VIBRATO_GROUP = ['VIBRATE WAVE', 'VIBRATO FREQ', 'VIBRATO %']
const TREMOLO_GROUP = ['TREMOLO WAVE', 'TREMOLO FREQ', 'TREMOLO %']
const OTHER_GROUP = ['BIT CRUSH', 'NOISE', 'DISTORTION', 'LOW PASS', 'HIGH PASS', 'REPEAT']
const HARMONIC_GROUP = [
  'HARMONIC MULT A',
  'HARMONIC GAIN A',
  'HARMONIC MULT B',
  'HARMONIC GAIN B',
  'HARMONIC MULT C',
  'HARMONIC GAIN C',
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

const MENU = ['FILE', 'EDIT', 'TRACK', 'ABOUT']

const FILE_OPTIONS = ['LOCAL SAVE', 'LOCAL LOAD', 'FILE OPEN', 'FILE EXPORT']
const EDIT_OPTIONS = ['NAME', 'SIGNATURE', 'TEMPO']
const TRACK_OPTIONS = [
  'NAME',
  'SYNTHESIZER',
  'TRANSPOSE',
  'COPY TRACK',
  'COPY NOTES',
  'COPY SYNTHESIZER',
  'MOVE UP',
  'MOVE DOWN',
  'CLEAR NOTES',
  'DELETE',
]
const ABOUT_OPTIONS = [
  'F          FILE',
  'E          EDIT',
  'T          TRACK',
  'A          ABOUT',
  '-------------------------',
  '^          START OF TRACK',
  '$          END OF TRACK',
  'LEFT  / H  MOVE LEFT',
  'RIGHT / L  MOVE RIGHT',
  'UP    / K  MOVE UP',
  'DOWN  / J  MOVE DOWN',
  '-------------------------',
  'P          PLAY MUSIC',
  'SPACE      START MUSIC',
  'N          PLAY NOTE',
  '0-9        SET NOTE',
  '+          ADD DURATION',
]

let MUSIC = null
let CONTEXT = null

const STATUS_DEFAULT = 0
const STATUS_FILE = 1
const STATUS_EDIT = 2
const STATUS_TRACK = 3
const STATUS_ABOUT = 4
const STATUS_SYNTHESIZER = 5

let STATUS = STATUS_DEFAULT

let EDIT_TRACK = 0
let EDIT_POSITION = 0

let SCROLL = 0
let TRACKER = 0

let DIALOG_LINE = 0
let DIALOG_OPTIONS = null

let NAME_BOX = null

const RANGE = new Array(PARAMETER_COUNT).fill(0)

RANGE[WAVE] = [1, 1, WAVEFORMS.length - 1, WAVEFORMS.length]
RANGE[CYCLE] = [0.05, 0.0, 1.0, 0.2]

RANGE[FREQ] = [1, 1, 99, 12]
RANGE[SPEED] = [0.001, -1.0, 1.0, 0.1]
RANGE[ACCEL] = [0.001, -1.0, 1.0, 0.1]
RANGE[JERK] = [0.001, -1.0, 1.0, 0.1]

RANGE[ATTACK] = [10, 0, 5000, 500]
RANGE[DECAY] = [10, 0, 5000, 500]
RANGE[SUSTAIN] = [0.05, 0.05, 1.0, 500]
RANGE[LENGTH] = [10, 10, 10000, 500]
RANGE[RELEASE] = [10, 0, 5000, 500]
RANGE[VOLUME] = [0.1, 0.1, 2.0, 0.25]

RANGE[VIBRATO_WAVE] = [1, 0, WAVEFORMS.length - 1, WAVEFORMS.length]
RANGE[VIBRATO_FREQ] = [0.2, 0.2, 24.0, 1.0]
RANGE[VIBRATO_PERC] = [0.05, 0.05, 1.0, 0.2]

RANGE[TREMOLO_WAVE] = [1, 0, WAVEFORMS.length - 1, WAVEFORMS.length]
RANGE[TREMOLO_FREQ] = [0.2, 0.2, 24.0, 1.0]
RANGE[TREMOLO_PERC] = [0.05, 0.05, 1.0, 0.2]

RANGE[BIT_CRUSH] = [0.05, 0.0, 1.0, 0.2]
RANGE[NOISE] = [0.05, 0.0, 1.0, 0.2]
RANGE[DISTORTION] = [0.05, 0.0, 4.0, 0.2]
RANGE[LOW_PASS] = [0.05, 0.0, 1.0, 0.2]
RANGE[HIGH_PASS] = [0.05, 0.0, 1.0, 0.2]
RANGE[REPEAT] = [0.05, 0.0, 1.0, 0.2]

RANGE[HARMONIC_MULT_A] = [0.25, 1.0, 12.0, 1.0]
RANGE[HARMONIC_GAIN_A] = [0.005, -1.0, 1.0, 0.1]

RANGE[HARMONIC_MULT_B] = [0.25, 1.0, 12.0, 1.0]
RANGE[HARMONIC_GAIN_B] = [0.005, -1.0, 1.0, 0.1]

RANGE[HARMONIC_MULT_C] = [0.25, 1.0, 12.0, 1.0]
RANGE[HARMONIC_GAIN_C] = [0.005, -1.0, 1.0, 0.1]

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

const _INTERVAL = 0
const _INCREMENT = 1

const _COUNT = 1

const rate = 1.0 / SYNTH_RATE
const pi = Math.PI
const tau = 2.0 * pi

class Synth {
  constructor() {
    this.name = null
    this.parameters = new Array(PARAMETER_COUNT).fill(0)
    this.tuning = 0
    this.notes = []
  }
}

class Music {
  constructor() {
    this.name = null
    this.root = null
    this.mode = null
    this.scale = null
    this.tempo = 120
    this.tempos = [this.tempo]
    this.tracks = []
    this.position = 0
    this.total = 0
    this.time = 0
    this.sounds = []
    this.id = null
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
    sine.notes[1] = 41
    sine.notes[2] = 0
    sine.notes[3] = 42
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

  const square = new Synth()
  {
    square.name = 'SQUARE'
    square.notes[0] = 0
    square.notes[1] = 0
    square.notes[2] = 44
    const parameters = square.parameters
    parameters[WAVE] = 2
    parameters[ATTACK] = 1
    parameters[DECAY] = 1
    parameters[VOLUME] = 0.25
    parameters[SUSTAIN] = 1
    parameters[FREQ] = 40
    parameters[LENGTH] = 1000
  }
  music.tracks[2] = square

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
}

function updateMusic() {
  const music = MUSIC
  const now = Date.now()

  if (now >= music.time) {
    const position = music.position
    if (position >= music.total) {
      pauseMusic()
      render()
      return
    }
    if (position < music.tempos.length) {
      const current = music.tempos[position]
      if (current !== 0) {
        music.tempo = current
      }
    }
    const tracks = music.tracks
    for (let t = 0; t < tracks.length; t++) {
      const track = tracks[t]
      const notes = track.notes
      if (position >= notes.length) continue
      const note = notes[position]
      if (note <= 0) continue
      let duration = 1
      for (let n = position + 1; n < notes.length; n++) {
        if (notes[n] === -1) duration++
        else break
      }
      musicPlayNote(music.tempo, track, note, duration, 0, music.sounds)
    }
    const increment = musicNoteDuration(music.tempo, 1)
    music.time += increment
    music.position++
    render()
  }

  music.id = setTimeout(updateMusic, 10)
}

function playMusic() {
  if (CONTEXT === null) CONTEXT = new window.AudioContext()
  const music = MUSIC
  for (const sound of music.sounds) sound.stop()
  music.sounds.length = 0
  music.total = 0
  const tracks = music.tracks
  for (let t = 0; t < tracks.length; t++) {
    music.total = Math.max(music.total, tracks[t].notes.length)
  }
  updateTempo(music.position)
  music.time = Date.now()
  updateMusic()
}

function pauseMusic() {
  const music = MUSIC
  clearTimeout(music.id)
  music.id = null
  music.time = 0
  music.position = music.total
  for (const sound of music.sounds) sound.stop()
  music.sounds.length = 0
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
              if (Number.isNaN(number) || number < 0 || number > 999) return
              if (EDIT_POSITION === 0) {
                if (number === 0) return
                STATUS = STATUS_DEFAULT
                MUSIC.tempo = number
                MUSIC.tempos[0] = number
              } else {
                STATUS = STATUS_DEFAULT
                if (number === 0) {
                  if (EDIT_POSITION < MUSIC.tempos.length) {
                    MUSIC.tempos[EDIT_POSITION] = 0
                    updateTempo(EDIT_POSITION)
                  }
                } else {
                  MUSIC.tempo = number
                  while (EDIT_POSITION >= MUSIC.tempos.length) MUSIC.tempos.push(0)
                  MUSIC.tempos[EDIT_POSITION] = number
                }
              }
            } catch (_e) {
              return
            }
          }
        }
      } else if (STATUS === STATUS_TRACK) {
        const option = DIALOG_OPTIONS[DIALOG_LINE]
        const track = MUSIC.tracks[EDIT_TRACK]
        if (option === 'NAME') {
          STATUS = STATUS_DEFAULT
          if (NAME_BOX.length === 0) track.name = 'UNTITLED'
          else MUSIC.tracks[EDIT_TRACK].name = NAME_BOX
        } else if (option === 'TUNING') {
          if (NAME_BOX.length === 0) {
            STATUS = STATUS_DEFAULT
          } else {
            try {
              const number = parseInt(NAME_BOX)
              if (Number.isNaN(number) || number < -24 || number > 24) return
              STATUS = STATUS_DEFAULT
              track.tuning = number
            } catch (_e) {
              return
            }
          }
        }
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
      if ((value >= 48 && value <= 57) || value === 45) {
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
        else if (option === 'FILE OPEN') fileOpen()
        else if (option === 'FILE EXPORT') fileExport()
        break
      } else if (STATUS === STATUS_EDIT) {
        const option = DIALOG_OPTIONS[DIALOG_LINE]
        if (option === 'NAME') NAME_BOX = MUSIC.name
        else if (option === 'TEMPO') NAME_BOX = '' + MUSIC.tempo
      } else if (STATUS === STATUS_TRACK) {
        const option = DIALOG_OPTIONS[DIALOG_LINE]
        if (option === 'NAME') {
          NAME_BOX = MUSIC.tracks[EDIT_TRACK].name
        } else if (option === 'SYNTHESIZER') {
          DIALOG_LINE = 0
          DIALOG_OPTIONS = SYNTH_ARGUMENTS
          STATUS = STATUS_SYNTHESIZER
        } else if (option === 'TUNING') {
          NAME_BOX = '' + MUSIC.tracks[EDIT_TRACK].tuning
        } else if (option === 'COPY TRACK') {
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
      if (STATUS === STATUS_TRACK || STATUS === STATUS_SYNTHESIZER) {
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
      if (MUSIC.sounds.length !== 0) {
        pauseMusic()
        render()
      } else {
        MUSIC.position = 0
        playMusic()
      }
      return
    case ' ':
      if (MUSIC.sounds.length !== 0) {
        pauseMusic()
        render()
      } else {
        MUSIC.position = EDIT_POSITION
        playMusic()
      }
      return
    case 'n': {
      if (CONTEXT === null) CONTEXT = new window.AudioContext()
      const track = MUSIC.tracks[EDIT_TRACK]
      if (STATUS === STATUS_SYNTHESIZER) {
        playSynth(track.parameters)
      } else {
        const note = track.notes[EDIT_POSITION]
        if (note <= 0) return
        let duration = 1
        for (let n = EDIT_POSITION + 1; n < track.notes.length; n++) {
          if (track.notes[n] === -1) duration++
          else break
        }
        track.parameters[FREQ] = note + track.tuning
        track.parameters[LENGTH] = musicNoteDuration(MUSIC.tempo, duration)
        playSynth(track.parameters)
      }
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
        const track = MUSIC.tracks[EDIT_TRACK]
        while (EDIT_POSITION >= track.notes.length) track.notes.push(0)
      }
      break
    }
    case 'h':
    case 'ArrowLeft': {
      if (STATUS === STATUS_SYNTHESIZER) {
        const track = MUSIC.tracks[EDIT_TRACK]
        const range = RANGE[DIALOG_LINE]
        // if SHIFT -= range[3]
        track.parameters[DIALOG_LINE] -= range[0]
        if (track.parameters[DIALOG_LINE] < range[1]) track.parameters[DIALOG_LINE] = range[1]
      } else if (EDIT_POSITION > 0) {
        const tracks = MUSIC.tracks
        if (EDIT_POSITION === tracks[EDIT_TRACK].notes.length - 1) {
          let empty = true
          for (let t = 0; t < tracks.length; t++) {
            const notes = tracks[t].notes
            const last = notes.length - 1
            if (EDIT_POSITION < last || (EDIT_POSITION === last && notes[last] !== 0)) {
              empty = false
              break
            }
          }
          if (empty) {
            for (let t = 0; t < tracks.length; t++) {
              const notes = tracks[t].notes
              if (EDIT_POSITION === notes.length - 1) {
                notes.pop()
              }
            }
            if (MUSIC.tempos.length > EDIT_POSITION) {
              MUSIC.tempos.pop()
              updateTempo(EDIT_POSITION)
            }
          }
        }
        EDIT_POSITION--
        const tempos = MUSIC.tempos
        if (EDIT_POSITION < tempos.length) {
          const current = tempos[EDIT_POSITION]
          if (current !== 0) {
            MUSIC.tempo = current
          } else if (EDIT_POSITION + 1 < tempos.length && tempos[EDIT_POSITION + 1] !== 0) {
            for (let i = EDIT_POSITION - 1; i >= 0; i--) {
              const tempo = tempos[i]
              if (tempo !== 0) {
                MUSIC.tempo = tempo
                break
              }
            }
          }
        }
      }
      break
    }
    case 'l':
    case 'ArrowRight': {
      if (STATUS === STATUS_SYNTHESIZER) {
        const track = MUSIC.tracks[EDIT_TRACK]
        const range = RANGE[DIALOG_LINE]
        track.parameters[DIALOG_LINE] += range[0]
        if (track.parameters[DIALOG_LINE] > range[2]) track.parameters[DIALOG_LINE] = range[2]
      } else {
        EDIT_POSITION++
        const track = MUSIC.tracks[EDIT_TRACK]
        while (EDIT_POSITION >= track.notes.length) track.notes.push(0)
        if (MUSIC.tempos.length > EDIT_POSITION) {
          const current = MUSIC.tempos[EDIT_POSITION]
          if (current !== 0) {
            MUSIC.tempo = current
          }
        }
      }
      break
    }
    case '+': {
      const track = MUSIC.tracks[EDIT_TRACK]
      track.notes[EDIT_POSITION] = -1
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
      const track = MUSIC.tracks[EDIT_TRACK]
      const current = track.notes[EDIT_POSITION]
      track.notes[EDIT_POSITION] = current < 1 ? number : current >= 10 ? number : current * 10 + number
      break
    }
    case '^':
      EDIT_POSITION = 0
      updateTempo(EDIT_POSITION)
      SCROLL = 0
      break
    case '$':
      EDIT_POSITION = MUSIC.tracks[EDIT_TRACK].notes.length - 1
      updateTempo(EDIT_POSITION)
      SCROLL = 0
      break
    default:
      return
  }
  render()
}

function updateTempo(position) {
  const tempos = MUSIC.tempos
  if (position >= tempos.length) {
    position = tempos.length - 1
  }
  for (let i = position; i >= 0; i--) {
    const tempo = tempos[i]
    if (tempo !== 0) {
      MUSIC.tempo = tempo
      return
    }
  }
}

function fileOpen() {
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
  download.download = MUSIC.name + '.txt'
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
  let width = title === null ? 0 : title.length
  for (let i = 0; i < options.length; i++) {
    width = Math.max(width, options[i].length)
  }
  width += 3

  const _height = options.length + 3
  const right = left + width

  let y = top * WIDTH
  let x = left

  if (title !== null) {
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
  }

  for (let i = 0; i < options.length; i++) {
    const name = options[i]
    y += WIDTH
    TERMINAL[y + left - 1] = '&nbsp;'
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
    TERMINAL[y + x + 1] = '&nbsp;'
  }

  y += WIDTH
  x = left
  TERMINAL[y + x - 1] = '&nbsp;'
  do {
    TERMINAL[y + x] = '-'
    x++
  } while (x <= right)
  TERMINAL[y + x] = '&nbsp;'
}

function editor() {
  const track = MUSIC.tracks[EDIT_TRACK]

  const title = track.name

  const top = 3
  const left = 1

  const position = DIALOG_LINE

  const x = left
  let y = top

  sptext(x, y, title)
  y += 2

  let index = 0

  for (let i = 0; i < WAVE_GROUP.length; i++) {
    let text = SYNTH_ARGUMENTS[index] + ' = '
    if (index === WAVE) text += WAVEFORMS[track.parameters[index]]
    else text += track.parameters[index].toFixed(2)
    if (index === position) hisptext(x, y, text)
    else sptext(x, y, text)
    y++
    index++
  }

  y++

  for (let i = 0; i < FREQ_GROUP.length; i++) {
    let text = SYNTH_ARGUMENTS[index] + ' = '
    if (index === FREQ)
      text +=
        diatonic(track.parameters[index] - SEMITONES).toFixed(2) +
        ' HZ (' +
        semitoneName(track.parameters[index] - SEMITONES) +
        ')'
    else if (index === SPEED) text += track.parameters[index].toFixed(3) + ' HZ/SEC'
    else if (index === ACCEL) text += track.parameters[index].toFixed(3) + ' HZ/SEC/SEC'
    else if (index === JERK) text += track.parameters[index].toFixed(3) + ' HZ/SEC/SEC/SEC'
    else text += track.parameters[index].toFixed(2)
    if (index === position) hisptext(x, y, text)
    else sptext(x, y, text)
    y++
    index++
  }

  y++

  for (let i = 0; i < VOLUME_GROUP.length; i++) {
    let text = SYNTH_ARGUMENTS[index] + ' = '
    if (index === SUSTAIN || index === VOLUME) text += (track.parameters[index] * 100).toFixed(0) + ' %'
    else text += track.parameters[index].toFixed(0) + ' MS'
    if (index === position) hisptext(x, y, text)
    else sptext(x, y, text)
    y++
    index++
  }

  y++

  for (let i = 0; i < VIBRATO_GROUP.length; i++) {
    let text = SYNTH_ARGUMENTS[index] + ' = '
    if (index === VIBRATO_WAVE) text += WAVEFORMS[track.parameters[index]]
    else if (index === VIBRATO_FREQ) text += track.parameters[index].toFixed(2) + ' HZ'
    else text += track.parameters[index].toFixed(2)
    if (index === position) hisptext(x, y, text)
    else sptext(x, y, text)
    y++
    index++
  }

  y++

  for (let i = 0; i < TREMOLO_GROUP.length; i++) {
    let text = SYNTH_ARGUMENTS[index] + ' = '
    if (index === TREMOLO_WAVE) text += WAVEFORMS[track.parameters[index]]
    else if (index === TREMOLO_FREQ) text += track.parameters[index].toFixed(2) + ' HZ'
    else text += track.parameters[index].toFixed(2)
    if (index === position) hisptext(x, y, text)
    else sptext(x, y, text)
    y++
    index++
  }

  y++

  for (let i = 0; i < OTHER_GROUP.length; i++) {
    const text = SYNTH_ARGUMENTS[index] + ' = ' + track.parameters[index].toFixed(2)
    if (index === position) hisptext(x, y, text)
    else sptext(x, y, text)
    y++
    index++
  }

  y++

  for (let i = 0; i < HARMONIC_GROUP.length; i++) {
    let text = SYNTH_ARGUMENTS[index] + ' = '
    if (index === HARMONIC_MULT_A || index === HARMONIC_MULT_B || index === HARMONIC_MULT_C)
      text += track.parameters[index] === 1 ? 'OFF' : track.parameters[index].toFixed(2)
    else text += track.parameters[index].toFixed(3)
    if (index === position) hisptext(x, y, text)
    else sptext(x, y, text)
    y++
    index++
  }
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

  const tracks = MUSIC.tracks
  const track = tracks[EDIT_TRACK]

  let names = 0
  let notation = 0
  for (let i = 0; i < tracks.length; i++) {
    const s = tracks[i]
    names = Math.max(names, s.name.length)
    notation = Math.max(notation, s.notes.length)
  }

  const start = names + 2

  const first = 4
  const vertical = HEIGHT - 2 - first
  let count = tracks.length
  if (count > vertical) {
    count = vertical
    if (EDIT_TRACK >= count) {
      const offset = EDIT_TRACK - count + 1
      if (TRACKER > offset) {
        if (EDIT_TRACK < TRACKER) {
          TRACKER = EDIT_TRACK
        }
      } else {
        TRACKER = offset
      }
    } else if (EDIT_TRACK < TRACKER) {
      TRACKER = EDIT_TRACK
    }
  } else if (TRACKER > 0) {
    TRACKER = 0
  }

  if (MUSIC.time > 0) {
    const position = MUSIC.position - 1

    let active = position < track.notes.length ? track.notes[position] : 0
    if (active === 0) {
      text(0, HEIGHT - 1, '-')
    } else {
      let index = position
      if (active < 0) {
        while (index > 0) {
          index--
          if (track.notes[index] >= 0) {
            active = track.notes[index]
            break
          }
        }
      }
      const scale = MUSIC.scale
      const value = active + track.tuning - SEMITONES
      const on = scale.includes(semitoneNoOctave(value))
      let current = semitoneName(value)
      let duration = 1
      for (let n = index + 1; n < track.notes.length; n++) {
        if (track.notes[n] === -1) duration++
        else break
      }
      current += ' / ' + musicNoteDurationName(MUSIC.tempo, duration)
      if (on) text(0, HEIGHT - 1, current)
      else hitext(0, HEIGHT - 1, current)
    }

    const center = Math.floor((WIDTH - start) / 6)
    if (position >= center) {
      const offset = position - center + 1
      if (SCROLL < offset) {
        SCROLL = offset
      }
    }

    for (let t = 0; t < count; t++) {
      const index = TRACKER + t
      const track = tracks[index]
      const name = ' '.repeat(names - track.name.length) + track.name + ':'
      const y = first + t
      if (index === EDIT_TRACK) hisptext(0, y, name)
      else sptext(0, y, name)
      const notes = track.notes
      const size = notes.length
      let x = start
      let n = SCROLL
      while (true) {
        if (n >= size) {
          while (x + 1 < WIDTH) {
            if (n === position) hitext(x, y, '--')
            else text(x, y, '--')
            x += 3
            n++
          }
          break
        } else if (x + 1 >= WIDTH) {
          break
        }
        const note = notes[n]
        if (n === position) {
          if (note === 0) hitext(x, y, '--')
          else if (note === -1) hitext(x, y, '++')
          else if (note < 10) hisptext(x, y, ' ' + note)
          else hitext(x, y, '' + note)
        } else {
          if (note === 0) text(x, y, '--')
          else if (note === -1) text(x, y, '++')
          else if (note < 10) sptext(x, y, ' ' + note)
          else text(x, y, '' + note)
        }
        x += 3
        n++
      }
    }
  } else {
    let active = track.notes[EDIT_POSITION]
    if (active === 0) {
      text(0, HEIGHT - 1, '-')
    } else {
      let index = EDIT_POSITION
      if (active < 0) {
        while (index > 0) {
          index--
          if (track.notes[index] >= 0) {
            active = track.notes[index]
            break
          }
        }
      }
      const scale = MUSIC.scale
      const value = active + track.tuning - SEMITONES
      const on = scale.includes(semitoneNoOctave(value))
      let current = semitoneName(value)
      let duration = 1
      for (let n = index + 1; n < track.notes.length; n++) {
        if (track.notes[n] === -1) duration++
        else break
      }
      current += ' / ' + musicNoteDurationName(MUSIC.tempo, duration)
      if (on) text(0, HEIGHT - 1, current)
      else hitext(0, HEIGHT - 1, current)
    }

    const right = Math.floor((WIDTH - start) / 3) - 4
    if (EDIT_POSITION >= right) {
      const offset = EDIT_POSITION - right + 1
      if (SCROLL > offset) {
        const left = EDIT_POSITION - 4
        if (left < SCROLL) {
          SCROLL = left
        }
      } else {
        SCROLL = offset
      }
    } else if (SCROLL > 0) {
      if (EDIT_POSITION <= 4) {
        SCROLL = 0
      } else {
        const left = EDIT_POSITION - 4
        if (left < SCROLL) {
          SCROLL = left
        }
      }
    }

    for (let t = 0; t < count; t++) {
      const index = TRACKER + t
      const track = tracks[index]
      const name = ' '.repeat(names - track.name.length) + track.name + ':'
      const y = first + t
      if (index === EDIT_TRACK) hisptext(0, y, name)
      else sptext(0, y, name)
      const notes = track.notes
      const size = notes.length
      let x = start
      let n = SCROLL
      while (true) {
        if (n >= size) {
          while (x + 1 < WIDTH) {
            text(x, y, '--')
            x += 3
          }
          break
        } else if (x + 1 >= WIDTH) {
          break
        }
        const note = notes[n]
        if (index === EDIT_TRACK && n === EDIT_POSITION) {
          if (note === 0) hitext(x - 1, y, '[--]')
          else if (note === -1) hitext(x - 1, y, '[++]')
          else if (note < 10) hisptext(x - 1, y, '[ ' + note + ']')
          else hitext(x - 1, y, '[' + note + ']')
        } else {
          if (note === 0) text(x, y, '--')
          else if (note === -1) text(x, y, '++')
          else if (note < 10) sptext(x, y, ' ' + note)
          else text(x, y, '' + note)
        }
        x += 3
        n++
      }
    }
  }

  {
    const tempos = MUSIC.tempos
    const size = tempos.length
    const y = 3
    sptext(0, y, ' '.repeat(names - 'TEMPO'.length) + 'TEMPO:')
    let x = start
    let n = SCROLL
    while (n < size && x + 1 < WIDTH) {
      const value = tempos[n]
      if (value > 0) text(x, y, '' + value)
      x += 3
      n++
    }
  }

  if (STATUS === STATUS_FILE) {
    dialog(null, DIALOG_OPTIONS, 1, 0, DIALOG_LINE)
  } else if (STATUS === STATUS_EDIT) {
    dialog(null, DIALOG_OPTIONS, 1, 7, DIALOG_LINE)
  } else if (STATUS === STATUS_TRACK) {
    dialog(MUSIC.tracks[EDIT_TRACK].name, DIALOG_OPTIONS, 1, 14, DIALOG_LINE)
  } else if (STATUS === STATUS_ABOUT) {
    dialog(null, DIALOG_OPTIONS, 1, 22, DIALOG_LINE)
  } else if (STATUS === STATUS_SYNTHESIZER) {
    editor()
  }

  if (NAME_BOX !== null) {
    const title = NAME_BOX
    const top = 20
    const left = 20
    dialog(title, ['TODO: NAME BOX'], top, left, 0)
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
  if (height === HEIGHT) {
    if (width === WIDTH) {
      return
    }
    SCROLL = 0
  } else {
    if (width !== WIDTH) {
      SCROLL = 0
    }
    TRACKER = 0
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
  return ((30.0 * note) / tempo) * 1000.0
}

function musicNoteDurationName(tempo, note) {
  const time = musicNoteDuration(tempo, note) / 1000.0
  let seconds = time.toFixed(2)
  if (seconds.charAt(0) === '0') seconds = seconds.substring(1)
  const length = seconds.length
  if (seconds.charAt(length - 1) === '0') seconds = seconds.substring(0, length - 1)
  return seconds + ' SEC'
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

function musicPlayNote(tempo, track, note, duration, when, out) {
  const parameters = track.parameters.slice()
  parameters[FREQ] = note + track.tuning
  parameters[LENGTH] = musicNoteDuration(tempo, duration)
  out.push(playSynth(parameters, when))
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
