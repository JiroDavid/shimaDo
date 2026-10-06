import { Component, type ReactNode } from 'react'
import type { PanelId } from '../../shared/types'

interface Props {
  panel: PanelId
  children: ReactNode
}

export class ErrorBoundary extends Component<Props, { message: string | null }> {
  state = { message: null as string | null }

  static getDerivedStateFromError(error: unknown) {
    return { message: error instanceof Error ? error.message : String(error) }
  }

  render() {
    if (this.state.message === null) return this.props.children
    return (
      <div className="panel flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="heading text-[1.4rem]">Something went wrong</div>
        <p className="max-w-full break-words text-[0.85rem] text-muted">{this.state.message}</p>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => location.reload()}>
            Reload
          </button>
          <button className="btn" onClick={() => window.shima.hidePanel(this.props.panel)}>
            Hide
          </button>
        </div>
      </div>
    )
  }
}
