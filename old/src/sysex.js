const fs = require('fs')
const Parser = require('midi-parser')
const { calculateChecksum } = require('./checksum')
const { die } = require('./utils')

const readSysex = (inFile) => {
  const output = []
  const inData = fs.readFileSync(inFile)

  const parser = new Parser()

  return new Promise((resolve, reject) => {
    parser.on('sysex', (byte, bytes) => {
      if (
        bytes[0] !== 0x10 ||
        bytes[1] !== 0x00 ||
        bytes[2] !== 0x41 ||
        bytes[3] !== 0x12
      ) {
        return
      }
      const payload = bytes.slice(4)
      if (
        calculateChecksum(
          payload.slice(0, payload.length - 1) !== payload[payload.length - 1]
        )
      ) {
        die('checksum mismatch!')
      }
      output.push(payload)
    })
    parser.write(inData)
    setTimeout(() => {
      resolve(output)
    }, 500)
  })
}

module.exports = {
  readSysex,
}
