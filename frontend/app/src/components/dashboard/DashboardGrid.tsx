import React from 'react'

interface DashboardGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
  className?: string
}

const DashboardGrid: React.FC<DashboardGridProps> = ({
  children,
  columns = 4,
  gap = 'lg',
  className = '',
}) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  }

  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  )
}

interface DashboardSectionProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  children,
  title,
  description,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h2 className="text-xl font-bold text-primary-foreground">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-primary-foreground/60">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

interface DashboardCardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  children,
  className = '',
  padding = 'md',
}) => {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }

  return (
    <div className={`bg-primary rounded-lg ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  )
}

export default DashboardGrid 