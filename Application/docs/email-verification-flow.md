# Email Verification Flow Documentation

## Overview

ChamaPay now uses email verification with OTP (One-Time Password) before user registration. This ensures email validity and prevents spam registrations while maintaining the unique wallet address constraint.

## New Registration Flow

### 1. User Registration Request
- User fills signup form (email, username, password)
- App calls `/auth/request-registration`
- Server creates `PendingUser` record
- 6-digit OTP is generated and sent to email
- User is redirected to OTP verification screen

### 2. Email Verification
- User receives email with 6-digit OTP
- User enters OTP in verification screen
- App calls `/auth/verify-email` with OTP
- On success: Wallet is created and user is registered
- On failure: Error shown, can retry or resend OTP

### 3. Login
- After successful verification, user is redirected to login screen
- Email is pre-filled for convenience
- User enters password and logs in normally

## API Endpoints

### POST /auth/request-registration
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "userName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification code sent to your email",
  "pendingUserId": 123,
  "email": "user@example.com"
}
```

### POST /auth/verify-email
**Request:**
```json
{
  "pendingUserId": 123,
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration completed successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "address": "0x..."
  }
}
```

### POST /auth/resend-otp
**Request:**
```json
{
  "pendingUserId": 123
}
```

**Response:**
```json
{
  "success": true,
  "message": "New verification code sent to your email"
}
```

## Database Changes

### New Models

#### PendingUser
- Temporary storage for users awaiting verification
- Auto-expires after 24 hours
- Links to EmailVerification

#### EmailVerification
- Stores OTP and verification attempts
- OTP expires after 10 minutes
- Max 5 attempts before requiring new OTP

## Frontend Components

### OTPVerification Screen
- 6-digit OTP input with auto-focus
- 10-minute countdown timer
- Resend functionality with cooldown
- Error handling and user feedback

### Updated AuthScreen
- No more alerts - uses inline messages
- Handles success messages from OTP verification
- Pre-fills email after verification

## Security Features

- **Email Validation**: Ensures valid email before wallet creation
- **Spam Prevention**: Requires email verification
- **Unique Addresses**: Maintains wallet address uniqueness
- **Auto Expiry**: Pending users expire after 24 hours
- **Rate Limiting**: Max 5 OTP attempts, 10-minute expiry
- **Secure Storage**: Encrypted wallet data as before

## Email Configuration

Add to your `.env` file:
```env
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@chamapay.com
APP_URL=http://localhost:8082
```

For Gmail:
1. Enable 2FA on your Google account
2. Generate an App Password
3. Use the App Password as EMAIL_PASSWORD

## Error Handling

- Invalid OTP: Clear form, allow retry
- Expired OTP: Show resend option
- Too many attempts: Force new registration
- Email send failure: Show error, allow retry
- Network errors: Show generic error message

## Testing

1. **Registration Flow**:
   - Fill signup form → Should navigate to OTP screen
   - Check email for OTP code
   - Enter correct OTP → Should redirect to login
   - Enter incorrect OTP → Should show error

2. **OTP Expiry**:
   - Wait 10 minutes → OTP should expire
   - Try expired OTP → Should show error
   - Click resend → Should get new OTP

3. **Resend Functionality**:
   - Click resend before timer expires → Should be disabled
   - Wait for timer → Resend should be enabled
   - Click resend → Should get new OTP and reset timer

## Migration Notes

- Existing users are unaffected
- New registrations require email verification
- PendingUser records auto-cleanup expired entries
- Backward compatible with existing login flow
