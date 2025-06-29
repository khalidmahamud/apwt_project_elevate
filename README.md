# Elevate E-Commerce Platform

A full-stack e-commerce platform built with Next.js frontend and NestJS backend, featuring AI-powered analytics chatbot.

## 🚀 Features Overview

### Frontend (Next.js)
- **Modern UI/UX** with Tailwind CSS and shadcn/ui components
- **Responsive Design** optimized for mobile and desktop
- **Authentication System** with JWT tokens
- **Real-time Analytics Dashboard**
- **Product Management** with CRUD operations
- **Order Management** with status tracking
- **Customer Management**
- **AI-Powered Chatbot** for business analytics

### Backend (NestJS)
- **RESTful API** with comprehensive endpoints
- **JWT Authentication** with role-based access control
- **Database Integration** with PostgreSQL and TypeORM
- **File Upload** for product images
- **Order Processing** with status management
- **User Management** with roles and permissions
- **Analytics API** for business intelligence
- **AI Chatbot Service** with OpenAI integration

## 📁 Project Structure

```
apwt_project_elevate/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # App router pages
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # React context providers
│   │   ├── hooks/           # Custom React hooks
│   │   └── lib/             # Utility functions and API
│   └── public/              # Static assets
├── backend/                 # NestJS backend application
│   └── api/
│       ├── src/
│       │   ├── admin/       # Admin-specific modules
│       │   ├── auth/        # Authentication module
│       │   ├── orders/      # Order management
│       │   ├── products/    # Product management
│       │   ├── users/       # User management
│       │   └── common/      # Shared utilities
│       └── uploads/         # File uploads directory
```

## 🛠️ Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern component library
- **React Hook Form** - Form management
- **Zod** - Schema validation
- **Axios** - HTTP client

### Backend
- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe JavaScript
- **PostgreSQL** - Primary database
- **TypeORM** - Object-Relational Mapping
- **JWT** - Authentication tokens
- **OpenAI API** - AI chatbot integration
- **Multer** - File upload handling

## 🎯 Core Features

### 1. Authentication & Authorization
- **JWT-based authentication** with refresh tokens
- **Role-based access control** (Admin, User)
- **Secure password hashing**
- **Email verification system**
- **Session management**

### 2. Product Management
- **CRUD operations** for products
- **Image upload** with multiple file support
- **Category management** with predefined categories
- **Inventory tracking** with stock quantities
- **Product variants** (sizes, colors)
- **Product status** (active, featured, on sale)
- **Search and filtering** capabilities

### 3. Order Management
- **Order creation** and processing
- **Status tracking** (Pending, Processing, Shipped, Delivered, Cancelled, Refunded)
- **Order history** with detailed tracking
- **Payment integration** support
- **Order notes** and admin comments
- **Invoice generation** and printing

### 4. Customer Management
- **User registration** and profiles
- **Address management** with multiple addresses
- **Order history** for customers
- **Customer analytics** and insights
- **Profile management** with avatar upload

### 5. Analytics Dashboard
- **Real-time metrics** display
- **Revenue analytics** with time-based filtering
- **Order statistics** with status breakdown
- **Customer insights** and top customers
- **Product performance** tracking
- **Inventory alerts** for low stock

### 6. AI-Powered Chatbot
- **Natural language processing** for business queries
- **Real-time analytics** responses
- **Product-specific** analytics
- **Customer insights** and trends
- **Inventory management** queries
- **Revenue and sales** analysis
- **Universal query handling** for any business metric

## 🤖 AI Chatbot Features

### Query Capabilities
The AI chatbot can answer questions about:

#### **Product Analytics**
- "What's the best performing product currently?"
- "Show me analytics for [Product Name]"
- "Which products are low in stock?"
- "Top selling products this month"

#### **Customer Analytics**
- "Who is our best customer currently?"
- "Show me top customers by spending"
- "Customer loyalty analysis"
- "New vs returning customers"

#### **Order Analytics**
- "How many orders do we have today?"
- "Order status breakdown"
- "Pending orders count"
- "Delivery performance"

#### **Revenue Analytics**
- "What's our revenue this month?"
- "Total sales overview"
- "Revenue trends"
- "Profit analysis"

#### **Inventory Analytics**
- "Low stock alerts"
- "Out of stock products"
- "Inventory overview"
- "Stock replenishment needs"

#### **Time-Based Analytics**
- Today, Yesterday, This Week, Last Week
- This Month, Last Month, All Time
- Custom date ranges

#### **Category Analytics**
- "How are electronics performing?"
- "Category performance comparison"
- "Best performing categories"

#### **Trend Analysis**
- "Revenue growth trends"
- "Sales comparison"
- "Performance changes"

### Technical Implementation
- **Dynamic product name extraction** from database
- **Fuzzy matching** for product identification
- **Time range detection** from natural language
- **Real-time database queries** for accurate data
- **OpenAI integration** for natural language responses
- **Prevention of hallucinated data** - only real database values

## 📊 Analytics Features

### Dashboard Components
1. **Revenue Cards** - Total revenue with period comparisons
2. **Order Statistics** - Order counts and status breakdown
3. **Customer Metrics** - Total customers and top spenders
4. **Product Performance** - Best sellers and inventory alerts
5. **Recent Orders Table** - Latest order activity
6. **Top Customers Chart** - Customer spending visualization
7. **Revenue Breakdown** - Category-wise revenue analysis

### Filtering Options
- **Time-based filtering**: 7 days, 30 days, All time
- **Date range selection** with custom start/end dates
- **Real-time updates** with automatic refresh

## 🔧 Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database
- OpenAI API key (for chatbot features)

### Backend Setup
```bash
cd backend/api
npm install
cp .env.example .env
# Configure your .env file with database and OpenAI credentials
npm run start:dev
```

### Frontend Setup
```bash
cd frontend/app
npm install
npm run dev
```

### Environment Variables
```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=your_username
DATABASE_PASSWORD=your_password
DATABASE_NAME=your_database

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

# OpenAI (for chatbot)
OPENAI_API_KEY=your_openai_api_key
```

## 🚀 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/logout` - User logout

### Products
- `GET /products` - Get all products with pagination
- `POST /products` - Create new product
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product
- `POST /products/upload` - Upload product images

### Orders
- `GET /orders` - Get all orders with filtering
- `POST /orders` - Create new order
- `PUT /orders/:id` - Update order status
- `GET /orders/analytics` - Get order analytics

### Users
- `GET /users` - Get all users
- `POST /users` - Create new user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Admin
- `GET /admin/analytics` - Get comprehensive analytics
- `POST /admin/chatbot` - AI chatbot endpoint

## 🎨 UI Components

### Reusable Components
- **Button** - Various styles and states
- **Input** - Form inputs with validation
- **Modal** - Popup dialogs
- **Table** - Data tables with sorting
- **Card** - Content containers
- **Badge** - Status indicators
- **Avatar** - User profile images
- **Dropdown** - Selection menus

### Layout Components
- **Sidebar** - Navigation menu
- **Navbar** - Top navigation bar
- **Layout** - Page structure
- **Theme Provider** - Dark/light mode support

## 🔒 Security Features

- **JWT token authentication**
- **Role-based access control**
- **Password hashing** with bcrypt
- **Input validation** and sanitization
- **CORS configuration**
- **Rate limiting** (configurable)
- **Secure file upload** validation

## 📱 Responsive Design

- **Mobile-first** approach
- **Tablet optimization**
- **Desktop enhancement**
- **Touch-friendly** interactions
- **Adaptive layouts** for all screen sizes

## 🧪 Testing

- **Unit tests** for backend services
- **Integration tests** for API endpoints
- **E2E tests** for critical user flows
- **Component tests** for frontend

## 🚀 Deployment

### Backend Deployment
- **Docker** support for containerization
- **Environment-specific** configurations
- **Database migrations** handling
- **Health check** endpoints

### Frontend Deployment
- **Static export** capability
- **CDN optimization** ready
- **SEO optimization** with meta tags
- **Performance optimization** with Next.js
