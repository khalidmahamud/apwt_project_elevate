'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Star, MoreHorizontal, ListFilter } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from './ui/button'

// Define the type for a single product
type ProductAnalytics = {
	productId: string;
	product_name: string;
	product_images: string[];
	totalQuantity: number;
	totalRevenue: number;
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
				const response = await api.get(`/admin/products/analytics?days=${days}`);
				setProducts(response.data.bestSellers);
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
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm" className="ml-auto gap-1">
							<ListFilter className="h-3.5 w-3.5" />
							<span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
								{days === '7' && 'Last 7 Days'}
								{days === '30' && 'Last 30 Days'}
								{days === '90' && 'Last 90 Days'}
							</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => setDays('7')}>Last 7 Days</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setDays('30')}>Last 30 Days</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setDays('90')}>Last 90 Days</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
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
					<Table className="w-full text-left text-sm text-primary-foreground">
						<TableHeader>
							<TableRow>
								<TableHead className="py-3 px-2">Product Name</TableHead>
								<TableHead className="py-3 px-2 text-right">Units Sold</TableHead>
								<TableHead className="py-3 px-2 text-right">Total Revenue</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{products.map((product) => (
								<TableRow key={product.productId} className="border-b border-gray-800 hover:bg-primary-foreground/5">
									<TableCell className="py-3 px-2 text-primary-foreground font-medium flex items-center gap-3">
										<Link href={`/products/${product.productId}`}>
											<Image
												src={product.product_images?.[0] || '/placeholder-shoe.png'}
												alt={product.product_name}
												width={40}
												height={40}
												className="bg-white/10 rounded-md"
											/>
										</Link>
										<Link href={`/products/${product.productId}`} className="hover:underline">
											{product.product_name}
										</Link>
									</TableCell>
									<TableCell className="py-3 px-2 text-right">{product.totalQuantity}</TableCell>
									<TableCell className="py-3 px-2 text-right font-bold text-primary-foreground">{formatCurrency(product.totalRevenue)}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</div>
		</div>
	);
};

export default TopProductsTable; 