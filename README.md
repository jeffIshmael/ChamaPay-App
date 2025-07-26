# ChamaPay Mobile App

A decentralized mobile application that digitizes traditional African "chama" savings groups (ROSCAs - Rotating Savings and Credit Associations) using blockchain technology on the Celo network.

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

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator
- Google Cloud Console account (for Google Sign-In)
- Celo wallet for testing

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/jeffIshmael/chamapay-minipay.git
   cd chamapay-mobile
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Install Expo CLI globally**
   ```bash
   npm install -g expo-cli
   # or
   yarn global add expo-cli
   ```

### Environment Configuration

1. **Create environment file**

   ```bash
   cp .env.example .env
   ```

2. **Configure environment variables**

   ```bash
   # .env
   EXPO_PUBLIC_CELO_RPC_URL=https://alfajores-forno.celo-testnet.org
   EXPO_PUBLIC_SMART_CONTRACT_ADDRESS=0x9Ac9977Ce606089fcABBfb311eE5FCf2Bf789481
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
   EXPO_PUBLIC_API_BASE_URL=https://your-backend-api.com
   EXPO_PUBLIC_NETWORK=alfajores
   ```

3. **Google Sign-In Setup**
   - Create a project in [Google Cloud Console](https://console.cloud.google.com)
   - Enable Google+ API
   - Create OAuth 2.0 credentials for mobile app
   - Add the client ID to your environment variables

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
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── common/          # Generic components
│   │   ├── chama/           # Chama-specific components
│   │   └── forms/           # Form components
│   ├── screens/             # App screens
│   │   ├── auth/            # Authentication screens
│   │   ├── chama/           # Chama-related screens
│   │   ├── chat/            # Chat functionality
│   │   └── profile/         # User profile screens
│   ├── services/            # API and blockchain services
│   │   ├── api.js           # REST API calls
│   │   ├── blockchain.js    # Celo blockchain interactions
│   │   └── wallet.js        # Wallet management
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   ├── constants/           # App constants
│   ├── navigation/          # Navigation configuration
│   └── store/               # State management (Redux/Context)
├── assets/                  # Images, fonts, icons
├── app.json                 # Expo configuration
├── package.json
└── README.md
```

## 🔧 Key Dependencies

```json
{
  "@expo/vector-icons": "^13.0.0",
  "@react-navigation/native": "^6.1.0",
  "@react-navigation/stack": "^6.3.0",
  "@celo/contractkit": "^5.0.0",
  "expo": "~49.0.0",
  "expo-auth-session": "~5.0.0",
  "expo-crypto": "~12.4.0",
  "expo-secure-store": "~12.3.0",
  "react": "18.2.0",
  "react-native": "0.72.0",
  "react-native-elements": "^3.4.0",
  "react-native-gifted-chat": "^2.4.0",
  "react-native-paper": "^5.10.0"
}
```

## 🔐 Authentication Flow

1. **Google Sign-In**: Users authenticate using Google OAuth
2. **Smart Wallet Creation**: App automatically generates a Celo wallet
3. **Secure Storage**: Wallet credentials stored in device secure storage
4. **Session Management**: JWT tokens for API authentication

## 💼 Core Functionality

### Chama Management

```javascript
// Create a new chama
const createChama = async (chamaData) => {
  const contract = await getChamaContract();
  const tx = await contract.createChama(
    chamaData.contributionAmount,
    chamaData.members,
    chamaData.payoutInterval
  );
  return tx;
};
```

### Blockchain Integration

```javascript
// Connect to Celo network
import { newKit } from "@celo/contractkit";

const kit = newKit(process.env.EXPO_PUBLIC_CELO_RPC_URL);
```

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

## 🧪 Testing

### Running Tests

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e
```

### Test Structure

- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API and blockchain interaction testing
- **E2E Tests**: Complete user flow testing

## 🚀 Deployment

### Building for Production

1. **Configure app for production**

   ```bash
   expo build:android
   expo build:ios
   ```

2. **Generate standalone apps**

   ```bash
   # Android APK
   expo build:android -t apk

   # iOS IPA
   expo build:ios -t archive
   ```

### App Store Deployment

1. **Google Play Store**
   - Build signed APK/AAB
   - Upload to Google Play Console
   - Configure store listing

2. **Apple App Store**
   - Build IPA file
   - Upload via Xcode or Application Loader
   - Configure App Store Connect

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
- [ChamaPay Web Platform](https://github.com/jeffIshmael/chamapay-minipay)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow React Native best practices
- Use TypeScript for type safety
- Write unit tests for new features
- Follow the established code style
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Lead Developer**: [Jeff Ishmael](https://github.com/jeffIshmael)
- **Contributors**: See [CONTRIBUTORS.md](CONTRIBUTORS.md)

## 🙏 Acknowledgments

- Celo Foundation for blockchain infrastructure
- Expo team for the development platform
- African communities for the traditional chama system inspiration

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/jeffIshmael/chamapay-minipay/issues)
- **Email**: support@chamapay.com
- **Discord**: [ChamaPay Community](https://discord.gg/chamapay)

---

**Built with ❤️ for the global African diaspora and savings communities worldwide.**
