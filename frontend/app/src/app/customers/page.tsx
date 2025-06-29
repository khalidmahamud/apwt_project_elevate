'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { redirect } from 'next/navigation'
import api from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Users, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  Download,
  TrendingUp,
  UserCheck,
  UserX,
  Crown,
  Calendar,
  DollarSign,
  ShoppingCart,
  Activity,
  BarChart3,
  RefreshCw,
  X,
  ChevronDown
} from 'lucide-react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { TrendingDown } from 'lucide-react'
import { AreaChart, Area } from 'recharts'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  profileImage: string
  isActive: boolean
  createdAt: string
  lastLoginAt: string
  roles: Array<{ name: string }>
  orders?: Array<{
    id: string
    totalAmount: number
    status: string
    createdAt: string
  }>
}

interface CustomerAnalytics {
  id: string
  email: string
  orderCount: number
  totalSpent: number
}

interface UserAnalytics {
  totalUsers: number
  totalUsersChangePercent: number
  totalUsersTrend: number[]
  conversionRate: number
  conversionRateChangePercent: number
  conversionRateTrend: number[]
}

interface PaginatedResponse {
  items: User[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

type TimePeriod = '7days' | '1month' | 'alltime'

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

const formatDate = (date: string) => {
  return format(new Date(date), 'MMM dd, yyyy')
}

const getFullUrl = (path: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  return `${baseUrl}${path}`
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

const AnalyticsMiniChart = ({ data, chartColor }: { data: number[]; chartColor: string }) => {
  const chartData = data.map((value, index) => ({
    name: `Day ${index + 1}`,
    value: value,
  }))
  const gradientId = `color_${chartColor.replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <div className='w-full h-[100px]'>
      <ResponsiveContainer width='100%' height='100%'>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={gradientId} x1='0' y1='0' x2='0' y2='1'>
              <stop offset='5%' stopColor={chartColor} stopOpacity={0.4} />
              <stop offset='95%' stopColor={chartColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px', color: '#fff' }}
            labelStyle={{ display: 'none' }}
            formatter={(value: any) => [`${value}`, '']}
          />
          <Area
            type='monotone'
            dataKey='value'
            stroke={chartColor}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

const AnalyticsCard = ({
  title,
  value,
  changePercent,
  trendData,
  icon: Icon,
  chartColor,
  formatAsCurrency = false,
  formatAsPercent = false,
}: {
  title: string
  value: string | number
  changePercent?: number | null
  trendData?: number[]
  icon: any
  chartColor?: string
  formatAsCurrency?: boolean
  formatAsPercent?: boolean
}) => {
  let formattedValue: string
  if (formatAsCurrency) {
    formattedValue = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(value) || 0)
  } else if (formatAsPercent) {
    formattedValue = `${(Number(value) || 0).toFixed(2)}%`
  } else {
    formattedValue = (Number(value) || 0).toLocaleString()
  }
  return (
    <div className='bg-primary p-4 rounded-lg flex flex-col justify-between h-[200px]'>
      <div className='flex justify-between items-start'>
        <div className='flex items-center gap-4'>
          <div className='flex items-center justify-center h-10 w-10 rounded-full' style={{ backgroundColor: `${chartColor}33` }}>
            <Icon className='h-5 w-5' style={{ color: chartColor }} />
          </div>
          <div>
            <p className='text-sm text-primary-foreground/50'>{title}</p>
            <p className='text-2xl font-bold text-primary-foreground'>{formattedValue}</p>
          </div>
        </div>
        {changePercent != null && (
          <div>
            <p className='text-sm text-primary-foreground/50 text-right'>Last 7 days</p>
            <div className={`flex items-center justify-end gap-1 font-semibold text-sm`}>
              {changePercent >= 0 ? (
                <TrendingUp className='h-4 w-4 text-green-500' />
              ) : (
                <TrendingDown className='h-4 w-4 text-red-500' />
              )}
              <span className='text-primary-foreground font-semibold'>
                {changePercent.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>
      {trendData && chartColor && (
        <AnalyticsMiniChart data={trendData} chartColor={chartColor} />
      )}
    </div>
  )
}

export default function CustomersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [customerAnalytics, setCustomerAnalytics] = useState<CustomerAnalytics[]>([])
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [isActive, setIsActive] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [newStatus, setNewStatus] = useState(false)
  const [newRole, setNewRole] = useState('CUSTOMER')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7days')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!user) {
      redirect('/login')
    }
  }, [user])

  useEffect(() => {
    fetchUsers()
  }, [page, search, role, isActive, sortBy, sortOrder])

  useEffect(() => {
    fetchAnalytics()
  }, [timePeriod])

  const getDateRange = (period: TimePeriod) => {
    const now = new Date()
    switch (period) {
      case '7days':
        return {
          startDate: startOfDay(subDays(now, 7)),
          endDate: endOfDay(now)
        }
      case '1month':
        return {
          startDate: startOfDay(subDays(now, 30)),
          endDate: endOfDay(now)
        }
      case 'alltime':
        return {
          startDate: undefined,
          endDate: undefined
        }
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      })

      if (search) params.append('search', search)
      if (role && role !== 'all') params.append('role', role)
      if (isActive !== '' && isActive !== 'all') params.append('isActive', isActive)

      const response = await api.get<PaginatedResponse>(`/admin/users?${params}`)
      setUsers(response.data.items)
      setTotalPages(response.data.meta.totalPages)
    } catch (error) {
      toast.error('Failed to fetch users')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true)
      const { startDate, endDate } = getDateRange(timePeriod)
      
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate.toISOString())
      if (endDate) params.append('endDate', endDate.toISOString())

      const [customerRes, userRes] = await Promise.all([
        api.get(`/admin/orders/analytics/customer?${params}`),
        api.get('/admin/users/analytics')
      ])
      setCustomerAnalytics(customerRes.data)
      setUserAnalytics(userRes.data)
    } catch (error) {
      toast.error('Failed to fetch analytics')
      console.error(error)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const handleStatusChange = async () => {
    if (!selectedUser) return

    try {
      await api.patch(`/admin/users/${selectedUser.id}/status`, {
        isActive: newStatus
      })
      toast.success(`User ${newStatus ? 'activated' : 'deactivated'} successfully`)
      setShowStatusModal(false)
      fetchUsers()
    } catch (error) {
      toast.error('Failed to update user status')
      console.error(error)
    }
  }

  const handleRoleChange = async () => {
    if (!selectedUser) return

    try {
      await api.patch(`/admin/users/${selectedUser.id}/role`, {
        role: newRole
      })
      toast.success('User role updated successfully')
      setShowRoleModal(false)
      fetchUsers()
    } catch (error) {
      toast.error('Failed to update user role')
      console.error(error)
    }
  }

  const exportCustomerReport = async () => {
    try {
      const response = await api.get('/admin/users/customer-report/download', {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `customer-report-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success('Customer report downloaded successfully')
    } catch (error) {
      toast.error('Failed to download customer report')
      console.error(error)
    }
  }

  const getTotalOrders = (user: User) => {
    return user.orders?.length || 0
  }

  const getTotalSpent = (user: User) => {
    return (
      user.orders?.reduce(
        (sum, order) => sum + (typeof order.totalAmount === 'number' ? order.totalAmount : parseFloat(order.totalAmount as any) || 0),
        0
      ) || 0
    )
  }

  const getLastOrderDate = (user: User) => {
    if (!user.orders || user.orders.length === 0) return 'No orders'
    const lastOrder = user.orders.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0]
    return formatDate(lastOrder.createdAt)
  }

  const clearFilters = () => {
    setSearch('')
    setRole('all')
    setIsActive('all')
    setSortBy('createdAt')
    setSortOrder('desc')
    setPage(1)
  }

  const getTimePeriodLabel = (period: TimePeriod) => {
    switch (period) {
      case '7days': return 'Last 7 Days'
      case '1month': return 'Last Month'
      case 'alltime': return 'All Time'
    }
  }

  // Helper for windowed pagination (same as orders page)
  function getPageNumbers(current: number, total: number) {
    const delta = 2
    const range: (number | string)[] = []
    for (
      let i = Math.max(1, current - delta);
      i <= Math.min(total, current + delta);
      i++
    ) {
      range.push(i)
    }
    if (typeof range[0] === 'number' && range[0] > 2) {
      range.unshift('...')
    }
    if (typeof range[0] === 'number' && range[0] !== 1) {
      range.unshift(1)
    }
    const last = range[range.length - 1]
    if (typeof last === 'number' && last < total - 1) {
      range.push('...')
    }
    if (typeof last === 'number' && last !== total) {
      range.push(total)
    }
    return range
  }

  const prepareChartData = () => {
    if (!userAnalytics) return { trendData: [], pieData: [] }

    // Prepare trend data for the last 7 days
    const trendData = userAnalytics.totalUsersTrend.map((value, index) => ({
      day: format(subDays(new Date(), 6 - index), 'MMM dd'),
      users: value,
      conversion: userAnalytics.conversionRateTrend[index] || 0
    }))

    // Prepare pie chart data for user roles
    const roleCounts = users.reduce((acc, user) => {
      const role = user.roles[0]?.name || 'CUSTOMER'
      acc[role] = (acc[role] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const pieData = Object.entries(roleCounts).map(([role, count]) => ({
      name: role,
      value: count
    }))

    return { trendData, pieData }
  }

  if (!user) {
    return null
  }

  const { trendData, pieData } = prepareChartData()

  return (
    <div className="p-6 bg-background h-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage your customers and view analytics</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchAnalytics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportCustomerReport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Time Period Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Analytics Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {(['7days', '1month', 'alltime'] as TimePeriod[]).map((period) => (
              <Button
                key={period}
                variant={timePeriod === period ? "default" : "outline"}
                size="sm"
                onClick={() => setTimePeriod(period)}
              >
                {getTimePeriodLabel(period)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className='bg-primary rounded-lg p-4 flex flex-col items-center'>
          <div className='text-lg font-semibold text-primary-foreground'>Total Customers</div>
          <div className='text-2xl font-bold text-accent mt-2'>
            {analyticsLoading ? <Skeleton className='h-8 w-20' /> : userAnalytics?.totalUsers ?? '-'}
          </div>
        </div>
        <div className='bg-primary rounded-lg p-4 flex flex-col items-center'>
          <div className='text-lg font-semibold text-primary-foreground'>Conversion Rate</div>
          <div className='text-2xl font-bold text-accent mt-2'>
            {analyticsLoading ? <Skeleton className='h-8 w-20' /> : `${userAnalytics?.conversionRate?.toFixed(1) ?? '-'}%`}
          </div>
        </div>
        <div className='bg-primary rounded-lg p-4 flex flex-col items-center'>
          <div className='text-lg font-semibold text-primary-foreground'>Active Customers</div>
          <div className='text-2xl font-bold text-accent mt-2'>
            {analyticsLoading ? <Skeleton className='h-8 w-20' /> : users.filter(u => u.isActive).length}
          </div>
        </div>
        <div className='bg-primary rounded-lg p-4 flex flex-col items-center'>
          <div className='text-lg font-semibold text-primary-foreground'>Top Spender</div>
          <div className='text-2xl font-bold text-accent mt-2'>
            {analyticsLoading ? <Skeleton className='h-8 w-32' /> : (customerAnalytics.length > 0 ? formatCurrency(customerAnalytics[0].totalSpent) : '$0')}
          </div>
          <div className='text-xs text-muted-foreground mt-1'>
            {analyticsLoading ? '' : (customerAnalytics.length > 0 ? customerAnalytics[0].email : 'No data')}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="customers">
        <TabsList className="mb-4">
          <TabsTrigger value="customers">Customer List</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="customers">
          {/* Enhanced Filters */}
          <Card className="mb-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters & Search
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    {showFilters ? 'Hide' : 'Show'} Filters
                    <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                  </Button>
                  {(search || role !== 'all' || isActive !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="flex flex-wrap gap-4 pt-4 border-t items-end">
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="All roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All roles</SelectItem>
                      <SelectItem value="CUSTOMER">Customer</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="DELIVERY_MAN">Delivery Man</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={isActive} onValueChange={setIsActive}>
                    <SelectTrigger>
                      <SelectValue placeholder="All status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All status</SelectItem>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue>{
                        sortBy === 'createdAt' ? 'Join Date' :
                        sortBy === 'lastLoginAt' ? 'Last Login' :
                        sortBy === 'firstName' ? 'First Name' :
                        sortBy === 'lastName' ? 'Last Name' :
                        sortBy === 'email' ? 'Email' :
                        sortBy === 'spendings' ? 'Total Spendings' :
                        'Sort By'
                      }</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">Join Date</SelectItem>
                      <SelectItem value="lastLoginAt">Last Login</SelectItem>
                      <SelectItem value="firstName">First Name</SelectItem>
                      <SelectItem value="lastName">Last Name</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="spendings">Total Spendings</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Descending</SelectItem>
                      <SelectItem value="asc">Ascending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Table */}
          <Card>
            <CardHeader>
              <CardTitle>Customer List</CardTitle>
              <CardDescription>
                Manage your customers and their information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-4 w-[150px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Orders</TableHead>
                        <TableHead>Total Spent</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <img
                                src={getFullUrl(`/uploads/${user.profileImage}`)}
                                alt={user.firstName}
                                className="h-10 w-10 rounded-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder-shoe.png'
                                }}
                              />
                              <div>
                                <div className="font-medium">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  ID: {user.id.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.email}</div>
                              {user.phone && (
                                <div className="text-sm text-muted-foreground">
                                  {user.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {user.roles[0]?.name || 'CUSTOMER'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? "default" : "secondary"}>
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <ShoppingCart className="h-4 w-4" />
                              <span>{getTotalOrders(user)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {formatCurrency(getTotalSpent(user))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDate(user.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user)
                                    setShowUserModal(true)
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user)
                                    setNewStatus(!user.isActive)
                                    setShowStatusModal(true)
                                  }}
                                >
                                  {user.isActive ? (
                                    <>
                                      <UserX className="h-4 w-4 mr-2" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="h-4 w-4 mr-2" />
                                      Activate
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user)
                                    setNewRole(user.roles[0]?.name || 'CUSTOMER')
                                    setShowRoleModal(true)
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Change Role
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className='flex justify-start mt-4 gap-2'>
                      <Button
                        variant='outline'
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                        className='cursor-pointer bg-[var(--accent)] hover:opacity-80'
                        style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
                      >
                        Prev
                      </Button>
                      {getPageNumbers(page, totalPages).map((p, idx) =>
                        p === '...' ? (
                          <span
                            key={'ellipsis-' + idx}
                            className='px-2 py-1 text-muted-foreground'
                          >
                            ...
                          </span>
                        ) : (
                          <Button
                            key={p}
                            variant={page === p ? 'default' : 'outline'}
                            onClick={() => setPage(Number(p))}
                            className={`cursor-pointer ${
                              page == p ? 'text-accent border-1 border-accent' : ''
                            }`}
                          >
                            {p}
                          </Button>
                        )
                      )}
                      <Button
                        variant='outline'
                        disabled={page === totalPages}
                        onClick={() => setPage(page + 1)}
                        className='cursor-pointer bg-[var(--accent)] hover:opacity-80'
                        style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Growth Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Growth Trend</CardTitle>
                <CardDescription>
                  New customer registrations over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="users" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="New Users"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* User Role Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>User Role Distribution</CardTitle>
                <CardDescription>
                  Distribution of users by role
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Top Customers Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Top Customers by Spending</CardTitle>
                <CardDescription>
                  Your highest-value customers based on total spending
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={customerAnalytics.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="email" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Bar dataKey="totalSpent" fill="#8884d8" name="Total Spent" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Customers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Top Customers Details</CardTitle>
              <CardDescription>
                Detailed breakdown of your highest-value customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-4 w-1/6" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead className="text-right">Total Spent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerAnalytics.map((customer, index) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Badge variant={index < 3 ? "default" : "secondary"}>
                              #{index + 1}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{customer.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <ShoppingCart className="h-4 w-4" />
                            <span>{customer.orderCount}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(customer.totalSpent)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Details Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              Detailed information about the customer
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <img
                  src={getFullUrl(`/uploads/${selectedUser.profileImage}`)}
                  alt={selectedUser.firstName}
                  className="h-20 w-20 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-shoe.png'
                  }}
                />
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h3>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant={selectedUser.isActive ? "default" : "secondary"}>
                      {selectedUser.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">
                      {selectedUser.roles[0]?.name || 'CUSTOMER'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.phone || 'Not provided'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Joined</label>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedUser.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Last Login</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.lastLoginAt ? formatDate(selectedUser.lastLoginAt) : 'Never'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Total Orders</label>
                  <p className="text-sm text-muted-foreground">
                    {getTotalOrders(selectedUser)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Total Spent</label>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(getTotalSpent(selectedUser))}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Last Order</label>
                  <p className="text-sm text-muted-foreground">
                    {getLastOrderDate(selectedUser)}
                  </p>
                </div>
              </div>

              {selectedUser.orders && selectedUser.orders.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Recent Orders</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedUser.orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex justify-between items-center p-2 bg-muted rounded">
                        <div>
                          <div className="text-sm font-medium">Order #{order.id.slice(0, 8)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {formatCurrency(order.totalAmount)}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Change Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Status</DialogTitle>
            <DialogDescription>
              {newStatus ? 'Activate' : 'Deactivate'} this user account?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusChange}>
              {newStatus ? 'Activate' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Modal */}
      <Dialog open={showRoleModal} onOpenChange={setShowRoleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the user's role in the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">New Role</label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="DELIVERY_MAN">Delivery Man</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleRoleChange}>
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 