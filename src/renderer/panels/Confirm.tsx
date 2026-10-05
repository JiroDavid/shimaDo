export function Confirm() {
  return (
    <div className="flex h-full flex-col justify-between gap-4 pt-2">
      <div>
        <h1 className="heading text-[2.4rem]">Exit ShimaDo?</h1>
        <p className="mt-2 text-muted">Reminders stop until you start ShimaDo again.</p>
      </div>
      <div className="flex justify-end gap-3">
        <button className="btn" onClick={() => window.shima.hidePanel('confirm')}>
          Cancel
        </button>
        <button className="btn btn-danger" onClick={() => window.shima.confirmExit()}>
          Exit
        </button>
      </div>
    </div>
  )
}
