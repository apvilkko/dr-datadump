import { describe, it, expect, vi } from 'vitest'
import { readSysex, validateSysex } from './sysex'

describe('sysex', () => {
  describe('validate', () => {
    it('works', () => {
      expect(validateSysex(new Uint8Array([0, 0, 0, 0]))).toBe(false)
      expect(validateSysex(new Uint8Array([0xf0, 0x41, 0, 0xf7]))).toBe(true)
    })
  })

  describe('reader', () => {
    it('works', () => {
      const handler = vi.fn()
      readSysex(
        new Uint8Array([0xf0, 0x41, 0, 0, 0, 0, 1, 0, 2, 0x7d, 0xf7]),
        handler
      )
      expect(handler).toBeCalledWith([new Uint8Array([0, 0, 0, 0, 1, 0, 2])])
    })
  })
})
