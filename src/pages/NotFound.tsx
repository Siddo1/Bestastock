import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="text-center">
        <p className="text-7xl font-bold text-primary-200">404</p>
        <h1 className="text-2xl font-bold text-neutral-900 mt-4">Page introuvable</h1>
        <p className="text-sm text-neutral-500 mt-2">La page que vous cherchez n'existe pas.</p>
        <Link to="/" className="btn-primary mt-6"><Home className="w-4 h-4" /> Retour à l'accueil</Link>
      </div>
    </div>
  )
}
