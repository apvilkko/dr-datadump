const fs = require('fs')

const asHex = (g) => g.toString(16).padStart(2, '0')

const die = (msg) => {
  console.log(msg)
  process.exit(1)
}

const readVarLen = (d, i) => {
  let c
  let p = i
  let value = d[p]
  p++

  if (value & 0x80) {
    value = value & 0x7f
    do {
      c = d[p]
      p++
      value = (value << 7) + (c & 0x7f)
    } while (c & 0x80)
  }
  return [value, p]
}

const readMidiFile = (filename, isBass) => {
  const inFile = filename
  const inData = fs.readFileSync(inFile)
  let pos = 0

  const out = []

  while (pos < inData.length - 1) {
    const chunkType = inData.slice(pos, pos + 4).toString()
    if (chunkType === 'MThd') {
      pos += 4
      const len = inData.readInt32BE(pos)
      pos += 4
      const format = inData.readInt16BE(pos)
      if (format !== 0) {
        die('Only MIDI format 0 supported!')
      }
      pos += 2
      const ntrks = inData.readInt16BE(pos)
      if (ntrks !== 1) {
        die('Invalid ntrks!')
      }
      pos += 2
      const division = inData.readInt16BE(pos)
      if (division !== 96) {
        die('Only division 96 supported!')
      }
      pos += 2
      console.log(chunkType, len, format, ntrks, division)
    } else if (chunkType === 'MTrk') {
      pos += 4
      const trackLen = inData.readInt32BE(pos)
      pos += 4
      const trackStart = pos
      console.log(chunkType, trackLen)
      let note,
        velocity,
        absoluteTime = 0
      while (pos < trackStart + trackLen) {
        let ret = readVarLen(inData, pos)
        const deltaTime = ret[0]
        pos = ret[1]
        const event = inData[pos++]
        absoluteTime += deltaTime
        process.stdout.write(deltaTime + ' ' + asHex(event) + ' ')
        switch (event) {
          case 0xff:
            // meta
            const metaType = inData[pos++]
            ret = readVarLen(inData, pos)
            const metaLen = ret[0]
            pos = ret[1]
            console.log('meta', metaLen, inData.slice(pos, pos + metaLen))
            pos += metaLen
            break
          case 0xc0:
            // program change
            const data = inData[pos++]
            console.log('program change', data)
            break
          case 0x90:
            // note on
            note = inData[pos++]
            velocity = inData[pos++]
            console.log('note on', note, velocity)
            out.push({ absoluteTime, deltaTime, event, note, velocity, isBass })
            break
          case 0x80:
            // note off
            note = inData[pos++]
            velocity = inData[pos++]
            console.log('note off', note, velocity)
            out.push({ absoluteTime, deltaTime, event, note, velocity, isBass })
            break
          default:
            die('not handled event ' + asHex(event))
        }
      }
    } else {
      pos += 4
    }
  }
  return out
}

module.exports = {
  readMidiFile,
}
