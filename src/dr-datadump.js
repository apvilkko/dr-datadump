const fs = require('fs')
const Parser = require('midi-parser')
const hex = require('hex')

const inFile = process.argv[2]
const inData = fs.readFileSync(inFile)

const asHex = (g) => g.toString(16).padStart(2, '0')
const hArr = (arr) => arr.map((x) => asHex(x)).join(' ')

// Starting from #35 = B0
const MIDI_DRUM_MAP = [
  'Acoustic Bass Drum',
  'Bass Drum',
  'Side Stick',
  'Acoustic Snare',
  'Hand Clap',
  'Electric Snare',
  'Low Floor Tom',
  'Closed Hi Hat',
  'High Floor Tom',
  'Pedal Hi-Hat',
  'Low Tom',
  'Open Hi-Hat',
  'Low-Mid Tom',
  'Hi-Mid Tom',
  'Crash Cymbal 1',
  'High Tom',
  'Ride Cymbal 1',
  'Chinese Cymbal',
  'Ride Bell',
  'Tambourine',
  'Splash Cymbal',
  'Cowbell',
  'Crash Cymbal 2',
  'Vibraslap',
  'Ride Cymbal 2',
  'Hi Bongo',
  'Low Bongo',
  'Mute Hi Conga',
  'Open Hi Conga',
  'Low Conga',
  'Hi Timbale',
  'Low Timbale',
  'Hi Agogo',
  'Low Agogo',
  'Cabasa',
  'Maracas',
  'Short Whistle',
  'Long Whistle',
  'Short Guiro',
  'Long Guiro',
  'Claves',
  'Hi Wood Block',
  'Low Wood Block',
  'Mute Cuica',
  'Open Cuica',
  'Mute Triangle',
  'Open Triangle',
]

const humanReadableDrum = (midiNote) => MIDI_DRUM_MAP[midiNote - 35] || ''

const stats = {}

const doStats = (i, data) => {
  if (!stats[i]) {
    stats[i] = {}
  }
  const value = asHex(data[i])
  if (!stats[i][value]) {
    stats[i][value] = 0
  }
  stats[i][value]++
}

const ROOT = 0x24
const notes = [
  'C-',
  'C#',
  'D-',
  'D#',
  'E-',
  'F-',
  'F#',
  'G-',
  'G#',
  'A-',
  'A#',
  'B',
]
const toMidiNote = (note) => {
  const octave = Math.floor((note - ROOT) / notes.length) + 1
  const n = notes[(note - ROOT) % notes.length]
  return n ? `${n}${octave}` : '---'
}

const NOTE_LENGTHS = [
  [6, '𝅘𝅥𝅱'],
  [9, '𝅘𝅥𝅱𝅭'],
  [12, '𝅘𝅥𝅰'],
  [18, '𝅘𝅥𝅰𝅭'],
  [24, '𝅘𝅥𝅯'],
  [36, '𝅘𝅥𝅯𝅭'],
  [48, '𝅘𝅥𝅮'],
  [72, '𝅘𝅥𝅮𝅭'],
  [96, '𝅘𝅥'],
  [144, '𝅘𝅥𝅭'],
]

const formatLength = (nL) => {
  let out = ''
  if (!nL) {
    return out
  }
  for (let i = 0; i < NOTE_LENGTHS.length; ++i) {
    const prev = (NOTE_LENGTHS[i - 1] || [0])[0]
    const cur = NOTE_LENGTHS[i]
    const next = (NOTE_LENGTHS[i + 1] || [1000])[0]
    const deltaPrev = Math.abs(prev - nL)
    const deltaCur = Math.abs(cur[0] - nL)
    const deltaNext = Math.abs(next - nL)
    if (
      nL >= prev &&
      nL <= next &&
      deltaCur <= deltaPrev &&
      deltaCur < deltaNext
    ) {
      return cur[1]
    }
  }
  return out
}

const output = []

const log = (a, ...params) => {
  output.push(`${a || ''} ${params.join(' ')}`)
}

const parser = new Parser()
parser.on('midi', (cmd, channel, bytes) => {
  log('midi', asHex(cmd), channel)
  hex(bytes)
})

const patterns = {}

const toPatternName = (id) => `(Pattern ${201 + id})`

parser.on('sysex', (byte, bytes) => {
  log()
  if (byte !== 0x41) {
    log('sysex', asHex(byte))
  }
  if (
    bytes[0] !== 0x10 ||
    bytes[1] !== 0x00 ||
    bytes[2] !== 0x41 ||
    bytes[3] !== 0x12
  ) {
    log(hArr(bytes.slice(0, 4)))
  }
  const payload = bytes.slice(4)
  //;[0, 1, 2, 3, 4].forEach((x) => doStats(x, payload))
  if (payload[0] === 0x20) {
    // Pattern header
    const patternId = payload[1]
    log(hArr(payload), toPatternName(patternId))
    const timeSignature = payload[5] || 0
    const measures = payload[6] || 0
    const barDivision = timeSignature <= 6 ? 4 : 8
    const offset = timeSignature <= 6 ? 2 : -3
    const pulses = timeSignature + offset
    patterns[patternId] = {
      timeSignature: [pulses, barDivision],
      measures,
      expectedLength: (96 * pulses * measures) / (barDivision === 4 ? 1 : 2),
      length: [0, 0],
    }
  } else if (payload[0] === 0x21 || payload[0] === 0x22) {
    let pos = 0
    const patternId = payload[1]
    const isFill = payload[0] === 0x22
    log(hArr(payload.slice(0, 5)))
    pos += 5
    while (pos < payload.length) {
      const slice = payload.slice(pos, pos + 7)
      const isDrum = slice[2] === 0x10
      const hrNote = slice[1] ? toMidiNote(slice[1]) : '---'
      const noteOffset = slice[0]
      const flags = slice[slice.length - 1]
      const flam = isDrum && flags & 0x4
      const isRest = flags & 0x10
      const fullPayload = slice.length === 7
      const nLength = slice[5]
      if (fullPayload) {
        if (slice[4] !== 0) {
          console.log(patternId, toPatternName(patternId), slice[4])
        }
        const long = flags & 0x20
        const lengthIndex = isFill ? 1 : 0
        patterns[patternId].length[lengthIndex] +=
          noteOffset + (long ? 0x80 : 0)
        doStats(4, slice)
        doStats(6, slice)
      }
      log(
        hArr(slice),
        ' ',
        hrNote,
        isDrum ? 'DR' : slice[2] === 0x11 ? 'BS' : '--',
        formatLength(nLength),
        isRest && fullPayload
          ? 'nop'
          : isDrum
          ? humanReadableDrum(slice[1])
          : '',
        flam ? '(flam)' : ''
      )
      pos += 7
    }
  } else {
    log(hArr(payload), `(${payload.length} bytes)`)
  }
  //log(hArr(payload.slice(0, 5)), `(${payload.length} bytes)`)
})
parser.write(inData)
setTimeout(() => {
  log('stats', JSON.stringify(stats, null, 2))
  const outfilename = process.argv[3]

  Object.keys(patterns).forEach((id) => {
    const delta1 = patterns[id].length[0] - patterns[id].expectedLength
    const delta2 = patterns[id].length[1] - patterns[id].expectedLength
    const hasPattern = patterns[id].length[0] !== 0
    const hasFill = patterns[id].length[1] !== 0
    if (!hasPattern) {
      log(id, toPatternName(Number(id)), 'empty pattern')
    } else {
      log(
        id,
        toPatternName(Number(id)),
        patterns[id].expectedLength,
        patterns[id].length[0],
        patterns[id].length[1],
        patterns[id].timeSignature,
        patterns[id].measures,
        delta1,
        hasFill ? delta2 : '',
        delta1 !== 0 ? 'MISMATCH' : '',
        hasFill ? (delta2 !== 0 ? 'MISMATCH' : '') : ''
      )
    }
  })

  fs.writeFileSync(outfilename, output.join('\n'), { encoding: 'utf-8' })
}, 500)
