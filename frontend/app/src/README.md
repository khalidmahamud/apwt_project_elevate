# Frontend Modular Architecture

This document outlines the modular structure of the frontend application, designed for better reusability, maintainability, and scalability.

## 📁 Directory Structure

```
src/
├── components/
│   ├── common/           # Reusable UI components
│   ├── dashboard/        # Dashboard-specific components
│   ├── forms/           # Form components
│   ├── modals/          # Modal components
│   ├── tables/          # Table components
│   ├── ui/              # Base UI components (shadcn/ui)
│   └── charts/          # Chart components
├── hooks/               # Custom React hooks
├── services/            # API service layer
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── constants/           # Application constants
├── context/             # React context providers
└── lib/                 # Third-party library configurations
```

## 🧩 Components

### Common Components (`/components/common/`)

Reusable components that can be used across the entire application:

- **LoadingSpinner**: Consistent loading states with customizable sizes
- **EmptyState**: Empty state displays with optional actions
- **TablePagination**: Reusable pagination component for tables

```tsx
import { LoadingSpinner, EmptyState, TablePagination } from '@/components/common'

// Usage
<LoadingSpinner size="md" text="Loading data..." />
<EmptyState 
  title="No data found" 
  description="Try adjusting your filters"
  action={{ label: "Add Item", onClick: handleAdd }}
/>
```

### Dashboard Components (`/components/dashboard/`)

Specialized components for dashboard layouts and analytics:

- **AnalyticsCard**: Displays metrics with trend charts
- **TodaySummaryCard**: Summary cards for daily metrics
- **DashboardLayout**: Consistent dashboard page structure
- **DashboardGrid**: Responsive grid layouts for dashboard content

```tsx
import { 
  AnalyticsCard, 
  TodaySummaryCard, 
  DashboardLayout,
  DashboardGrid 
} from '@/components/dashboard'

// Usage
<DashboardLayout 
  title="Dashboard Overview"
  actions={[
    { label: "Refresh", onClick: handleRefresh },
    { label: "Export", onClick: handleExport }
  ]}
>
  <DashboardGrid columns={4}>
    <AnalyticsCard 
      title="Revenue"
      value={10000}
      changePercent={12.5}
      icon={DollarSign}
      formatAsCurrency
    />
  </DashboardGrid>
</DashboardLayout>
```

## 🎣 Custom Hooks

### API Hooks (`/hooks/useApi.ts`)

Custom hooks for API calls with built-in loading states and error handling:

```tsx
import { useGet, usePost, usePatch } from '@/hooks/useApi'

// Usage
const { data, loading, error, refetch } = useGet('/api/products', {
  page: 1,
  limit: 10
})

const { mutate, loading } = usePost('/api/products', productData, {
  onSuccess: () => toast.success('Product created!'),
  showSuccessToast: true
})
```

### Pagination Hook (`/hooks/usePagination.ts`)

Handles pagination logic with windowed page numbers:

```tsx
import { usePagination } from '@/hooks/usePagination'

// Usage
const pagination = usePagination({
  total: 100,
  pageSize: 10,
  initialPage: 1
})

// Returns: currentPage, totalPages, pageNumbers, goToPage, nextPage, prevPage
```

## 🔧 Utilities

### Formatters (`/utils/formatters.ts`)

Consistent formatting functions for currency, dates, numbers, etc.:

```tsx
import { 
  formatCurrency, 
  formatDate, 
  formatNumber,
  formatRelativeTime 
} from '@/utils/formatters'

// Usage
formatCurrency(1234.56) // "$1,234.56"
formatDate('2024-01-15') // "Jan 15, 2024"
formatRelativeTime('2024-01-15') // "2 days ago"
```

### Validation (`/utils/validation.ts`)

Form validation utilities:

```tsx
import { 
  validateEmail, 
  validatePassword, 
  validateProduct,
  validateUser 
} from '@/utils/validation'

// Usage
const errors = validateProduct({
  name: 'Product Name',
  price: 29.99,
  stockQuantity: 10,
  category: 'Electronics'
})
```

## 📊 Services Layer

### API Services (`/services/api.ts`)

Centralized API calls organized by domain:

```tsx
import { productService, orderService, userService } from '@/services/api'

// Usage
const products = await productService.getProducts({ page: 1, limit: 10 })
const order = await orderService.getOrder('order-id')
const user = await userService.updateUser('user-id', { firstName: 'John' })
```

## 🎯 Types

### Type Definitions (`/types/index.ts`)

Comprehensive TypeScript interfaces for all data structures:

```tsx
import type { 
  Product, 
  Order, 
  User, 
  AnalyticsCardProps,
  PaginatedResponse 
} from '@/types'

// Usage
const products: Product[] = []
const response: PaginatedResponse<Product> = { data: [], total: 0, page: 1 }
```

## 🎨 Constants

### Application Constants (`/constants/index.ts`)

Centralized configuration values:

```tsx
import { 
  API_ENDPOINTS, 
  CHART_COLORS, 
  PAGINATION,
  ORDER_STATUSES 
} from '@/constants'

// Usage
const endpoint = API_ENDPOINTS.PRODUCTS
const color = CHART_COLORS.PRIMARY
const pageSize = PAGINATION.DEFAULT_PAGE_SIZE
```

## 🚀 Best Practices

### 1. Component Organization
- Keep components small and focused on a single responsibility
- Use composition over inheritance
- Export components through index files for clean imports

### 2. Type Safety
- Always define TypeScript interfaces for props and data
- Use strict typing for API responses
- Leverage generic types for reusable components

### 3. State Management
- Use custom hooks for complex state logic
- Keep component state minimal
- Use React Context for global state

### 4. API Calls
- Use the service layer for all API interactions
- Implement proper error handling
- Use custom hooks for data fetching

### 5. Styling
- Use consistent spacing and color schemes
- Leverage CSS variables for theming
- Follow the design system patterns

## 📝 Migration Guide

When migrating existing components:

1. **Extract reusable logic** into custom hooks
2. **Create proper TypeScript interfaces** for all props and data
3. **Use the service layer** instead of direct API calls
4. **Implement consistent error handling** and loading states
5. **Use the utility functions** for formatting and validation

## 🔄 Adding New Features

1. **Define types** in `/types/index.ts`
2. **Add constants** in `/constants/index.ts`
3. **Create services** in `/services/api.ts`
4. **Build components** in appropriate directories
5. **Add custom hooks** if needed
6. **Update documentation** and examples

This modular architecture provides a solid foundation for scalable, maintainable, and reusable code while ensuring consistency across the application. 