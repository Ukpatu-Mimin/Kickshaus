# Kickshaus – Premium Footwear E-Commerce

Kickshaus is a sophisticated, full-stack e-commerce platform specializing in premium Nigerian-crafted footwear. It blends luxury aesthetics with modern technology, featuring a robust TypeScript backend, a multi-role management system, and integrated fiat/crypto payment solutions.

## ✨ Features

- **Responsive & Elegant UI**: Mobile-first design using Playfair Display and Poppins typography.
- **Dual Payment Gateways**:
  - **Paystack**: Secure fiat payments (NGN) with webhook-driven verification.
  - **Solana**: Web3 integration for cryptocurrency payments (SOL) with real-time price conversion via CoinGecko.
- **Multi-Role Dashboards**:
  - **Customer**: Order history, favorites, and profile management.
  - **Merchant**: Product management, real-time stock tracking, and sales analytics.
  - **Admin**: System-wide overview, user management, and comprehensive order processing.
- **Authentication System**:
  - Secure JWT-based authentication.
  - Social Auth integration (Google & Facebook).
  - Password reset functionality via SMTP.
- **Dynamic Shopping Experience**:
  - Real-time cart and favorites management.
  - Advanced product filtering and collection views.
  - Automated order confirmation emails.
- **Performance Optimized**: Dark/Light mode persistence, optimized asset loading, and structured API clients.

## 🛠️ Tech Stack

### Frontend
- **HTML5 / CSS3**: Custom styling with luxury design principles.
- **Vanilla JavaScript**: Lightweight, high-performance interactions (no heavy frameworks).
- **Chart.js**: Interactive analytics for merchant and admin dashboards.
- **Font Awesome**: Professional iconography.

### Backend
- **Node.js & Express**: High-performance RESTful API.
- **TypeScript**: Type-safe development for robustness.
- **Supabase (PostgreSQL)**: Scalable database and storage.
- **Passport.js**: Multi-strategy authentication (JWT, Local, Social).
- **Nodemailer**: Production-ready email delivery.
- **Web3.js**: Interaction with the Solana blockchain.

### DevOps & Tools
- **Docker**: Containerized environment for consistent deployment.
- **GitHub CLI**: Integrated workflow management.
- **Git**: Version control with push protection for secrets.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Docker (optional, for containerized setup)
- Supabase Project

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/dev-Basscee/Kickshaus.git
   cd Kickshaus
   ```

2. **Setup Backend**:
   ```bash
   cd backend
   cp .env.example .env
   # Update .env with your credentials (Supabase, Paystack, Solana, etc.)
   npm install
   npm run build
   ```

3. **Run Migrations**:
   ```bash
   npm run migrate
   ```

4. **Start the Application**:
   ```bash
   # From the root directory
   docker-compose up -d  # Using Docker
   # OR
   cd backend && npm run dev  # Local development
   ```

## 🏗️ Project Structure

- `/` : Frontend HTML templates.
- `/public` : Static assets (CSS, JS, Images).
- `/backend` : TypeScript source code, API routes, and services.
- `/backend/src/db` : Database migrations and schema definitions.

## 📄 License

This project is licensed under the MIT License.