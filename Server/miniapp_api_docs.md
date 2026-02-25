ChamaPay Miniapp Required Backend Endpoints
This document outlines the backend endpoints that need to be exposed for the ChamaPay miniapp to function correctly, specifically for chat, payouts, and dynamic chama data.

1. Chat Endpoints
Get Messages
URL: GET /chama/:chamaId/messages
Auth: Bearer Token
Description: Fetches all messages for a specific Chama.
Response:
json
{
  "success": true,
  "messages": [
    {
      "id": 1,
      "text": "Hello world",
      "sender": "Alice",
      "senderId": 123,
      "timestamp": "2024-03-25T12:00:00Z"
    }
  ]
}
Send Message
URL: POST /chama/send-message
Auth: Bearer Token
Body: { "chamaId": number, "userId": number, "message": string }
Description: Saves a new message to the database for a specific Chama.
2. Payment and Activity Endpoints
Register Payment
URL: POST /miniapp/register-payment
Auth: Bearer Token
Body: { "receiver": string, "amount": string, "description": string, "txHash": string }
Description: Logs a payment transaction (e.g., contribution) in the database.
Get Recent Activity
URL: GET /miniapp/payments/:userId
Auth: Bearer Token
Description: Fetches a list of recent payments and payouts for a user across all Chamas.
3. Dynamic Chama Data
Get Chama by Slug
URL: GET /miniapp/chama/slug/:slug
Auth: Bearer Token (Optional but recommended for user-specific data)
Description: Returns comprehensive details for a Chama, including its members, payout order, and transaction history.
Expected Fields in Response (within the chama object):
payments: User contributions/deposits.
payOuts: Record of payouts made to members.
roundOutcome: Outcome of each round.
userBalance: The current user's balance within this specific Chama.
eachMemberBalance: A mapping of member IDs to their respective balances in the Chama.
4. User and Notification Endpoints
Get User Details
URL: GET /miniapp/user-details
Auth: Bearer Token
Description: Returns all details for the authenticated user, including their join requests, notifications, and total payments.
Get Notifications
URL: GET /miniapp/notifications/:userId
Auth: Bearer Token
Description: Fetches miniapp-specific notifications for a user.