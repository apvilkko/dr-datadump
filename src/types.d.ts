export type MidiEvent = {
  absoluteTime: number
  deltaTime: number
  event: number
  note: number
  velocity: number
  isBass: boolean
  length?: number
}
