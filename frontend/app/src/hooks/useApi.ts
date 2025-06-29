import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { ERROR_MESSAGES } from '@/constants'

interface UseApiOptions<T> {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  requestData?: any
  params?: Record<string, any>
  enabled?: boolean
  onSuccess?: (data: T) => void
  onError?: (error: any) => void
  showErrorToast?: boolean
  showSuccessToast?: boolean
  successMessage?: string
}

interface UseApiReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  mutate: (newData: T) => void
}

export function useApi<T = any>({
  url,
  method = 'GET',
  requestData,
  params,
  enabled = true,
  onSuccess,
  onError,
  showErrorToast = true,
  showSuccessToast = false,
  successMessage,
}: UseApiOptions<T>): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use refs to store the latest values without causing re-renders
  const optionsRef = useRef({
    onSuccess,
    onError,
    showErrorToast,
    showSuccessToast,
    successMessage,
  })

  // Update ref when options change
  useEffect(() => {
    optionsRef.current = {
      onSuccess,
      onError,
      showErrorToast,
      showSuccessToast,
      successMessage,
    }
  }, [onSuccess, onError, showErrorToast, showSuccessToast, successMessage])

  const executeRequest = useCallback(async () => {
    if (!enabled) return

    setLoading(true)
    setError(null)

    try {
      const response = await api.request({
        url,
        method,
        data: requestData,
        params,
      })

      const responseData = response.data
      setData(responseData)

      if (optionsRef.current.onSuccess) {
        optionsRef.current.onSuccess(responseData)
      }

      if (optionsRef.current.showSuccessToast && optionsRef.current.successMessage) {
        toast.success(optionsRef.current.successMessage)
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || ERROR_MESSAGES.UNKNOWN_ERROR
      setError(errorMessage)

      if (optionsRef.current.onError) {
        optionsRef.current.onError(err)
      }

      if (optionsRef.current.showErrorToast) {
        toast.error(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }, [url, method, requestData, params, enabled])

  useEffect(() => {
    executeRequest()
  }, [executeRequest])

  const refetch = useCallback(async () => {
    await executeRequest()
  }, [executeRequest])

  const mutate = useCallback((newData: T) => {
    setData(newData)
  }, [])

  return {
    data,
    loading,
    error,
    refetch,
    mutate,
  }
}

// Specialized hooks for common operations
export function useGet<T = any>(
  url: string,
  params?: Record<string, any>,
  options?: Omit<UseApiOptions<T>, 'url' | 'method' | 'params'>
) {
  return useApi<T>({
    url,
    method: 'GET',
    params,
    ...options,
  })
}

export function usePost<T = any>(
  url: string,
  requestData?: any,
  options?: Omit<UseApiOptions<T>, 'url' | 'method' | 'requestData'>
) {
  return useApi<T>({
    url,
    method: 'POST',
    requestData,
    ...options,
  })
}

export function usePut<T = any>(
  url: string,
  requestData?: any,
  options?: Omit<UseApiOptions<T>, 'url' | 'method' | 'requestData'>
) {
  return useApi<T>({
    url,
    method: 'PUT',
    requestData,
    ...options,
  })
}

export function usePatch<T = any>(
  url: string,
  requestData?: any,
  options?: Omit<UseApiOptions<T>, 'url' | 'method' | 'requestData'>
) {
  return useApi<T>({
    url,
    method: 'PATCH',
    requestData,
    ...options,
  })
}

export function useDelete<T = any>(
  url: string,
  options?: Omit<UseApiOptions<T>, 'url' | 'method'>
) {
  return useApi<T>({
    url,
    method: 'DELETE',
    ...options,
  })
} 