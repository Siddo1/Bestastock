import { Component, ReactNode } from 'react'
import { Sun, AlertTriangle } from 'lucide-react'

/** Cadre plein écran réutilisé par les écrans d'erreur (config + runtime). */
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg">
            <Sun className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold text-neutral-900">Besta Solar</p>
            <p className="text-neutral-500 text-xs">Gestion de stock</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Affiché quand VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY sont absents du build. */
export function ConfigError() {
  return (
    <Shell>
      <div className="flex items-start gap-3 text-warning-700 bg-warning-50 border border-warning-200 rounded-lg p-4 mb-5">
        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Configuration Supabase manquante</p>
          <p className="text-sm mt-1">
            L'application ne trouve pas les identifiants de connexion à la base de données.
          </p>
        </div>
      </div>
      <div className="text-sm text-neutral-600 space-y-3">
        <p>Pour corriger, définissez ces deux variables d'environnement, puis <strong>redéployez</strong> :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><code className="text-neutral-800">VITE_SUPABASE_URL</code></li>
          <li><code className="text-neutral-800">VITE_SUPABASE_ANON_KEY</code></li>
        </ul>
        <p className="text-neutral-500">
          Sur Vercel : Settings → Environment Variables, puis Deployments → Redeploy
          (sans cache). Les variables <code>VITE_*</code> sont intégrées au moment du build,
          un simple ajout sans redéploiement ne suffit pas.
        </p>
      </div>
    </Shell>
  )
}

type State = { hasError: boolean; message: string }

/** Capture toute erreur de rendu React et affiche un message au lieu d'une page blanche. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) }
  }

  componentDidCatch(error: unknown) {
    console.error('Erreur applicative non gérée :', error)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <Shell>
        <div className="flex items-start gap-3 text-error-700 bg-error-50 border border-error-200 rounded-lg p-4 mb-5">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Une erreur est survenue</p>
            <p className="text-sm mt-1 break-words">{this.state.message}</p>
          </div>
        </div>
        <button onClick={() => window.location.reload()} className="btn-primary w-full">
          Recharger la page
        </button>
      </Shell>
    )
  }
}
