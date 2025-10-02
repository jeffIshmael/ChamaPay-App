# ChamaPay Platform

End-to-end platform digitizing ROSCAs (chamas) with a mobile app, backend API, and smart contracts on Celo.

## Overview

- **Mobile (Expo/React Native)**: User app for creating/joining chamas, contributions, payouts, chat
- **Server (Node/Express/Prisma)**: Auth, wallet encryption/management, user/chama APIs
- **Smart Contracts (Hardhat/Solidity)**: On-chain funds, rotation and payouts

### Key Links

- Mobile app: `Application/`
- Server API: `Server/`
- Contracts: `hardhat/`

## Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- iOS/Android toolchain (Xcode / Android SDK) for running the app
- Git

### Clone

```bash
git clone https://github.com/jeffIshmael/ChamaPay-App
cd ChamaPay-App
```

## Mobile App (Application/)

React Native app built with Expo Router and Tailwind (NativeWind).

### Install

```bash
cd Application
npm install
```

### Environment

Create `.env` with Thirdweb client credentials used by `constants/thirdweb.ts`:

```bash
EXPO_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id
EXPO_PUBLIC_THIRDWEB_SECRET_KEY=your_secret_key
```

Server base URL configured in `constants/serverUrl.ts`:

```ts
export const serverUrl = "https://4cef61e85418.ngrok-free.app";
```

Smart Contracts used by the app are defined in `constants/contractAddress.ts`:

```ts
export const chamapayContractAddress = "0x458d8a85e446fedA31c8049f68a84F94bBC0F553";
export const usdcAddress = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
export const cUSDAddress = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
```

### Run

```bash
npx expo start         # Expo dev server
# or
npx expo prebuild
npx expo run:ios             # iOS simulator (requires Xcode)
npx expo run:android         # Android emulator
```

## Server API (Server/)

TypeScript Express server with Prisma ORM.

### Install

```bash
cd Server
npm install
```

### Environment

Create `.env` (see `Server/README.md` for full list). Example essentials:

```bash
PORT=3000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
JWT_SECRET=your_super_secure_jwt_secret_key_here
ENCRYPTION_MASTER_KEY=your_64_character_hex_string_master_key_here
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@chamapay.com
GOOGLE_CLIENT_ID=your-google-client-id
```

### Database

```bash
npx prisma generate
npx prisma migrate dev
# optional
npm run db:seed
```

### Run

```bash
npm run dev:watch   # development with reload
# or
npm run dev

# production
npm run build && npm start
```

### Scripts

| Command | Where | Description |
|---|---|---|
| `npm run dev:watch` | Server | Start with nodemon + ts-node |
| `npm run build` | Server | Compile TypeScript |
| `npm start` | Server | Run compiled server |
| `npm run db:reset` | Server | Reset and seed database |
| `npm run start` | Application | Expo dev server |
| `npm run ios` | Application | iOS simulator |
| `npm run android` | Application | Android emulator |

## Smart Contracts (hardhat/)

Hardhat workspace for Solidity contracts (ChamaPay on Celo).

### Install & Use

```bash
cd hardhat
npm install

npx hardhat help
npx hardhat test
npx hardhat node
# deploy sample (update network/plugins as needed)
npx hardhat ignition deploy ./ignition/modules/Lock.js
```

Contract address used in the app: see `Application/constants/contractAddress.ts`.

## Monorepo Structure

```
ChamaPay-App/
├── Application/         # Expo React Native app
├── Server/              # Node/Express/Prisma API
└── hardhat/             # Solidity contracts + Hardhat
```

## Development Notes

- Mobile uses React 19, React Native 0.79, Expo ~53, and Thirdweb SDK
- Server uses Prisma 6, Express 4, Ethers 6, JWT, Nodemailer
- Contracts use OpenZeppelin 5.x and Hardhat 2.23+

## Security

- Never commit secrets. Use `.env` files locally and secure secrets in CI/CD
- Wallet mnemonics and private keys are encrypted server-side
- JWTs are used for API auth; use HTTPS in production

## Troubleshooting

- Expo cache: `npx expo start --clear`
- iOS simulator issues: `xcrun simctl erase all`
- Prisma issues: `npx prisma generate` then `npx prisma migrate reset`
- Port conflicts: `lsof -i :3000` then kill the process

## License

See individual package licenses. Server is ISC per its `package.json`.


