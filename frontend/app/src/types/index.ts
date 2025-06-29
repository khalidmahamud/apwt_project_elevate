// User related types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  isEmailVerified: boolean
  isPhoneVerified: boolean
  isActive: boolean
  profileImage?: string
  createdAt: string
  lastLoginAt?: string
  role: 'ADMIN' | 'USER'
}

// Product related types
export interface Product {
  id: string
  name: string
  description?: string
  price: number
  images?: string[]
  stockQuantity: number
  rating?: number
  category: string
  createdAt: string
  updatedAt: string
}

export interface ProductFilters {
  category?: string
  stockStatus?: 'inStock' | 'outOfStock'
  sortBy?: 'name' | 'price' | 'stockQuantity' | 'createdAt' | 'updatedAt' | 'rating'
  orderDirection?: 'ASC' | 'DESC'
  lastModified?: 'asc' | 'desc'
  search?: string
}

// Order related types
export interface Order {
  id: string
  userId: string
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  totalAmount: number
  items: OrderItem[]
  shippingAddress: Address
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  quantity: number
  price: number
  totalPrice: number
}

export interface Address {
  id: string
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

// Analytics types
export interface AnalyticsCardProps {
  title: string
  value: string | number
  changePercent?: number | null
  trendData?: number[]
  icon: React.ElementType<any>
  chartColor?: string
  formatAsCurrency?: boolean
  formatAsPercent?: boolean
}

export interface TodaySummaryCardProps {
  title: string
  value: number | string
  icon: React.ElementType<any>
  color: string
  formatAsCurrency?: boolean
}

export interface RevenueBreakdownData {
  categories: string[]
  data: {
    date: string
    [key: string]: string | number
  }[]
}

export interface OrderSummary {
  totalOrders: number
  totalRevenue: number
  avgOrderValue: number
  ordersChangePercent: number
  revenueChangePercent: number
  avgOrderValueChange: number
  ordersTrend: number[]
  revenueTrend: number[]
  avgOrderValueTrend: number[]
}

export interface UserAnalytics {
  conversionRate: number
  conversionRateChangePercent: number
  conversionRateTrend: number[]
}

export interface TodaySummary {
  totalOrders: number
  totalRevenue: number
  shippedOrders: number
  pendingOrders: number
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

// Form types
export interface LoginFormData {
  email: string
  password: string
}

export interface CreateProductData {
  name: string
  description?: string
  price: number
  stockQuantity: number
  category: string
  images?: string[]
}

export interface UpdateProductData extends Partial<CreateProductData> {
  id: string
}

export interface UpdateUserData {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  isActive?: boolean
}

export interface PasswordChangeData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// Settings types
export interface NotificationSettings {
  emailNotifications: boolean
  orderUpdates: boolean
  marketingEmails: boolean
  securityAlerts: boolean
}

export interface SystemInfo {
  version: string
  environment: string
  apiUrl: string
  lastUpdated: string
}

// Chart data types
export interface ChartDataPoint {
  name: string
  value: number
  [key: string]: any
}

export interface SalesData {
  unitsSold: number
  totalRevenue: number
}

// Component props types
export interface TablePaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export interface LoadingState {
  isLoading: boolean
  error?: string
}

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

// Filter types
export interface FilterOption {
  value: string
  label: string
}

export interface FilterConfig {
  key: string
  label: string
  type: 'select' | 'input' | 'date' | 'checkbox'
  options?: FilterOption[]
  placeholder?: string
} 