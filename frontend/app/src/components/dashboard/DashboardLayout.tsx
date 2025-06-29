import React from 'react'
import { Button } from '@/components/ui/button'
import { Download, RefreshCw } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface DashboardLayoutProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  actions?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
    loading?: boolean
    variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link'
  }[]
  className?: string
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  title,
  subtitle,
  children,
  actions = [],
  className = '',
}) => {
  const { user } = useAuth()

  return (
    <div className={`p-4 grid grid-cols-1 lg:grid-cols-4 gap-6 ${className}`}>
      {/* Header */}
      <div className='lg:col-span-4 flex justify-between items-center'>
        <div>
          {user && (
            <p className='text-primary-foreground opacity-40 text-4xl font-medium'>
              Welcome,{' '}
              {user.firstName
                ? user.firstName.charAt(0).toUpperCase() + user.firstName.slice(1)
                : user.email}
            </p>
          )}
          <p className='text-primary-foreground opacity-85 font-semibold text-2xl'>
            {title}
          </p>
          {subtitle && (
            <p className='text-primary-foreground opacity-60 text-sm mt-1'>
              {subtitle}
            </p>
          )}
        </div>
        
        {actions.length > 0 && (
          <div className="flex gap-2">
            {actions.map((action, index) => (
              <Button
                key={index}
                onClick={action.onClick}
                disabled={action.loading}
                variant={action.variant || 'outline'}
                className={`h-[50px] text-lg rounded-sm cursor-pointer ${
                  action.variant === 'default' 
                    ? 'bg-accent text-accent-foreground hover:bg-accent/80' 
                    : 'bg-accent text-primary-foreground hover:bg-accent/80 hover:text-primary-foreground'
                }`}
              >
                {action.loading ? (
                  <RefreshCw className='h-4 w-4 mr-2 animate-spin' />
                ) : (
                  action.icon && <span className="mr-2">{action.icon}</span>
                )}
                <span>{action.loading ? 'Loading...' : action.label}</span>
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {children}
    </div>
  )
}

export default DashboardLayout 