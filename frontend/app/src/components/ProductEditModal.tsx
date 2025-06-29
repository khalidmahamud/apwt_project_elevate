import { useState, useEffect, ChangeEvent, FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import type { Product } from './ProductTable'
import { categoryOptions } from './ProductFilters'

interface ProductEditModalProps {
  product: Product | null
  onClose: () => void
  onSaved: () => void
}

const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const colorOptions = ['Black', 'White', 'Navy', 'Burgundy', 'Forest Green']

export default function ProductEditModal({ product, onClose, onSaved }: ProductEditModalProps) {
  const [form, setForm] = useState<Product | {}>(product || {})
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [imageFiles, setImageFiles] = useState<File[]>([])

  useEffect(() => {
    if (product) {
      // Convert specifications object to array of {key, value} for editing
      let specs = []
      const rawSpecs = (product as any).specifications
      if (rawSpecs && typeof rawSpecs === 'object' && !Array.isArray(rawSpecs)) {
        specs = Object.entries(rawSpecs).map(([key, value]) => ({ key, value }))
      } else if (Array.isArray(rawSpecs)) {
        specs = rawSpecs
      }
      setForm({ ...product, specifications: specs })
    } else {
      setForm({})
    }
    setErrors({})
  }, [product])

  if (!product) return null

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    let checked = false
    if (type === 'checkbox' && 'checked' in e.target) {
      checked = (e.target as HTMLInputElement).checked
    }
    if (type === 'checkbox') {
      setForm({ ...form, [name]: checked })
    } else {
      setForm({ ...form, [name]: value })
    }
    setErrors({ ...errors, [name]: '' })
  }

  const handleMultiSelect = (name: string, value: string) => {
    setForm(prev => {
      const arr = (prev as any)[name] as string[]
      return {
        ...prev,
        [name]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
      }
    })
  }

  const handleSpecChange = (idx: number, key: string, value: string) => {
    setForm(prev => {
      const specs = [...((prev as any).specifications || [])]
      specs[idx] = { ...specs[idx], [key]: value }
      return { ...prev, specifications: specs }
    })
  }

  const addSpec = () => setForm(prev => ({ ...prev, specifications: [...((prev as any).specifications || []), { key: '', value: '' }] }))
  const removeSpec = (idx: number) => setForm(prev => ({ ...prev, specifications: ((prev as any).specifications || []).filter((_: any, i: number) => i !== idx) }))

  const validate = () => {
    const newErrors: { [key: string]: string } = {}
    if (!(form as Product).name) newErrors.name = 'Product name is required.'
    if (!(form as Product).price) newErrors.price = 'Price is required.'
    if (!(form as Product).stockQuantity) newErrors.stockQuantity = 'Stock quantity is required.'
    return newErrors
  }

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImageFiles(Array.from(e.target.files))
    }
  }

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (!url.startsWith('http')) {
      return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${url}`;
    }
    return url;
  };

  const uploadImages = async () => {
    if (imageFiles.length === 0) return (form as any).imageUrl ? [(form as any).imageUrl] : []
    // Upload the first image file
    const formData = new FormData()
    formData.append('file', imageFiles[0])
    const res = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return [res.data.url]
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setSaving(true)
    const uploadedImages = await uploadImages()
    const imageUrl = uploadedImages.length > 0 ? getFullUrl(uploadedImages[0]) : getFullUrl((form as any).imageUrl) || undefined;
    const payload: any = {
      name: (form as any).name,
      brand: (form as any).brand,
      price: Number((form as any).price),
      discountedPrice: (form as any).discountedPrice !== undefined ? Number((form as any).discountedPrice) : undefined,
      stockQuantity: (form as any).stockQuantity !== undefined ? Number((form as any).stockQuantity) : undefined,
      category: (form as any).category,
      sizes: (form as any).sizes,
      colors: (form as any).colors,
      description: (form as any).description,
      material: (form as any).material,
      careInstructions: (form as any).careInstructions,
      imageUrl,
      images: imageUrl ? [imageUrl] : [],
      specifications: (form as any).specifications ? Object.fromEntries((form as any).specifications.filter((s: any) => s.key).map((s: any) => [s.key, s.value])) : undefined,
      isFeatured: (form as any).isFeatured,
      isNewArrival: (form as any).isNewArrival,
      isBestSeller: (form as any).isBestSeller,
      isOnSale: (form as any).isOnSale,
    }
    console.log('Payload being sent:', payload);
    await api.patch(`/admin/products/${product.id}`, payload)
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-background p-2 md:p-4 rounded-xl w-full max-w-4xl min-h-[100px] shadow-lg border border-border flex flex-col justify-center">
        <h2 className="text-2xl font-bold mb-2 text-center">Edit Product</h2>
        <form className="flex flex-col gap-2" onSubmit={handleSave}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="font-medium">Product Name</label>
              <input className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" id="name" name="name" value={(form as any).name || ''} onChange={handleChange} placeholder="Product Name" autoFocus />
              {errors.name && <span className="text-red-500 text-xs mt-1">{errors.name}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="brand" className="font-medium">Brand</label>
              <input className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" id="brand" name="brand" value={(form as any).brand || ''} onChange={handleChange} placeholder="Brand" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="price" className="font-medium">Price</label>
              <input className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" id="price" name="price" type="number" min="0" step="0.01" value={(form as any).price || ''} onChange={handleChange} placeholder="Price" />
              {errors.price && <span className="text-red-500 text-xs mt-1">{errors.price}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="discountedPrice" className="font-medium">Sale Price</label>
              <input className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" id="discountedPrice" name="discountedPrice" type="number" min="0" step="0.01" value={(form as any).discountedPrice || ''} onChange={handleChange} placeholder="Sale Price" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="stockQuantity" className="font-medium">Stock Quantity</label>
              <input className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" id="stockQuantity" name="stockQuantity" type="number" min="0" value={(form as any).stockQuantity || ''} onChange={handleChange} placeholder="Stock Quantity" />
              {errors.stockQuantity && <span className="text-red-500 text-xs mt-1">{errors.stockQuantity}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="category" className="font-medium">Category</label>
              <select className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" id="category" name="category" value={(form as any).category || ''} onChange={handleChange}>
                <option value="">Select Category</option>
                {categoryOptions.map((opt: { value: string; label: string }) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-medium">Sizes</label>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map(size => (
                  <label key={size} className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={((form as any).sizes || []).includes(size)} onChange={() => handleMultiSelect('sizes', size)} />
                    {size}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-medium">Colors</label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map(color => (
                  <label key={color} className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={((form as any).colors || []).includes(color)} onChange={() => handleMultiSelect('colors', color)} />
                    {color}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1 md:col-span-2">
              <label htmlFor="description" className="font-medium">Description</label>
              <textarea className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" id="description" name="description" value={(form as any).description || ''} onChange={handleChange} placeholder="Description" rows={2} />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="material" className="font-medium">Material</label>
              <input className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" id="material" name="material" value={(form as any).material || ''} onChange={handleChange} placeholder="Material" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="careInstructions" className="font-medium">Care Instructions</label>
              <input className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" id="careInstructions" name="careInstructions" value={(form as any).careInstructions || ''} onChange={handleChange} placeholder="Care Instructions" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="imageUrl" className="font-medium">Image URL</label>
              <input className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" id="imageUrl" name="imageUrl" value={(form as any).imageUrl || ''} onChange={handleChange} placeholder="Image URL" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="images" className="font-medium">Upload Images</label>
              <input type="file" id="images" name="images" multiple onChange={handleImageChange} className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-medium">Specifications</label>
            <div className="flex flex-col gap-2 w-full">
              {((form as any).specifications || []).map((spec: any, idx: number) => (
                <div key={idx} className="flex gap-2 items-center mb-1">
                  <input className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Key" value={spec.key} onChange={e => handleSpecChange(idx, 'key', e.target.value)} />
                  <input className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Value" value={spec.value} onChange={e => handleSpecChange(idx, 'value', e.target.value)} />
                  <Button type="button" variant="outline" size="sm" onClick={() => removeSpec(idx)}>-</Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addSpec}>Add Specification</Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="isFeatured" checked={(form as any).isFeatured || false} onChange={handleChange} /> Featured
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="isNewArrival" checked={(form as any).isNewArrival || false} onChange={handleChange} /> New Arrival
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="isBestSeller" checked={(form as any).isBestSeller || false} onChange={handleChange} /> Best Seller
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="isOnSale" checked={(form as any).isOnSale || false} onChange={handleChange} /> On Sale
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="default" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
} 