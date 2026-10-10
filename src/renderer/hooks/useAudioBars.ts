import { useEffect, useState, type RefObject } from 'react'
import { spectrumBars } from '../../shared/spectrum'

const BARS = 32
const FRAME_MS = 33

export function useAudioBars(active: boolean, canvas: RefObject<HTMLCanvasElement | null>): 'idle' | 'live' | 'unavailable' {
  const [status, setStatus] = useState<'idle' | 'live' | 'unavailable'>('idle')

  useEffect(() => {
    if (!active) {
      setStatus('idle')
      return
    }
    let stopped = false
    let stream: MediaStream | null = null
    let ctx: AudioContext | null = null
    let raf = 0

    navigator.mediaDevices
      .getDisplayMedia({ video: true, audio: true })
      .then((s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop())
        stream = s
        s.getVideoTracks().forEach((t) => t.stop())
        const audio = s.getAudioTracks()
        if (audio.length === 0) return setStatus('unavailable')
        audio[0].addEventListener('ended', () => !stopped && setStatus('unavailable'))
        ctx = new AudioContext()
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        ctx.createMediaStreamSource(new MediaStream(audio)).connect(analyser)
        const freq = new Uint8Array(analyser.frequencyBinCount)
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ffffff'
        let bars: number[] | null = null
        let last = 0
        setStatus('live')
        const draw = (now: number) => {
          raf = requestAnimationFrame(draw)
          if (now - last < FRAME_MS) return
          last = now
          analyser.getByteFrequencyData(freq)
          bars = spectrumBars(freq, BARS, bars)
          const c = canvas.current
          const g = c?.getContext('2d')
          if (!c || !g) return
          g.clearRect(0, 0, c.width, c.height)
          g.fillStyle = accent
          const slot = c.width / BARS
          bars.forEach((v, i) => {
            const h = Math.max(2, v * c.height)
            g.fillRect(i * slot + slot * 0.15, c.height - h, slot * 0.7, h)
          })
        }
        raf = requestAnimationFrame(draw)
      })
      .catch(() => !stopped && setStatus('unavailable'))

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
      void ctx?.close()
    }
  }, [active, canvas])

  return status
}
