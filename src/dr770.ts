let i = 0
const context: { data: Uint8Array } = { data: new Uint8Array() }

export const handler = (data: Uint8Array) => {
  context.data = data
  readHeader()
  readPayload()
}

const readHeader = () => {
  console.log(context.data.subarray(0, 10))
  const data = readBytes(['Device ID', 'Model ID', 'unknown', 'Command'])
  logDict(data)
}

const readBytes = (names: string[]) => {
  const output: Record<string, number> = {}
  for (let x = 0; x < names.length; ++x) {
    output[names[x]] = context.data[i++]
  }
  return output
}

const logDict = (dict: Record<string, number | Uint8Array>) => {
  Object.keys(dict).map((k) =>
    console.log(
      k,
      '\t',
      typeof dict[k] === 'number'
        ? dict[k].toString(16).padStart(2, '0')
        : dict[k]
    )
  )
}

const counters = { '03': -1, '03addr': 0 }

const readPayload = () => {
  while (true) {
    logDict({ address: context.data.subarray(i, i + 4) })
    if (context.data[i] === 3) {
      readCommand03()
    } else if (context.data[i] === 1) {
      readCommand01()
    } else {
      logDict({ data: context.data[i] })
      console.log('unknown command at', i)
      break
    }
  }
}

// global
const readCommand01 = () => {
  // TODO
  i += 4
}

// songs
const readCommand03 = () => {
  counters['03']++

  const startAddress =
    context.data[i + 3] +
    128 * context.data[i + 2] +
    16384 * context.data[i + 1]
  const indexAtStart = i
  console.log(
    'start index',
    i,
    'start',
    startAddress,
    '03addr',
    counters['03addr'],
    startAddress - counters['03addr']
  )
  i += 4 // skip the address itself

  console.log('Address: 03', counters['03'], startAddress)
  let readData = 0
  for (let r = 0; r < 31; r++) {
    console.log(context.data.subarray(i + 8 * r, i + 8 * r + 8))
    i += 8
    readData += 8
  }
  console.log('at the end', readData, startAddress, i - indexAtStart)
  counters['03addr'] = indexAtStart + startAddress
}
