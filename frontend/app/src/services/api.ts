import api from '@/lib/api'
import { API_ENDPOINTS } from '@/constants'
import type { 
  Product, 
  Order, 
  User, 
  PaginatedResponse, 
  CreateProductData, 
  UpdateProductData,
  UpdateUserData,
  OrderSummary,
  SalesData
} from '@/types'

// Product Services
export const productService = {
  // Get all products with pagination and filters
  getProducts: async (params?: Record<string, any>): Promise<PaginatedResponse<Product>> => {
    const response = await api.get(API_ENDPOINTS.PRODUCTS, { params })
    return response.data
  },

  // Get a single product by ID
  getProduct: async (id: string): Promise<Product> => {
    const response = await api.get(API_ENDPOINTS.PRODUCT(id))
    return response.data
  },

  // Create a new product
  createProduct: async (data: CreateProductData): Promise<Product> => {
    const response = await api.post(API_ENDPOINTS.PRODUCTS, data)
    return response.data
  },

  // Update a product
  updateProduct: async (id: string, data: UpdateProductData): Promise<Product> => {
    const response = await api.patch(API_ENDPOINTS.PRODUCT(id), data)
    return response.data
  },

  // Delete a product
  deleteProduct: async (id: string): Promise<void> => {
    await api.delete(API_ENDPOINTS.PRODUCT(id))
  },

  // Get product sales data
  getProductSales: async (id: string): Promise<SalesData> => {
    const response = await api.get(API_ENDPOINTS.PRODUCT_SALES(id))
    return response.data
  },
}

// Order Services
export const orderService = {
  // Get all orders with pagination and filters
  getOrders: async (params?: Record<string, any>): Promise<PaginatedResponse<Order>> => {
    const response = await api.get(API_ENDPOINTS.ORDERS, { params })
    return response.data
  },

  // Get a single order by ID
  getOrder: async (id: string): Promise<Order> => {
    const response = await api.get(API_ENDPOINTS.ORDER(id))
    return response.data
  },

  // Get order analytics summary
  getOrderAnalytics: async (): Promise<OrderSummary> => {
    const response = await api.get(API_ENDPOINTS.ORDER_ANALYTICS)
    return response.data
  },

  // Download order report
  downloadOrderReport: async (): Promise<Blob> => {
    const response = await api.get(API_ENDPOINTS.ORDER_REPORT, {
      responseType: 'blob',
    })
    return response.data
  },
}

// User Services
export const userService = {
  // Get all users with pagination and filters
  getUsers: async (params?: Record<string, any>): Promise<PaginatedResponse<User>> => {
    const response = await api.get(API_ENDPOINTS.USERS, { params })
    return response.data
  },

  // Get a single user by ID
  getUser: async (id: string): Promise<User> => {
    const response = await api.get(API_ENDPOINTS.USER_PROFILE(id))
    return response.data
  },

  // Update user profile
  updateUser: async (id: string, data: UpdateUserData): Promise<User> => {
    const response = await api.patch(API_ENDPOINTS.USER_PROFILE(id), data)
    return response.data
  },

  // Update user password
  updateUserPassword: async (id: string, password: string): Promise<void> => {
    await api.patch(API_ENDPOINTS.USER_PASSWORD(id), { password })
  },

  // Update user profile image
  updateUserProfileImage: async (id: string, imageUrl: string): Promise<User> => {
    const response = await api.patch(API_ENDPOINTS.USER_PROFILE_IMAGE(id), { profileImage: imageUrl })
    return response.data
  },
}

// Auth Services
export const authService = {
  // Login user
  login: async (email: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: User }> => {
    const response = await api.post(API_ENDPOINTS.LOGIN, { email, password })
    return response.data
  },

  // Refresh token
  refreshToken: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
    const response = await api.post(API_ENDPOINTS.REFRESH_TOKEN, { refreshToken })
    return response.data
  },
}

// Upload Services
export const uploadService = {
  // Upload file
  uploadFile: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post(API_ENDPOINTS.UPLOAD, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}

// Export all services
export default {
  productService,
  orderService,
  userService,
  authService,
  uploadService,
} 