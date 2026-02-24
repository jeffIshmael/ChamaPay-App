# ChamaPay Miniapp Integration Guide

This document outlines the authentication flow and the exposed endpoints for the ChamaPay miniapp. The miniapp handles blockchain transactions on the frontend, while the server provides endpoints for database synchronization (Prisma).

## Base URL
The server is running at: `http://localhost:3000`

---

## 1. Authentication

The miniapp uses wallet-based authentication. All authentication routes are prefixed with `/auth`.

### Register Miniapp User
Use this to create a new user profile associated with a wallet address and a Farcaster ID (FID).

- **URL:** `/auth/miniapp/register`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "username": "string",
    "walletAddress": "0x...",
    "profileImageUrl": "string (optional)",
    "fid": number (optional)
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "token": "JWT_ACCESS_TOKEN",
    "refreshToken": "JWT_REFRESH_TOKEN",
    "user": { ... }
  }
  ```

### Login Miniapp User
Use this to authenticate an existing user by verifying a cryptographic signature.

- **URL:** `/auth/miniapp/login`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "walletAddress": "0x...",
    "signature": "0x...",
    "message": "The message that was signed"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "token": "JWT_ACCESS_TOKEN",
    "refreshToken": "JWT_REFRESH_TOKEN"
  }
  ```

---

## 2. Miniapp Endpoints (Prisma-Only)

These endpoints are prefixed with `/miniapp` and require the `Authorization: Bearer <token>` header.

### Create Chama
Records a Chama in the database after it has been created on-chain.
- **URL:** `/miniapp/create-chama`
- **Method:** `POST`
- **Body:** Same as standard create chama + `blockchainId`.

### Join Chama
Records a user as a member and registers the collateral payment after the on-chain join transaction is successful.
- **URL:** `/miniapp/join-chama`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "chamaId": number,
    "amount": "string",
    "txHash": "0x..."
  }
  ```

### Confirm Join Request
Admin endpoint to approve/reject a join request for a private Chama.
- **URL:** `/miniapp/confirm-request`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "requestId": number,
    "decision": "approve" | "reject"
  }
  ```

### Search & Discovery
- **Get User's Chamas:** `GET /miniapp/user-chamas`
- **Get Public Chamas:** `GET /miniapp/public-chamas`
- **Get User Details:** `GET /miniapp/user-details`

### Requests & Payments
- **Send Join Request:** `POST /miniapp/send-request?chamaId=ID`
- **Register Payment:** `POST /miniapp/register-payment` (Body: `receiver`, `amount`, `description`, `txHash`)

---

## 3. Important Notes
- **JWT Authentication:** All `/miniapp/*` routes require a valid JWT token in the `Authorization` header.
- **Frontend Responsibility:** The frontend must ensure that the blockchain transaction is confirmed before calling these endpoints to keep the database in sync.
