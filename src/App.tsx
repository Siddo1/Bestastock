import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import ProductForm from './pages/ProductForm'
import Stock from './pages/Stock'
import Customers from './pages/Customers'
import CustomerForm from './pages/CustomerForm'
import CustomerDetail from './pages/CustomerDetail'
import POS from './pages/POS'
import Sales from './pages/Sales'
import SaleDetail from './pages/SaleDetail'
import Suppliers from './pages/Suppliers'
import SupplierForm from './pages/SupplierForm'
import Purchases from './pages/Purchases'
import PurchaseForm from './pages/PurchaseForm'
import Transfers from './pages/Transfers'
import TransferForm from './pages/TransferForm'
import Users from './pages/Users'
import ImportProducts from './pages/ImportProducts'
import Boutiques from './pages/Boutiques'
import Reports from './pages/Reports'
import AuditLog from './pages/AuditLog'
import NotFound from './pages/NotFound'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-sm text-neutral-500">Chargement…</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/new" element={<ProductForm />} />
        <Route path="/products/:id/edit" element={<ProductForm />} />
        <Route path="/import" element={<ImportProducts />} />
        <Route path="/stock" element={<Stock />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/new" element={<CustomerForm />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/customers/:id/edit" element={<CustomerForm />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/sales/:id" element={<SaleDetail />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/suppliers/new" element={<SupplierForm />} />
        <Route path="/suppliers/:id/edit" element={<SupplierForm />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/purchases/new" element={<PurchaseForm />} />
        <Route path="/transfers" element={<Transfers />} />
        <Route path="/transfers/new" element={<TransferForm />} />
        <Route path="/boutiques" element={<Boutiques />} />
        <Route path="/users" element={<Users />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/audit" element={<AuditLog />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
