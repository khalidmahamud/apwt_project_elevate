'use client'

import { Button } from '@/components/ui/button'
import {
	CirclePlus,
	Download,
	ShoppingBag,
	TrendingDown,
	TrendingUp,
	DollarSign,
	Clock,
	Truck,
	Users,
	RefreshCw,
	LucideProps,
	Tag,
	ShoppingCart,
} from 'lucide-react'
import {
	AreaChart,
	Area,
	Tooltip,
	ResponsiveContainer,
	BarChart,
	XAxis,
	YAxis,
	Legend,
	Bar,
} from 'recharts'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import TopCustomersChart from '@/components/TopCustomersChart'
import TopProductsTable from '@/components/TopProductsTable'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import RecentOrdersTable from '@/components/RecentOrdersTable'
import { useAuth } from '@/context/AuthContext'
import RevenueBreakdownChart from '@/components/RevenueBreakdownChart'

type AnalyticsCardProps = {
	title: string
	value: string | number
	changePercent?: number | null
	trendData?: number[]
	icon: React.ElementType<LucideProps>
	chartColor?: string
	formatAsCurrency?: boolean
	formatAsPercent?: boolean
}

type TodaySummaryCardProps = {
	title: string
	value: number | string
	icon: React.ElementType<LucideProps>
	color: string
	formatAsCurrency?: boolean
}

type RevenueBreakdownData = {
	categories: string[]
	data: {
		date: string
		[key: string]: string | number
	}[]
}

// Reusable Analytics Mini Chart Component
const AnalyticsMiniChart = ({
	data,
	chartColor,
}: {
	data: number[]
	chartColor: string
}) => {
	const chartData = data.map((value, index) => ({
		name: `Day ${index + 1}`,
		value: value,
	}))

	const gradientId = `color_${chartColor.replace(/[^a-zA-Z0-9]/g, '')}`

	return (
		<div className='w-full h-[100px]'>
			<ResponsiveContainer
				width='100%'
				height='100%'
			>
				<AreaChart data={chartData}>
					<defs>
						<linearGradient
							id={gradientId}
							x1='0'
							y1='0'
							x2='0'
							y2='1'
						>
							<stop
								offset='5%'
								stopColor={chartColor}
								stopOpacity={0.4}
							/>
							<stop
								offset='95%'
								stopColor={chartColor}
								stopOpacity={0}
							/>
						</linearGradient>
					</defs>
					<Tooltip
						contentStyle={{
							backgroundColor: '#111827',
							border: 'none',
							borderRadius: '8px',
							color: '#fff',
						}}
						labelStyle={{ display: 'none' }}
						formatter={(value: any) => [`${value}`, '']}
					/>
					<Area
						type='monotone'
						dataKey='value'
						stroke={chartColor}
						strokeWidth={2}
						fillOpacity={1}
						fill={`url(#${gradientId})`}
						dot={false}
					/>
				</AreaChart>
			</ResponsiveContainer>
		</div>
	)
}

// Reusable Analytics Card Component
const AnalyticsCard = ({
	title,
	value,
	changePercent,
	trendData,
	icon: Icon,
	chartColor,
	formatAsCurrency = false,
	formatAsPercent = false,
}: AnalyticsCardProps) => {
	let formattedValue: string
	if (formatAsCurrency) {
		formattedValue = new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(Number(value) || 0)
	} else if (formatAsPercent) {
		formattedValue = `${(Number(value) || 0).toFixed(2)}%`
	} else {
		formattedValue = (Number(value) || 0).toLocaleString()
	}

	return (
		<div className='bg-primary p-4 rounded-lg flex flex-col justify-between h-[200px]'>
			<div className='flex justify-between items-start'>
				<div className='flex items-center gap-4'>
					<div
						className='flex items-center justify-center h-10 w-10 rounded-full'
						style={{ backgroundColor: `${chartColor}33` }}
					>
						<Icon
							className='h-5 w-5'
							style={{ color: chartColor }}
						/>
					</div>
					<div>
						<p className='text-sm text-primary-foreground/50'>{title}</p>
						<p className='text-2xl font-bold text-primary-foreground'>
							{formattedValue}
						</p>
					</div>
				</div>

				{changePercent != null && (
					<div>
						<p className='text-sm text-primary-foreground/50 text-right'>
							Last 7 days
						</p>
						<div
							className={`flex items-center justify-end gap-1 font-semibold text-sm`}
						>
							{changePercent >= 0 ? (
								<TrendingUp className='h-4 w-4 text-green-500' />
							) : (
								<TrendingDown className='h-4 w-4 text-red-500' />
							)}
							<span className='text-primary-foreground font-semibold'>
								{changePercent.toFixed(1)}%
							</span>
						</div>
					</div>
				)}
			</div>
			{trendData && chartColor && (
				<AnalyticsMiniChart
					data={trendData}
					chartColor={chartColor}
				/>
			)}
		</div>
	)
}

// New Today's Summary Card Component
const TodaySummaryCard = ({
	title,
	value,
	icon: Icon,
	color,
	formatAsCurrency = false,
}: TodaySummaryCardProps) => {
	const formattedValue = formatAsCurrency
		? new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: 'USD',
		  }).format(Number(value) || 0)
		: (Number(value) || 0).toLocaleString()

	return (
		<div
			className='p-4 rounded-lg relative overflow-hidden'
			style={{
				background: `linear-gradient(135deg, ${color} 0%, #1E293B 100%)`,
			}}
		>
			<Icon className='absolute -right-4 -bottom-4 h-24 w-24 text-primary-foreground/20' />
			<p className='text-foreground/80'>{title}</p>
			<p className='text-3xl font-bold text-foreground mt-2'>
				{formattedValue}
			</p>
		</div>
	)
}

function HomePage() {
	const { user, loading: authLoading } = useAuth()
	const [orderSummary, setOrderSummary] = useState<any>(null)
	const [userAnalytics, setUserAnalytics] = useState<any>(null)
	const [todaysSummary, setTodaysSummary] = useState<any>(null)
	const [dashboardLoading, setDashboardLoading] = useState(true)
	const [isDownloading, setIsDownloading] = useState(false)

	useEffect(() => {
		if (authLoading) return // Wait for the auth context to load
		if (!user) {
			// If auth is loaded and there's no user, stop loading dashboard
			setDashboardLoading(false)
			return
		}

		const fetchDashboardData = async () => {
			setDashboardLoading(true)
			try {
				const summaryRes = await api.get('/admin/orders/analytics/summary');
				setOrderSummary(summaryRes.data);

				// Derive Today's Summary from the main summary
				const todayIndex = summaryRes.data.ordersTrend.length - 1;
				if (todayIndex >= 0) {
					setTodaysSummary({
						totalOrders: summaryRes.data.ordersTrend[todayIndex],
						totalRevenue: summaryRes.data.revenueTrend[todayIndex],
					});
				}
			} catch (error) {
				console.error('Failed to fetch dashboard data', error)
				toast.error('Failed to load dashboard data.')
			} finally {
				setDashboardLoading(false)
			}
		}
		fetchDashboardData()
	}, [user, authLoading])

	const handleDownloadReport = async () => {
		setIsDownloading(true)
		toast.info('Generating your report, please wait...')
		try {
			const response = await api.get('/admin/orders/report/download', {
				responseType: 'blob',
			})
			const blob = new Blob([response.data], {
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			})
			const url = window.URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.style.display = 'none'
			a.href = url
			a.download = `master-report-${
				new Date().toISOString().split('T')[0]
			}.xlsx`
			document.body.appendChild(a)
			a.click()
			window.URL.revokeObjectURL(url)
			a.remove()
			toast.success('Report downloaded successfully!')
		} catch (error) {
			console.error('Failed to download report', error)
			toast.error('Failed to download report.')
		} finally {
			setIsDownloading(false)
		}
	}

	if (authLoading || dashboardLoading) {
		return (
			<div className='p-4 grid grid-cols-1 lg:grid-cols-4 gap-4'>
				<div className='col-span-1 lg:col-span-4 flex justify-between'>
					<div>
						<p className='text-primary-foreground opacity-40 text-4xl font-medium'>
							Loading...
						</p>
					</div>
				</div>
				<div className='col-span-1 lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
					<Skeleton className='h-[200px] w-full rounded-lg' />
					<Skeleton className='h-[200px] w-full rounded-lg' />
					<Skeleton className='h-[200px] w-full rounded-lg' />
					<Skeleton className='h-[200px] w-full rounded-lg' />
				</div>
			</div>
		)
	}

	return (
		<div className='p-4 grid grid-cols-1 lg:grid-cols-3 gap-6'>
			<div className='lg:col-span-3 flex justify-between items-center'>
				<div>
					{user ? (
						<>
							<p className='text-primary-foreground opacity-40 text-4xl font-medium'>
								Welcome,{' '}
								{user.firstName
									? user.firstName.charAt(0).toUpperCase() +
									  user.firstName.slice(1)
									: user.email}
							</p>

							<p className='text-primary-foreground opacity-85 font-semibold text-2xl'>
								Dashboard Overview
							</p>
						</>
					) : null}
				</div>
				<Button
					onClick={handleDownloadReport}
					disabled={isDownloading}
					className='h-[50px] bg-accent text-accent-foreground text-lg rounded-sm hover:bg-accent/70 cursor-pointer'
				>
					{isDownloading ? (
						<RefreshCw className='h-4 w-4 mr-2 animate-spin' />
					) : (
						<Download className='h-4 w-4 mr-2' />
					)}
					<span>{isDownloading ? 'Generating...' : 'Download Report'}</span>
				</Button>
			</div>

			<div className='lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
				<AnalyticsCard
					title='Avg. Order Value'
					value={orderSummary?.avgOrderValue ?? 0}
					changePercent={orderSummary?.avgOrderValueChange}
					trendData={orderSummary?.avgOrderValueTrend}
					icon={DollarSign}
					chartColor='#10B981'
					formatAsCurrency
				/>
				<AnalyticsCard
					title='Conversion Rate'
					value={userAnalytics?.conversionRate ?? 0}
					changePercent={userAnalytics?.conversionRateChangePercent}
					trendData={userAnalytics?.conversionRateTrend}
					icon={RefreshCw}
					chartColor='#38BDF8'
					formatAsPercent
				/>
				<AnalyticsCard
					title='Total Orders'
					value={orderSummary?.totalOrders ?? 0}
					changePercent={orderSummary?.ordersChangePercent}
					trendData={orderSummary?.ordersTrend}
					icon={ShoppingBag}
					chartColor='#8B5CF6'
				/>
				<AnalyticsCard
					title='Total Revenue'
					value={orderSummary?.totalRevenue ?? 0}
					changePercent={orderSummary?.revenueChangePercent}
					trendData={orderSummary?.revenueTrend}
					icon={DollarSign}
					chartColor='#FFB957'
					formatAsCurrency
				/>
			</div>

			{/* Today's Summary Section */}
			<div className='col-span-1 lg:col-span-4'>
				<div className='bg-primary p-4 rounded-lg h-full'>
					<h2 className='text-xl font-bold text-primary-foreground mb-4'>
						Today
					</h2>
					<div className='grid grid-cols-3 gap-4'>
						{/* <TodaySummaryCard 
                            title="Today's Revenue"
                            value={todaysSummary?.totalRevenue ?? 0}
                            icon={DollarSign}
                            color="#10B981"
                            formatAsCurrency
                        /> */}
						<TodaySummaryCard
							title='Total Orders'
							value={todaysSummary?.totalOrders ?? 0}
							icon={Truck}
							color='#8B5CF6'
						/>
						<TodaySummaryCard
							title='Shipped Orders'
							value={todaysSummary?.shippedOrders ?? 0}
							icon={ShoppingCart}
							color='#38BDF8'
						/>
						<TodaySummaryCard
							title='Pending Orders'
							value={todaysSummary?.pendingOrders ?? 0}
							icon={Tag}
							color='#F59E0B'
						/>
					</div>
				</div>
			</div>

			{/* MAIN CONTENT AREA */}
			<div className='grid grid-cols-1 lg:grid-cols-4 col-span-4 gap-4'>
				{/* LEFT (MAIN) */}
				<div className='lg:col-span-2 flex flex-col gap-4'>
					<RevenueBreakdownChart />
					<RecentOrdersTable />
				</div>
				{/* RIGHT (SIDE) */}
				<div className='col-span-2 flex flex-col gap-4'>
					<TopProductsTable />
					<TopCustomersChart />
				</div>
			</div>
		</div>
	)
}

export default HomePage
