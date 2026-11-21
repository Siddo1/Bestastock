import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Boxes, Users, ShoppingCart, Receipt,
  Truck, ArrowLeftRight, Store, UserCog, FileBarChart, ScrollText,
  LogOut, Menu, X, Sun, Upload, Grid3x3, Bell, Search, ChevronDown,
  CircleHelp, ShoppingBag, Landmark,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { cn, getInitials } from '../lib/utils'

type NavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  roles: string[]
  group: 'Pilotage' | 'OpÃ©rations' | 'Configuration'
}

const navItems: NavItem[] = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['admin', 'manager'], group: 'Pilotage' },
  { to: '/reports', label: 'Analyses & rapports', icon: FileBarChart, roles: ['admin', 'manager'], group: 'Pilotage' },
  { to: '/pos', label: 'Point de vente', icon: ShoppingCart, roles: ['admin', 'manager'], group: 'OpÃ©rations' },
  { to: '/sales', label: 'Ventes', icon: Receipt, roles: ['admin', 'manager'], group: 'OpÃ©rations' },
  { to: '/products', label: 'Produits', icon: Package, roles: ['admin', 'manager'], group: 'OpÃ©rations' },
  { to: '/stock', label: 'Stock', icon: Boxes, roles: ['admin', 'manager'], group: 'OpÃ©rations' },
  { to: '/repartition', label: 'RÃ©partition', icon: Grid3x3, roles: ['admin'], group: 'OpÃ©rations' },
  { to: '/purchases', label: 'Achats', icon: ShoppingBag, roles: ['admin', 'manager'], group: 'OpÃ©rations' },
  { to: '/suppliers', label: 'Fournisseurs', icon: Truck, roles: ['admin', 'manager'], group: 'OpÃ©rations' },
  { to: '/transfers', label: 'Transferts', icon: ArrowLeftRight, roles: ['admin'], group: 'OpÃ©rations' },
  { to: '/customers', label: 'Clients', icon: Users, roles: ['admin', 'manager'], group: 'OpÃ©rations' },
  { to: '/import', label: 'Importation', icon: Upload, roles: ['admin'], group: 'Configuration' },
  { to: '/boutiques', label: 'Boutiques', icon: Store, roles: ['admin'], group: 'Configuration' },
  { to: '/users', label: 'Utilisateurs', icon: UserCog, roles: ['admin'], group: 'Configuration' },
  { to: '/audit', label: 'Journal dâ€™audit', icon: ScrollText, roles: ['admin'], group: 'Configuration' },
]

const groups: NavItem['group'][] = ['Pilotage', 'OpÃ©rations', 'Configuration']

export default function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isAdmin = profile?.role === 'admin'
  const items = navItems.filter((item) => item.roles.includes(profile?.role ?? 'manager'))
  const currentPage = items.find((item) => item.to === location.pathname)?.label
    ?? items.find((item) => item.to !== '/' && location.pathname.startsWith(item.to))?.label
    ?? 'Espace de gestion'

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] flex">
      {sidebarOpen && (
        <button
          aria-label="Fermer le menu"
          className="fixed inset-0 bg-primary-950/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-[264px] shrink-0 bg-gradient-to-b from-primary-950 via-primary-900 to-[#0a1639] text-primary-100 flex flex-col transition-transform duration-300 shadow-xl shadow-primary-950/20',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="h-[76px] px-5 flex items-center border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shadow-inner">
            <Sun className="w-5 h-5 text-accent-300" />
          </div>
          <div className="ml-3 min-w-0">
            <p className="text-white font-bold text-[15px] tracking-tight leading-none">Besta Stock</p>
            <p className="text-primary-200/75 text-[10px] font-semibold tracking-[0.15em] uppercase mt-1.5">Gestion intelligente</p>
          </div>
          <button className="ml-auto lg:hidden p-2 text-primary-200 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-5 px-3">
          {groups.map((group) => {
            const groupItems = items.filter((item) => item.group === group)
            if (!groupItems.length) return null
            return (
              <div key={group} className="mb-5">
                <p className="px-3 mb-2 text-[10px] font-bold tracking-[0.14em] uppercase text-primary-300/60">{group}</p>
                <div className="space-y-1">
                  {groupItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) => cn(
                        'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200',
                        isActive
                          ? 'bg-white text-primary-900 shadow-lg shadow-primary-950/20'
                          : 'text-primary-100/70 hover:bg-white/10 hover:text-white',
                      )}
                    >
                      <item.icon className="w-[17px] h-[17px] shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="rounded-xl bg-white/[0.07] border border-white/10 px-3 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent-400/20 text-accent-100 flex items-center justify-center text-xs font-bold shrink-0">
              {getInitials(profile?.full_name || 'U')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-semibold truncate">{profile?.full_name || 'Utilisateur'}</p>
              <p className="text-primary-200/70 text-[11px] truncate">{isAdmin ? 'Administrateur' : 'Gestionnaire'}</p>
            </div>
            <button onClick={handleSignOut} className="p-1.5 text-primary-200/70 hover:text-white hover:bg-white/10 rounded-md" title="DÃ©connexion">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-[76px] bg-white/95 backdrop-blur border-b border-[#e7ebf2] flex items-center px-4 sm:px-6 lg:px-8 gap-4">
          <button className="lg:hidden p-2 -ml-2 text-neutral-600 hover:text-primary-800" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <p className="text-[11px] text-neutral-400 hidden sm:block">Besta Stock <span className="mx-1.5">/</span> Gestion</p>
            <p className="font-semibold text-[15px] text-neutral-800 truncate">{currentPage}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button className="hidden md:flex items-center gap-2 h-10 w-56 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-left text-xs text-neutral-400 hover:border-primary-200">
              <Search className="w-4 h-4" /> Rechercherâ€¦
            </button>
            <button className="relative w-10 h-10 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-primary-700" aria-label="Notifications">
              <Bell className="w-[18px] h-[18px] mx-auto" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-error-500 rounded-full ring-2 ring-white" />
            </button>
            <button className="hidden sm:flex w-10 h-10 rounded-lg text-neutral-500 hover:bg-neutral-100 items-center justify-center" aria-label="Aide">
              <CircleHelp className="w-[18px] h-[18px]" />
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-neutral-200">
              <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">{getInitials(profile?.full_name || 'U')}</div>
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7 max-w-[1680px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

