import { describe, it, expect } from 'vitest'
import { MAX_NOTES_LENGTH, MAX_PAGES, MAX_TITLE_LENGTH, sanitizePages } from './notes'

const page = (id: string, title = 'T', text = '') => ({ id, title, text })

describe('sanitizePages', () => {
  it('turns the old single note into page 1', () => {
    expect(sanitizePages(undefined, undefined, 'remember milk')).toEqual({
      pages: [{ id: 'page-1', title: 'Page 1', text: 'remember milk' }],
      activePage: 'page-1'
    })
  })
  it('gives a blank page for missing or junk input', () => {
    const blank = { pages: [{ id: 'page-1', title: 'Page 1', text: '' }], activePage: 'page-1' }
    expect(sanitizePages(undefined, undefined, undefined)).toEqual(blank)
    expect(sanitizePages('x', 5, 5)).toEqual(blank)
    expect(sanitizePages([], 'a', '')).toEqual(blank)
    expect(sanitizePages([null, 3, { id: '' }], undefined, undefined)).toEqual(blank)
  })
  it('prefers saved pages over the old note', () => {
    const out = sanitizePages([page('a', 'One', 'hi')], 'a', 'old')
    expect(out.pages).toEqual([page('a', 'One', 'hi')])
  })
  it('caps text, titles and the page count, and drops duplicate ids', () => {
    const many = Array.from({ length: MAX_PAGES + 5 }, (_, i) => page(`p${i}`))
    expect(sanitizePages(many, 'p0', undefined).pages).toHaveLength(MAX_PAGES)
    const out = sanitizePages([page('a', 'x'.repeat(100), 'y'.repeat(MAX_NOTES_LENGTH + 10)), page('a', 'dup')], 'a', undefined)
    expect(out.pages).toHaveLength(1)
    expect(out.pages[0].title).toHaveLength(MAX_TITLE_LENGTH)
    expect(out.pages[0].text).toHaveLength(MAX_NOTES_LENGTH)
  })
  it('uses a default title when the saved one is empty or not a string', () => {
    const out = sanitizePages([page('a', '   '), { id: 'b', title: 7, text: 'z' }], 'a', undefined)
    expect(out.pages.map((p) => p.title)).toEqual(['Page 1', 'Page 2'])
  })
  it('falls back to the first page when the active page is missing', () => {
    expect(sanitizePages([page('a'), page('b')], 'zzz', undefined).activePage).toBe('a')
    expect(sanitizePages([page('a'), page('b')], 'b', undefined).activePage).toBe('b')
  })
})
