import type { Address, Dict } from '../types.ts'
import { logDict } from '../util.ts'

export class Message {
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
