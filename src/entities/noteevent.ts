import { logDict } from '../util.ts'

const MIDI_NOTE_NAMES: Record<number, string> = {
  36: 'Kick',
  37: 'Side Stick',
  38: 'Snare',
  39: 'Clap',
  41: 'Fl. Tom',
  42: 'Cl. Hihat',
  44: 'Pd. Hihat',
  45: 'Low Tom',
  46: 'Op. Hihat',
  48: 'Mid Tom',
  49: 'Crash 1',
  57: 'Crash 2',
  53: 'Ride Bell',
  51: 'Ride',
  50: 'Hi Tom',
  56: 'Cowbell',
  69: 'Cabasa',
  75: 'Claves',
  70: 'Maracas',
  58: 'Vibraslap',
  67: 'Hi Agogo',
  68: 'Lo Agogo',
  73: 'Sh. Guiro',
  74: 'Ln. Guiro',
  60: 'Hi Bongo',
  61: 'Lo Bongo',
  66: 'Lo Timbale',
  65: 'Hi Timbale',
  54: 'Tambourine',
  62: 'Hi Conga Mt',
  63: 'Hi Conga Op',
  64: 'Lo Conga Op',
}

const DEFAULT_PAD_MAP = [
  49, 57, 53, 51, 50, 48, 45, 41, 37, 39, 56, 44, 36, 38, 42, 46, 69, 75, 70,
  58, 67, 68, 73, 74, 60, 61, 66, 65, 54, 62, 63, 64,
]

const getNote = (pad: number) => MIDI_NOTE_NAMES[DEFAULT_PAD_MAP[pad]] ?? '?'

export class NoteEvent {
  constructor(
    pad?: number,
    position?: number,
    velocity?: number,
    raw?: Uint8Array
  ) {
    this.pad = pad ?? 0
    this.position = position ?? 0
    this.velocity = velocity ?? 0
    this.raw = raw ?? new Uint8Array()
  }

  pad: number
  position: number
  velocity: number
  raw: Uint8Array

  log() {
    logDict(
      {
        pad: this.pad,
        n: getNote(this.pad),
        velocity: this.velocity,
        pos: this.position,
        raw: this.raw,
      },
      true
    )
  }
}
