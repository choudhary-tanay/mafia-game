'use client'

/**
 * Root-layout error boundary (rare: layout-level crashes). Must render its
 * own <html>/<body> because the root layout failed.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{ background: '#080810', color: '#ece8f5', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>🌫️</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Reconnecting to the village…</h1>
          <p style={{ fontSize: 14, color: '#7070a0', maxWidth: 320, margin: 0 }}>
            Something went wrong. Your game is safe on the server.
          </p>
          <button
            onClick={() => { reset(); window.location.reload() }}
            style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', minHeight: 44 }}
          >
            Reload game
          </button>
        </main>
      </body>
    </html>
  )
}
