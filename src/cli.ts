import fs from 'fs'
import { readSysex, validateSysex } from './sysex.ts'
import { handler } from './dr770.ts'

const filename = process.argv[2]
const file = fs.readFileSync(filename)

if (validateSysex(file)) {
  readSysex(file, handler)
}
