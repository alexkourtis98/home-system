# HomeSystem - Property Management

A modern, full-stack property management application built for landlords and property managers to efficiently manage rental properties, tenants, leases, and payments.

## Features

### Property Management
- Add, edit, and delete properties
- Track property details (address, size, type, monthly rent)
- Property status tracking (available, occupied, maintenance, unavailable)
- Image gallery for each property
- Comprehensive property search and filtering

### Tenant Management
- Complete tenant profiles with contact information
- ID/Passport verification tracking
- Emergency contact information
- Tenant status management (active/inactive)
- Notes and history for each tenant

### Lease Management
- Create and manage lease agreements
- Link properties to tenants
- Track lease terms (start/end dates)
- Security deposit management
- Utilities tracking (electricity, water, gas, internet)
- Document attachments
- Active/expired lease status

### Payment Tracking
- Monthly rent payment tracking
- Payment status (pending, paid, overdue, partial)
- Multiple payment methods (cash, bank transfer, check, online)
- Late fee calculation
- Receipt generation
- Payment history and analytics

### Dashboard & Analytics
- Property statistics overview
- Tenant and lease summaries
- Monthly payment analytics
- 6-month rent collection trends
- Property type distribution
- Upcoming lease expirations
- Overdue payment alerts

## Technology Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication & authorization
- **bcrypt** - Password hashing
- **Winston** - Structured logging
- **migrate-mongo** - Database migrations

### Frontend
- **HTML5** - Markup
- **TailwindCSS** - Utility-first CSS framework
- **Vanilla JavaScript** - Client-side logic
- **ApexCharts** - Interactive charts

### Development Tools
- **Gulp** - Build automation
- **Prettier** - Code formatting
- **MongoDB Memory Server** - In-memory database for development
- **nodemon** - Auto-restart development server

## Prerequisites

- **Node.js** (v16 or higher)
- **npm** (v7 or higher)
- **MongoDB** (optional - uses MongoDB Memory Server for local dev)

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/alexkourtis98/home-system.git
cd home-system
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
```bash
cp .env.example .env
```

Edit the `.env` file and configure your settings:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=                    # Leave empty to use MongoDB Memory Server
JWT_SECRET=your-secret-key-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_EMAIL=admin@home-system.com
```

### 4. Seed the database (optional)
```bash
npm run seed
```

### 5. Start the development server
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Usage

### Default Admin Credentials
- **Username:** admin
- **Password:** admin123

**IMPORTANT:** Change these credentials in production!

### Available Scripts

```bash
# Start production server
npm start

# Start development server with auto-reload
npm run dev

# Build production assets
npm run build

# Seed database with sample data
npm run seed

# Clean and reseed database
npm run seed:clean

# Run database migrations
npm run migrate

# Rollback migrations
npm run migrate:down

# Check migration status
npm run migrate:status

# Format code with Prettier
npm run format
```

## API Documentation

### Authentication
```
POST /api/auth/login       - Login with username/password
POST /api/auth/verify      - Verify JWT token
POST /api/auth/logout      - Logout (client-side)
GET  /api/auth/me          - Get current user
POST /api/auth/refresh     - Refresh JWT token
```

### Users (Admin only)
```
GET    /api/users          - Get all users (paginated)
GET    /api/users/:id      - Get single user
POST   /api/users          - Create new user
PUT    /api/users/:id      - Update user
DELETE /api/users/:id      - Delete user
```

### Properties
```
GET    /api/properties     - Get all properties (paginated)
GET    /api/properties/:id - Get single property
POST   /api/properties     - Create new property
PUT    /api/properties/:id - Update property
DELETE /api/properties/:id - Delete property
```

### Tenants
```
GET    /api/tenants        - Get all tenants (paginated)
GET    /api/tenants/:id    - Get single tenant
POST   /api/tenants        - Create new tenant
PUT    /api/tenants/:id    - Update tenant
DELETE /api/tenants/:id    - Delete tenant
```

### Leases
```
GET    /api/leases         - Get all leases (paginated)
GET    /api/leases/:id     - Get single lease
POST   /api/leases         - Create new lease
PUT    /api/leases/:id     - Update lease
DELETE /api/leases/:id     - Delete lease
```

### Payments
```
GET    /api/payments       - Get all payments (paginated)
GET    /api/payments/:id   - Get single payment
POST   /api/payments       - Create new payment
PUT    /api/payments/:id   - Update payment
DELETE /api/payments/:id   - Delete payment
```

### Dashboard
```
GET /api/dashboard         - Get comprehensive dashboard statistics
```

All protected routes require JWT authentication via Bearer token in the Authorization header.

## User Roles

The system supports 5 user roles with hierarchical permissions:

| Role | Level | Description |
|------|-------|-------------|
| `tenant` | 1 | Property tenant with limited access |
| `accountant` | 2 | Financial data access |
| `manager` | 3 | Property management access |
| `landlord` | 4 | Property owner access |
| `admin` | 5 | Full system access |

## Security Features

- JWT-based authentication
- bcrypt password hashing (salt rounds: 10)
- Input sanitization (XSS prevention)
- NoSQL injection prevention
- HTTP security headers (Helmet)
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Request size limiting (10MB)
- Account lockout after failed attempts
- Structured logging with Winston

## Deployment

### Production Checklist

- [ ] Change default admin credentials
- [ ] Set strong JWT_SECRET in production .env
- [ ] Configure production MongoDB URI
- [ ] Enable HTTPS/SSL
- [ ] Set NODE_ENV=production
- [ ] Configure proper CORS origins
- [ ] Review and adjust rate limits
- [ ] Set up proper logging
- [ ] Configure backup strategy
- [ ] Set up monitoring and alerts

### Environment Variables (Production)

```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://your-production-db:27017/home-system
JWT_SECRET=your-very-strong-random-secret
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-secure-password
ADMIN_EMAIL=admin@yourdomain.com
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under MIT. See [LICENSE](LICENSE) for details.

## Support

For issues, questions, or contributions, please open an issue on GitHub.

## Acknowledgments

- Icons by [Feather Icons](https://feathericons.com/)
- Charts by [ApexCharts](https://apexcharts.com/)

---

**Built with care by the HomeSystem Team**
