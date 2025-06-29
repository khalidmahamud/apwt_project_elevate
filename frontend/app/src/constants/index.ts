// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REFRESH_TOKEN: '/auth/refresh',
  
  // Users
  USERS: '/admin/users',
  USER_PROFILE: (id: string) => `/admin/users/${id}`,
  USER_PASSWORD: (id: string) => `/admin/users/${id}/password`,
  USER_PROFILE_IMAGE: (id: string) => `/admin/users/${id}/profile-image`,
  
  // Products
  PRODUCTS: '/admin/products',
  PRODUCT: (id: string) => `/admin/products/${id}`,
  PRODUCT_SALES: (id: string) => `/admin/products/${id}/total-sale`,
  
  // Orders
  ORDERS: '/admin/orders',
  ORDER: (id: string) => `/admin/orders/${id}`,
  ORDER_ANALYTICS: '/admin/orders/analytics/summary',
  ORDER_REPORT: '/admin/orders/report/download',
  
  // Upload
  UPLOAD: '/upload',
} as const

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const

// Chart Colors
export const CHART_COLORS = {
  PRIMARY: '#10B981',
  SECONDARY: '#38BDF8',
  TERTIARY: '#8B5CF6',
  WARNING: '#F59E0B',
  DANGER: '#EF4444',
  SUCCESS: '#10B981',
  INFO: '#3B82F6',
  PURPLE: '#8B5CF6',
  ORANGE: '#FFB957',
  TEAL: '#14B8A6',
  PINK: '#EC4899',
  INDIGO: '#6366F1',
} as const

// Product Categories
export const PRODUCT_CATEGORIES = [
  'Electronics',
  'Clothing',
  'Books',
  'Home & Garden',
  'Sports',
  'Beauty',
  'Toys',
  'Automotive',
  'Health',
  'Food & Beverages',
] as const

// Order Statuses
export const ORDER_STATUSES = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUSES.PENDING]: 'Pending',
  [ORDER_STATUSES.PROCESSING]: 'Processing',
  [ORDER_STATUSES.SHIPPED]: 'Shipped',
  [ORDER_STATUSES.DELIVERED]: 'Delivered',
  [ORDER_STATUSES.CANCELLED]: 'Cancelled',
} as const

export const ORDER_STATUS_COLORS = {
  [ORDER_STATUSES.PENDING]: 'bg-yellow-100 text-yellow-800',
  [ORDER_STATUSES.PROCESSING]: 'bg-blue-100 text-blue-800',
  [ORDER_STATUSES.SHIPPED]: 'bg-purple-100 text-purple-800',
  [ORDER_STATUSES.DELIVERED]: 'bg-green-100 text-green-800',
  [ORDER_STATUSES.CANCELLED]: 'bg-red-100 text-red-800',
} as const

// User Roles
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const

// Sort Options
export const SORT_OPTIONS = {
  NAME: 'name',
  PRICE: 'price',
  STOCK_QUANTITY: 'stockQuantity',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  RATING: 'rating',
} as const

export const SORT_DIRECTIONS = {
  ASC: 'ASC',
  DESC: 'DESC',
} as const

// Stock Status
export const STOCK_STATUS = {
  IN_STOCK: 'inStock',
  OUT_OF_STOCK: 'outOfStock',
} as const

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_FILES: 5,
} as const

// Validation
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[\d\s\-\(\)]+$/,
} as const

// Theme
export const THEME = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const

// Local Storage Keys
export const STORAGE_KEYS = {
  THEME: 'theme',
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
} as const

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  API: 'yyyy-MM-dd',
  DATETIME: 'MMM dd, yyyy HH:mm',
  TIME: 'HH:mm',
} as const

// Currency
export const CURRENCY = {
  CODE: 'USD',
  SYMBOL: '$',
  LOCALE: 'en-US',
} as const

// Animation
export const ANIMATION = {
  DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
  },
  EASING: {
    EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    EASE_OUT: 'cubic-bezier(0, 0, 0.2, 1)',
    EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)',
  },
} as const

// Breakpoints
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNKNOWN_ERROR: 'An unexpected error occurred.',
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  CREATED: 'Successfully created.',
  UPDATED: 'Successfully updated.',
  DELETED: 'Successfully deleted.',
  SAVED: 'Successfully saved.',
  UPLOADED: 'Successfully uploaded.',
  DOWNLOADED: 'Successfully downloaded.',
} as const 