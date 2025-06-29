import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Check } from 'lucide-react'

interface ProductFiltersProps {
  appliedFilters: Record<string, any>
  onApply: (filters: Record<string, any>) => void
}

export const categoryOptions = [
  { value: 'ELECTRONICS', label: 'Electronics' },
  { value: 'CLOTHING', label: 'Clothing' },
  { value: 'T_SHIRTS', label: 'T-Shirts' },
  { value: 'SHIRTS', label: 'Shirts' },
  { value: 'PANTS', label: 'Pants' },
  { value: 'SHOES', label: 'Shoes' },
  { value: 'ACCESSORIES', label: 'Accessories' },
  { value: 'BOOKS', label: 'Books' },
  { value: 'HOME', label: 'Home' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'BEAUTY', label: 'Beauty' },
  { value: 'FOOD', label: 'Food' },
  { value: 'OTHER', label: 'Other' },
]

const sortOptions = [
  { value: 'price', label: 'Price' },
  { value: 'stockQuantity', label: 'Stock Quantity' },
  { value: 'rating', label: 'Rating' },
  { value: 'name', label: 'Alphabetically' },
  { value: 'createdAt', label: 'Last Modified' },
  { value: 'updatedAt', label: 'Last Updated' },
]

const orderOptions = [
  { value: 'ASC', label: 'A → Z' },
  { value: 'DESC', label: 'Z → A' },
]

function getSortLabel(sortBy: string | undefined) {
  return sortOptions.find(opt => opt.value === sortBy)?.label || 'Last Modified'
}

export default function ProductFilters({ appliedFilters, onApply }: ProductFiltersProps) {
  const [localFilters, setLocalFilters] = useState(appliedFilters)

  useEffect(() => {
    setLocalFilters(appliedFilters)
  }, [appliedFilters])

  const handleApply = () => {
    onApply(localFilters)
  }

  const handleClear = () => {
    setLocalFilters({})
  }

  const filtersChanged = JSON.stringify(localFilters) !== JSON.stringify(appliedFilters)

  return (
    <div className="flex flex-wrap gap-2 mb-4 items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={(localFilters.sortBy ? 'ring-2 ring-primary-foreground border-primary-foreground ' : '') + 'cursor-pointer'}>Sort By: {getSortLabel(localFilters.sortBy)}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {sortOptions.map(opt => (
            <DropdownMenuItem className="cursor-pointer" key={opt.value} onClick={() => setLocalFilters(f => ({ ...f, sortBy: opt.value }))}>
              {localFilters.sortBy === opt.value && <Check className="w-4 h-4 mr-2 text-primary" />}
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {localFilters.sortBy === 'name' && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={(localFilters.orderDirection ? 'ring-2 ring-primary-foreground border-primary-foreground ' : '') + 'cursor-pointer'}>{orderOptions.find(o => o.value === localFilters.orderDirection)?.label || 'A → Z'}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {orderOptions.map(opt => (
              <DropdownMenuItem className="cursor-pointer" key={opt.value} onClick={() => setLocalFilters(f => ({ ...f, orderDirection: opt.value }))}>
                {localFilters.orderDirection === opt.value && <Check className="w-4 h-4 mr-2 text-primary" />}
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={(localFilters.category ? 'ring-2 ring-primary-foreground border-primary-foreground ' : '') + 'cursor-pointer'}>{categoryOptions.find(opt => opt.value === localFilters.category)?.label || 'Product Category'}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem className="cursor-pointer" onClick={() => setLocalFilters(f => ({ ...f, category: '' }))}>
            {localFilters.category === '' && <Check className="w-4 h-4 mr-2 text-primary" />}
            All
          </DropdownMenuItem>
          {categoryOptions.map(opt => (
            <DropdownMenuItem className="cursor-pointer" key={opt.value} onClick={() => setLocalFilters(f => ({ ...f, category: opt.value }))}>
              {localFilters.category === opt.value && <Check className="w-4 h-4 mr-2 text-primary" />}
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={(localFilters.stockStatus ? 'ring-2 ring-primary-foreground border-primary-foreground ' : '') + 'cursor-pointer'}>{localFilters.stockStatus || 'Stock Status'}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem className="cursor-pointer" onClick={() => setLocalFilters(f => ({ ...f, stockStatus: '' }))}>
            {localFilters.stockStatus === '' && <Check className="w-4 h-4 mr-2 text-primary" />}
            All
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => setLocalFilters(f => ({ ...f, stockStatus: 'inStock' }))}>
            {localFilters.stockStatus === 'inStock' && <Check className="w-4 h-4 mr-2 text-primary" />}
            In Stock
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => setLocalFilters(f => ({ ...f, stockStatus: 'outOfStock' }))}>
            {localFilters.stockStatus === 'outOfStock' && <Check className="w-4 h-4 mr-2 text-primary" />}
            Out of Stock
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={(localFilters.lastModified ? 'ring-2 ring-primary-foreground border-primary-foreground ' : '') + 'cursor-pointer'}>Last Modified: {localFilters.lastModified === 'desc' ? 'Newest' : 'Oldest'}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem className="cursor-pointer" onClick={() => setLocalFilters(f => ({ ...f, lastModified: 'desc' }))}>
            {localFilters.lastModified === 'desc' && <Check className="w-4 h-4 mr-2 text-primary" />}
            Newest
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => setLocalFilters(f => ({ ...f, lastModified: 'asc' }))}>
            {localFilters.lastModified === 'asc' && <Check className="w-4 h-4 mr-2 text-primary" />}
            Oldest
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="default"
        onClick={handleApply}
        disabled={!filtersChanged}
        className="cursor-pointer bg-accent text-accent-foreground hover:opacity-80"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground', borderColor: 'var(--accent)' }}
      >
        Apply
      </Button>
      <Button
        variant="outline"
        onClick={handleClear}
        className="cursor-pointer border border-[var(--accent)]"
        style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
      >
        Clear
      </Button>
    </div>
  )
} 