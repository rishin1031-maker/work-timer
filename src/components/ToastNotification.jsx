export function ToastNotification({ toast, onDismiss }) {
  if (!toast) return null

  return (
    <div className="app-toast" role="status" aria-live="polite">
      <p>{toast.message}</p>
      <div className="app-toast-actions">
        {toast.undo ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              toast.undo()
              onDismiss()
            }}
          >
            Undo
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-tertiary btn-sm"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
