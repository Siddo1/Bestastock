import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars. Check .env for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export type Profile = {
  id: string
  full_name: string
  role: 'admin' | 'manager'
  boutique_id: string | null
  can_modify_stock: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Boutique = {
  id: string
  name: string
  address: string | null
  phone: string | null
  is_active: boolean
  created_at: string
}

export type Category = {
  id: string
  name: string
  description: string | null
  created_at: string
}

export type Supplier = {
  id: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Product = {
  id: string
  sku: string
  name: string
  description: string | null
  category_id: string | null
  supplier_id: string | null
  purchase_price: number
  sale_price: number
  barcode: string | null
  photos: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  category?: Category | null
  supplier?: Supplier | null
}

export type StockItem = {
  id: string
  product_id: string
  boutique_id: string
  quantity: number
  reorder_threshold: number
  created_at: string
  updated_at: string
  product?: Product
  boutique?: Boutique
}

export type StockMovement = {
  id: string
  product_id: string
  boutique_id: string
  quantity: number
  movement_type: 'purchase' | 'sale' | 'transfer_in' | 'transfer_out' | 'adjustment'
  reference_id: string | null
  notes: string | null
  performed_by: string | null
  created_at: string
  product?: Product
  boutique?: Boutique
}

export type Customer = {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Sale = {
  id: string
  boutique_id: string
  customer_id: string | null
  user_id: string
  total_amount: number
  discount: number
  payment_method: 'cash' | 'mobile_money' | 'card' | 'other'
  status: 'pending' | 'completed' | 'cancelled'
  notes: string | null
  created_at: string
  updated_at: string
  customer?: Customer | null
  boutique?: Boutique
  sale_items?: SaleItem[]
}

export type SaleItem = {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  discount: number
  created_at: string
  product?: Product
}

export type Purchase = {
  id: string
  supplier_id: string | null
  boutique_id: string
  user_id: string
  total_amount: number
  notes: string | null
  purchased_at: string
  created_at: string
  supplier?: Supplier | null
  boutique?: Boutique
  purchase_items?: PurchaseItem[]
}

export type PurchaseItem = {
  id: string
  purchase_id: string
  product_id: string
  quantity: number
  unit_cost: number
  created_at: string
  product?: Product
}

export type StockTransfer = {
  id: string
  product_id: string
  from_boutique_id: string
  to_boutique_id: string
  quantity: number
  status: 'pending' | 'completed' | 'cancelled'
  notes: string | null
  performed_by: string | null
  created_at: string
  updated_at: string
  product?: Product
  from_boutique?: Boutique
  to_boutique?: Boutique
}

export type AuditLog = {
  id: string
  user_id: string | null
  action: string
  table_name: string
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}
