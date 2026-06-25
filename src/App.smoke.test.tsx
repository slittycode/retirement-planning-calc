// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import App from './App'

afterEach(cleanup)

describe('App', () => {
  it('renders the NZ retirement headline and an assumptions note', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /Retirement Planning — New Zealand/i })).toBeDefined()
    expect(screen.getByText(/How this works & key assumptions/i)).toBeDefined()
  })

  it('shows a headline result for the default scenario', () => {
    render(<App />)
    // Default scenario either lasts or runs out — both render a headline.
    expect(screen.getByText(/your money lasts to age|your savings run out at age/i)).toBeDefined()
  })

  it('uses NZ schemes (NZ Super, KiwiSaver) as the building blocks', () => {
    render(<App />)
    expect(screen.getAllByText(/NZ Super/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/KiwiSaver/i).length).toBeGreaterThan(0)
    // The input controls should be labelled with NZ concepts, not Canadian ones.
    expect(screen.getByText(/Your KiwiSaver rate/i)).toBeDefined()
    expect(screen.getByText(/Include NZ Super/i)).toBeDefined()
  })
})
