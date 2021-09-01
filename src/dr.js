const { die } = require('./utils')

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

const calculateChecksum = (data) => {
  let sum = 0
  for (let i = 0; i < data.length; ++i) {
    sum = (sum + data[i]) & 0x7f
  }
  return (128 - sum) & 0x7f
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
  buf.writeInt16LE(x)
  return [...buf]
}

/**
 * @param {number} bpm
 */
const convertBpm = (bpm) => le16(Math.round((bpm - 20) * 10 + 72))

const convertChain = (songIndex) => {
  if (typeof songIndex === 'undefined') {
    return [0x7f, 0x7f]
  }
  return [songIndex, 0]
}

const createCommand = ({ address, index, b3, i1, i2, data }) => {
  const payload = [address, index || 0, b3 || 0, i1 || 0, i2 || 0, ...data]
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

const songHeader = (songIndex, bpm, chain) =>
  createCommand({
    address: 0x10,
    index: songIndex,
    data: [
      ...convertBpm(bpm),
      ...convertChain(chain),
      0x0b /* default flags */,
    ],
  })

const concatFn = (a, b) => a.concat(b)

const songPatternList = (songIndex, patterns) =>
  createCommand({
    address: 0x11,
    index: songIndex,
    data: patterns
      .map((x) => [PatternType.User, x, 00])
      .reduce(concatFn)
      .concat([0x7f, 0x7f, 0x03]),
  })

const commands = {
  startDump,
  patternHeader,
  songHeader,
  songPatternList,
}

const convert = (midiEvents, songConfig) => {
  // time signature assumed 4/4 for now
  const timeSignature = [4, 4]
  const tempo = songConfig.tempo || 120
  let startPatternIndex = songConfig.startPattern - 201 || 0
  if (startPatternIndex < 0) {
    startPatternIndex = 0
  }

  const out = []
  out.push(commands.startDump(DumpType.Seq))

  return out.reduce(concatFn)
}

module.exports = { convert }
