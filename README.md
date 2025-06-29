# Elevate E-commerce Platform

A comprehensive e-commerce management system built with NestJS backend and Next.js frontend, featuring advanced analytics, AI-powered chatbot, and robust user management.

## 🚀 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Backend Features](#backend-features)
- [Frontend Features](#frontend-features)
- [Authentication System](#authentication-system)
- [API Documentation](#api-documentation)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Contributing](#contributing)

## 📋 Overview

Elevate is a full-stack e-commerce platform that provides:

- **Admin Dashboard**: Comprehensive analytics and management tools
- **User Management**: Role-based access control with customer profiles
- **Product Management**: Advanced product catalog with categories and status flags
- **Order Management**: Complete order lifecycle management
- **AI Chatbot**: Intelligent customer support and analytics queries
- **Analytics**: Real-time business intelligence and reporting
- **File Management**: Secure file upload and static serving

## 🏗️ Architecture

### Backend (NestJS)
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT with refresh tokens
- **Documentation**: Swagger/OpenAPI
- **File Handling**: Express static serving
- **AI Integration**: OpenAI GPT-3.5 for chatbot

### Frontend (Next.js)
- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS with shadcn/ui components
- **Charts**: Recharts for data visualization
- **State Management**: React Context API
- **HTTP Client**: Axios with interceptors
- **UI Components**: Radix UI primitives

## 🔧 Backend Features

### 1. Authentication Module (`/auth/`)

**Libraries Used:**
- `@nestjs/jwt` - JWT token generation and validation
- `@nestjs/passport` - Authentication strategies
- `passport-jwt` - JWT strategy implementation
- `bcrypt` - Password hashing and comparison
- `cookie-parser` - Cookie handling

**Features:**
- JWT-based authentication with access and refresh tokens
- Role-based authorization (Admin, Customer)
- Password hashing with bcrypt
- Token refresh mechanism
- Login/logout functionality
- User session management

**Key Components:**
- `AuthService` - Core authentication logic
- `JwtAuthGuard` - Route protection
- `RolesGuard` - Role-based access control
- `JwtStrategy` - JWT token validation
- `RefreshTokenStrategy` - Refresh token handling

### 2. User Management Module (`/users/`)

**Libraries Used:**
- `@nestjs/typeorm` - Database operations
- `class-validator` - Input validation
- `class-transformer` - Data transformation

**Features:**
- User CRUD operations
- Profile management with image upload
- Address management
- Role assignment
- User analytics and reporting
- Customer insights

**Key Components:**
- `UsersService` - Business logic
- `AdminUserController` - Admin user management
- `UsersController` - Public user operations
- `Users` entity - Database model
- `Address` entity - User addresses

### 3. Product Management Module (`/products/`)

**Libraries Used:**
- `@nestjs/typeorm` - Database operations
- `date-fns` - Date manipulation

**Features:**
- Product CRUD operations
- Category management
- Product status flags (Featured, New Arrival, Best Seller, On Sale)
- Stock management
- Product analytics
- Image upload and management

**Key Components:**
- `ProductsService` - Business logic
- `AdminProductsController` - Admin product management
- `ProductController` - Public product operations
- `Product` entity - Database model

### 4. Order Management Module (`/orders/`)

**Libraries Used:**
- `@nestjs/typeorm` - Database operations
- `date-fns` - Date manipulation

**Features:**
- Order creation and management
- Order status tracking
- Order items management
- Order analytics
- Revenue tracking
- Customer order history

**Key Components:**
- `OrdersService` - Business logic
- `AdminOrdersController` - Admin order management
- `OrdersController` - Public order operations
- `Order` entity - Database model
- `OrderItem` entity - Order line items

### 5. Admin Module (`/admin/`)

**Libraries Used:**
- `exceljs` - Excel report generation
- `papaparse` - CSV parsing
- `openai` - AI chatbot integration

**Features:**
- Comprehensive admin dashboard
- Business analytics and reporting
- Customer reports
- Product performance tracking
- Order analytics
- AI-powered chatbot for business insights

**Key Components:**
- `ChatbotService` - AI-powered analytics assistant
- Admin controllers for all modules
- Report generation services
- Analytics aggregation

### 6. File Upload System

**Libraries Used:**
- `express` - Static file serving
- `multer` - File upload handling

**Features:**
- Secure file upload
- Image processing
- Static file serving
- File validation
- Organized file storage

## 🎨 Frontend Features

### 1. Authentication System

**Libraries Used:**
- `axios` - HTTP client
- `react` - UI framework
- `next-themes` - Theme management

**Features:**
- Login/logout functionality
- Token management
- Role-based routing
- Protected routes
- User context management

**Key Components:**
- `AuthContext` - Global authentication state
- `login-form.tsx` - Login interface
- `useAuth` hook - Authentication utilities

### 2. Dashboard Components

**Libraries Used:**
- `recharts` - Data visualization
- `lucide-react` - Icons
- `date-fns` - Date formatting
- `sonner` - Toast notifications

**Features:**
- Real-time analytics dashboard
- Interactive charts and graphs
- Performance metrics
- Revenue breakdown
- Order tracking
- Customer insights

**Key Components:**
- `AnalyticsCard` - Metric display with trends
- `DashboardLayout` - Consistent layout structure
- `DashboardGrid` - Responsive grid system
- `RevenueBreakdownChart` - Revenue visualization
- `TopCustomersChart` - Customer analytics
- `TopProductsTable` - Product performance

### 3. User Management Interface

**Libraries Used:**
- `@radix-ui/react-*` - UI primitives
- `tailwind-merge` - CSS class merging
- `class-variance-authority` - Component variants

**Features:**
- User profile management
- Profile image upload
- User information editing
- Address management
- Role-based interface

**Key Components:**
- `profile/page.tsx` - User profile interface
- `customers/page.tsx` - Customer management
- `customer-profile/page.tsx` - Customer profile view

### 4. Product Management Interface

**Libraries Used:**
- `@radix-ui/react-dialog` - Modal dialogs
- `@radix-ui/react-select` - Dropdown selects
- `@radix-ui/react-tabs` - Tab navigation

**Features:**
- Product catalog management
- Product creation and editing
- Category management
- Stock management
- Product status toggles
- Image upload

**Key Components:**
- `products/page.tsx` - Product management interface
- Product forms and modals
- Product status controls

### 5. Order Management Interface

**Libraries Used:**
- `@radix-ui/react-table` - Data tables
- `@radix-ui/react-badge` - Status badges

**Features:**
- Order tracking and management
- Order status updates
- Order history
- Order analytics
- Customer order views

**Key Components:**
- `orders/page.tsx` - Order management interface
- Order status indicators
- Order detail views

### 6. Common UI Components

**Libraries Used:**
- `@radix-ui/react-*` - UI primitives
- `clsx` - Conditional class names

**Features:**
- Reusable UI components
- Consistent design system
- Responsive layouts
- Loading states
- Error handling

**Key Components:**
- `LoadingSpinner` - Loading indicators
- `EmptyState` - Empty state displays
- `Button` - Interactive buttons
- `Input` - Form inputs
- `Table` - Data tables
- `Modal` - Dialog components

### 7. Custom Hooks

**Features:**
- API data fetching
- Pagination management
- Form handling
- Authentication utilities

**Key Components:**
- `useApi` - API data fetching hooks
- `usePagination` - Pagination logic
- `useAuth` - Authentication utilities
- `useMobile` - Responsive utilities

## 🔐 Authentication System

### JWT Token Architecture

**Token Types:**
1. **Access Token** - Short-lived (1 hour) for API access
2. **Refresh Token** - Long-lived (24 hours) for token renewal

**Security Features:**
- Token rotation on refresh
- Secure token storage
- Automatic token refresh
- Role-based access control

### Authentication Flow

1. **Login Process:**
   ```typescript
   // User submits credentials
   POST /auth/login
   {
     "email": "user@example.com",
     "password": "password123"
   }
   
   // Server responds with tokens
   {
     "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "message": "Welcome user"
   }
   ```

2. **Token Validation:**
   - Access tokens validated on each protected request
   - Refresh tokens used to generate new access tokens
   - Invalid tokens result in 401 Unauthorized

3. **Role-Based Access:**
   ```typescript
   @UseGuards(JwtAuthGuard, RolesGuard)
   @Roles(Role.ADMIN)
   @Get('admin/users')
   async getUsers() {
     // Only accessible by admin users
   }
   ```

### Cookie Management

**Configuration:**
- Secure cookie settings
- HTTP-only cookies for security
- Cross-origin resource sharing (CORS)
- Credential inclusion for authenticated requests

**Implementation:**
```typescript
// Backend CORS configuration
app.enableCors({
  origin: 'http://localhost:3001',
  credentials: true,
});

// Frontend axios configuration
axios.defaults.withCredentials = true;
```

### Session Management

**Features:**
- Automatic token refresh
- Session persistence
- Logout functionality
- User state management

**Implementation:**
```typescript
// AuthContext for global state
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token refresh logic
const refreshToken = async () => {
  try {
    const response = await api.post('/auth/refresh');
    setTokens(response.data);
  } catch (error) {
    logout();
  }
};
```

## 📚 API Documentation

### Core Endpoints

#### Authentication
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout

#### Users
- `GET /users/profile` - Get user profile
- `PATCH /users/profile` - Update user profile
- `GET /admin/users` - Get all users (Admin)
- `PATCH /admin/users/:id` - Update user (Admin)
- `GET /admin/users/analytics` - User analytics (Admin)

#### Products
- `GET /products` - Get products
- `POST /admin/products` - Create product (Admin)
- `PATCH /admin/products/:id` - Update product (Admin)
- `DELETE /admin/products/:id` - Delete product (Admin)
- `GET /admin/products/analytics` - Product analytics (Admin)

#### Orders
- `GET /orders` - Get orders
- `POST /orders` - Create order
- `PATCH /admin/orders/:id` - Update order (Admin)
- `GET /admin/orders/analytics` - Order analytics (Admin)

#### Admin
- `GET /admin/chatbot` - AI chatbot queries
- `GET /admin/reports` - Generate reports

### Swagger Documentation

Access the interactive API documentation at:
```
http://localhost:3000/api
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### Backend Setup

1. **Clone and install dependencies:**
   ```bash
   cd backend/api
   npm install
   ```

2. **Database setup:**
   ```bash
   # Create PostgreSQL database
   createdb elevate_db
   
   # Run migrations
   npm run migration:run
   ```

3. **Environment configuration:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server:**
   ```bash
   npm run start:dev
   ```

### Frontend Setup

1. **Install dependencies:**
   ```bash
   cd frontend/app
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

## 🔧 Environment Variables

### Backend (.env)
```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=elevate_db

# JWT
JWT_ACCESS_TOKEN_SECRET=your-access-secret
JWT_REFRESH_TOKEN_SECRET=your-refresh-secret
JWT_TOKEN_AUDIENCE=elevate-api
JWT_TOKEN_ISSUER=elevate
JWT_ACCESS_TOKEN_TTL=3600
JWT_REFRESH_TOKEN_TTL=86400

# OpenAI (for chatbot)
OPENAI_API_KEY=your-openai-api-key

# Server
PORT=3000
NODE_ENV=development
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Elevate
```

## 🚀 Usage

### Development

1. **Start both servers:**
   ```bash
   # Backend (Terminal 1)
   cd backend/api && npm run start:dev
   
   # Frontend (Terminal 2)
   cd frontend/app && npm run dev
   ```

2. **Access the application:**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000
   - API Docs: http://localhost:3000/api

### Production

1. **Build the applications:**
   ```bash
   # Backend
   cd backend/api && npm run build
   
   # Frontend
   cd frontend/app && npm run build
   ```

2. **Start production servers:**
   ```bash
   # Backend
   cd backend/api && npm run start:prod
   
   # Frontend
   cd frontend/app && npm start
   ```

## 📊 Features Overview

### Admin Dashboard
- Real-time analytics and metrics
- Revenue and order tracking
- Customer insights
- Product performance
- AI-powered business insights

### User Management
- Role-based access control
- Profile management
- Customer analytics
- User activity tracking

### Product Management
- Advanced product catalog
- Category management
- Stock tracking
- Product status flags
- Performance analytics

### Order Management
- Complete order lifecycle
- Status tracking
- Revenue analytics
- Customer order history

### AI Chatbot
- Natural language queries
- Business intelligence
- Product recommendations
- Customer support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation at `/api`
- Review the codebase structure

---

**Elevate E-commerce Platform** - Built with ❤️ using NestJS and Next.js
