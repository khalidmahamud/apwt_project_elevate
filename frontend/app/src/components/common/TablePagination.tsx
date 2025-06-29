import React from 'react'
import { Button } from '@/components/ui/button'
import { TablePaginationProps } from '@/types'

const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) {
    return null
  }

  // Helper for windowed pagination
  const getPageNumbers = (current: number, total: number) => {
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
    <div className='flex justify-start mt-4 gap-2'>
      <Button
        variant='outline'
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className='cursor-pointer bg-[var(--accent)] hover:opacity-80'
        style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
      >
        Prev
      </Button>
      
      {getPageNumbers(currentPage, totalPages).map((p, idx) =>
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
            variant={currentPage === p ? 'default' : 'outline'}
            onClick={() => onPageChange(Number(p))}
            className={`cursor-pointer ${
              currentPage === p ? 'text-accent border-1 border-accent' : ''
            }`}
          >
            {p}
          </Button>
        )
      )}
      
      <Button
        variant='outline'
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className='cursor-pointer bg-[var(--accent)] hover:opacity-80'
        style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
      >
        Next
      </Button>
    </div>
  )
}

export default TablePagination 