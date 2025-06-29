import { useState, useMemo, useEffect } from 'react'
import { PAGINATION } from '@/constants'

interface UsePaginationOptions {
  total: number
  pageSize?: number
  initialPage?: number
  maxVisiblePages?: number
}

interface UsePaginationReturn {
  currentPage: number
  pageSize: number
  totalPages: number
  startIndex: number
  endIndex: number
  hasNextPage: boolean
  hasPrevPage: boolean
  pageNumbers: (number | string)[]
  goToPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  setPageSize: (size: number) => void
  reset: () => void
  updateTotal: (newTotal: number) => void
}

export function usePagination({
  total,
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
  initialPage = 1,
  maxVisiblePages = 5,
}: UsePaginationOptions): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [currentPageSize, setCurrentPageSize] = useState(pageSize)
  const [currentTotal, setCurrentTotal] = useState(total)

  // Update total when it changes
  useEffect(() => {
    setCurrentTotal(total)
  }, [total])

  const totalPages = Math.ceil(currentTotal / currentPageSize)
  const startIndex = (currentPage - 1) * currentPageSize
  const endIndex = Math.min(startIndex + currentPageSize, currentTotal)
  const hasNextPage = currentPage < totalPages
  const hasPrevPage = currentPage > 1

  // Reset to first page if current page is beyond total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages])

  // Generate page numbers with ellipsis for better UX
  const pageNumbers = useMemo(() => {
    const delta = Math.floor(maxVisiblePages / 2)
    const range: (number | string)[] = []

    for (
      let i = Math.max(1, currentPage - delta);
      i <= Math.min(totalPages, currentPage + delta);
      i++
    ) {
      range.push(i)
    }

    // Add ellipsis and first page if needed
    if (range.length > 0 && typeof range[0] === 'number' && range[0] > 2) {
      range.unshift('...')
    }
    if (range.length === 0 || (typeof range[0] === 'number' && range[0] !== 1)) {
      range.unshift(1)
    }

    // Add ellipsis and last page if needed
    const last = range[range.length - 1]
    if (typeof last === 'number' && last < totalPages - 1) {
      range.push('...')
    }
    if (typeof last === 'number' && last !== totalPages) {
      range.push(totalPages)
    }

    return range
  }, [currentPage, totalPages, maxVisiblePages])

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const nextPage = () => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1)
    }
  }

  const prevPage = () => {
    if (hasPrevPage) {
      setCurrentPage(prev => prev - 1)
    }
  }

  const setPageSize = (size: number) => {
    setCurrentPageSize(size)
    setCurrentPage(1) // Reset to first page when changing page size
  }

  const reset = () => {
    setCurrentPage(initialPage)
    setCurrentPageSize(pageSize)
  }

  const updateTotal = (newTotal: number) => {
    setCurrentTotal(newTotal)
  }

  return {
    currentPage,
    pageSize: currentPageSize,
    totalPages,
    startIndex,
    endIndex,
    hasNextPage,
    hasPrevPage,
    pageNumbers,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
    reset,
    updateTotal,
  }
} 