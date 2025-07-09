/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

let keys = new Array()

let CANVAS = null

let WIDTH = 0
let HEIGHT = 0

let TERMINAL = null

const MENU = ['PLAY', 'SAVE', 'IMPORT', 'EXPORT']

let CONTEXT = null

let SYNTHS = new Array()

let MUSIC = null

const PITCH_ROWS = 3
const NOTE_START = 4
const NOTE_ROWS = PITCH_ROWS + 1

const MUSIC_SLICE = 100

class Synth {
  constructor(name) {
    this.name = name
  }
}

class SynthSound {
  constructor(content) {
    this.parameters = newSynthParameters()
    try {
      readSoundWad(this.parameters, content)
    } catch (e) {
      console.error(e)
    }
  }

  play() {
    synth(this.parameters)
  }
}

class Music {
  constructor(content) {
    this.origin = 0
    this.time = 0
    this.paused = 0
    this.from = 0
    this.to = 0
    this.length = 0
    this.done = 0
    this.sounds = []

    try {
      const wad = wadParse(content)

      this.name = wad.get('music')
      this.tempo = parseInt(wad.get('tempo'))

      this.tracks = []
      for (const data of wad.get('tracks')) {
        const name = data.get('name')
        const parameters = data.get('parameters')
        const notes = data.get('notes')
        const track = new Track(name)
        track.tuning = parseInt(data.get('tuning'))
        readSynthParameters(track.parameters, parameters)
        for (const note of notes) {
          const a = parseInt(note[0])
          const b = parseInt(note[1])
          const c = parseInt(note[2])
          const d = parseInt(note[3])
          track.notes.push([a, b, c, d])
        }
        this.tracks.push(track)
      }
    } catch (e) {
      console.error(e)
    }

    this.length = musicCalcTiming(this.tempo, this.tracks)
  }

  update() {
    const now = Date.now()

    if (now >= this.done) {
      this.play()
      return
    }

    if (now < this.time) return

    const origin = this.origin
    const start = this.from
    const end = this.to

    const tracks = this.tracks
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
        musicPlayNote(this.tempo, track, note, when, this.sounds)
      }
    }

    this.time += MUSIC_SLICE
    this.from = this.to
    this.to += MUSIC_SLICE
  }

  play() {
    for (const sound of this.sounds) sound.stop()
    this.sounds.length = 0

    const tracks = this.tracks
    const size = tracks.length
    for (let t = 0; t < size; t++) tracks[t].i = 0

    this.time = Date.now()
    this.from = 0
    this.to = this.from + MUSIC_SLICE * 2
    this.origin = synthTime() - this.from / 1000.0
    this.done = this.time + this.length
    this.update()
  }

  pause() {
    for (const sound of this.sounds) sound.stop()
    this.sounds.length = 0
    this.paused = Date.now()
  }

  resume() {
    const difference = Date.now() - this.paused
    this.time += difference
    this.origin += difference / 1000.0
    this.done += difference
  }
}

function main() {
  CANVAS = document.getElementById('canvas')
  CANVAS.style.display = 'block'

  SYNTHS[0] = new Synth('SINE')

  size(20, 20)
  render()
  resize()

  document.onkeyup = up
  document.onkeydown = down

  window.onresize = resize
}

function up(key) {
  keys[key.keyCode] = false
}

function down(key) {
  keys[key.keyCode] = true
  if (key.key == 'i') {
    fileRead()
  } else if (key.key == 'e') {
    fileExport()
  } else if (key.key == 's') {
    fileSave()
  }
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
      MUSIC = new Music(content)
    }
  }
  button.click()
}

function fileExport() {
  const blob = this.music.export()
  const download = document.createElement('a')
  download.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(blob)
  download.download = this.music.name + '.wad'
  download.click()
}

function fileSave() {
  const tape = this.client.tape.name
  const name = this.music.name
  const blob = this.music.export()
  localStorage.setItem('music/name', blob)
  console.info('Saved:', blob)
}

function fileLoad() {
  const blob = localStorage.getItem('music/name')
  console.info('Loading:', blob)
}

function put(x, y, c) {
  TERMINAL[y * WIDTH + x] = c
}

function text(x, y, text) {
  let line = y * WIDTH
  for (let c = 0; c < text.length; c++) {
    TERMINAL[line + x + c] = text[c]
  }
}

function interface() {
  for (let i = 0; i < WIDTH * HEIGHT; i++) {
    TERMINAL[i] = '&nbsp;'
  }

  let m = 0
  for (let i = 0; i < MENU.length; i++) {
    text(m, 0, MENU[i])
    m += 3 + MENU[i].length
  }

  let line = WIDTH
  for (let w = 0; w < WIDTH; w++) {
    TERMINAL[line + w] = '-'
  }

  const status = 'C MAJOR'
  text(WIDTH - status.length, HEIGHT - 1, status)

  for (let i = 0; i < SYNTHS.length; i++) {
    let s = SYNTHS[i]
    let name = s.name + ':'
    text(0, 3 + i, name)
  }
}

function canvas() {
  let string = ''
  for (let h = 0; h < HEIGHT; h++) {
    let line = h * WIDTH
    for (let w = 0; w < WIDTH; w++) {
      string += TERMINAL[line + w]
    }
    string += '</br>'
  }
  CANVAS.innerHTML = string
}

function render() {
  interface()
  canvas()
}

function size(width, height) {
  WIDTH = width
  HEIGHT = height
  TERMINAL = new Array(WIDTH * HEIGHT).fill('&nbsp;')
}

function resize() {
  let x = Math.ceil(CANVAS.clientWidth / WIDTH)
  let y = Math.ceil(CANVAS.clientHeight / HEIGHT)
  let width = Math.floor(window.innerWidth / x)
  let height = Math.floor(window.innerHeight / y)
  if (width == WIDTH && height == HEIGHT) {
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

function wadParse(s) {
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

const MUSIC_SCALE_LIST = [
  'Major',
  'Minor',
  'Pentatonic Major',
  'Pentatonic Minor',
  'Harmonic Major',
  'Harmonic Minor',
  'Melodic Minor',
  'Augmented',
  'Blues',
  'Whole Tone',
  'Algerian',
]

const MUSIC_SCALE = new Map()

MUSIC_SCALE.set('Major', [2, 2, 1, 2, 2, 2, 1])
MUSIC_SCALE.set('Minor', [2, 1, 2, 2, 1, 2, 2])
MUSIC_SCALE.set('Pentatonic Major', [2, 2, 3, 2, 3])
MUSIC_SCALE.set('Pentatonic Minor', [3, 2, 2, 3, 2])
MUSIC_SCALE.set('Harmonic Major', [2, 2, 1, 2, 1, 3, 1])
MUSIC_SCALE.set('Harmonic Minor', [2, 1, 2, 2, 1, 3, 1])
MUSIC_SCALE.set('Melodic Minor', [2, 1, 2, 2, 2, 2, 1])
MUSIC_SCALE.set('Augmented', [3, 1, 3, 1, 3, 1])
MUSIC_SCALE.set('Blues', [3, 2, 1, 1, 3, 2])
MUSIC_SCALE.set('Whole Tone', [2, 2, 2, 2, 2, 2])
MUSIC_SCALE.set('Algerian', [2, 1, 3, 1, 1, 3, 1, 2, 1, 2])

class Track {
  constructor(name) {
    this.name = name
    this.tuning = 0
    this.parameters = newSynthParameters()
    this.notes = []
    this.c = 0
    this.r = 2
    this.save = 0
    this.i = 0
  }
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
const HARMONIC_GROUP = ['Harmonic Mult A', 'Harmonic Gain A', 'Harmonic Mult B', 'Harmonic Gain B', 'Harmonic Mult C', 'Harmonic Gain C']

const SYNTH_ARGUMENTS = [].concat(WAVE_GROUP).concat(FREQ_GROUP).concat(VOLUME_GROUP).concat(VIBRATO_GROUP).concat(TREMOLO_GROUP).concat(OTHER_GROUP).concat(HARMONIC_GROUP)

const SYNTH_IO = SYNTH_ARGUMENTS.map((x) => x.toLowerCase().replaceAll(' ', '-'))

const _INTERVAL = 0
const _INCREMENT = 1

const _COUNT = 1

const rate = 1.0 / SYNTH_RATE
const pi = Math.PI
const tau = 2.0 * pi

function synthTime() {
  return CONTEXT.currentTime
}

function newSynthParameters() {
  return new Array(PARAMETER_COUNT).fill(0)
}

function exportSynthParameters(parameters) {
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

function synth(parameters, when = 0) {
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
    out.push(synth(parameters, when))
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

function readSoundWad(out, content) {
  const wad = parseWad(content)
  const parameters = wad.get('parameters')
  readSynthParameters(out, parameters)
  return wad
}

main()
