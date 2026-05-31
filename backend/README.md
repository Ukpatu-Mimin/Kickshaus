# Kickshaus API

Production-ready REST API for the Kickshaus e-commerce platform, built with Express.js, TypeScript, Supabase, and Solana Pay.

## Features

- **Multi-role Authentication**: User, Merchant, and Admin roles with JWT-based authentication
- **Product Management**: CRUD operations with admin approval workflow
- **Zero-Trust Cart Validation**: Server-side price calculation, never trusting client data
- **Solana Pay Integration**: Exclusive cryptocurrency payment gateway
- **Database Transactions**: Atomic operations for stock management
- **Security**: Helmet, CORS, Rate Limiting, Input Validation with Zod

## Tech Stack

- **Runtime**: Node.js (Latest LTS)
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT
- **Blockchain**: Solana Pay (@solana/pay, @solana/web3.js)
- **Validation**: Zod
- **Security**: Helmet, CORS, express-rate-limit

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Solana wallet (for receiving payments)

## Installation

1. Clone the repository and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies (npm or pnpm):
   ```bash
   npm install
   # or
   pnpm install
   ```

3. Copy the environment example file:
   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env` (full list):
   ```env
   # Server
   PORT=3000
   NODE_ENV=development

   # Supabase
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # JWT
   JWT_SECRET=your_jwt_secret_key_min_32_chars
   JWT_EXPIRES_IN=24h

   # Solana
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   PLATFORM_WALLET_ADDRESS=your_platform_wallet_public_key
   SOLANA_PAY_ICON_URL=https://yoursite.com/icon.png

    # CoinGecko
    COINGECKO_API_URL=https://api.coingecko.com/api/v3

    # Exchange Rate (1 USD = NGN_USD_RATE NGN)
    NGN_USD_RATE=1600

    # Frontend Redirection URLs
    FRONTEND_SUCCESS_URL=http://localhost:3001/payment-success
    FRONTEND_CANCEL_URL=http://localhost:3001/payment-cancelled

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100

   # CORS
   CORS_ORIGIN=http://localhost:3001

    # OAuth (optional)
    GOOGLE_CLIENT_ID=
    GOOGLE_CLIENT_SECRET=
    FACEBOOK_APP_ID=
    FACEBOOK_APP_SECRET=
    SOCIAL_CALLBACK_URL=http://localhost:3000/api/auth
    FRONTEND_URL=http://localhost:3000
   ```

5. Run the database migrations in your Supabase SQL editor (in order):
   - Execute `src/db/migrations/001_initial_schema.sql`
   - Execute `src/db/migrations/002_add_social_auth.sql`
   - Execute `src/db/migrations/003_add_delivery_details.sql`
   
   Notes:
   - `confirm_order(p_order_id UUID, p_transaction_signature VARCHAR)` RPC is created by `001_initial_schema.sql`.
   - Ensure Row Level Security policies are configured appropriately for your tables.

6. Start the development server (use a free port if 3000 is busy):
   ```bash
   # default
   npm run dev
   # or
   pnpm run dev
   # alternative port
   PORT=3001 npm run dev
   ```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register a new customer | No |
| POST | `/api/auth/login` | Login (customer/admin) | No |
| GET | `/api/auth/me` | Get current user profile | Yes |

### Merchants

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/merchants/register` | Register merchant (pending) | No |
| POST | `/api/merchants/login` | Login merchant | No |
| GET | `/api/merchants/products` | Get merchant's products | Merchant |
| POST | `/api/merchants/products` | Create product | Merchant |
| PUT | `/api/merchants/products/:id` | Update product | Merchant |
| DELETE | `/api/merchants/products/:id` | Delete product | Merchant |

### Products (Public)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/products` | List live products | No |
| GET | `/api/products/:id` | Get product details | No |

### Admin

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/admin/merchants` | List all merchants | Admin |
| PUT | `/api/admin/merchants/:id/approve` | Approve merchant | Admin |
| PUT | `/api/admin/merchants/:id/reject` | Reject merchant | Admin |
| GET | `/api/admin/products/pending` | List pending products | Admin |
| PUT | `/api/admin/products/:id/approve` | Approve product | Admin |
| PUT | `/api/admin/products/:id/reject` | Reject product | Admin |

### Cart

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/cart/validate` | Validate cart items | No |

### Payment (Solana Pay)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/payment/sol-price` | Get current SOL price | No |
| POST | `/api/payment/create-order` | Create order with Solana Pay | Yes |
| GET | `/api/payment/verify` | Verify payment status | Yes |

### Orders

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/orders` | Get user's orders | Yes |
| GET | `/api/orders/:id` | Get order details | Yes |

## Database Schema

### Users
- `id` (UUID) - Primary key
- `email` (VARCHAR) - Unique email
- `password_hash` (VARCHAR) - Hashed password
- `role` (VARCHAR) - 'customer' or 'admin'
- `created_at`, `updated_at` (TIMESTAMP)

### Merchants
- `id` (UUID) - Primary key
- `business_name` (VARCHAR) - Business name
- `email` (VARCHAR) - Unique email
- `phone` (VARCHAR) - Phone number
- `password_hash` (VARCHAR) - Hashed password
- `status` (VARCHAR) - 'pending', 'approved', or 'rejected'
- `wallet_address` (VARCHAR) - Solana wallet for payments
- `created_at`, `updated_at` (TIMESTAMP)

### Products
- `id` (UUID) - Primary key
- `merchant_id` (UUID) - Foreign key to merchants
- `name`, `description`, `category` (VARCHAR/TEXT)
- `base_price` (DECIMAL) - Price in fiat
- `stock` (INTEGER) - Available quantity
- `images` (JSONB) - { main, top, left, right }
- `status` (VARCHAR) - 'pending_approval', 'live', or 'rejected'
- `solana_price` (DECIMAL) - Optional static SOL price
- `created_at`, `updated_at` (TIMESTAMP)

### Orders
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to users
- `total_amount_fiat`, `total_amount_sol` (DECIMAL)
- `payment_status` (VARCHAR) - 'pending', 'confirmed', 'failed'
- `fulfillment_status` (VARCHAR)
- `transaction_signature` (VARCHAR) - Solana tx hash
- `reference_key` (VARCHAR) - Unique payment reference
- `expires_at` (TIMESTAMP) - Payment expiration
- `created_at`, `updated_at` (TIMESTAMP)

### Order Items
- `id` (UUID) - Primary key
- `order_id`, `product_id` (UUID) - Foreign keys
- `quantity` (INTEGER)
- `price_at_purchase` (DECIMAL)

## Solana Pay Flow

1. **Create Order**: Client sends cart items to `/api/payment/create-order`
2. **Server Validates**: Re-fetches prices from DB (zero-trust)
3. **Convert to SOL**: Fetches live SOL price from CoinGecko
4. **Generate Reference**: Creates unique reference key for transaction
5. **Create Pending Order**: Stores order in database
6. **Return Solana Pay URL**: Client displays QR code
7. **User Pays**: Scans QR with Solana wallet
8. **Verify Payment**: Client polls `/api/payment/verify`
9. **Confirm Order**: Server validates transaction on Solana blockchain
10. **Decrement Stock**: Atomic database transaction

## Scripts

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm start

# Lint
npm run lint

# Test
npm test
```

## Security Considerations

1. **Zero-Trust Validation**: Never trust client-provided prices
2. **Atomic Transactions**: Stock decrements use database functions
3. **Rate Limiting**: Prevents abuse and DDoS
4. **Input Validation**: All inputs validated with Zod
5. **JWT Expiration**: Tokens expire after 24 hours
6. **Password Hashing**: Uses PBKDF2 with salt

## Production Deployment

1. Use a reliable Solana RPC provider (Helius, QuickNode)
2. Enable Row Level Security (RLS) in Supabase
3. Apply all migrations (001–003) in your production database
4. Set `PLATFORM_WALLET_ADDRESS` to your receiving wallet and verify it
5. Set `CORS_ORIGIN` to your deployed frontend domain
6. Set up proper logging and monitoring
7. Configure SSL/TLS for all connections
8. Use a reverse proxy (nginx) in front of Node.js

### Serving the Frontend
- The backend serves static frontend files from the repository root; deploying the server will also serve `index.html` and related pages.
- For separate hosting, point your static host to the repo root and configure `FRONTEND_URL` accordingly.

## License

ISC
