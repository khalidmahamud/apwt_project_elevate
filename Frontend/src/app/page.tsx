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
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import TopCustomersChart from '@/components/TopCustomersChart'
import TopProductsTable from '@/components/TopProductsTable'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import RecentOrdersTable from '@/components/RecentOrdersTable'

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
    title: string;
    value: number | string;
    icon: React.ElementType<LucideProps>;
    color: string;
    formatAsCurrency?: boolean;
};

type RevenueBreakdownData = {
	categories: string[];
	data: {
		date: string;
		[key: string]: string | number;
	}[];
};

// Reusable Analytics Mini Chart Component
const AnalyticsMiniChart = ({ data, chartColor }: { data: number[]; chartColor: string }) => {
	const chartData = data.map((value, index) => ({
		name: `Day ${index + 1}`,
		value: value,
	}))

	const gradientId = `color_${chartColor.replace(/[^a-zA-Z0-9]/g, '')}`

	return (
		<div className="w-full h-[100px]">
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart data={chartData}>
					<defs>
						<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor={chartColor} stopOpacity={0.4} />
							<stop offset="95%" stopColor={chartColor} stopOpacity={0} />
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
						type="monotone"
						dataKey="value"
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
const AnalyticsCard = ({ title, value, changePercent, trendData, icon: Icon, chartColor, formatAsCurrency = false, formatAsPercent = false }: AnalyticsCardProps) => {
    let formattedValue: string;
    if (formatAsCurrency) {
        formattedValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
    } else if (formatAsPercent) {
        formattedValue = `${(Number(value) || 0).toFixed(2)}%`;
    } else {
        formattedValue = (Number(value) || 0).toLocaleString();
    }

    return (
        <div className='bg-primary p-4 rounded-lg flex flex-col justify-between h-[200px]'>
            <div className='flex justify-between items-start'>
                <div className="flex items-center gap-4">
                    <div 
                        className="flex items-center justify-center h-10 w-10 rounded-full"
                        style={{ backgroundColor: `${chartColor}33` }}
                    >
                        <Icon 
                            className="h-5 w-5"
                            style={{ color: chartColor }}
                        />
                    </div>
                    <div>
                        <p className='text-sm text-primary-foreground/50'>{title}</p>
                        <p className='text-2xl font-bold text-primary-foreground'>{formattedValue}</p>
                    </div>
                </div>

                {changePercent != null && (
                    <div>
                        <p className='text-sm text-primary-foreground/50 text-right'>Last 7 days</p>
                        <div className={`flex items-center justify-end gap-1 font-semibold text-sm`}>
                            {changePercent >= 0 ? <TrendingUp className='h-4 w-4 text-green-500' /> : <TrendingDown className='h-4 w-4 text-red-500' />}
                            <span className='text-primary-foreground font-semibold'>{changePercent.toFixed(1)}%</span>
                        </div>
                    </div>
                )}
            </div>
            {trendData && chartColor && <AnalyticsMiniChart data={trendData} chartColor={chartColor} />}
        </div>
    );
};

// New Today's Summary Card Component
const TodaySummaryCard = ({ title, value, icon: Icon, color, formatAsCurrency = false }: TodaySummaryCardProps) => {
    const formattedValue = formatAsCurrency
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0)
        : (Number(value) || 0).toLocaleString();
    
    return (
        <div
          className='p-4 rounded-lg relative overflow-hidden'
          style={{
            background: `linear-gradient(135deg, ${color} 0%, #1E293B 100%)`
          }}
        >
          <Icon className="absolute -right-4 -bottom-4 h-24 w-24 text-white/20" />
          <p className='text-white/80'>{title}</p>
          <p className='text-3xl font-bold text-white mt-2'>{formattedValue}</p>
        </div>
    );
};

// New Revenue Breakdown Chart Component
const RevenueBreakdownChart = () => {
	const [data, setData] = useState<RevenueBreakdownData | null>(null);
	const [days, setDays] = useState(7);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		setLoading(true);
		api.get(`/admin/orders/analytics/revenue-breakdown?days=${days}`)
			.then(res => {
				setData(res.data);
			})
			.finally(() => setLoading(false));
	}, [days]);

	const barColors = [
		'#7dd3fc', '#fca5a5', '#fdba74', '#d8b4fe',
		'#6ee7b7', '#a78bfa', '#f472b6', '#facc15',
	];

	if (loading) return (
		<div className="bg-primary p-4 rounded-lg h-full flex flex-col">
			<div className="flex justify-between items-center mb-4">
				<Skeleton className="h-8 w-1/3" />
				<Skeleton className="h-8 w-1/4" />
			</div>
			<div className="flex-grow">
				<Skeleton className="h-full w-full" />
			</div>
		</div>
	);
	if (!data) return <div>No data available</div>;

	return (
		<div className="bg-primary p-4 rounded-lg h-full flex flex-col">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-xl font-bold text-white">Revenue Breakdown</h2>
				{/* Note: ShadCN DropdownMenu would be ideal here */}
				<select
					value={days}
					onChange={(e) => setDays(Number(e.target.value))}
					className="bg-primary-foreground/10 text-white rounded p-1"
				>
					<option value={7}>Last 7 days</option>
					<option value={30}>Last 30 days</option>
					<option value={90}>Last 90 days</option>
				</select>
			</div>
			<ResponsiveContainer width="100%" height="100%">
				<BarChart data={data.data}>
					<XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
					<YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
					<Tooltip
						contentStyle={{
							backgroundColor: '#111827',
							border: 'none',
							borderRadius: '8px',
						}}
					/>
					<Legend formatter={(value) => <span className="text-white">{value}</span>}/>
					{data.categories.map((cat, index) => (
						<Bar key={cat} dataKey={cat} fill={barColors[index % barColors.length]} />
					))}
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
};

function HomePage() {
	const router = useRouter()
	const [user, setUser] = useState<any>(null)
	const [orderSummary, setOrderSummary] = useState<any>(null)
	const [userAnalytics, setUserAnalytics] = useState<any>(null)
	const [todaysSummary, setTodaysSummary] = useState<any>(null)
	const [userLoading, setUserLoading] = useState(true)
	const [summaryLoading, setSummaryLoading] = useState(true)
	const [userAnalyticsLoading, setUserAnalyticsLoading] = useState(true)
	const [todaysSummaryLoading, setTodaysSummaryLoading] = useState(true)
	const [error, setError] = useState('')

	useEffect(() => {
		if (typeof window !== 'undefined') {
			const token = localStorage.getItem('token')
			if (!token) {
				router.replace('/login')
				return
			}

			// Fetch user profile
			api
				.get('/user/profile')
				.then((res) => {
					setUser(res.data)
				})
				.catch((err) => {
					setError('Failed to fetch user profile')
					toast.error('Failed to fetch user profile')
				})
				.finally(() => setUserLoading(false))

			// Fetch order summary
			api
				.get('/admin/orders/analytics/summary')
				.then((res) => {
					setOrderSummary(res.data)
				})
				.catch((err) => {
					setError('Failed to fetch order summary')
					toast.error('Failed to fetch order summary')
				})
				.finally(() => setSummaryLoading(false))

			// Fetch user analytics
			api
				.get('/admin/users/analytics/summary')
				.then((res) => {
					setUserAnalytics(res.data)
				})
				.catch((err) => {
					setError('Failed to fetch user analytics')
					toast.error('Failed to fetch user analytics')
				})
				.finally(() => setUserAnalyticsLoading(false))

			// Fetch today's summary
			const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
			api.get(`/admin/orders/analytics/summary?startDate=${today}&endDate=${today}`)
				.then(res => {
					setTodaysSummary(res.data);
				})
				.catch(err => {
					setError("Failed to fetch today's summary");
					toast.error("Failed to fetch today's summary");
				})
				.finally(() => setTodaysSummaryLoading(false));
		}
	}, [router])

	const isLoading = userLoading || summaryLoading || userAnalyticsLoading || todaysSummaryLoading

	return (
		<div className='p-4 grid grid-cols-1 lg:grid-cols-4 gap-4'>
			<div className='col-span-1 lg:col-span-4 flex justify-between'>
				<div>
					{isLoading ? (
						<p className='text-primary-foreground opacity-40 text-4xl font-medium'>
							Loading...
						</p>
					) : error ? (
						<p className='text-red-500 text-2xl'>{error}</p>
					) : user ? (
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
					asChild
					className='h-[50px] bg-accent text-accent-foreground text-lg rounded-sm hover:bg-accent/70'
				>
					<Link href={''}>
						<span>Download Report</span>
						<Download />
					</Link>
				</Button>
			</div>
			<div className='col-span-1 lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
				{isLoading ? (
					<>
						<Skeleton className="h-[200px] w-full rounded-lg" />
						<Skeleton className="h-[200px] w-full rounded-lg" />
						<Skeleton className="h-[200px] w-full rounded-lg" />
						<Skeleton className="h-[200px] w-full rounded-lg" />
					</>
				) : (
					<>
						<AnalyticsCard
							title="Total Visitors"
							value={userAnalytics?.totalUsers ?? 0}
							changePercent={userAnalytics?.totalUsersChangePercent}
							trendData={userAnalytics?.totalUsersTrend}
							icon={Users}
							chartColor="#10B981"
						/>
						<AnalyticsCard
							title="Conversion Rate"
							value={userAnalytics?.conversionRate ?? 0}
							changePercent={userAnalytics?.conversionRateChangePercent}
							trendData={userAnalytics?.conversionRateTrend}
							icon={RefreshCw}
							chartColor="#38BDF8"
							formatAsPercent
						/>
						<AnalyticsCard
							title="Total Orders"
							value={orderSummary?.totalOrders ?? 0}
							changePercent={orderSummary?.ordersChangePercent}
							trendData={orderSummary?.ordersTrend}
							icon={ShoppingBag}
							chartColor="#8B5CF6"
						/>
						<AnalyticsCard
							title="Total Revenue"
							value={orderSummary?.totalRevenue ?? 0}
							changePercent={orderSummary?.revenueChangePercent}
							trendData={orderSummary?.revenueTrend}
							icon={DollarSign}
							chartColor="#FFB957"
							formatAsCurrency
						/>
					</>
				)}
			</div>

			{/* Today's Summary Section */}
			<div className="col-span-1 lg:col-span-1">
				<div className="bg-primary p-4 rounded-lg h-full">
					<h2 className='text-xl font-bold text-white mb-4'>Today</h2>
					<div className="flex flex-col gap-4">
						{isLoading ? (
							<div className="space-y-4">
								<Skeleton className="h-28 w-full rounded-lg" />
								<Skeleton className="h-28 w-full rounded-lg" />
								<Skeleton className="h-28 w-full rounded-lg" />
								<Skeleton className="h-28 w-full rounded-lg" />
							</div>
						) : (
							<>
								<TodaySummaryCard 
									title="Today's Revenue"
									value={todaysSummary?.totalRevenue ?? 0}
									icon={DollarSign}
									color="#10B981"
									formatAsCurrency
								/>
								<TodaySummaryCard 
									title="Total Orders"
									value={todaysSummary?.totalOrders ?? 0}
									icon={Truck}
									color="#8B5CF6"
								/>
								<TodaySummaryCard 
									title="Shipped Orders"
									value={todaysSummary?.shippedOrders ?? 0}
									icon={ShoppingCart}
									color="#38BDF8"
								/>
								<TodaySummaryCard 
									title="Pending Orders"
									value={todaysSummary?.pendingOrders ?? 0}
									icon={Tag}
									color="#F59E0B"
								/>
							</>
						)}
					</div>
				</div>
			</div>

			{/* Revenue Breakdown Chart */}
			<div className='col-span-1 lg:col-span-3'>
				<RevenueBreakdownChart />
			</div>

			{/* Customer Growth and Top Products */}
			<div className="col-span-1 lg:col-span-2">
				<TopCustomersChart />
			</div>
			<div className="col-span-1 lg:col-span-2">
				<TopProductsTable />
			</div>

			<div className="col-span-1 lg:col-span-4">
				<RecentOrdersTable />
			</div>
		</div>
	)
}

export default HomePage
