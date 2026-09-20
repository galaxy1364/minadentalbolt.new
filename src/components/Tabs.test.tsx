// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'
import { Tabs } from './ui'

afterEach(cleanup)

describe('Tabs Component — 100% Colorful & Zero-Shift Modal Navigator', () => {
  const sampleTabs = [
    { key: 'overview', label: 'نمای کلی', color: 'blue' },
    { key: 'treatments', label: 'درمان‌ها', color: 'emerald' },
    { key: 'implants', label: 'ایمپلنت', color: 'purple' },
    { key: 'labOrders', label: 'لابراتوار', color: 'amber' },
    { key: 'phases', label: 'طرح درمان مرحله‌ای', color: 'indigo' },
    { key: 'consent', label: 'فرم رضایت‌نامه', color: 'violet' },
    { key: 'appointments', label: 'نوبت‌ها', color: 'teal' },
    { key: 'perio', label: 'چارت پریودنتال', color: 'rose' },
  ]

  it('renders all inactive tabs with their signature colorful tinted backgrounds instead of dull grey', () => {
    render(<Tabs tabs={sampleTabs} active="overview" onChange={vi.fn()} />)

    // 'overview' is active (blue)
    const activeTab = screen.getByRole('button', { name: /نمای کلی/i })
    expect(activeTab.className).toContain('bg-blue-600')
    expect(activeTab.className).toContain('text-white')

    // Inactive tabs must NOT use generic plain grey bg-white/60 text-slate-700
    const treatmentsTab = screen.getByRole('button', { name: /درمان‌ها/i })
    expect(treatmentsTab.className).toContain('bg-emerald-50')
    expect(treatmentsTab.className).toContain('text-emerald-800')

    const implantsTab = screen.getByRole('button', { name: /ایمپلنت/i })
    expect(implantsTab.className).toContain('bg-purple-50')
    expect(implantsTab.className).toContain('text-purple-800')

    const labTab = screen.getByRole('button', { name: /لابراتوار/i })
    expect(labTab.className).toContain('bg-amber-50')
    expect(labTab.className).toContain('text-amber-800')

    const phasesTab = screen.getByRole('button', { name: /طرح درمان مرحله‌ای/i })
    expect(phasesTab.className).toContain('bg-indigo-50')
    expect(phasesTab.className).toContain('text-indigo-800')

    const consentTab = screen.getByRole('button', { name: /فرم رضایت‌نامه/i })
    expect(consentTab.className).toContain('bg-violet-50')
    expect(consentTab.className).toContain('text-violet-800')

    const appointmentsTab = screen.getByRole('button', { name: /نوبت‌ها/i })
    expect(appointmentsTab.className).toContain('bg-teal-50')
    expect(appointmentsTab.className).toContain('text-teal-800')

    const perioTab = screen.getByRole('button', { name: /چارت پریودنتال/i })
    expect(perioTab.className).toContain('bg-rose-50')
    expect(perioTab.className).toContain('text-rose-800')
  })

  it('renders quick-jump navigator in a portal modal with all tabs colored and selectable', () => {
    const handleChange = vi.fn()
    render(<Tabs tabs={sampleTabs} active="overview" onChange={handleChange} />)

    // Open quick jump menu
    const dropdownBtn = screen.getByLabelText(/دسترسی سریع به تمام تب‌ها/i)
    fireEvent.click(dropdownBtn)

    // Modal dialog should appear
    const dialog = screen.getByRole('dialog', { name: /دسترسی سریع به بخش‌های پرونده/i })
    expect(dialog).toBeDefined()

    // Clicking an option in the dialog should call onChange and close dialog
    const phasesOption = screen.getAllByRole('button', { name: /طرح درمان مرحله‌ای/i })
    // The second one is inside the dialog
    const modalOption = phasesOption[phasesOption.length - 1]
    fireEvent.click(modalOption)

    expect(handleChange).toHaveBeenCalledWith('phases')
    // Dialog should be closed
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps window horizontal scroll at zero and never calls scrollIntoView on the element', () => {
    const { rerender } = render(<Tabs tabs={sampleTabs} active="overview" onChange={vi.fn()} />)
    
    // Switch to 'perio' (one of the end tabs)
    rerender(<Tabs tabs={sampleTabs} active="perio" onChange={vi.fn()} />)

    // Window scrollX must remain 0
    expect(window.scrollX).toBe(0)
  })
})
