import { useEffect, useState, useCallback, useMemo } from 'react'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

// Custom hooks and services
import { useGet } from '@/hooks/useApi'
import { usePagination } from '@/hooks/usePagination'
import { productService } from '@/services/api'

// Types and constants
import { Product, ProductFilters, SalesData } from '@/types'
import { PAGINATION } from '@/constants'

// Utilities
import { formatCurrency, formatNumber } from '@/utils/formatters'

// Components
import { LoadingSkeleton, TablePagination } from '@/components/common'

interface ProductTableProps {
  filters: ProductFilters
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
  refreshKey: number
}

export default function ProductTable({ filters, onEdit, onDelete, refreshKey }: ProductTableProps) {
  const [sales, setSales] = useState<Record<string, SalesData>>({})

  // Pagination hook
  const pagination = usePagination({
    total: 0, // Will be updated when we get the response
    pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
    initialPage: 1
  })

  // Memoize the filter mapping to prevent unnecessary recalculations
  const queryParams = useMemo(() => {
    const params: Record<string, any> = {}
    
    if (filters.category) params.category = filters.category
    if (filters.stockStatus === 'inStock') params.minStock = 1
    if (filters.stockStatus === 'outOfStock') params.maxStock = 0
    if (filters.sortBy && ['name','price','stockQuantity','createdAt','updatedAt','rating'].includes(filters.sortBy)) {
      params.sortBy = filters.sortBy
    }
    if (filters.orderDirection) params.orderDirection = filters.orderDirection
    if (filters.lastModified) {
      params.sortBy = 'createdAt'
      params.orderDirection = filters.lastModified === 'desc' ? 'DESC' : 'ASC'
    }
    if (filters.search) params.search = filters.search
    
    return {
      ...params,
      page: pagination.currentPage,
      limit: PAGINATION.DEFAULT_PAGE_SIZE
    }
  }, [filters, pagination.currentPage])

  // Fetch products with pagination
  const {
    data: productsResponse,
    loading,
    error,
    refetch
  } = useGet('/admin/products', queryParams, {
    enabled: true,
    showErrorToast: true
  })

  // Update pagination total when we get the response
  useEffect(() => {
    if (productsResponse?.total !== undefined) {
      pagination.updateTotal(productsResponse.total)
    }
  }, [productsResponse?.total, pagination])

  // Memoize the refetch function to prevent infinite loops
  const stableRefetch = useCallback(() => {
    refetch()
  }, [refetch])

  // Refetch when filters, refresh key, or page changes
  useEffect(() => {
    stableRefetch()
  }, [queryParams, refreshKey, stableRefetch])

  // Fetch sales data for products
  const fetchSales = useCallback(async (products: Product[]) => {
    if (!products.length) return
    
    const salesData: Record<string, SalesData> = {}
    await Promise.all(
      products.map(async (product: Product) => {
        try {
          const sales = await productService.getProductSales(product.id)
          salesData[product.id] = sales
        } catch {
          salesData[product.id] = { unitsSold: 0, totalRevenue: 0 }
        }
      })
    )
    setSales(salesData)
  }, [])

  // Fetch sales when products change
  useEffect(() => {
    if (productsResponse?.data) {
      fetchSales(productsResponse.data)
    }
  }, [productsResponse?.data, fetchSales])

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    pagination.goToPage(page)
  }, [pagination])

  if (loading) {
    return (
      <div className="bg-primary rounded-lg p-4">
        <LoadingSkeleton rows={PAGINATION.DEFAULT_PAGE_SIZE} columns={9} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-primary rounded-lg p-4">
        <div className="text-center py-8">
          <p className="text-red-500">Failed to load products. Please try again.</p>
          <Button onClick={stableRefetch} variant="outline" className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const products = productsResponse?.data || []

  return (
    <>
      <div className="bg-primary rounded-lg p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Product ID</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock Quantity</TableHead>
              <TableHead>Stock Status</TableHead>
              <TableHead>Units Sold</TableHead>
              <TableHead>Total Revenue</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product: Product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <img 
                      src={product.images?.[0] || '/placeholder-shoe.png'} 
                      alt={product.name} 
                      className="w-8 h-8 rounded" 
                    />
                    {product.name}
                  </div>
                </TableCell>
                <TableCell>{product.id}</TableCell>
                <TableCell>{formatCurrency(product.price)}</TableCell>
                <TableCell>{formatNumber(product.stockQuantity)}</TableCell>
                <TableCell>
                  <Badge variant={product.stockQuantity > 0 ? 'default' : 'destructive'}>
                    {product.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {sales[product.id]?.unitsSold !== undefined 
                    ? formatNumber(sales[product.id].unitsSold)
                    : <Skeleton className="h-4 w-12" />
                  }
                </TableCell>
                <TableCell>
                  {sales[product.id]?.totalRevenue !== undefined 
                    ? formatCurrency(sales[product.id].totalRevenue)
                    : <Skeleton className="h-4 w-16" />
                  }
                </TableCell>
                <TableCell>
                  {product.rating ? `${product.rating} ⭐` : 'N/A'}
                </TableCell>
                <TableCell>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => onEdit(product)}
                  >
                    <Pencil />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="destructive" 
                    onClick={() => onDelete(product)}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination Controls */}
      <TablePagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={handlePageChange}
      />
    </>
  )
} 