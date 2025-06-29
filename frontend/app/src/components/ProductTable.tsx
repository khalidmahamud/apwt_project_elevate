import { useEffect, useState } from 'react'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'

const PAGE_SIZE = 10

export interface Product {
  id: string
  name: string
  price: number
  images?: string[]
  stockQuantity: number
  rating?: number
}

interface ProductTableProps {
  filters: Record<string, any>
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
  refreshKey: number
  page: number
  setPage: (page: number) => void
}

export default function ProductTable({ filters, onEdit, onDelete, refreshKey, page, setPage }: ProductTableProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sales, setSales] = useState<Record<string, { unitsSold: number; totalRevenue: number }>>({})

  useEffect(() => {
    setLoading(true)
    // Map frontend filters to backend-supported query params
    const mapFilters = (filters: Record<string, any>) => {
      const params: Record<string, any> = {}
      // Category
      if (filters.category) params.category = filters.category
      // Stock status
      if (filters.stockStatus === 'inStock') params.minStock = 1
      if (filters.stockStatus === 'outOfStock') params.maxStock = 0
      // Sorting
      if (filters.sortBy && ['name','price','stockQuantity','createdAt','updatedAt','rating'].includes(filters.sortBy)) params.sortBy = filters.sortBy
      if (filters.orderDirection) params.orderDirection = filters.orderDirection
      // Last Modified (overrides sortBy/orderDirection if set)
      if (filters.lastModified) {
        params.sortBy = 'createdAt'
        params.orderDirection = filters.lastModified === 'desc' ? 'DESC' : 'ASC'
      }
      // Add more mappings as needed (e.g., price, rating)
      return params
    }
    api.get('/admin/products', {
      params: { ...mapFilters(filters), page, limit: PAGE_SIZE }
    })
      .then(res => {
        setProducts(res.data.data)
        setTotal(res.data.total)
      })
      .catch(() => {/* handle error */})
      .finally(() => setLoading(false))
  }, [filters, page, refreshKey])

  useEffect(() => {
    // Fetch total sale for all products in the current page
    async function fetchSales() {
      const salesData: Record<string, { unitsSold: number; totalRevenue: number }> = {}
      await Promise.all(products.map(async (product) => {
        try {
          const res = await api.get(`/admin/products/${product.id}/total-sale`)
          salesData[product.id] = res.data
        } catch {
          salesData[product.id] = { unitsSold: 0, totalRevenue: 0 }
        }
      }))
      setSales(salesData)
    }
    if (products.length > 0) fetchSales()
  }, [products])

  const totalPages = Math.ceil(total / PAGE_SIZE)

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
            {loading ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9}><Skeleton className="h-6 w-full" /></TableCell>
                </TableRow>
              ))
            ) : (
              products.map(product => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <img src={product.images?.[0] || '/placeholder-shoe.png'} alt={product.name} className="w-8 h-8 rounded" />
                      {product.name}
                    </div>
                  </TableCell>
                  <TableCell>{product.id}</TableCell>
                  <TableCell>{product.price}</TableCell>
                  <TableCell>{product.stockQuantity}</TableCell>
                  <TableCell>
                    <Badge variant={product.stockQuantity > 0 ? 'default' : 'destructive'}>
                      {product.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </TableCell>
                  <TableCell>{sales[product.id]?.unitsSold ?? <Skeleton className="h-4 w-12" />}</TableCell>
                  <TableCell>{sales[product.id]?.totalRevenue !== undefined ? `$${sales[product.id].totalRevenue.toLocaleString()}` : <Skeleton className="h-4 w-16" />}</TableCell>
                  <TableCell>{product.rating} ⭐</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => onEdit(product)}><Pencil /></Button>
                    <Button size="icon" variant="destructive" onClick={() => onDelete(product)}><Trash2 /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {/* Pagination Controls */}
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
  )
} 