import { logDict } from '../util.ts'
import type { NoteEvent } from './noteevent.ts'

const diffOrEmpty = (a: number, b: number) => (a === b ? '-' : String(a))

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

const toQuantize = (x: number) => {
  switch (x) {
    case 0:
      return 'off'
    case 1:
      return '32nd'
    case 2:
      return '16th T'
    case 3:
      return '16th'
    case 4:
      return '8th T'
    case 5:
      return '8th'
    case 6:
      return 'Q (4)'
    case 7:
      return 'H (2)'
    default:
      return -1
    //throw new Error('invalid quantize value ' + x)
  }
}

export class Pattern {
  constructor(
    id?: number,
    name?: string,
    props?: any,
    links?: number[],
    drumkit?: number,
    swing?: number,
    quantize?: number,
    beatLength?: number,
    dataOffset?: number,
    data?: NoteEvent[]
  ) {
    this.id = id ?? 0
    this.name = name ?? ''
    this.props = props ?? ''
    this.links = links ?? []
    this.drumkit = drumkit ?? 0
    this.swing = swing ?? 0
    this.quantize = quantize ?? 3
    this.beatLength = beatLength ?? 4
    this.dataOffset = dataOffset ?? 0
    this.data = data ?? []
  }

  id: number
  name: string
  props: any
  links: number[]
  drumkit: number
  swing: number
  quantize: number
  beatLength: number
  dataOffset: number
  data: NoteEvent[]

  isEmpty() {
    return this.props.subarray(10).every((x: number) => x === 0xf)
  }

  log() {
    const emptyStr = this.isEmpty() ? ' | (empty)' : ''
    console.log(
      `*******\nPattern ${this.id}: ${this.name} | beat len ${
        this.beatLength
      } | drumkit ${this.drumkit + 1} | swing ${toSwing(
        this.swing
      )}% | quantize ${toQuantize(this.quantize)}${emptyStr}`
    )
    logDict({ props: this.props }, true)
    logDict(
      {
        O: String(this.links[0]),
        FTV: diffOrEmpty(this.links[1], this.links[0]),
        V: diffOrEmpty(this.links[2], this.links[0]),
        FTO: diffOrEmpty(this.links[3], this.links[0]),
      },
      true
    )
    this.data.forEach((x) => x.log())
  }
}
