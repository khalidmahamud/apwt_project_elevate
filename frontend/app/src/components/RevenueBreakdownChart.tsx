'use client'

import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from 'recharts'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ListFilter } from 'lucide-react'

type RevenueBreakdownData = {
	categories: string[]
	data: {
		date: string
		[key: string]: string | number
	}[]
}

const RevenueBreakdownChart = () => {
	const [data, setData] = useState<RevenueBreakdownData | null>(null)
	const [days, setDays] = useState(7)
	const [loading, setLoading] = useState(true)
	const { user: authUser, loading: authLoading } = useAuth()

	useEffect(() => {
		if (authLoading) return
		if (!authUser) {
			setLoading(false)
			return
		}

		setLoading(true)
		api
			.get(`/admin/orders/analytics/revenue-breakdown?days=${days}`)
			.then((res) => {
				setData(res.data)
			})
			.finally(() => setLoading(false))
	}, [days, authUser, authLoading])

	const barColors = [
		'#7dd3fc',
		'#fca5a5',
		'#fdba74',
		'#d8b4fe',
		'#6ee7b7',
		'#a78bfa',
		'#f472b6',
		'#facc15',
	]

	const getDaysLabel = (days: number) => {
		switch (days) {
			case 7: return 'Last 7 days';
			case 30: return 'Last 30 days';
			case 90: return 'Last 90 days';
			default: return 'Last 7 days';
		}
	};

	if (loading)
		return (
			<div className='bg-primary p-4 rounded-lg h-full flex flex-col'>
				<div className='flex justify-between items-center mb-4'>
					<Skeleton className='h-8 w-1/3' />
					<Skeleton className='h-8 w-1/4' />
				</div>
				<div className='flex-grow'>
					<Skeleton className='h-full w-full' />
				</div>
			</div>
		)
	if (!data) return <div>No data available</div>

	return (
		<div className='bg-primary p-4 rounded-lg flex flex-col min-h-[750px]'>
			<div className='flex justify-between items-center mb-4'>
				<h2 className='text-xl font-bold text-primary-foreground'>
					Revenue Breakdown
				</h2>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm" className="ml-auto gap-1">
							<ListFilter className="h-3.5 w-3.5" />
							<span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
								{getDaysLabel(days)}
							</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => setDays(7)}>Last 7 days</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setDays(30)}>Last 30 days</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setDays(90)}>Last 90 days</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<ResponsiveContainer
				width='100%'
				height='100%'
			>
				<BarChart data={data.data}>
					<XAxis
						dataKey='date'
						stroke='#888888'
						fontSize={12}
						tickLine={false}
						axisLine={false}
					/>
					<YAxis
						stroke='#888888'
						fontSize={12}
						tickLine={false}
						axisLine={false}
						tickFormatter={(value) => `$${value}`}
					/>
					<Tooltip
						contentStyle={{
							backgroundColor: '#111827',
							border: 'none',
							borderRadius: '8px',
						}}
					/>
					<Legend
						formatter={(value) => (
							<span className='text-primary-foreground'>{value}</span>
						)}
					/>
					{data.categories.map((cat, index) => (
						<Bar
							key={cat}
							dataKey={cat}
							fill={barColors[index % barColors.length]}
						/>
					))}
				</BarChart>
			</ResponsiveContainer>
		</div>
	)
}

export default RevenueBreakdownChart 