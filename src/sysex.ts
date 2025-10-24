export const validateSysex = (data: Uint8Array) => {
  return data[0] === 0xf0 && data[1] === 0x41 && data[data.length - 1] === 0xf7
}

export const readSysex = (data: Uint8Array, handler: (x: Uint8Array) => void) => 
  handler(data.subarray(2, data.length - 1))
