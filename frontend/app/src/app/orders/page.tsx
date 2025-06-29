'use client'

import { useState, useEffect, useRef } from 'react'
import api from '@/lib/api'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogClose,
} from '@/components/ui/dialog'
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Check, Download, Printer, ChevronDown } from 'lucide-react'
import { subDays, startOfDay, endOfDay } from 'date-fns'
import { useSearchParams } from 'next/navigation'

const statusOptions = [
	'ALL',
	'PENDING',
	'PROCESSING',
	'SHIPPED',
	'DELIVERED',
	'CANCELLED',
	'REFUNDED',
]

const formatCurrency = (amount: number) =>
	new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
	}).format(amount)

const formatDate = (dateString: string) =>
	new Date(dateString).toLocaleDateString('en-US', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	})

const getStatusVariant = (
	status: string
): 'default' | 'secondary' | 'destructive' | 'outline' => {
	switch (status.toUpperCase()) {
		case 'DELIVERED':
			return 'default'
		case 'PENDING':
			return 'secondary'
		case 'SHIPPED':
			return 'default'
		case 'CANCELLED':
			return 'destructive'
		default:
			return 'outline'
	}
}

type OrderItem = {
	product: {
		name: string
	}
}

type User = {
	id: string
	email: string
}

type Order = {
	id: string
	items: OrderItem[]
	totalAmount: number
	createdAt: string
	status: string
	user: User
}

type Meta = {
	total: number
	page: number
	limit: number
	totalPages: number
}

const orderStatusOptions = [
	'PENDING',
	'PROCESSING',
	'SHIPPED',
	'DELIVERED',
	'CANCELLED',
	'REFUNDED',
]

const sortByOptions = [
	{ value: 'createdAt', label: 'Date' },
	{ value: 'totalAmount', label: 'Amount' },
	{ value: 'status', label: 'Status' },
]
const sortOrderOptions = [
	{ value: 'DESC', label: 'Desc' },
	{ value: 'ASC', label: 'Asc' },
]

export default function OrdersPage() {
	const [orders, setOrders] = useState<Order[]>([])
	const [meta, setMeta] = useState<Meta | null>(null)
	const [loading, setLoading] = useState(true)
	const [page, setPage] = useState(1)
	const [limit] = useState(10)
	const [status, setStatus] = useState('ALL')
	const [sortBy, setSortBy] = useState('createdAt')
	const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
	const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
	const [detailsOpen, setDetailsOpen] = useState(false)
	const [updating, setUpdating] = useState(false)
	const [newStatus, setNewStatus] = useState<string>('')
	const [adminNotes, setAdminNotes] = useState('')
	const initialStatusRef = useRef<string>('')
	const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
	const [bulkStatus, setBulkStatus] = useState<string>('')
	const [bulkNotes, setBulkNotes] = useState('')
	const [bulkUpdating, setBulkUpdating] = useState(false)
	const [showBulkConfirm, setShowBulkConfirm] = useState(false)
	const [orderStats, setOrderStats] = useState<any>(null)
	const [statsLoading, setStatsLoading] = useState(true)
	const [statsDays, setStatsDays] = useState<'7' | '30' | 'all'>('7')
	const searchParams = useSearchParams()

	// Handle URL parameters for order details/update
	useEffect(() => {
		const orderId = searchParams.get('orderId')
		const action = searchParams.get('action')
		
		if (orderId && orders.length > 0) {
			const order = orders.find(o => o.id === orderId)
			if (order) {
				setSelectedOrder(order)
				setNewStatus(order.status)
				setAdminNotes('')
				setDetailsOpen(true)
				initialStatusRef.current = order.status
				
				// If action is update, focus on status update
				if (action === 'update') {
					// The modal will open and user can update status
				}
			}
		}
	}, [searchParams, orders])

	useEffect(() => {
		const fetchOrders = async () => {
			try {
				setLoading(true)
				let url = `/admin/orders?page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`
				if (status !== 'ALL') url += `&status=${status}`
				const response = await api.get(url)
				setOrders(response.data.data)
				setMeta(response.data.meta)
			} catch (error) {
				toast.error('Failed to fetch orders.')
				setOrders([])
				setMeta(null)
			} finally {
				setLoading(false)
			}
		}
		fetchOrders()
	}, [page, limit, status, sortBy, sortOrder])

	useEffect(() => {
		// Fetch order statistics for selected period
		const fetchStats = async () => {
			setStatsLoading(true)
			try {
				let url = '/admin/orders/analytics/summary'
				if (statsDays !== 'all') {
					const now = new Date()
					const endDate = endOfDay(now).toISOString()
					const startDate = startOfDay(subDays(now, parseInt(statsDays, 10) - 1)).toISOString()
					url += `?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
				}
				const res = await api.get(url)
				setOrderStats(res.data)
			} catch (e) {
				setOrderStats(null)
			} finally {
				setStatsLoading(false)
			}
		}
		fetchStats()
	}, [statsDays])

	const renderSkeleton = () => (
		<div className='space-y-2'>
			{Array.from({ length: 10 }).map((_, i) => (
				<div
					key={i}
					className='grid grid-cols-6 gap-4 items-center p-2'
				>
					<Skeleton className='h-4 w-20' />
					<Skeleton className='h-4 w-40' />
					<Skeleton className='h-4 w-24' />
					<Skeleton className='h-4 w-24' />
					<Skeleton className='h-4 w-24' />
					<Skeleton className='h-4 w-24' />
				</div>
			))}
		</div>
	)

	const openDetails = (order: Order) => {
		setSelectedOrder(order)
		setNewStatus(order.status)
		setAdminNotes('')
		setDetailsOpen(true)
		initialStatusRef.current = order.status
	}

	const closeDetails = () => {
		setDetailsOpen(false)
		setSelectedOrder(null)
		setAdminNotes('')
	}

	const handleUpdateStatus = async () => {
		if (!selectedOrder) return
		setUpdating(true)
		try {
			await api.patch(`/admin/orders/${selectedOrder.id}/status`, {
				status: newStatus,
				adminNotes: adminNotes || undefined,
			})
			toast.success('Order status updated.')
			closeDetails()
			// Refresh orders
			let url = `/admin/orders?page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`
			if (status !== 'ALL') url += `&status=${status}`
			const response = await api.get(url)
			setOrders(response.data.data)
			setMeta(response.data.meta)
		} catch (error) {
			toast.error('Failed to update order status.')
		} finally {
			setUpdating(false)
		}
	}

	// Helper for windowed pagination
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

	// Checkbox logic
	const allSelected =
		orders.length > 0 && orders.every((o) => selectedOrderIds.includes(o.id))
	const toggleSelectAll = () => {
		if (allSelected) {
			// Deselect all orders on the current page
			setSelectedOrderIds((ids) =>
				ids.filter((id) => !orders.some((o) => o.id === id))
			)
		} else {
			// Select all orders on the current page (add to selectedOrderIds, avoid duplicates)
			setSelectedOrderIds((ids) =>
				Array.from(new Set([...ids, ...orders.map((o) => o.id)]))
			)
		}
	}
	const toggleSelectOrder = (id: string) => {
		setSelectedOrderIds((ids) =>
			ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]
		)
	}

	// Bulk status update
	const handleBulkStatusUpdate = async () => {
		if (!bulkStatus || selectedOrderIds.length === 0) return
		setShowBulkConfirm(false)
		setBulkUpdating(true)
		try {
			await api.patch('/admin/orders/bulk-status', {
				orderIds: selectedOrderIds,
				status: bulkStatus,
				adminNotes: bulkNotes || undefined,
			})
			toast.success('Order statuses updated.')
			setSelectedOrderIds([])
			setBulkStatus('')
			setBulkNotes('')
			// Refresh orders
			let url = `/admin/orders?page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`
			if (status !== 'ALL') url += `&status=${status}`
			const response = await api.get(url)
			setOrders(response.data.data)
			setMeta(response.data.meta)
		} catch (error) {
			toast.error('Failed to update order statuses.')
		} finally {
			setBulkUpdating(false)
		}
	}

	// CSV export
	const handleExportSelected = () => {
		if (selectedOrderIds.length === 0) {
			toast.info('Select orders to export.')
			return
		}
		const selectedOrders = orders.filter((o) => selectedOrderIds.includes(o.id))
		if (selectedOrders.length === 0) return
		// Prepare CSV
		const headers = [
			'Order ID',
			'User Email',
			'Status',
			'Amount',
			'Created At',
			'Products',
		]
		const rows = selectedOrders.map((order) => [
			order.id,
			order.user?.email || '',
			order.status,
			order.totalAmount,
			order.createdAt,
			order.items.map((i) => i.product.name).join('; '),
		])
		const csv = [headers, ...rows]
			.map((r) =>
				r
					.map(String)
					.map((s) => '"' + s.replace(/"/g, '""') + '"')
					.join(',')
			)
			.join('\n')
		const blob = new Blob([csv], { type: 'text/csv' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `orders-export-${new Date().toISOString()}.csv`
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)
	}

	const handlePrintInvoice = () => {
		if (!selectedOrder) return
		// Create a printable invoice window
		const invoiceWindow = window.open('', '_blank', 'width=800,height=600')
		if (!invoiceWindow) return
		const productsList = selectedOrder.items.map(
			(item) => `<li>${item.product.name}</li>`
		).join('')
		invoiceWindow.document.write(`
			<html>
				<head>
					<title>Invoice - ${selectedOrder.id}</title>
					<style>
						body { font-family: Arial, sans-serif; padding: 40px; }
						h2 { color: #333; }
						.section { margin-bottom: 20px; }
						.label { color: #888; font-size: 13px; }
						.value { font-size: 16px; margin-bottom: 8px; }
						ul { margin: 0; padding-left: 20px; }
					</style>
				</head>
				<body>
					<h2>Order Invoice</h2>
					<div class='section'><span class='label'>Order ID:</span> <span class='value'>${selectedOrder.id}</span></div>
					<div class='section'><span class='label'>User:</span> <span class='value'>${selectedOrder.user?.email || 'N/A'}</span></div>
					<div class='section'><span class='label'>Products:</span><ul>${productsList}</ul></div>
					<div class='section'><span class='label'>Amount:</span> <span class='value'>${formatCurrency(selectedOrder.totalAmount)}</span></div>
					<div class='section'><span class='label'>Created At:</span> <span class='value'>${formatDate(selectedOrder.createdAt)}</span></div>
					<div class='section'><span class='label'>Status:</span> <span class='value'>${selectedOrder.status}</span></div>
				</body>
			</html>
		`)
		invoiceWindow.document.close()
		invoiceWindow.print()
	}

	return (
		<div className='p-6 bg-background h-auto'>
			{/* Order Statistics Filter */}
			<div className='flex gap-2 mb-2'>
				<Button
					variant={statsDays === '7' ? 'default' : 'outline'}
					size='sm'
					className='cursor-pointer'
					onClick={() => setStatsDays('7')}
				>
					Last 7 Days
				</Button>
				<Button
					variant={statsDays === '30' ? 'default' : 'outline'}
					size='sm'
					className='cursor-pointer'
					onClick={() => setStatsDays('30')}
				>
					Last 30 Days
				</Button>
				<Button
					variant={statsDays === 'all' ? 'default' : 'outline'}
					size='sm'
					className='cursor-pointer'
					onClick={() => setStatsDays('all')}
				>
					All Time
				</Button>
			</div>
			{/* Order Statistics Summary */}
			<div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
				<div className='bg-primary rounded-lg p-4 flex flex-col items-center'>
					<div className='text-lg font-semibold text-primary-foreground'>Total Orders</div>
					<div className='text-2xl font-bold text-accent mt-2'>
						{statsLoading ? <Skeleton className='h-8 w-20' /> : orderStats?.totalOrders ?? '-'}
					</div>
				</div>
				<div className='bg-primary rounded-lg p-4 flex flex-col items-center'>
					<div className='text-lg font-semibold text-primary-foreground'>Total Revenue</div>
					<div className='text-2xl font-bold text-accent mt-2'>
						{statsLoading ? <Skeleton className='h-8 w-32' /> : formatCurrency(orderStats?.totalRevenue ?? 0)}
					</div>
				</div>
				<div className='bg-primary rounded-lg p-4 flex flex-col items-center'>
					<div className='text-lg font-semibold text-primary-foreground'>Avg. Order Value</div>
					<div className='text-2xl font-bold text-accent mt-2'>
						{statsLoading ? <Skeleton className='h-8 w-24' /> : formatCurrency(orderStats?.avgOrderValue ?? 0)}
					</div>
				</div>
			</div>
			<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2'>
				<h2 className='text-2xl font-bold text-primary-foreground'>
					All Orders
				</h2>
				<div className='flex gap-2 items-center'>
					{/* Status Filter Dropdown */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant='outline'
								className='cursor-pointer'
							>
								{statusOptions.find((opt) => opt === status) || 'ALL'}
								<ChevronDown className="h-4 w-4 ml-2 opacity-50" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							{statusOptions.map((opt) => (
								<DropdownMenuItem
									className={`cursor-pointer ${status === opt ? 'bg-accent text-accent-foreground' : ''}`}
									key={opt}
									onClick={() => {
										setStatus(opt)
										setPage(1)
									}}
								>
									{opt}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
					{/* Sort By Dropdown */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant='outline'
								className='cursor-pointer'
							>
								{sortByOptions.find((opt) => opt.value === sortBy)?.label ||
									'Date'}
								<ChevronDown className="h-4 w-4 ml-2 opacity-50" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							{sortByOptions.map((opt) => (
								<DropdownMenuItem
									className={`cursor-pointer ${sortBy === opt.value ? 'bg-accent text-accent-foreground' : ''}`}
									key={opt.value}
									onClick={() => setSortBy(opt.value)}
								>
									{opt.label}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
					{/* Sort Order Dropdown */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant='outline'
								className='cursor-pointer'
							>
								{sortOrderOptions.find((opt) => opt.value === sortOrder)
									?.label || 'Desc'}
								<ChevronDown className="h-4 w-4 ml-2 opacity-50" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							{sortOrderOptions.map((opt) => (
								<DropdownMenuItem
									className={`cursor-pointer ${sortOrder === opt.value ? 'bg-accent text-accent-foreground' : ''}`}
									key={opt.value}
									onClick={() => setSortOrder(opt.value as 'ASC' | 'DESC')}
								>
									{opt.label}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
			{/* Bulk Action Bar */}
			<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2 border-b border-border pb-4'>
				<div className='flex gap-2 items-center'>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant='outline'
								className='cursor-pointer'
							>
								Bulk Status: {bulkStatus || 'Select Status'}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							{orderStatusOptions.map((opt) => (
								<DropdownMenuItem
									className='cursor-pointer'
									key={opt}
									onClick={() => setBulkStatus(opt)}
								>
									{bulkStatus === opt && (
										<Check className='w-4 h-4 mr-2 text-primary' />
									)}
									{opt}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
					<input
						type='text'
						className='bg-background border border-border rounded px-2 py-1 text-sm w-48'
						placeholder='Admin Notes (optional)'
						value={bulkNotes}
						onChange={(e) => setBulkNotes(e.target.value)}
						disabled={bulkUpdating}
					/>
					<Button
						variant='default'
						size='sm'
						className='cursor-pointer'
						onClick={() => setShowBulkConfirm(true)}
						disabled={
							bulkUpdating || !bulkStatus || selectedOrderIds.length === 0
						}
					>
						{bulkUpdating ? 'Updating...' : 'Update Status'}
					</Button>
				</div>
				<Button
					variant='outline'
					size='sm'
					onClick={handleExportSelected}
					className='flex gap-2 items-center cursor-pointer'
				>
					<Download className='w-4 h-4' /> Export Selected
				</Button>
			</div>
			{/* Add these buttons above the table, e.g. after the bulk action bar */}
			<div className='flex gap-2 mb-2'>
				<Button
					variant='outline'
					size='sm'
					className='cursor-pointer'
					onClick={() =>
						setSelectedOrderIds((ids) =>
							Array.from(new Set([...ids, ...orders.map((o) => o.id)]))
						)
					}
					disabled={orders.length === 0}
				>
					Select All (Page)
				</Button>
				<Button
					variant='outline'
					size='sm'
					className='cursor-pointer'
					onClick={() =>
						setSelectedOrderIds((ids) =>
							ids.filter((id) => !orders.some((o) => o.id === id))
						)
					}
					disabled={orders.length === 0}
				>
					Select None (Page)
				</Button>
			</div>
			{loading ? (
				renderSkeleton()
			) : (
				<div className='bg-primary rounded-lg p-4'>
					<Table className='text-primary-foreground'>
						<TableHeader>
							<TableRow>
								<TableHead />
								<TableHead className='font-semibold capitalize'>ID</TableHead>
								<TableHead className='font-semibold capitalize'>User</TableHead>
								<TableHead className='font-semibold capitalize'>
									Product(s)
								</TableHead>
								<TableHead className='font-semibold'>Amount</TableHead>
								<TableHead className='font-semibold'>Date</TableHead>
								<TableHead className='font-semibold'>Status</TableHead>
								<TableHead className='font-semibold'>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{orders.map((order) => (
								<TableRow key={order.id}>
									<TableCell>
										<input
											type='checkbox'
											checked={selectedOrderIds.includes(order.id)}
											onChange={() => toggleSelectOrder(order.id)}
											aria-label={`Select order ${order.id}`}
											className='cursor-pointer'
										/>
									</TableCell>
									<TableCell className='font-medium'>
										<Link
											href={`/orders/${order.id}`}
											className='hover:underline'
										>
											{order.id.substring(0, 8)}...
										</Link>
									</TableCell>
									<TableCell>{order.user?.email || 'N/A'}</TableCell>
									<TableCell>
										{order.items.length > 1
											? `${order.items[0].product.name} + ${
													order.items.length - 1
											  } more`
											: order.items.length > 0
											? order.items[0].product.name
											: 'N/A'}
									</TableCell>
									<TableCell>{formatCurrency(order.totalAmount)}</TableCell>
									<TableCell>{formatDate(order.createdAt)}</TableCell>
									<TableCell>
										<Badge variant={getStatusVariant(order.status)}>
											{order.status}
										</Badge>
									</TableCell>
									<TableCell>
										<Button
											variant='outline'
											size='sm'
											className='cursor-pointer'
											onClick={() => openDetails(order)}
										>
											Details / Update
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
			{/* Pagination Controls */}
			{meta && meta.totalPages > 1 && (
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
					{getPageNumbers(page, meta.totalPages).map((p, idx) =>
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
						disabled={page === meta.totalPages}
						onClick={() => setPage(page + 1)}
						className='cursor-pointer bg-[var(--accent)] hover:opacity-80'
						style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
					>
						Next
					</Button>
				</div>
			)}
			{/* Order Details Dialog */}
			<Dialog
				open={detailsOpen}
				onOpenChange={setDetailsOpen}
			>
				<DialogContent showCloseButton>
					<DialogHeader>
						<DialogTitle>Order Details</DialogTitle>
					</DialogHeader>
					{selectedOrder && (
						<div className='space-y-4'>
							<div>
								<div className='text-sm text-muted-foreground'>Order ID</div>
								<div className='font-mono text-primary-foreground'>
									{selectedOrder.id}
								</div>
							</div>
							<div>
								<div className='text-sm text-muted-foreground'>User</div>
								<div>{selectedOrder.user?.email || 'N/A'}</div>
							</div>
							<div>
								<div className='text-sm text-muted-foreground'>Products</div>
								<ul className='list-disc ml-5'>
									{selectedOrder.items.map((item, idx) => (
										<li key={idx}>{item.product.name}</li>
									))}
								</ul>
							</div>
							<div>
								<div className='text-sm text-muted-foreground'>Amount</div>
								<div>{formatCurrency(selectedOrder.totalAmount)}</div>
							</div>
							<div>
								<div className='text-sm text-muted-foreground'>Created At</div>
								<div>{formatDate(selectedOrder.createdAt)}</div>
							</div>
							<div>
								<div className='text-sm text-muted-foreground'>Status</div>
								<select
									className='bg-background border border-border rounded px-2 py-1 text-sm w-full'
									value={newStatus}
									onChange={(e) => setNewStatus(e.target.value)}
									disabled={updating}
								>
									{orderStatusOptions.map((opt) => (
										<option
											key={opt}
											value={opt}
										>
											{opt}
										</option>
									))}
								</select>
							</div>
							<div>
								<div className='text-sm text-muted-foreground'>
									Admin Notes (optional)
								</div>
								<textarea
									className='bg-background border border-border rounded px-2 py-1 text-sm w-full'
									value={adminNotes}
									onChange={(e) => setAdminNotes(e.target.value)}
									rows={2}
									disabled={updating}
								/>
							</div>
							<div className='flex gap-2 mt-4'>
								<Button
									variant='outline'
									size='sm'
									className='cursor-pointer flex gap-2 items-center'
									onClick={handlePrintInvoice}
								>
									<Printer className='w-4 h-4' /> Print Invoice
								</Button>
							</div>
						</div>
					)}
					<DialogFooter>
						<Button
							onClick={handleUpdateStatus}
							disabled={
								updating ||
								!selectedOrder ||
								newStatus === initialStatusRef.current
							}
							variant='default'
						>
							{updating ? 'Updating...' : 'Update Status'}
						</Button>
						<DialogClose asChild>
							<Button variant='outline'>Close</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			{/* Bulk Status Update Confirmation Dialog */}
			<Dialog
				open={showBulkConfirm}
				onOpenChange={setShowBulkConfirm}
			>
				<DialogContent showCloseButton>
					<DialogHeader>
						<DialogTitle>Confirm Bulk Status Update</DialogTitle>
					</DialogHeader>
					<div className='space-y-4'>
						<div>
							You are about to update the status of{' '}
							<b>{selectedOrderIds.length}</b> orders to <b>{bulkStatus}</b>.
						</div>
						{bulkNotes && (
							<div>
								<span className='text-sm text-muted-foreground'>
									Admin Notes:
								</span>
								<div className='bg-muted p-2 rounded text-sm'>{bulkNotes}</div>
							</div>
						)}
						<div className='text-destructive'>
							This action cannot be undone.
						</div>
					</div>
					<DialogFooter>
						<Button
							variant='destructive'
							onClick={async () => {
								setShowBulkConfirm(false)
								await handleBulkStatusUpdate()
							}}
							disabled={bulkUpdating}
						>
							{bulkUpdating ? 'Updating...' : 'Confirm Update'}
						</Button>
						<DialogClose asChild>
							<Button variant='outline'>Cancel</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
