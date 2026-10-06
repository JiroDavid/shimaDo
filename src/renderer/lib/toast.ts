export function toast(message: string): void {
  if (!message) return
  const el = document.createElement('div')
  el.className = 'edit-toast'
  el.textContent = message
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 3000)
}
