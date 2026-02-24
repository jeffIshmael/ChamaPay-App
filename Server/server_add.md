# Backend API Endpoints Specification

The following endpoints are required for the ChamaPay miniapp to function with the new service layer.

## Authentication & User
### GET `/user/address/:address`
- **Method**: GET
- **Description**: Fetch user details by wallet address.
- **Response**: `User` object or 404.

### GET `/user/notifications/:userId`
- **Method**: GET
- **Description**: Fetch notifications for a specific user.
- **Response**: Array of `Notification` objects.

### GET `/chama/pending-requests/:userId`
- **Method**: GET
- **Description**: Fetch pending join requests for chamas managed by the user.
- **Response**: Array of `JoinRequest` objects.

### GET `/miniapp/user-details`
- **Method**: GET
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Fetch comprehensive user details including notifications and requests.
- **Response**: `{ success: true, user: { ... } }`

## Chama Management
### GET `/chama/slug/:slug`
- **Method**: GET
- **Query Params**: `address` (optional)
- **Headers**: `Authorization: Bearer <token>` (optional)
- **Description**: Fetch chama details by slug. Returns member status and admin wallet if `address` is provided.
- **Response**: `{ success: true, chama: { ... }, isMember: boolean, adminWallet: string }`

### GET `/chama/check-request/:address/:chamaId`
- **Method**: GET
- **Headers**: `Authorization: Bearer <token>` (optional)
- **Description**: Check if a specific address has a pending join request for a chama.
- **Response**: `boolean` or `{ exists: boolean }`

### POST `/miniapp/confirm-request`
- **Method**: POST
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ requestId, decision: 'approve' | 'reject', userId, chamaId, canJoin }`
- **Description**: Approve or reject a join request.

### POST `/miniapp/join-chama`
- **Method**: POST
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ chamaId, amount, txHash }`
- **Description**: Join a public chama after on-chain transaction.

### POST `/miniapp/send-request`
- **Method**: POST
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**: `chamaId`
- **Body**: `{ address }`
- **Description**: Send a join request for a private chama.
