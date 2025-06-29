'use client'

import { useEffect, useState } from 'react'
import { DollarSign, RefreshCw, ShoppingBag, Truck, ShoppingCart, Tag, Download } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { isAdmin } from '@/utils/auth'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

// Custom hooks
import { useGet } from '@/hooks/useApi'
import { useAuth } from '@/context/AuthContext'

// API
import api from '@/lib/api'

// Types
import { OrderSummary, TodaySummary, UserAnalytics } from '@/types'

// Constants
import { API_ENDPOINTS, CHART_COLORS } from '@/constants'

// Components
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import DashboardGrid, { DashboardSection, DashboardCard } from '@/components/dashboard/DashboardGrid'
import AnalyticsCard from '@/components/dashboard/AnalyticsCard'
import TodaySummaryCard from '@/components/dashboard/TodaySummaryCard'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import TopCustomersChart from '@/components/TopCustomersChart'
import TopProductsTable from '@/components/TopProductsTable'
import RecentOrdersTable from '@/components/RecentOrdersTable'
import RevenueBreakdownChart from '@/components/RevenueBreakdownChart'

function HomePage() {
	const { user, loading: authLoading } = useAuth()
	const [isDownloading, setIsDownloading] = useState(false)
	const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null)
	const [userAnalyticsLoading, setUserAnalyticsLoading] = useState(false)
	const router = useRouter()

	// Fetch dashboard data
	const {
		data: orderSummary,
		loading: dashboardLoading,
		error: dashboardError,
		refetch: refetchDashboard,
	} = useGet<OrderSummary>(API_ENDPOINTS.ORDER_ANALYTICS, undefined, {
		enabled: !!user && !authLoading && isAdmin(user),
		showErrorToast: !!user && !authLoading && isAdmin(user),
	})

	// Fetch user analytics for conversion rate
	const fetchUserAnalytics = async () => {
		if (!user || authLoading || !isAdmin(user)) return
		
		try {
			setUserAnalyticsLoading(true)
			const response = await api.get('/admin/users/analytics')
			setUserAnalytics(response.data)
		} catch (error) {
			console.error('Failed to fetch user analytics:', error)
		} finally {
			setUserAnalyticsLoading(false)
		}
	}

	// Admin protection - using useEffect to avoid calling router during render
	useEffect(() => {
		if (!authLoading && (!user || !isAdmin(user))) {
			router.replace('/customer-profile')
		}
	}, [authLoading, user, router])

	// Fetch user analytics when user is available
	useEffect(() => {
		if (user && !authLoading && isAdmin(user)) {
			fetchUserAnalytics()
		}
	}, [user, authLoading])

	// Derive Today's Summary from the main summary
	const todaysSummary: TodaySummary | null = orderSummary ? {
		totalOrders: orderSummary.ordersTrend[orderSummary.ordersTrend.length - 1] || 0,
		totalRevenue: orderSummary.revenueTrend[orderSummary.revenueTrend.length - 1] || 0,
		shippedOrders: 0, // This would need to come from a separate API call
		pendingOrders: 0, // This would need to come from a separate API call
	} : null

	const handleDownloadReport = async () => {
		setIsDownloading(true)
		toast.info('Generating your report, please wait...')
		
		try {
			const response = await api.get(API_ENDPOINTS.ORDER_REPORT, {
				responseType: 'blob',
			})
			
			const blob = new Blob([response.data])
			const url = window.URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.style.display = 'none'
			a.href = url
			a.download = `master-report-${new Date().toISOString().split('T')[0]}.xlsx`
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

	const handleRefresh = () => {
		refetchDashboard()
		fetchUserAnalytics()
	}

	// Show loading while checking authentication
	if (authLoading || (!user || !isAdmin(user))) {
		return (
			<DashboardLayout title="Loading...">
				<div className='lg:col-span-4 flex justify-center items-center min-h-[400px]'>
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
						<p className="text-muted-foreground">Loading...</p>
					</div>
				</div>
			</DashboardLayout>
		)
	}

	if (dashboardError) {
		return (
			<DashboardLayout title="Dashboard Overview">
				<div className='lg:col-span-4 flex justify-center items-center min-h-[400px]'>
					<LoadingSpinner 
						size="lg" 
						text="Failed to load dashboard data. Please try again." 
					/>
				</div>
			</DashboardLayout>
		)
	}

	return (
		<DashboardLayout 
			title="Dashboard Overview"
			actions={[
				{
					label: dashboardLoading ? 'Loading...' : 'Refresh',
					onClick: handleRefresh,
					icon: <RefreshCw className="h-4 w-4" />,
					loading: dashboardLoading,
					variant: 'outline',
				},
				{
					label: isDownloading ? 'Generating...' : 'Download Report',
					onClick: handleDownloadReport,
					icon: <Download className="h-4 w-4" />,
					loading: isDownloading,
					variant: 'default',
				},
			]}
		>
			{/* Analytics Cards */}
			<DashboardGrid columns={4} className="lg:col-span-4">
				<AnalyticsCard
					title='Avg. Order Value'
					value={orderSummary?.avgOrderValue ?? 0}
					changePercent={orderSummary?.avgOrderValueChange}
					trendData={orderSummary?.avgOrderValueTrend}
					icon={DollarSign}
					chartColor={CHART_COLORS.PRIMARY}
					formatAsCurrency
				/>
				<AnalyticsCard
					title='Conversion Rate'
					value={userAnalytics?.conversionRate ?? 0}
					changePercent={userAnalytics?.conversionRateChangePercent}
					trendData={userAnalytics?.conversionRateTrend}
					icon={RefreshCw}
					chartColor={CHART_COLORS.SECONDARY}
					formatAsPercent
				/>
				<AnalyticsCard
					title='Total Orders'
					value={orderSummary?.totalOrders ?? 0}
					changePercent={orderSummary?.ordersChangePercent}
					trendData={orderSummary?.ordersTrend}
					icon={ShoppingBag}
					chartColor={CHART_COLORS.PURPLE}
				/>
				<AnalyticsCard
					title='Total Revenue'
					value={orderSummary?.totalRevenue ?? 0}
					changePercent={orderSummary?.revenueChangePercent}
					trendData={orderSummary?.revenueTrend}
					icon={DollarSign}
					chartColor={CHART_COLORS.ORANGE}
					formatAsCurrency
				/>
			</DashboardGrid>

			{/* Today's Summary Section */}
			<DashboardSection 
				title="Today" 
				className="col-span-1 lg:col-span-4"
			>
				<DashboardCard>
					<DashboardGrid columns={3} gap="md">
						<TodaySummaryCard
							title='Total Orders'
							value={todaysSummary?.totalOrders ?? 0}
							icon={Truck}
							color={CHART_COLORS.PURPLE}
						/>
						<TodaySummaryCard
							title='Shipped Orders'
							value={todaysSummary?.shippedOrders ?? 0}
							icon={ShoppingCart}
							color={CHART_COLORS.SECONDARY}
						/>
						<TodaySummaryCard
							title='Pending Orders'
							value={todaysSummary?.pendingOrders ?? 0}
							icon={Tag}
							color={CHART_COLORS.WARNING}
						/>
					</DashboardGrid>
				</DashboardCard>
			</DashboardSection>

			{/* Main Content Area */}
			<div className='grid grid-cols-1 lg:grid-cols-4 lg:col-span-4 gap-4'>
				{/* Left (Main) */}
				<div className='lg:col-span-2 flex flex-col gap-4'>
					<RevenueBreakdownChart />
					<RecentOrdersTable />
				</div>
				{/* Right (Side) */}
				<div className='col-span-2 flex flex-col gap-4'>
					<TopProductsTable />
					<TopCustomersChart />
				</div>
			</div>
		</DashboardLayout>
	)
}

export default HomePage
