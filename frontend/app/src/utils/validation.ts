import { VALIDATION } from '@/constants'

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  return VALIDATION.EMAIL_REGEX.test(email)
}

/**
 * Validate phone number format
 */
export const validatePhone = (phone: string): boolean => {
  return VALIDATION.PHONE_REGEX.test(phone)
}

/**
 * Validate password strength
 */
export const validatePassword = (password: string): {
  isValid: boolean
  errors: string[]
} => {
  const errors: string[] = []

  if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters long`)
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validate required fields
 */
export const validateRequired = (value: any, fieldName: string): string | null => {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`
  }
  return null
}

/**
 * Validate minimum length
 */
export const validateMinLength = (
  value: string,
  minLength: number,
  fieldName: string
): string | null => {
  if (value && value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters long`
  }
  return null
}

/**
 * Validate maximum length
 */
export const validateMaxLength = (
  value: string,
  maxLength: number,
  fieldName: string
): string | null => {
  if (value && value.length > maxLength) {
    return `${fieldName} must be no more than ${maxLength} characters long`
  }
  return null
}

/**
 * Validate numeric value
 */
export const validateNumber = (
  value: any,
  fieldName: string,
  min?: number,
  max?: number
): string | null => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(numValue)) {
    return `${fieldName} must be a valid number`
  }

  if (min !== undefined && numValue < min) {
    return `${fieldName} must be at least ${min}`
  }

  if (max !== undefined && numValue > max) {
    return `${fieldName} must be no more than ${max}`
  }

  return null
}

/**
 * Validate file upload
 */
export const validateFile = (
  file: File,
  maxSize: number,
  allowedTypes: string[]
): string | null => {
  if (file.size > maxSize) {
    return `File size must be less than ${formatFileSize(maxSize)}`
  }

  if (!allowedTypes.includes(file.type)) {
    return `File type must be one of: ${allowedTypes.join(', ')}`
  }

  return null
}

/**
 * Validate URL format
 */
export const validateUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validate form data object
 */
export const validateForm = (
  data: Record<string, any>,
  rules: Record<string, (value: any) => string | null>
): Record<string, string> => {
  const errors: Record<string, string> = {}

  Object.keys(rules).forEach(field => {
    const error = rules[field](data[field])
    if (error) {
      errors[field] = error
    }
  })

  return errors
}

/**
 * Check if form is valid
 */
export const isFormValid = (errors: Record<string, string>): boolean => {
  return Object.keys(errors).length === 0
}

/**
 * Validate product data
 */
export const validateProduct = (data: {
  name: string
  price: number
  stockQuantity: number
  category: string
}): Record<string, string> => {
  return validateForm(data, {
    name: (value) => validateRequired(value, 'Product name') || validateMinLength(value, 2, 'Product name'),
    price: (value) => validateRequired(value, 'Price') || validateNumber(value, 'Price', 0),
    stockQuantity: (value) => validateRequired(value, 'Stock quantity') || validateNumber(value, 'Stock quantity', 0),
    category: (value) => validateRequired(value, 'Category'),
  })
}

/**
 * Validate user data
 */
export const validateUser = (data: {
  firstName: string
  lastName: string
  email: string
  phone?: string
}): Record<string, string> => {
  return validateForm(data, {
    firstName: (value) => validateRequired(value, 'First name') || validateMinLength(value, 2, 'First name'),
    lastName: (value) => validateRequired(value, 'Last name') || validateMinLength(value, 2, 'Last name'),
    email: (value) => {
      const requiredError = validateRequired(value, 'Email')
      if (requiredError) return requiredError
      return validateEmail(value) ? null : 'Please enter a valid email address'
    },
    phone: (value) => {
      if (!value) return null // Phone is optional
      return validatePhone(value) ? null : 'Please enter a valid phone number'
    },
  })
}

/**
 * Validate login data
 */
export const validateLogin = (data: {
  email: string
  password: string
}): Record<string, string> => {
  return validateForm(data, {
    email: (value) => {
      const requiredError = validateRequired(value, 'Email')
      if (requiredError) return requiredError
      return validateEmail(value) ? null : 'Please enter a valid email address'
    },
    password: (value) => validateRequired(value, 'Password'),
  })
}

// Helper function for file size formatting (imported from formatters)
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
} 