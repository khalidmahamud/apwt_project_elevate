import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Check, ChevronDown } from 'lucide-react'

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
          <Button 
            variant="outline" 
            className={`cursor-pointer ${localFilters.sortBy ? 'bg-accent text-accent-foreground border-accent' : ''}`}
            style={localFilters.sortBy ? { backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)', borderColor: 'var(--accent)' } : {}}
          >
            {getSortLabel(localFilters.sortBy)}
            <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {sortOptions.map(opt => (
            <DropdownMenuItem 
              className={`cursor-pointer ${localFilters.sortBy === opt.value ? 'bg-accent text-accent-foreground' : ''}`}
              key={opt.value} 
              onClick={() => setLocalFilters(f => ({ ...f, sortBy: opt.value }))}
            >
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {localFilters.sortBy === 'name' && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className={`cursor-pointer ${localFilters.orderDirection ? 'bg-accent text-accent-foreground border-accent' : ''}`}
              style={localFilters.orderDirection ? { backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)', borderColor: 'var(--accent)' } : {}}
            >
              {orderOptions.find(o => o.value === localFilters.orderDirection)?.label || 'A → Z'}
              <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {orderOptions.map(opt => (
              <DropdownMenuItem 
                className={`cursor-pointer ${localFilters.orderDirection === opt.value ? 'bg-accent text-accent-foreground' : ''}`}
                key={opt.value} 
                onClick={() => setLocalFilters(f => ({ ...f, orderDirection: opt.value }))}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className={`cursor-pointer ${localFilters.category ? 'bg-accent text-accent-foreground border-accent' : ''}`}
            style={localFilters.category ? { backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)', borderColor: 'var(--accent)' } : {}}
          >
            {categoryOptions.find(opt => opt.value === localFilters.category)?.label || 'All Categories'}
            <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem 
            className={`cursor-pointer ${localFilters.category === '' ? 'bg-accent text-accent-foreground' : ''}`}
            onClick={() => setLocalFilters(f => ({ ...f, category: '' }))}
          >
            All
          </DropdownMenuItem>
          {categoryOptions.map(opt => (
            <DropdownMenuItem 
              className={`cursor-pointer ${localFilters.category === opt.value ? 'bg-accent text-accent-foreground' : ''}`}
              key={opt.value} 
              onClick={() => setLocalFilters(f => ({ ...f, category: opt.value }))}
            >
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className={`cursor-pointer ${localFilters.stockStatus ? 'bg-accent text-accent-foreground border-accent' : ''}`}
            style={localFilters.stockStatus ? { backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)', borderColor: 'var(--accent)' } : {}}
          >
            {localFilters.stockStatus || 'All Stock'}
            <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem 
            className={`cursor-pointer ${localFilters.stockStatus === '' ? 'bg-accent text-accent-foreground' : ''}`}
            onClick={() => setLocalFilters(f => ({ ...f, stockStatus: '' }))}
          >
            All
          </DropdownMenuItem>
          <DropdownMenuItem 
            className={`cursor-pointer ${localFilters.stockStatus === 'inStock' ? 'bg-accent text-accent-foreground' : ''}`}
            onClick={() => setLocalFilters(f => ({ ...f, stockStatus: 'inStock' }))}
          >
            In Stock
          </DropdownMenuItem>
          <DropdownMenuItem 
            className={`cursor-pointer ${localFilters.stockStatus === 'outOfStock' ? 'bg-accent text-accent-foreground' : ''}`}
            onClick={() => setLocalFilters(f => ({ ...f, stockStatus: 'outOfStock' }))}
          >
            Out of Stock
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className={`cursor-pointer ${localFilters.lastModified ? 'bg-accent text-accent-foreground border-accent' : ''}`}
            style={localFilters.lastModified ? { backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)', borderColor: 'var(--accent)' } : {}}
          >
            {localFilters.lastModified === 'desc' ? 'Newest' : 'Oldest'}
            <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem 
            className={`cursor-pointer ${localFilters.lastModified === 'desc' ? 'bg-accent text-accent-foreground' : ''}`}
            onClick={() => setLocalFilters(f => ({ ...f, lastModified: 'desc' }))}
          >
            Newest
          </DropdownMenuItem>
          <DropdownMenuItem 
            className={`cursor-pointer ${localFilters.lastModified === 'asc' ? 'bg-accent text-accent-foreground' : ''}`}
            onClick={() => setLocalFilters(f => ({ ...f, lastModified: 'asc' }))}
          >
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