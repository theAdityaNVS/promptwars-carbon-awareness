import React from 'react'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'info' | 'warning' | 'success' | 'danger' | 'neutral'
}

export const Badge: React.FC<BadgeProps> = ({
  className = '',
  variant = 'neutral',
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold'
  
  const variants = {
    info: 'bg-violet-500/10 text-violet-300 border border-violet-500/20',
    warning: 'bg-amber-500/10 text-amber-300 border border-amber-500/20',
    success: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
    danger: 'bg-red-500/10 text-red-300 border border-red-500/20',
    neutral: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
  }

  return (
    <span
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
