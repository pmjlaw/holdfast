import { describe, it, expect } from 'vitest'
import { ENGINE_VERSION } from '../src/index'

describe('engine bootstrap', () => {
  it('exposes a version string', () => {
    expect(ENGINE_VERSION).toBe('0.1.0')
  })
})
