let i = 0

type Dict = Record<string, number | Uint8Array>

const context: { data: Uint8Array; outputs: Array<Dict>[] } = {
  data: new Uint8Array(),
  outputs: [],
}

export const handler = (datas: Uint8Array[]) => {
  context.outputs = []
  for (let x = 0; x < datas.length; ++x) {
    const output: Dict[] = []
    context.data = datas[x]
    i = 0
    //add(output, readHeader())
    readHeader()
    add(output, readPayload())
    context.outputs.push(output)
    console.log('Message', x + 1)
    output.forEach((o) => logDict(o, true))
  }
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

const logDict = (dict: Dict, compact = false) => {
  const out: string[] = []
  Object.keys(dict).map((k) =>
    out.push(
      `${k}\t${
        typeof dict[k] === 'number'
          ? toHex(dict[k])
          : [...dict[k]].map((x) => toHex(x)).join(' ')
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

const readPayload = () => {
  const outputs: Dict[] = []
  while (i < context.data.length) {
    const address = context.data.subarray(i, i + 4)
    logDict({ address })
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

// user patterns
const readCommand04 = (address: Uint8Array) => {
  const output: Dict[] = []
  i += 4
  return output
}
