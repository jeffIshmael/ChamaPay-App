# ChamaPay Server

A secure, TypeScript-based backend server for the ChamaPay digital circular savings platform. Built with Express.js, Prisma ORM, and advanced encryption for cryptocurrency wallet management.

## 🚀 Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd ChamaPay-App/Server

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npx prisma migrate dev

# Start development server with auto-reload
npm run dev:watch
```

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Server](#running-the-server)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## ✨ Features

- **🔐 Advanced Encryption**: AES-256-GCM encryption for wallet private keys and mnemonic phrases
- **🔑 JWT Authentication**: Secure user authentication with JWT tokens
- **📧 Email Verification**: OTP-based email verification system
- **💰 Wallet Management**: Automatic cryptocurrency wallet creation and management
- **🏦 Chama System**: Digital circular savings group management
- **🛡️ Type Safety**: Full TypeScript implementation for enhanced security
- **📊 Database ORM**: Prisma for type-safe database operations
- **🔄 Real-time**: Support for real-time features and notifications

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.x
- **Framework**: Express.js 4.x
- **Database**: SQLite (development) / PostgreSQL (production)
- **ORM**: Prisma 6.x
- **Authentication**: JWT + bcryptjs
- **Encryption**: Node.js Crypto module
- **Email**: Nodemailer
- **Blockchain**: Ethers.js for wallet management
- **Development**: ts-node, nodemon

## 📋 Prerequisites

Before running the server locally, ensure you have:

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **Git** for version control
- **SQLite** (included with Node.js)

### Check Versions

```bash
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 9.0.0
```

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ChamaPay-App/Server
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# Verify TypeScript installation
npx tsc --version
```

### 3. Install Development Tools (Optional)

```bash
# Global TypeScript for easier development
npm install -g typescript ts-node

# Prisma CLI for database management
npm install -g prisma
```

## ⚙️ Environment Configuration

### 1. Create Environment File

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` file with your configuration:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="file:./dev.db"

# JWT Secret (generate a strong secret)
JWT_SECRET=your_super_secure_jwt_secret_key_here

# Email Configuration (Gmail example)
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@chamapay.com

# Encryption Master Key (64 hex characters = 32 bytes)
ENCRYPTION_MASTER_KEY=your_64_character_hex_string_master_key_here

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
```

### 3. Generate Secure Keys

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate Encryption Master Key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🗄️ Database Setup

### 1. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# (Optional) Seed database with sample data
npx prisma db seed
```

### 2. Database Management Commands

```bash
# View database in browser
npx prisma studio

# Reset database (development only)
npx prisma migrate reset

# Deploy migrations (production)
npx prisma migrate deploy
```

## 🚀 Running the Server

### Development Mode

```bash
# Start with auto-reload (recommended)
npm run dev:watch

# Start without auto-reload
npm run dev

# The server will be available at:
# http://localhost:3000
```

### Production Mode

```bash
# Build TypeScript to JavaScript
npm run build

# Start production server
npm start
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run development server (single run) |
| `npm run dev:watch` | Run development server with auto-reload |
| `npm run build` | Build TypeScript to JavaScript |
| `npm start` | Run production server from built files |
| `npm run clean` | Clean build directory |
| `npm test` | Run tests (when implemented) |

## 📚 API Documentation

### Base URL
- Development: `http://localhost:3000`
- Production: `https://your-domain.com`

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/request-registration` | Initiate user registration |
| `POST` | `/auth/verify-email` | Verify email with OTP |
| `POST` | `/auth/resend-otp` | Resend verification OTP |
| `POST` | `/auth/login` | User login |
| `POST` | `/auth/get-mnemonic` | Get wallet mnemonic (protected) |

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/user/` | Get user profile (protected) |
| `PUT` | `/user/profile` | Update user profile (protected) |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server health check |

### Example Requests

#### Register User
```bash
curl -X POST http://localhost:3000/auth/request-registration \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "userName": "John Doe"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

## 👨‍💻 Development

### Project Structure

```
Server/
├── Controllers/          # Route handlers and business logic
│   ├── authController.ts  # Authentication logic
│   └── userController.ts  # User management logic
├── Routes/               # Express route definitions
│   ├── authRoutes.ts     # Authentication routes
│   └── userRoutes.ts     # User routes
├── Middlewares/          # Express middlewares
│   └── authMiddleware.ts # JWT authentication middleware
├── Utils/                # Utility functions
│   ├── Encryption.ts     # Encryption service
│   ├── EmailService.ts   # Email service
│   ├── WalletCreation.ts # Blockchain wallet creation
│   └── GoogleFunctions.ts # Google OAuth utilities
├── prisma/               # Database schema and migrations
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Migration files
├── docs/                 # Documentation
│   └── encryption.md     # Encryption documentation
├── dist/                 # Compiled JavaScript (generated)
├── app.ts               # Express application setup
├── index.ts             # Server entry point
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting (if configured)
- **Interfaces**: Define all data structures
- **Error Handling**: Comprehensive try-catch blocks

### Adding New Features

1. **Create Controller**: Add business logic in `Controllers/`
2. **Define Routes**: Add routes in `Routes/`
3. **Add Middleware**: Create middleware in `Middlewares/` if needed
4. **Update Types**: Define TypeScript interfaces
5. **Test**: Test your endpoints manually or with automated tests

## 🚀 Deployment

### Build for Production

```bash
# Install dependencies
npm ci --only=production

# Build TypeScript
npm run build

# Run database migrations
npx prisma migrate deploy
```

### Environment Variables for Production

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your_production_jwt_secret
ENCRYPTION_MASTER_KEY=your_production_encryption_key
```

### Deployment Platforms

- **Heroku**: Use `Procfile` with `web: npm start`
- **Digital Ocean**: Use App Platform or Droplets
- **AWS**: Use EC2, ECS, or Lambda
- **Vercel**: Use serverless functions
- **Railway**: Direct deployment support

## 🔒 Security

### Security Features

- **🔐 Advanced Encryption**: AES-256-GCM for sensitive data
- **🔑 Secure Authentication**: JWT with secure headers
- **🛡️ Input Validation**: Comprehensive request validation
- **🚫 CORS Protection**: Configurable CORS policies
- **📧 Email Verification**: Mandatory email verification
- **🔄 Password Hashing**: bcryptjs with high salt rounds

### Security Best Practices

1. **Environment Variables**: Never commit secrets to version control
2. **HTTPS**: Always use HTTPS in production
3. **Database Security**: Use connection encryption and access controls
4. **Regular Updates**: Keep dependencies updated
5. **Monitoring**: Implement logging and monitoring

### Encryption Details

See [docs/encryption.md](./docs/encryption.md) for detailed encryption documentation.

## 🐛 Troubleshooting

### Common Issues

#### TypeScript Compilation Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript configuration
npx tsc --noEmit
```

#### Database Connection Issues
```bash
# Reset database
npx prisma migrate reset

# Regenerate Prisma client
npx prisma generate
```

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### Email Service Issues
- Verify EMAIL_USERNAME and EMAIL_PASSWORD
- For Gmail, use App-Specific Passwords
- Check firewall and network settings

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm run dev:watch

# TypeScript verbose compilation
npx tsc --build --verbose
```

### Getting Help

1. **Check Logs**: Server logs provide detailed error information
2. **Database Studio**: Use `npx prisma studio` to inspect data
3. **Health Check**: Visit `/health` endpoint to verify server status
4. **Documentation**: Review the [encryption documentation](./docs/encryption.md)

## 📄 License

This project is licensed under the ISC License - see the package.json file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the [troubleshooting section](#troubleshooting)
- Review the [encryption documentation](./docs/encryption.md)

---

*Built with ❤️ using TypeScript and modern Node.js practices* 