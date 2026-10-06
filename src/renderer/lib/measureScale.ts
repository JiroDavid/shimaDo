export function measureScale(container: Element | null): number {
  if (!container) return 1
  const probe = document.createElement('div')
  probe.style.cssText = 'position:absolute;left:0;top:0;width:100px;height:0;visibility:hidden;pointer-events:none'
  container.appendChild(probe)
  const width = probe.getBoundingClientRect().width
  probe.remove()
  return width > 0 ? width / 100 : 1
}
