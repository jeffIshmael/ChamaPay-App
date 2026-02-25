# Miniapp API Documentation

These endpoints are specifically exposed for the ChamaPay Miniapp.

## Authentication
All endpoints require a valid JWT token in the `Authorization` header (`Bearer <token>`). The user's wallet address and other details are derived from this token.

---

## Chama Endpoints

### Get Chama by Slug
Returns comprehensive details for a specific Chama.

- **URL**: `/miniapp/chama/slug/:slug`
- **Method**: `GET`
- **Query Params**:
  - `address` (optional): The user's wallet address to fetch their specific balance in this Chama.
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "success": true,
      "chama": {
        "id": 1,
        "name": "Wealth Circle",
        "slug": "wealth-circle",
        "description": "...",
        "members": [...],
        "payments": [...],
        "messages": [...],
        "payOuts": [...],
        "admin": {
          "id": 5,
          "smartAddress": "0x...",
          "userName": "AdminUser",
          "profileImageUrl": "..."
        },
        "userBalance": "150.5",
        "eachMemberBalance": { "0x...": "50.0", ... }
      },
      "isMember": true,
      "adminWallet": "0x..."
    }
    ```

---

## User & Activity Endpoints

### Get User Notifications
Fetches the latest notifications for the user.

- **URL**: `/miniapp/notifications/:userId`
- **Method**: `GET`
- **Success Response**:
  - **Code**: 200
  - **Content**: `Notification[]` (Array of notifications with Chama and User details included)

### Get Recent Payments & Payouts
Fetches a chronological list of recent financial activity (both payments made and payouts received).

- **URL**: `/miniapp/payments/:userId`
- **Method**: `GET`
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    [
      {
        "id": 10,
        "amount": "100.0",
        "type": "payment",
        "doneAt": "2024-05-20T10:00:00Z",
        "chama": { "name": "Wealth Circle", "slug": "wealth-circle" }
      },
      {
        "id": 5,
        "amount": "500.0",
        "type": "payout",
        "doneAt": "2024-05-18T15:30:00Z",
        "chama": { "name": "Wealth Circle", "slug": "wealth-circle" }
      }
    ]
    ```

### Get User Details
Fetches comprehensive user details including pending requests.

- **URL**: `/miniapp/user-details`
- **Method**: `GET`
- **Success Response**:
  - **Code**: 200
  - **Content**: Same as mobile app's `/user/details` but tailored for miniapp view.
