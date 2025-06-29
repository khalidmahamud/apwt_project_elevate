'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

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
    const [days, setDays] = useState('30');
    const [customers, setCustomers] = useState<CustomerAnalytics[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        api.get(`/admin/orders/analytics/customer?days=${days}`)
            .then(res => {
                setCustomers(res.data);
            })
            .catch(err => {
                toast.error('Failed to fetch top customers.');
                console.error(err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [days]);

    return (
        <div className="bg-primary p-4 rounded-lg flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-primary-foreground">Top Customers</h2>
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