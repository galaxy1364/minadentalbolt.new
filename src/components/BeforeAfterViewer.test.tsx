// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { BeforeAfterViewer } from '../components/BeforeAfterViewer'

afterEach(cleanup)

describe('BeforeAfterViewer Component', () => {
  const defaultProps = {
    beforeUrl: 'https://example.com/before.jpg',
    afterUrl: 'https://example.com/after.jpg',
    title: 'ترمیم زیبایی دندان ۱┘',
    procedureName: 'کامپوزیت ونیر',
    beforeDate: '2026-08-01',
    afterDate: '2026-08-20',
    onClose: vi.fn(),
  }

  it('renders title and procedure name correctly', () => {
    render(<BeforeAfterViewer {...defaultProps} />)
    expect(screen.getByText('ترمیم زیبایی دندان ۱┘')).toBeDefined()
    expect(screen.getByText('کامپوزیت ونیر')).toBeDefined()
  })

  it('renders mode switch buttons and switches mode', () => {
    render(<BeforeAfterViewer {...defaultProps} />)
    const sideBySideBtn = screen.getByText('کنار هم')
    expect(sideBySideBtn).toBeDefined()
    fireEvent.click(sideBySideBtn)
    expect(screen.getByText('اسلایدر شناور')).toBeDefined()
  })

  it('calls onClose when close button is clicked', () => {
    render(<BeforeAfterViewer {...defaultProps} />)
    const closeBtn = screen.getByLabelText('بستن پنجره')
    fireEvent.click(closeBtn)
    expect(defaultProps.onClose).toHaveBeenCalled()
  })
})
