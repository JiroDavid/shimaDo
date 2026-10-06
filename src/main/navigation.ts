export function shouldBlockNavigation(current: string, target: string): boolean {
  try {
    const here = new URL(current)
    const there = new URL(target)
    if (here.protocol !== there.protocol) return true
    const strip = (u: URL) => `${u.protocol}//${u.host}${u.pathname}${u.search}`
    return strip(here) !== strip(there)
  } catch {
    return true
  }
}
