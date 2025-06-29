"use client"

import ProductTable from '@/components/ProductTable'
import ProductFilters from '@/components/ProductFilters'
import ProductEditModal from '@/components/ProductEditModal'
import ProductDeleteModal from '@/components/ProductDeleteModal'
import ProductAddModal from '@/components/ProductAddModal'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function ProductsPage() {
  const [editProduct, setEditProduct] = useState(null)
  const [deleteProduct, setDeleteProduct] = useState(null)
  const [filters, setFilters] = useState({})
  const [refreshKey, setRefreshKey] = useState(0)
  const [page, setPage] = useState(1)
  const [addProductModal, setAddProductModal] = useState(false)

  // Helper to set filters and reset page
  const setFiltersAndResetPage = (updater) => {
    setFilters(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      return next
    })
    setPage(1)
  }

  return (
    <div className="p-6 bg-background h-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products Management</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            className="bg-[var(--accent)] text-[var(--accent-foreground)] border-[var(--accent)] cursor-pointer hover:opacity-80"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)', borderColor: 'var(--accent)' }}
            onClick={() => setAddProductModal(true)}
          >
            Add New Product
          </Button>
          <Button
            variant="outline"
            className="cursor-pointer border hover:opacity-80"
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
            onClick={() => setRefreshKey(k => k + 1)}
          >
            Refresh
          </Button>
        </div>
      </div>
      <ProductFilters appliedFilters={filters} onApply={setFiltersAndResetPage} />
      <ProductTable 
        filters={filters} 
        onEdit={setEditProduct} 
        onDelete={setDeleteProduct} 
        refreshKey={refreshKey}
        page={page}
        setPage={setPage}
      />
      <ProductEditModal product={editProduct} onClose={() => setEditProduct(null)} onSaved={() => setRefreshKey(k => k + 1)} />
      <ProductDeleteModal product={deleteProduct} onClose={() => setDeleteProduct(null)} onDeleted={() => setRefreshKey(k => k + 1)} />
      <ProductAddModal open={addProductModal} onClose={() => setAddProductModal(false)} onCreated={() => { setAddProductModal(false); setRefreshKey(k => k + 1); }} />
    </div>
  )
}