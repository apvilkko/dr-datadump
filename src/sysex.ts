import { calculateChecksum } from './util.ts'

const SYSEX_START = 0xf0
const SYSEX_END = 0xf7

export const validateSysex = (data: Uint8Array) => {
  return (
    data[0] === SYSEX_START &&
    data[1] === 0x41 &&
    data[data.length - 1] === SYSEX_END
  )
}

export const readSysex = (
  data: Uint8Array,
  handler: (x: Uint8Array[]) => void
) => {
  const segments: { start: number; end: number }[] = []
  let i = 0
  let inSegment = false
  let currentSegment: { start: number; end: number }
  while (i < data.length) {
    const searchFor = inSegment ? SYSEX_END : SYSEX_START
    if (data[i] === searchFor) {
      if (!inSegment) {
        currentSegment = { start: i, end: -1 }
        inSegment = true
      } else {
        currentSegment!.end = i
        segments.push(currentSegment!)
        currentSegment = { start: -1, end: -1 }
        inSegment = false
      }
    }
    i++
  }

  const subarrays = segments.map((s) => {
    const checksum = data[s.end - 1]
    const subarray = data.subarray(s.start + 2, s.end - 1)
    const calculated = calculateChecksum(subarray.subarray(4))
    if (checksum !== calculated) {
      console.log(subarray, checksum.toString(16), calculated.toString(16))
      throw new Error('checksum mismatch')
    }
    return subarray
  })

  return handler(subarrays)
}
