# ChamaPay Mobile App

A decentralized mobile application that digitizes savings groups (ROSCAs - Rotating Savings and Credit Associations) using blockchain technology on the Celo network.

## 📱 Overview

ChamaPay transforms community-based circular savings by leveraging smart contracts, cUSD stablecoin, and automated fund management. Users can create or join savings groups where members contribute fixed amounts regularly and receive payouts in rotating turns.

### Key Features

- 🏦 **Create & Join Chamas**: Public and private savings groups with customizable parameters
- 💰 **Automated Contributions**: Schedule and track regular cUSD contributions
- 🔄 **Rotational Payouts**: Smart contract-managed fund distribution
- 💬 **Group Chat**: In-app messaging for chama members
- 📊 **Payout Order**: Clear visualization of rotation schedule
- 🔐 **Google Sign-In**: Secure authentication with automatic smart wallet creation
- 📱 **Mobile Money**: M-Pesa integration (planned)
- 🌐 **Blockchain Transparency**: All transactions recorded on Celo network

## 🚀 Getting Started

### Prerequisites

- Node.js
- npm
- iOS or Android Device
- Google Cloud Console account (for Google Sign-In)
- Celo wallet for testing

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/jeffIshmael/chamapay-app.git
   cd chamapay-mobile
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

### Running the App

1. **Start the development server**

   ```bash
   npx expo start
   ```

2. **Run on device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on physical device

## 🏗️ Project Structure

```
chamapay-mobile/
├── app/
├── assets/                  # Images, fonts, icons
├── components/              # Reusable UI elements
├── constants/               
├── hooks/               
├── lib/               
├── app.json                 # Expo configuration
├── package.json
└── README.md
```

## 🔐 Authentication Flow

1. **Google Sign-In**: Users authenticate using Google OAuth
2. **Smart Wallet Creation**: App automatically generates a Celo wallet
3. **Secure Storage**: Wallet credentials stored in device secure storage
4. **Session Management**: JWT tokens for API authentication

### Payment Processing

- **cUSD Contributions**: Direct blockchain transactions
- **M-Pesa Integration**: Future implementation for mobile money
- **Automated Payouts**: Smart contract-managed distributions

## 📱 Screen Structure

### Authentication Screens

- **Welcome**: App introduction and chama concept explanation
- **Google Sign-In**: Authentication interface
- **Wallet Setup**: Smart wallet creation and explanation

### Main App Screens

- **Home Dashboard**: Overview of user's chamas and activities
- **Chama Discovery**: Browse and join public chamas
- **Create Chama**: Step-by-step chama creation flow
- **Chama Details**: Individual chama information and management
- **Chat**: Group messaging for chama members
- **Payout Order**: Visual rotation schedule
- **Transactions**: Complete transaction history
- **Profile**: User settings and account management

## 🔒 Security Considerations

- **Private Key Management**: Secure storage using Expo SecureStore
- **API Security**: JWT token authentication
- **Smart Contract Security**: Audited contracts on Celo network
- **Data Encryption**: Sensitive data encrypted at rest and in transit

## 🐛 Troubleshooting

### Common Issues

1. **Metro bundler issues**

   ```bash
   npx expo start --clear
   ```

2. **iOS simulator not working**

   ```bash
   xcrun simctl erase all
   ```

3. **Android build failures**
   - Check Java version compatibility
   - Ensure Android SDK is properly configured

## 📚 Documentation

- [Expo Documentation](https://docs.expo.dev)
- [Celo Documentation](https://docs.celo.org)
- [React Navigation](https://reactnavigation.org)

### Development Guidelines

- Follow React Native best practices
- Use TypeScript for type safety
- Write unit tests for new features
- Follow the established code style
- Update documentation as needed

<!-- eas build --profile preview --platform android -->

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/jeffIshmael/chamapay-app/issues)
- **Email**: support@chamapay.com
- **Discord**: [ChamaPay Community](https://discord.gg/chamapay)
