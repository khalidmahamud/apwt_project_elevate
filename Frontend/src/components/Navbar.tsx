'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
	Bell,
	LogOut,
	MessageSquareText,
	Moon,
	SeparatorHorizontal,
	Settings,
	Sun,
	Tally1,
	User,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from './ui/button'
import { useTheme } from 'next-themes'
import { SidebarTrigger } from './ui/sidebar'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import api from '@/lib/api'

const Navbar = () => {
	const router = useRouter()
	const { theme, setTheme } = useTheme()
	const [user, setUser] = useState<any>(null)
	const [loading, setLoading] = useState(true)
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
				})
				.finally(() => setLoading(false))
		}
	}, [router])

	const handleLogout = () => {
		if (typeof window !== 'undefined') {
			localStorage.removeItem('token');
			router.replace('/login');
		}
	}

	return (
		<nav className='w-full p-4 flex items-center justify-between bg-primary'>
			{/* LEFT */}
			<SidebarTrigger />
			{/* RIGHT */}
			<div className='flex items-center gap-4'>
				<Button
					variant='outline'
					size='icon'
				>
					<MessageSquareText />
				</Button>
				<Button
					variant='outline'
					size='icon'
				>
					<Bell />
				</Button>
				{/* THEME MENU */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant='outline'
							size='icon'
						>
							<Sun className='h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0' />
							<Moon className='absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100' />
							<span className='sr-only'>Toggle theme</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align='end'>
						<DropdownMenuItem onClick={() => setTheme('light')}>
							Light
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setTheme('dark')}>
							Dark
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setTheme('system')}>
							System
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<div className='h-8 w-0.5 bg-primary-foreground'></div>
				{!loading && user ? (
					<div>
						<p className='text-sm text-accent'>
							{user.firstName
								? user.firstName.charAt(0).toUpperCase() + user.firstName.slice(1)
								: ''}
							{user.lastName
								? ' ' + user.lastName.charAt(0).toUpperCase() + user.lastName.slice(1)
								: ''}
						</p>
						<p className='text-[12px]'>{user.email}</p>
					</div>
				) : (
					<div className='w-24 h-6 bg-gray-200 rounded animate-pulse'></div>
				)}
				{/* USER MENU */}
				<DropdownMenu>
					<DropdownMenuTrigger>
						<Avatar>
							<AvatarImage src='https://github.com/shadcn.png' />
							<AvatarFallback>CN</AvatarFallback>
						</Avatar>
					</DropdownMenuTrigger>
					<DropdownMenuContent sideOffset={10}>
						<DropdownMenuLabel>My Account</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem>
							<User className='h-[1.2rem w-[1.2rem] mr-2' />
							Profile
						</DropdownMenuItem>
						<DropdownMenuItem>
							<Settings className='h-[1.2rem w-[1.2rem] mr-2' />
							Settings
						</DropdownMenuItem>
						<DropdownMenuItem variant='destructive' onClick={handleLogout} className="cursor-pointer">
							<LogOut className='h-[1.2rem w-[1.2rem] mr-2' />
							Log Out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</nav>
	)
}

export default Navbar
