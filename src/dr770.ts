import { Message } from './entities/message.ts'
import { NoteEvent } from './entities/noteevent.ts'
import { Pattern } from './entities/pattern.ts'
import type { Dict } from './types.ts'

const BLOCK_SIZE = 96

let i = 0

const context: { data: Uint8Array; messages: Message[]; patterns: Pattern[] } =
  {
    data: new Uint8Array(),
    messages: [],
    patterns: [],
  }

export const handler = (datas: Uint8Array[]) => {
  context.messages = []
  const rawMessages: Message[] = []
  for (let x = 0; x < datas.length; ++x) {
    const message: Message = new Message(x + 1)
    context.data = datas[x]
    i = 0
    message.header = readHeader()
    const [addr, data] = readRawPayload()
    message.address = addr
    message.raw = data
    rawMessages.push(message)
  }

  ;[1, 2, 3, 4].forEach((messageId) => {
    const filtered = rawMessages.filter((m) => m.address[0] === messageId)
    console.log(
      'rawMessages',
      messageId,
      filtered.length,
      filtered.reduce((acc, curr) => acc + curr.raw.length, 0)
    )
    if (messageId === 3 || messageId === 4) {
      // join
      const totalLength = filtered.reduce(
        (acc, curr) => acc + curr.raw.length,
        0
      )
      const joinedBuffer = new Uint8Array(totalLength)
      let offset = 0
      const combined = filtered.reduce((acc, curr) => {
        if (acc.address.length === 0) {
          acc.id = curr.id
          acc.address = curr.address
          acc.header = curr.header
          acc.raw = joinedBuffer
        }
        acc.raw.set(curr.raw, offset)
        offset += curr.raw.length
        return acc
      }, new Message())
      context.messages.push(combined)
    } else {
      context.messages = [...context.messages, ...filtered]
    }
  })

  context.patterns = readCommand04(
    context.messages.filter((x) => x.address[0] === 4)[0]
  )
  context.patterns.forEach((x) => x.log())
}

const readHeader = () => {
  console.log(context.data.subarray(0, 10))
  const data = readBytes(['Device ID', 'Model ID', 'Model ID (2)', 'Command'])
  //logDict(data)
  return data
}

const readBytes = (names: string[]) => {
  const output: Record<string, number> = {}
  for (let x = 0; x < names.length; ++x) {
    output[names[x]] = context.data[i++]
  }
  return output
}

const add = (arr: Dict[], obj: Dict | Dict[]) => {
  if (Array.isArray(obj)) {
    obj.forEach((x) => arr.push(x))
  } else {
    arr.push(obj)
  }
}

const counters = { '03': -1, '03addr': 0 }

const readRawPayload = () => {
  const address = context.data.subarray(i, i + 4)
  i += 4
  const data = context.data.subarray(i)
  return [address, data]
}

/*

...
 08 00 00 04 00 03 00 00 00 00 0f 0f 0f 0f
 
 -- O, FTV, FTO, V links?
 00 03 01 0d
 00 03 01 0d
 00 03 01 0d
 00 03 01 0d
 
 -- pattern name (0x2d = "-")
 02 0d 02 0d 02 0d 02 0d 02 0d 02 0d 02 0d
 
 08 00 00 04 00 03 00 00 00 00 0f 0f 0f 0f
 
 00 03 01 0e
 00 03 01 0e
 00 03 01 0e
 00 03 01 0e
 
 02 0d 02 0d 02 0d 02 0d 02 0d 02 0d 02 0d
 
 08 00 00 04 00 03 00 00 00 00 0f 0f 0f 0f
 
 00 03 01 0f
 00 03 01 0f
 00 03 01 0f
 00 03 01 0f
 
 -- ? note ? t1 t2 t3

 03 03 0e 00 00 00
 03 0b 0e 00 00 00
 02 03 0e 00 00 00
 03 0b 0e 00 03 00
 03 03 0e 00 04 08
 03 0b 0e 00 04 08
 02 03 0e 00 04 08
 03 07 0e 00 06 00
 03 0b 0e 00 06 00
 03 03 0e 00 09 00
 03 0b 0e 00 09 00
 03 0b 0e 00 0a 08
 02 03 0e 00 0a 08
 03 0b 0e 00 0c 00
 03 03 0e 00 0f 00
 03 0b 0e 00 0f 00
 03 0b 0e 00 00 00
 03 03 0e 00 00 00
 03 0b 0e 00 03 00
 03 0b 0e 00 06 00
 03 07 0e 00 06 00
 03 0b 0e 00 09 00
 03 03 0e 00 0c 00
 03 0b 0e 00 0c 00
 03 0b 0e 00 0f 00
 03 07 0e 01 02 00
 03 0b 0e 01 02 00
 03 0b 0e 01 05 00
 03 03 0e 01 08 00
 03 0b 0e 01 08 00
 03 0b 0e 01 0b 00
 03 0a 0a 01 0e 00
 02 03 0e 00 0f 00
 03 0b 0e 01 00 08
 03 07 0e 01 02 00
 03 0b 0e 01 02 00
 03 0f 0e 01 03 08
 03 0b 0e 01 05 00
 02 0b 0e 01 05 00
 03 0b 0e 01 06 08
 03 07 0e 01 02 00
 03 0b 0e 01 02 00
 
 00 00 00 00 00 00 00 00 00 00 00 ...

*/

/*const readPayload = (addressSet: (x: Address) => void): Dict[] => {
  const outputs: Dict[] = []
  while (i < context.data.length) {
    const address = context.data.subarray(i, i + 4)
    addressSet(address)
    //logDict({ address })
    if (context.data[i] === 3) {
      i += 4
      add(outputs, readCommand03(address))
    } else if (context.data[i] === 2) {
      i += 4
      add(outputs, readCommand02(address))
    } else if (context.data[i] === 4) {
      i += 4
      add(outputs, readCommand04(address))
    } else if (context.data[i] === 1) {
      i += 4
      add(outputs, readCommand01(address))
    } else {
      logDict({ data: context.data[i] })
      console.log('*** unknown command at', i)
      i += 4
      break
    }
  }
  return outputs
}*/

const matchAddress = (address: Uint8Array, other: Array<number | string>) =>
  address.length === other.length &&
  other.every((o, i) => o === '*' || o === address[i])

// global
const readCommand01 = (address: Uint8Array) => {
  let dict = {}
  if (matchAddress(address, [1, 0, 0, 0])) {
    // MIDI SW
    dict = readBytes([
      'Sync Mode',
      'Program Change SW',
      'Rx Volume SW',
      'Rx Expression SW',
      'Soft Through SW',
    ])
  } else if (matchAddress(address, [1, 1, 0, 0])) {
    // Roll, Flam, Metronome
    dict = readBytes([
      'Roll Type',
      'Flam Interval',
      'Flam Ratio',
      'Click Level',
      'Click Select',
    ])
  } else if (matchAddress(address, [1, 2, '*', 0])) {
    // Direct Pattern Play
    dict = readBytes([
      'Pattern Number 1',
      'Pattern Number 2',
      'Pattern Number 3',
      'Pattern Number 4',
    ])
  }
  return dict
}

// drum kits
const readCommand02 = (address: Uint8Array) => {
  const output: Dict[] = []
  // "The size of this area is 00 03 12 00"
  i += 4
  return output
}

// songs
const readCommand03 = (address: Uint8Array) => {
  const output: Dict[] = []
  counters['03']++

  const startAddress =
    context.data[i + 3] +
    128 * context.data[i + 2] +
    16384 * context.data[i + 1]
  const indexAtStart = i
  /*console.log(
    'start index',
    i,
    'start',
    startAddress,
    '03addr',
    counters['03addr'],
    startAddress - counters['03addr']
  )*/

  //console.log('Address: 03', counters['03'], startAddress)
  let readData = 0
  for (let r = 0; r < 31; r++) {
    //console.log(context.data.subarray(i + 8 * r, i + 8 * r + 8))
    i += 8
    readData += 8
  }
  //console.log('at the end', readData, startAddress, i - indexAtStart)
  counters['03addr'] = indexAtStart + startAddress
  return output
}

const readNibbles = (data: Uint8Array, expected = 2) => {
  if (data.length !== expected) {
    throw new Error(`expected ${expected} bytes, got ${data.length}`)
  }
  let result = 0
  for (let ii = 0; ii < expected; ++ii) {
    result += (data[expected - 1 - ii] & 0xf) << (4 * ii)
  }
  return result
}

const toChar = (data: Uint8Array) => {
  return String.fromCharCode(readNibbles(data))
}

const readPatternData = (
  data: Uint8Array,
  startOffset: number,
  offsets: number[]
) => {
  let lastPos = 0
  const notes: NoteEvent[] = []

  for (let o = 0; o < offsets.length; ++o) {
    const offset = startOffset + offsets[o] * BLOCK_SIZE
    const block = data.subarray(offset, offset + BLOCK_SIZE)
    let c = 0
    while (true) {
      if (c >= block.length) {
        break
      }
      const raw = block.subarray(c, c + 6)
      // first 6 bits = pad number
      const pad = readNibbles(block.subarray(c, c + 2)) >> 2
      // next 5 bits = velocity
      const velocity =
        (readNibbles(block.subarray(c + 1, c + 3)) >> 1) & 0b11111
      // rest = position (maybe includes one bit extra ?)
      const pos = readNibbles(block.subarray(c + 3, c + 6), 3)

      if (pos < lastPos) {
        // no more valid notes in this block
        break
      }

      const ne = new NoteEvent(pad, pos, velocity, raw)
      notes.push(ne)
      c += 6
      lastPos = pos
    }
  }

  return notes
}

// user patterns
const readCommand04 = (message: Message): Pattern[] => {
  const patterns: Pattern[] = []
  i = 0

  while (true) {
    const pattern = new Pattern(i)

    // Name: 7 * 2 bytes
    const nameArr = []
    for (let b = 0; b < 7; b++) {
      nameArr.push(toChar(message.raw.subarray(i + 2 * b, i + 2 * b + 2)))
    }
    pattern.name = nameArr.join('')

    i += 14

    // Properties: 14 bytes
    // 08 00 00 04 00 03 00 00 00 00 0f 0f 0f 0f
    // 08 00 00 04 00 03 00 01 00 00 00 00 00 05

    // Bytes
    // 0-1: ?, 08 00 normally, 04 00 on swung patterns
    // 2-3: beat length
    // 4: swing: 50, 54, 58, 62, 67, 71, 75, 80 %
    // 5: quantize: off=0, 32=1, 16t=2, 16=3, 8t=4, 8=5, 4=6, 2=7
    // 6-7: drumkit
    // 8-9: ?
    // 10-13: offset to pattern memory (*BLOCK_SIZE), all 0f for empty

    pattern.props = message.raw.subarray(i, i + 14)
    if (pattern.props.every((x) => x === 0)) {
      console.log('invalid pattern')
      i -= 14
      break
    }
    pattern.drumkit = readNibbles(pattern.props.subarray(6, 8))
    pattern.swing = pattern.props[4]
    pattern.quantize = pattern.props[5]
    pattern.beatLength = readNibbles(pattern.props.subarray(2, 4))
    pattern.dataOffset = readNibbles(pattern.props.subarray(10, 14), 4)

    i += 14

    // Links: 4 * 4 bytes: O - FTV - V - FTO
    pattern.links = []
    for (let b = 0; b < 4; ++b) {
      const link =
        readNibbles(message.raw.subarray(i + b * 4, i + b * 4 + 4), 4) + 1
      pattern.links.push(link)
    }

    if (pattern.links.some((x) => x < 401 || x > 800)) {
      // user patterns are 401-800
      i -= 28
      break
    }

    i += 16

    pattern.id = pattern.links[0]
    patterns.push(pattern)

    if (i >= message.raw.length) {
      break
    }
  }

  console.log('broke at', i, message.raw.length)
  //logDict({ raw: message.raw.subarray(i) })

  const startPos = i

  const blockOffsetTable: Record<number, number> = {}
  i = message.raw.length - 4200
  let index = 0
  while (i < message.raw.length) {
    const blockOffset = readNibbles(message.raw.subarray(i, i + 4), 4)
    blockOffsetTable[index] = blockOffset
    index++
    i += 4
  }

  patterns.forEach((p) => {
    const offsets = getBlockOffsets(p.dataOffset, blockOffsetTable)
    p.data = readPatternData(message.raw, startPos, offsets)
  })

  return patterns
}

const getBlockOffsets = (
  offset: number,
  blockOffsetTable: Record<number, number>
) => {
  const out: number[] = [offset]
  let current = offset
  while (true) {
    current = blockOffsetTable[current]
    if (typeof current === 'undefined' || current > 65530) {
      break
    }
    out.push(current)
  }
  return out
}
