import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ActionLogForm } from '@/components/log/ActionLogForm'

// Mock next/navigation hooks
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === 'category') return 'transport'
      if (key === 'subtype') return 'bike'
      if (key === 'quantity') return '8'
      return null
    },
  }),
}))

describe('ActionLogForm Component', () => {
  it('renders successfully with pre-filled query parameters', () => {
    render(<ActionLogForm />)

    // Form header exists
    expect(screen.getByText('Log Environmental Action')).toBeInTheDocument()

    // Query parameters pre-filled: quantity should be 8
    const qtyInput = screen.getByLabelText(/Quantity/i) as HTMLInputElement
    expect(qtyInput.value).toBe('8')

    // Subtype dropdown select holds the pre-filled value or is visible
    const select = screen.getByLabelText(/Action \/ Mode Type/i) as HTMLSelectElement
    expect(select.value).toBe('bike')
  })

  it('validates required inputs on submit', () => {
    render(<ActionLogForm />)

    const qtyInput = screen.getByLabelText(/Quantity/i) as HTMLInputElement
    
    // Clear quantity to trigger validation error
    fireEvent.change(qtyInput, { target: { value: '' } })
    
    const submitBtn = screen.getByRole('button', { name: /Log Carbon Action/i })
    fireEvent.click(submitBtn)

    // Form inputs should enforce native HTML validation or error flags
    expect(qtyInput).toBeRequired()
  })
})
