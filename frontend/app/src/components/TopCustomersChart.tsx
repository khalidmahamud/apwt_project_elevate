'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ListFilter } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

type CustomerAnalytics = {
	id: string;
	email: string;
	orderCount: string;
	totalSpent: string;
	lastOrderDate: string;
};

const formatCurrency = (amount: number) => {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
	}).format(amount);
};

const TopCustomersChart = () => {
    const { user, loading: authLoading } = useAuth()
    const [days, setDays] = useState('30');
    const [customers, setCustomers] = useState<CustomerAnalytics[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || authLoading) return
        
        setLoading(true);
        api.get(`/admin/orders/analytics/customer?days=${days}`)
            .then(res => {
                setCustomers(res.data);
            })
            .catch(err => {
                if (user && !authLoading) {
                    toast.error('Failed to fetch top customers.');
                }
                console.error(err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [days, user, authLoading]);

    const getDaysLabel = (days: string) => {
        switch (days) {
            case '7': return 'Last 7 Days';
            case '30': return 'Last 30 Days';
            case '90': return 'Last 90 Days';
            default: return 'Last 30 Days';
        }
    };

    return (
        <div className="bg-primary p-4 rounded-lg flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-primary-foreground">Top Customers</h2>
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
                        <DropdownMenuItem onClick={() => setDays('7')}>Last 7 Days</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDays('30')}>Last 30 Days</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDays('90')}>Last 90 Days</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="overflow-auto">
                {loading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex justify-between items-center p-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-4 w-1/6" />
                                <Skeleton className="h-4 w-1/4" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <table className="w-full text-left text-sm text-primary-foreground">
                        <thead className="text-xs text-primary-foreground font-semibold uppercase border-b border-gray-700">
                            <tr>
                                <th scope="col" className="py-3 px-2">Customer</th>
                                <th scope="col" className="py-3 px-2 text-right">Orders</th>
                                <th scope="col" className="py-3 px-2 text-right">Total Spent</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((customer) => (
                                <tr key={customer.id} className="border-b border-gray-800 hover:bg-primary-foreground/5">
                                    <td className="py-3 px-2 text-primary-foreground font-medium">{customer.email}</td>
                                    <td className="py-3 px-2 text-right">{customer.orderCount}</td>
                                    <td className="py-3 px-2 text-right font-bold text-primary-foreground">{formatCurrency(parseFloat(customer.totalSpent))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default TopCustomersChart; 