'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { MoreHorizontal, ListFilter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

type OrderItem = {
    product: {
        name: string;
    };
};

type Order = {
    id: string;
    items: OrderItem[];
    totalAmount: number;
    createdAt: string;
    status: string;
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

const getStatusVariant = (status: string) => {
    switch (status.toUpperCase()) {
        case 'DELIVERED':
            return 'success';
        case 'PENDING':
            return 'secondary';
        case 'SHIPPED':
            return 'default';
        case 'CANCELLED':
            return 'destructive';
        case 'RETURNED':
            return 'warning';
        default:
            return 'outline';
    }
}

const RecentOrdersTable = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ sortBy: 'createdAt', sortOrder: 'DESC' });

    useEffect(() => {
        const fetchRecentOrders = async () => {
            try {
                setLoading(true);
                const { sortBy, sortOrder } = sortConfig;
                const response = await api.get(`/admin/orders?limit=10&sortBy=${sortBy}&sortOrder=${sortOrder}`);
                setOrders(response.data.data);
            } catch (error) {
                toast.error('Failed to fetch recent orders.');
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchRecentOrders();
    }, [sortConfig]);

    const handleSortChange = (sortBy: string, sortOrder: 'ASC' | 'DESC') => {
        setSortConfig({ sortBy, sortOrder });
    };

    const renderSkeleton = () => (
        <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="grid grid-cols-5 gap-4 items-center p-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                </div>
            ))}
        </div>
    );

    return (
        <div className="bg-primary text-primary-foreground p-4 rounded-lg mt-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-primary-foreground">Recent Orders</h2>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="ml-auto gap-1">
                            <ListFilter className="h-3.5 w-3.5" />
                            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Sort by</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleSortChange('createdAt', 'DESC')}>Date: Newest first</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSortChange('createdAt', 'ASC')}>Date: Oldest first</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSortChange('totalAmount', 'DESC')}>Amount: High to Low</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSortChange('totalAmount', 'ASC')}>Amount: Low to High</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSortChange('status', 'ASC')}>Status</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            {loading ? (
                renderSkeleton()
            ) : (
                <Table className='text-primary-foreground'>
                    <TableHeader>
                        <TableRow className='text-primary-foreground'>
                            <TableHead className='text-primary-foreground font-semibold capitalize'>ID</TableHead>
                            <TableHead className='text-primary-foreground font-semibold capitalize'>Product Name</TableHead>
                            <TableHead className="text-right text-primary-foreground font-semibold">Amount</TableHead>
                            <TableHead className='text-primary-foreground font-semibold'>Date</TableHead>
                            <TableHead className='text-primary-foreground font-semibold'>Status</TableHead>
                            <TableHead className='text-primary-foreground font-semibold'>
                                <span className="sr-only">Actions</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">{`${order.id.substring(0, 8)}...`}</TableCell>
                                <TableCell>{order.items.length > 0 ? order.items[0].product.name : 'N/A'}</TableCell>
                                <TableCell className="text-right">{formatCurrency(order.totalAmount)}</TableCell>
                                <TableCell>{formatDate(order.createdAt)}</TableCell>
                                <TableCell>
                                    <Badge className='' variant={getStatusVariant(order.status) as any}>{order.status}</Badge>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button aria-haspopup="true" size="icon" variant="ghost">
                                                <MoreHorizontal className="h-4 w-4" />
                                                <span className="sr-only">Toggle menu</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem>View Details</DropdownMenuItem>
                                            <DropdownMenuItem>Update Status</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
};

export default RecentOrdersTable; 