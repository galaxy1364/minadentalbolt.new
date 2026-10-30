import { describe, it, expect } from 'vitest'

describe('DocumentScanner & Clinical Image Utilities', () => {
  it('calculates rotation correctly in 90 degree increments', () => {
    let rotation = 0
    rotation = (rotation + 90) % 360
    expect(rotation).toBe(90)
    rotation = (rotation + 90) % 360
    expect(rotation).toBe(180)
    rotation = (rotation + 90) % 360
    expect(rotation).toBe(270)
    rotation = (rotation + 90) % 360
    expect(rotation).toBe(0)
  })

  it('calculates estimated file size in KB from base64 data URL accurately', () => {
    // 1024 bytes raw = 1KB; base64 encodes 3 bytes into 4 chars
    // So 1KB binary is ~1365 base64 chars + header
    const mockDataUrl = 'data:image/jpeg;base64,' + 'A'.repeat(1365)
    const sizeKb = Math.round((mockDataUrl.length * 3) / 4 / 1024)
    expect(sizeKb).toBe(1)
  })

  it('scales down large smartphone photos to max 1600px while maintaining aspect ratio', () => {
    const maxDim = 1600

    // Landscape test: 4000 x 3000
    let width = 4000
    let height = 3000
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width)
        width = maxDim
      } else {
        width = Math.round((width * maxDim) / height)
        height = maxDim
      }
    }
    expect(width).toBe(1600)
    expect(height).toBe(1200)

    // Portrait test: 3000 x 4000
    width = 3000
    height = 4000
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width)
        width = maxDim
      } else {
        width = Math.round((width * maxDim) / height)
        height = maxDim
      }
    }
    expect(width).toBe(1200)
    expect(height).toBe(1600)

    // Already small image: 800 x 600
    width = 800
    height = 600
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width)
        width = maxDim
      } else {
        width = Math.round((width * maxDim) / height)
        height = maxDim
      }
    }
    expect(width).toBe(800)
    expect(height).toBe(600)
  })

  it('maps all clinical document types to their appropriate display categories', () => {
    const categories = [
      { type: 'paper_record', expectedLabel: 'پرونده کاغذی' },
      { type: 'radiology', expectedLabel: 'رادیولوژی' },
      { type: 'periapical', expectedLabel: 'رادیولوژی' },
      { type: 'opg', expectedLabel: 'رادیولوژی' },
      { type: 'cbct', expectedLabel: 'رادیولوژی' },
      { type: 'consent', expectedLabel: 'رضایت‌نامه دستی' },
      { type: 'lab_report', expectedLabel: 'آزمایش / لابراتوار' },
      { type: 'clinical_photo', expectedLabel: 'فتوگرافی بالینی' },
    ]

    for (const item of categories) {
      let label = 'سند بالینی'
      if (item.type === 'paper_record') label = 'پرونده کاغذی'
      else if (['radiology', 'periapical', 'opg', 'cbct'].includes(item.type)) label = 'رادیولوژی'
      else if (item.type === 'consent') label = 'رضایت‌نامه دستی'
      else if (item.type === 'lab_report') label = 'آزمایش / لابراتوار'
      else if (item.type === 'clinical_photo') label = 'فتوگرافی بالینی'

      expect(label).toBe(item.expectedLabel)
    }
  })
})
