import { ReactNode } from 'react'
import { cn } from '../lib/utils'

type PageHeaderProps = {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <p className="section-eyebrow mb-1.5">Espace de gestion</p>
        <h1 className="text-[25px] leading-none font-bold text-neutral-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-neutral-500 mt-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

type StatCardProps = {
  label: string
  value: string
  icon?: ReactNode
  trend?: string
  trendUp?: boolean
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'error'
}

export function StatCard({ label, value, icon, trend, trendUp, color = 'primary' }: StatCardProps) {
  const colorMap = {
    primary: 'bg-primary-50 text-primary-700',
    accent: 'bg-accent-50 text-accent-700',
    success: 'bg-success-50 text-success-700',
    warning: 'bg-warning-50 text-warning-700',
    error: 'bg-error-50 text-error-700',
  }
  return (
    <div className="metric-card animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="pl-2">
          <p className="text-xs font-semibold text-neutral-500">{label}</p>
          <p className="text-xl font-bold tracking-tight text-neutral-900 mt-1.5">{value}</p>
          {trend && (
            <p className={cn('text-[11px] font-medium mt-1.5', trendUp ? 'text-success-600' : 'text-neutral-500')}>
              {trend}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', colorMap[color])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

type BadgeProps = {
  children: ReactNode
  variant?: 'success' | 'warning' | 'error' | 'neutral' | 'primary' | 'accent'
}

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  const variants = {
    success: 'bg-success-100 text-success-700',
    warning: 'bg-warning-100 text-warning-700',
    error: 'bg-error-100 text-error-700',
    neutral: 'bg-neutral-100 text-neutral-700',
    primary: 'bg-primary-100 text-primary-700',
    accent: 'bg-accent-100 text-accent-700',
  }
  return <span className={cn('badge', variants[variant])}>{children}</span>
}

type EmptyStateProps = {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="w-14 h-14 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mb-4">{icon}</div>}
      <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
      {description && <p className="text-sm text-neutral-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg'
  lg?: boolean
}

export function Spinner({ size = 'md', lg }: SpinnerProps) {
  const actualSize = lg ? 'lg' : size
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return (
    <div className="flex items-center justify-center py-12">
      <div className={cn('border-2 border-neutral-200 border-t-primary-500 rounded-full animate-spin', sizes[actualSize])} />
    </div>
  )
}

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative bg-white rounded-2xl shadow-xl w-full max-h-[90vh] overflow-y-auto animate-slide-up', sizes[size])}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

type ConfirmDialogProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmer', danger }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-neutral-600">{message}</p>
      <div className="flex justify-end gap-2 mt-6">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={() => { onConfirm(); onClose() }}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

