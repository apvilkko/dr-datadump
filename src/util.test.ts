import { describe, expect, it } from 'vitest'
import { calculateChecksum } from './util'

describe('util', () => {
  describe('calculateChecksum', () => {
    it('works', () => {
      expect(calculateChecksum(new Uint8Array([0, 0, 2, 0, 0xb, 5]))).toEqual(
        0x6e
      )
    })
  })
})
