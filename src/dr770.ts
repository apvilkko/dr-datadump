let i = 0

type Address = Uint8Array

class Message {
  constructor(
    id?: number,
    addr?: Address,
    h?: Dict,
    d?: Dict[],
    r?: Uint8Array
  ) {
    this.id = id ?? 0
    this.address = addr ?? new Uint8Array()
    this.header = h ?? {}
    this.payload = d ?? []
    this.raw = r ?? new Uint8Array()
  }

  log() {
    logDict(
      { id: this.id, address: this.address, length: this.raw.length },
      true
    )
    //this.payload.forEach((p) => logDict(p, true))
    logDict({ raw: this.raw })
  }

  id: number
  address: Address
  payload: Dict[]
  header: Dict
  raw: Uint8Array
}

type Dict = Record<string, number | Uint8Array>

const toSwing = (x: number) => {
  switch (x) {
    case 0:
      return 50
    case 1:
      return 54
    case 2:
      return 58
    case 3:
      return 62
    case 4:
      return 67
    case 5:
      return 71
    case 6:
      return 75
    case 7:
      return 80
    default:
      return -1
    //throw new Error('invalid swing value ' + x)
  }
}

class Pattern {
  constructor(
    id?: number,
    name?: string,
    props?: any,
    links?: Uint8Array[],
    drumkit?: number,
    swing?: number
  ) {
    this.id = id ?? 0
    this.name = name ?? ''
    this.props = props ?? ''
    this.links = links ?? []
    this.drumkit = drumkit ?? 0
    this.swing = swing ?? 0
  }

  id: number
  name: string
  props: any
  links: Uint8Array[]
  drumkit: number
  swing: number

  isEmpty() {
    return this.props.subarray(10).every((x) => x === 0xf)
  }

  log() {
    const emptyStr = this.isEmpty() ? ' | (empty)' : ''
    console.log(
      `Pattern ${this.id}: ${this.name} | drumkit ${
        this.drumkit + 1
      } | swing ${toSwing(this.swing)}${emptyStr}`
    )
    logDict({ props: this.props }, true)
    this.links.forEach((x) => logDict({ link: x }, true))
  }
}

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

const toHex = (n: number) => n.toString(16).padStart(2, '0')

const logArray = (arr: Uint8Array) => {
  const perRow = 350
  let counter = 0
  let out: string[] = []
  const data = [...arr]
  while (counter < data.length) {
    out = [
      ...out,
      ...data.slice(counter, counter + perRow).map((x) => toHex(x)),
    ]
    out.push('\n')
    counter += perRow
  }

  return out.join(' ')
}

const logDict = (dict: Dict, compact = false) => {
  const out: string[] = []
  Object.keys(dict).map((k) =>
    out.push(
      `${k}\t${
        typeof dict[k] === 'number' ? toHex(dict[k]) : logArray(dict[k])
      }`
    )
  )
  console.log(out.join(compact ? ' | ' : '\n'))
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

const readPayload = (addressSet: (x: Address) => void): Dict[] => {
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
}

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

const toChar = (data: Uint8Array) => {
  if (data.length !== 2) {
    throw new Error('expected 2 bytes')
  }
  const charcode = ((data[0] & 0xf) << 4) | (data[1] & 0xf)
  return String.fromCharCode(charcode)
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
    // 0-3: ?
    // 4: swing: 50, 54, 58, 62, 67, 71, 75, 80 %
    // 5-6: ?
    // 7: drumkit
    // 8-9: ?
    // 10-13: all 0f for empty

    pattern.props = message.raw.subarray(i, i + 14)
    if (pattern.props.every((x) => x === 0)) {
      console.log('invalid pattern')
      break
    }
    pattern.drumkit = pattern.props[7]
    pattern.swing = pattern.props[4]

    i += 14

    // Links: 4 * 4 bytes

    pattern.links = []
    for (let b = 0; b < 4; ++b) {
      const link = message.raw.subarray(i + b * 4, i + b * 4 + 4)
      pattern.links.push(link)
    }

    if (pattern.links.some((x) => x.length !== 4)) {
      console.log('invalid pattern')
      break
    }

    i += 16

    patterns.push(pattern)

    if (i >= message.raw.length) {
      break
    }
  }

  return patterns
}
