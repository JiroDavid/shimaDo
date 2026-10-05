export function Confirm() {
  return (
    <div className="space-y-4">
      <p className="text-lg font-bold">Exit ShimaDo?</p>
      <p className="text-muted">Reminders stop until you start ShimaDo again.</p>
      <div className="flex justify-end gap-2">
        <button className="btn" onClick={() => window.shima.hidePanel('confirm')}>
          cancel
        </button>
        <button className="btn" onClick={() => window.shima.confirmExit()}>
          exit
        </button>
      </div>
    </div>
  )
}
