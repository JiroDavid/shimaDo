module.exports = {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        muted: 'rgb(var(--muted-rgb) / <alpha-value>)',
        urgent: 'rgb(var(--urgent-rgb) / <alpha-value>)',
        must: 'rgb(var(--must-rgb) / <alpha-value>)',
        important: 'rgb(var(--important-rgb) / <alpha-value>)',
        sage: 'rgb(var(--sage-rgb) / <alpha-value>)',
        line: 'var(--line)',
        'on-accent': 'var(--on-accent)',
        'overlay-soft': 'var(--overlay-soft)',
        overlay: 'var(--overlay)',
        'overlay-strong': 'var(--overlay-strong)'
      },
      fontFamily: {
        sans: ['var(--font-body)'],
        heading: ['var(--font-heading)']
      }
    }
  },
  plugins: []
}
