import { createPortal } from 'react-dom'

export default function Modal({ open, onClose, title, children }) {
  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div className="relative w-full max-w-lg rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass-strong)] p-5 text-[color:var(--text)] shadow-[var(--shadow)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div>{title ? <h2 className="text-lg font-semibold">{title}</h2> : null}</div>
          <button
            className="rounded-full p-2 text-[color:var(--text-soft)] transition hover:bg-[color:var(--glass-hover)] hover:text-[color:var(--text)]"
            onClick={() => onClose?.()}
            aria-label="Close"
            type="button"
          >
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body
  )
}

