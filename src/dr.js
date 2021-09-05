const { calculateChecksum } = require('./checksum')
const { NOTE_OFF } = require('./midi')
const { asHex, hArr } = require('./util')
const { die } = require('./utils')

/**
 * @typedef { import("./types").MidiEvent } MidiEvent
 */

const DumpType = {
  All: 0x00,
  Seq: 0x01,
  Kit: 0x02,
  Util: 0x03,
}

const PatternType = {
  Preset: 0x02,
  User: 0x00,
}

const commandStats = {
  stats: {},
}

/**
 * @param {[number, number]} timeSignature
 */
const convertTimeSignature = (timeSignature) => {
  const offset = timeSignature[1] === 4 ? -2 : timeSignature[1] === 8 ? 3 : 0
  if (offset === 0) {
    die('invalid time signature ' + JSON.stringify(timeSignature))
  }
  return timeSignature[0] + offset
}

const le16 = (x) => {
  const buf = Buffer.allocUnsafe(2)
  buf.writeUInt16LE(x)
  return [...buf]
}

/**
 * @param {number} bpm
 */
const convertBpm = (bpm) => {
  const le = le16(bpm * 10)
  //le16(Math.round((bpm - 20) * 10 + 72))
  const over = le[0] > 0x7f
  const flags = over ? 8 : 3
  const out = [over ? le[0] - 0x80 : le[0], le[1], flags]
  console.log('bpm', bpm, le, hArr(out))
  return out
}

const convertChain = (songIndex) => {
  if (typeof songIndex === 'undefined') {
    return [0x7f, 0x7f]
  }
  return [songIndex, 0]
}

const createCommand = ({ address, index, b3, i1, i2, data }) => {
  const i = index || 0
  commandStats.stats[`${asHex(address)}-${asHex(i)}`] = true
  const payload = [address, i, b3 || 0, i1 || 0, i2 || 0, ...data]
  const checksum = calculateChecksum(payload)
  payload.push(checksum)
  return payload
}

/**
 * @param {DumpType} type
 */
const startDump = (type) => createCommand({ address: 0x70, data: [type] })

const patternHeader = (
  patternIndex,
  timeSignature,
  numberOfMeasures,
  drumkitIndex
) =>
  createCommand({
    address: 0x20,
    index: patternIndex,
    data: [
      convertTimeSignature(timeSignature),
      numberOfMeasures,
      drumkitIndex,
      0 /* key transpose not needed */,
      0,
    ],
  })

const concatFn = (a, b) => a.concat(b)

const PACKET_INDEXES = [
  [0, 0],
  [0x01, 0x60],
  [0x03, 0x40],
  [0x05, 0x20],
  [0x07, 0x00],
  [0x08, 0x60],
  [0x0a, 0x40],
  [0x0c, 0x20],
]

const patternData = (patternIndex, data) => {
  const payload = data.reduce(concatFn)

  const packetMax = 32 * 7
  const packets = []
  let currentPacket = []
  let p = 0
  let i = 0
  while (i < payload.length) {
    const packetIndex = Math.floor(i / packetMax)
    if (packetIndex > p) {
      packets.push(currentPacket)
      currentPacket = []
      p++
    }
    currentPacket = currentPacket.concat(payload.slice(i, i + 7))
    i += 7
  }
  if (currentPacket.length) {
    packets.push(currentPacket)
  }

  return packets.reduce((acc, packet, i) => {
    return acc.concat(
      createCommand({
        address: 0x21,
        index: patternIndex,
        i1: PACKET_INDEXES[i][0],
        i2: PACKET_INDEXES[i][1],
        data: packet,
      })
    )
  }, [])
}

const songHeader = (songIndex, bpm, chain) => {
  const tempo = convertBpm(bpm)
  const data = [tempo[0], tempo[1], ...convertChain(chain), tempo[2]]
  console.log('songHeader', data, bpm, convertBpm(bpm))
  return createCommand({
    address: 0x10,
    index: songIndex,
    data,
  })
}

const songPatternList = (songIndex, patterns) =>
  createCommand({
    address: 0x11,
    index: songIndex,
    data: patterns
      .map((x) => [PatternType.User, x, 00])
      .reduce(concatFn)
      .concat([0x7f, 0x7f, 0x03]),
  })

/**
 *
 * @param {MidiEvent} event
 */
const toPatternDataItem = (event) => {
  let offset = 0x7f & event.deltaTime
  let flags = 0
  // TODO flam
  if (event.deltaTime > 0x7f) {
    flags |= 0x20
    offset = 0x7f & (event.deltaTime - 0x80)
  }
  const out = [
    offset,
    event.note,
    event.isBass ? 0x11 : 0x10,
    0x7f & event.velocity,
    0,
    0x7f & event.length,
    flags,
  ]
  if (out.some((x) => x > 0x7f)) {
    console.log('overflow', event, out)
  }
  return out
}

const commands = {
  startDump,
  patternHeader,
  patternData,
  songHeader,
  songPatternList,
}

/**
 *
 * @param {Array<MidiEvent>} events
 * @returns {Array<MidiEvent>}
 */
const noteOffsToLengths = (events) => {
  let i = 0
  const uselessIndexes = events
    .map((x, i) => (!x.isBass && x.event === NOTE_OFF ? i : -1))
    .filter((x) => x !== -1)
  const arr = events.filter((x, i) => !uselessIndexes.includes(i))
  const out = []
  while (i < arr.length) {
    const curr = arr[i]
    let length = 24
    if (curr.isBass) {
      // find the corresponding note off
      let j = i + 1
      let found = false
      while (!found && j < arr.length) {
        const candidate = arr[j]
        if (
          candidate.isBass &&
          candidate.event === NOTE_OFF &&
          candidate.note === curr.note
        ) {
          length = candidate.absoluteTime - curr.absoluteTime
          found = true
        }
        j++
      }
    }
    out.push({ ...curr, length })
    i++
  }

  // Adjust delta times
  for (i = 0; i < out.length; ++i) {
    const j = i + 1
    if (j < out.length) {
      out[i].deltaTime = out[j].absoluteTime - out[i].absoluteTime
    }
  }

  return out
}

const finalizePattern = (data) => {
  return data.concat([0x00, 0x0f, 0, 0, 0, 0, 0x10])
}

/**
 *
 * @param {Array<MidiEvent>} midiEvents
 * @param {{tempo: number, startPattern: number}} songConfig
 * @returns
 */
const convert = (midiEvents, songConfig) => {
  // for now, store everything as 8/4 with 2 measures to pack the most data into one pattern
  const timeSignature = [8, 4]
  const numMeasures = 2
  const tempo = songConfig.tempo || 120

  let startPatternIndex = songConfig.startPattern - 201 || 0
  if (startPatternIndex < 0) {
    startPatternIndex = 0
  }
  let songIndex = songConfig.startSong - 1 || 0
  if (songIndex < 0) {
    songIndex = 0
  }

  const processedEvents = noteOffsToLengths(midiEvents)
  // Take max time from unfiltered data to get the latest possible note off if present
  const maxTime = Math.max.apply(
    Math,
    midiEvents.map((x) => x.absoluteTime)
  )
  const ticksInPattern = timeSignature[0] * 96 * numMeasures
  const amountPatternsNeeded = Math.ceil(maxTime / ticksInPattern)
  console.log(`Need ${amountPatternsNeeded} patterns to store.`)

  const outputPatterns = []
  let currentPattern = []
  let i = 0
  processedEvents.forEach((event) => {
    const currentIndex = Math.floor(event.absoluteTime / ticksInPattern)
    if (currentIndex > i) {
      outputPatterns.push(finalizePattern(currentPattern))
      currentPattern = []
      ++i
    }
    currentPattern.push(toPatternDataItem(event))
  })
  if (currentPattern.length) {
    outputPatterns.push(finalizePattern(currentPattern))
  }

  const out = []
  commandStats.stats = {}
  //out.push(commands.startDump(DumpType.Seq))
  out.push(commands.songHeader(songIndex, tempo))
  out.push(
    commands.songPatternList(
      songIndex,
      outputPatterns.map((x, i) => startPatternIndex + i)
    )
  )
  outputPatterns.forEach((pattern, i) => {
    const index = startPatternIndex + i
    out.push(commands.patternHeader(index, timeSignature, numMeasures, 0))
    out.push(commands.patternData(index, pattern))
  })

  return out
}

module.exports = { convert }
