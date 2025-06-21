'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

// Define the type for a single product
type ProductAnalytics = {
	id: string;
	name: string;
	price: number;
	currentStock: number;
	totalQuantitySold: number;
	totalRevenue: number;
	orderCount: number;
	image?: string;
	rating?: number;
};

// Helper function to format currency
const formatCurrency = (amount: number) => {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount);
};

// TopProductsTable Component
const TopProductsTable = () => {
	const [days, setDays] = useState('7');
	const [products, setProducts] = useState<ProductAnalytics[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchProductAnalytics = async () => {
			setLoading(true);
			setError(null);
			try {
				const response = await api.get(`/admin/orders/analytics/product?days=${days}`);
				setProducts(response.data);
			} catch (err) {
				setError('Failed to fetch product analytics.');
				toast.error('Failed to fetch product analytics.');
				console.error(err);
			} finally {
				setLoading(false);
			}
		};

		fetchProductAnalytics();
	}, [days]);

	return (
		<div className="bg-primary p-4 rounded-lg h-full flex flex-col">
			{/* Header */}
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-xl font-bold text-primary-foreground">Top Selling Products</h2>
				<select
					value={days}
					onChange={(e) => setDays(e.target.value)}
					className="bg-primary-foreground/10 text-primary-foreground rounded p-1"
				>
					<option value="7">Last 7 Days</option>
					<option value="30">Last 30 Days</option>
					<option value="90">Last 90 Days</option>
				</select>
			</div>

			{/* Content */}
			<div className="flex-grow overflow-auto">
				{loading ? (
					<div className="space-y-2">
						{Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className="grid grid-cols-5 gap-4 items-center p-2">
								<div className="col-span-2 flex items-center gap-3">
									<Skeleton className="h-10 w-10 rounded-md" />
									<Skeleton className="h-4 w-full" />
								</div>
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-full" />
							</div>
						))}
					</div>
				) : error ? (
					<div className="flex justify-center items-center h-full">
						<p className="text-red-500">{error}</p>
					</div>
				) : (
					<table className="w-full text-left text-sm text-primary-foreground">
						<thead className="text-xs text-primary-foreground uppercase border-b border-gray-700">
							<tr>
								<th scope="col" className="py-3 px-2">Product Name</th>
								<th scope="col" className="py-3 px-2 text-right">Price</th>
								<th scope="col" className="py-3 px-2 text-right">Units Sold</th>
								<th scope="col" className="py-3 px-2 text-right">Current Stock</th>
								<th scope="col" className="py-3 px-2 text-right">Rating</th>
								<th scope="col" className="py-3 px-2 text-right">Total Revenue</th>
							</tr>
						</thead>
						<tbody>
							{products.map((product) => (
								<tr key={product.id} className="border-b border-gray-800 hover:bg-primary-foreground/5">
									<td className="py-3 px-2 text-primary-foreground font-medium flex items-center gap-3">
										<Image
											src={product.image || '/placeholder-shoe.png'}
											alt={product.name}
											width={40}
											height={40}
											className="bg-white/10 rounded-md"
										/>
										{product.name}
									</td>
									<td className="py-3 px-2 text-right">{formatCurrency(product.price)}</td>
									<td className="py-3 px-2 text-right">{product.totalQuantitySold}</td>
									<td className="py-3 px-2 text-right">{product.currentStock}</td>
									<td className="py-3 px-2">
										<div className="flex items-center justify-end">
											<span>{product.rating ? product.rating.toFixed(1) : '-'}</span>
											<Star className="w-4 h-4 text-yellow-400 ml-1" fill="currentColor" />
										</div>
									</td>
									<td className="py-3 px-2 text-right font-bold text-primary-foreground">{formatCurrency(product.totalRevenue)}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
};

export default TopProductsTable; 