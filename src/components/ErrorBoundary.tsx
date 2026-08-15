import React from 'react'
import { Activity } from 'lucide-react'
import { logError } from '../lib/errorLog'

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Dashboard ErrorBoundary caught:', error, info)
    logError(error, 'react', info.componentStack ?? undefined)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-error-100 dark:bg-error-900/30 flex items-center justify-center">
            <Activity size={28} className="text-error-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">خطا در بارگذاری داشبورد</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              یک خطای غیرمنتظره رخ داد. لطفاً صفحه را مجدداً بارگذاری کنید.
            </p>
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            className="px-5 py-2.5 rounded-xl bg-primary-500 text-white font-bold text-sm hover:bg-primary-600 transition-colors"
          >
            بارگذاری مجدد
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
