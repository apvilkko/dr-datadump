import type { Dict } from './types.ts'

export const calculateChecksum = (data: Uint8Array) => {
  let sum = 0
  for (let i = 0; i < data.length; ++i) {
    sum = (sum + data[i]) & 0x7f
  }
  return (128 - sum) & 0x7f
}

const toHex = (n: number) => n.toString(16).padStart(2, '0')

const logArray = (arr: Uint8Array, compact = false) => {
  const perRow = 350
  let counter = 0
  let out: string[] = []
  const data = [...arr]
  while (counter < data.length) {
    out = [
      ...out,
      ...data.slice(counter, counter + perRow).map((x) => toHex(x)),
    ]
    if (!compact) {
      out.push('\n')
    }
    counter += perRow
  }

  return out.join(' ')
}

export const logDict = (dict: Dict, compact = false) => {
  const out: string[] = []
  Object.keys(dict).map((k) =>
    out.push(
      `${k}\t${
        typeof dict[k] === 'string'
          ? dict[k]
          : typeof dict[k] === 'number'
          ? toHex(dict[k])
          : logArray(dict[k], compact)
      }`
    )
  )
  console.log(out.join(compact ? ' | ' : '\n'))
}
