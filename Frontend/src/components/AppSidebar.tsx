'use client'
import {
	ClipboardList,
	LayoutDashboard,
	Package,
	Tag,
	Users,
	IdCard,
	Settings,
	LogOut,
} from 'lucide-react'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from './ui/sidebar'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import ElevateLogo from './ElevateLogo'

const items = [
	{
		title: 'Home',
		url: '/',
		icon: LayoutDashboard,
	},
	{
		title: 'Products',
		url: '/products',
		icon: Package,
	},
	{
		title: 'Categories',
		url: '/categories',
		icon: Tag,
	},
	{
		title: 'Orders',
		url: '/orders',
		icon: ClipboardList,
	},
	{
		title: 'Customers',
		url: '/customers',
		icon: Users,
	},
	{
		title: 'Staff',
		url: '/staff',
		icon: IdCard,
	},
	{
		title: 'Settings',
		url: '/settings',
		icon: Settings,
	},
]

const AppSidebar = () => {
	const { state } = useSidebar()
	const pathname = usePathname()
	const isCollapsed = state === 'collapsed'
	const router = useRouter()

	const handleLogout = () => {
		if (typeof window !== 'undefined') {
			localStorage.removeItem('token')
			router.replace('/login')
		}
	}

	const getActiveStyles = (isActive: boolean) => {
		if (!isActive) return ''
		return isCollapsed
			? 'text-accent'
			: 'bg-background text-accent rounded-none'
	}

	return (
		<Sidebar
			collapsible='icon'
			className='bg-primary w-[260px] py-4 border-sidebar'
		>
			<SidebarHeader className='h-[52px]'>
				<SidebarMenu>
					<SidebarMenuItem className='px-2'>
						<Link
							href='/'
							className='w-full flex justify-center'
						>
							{/* <ElevateLogo
								width={isCollapsed ? 40 : 260}
								height={isCollapsed ? 16 : 40}
								color="#96D294"
								showText={!isCollapsed}
							/> */}
						</Link>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup className={!isCollapsed ? 'p-0' : ''}>
					<SidebarGroupContent>
						<SidebarMenu>
							{items.map((item) => {
								const isActive = pathname === item.url
								return (
									<SidebarMenuItem key={item.title}>
										<SidebarMenuButton
											asChild
											className={`h-[50px] px-4 ${
												!isCollapsed ? 'hover:rounded-none' : ''
											} ${getActiveStyles(isActive)}`}
										>
											<Link
												href={item.url}
												className='px-4 relative'
											>
												<item.icon />
												<span>{item.title}</span>
												{isActive && !isCollapsed && (
													<div className='absolute bottom-0 right-0 w-0.5 h-full bg-accent rounded-full' />
												)}
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								)
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							className='h-[40px] bg-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground'
							onClick={handleLogout}
						>
							<button
								className={
									isCollapsed
										? 'w-full flex items-center justify-center'
										: 'w-full flex items-center justify-center'
								}
							>
								<LogOut />
								<span>Log Out</span>
							</button>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	)
}

export default AppSidebar
