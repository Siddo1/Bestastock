import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Boxes, Users, ShoppingCart, Receipt,
  Truck, ArrowLeftRight, Store, UserCog, FileBarChart, ScrollText,
  LogOut, Menu, X, Sun, ChevronDown, Upload, Grid3x3,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { cn, getInitials } from '../lib/utils'

const navItems = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['admin', 'manager'] },
  { to: '/pos', label: 'Point de vente', icon: ShoppingCart, roles: ['admin', 'manager'] },
  { to: '/products', label: 'Produits', icon: Package, roles: ['admin', 'manager'] },
  { to: '/import', label: 'Importer', icon: Upload, roles: ['admin'] },
  { to: '/stock', label: 'Stock', icon: Boxes, roles: ['admin', 'manager'] },
  { to: '/repartition', label: 'Répartition', icon: Grid3x3, roles: ['admin'] },
  { to: '/customers', label: 'Clients', icon: Users, roles: ['admin', 'manager'] },
  { to: '/sales', label: 'Ventes', icon: Receipt, roles: ['admin', 'manager'] },
  { to: '/suppliers', label: 'Fournisseurs', icon: Truck, roles: ['admin', 'manager'] },
  { to: '/purchases', label: 'Achats', icon: Package, roles: ['admin', 'manager'] },
  { to: '/transfers', label: 'Transferts', icon: ArrowLeftRight, roles: ['admin'] },
  { to: '/boutiques', label: 'Boutiques', icon: Store, roles: ['admin'] },
  { to: '/users', label: 'Utilisateurs', icon: UserCog, roles: ['admin'] },
  { to: '/reports', label: 'Rapports', icon: FileBarChart, roles: ['admin', 'manager'] },
  { to: '/audit', label: 'Journal d\'audit', icon: ScrollText, roles: ['admin'] },
]

export default function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const isAdmin = profile?.role === 'admin'
  const items = navItems.filter((i) => i.roles.includes(profile?.role ?? 'manager'))

  useEffect(() => {
    setSidebarOpen(false)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-neutral-900 text-neutral-300 flex flex-col transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-neutral-800">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg">
            <Sun className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Besta Solar</p>
            <p className="text-neutral-500 text-xs">Gestion de stock</p>
          </div>
          <button
            className="ml-auto lg:hidden text-neutral-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-white',
                )
              }
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-neutral-800">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-semibold shrink-0">
              {getInitials(profile?.full_name || 'U')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{profile?.full_name || 'Utilisateur'}</p>
              <p className="text-neutral-500 text-xs capitalize">
                {isAdmin ? 'Administrateur' : 'Gestionnaire'}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-neutral-400 hover:text-error-400 transition-colors p-1.5 rounded-lg hover:bg-neutral-800"
              title="Déconnexion"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-neutral-200 h-14 flex items-center px-4 gap-3">
          <button
            className="text-neutral-600 hover:text-neutral-900"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <Sun className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-neutral-900">Besta Solar</span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
