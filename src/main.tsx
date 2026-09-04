import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { reportDiagnostic } from './diagnostics'
import './styles.css'

window.addEventListener('error', (event) => {
  reportDiagnostic(`[WHITEBOARD] uncaught window error: ${event.message}\n${event.error?.stack ?? ''}`)
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason instanceof Error ? `${event.reason.message}\n${event.reason.stack ?? ''}` : String(event.reason)
  reportDiagnostic(`[WHITEBOARD] unhandled rejection: ${reason}`)
})

class FrontendErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportDiagnostic(`[WHITEBOARD] uncaught React error: ${error.message}\n${error.stack ?? ''}\n${info.componentStack ?? ''}`)
  }

  render() {
    if (this.state.error) {
      return (
        <main className="fatal-error">
          <h1>Study Whiteboard couldn’t start</h1>
          <p>{this.state.error.message}</p>
        </main>
      )
    }
    return this.props.children
  }
}

reportDiagnostic('[WHITEBOARD] main module loaded; persistence enabled')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FrontendErrorBoundary>
      <App />
    </FrontendErrorBoundary>
  </StrictMode>,
)
