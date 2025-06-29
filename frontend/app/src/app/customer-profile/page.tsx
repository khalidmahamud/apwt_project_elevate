'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { isAdmin, isCustomer } from '@/utils/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  User, 
  Mail, 
  Phone, 
  Calendar,
  LogOut,
  ShoppingCart,
  Package
} from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'
import { toast } from 'sonner'

interface CustomerStats {
  totalOrders: number
  totalSpent: number
  lastOrderDate?: string
}

export default function CustomerProfilePage() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<CustomerStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Authentication and role checks
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    } else if (user && isAdmin(user)) {
      router.replace('/')
    } else if (user && isCustomer(user)) {
      router.replace('/customer-profile')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (user && isCustomer(user)) {
      fetchCustomerStats()
    }
  }, [user])

  const fetchCustomerStats = async () => {
    if (!user || authLoading) return
    
    try {
      setLoading(true)
      const response = await api.get('/orders')
      const orders = response.data.data || response.data

      const totalOrders = orders.length
      const totalSpent = orders.reduce((sum: number, order: any) => 
        sum + (typeof order.totalAmount === 'number' ? order.totalAmount : parseFloat(order.totalAmount) || 0), 0
      )

      const lastOrder = orders.length > 0 ? orders[0] : null

      setStats({
        totalOrders,
        totalSpent,
        lastOrderDate: lastOrder ? new Date(lastOrder.createdAt).toLocaleDateString() : undefined
      })
    } catch (error) {
      if (user && !authLoading) {
        toast.error('Failed to fetch customer statistics')
      }
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
  }

  // Show loading while checking authentication
  if (authLoading || !user || isAdmin(user) || !isCustomer(user)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Welcome, {user.firstName}!</h1>
              <p className="text-primary-foreground/80 mt-1">Your customer profile</p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="text-primary-foreground border-primary-foreground hover:bg-primary-foreground hover:text-primary"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Your personal account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <p className="text-lg font-medium">
                  {user.firstName} {user.lastName || ''}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-lg font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {user.email}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <p className="text-lg font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {user.phone || 'Not provided'}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                <p className="text-lg font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatDate(user.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Badge variant={user.isActive ? "default" : "secondary"}>
                {user.isActive ? "Active Account" : "Inactive Account"}
              </Badge>
              <Badge variant="outline">
                {user.roles[0]?.name || 'CUSTOMER'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Shopping Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Shopping Statistics
            </CardTitle>
            <CardDescription>
              Your shopping activity summary
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary-foreground">
                    {stats?.totalOrders || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Orders</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary-foreground">
                    {formatCurrency(stats?.totalSpent || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Spent</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary-foreground">
                    {stats?.lastOrderDate ? formatDate(stats.lastOrderDate) : 'No orders'}
                  </div>
                  <div className="text-sm text-muted-foreground">Last Order</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              What would you like to do?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button asChild className="h-12 justify-start">
                <Link href="#">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Browse Products
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 justify-start">
                <Link href="#">
                  <Package className="h-4 w-4 mr-2" />
                  View My Orders
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 