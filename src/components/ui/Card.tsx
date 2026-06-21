import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean
  hoverEffect?: boolean
}

export const Card: React.FC<CardProps> = ({
  className = '',
  glass = true,
  hoverEffect = false,
  children,
  ...props
}) => {
  const baseStyles = 'rounded-2xl border transition-all duration-300'
  
  const glassStyles = glass 
    ? 'bg-zinc-950/40 backdrop-blur-md border-zinc-800/80 shadow-2xl shadow-black/40' 
    : 'bg-zinc-900 border-zinc-800'
    
  const hoverStyles = hoverEffect 
    ? 'hover:-translate-y-1 hover:border-zinc-700/85 hover:shadow-violet-500/5' 
    : ''

  return (
    <div
      className={`${baseStyles} ${glassStyles} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
