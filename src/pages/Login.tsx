import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email.trim(), password)
    setLoading(false)
    if (error) {
      setError(error === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : error)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-neutral-900 via-neutral-800 to-primary-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary-500 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent-500 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-xl">
              <Sun className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold">Besta Solar</p>
              <p className="text-primary-200 text-sm">Gestion de stock multi-boutiques</p>
            </div>
          </div>
          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight">
              Pilotez vos stocks<br />en temps réel.
            </h1>
            <p className="text-neutral-300 text-lg max-w-md">
              Centralisez la gestion de vos produits, ventes, clients et fournisseurs
              sur toutes vos boutiques. Suivez la valeur de votre stock en franc CFA.
            </p>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              {[
                { label: 'Multi-boutiques', value: '3+' },
                { label: 'Devises', value: 'XOF' },
                { label: 'Rôles', value: 'Admin & Manager' },
                { label: 'Audit trail', value: '12 mois' },
              ].map((f) => (
                <div key={f.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <p className="text-2xl font-bold text-primary-300">{f.value}</p>
                  <p className="text-sm text-neutral-300">{f.label}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-neutral-400 text-sm">© 2025 Besta Solar. Tous droits réservés.</p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-neutral-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg">
              <Sun className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-neutral-900">Besta Solar</p>
              <p className="text-neutral-500 text-xs">Gestion de stock</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-neutral-900">Connexion</h2>
          <p className="text-sm text-neutral-500 mt-1">Accédez à votre espace de gestion</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-neutral-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="vous@bestasolar.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="password">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-neutral-400" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg p-3 animate-fade-in">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Se connecter'}
            </button>
          </form>

          <p className="text-xs text-neutral-400 text-center mt-6">
            Contactez l'administrateur pour créer un compte.
          </p>
        </div>
      </div>
    </div>
  )
}
