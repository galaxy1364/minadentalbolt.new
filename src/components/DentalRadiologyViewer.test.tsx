// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { DentalRadiologyViewer } from './DentalRadiologyViewer'

afterEach(cleanup)

describe('DentalRadiologyViewer Component', () => {
  const defaultProps = {
    imageUrl: 'https://example.com/xray.jpg',
    title: 'گرافی بایت‌وینگ دندان ۲۶',
    toothNumber: '26',
    onClose: vi.fn(),
  }

  it('renders radiology title and tooth badge', () => {
    render(<DentalRadiologyViewer {...defaultProps} />)
    expect(screen.getByText('گرافی بایت‌وینگ دندان ۲۶')).toBeDefined()
    expect(screen.getByText('دندان #26')).toBeDefined()
  })

  it('toggles diagnostic loupe magnifier tool (2.5x)', () => {
    render(<DentalRadiologyViewer {...defaultProps} />)
    const loupeBtn = screen.getByTitle('ذره‌بین تشخیصی ۲.۵ برابر برای آپکس ریشه و مارجین')
    expect(loupeBtn).toBeDefined()
    expect(screen.getByText('ذره‌بین ۲.۵×')).toBeDefined()

    // Click to activate loupe
    fireEvent.click(loupeBtn)
    expect(loupeBtn.className).toContain('bg-sky-500')

    // Click again to deactivate
    fireEvent.click(loupeBtn)
    expect(loupeBtn.className).not.toContain('bg-sky-500')
  })

  it('toggles caliper tool and applies reset', () => {
    render(<DentalRadiologyViewer {...defaultProps} />)
    const caliperBtn = screen.getByTitle('خط‌کش کالیپر تشخیصی')
    expect(caliperBtn).toBeDefined()

    fireEvent.click(caliperBtn)
    expect(caliperBtn.className).toContain('bg-sky-600')

    // Click reset
    const resetBtn = screen.getByTitle('بازنشانی به حالت پیش‌فرض')
    fireEvent.click(resetBtn)
    expect(caliperBtn.className).not.toContain('bg-sky-600')
  })

  it('handles zoom in and zoom out clicks', () => {
    render(<DentalRadiologyViewer {...defaultProps} />)
    const zoomInBtn = screen.getByTitle('بزرگنمایی')
    const zoomOutBtn = screen.getByTitle('کوچکنمایی')

    fireEvent.click(zoomInBtn)
    expect(screen.getByText('120%')).toBeDefined()
    fireEvent.click(zoomOutBtn)
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0)
  })
})
