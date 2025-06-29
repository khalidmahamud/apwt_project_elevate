import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import { categoryOptions } from './ProductFilters'
import type { Product } from '@/types'

const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const colorOptions = ['Black', 'White', 'Navy', 'Burgundy', 'Forest Green']

interface ProductEditModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

export default function ProductEditModal({ product, isOpen, onClose, onSave }: ProductEditModalProps) {
  const [form, setForm] = useState<{
    name: string;
    description: string;
    price: string;
    salePrice: string;
    stockQuantity: string;
    category: string;
    sizes: string[];
    colors: string[];
    imageUrl: string;
    images: string[];
    specifications: { key: string; value: string }[];
    brand: string;
    material: string;
    careInstructions: string;
    isFeatured: boolean;
    isNewArrival: boolean;
    isBestSeller: boolean;
    isOnSale: boolean;
    [key: string]: any;
  }>({
    name: '',
    description: '',
    price: '',
    salePrice: '',
    stockQuantity: '',
    category: '',
    sizes: [],
    colors: [],
    imageUrl: '',
    images: [],
    specifications: [],
    brand: '',
    material: '',
    careInstructions: '',
    isFeatured: false,
    isNewArrival: false,
    isBestSeller: false,
    isOnSale: false,
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [imageFiles, setImageFiles] = useState<File[]>([])

  useEffect(() => {
    if (product) {
      // Convert specifications object to array of {key, value} for editing
      let specs = []
      const rawSpecs = (product as any).specifications
      if (rawSpecs && typeof rawSpecs === 'object' && !Array.isArray(rawSpecs)) {
        specs = Object.entries(rawSpecs).map(([key, value]) => ({ key, value: String(value) }))
      } else if (Array.isArray(rawSpecs)) {
        specs = rawSpecs
      }

      setForm({
        name: product.name,
        description: product.description || '',
        price: product.price.toString(),
        salePrice: (product as any).salePrice?.toString() || '',
        stockQuantity: product.stockQuantity.toString(),
        category: product.category,
        sizes: (product as any).sizes || [],
        colors: (product as any).colors || [],
        imageUrl: (product as any).imageUrl || '',
        images: product.images || [],
        specifications: specs,
        brand: (product as any).brand || '',
        material: (product as any).material || '',
        careInstructions: (product as any).careInstructions || '',
        isFeatured: (product as any).isFeatured || false,
        isNewArrival: (product as any).isNewArrival || false,
        isBestSeller: (product as any).isBestSeller || false,
        isOnSale: (product as any).isOnSale || false,
      })
    }
    setErrors({})
  }, [product])

  if (!isOpen) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
      const arr = prev[name] as string[]
      return {
        ...prev,
        [name]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
      }
    })
  }

  const handleSpecChange = (idx: number, key: string, value: string) => {
    setForm(prev => {
      const specs = [...prev.specifications]
      specs[idx] = { ...specs[idx], [key]: value }
      return { ...prev, specifications: specs }
    })
  }

  const addSpec = () => setForm(prev => ({ ...prev, specifications: [...prev.specifications, { key: '', value: '' }] }))
  const removeSpec = (idx: number) => setForm(prev => ({ ...prev, specifications: prev.specifications.filter((_, i) => i !== idx) }))

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (imageFiles.length === 0) return form.imageUrl ? [form.imageUrl] : []
    // Upload the first image file
    const formData = new FormData()
    formData.append('file', imageFiles[0])
    const res = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return [res.data.url]
  }

  const validate = () => {
    const newErrors: { [key: string]: string } = {}
    if (!form.name) newErrors.name = 'Product name is required.'
    if (!form.description) newErrors.description = 'Description is required.'
    if (!form.price) newErrors.price = 'Price is required.'
    if (!form.stockQuantity) newErrors.stockQuantity = 'Stock quantity is required.'
    if (!form.category) newErrors.category = 'Category is required.'
    return newErrors
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setSaving(true)
    const uploadedImages = await uploadImages()
    const imageUrl = uploadedImages.length > 0 ? getFullUrl(uploadedImages[0]) : getFullUrl(form.imageUrl) || undefined;
    const payload = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      discountedPrice: form.salePrice ? parseFloat(form.salePrice) : undefined,
      stock: parseInt(form.stockQuantity, 10),
      category: form.category,
      sizes: form.sizes,
      colors: form.colors,
      imageUrl,
      images: imageUrl ? [imageUrl] : [],
      specifications: Object.fromEntries(form.specifications.filter(s => s.key).map(s => [s.key, s.value])),
      brand: form.brand,
      material: form.material,
      careInstructions: form.careInstructions,
      isFeatured: form.isFeatured,
      isNewArrival: form.isNewArrival,
      isBestSeller: form.isBestSeller,
      isOnSale: form.isOnSale,
    }
    console.log('Update payload being sent:', payload);
    await api.patch(`/admin/products/${product.id}`, payload)
    setSaving(false)
    onSave()
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
              <input className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" id="name" name="name" value={form.name} onChange={handleChange} placeholder="Product Name" autoFocus />
              {errors.name && <span className="text-red-500 text-xs mt-1">{errors.name}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="brand" className="font-medium">Brand</label>
              <input className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" id="brand" name="brand" value={form.brand} onChange={handleChange} placeholder="Brand" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="price" className="font-medium">Price</label>
              <input className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" id="price" name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} placeholder="Price" />
              {errors.price && <span className="text-red-500 text-xs mt-1">{errors.price}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="salePrice" className="font-medium">Sale Price</label>
              <input className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" id="salePrice" name="salePrice" type="number" min="0" step="0.01" value={form.salePrice} onChange={handleChange} placeholder="Sale Price" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="stockQuantity" className="font-medium">Stock Quantity</label>
              <input className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" id="stockQuantity" name="stockQuantity" type="number" min="0" value={form.stockQuantity} onChange={handleChange} placeholder="Stock Quantity" />
              {errors.stockQuantity && <span className="text-red-500 text-xs mt-1">{errors.stockQuantity}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="category" className="font-medium">Category</label>
              <select className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" id="category" name="category" value={form.category} onChange={handleChange}>
                <option value="">Select Category</option>
                {categoryOptions.map((opt: { value: string; label: string }) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {errors.category && <span className="text-red-500 text-xs mt-1">{errors.category}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-medium">Sizes</label>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map(size => (
                  <label key={size} className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={form.sizes.includes(size)} onChange={() => handleMultiSelect('sizes', size)} />
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
                    <input type="checkbox" checked={form.colors.includes(color)} onChange={() => handleMultiSelect('colors', color)} />
                    {color}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1 md:col-span-2">
              <label htmlFor="description" className="font-medium">Description</label>
              <textarea className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" id="description" name="description" value={form.description} onChange={handleChange} placeholder="Description" rows={2} />
              {errors.description && <span className="text-red-500 text-xs mt-1">{errors.description}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="material" className="font-medium">Material</label>
              <input className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" id="material" name="material" value={form.material} onChange={handleChange} placeholder="Material" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="careInstructions" className="font-medium">Care Instructions</label>
              <input className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" id="careInstructions" name="careInstructions" value={form.careInstructions} onChange={handleChange} placeholder="Care Instructions" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="imageUrl" className="font-medium">Image URL</label>
              <input className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" id="imageUrl" name="imageUrl" value={form.imageUrl} onChange={handleChange} placeholder="Image URL" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="images" className="font-medium">Upload Images</label>
              <input type="file" id="images" name="images" multiple onChange={handleImageChange} className="input px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-medium">Specifications</label>
            <div className="flex flex-col gap-2 w-full">
              {form.specifications.map((spec, idx) => (
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
              <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleChange} /> Featured
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="isNewArrival" checked={form.isNewArrival} onChange={handleChange} /> New Arrival
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="isBestSeller" checked={form.isBestSeller} onChange={handleChange} /> Best Seller
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="isOnSale" checked={form.isOnSale} onChange={handleChange} /> On Sale
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="default" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
} 