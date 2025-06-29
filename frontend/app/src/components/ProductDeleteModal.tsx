import React from 'react'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import type { Product } from '@/types'

interface ProductDeleteModalProps {
  product: Product | null
  onClose: () => void
  onDeleted: () => void
}

export default function ProductDeleteModal({ product, onClose, onDeleted }: ProductDeleteModalProps) {
  if (!product) return null

  const handleDelete = async () => {
    await api.delete(`/admin/products/${product.id}`)
    onDeleted()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background p-6 rounded-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Delete Product</h2>
        <p>Are you sure you want to delete <b>{product.name}</b>?</p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>
      </div>
    </div>
  )
} 