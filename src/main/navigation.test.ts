import { describe, it, expect } from 'vitest'
import { shouldBlockNavigation } from './navigation'

describe('shouldBlockNavigation', () => {
  it('allows moving between panel routes of the same document', () => {
    expect(shouldBlockNavigation('file:///app/out/renderer/index.html#/checklist', 'file:///app/out/renderer/index.html#/bar')).toBe(false)
    expect(shouldBlockNavigation('http://localhost:5173/#/bar', 'http://localhost:5173/#/checklist')).toBe(false)
    expect(shouldBlockNavigation('file:///app/index.html#/a', 'file:///app/index.html')).toBe(false)
  })

  it('blocks navigating to a dropped file, another page or another origin', () => {
    expect(shouldBlockNavigation('file:///app/out/renderer/index.html#/checklist', 'file:///C:/Users/me/Pictures/cat.png')).toBe(true)
    expect(shouldBlockNavigation('file:///app/index.html#/a', 'file:///app/other.html')).toBe(true)
    expect(shouldBlockNavigation('http://localhost:5173/#/bar', 'http://localhost:5173/other')).toBe(true)
    expect(shouldBlockNavigation('http://localhost:5173/#/bar', 'https://evil.example/')).toBe(true)
    expect(shouldBlockNavigation('file:///app/index.html#/a', 'shimado-asset://asset/abcd1234-ef56')).toBe(true)
    expect(shouldBlockNavigation('file:///app/index.html', 'file:///app/index.html?x=1')).toBe(true)
  })

  it('blocks anything it cannot parse', () => {
    for (const target of ['', 'not a url', 'javascript:alert(1)', 'data:text/html,<h1>x</h1>']) expect(shouldBlockNavigation('file:///app/index.html', target), target).toBe(true)
    expect(shouldBlockNavigation('', 'file:///app/index.html')).toBe(true)
  })
})
