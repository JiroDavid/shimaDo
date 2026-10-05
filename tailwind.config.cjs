module.exports = {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        cream: '#F3E9D6',
        brick: '#E5484D',
        sage: '#6E9A74',
        dark: '#14120f',
        'dark-panel': '#1b1915',
        'dark-border': 'rgb(243 233 214 / 0.14)',
        muted: '#A9A08F',
        dim: 'rgb(243 233 214 / 0.28)',
        urgent: '#E5484D',
        must: '#F2541B',
        important: '#F5C542',
        accent: 'var(--accent)'
      },
      fontFamily: {
        sans: ["'M PLUS Rounded 1c'", 'system-ui', 'sans-serif'],
        heading: ["'Barlow Condensed'", "'M PLUS Rounded 1c'", 'sans-serif']
      }
    }
  },
  plugins: []
}
