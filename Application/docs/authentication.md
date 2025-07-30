# ChamaPay Authentication System

## Overview

ChamaPay uses a centralized authentication system built with React Context API that provides persistent user sessions, automatic token management, and easy access to user data throughout the application.

## Architecture

### Components

1. **AuthContext** (`contexts/AuthContext.tsx`) - Global state management
2. **Storage Utility** (`utils/storage.ts`) - Secure data persistence
3. **Authentication Flow** - Automatic routing based on auth state

## How It Works

### 1. Authentication Context

The `AuthContext` provides global state management for user authentication:

```typescript
interface AuthContextType {
  user: User | null;           // Current user data
  token: string | null;        // JWT token
  isLoading: boolean;          // Loading state
  isAuthenticated: boolean;    // Authentication status
  login: (email: string, password: string) => Promise<{success: boolean; error?: string}>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}
```

### 2. User Interface

```typescript
export interface User {
  id: number;
  email: string;
  name: string | null;
  phoneNo: number | null;
  address: string;
  role: string | null;
  profile: string | null;
}
```

## Usage

### Getting User Data

```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  return (
    <View>
      <Text>Welcome, {user?.name || user?.email}!</Text>
      <Text>Wallet Address: {user?.address}</Text>
    </View>
  );
}
```

### Authentication Actions

```typescript
import { useAuth } from '@/contexts/AuthContext';

function AuthComponent() {
  const { login, logout, updateUser } = useAuth();

  const handleLogin = async () => {
    const result = await login(email, password);
    if (result.success) {
      // Login successful
      router.replace('/(tabs)');
    } else {
      // Show error
      setError(result.error);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/auth-screen');
  };

  const updateProfile = () => {
    updateUser({ name: 'New Name' });
  };
}
```

## Authentication Flow

### 1. App Initialization

```typescript
// app/index.tsx
export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    const handleInitialRoute = async () => {
      if (isLoading) return;

      const hasSeenOnboarding = await storage.getHasSeenOnboarding();
      
      if (!hasSeenOnboarding) {
        router.replace("/onboarding");
      } else if (isAuthenticated) {
        router.replace("/(tabs)");
      } else {
        router.replace("/auth-screen");
      }
    };

    handleInitialRoute();
  }, [isLoading, isAuthenticated]);
}
```

### 2. Session Persistence

The system automatically:
- Saves tokens and user data to secure storage
- Loads saved data on app startup
- Validates tokens with the server
- Clears invalid sessions

### 3. Token Management

```typescript
// Automatic token validation
const fetchUserData = async (authToken: string) => {
  const response = await fetch(`${serverUrl}/user`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.ok) {
    const data = await response.json();
    setUser(data.user);
  } else {
    // Invalid token - clear session
    await logout();
  }
};
```

## API Integration

### Backend Requirements

Your server must provide these endpoints:

1. **Login Endpoint** (`POST /auth/login`)
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "address": "0x...",
    "role": "user"
  }
}
```

2. **User Data Endpoint** (`GET /user`)
Headers:
```
Authorization: Bearer jwt_token_here
```

Response:
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "address": "0x...",
    "role": "user"
  }
}
```

## Protected Routes

### Using Authentication Guards

```typescript
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

function ProtectedScreen() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth-screen');
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return <YourProtectedContent />;
}
```

## Making Authenticated API Calls

```typescript
import { useAuth } from '@/contexts/AuthContext';

function useApiCall() {
  const { token } = useAuth();

  const makeAuthenticatedRequest = async (url: string, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token expired, logout user
      await logout();
      router.replace('/auth-screen');
      return null;
    }

    return response.json();
  };

  return { makeAuthenticatedRequest };
}
```

## Storage Management

### Available Storage Functions

```typescript
import { storage } from '@/utils/storage';

// Token management
await storage.setToken(token);
const token = await storage.getToken();
await storage.removeToken();

// User data
await storage.setUser(userData);
const user = await storage.getUser();
await storage.removeUser();

// Onboarding state
await storage.setHasSeenOnboarding(true);
const hasSeenOnboarding = await storage.getHasSeenOnboarding();

// Clear all data
await storage.clearAll();
```

## Error Handling

### Network Errors

```typescript
const { login } = useAuth();

try {
  const result = await login(email, password);
  if (!result.success) {
    setError(result.error || 'Login failed');
  }
} catch (error) {
  setError('Network error. Please try again.');
}
```

### Token Expiration

The system automatically handles token expiration by:
1. Detecting 401 responses from the server
2. Clearing invalid tokens
3. Redirecting to the auth screen

## Best Practices

### 1. Always Check Authentication State

```typescript
const { isAuthenticated, isLoading } = useAuth();

if (isLoading) {
  return <LoadingSpinner />;
}

if (!isAuthenticated) {
  return <LoginPrompt />;
}

// Render authenticated content
```

### 2. Use Proper Loading States

```typescript
const [loading, setLoading] = useState(false);
const { login } = useAuth();

const handleLogin = async () => {
  setLoading(true);
  try {
    const result = await login(email, password);
    // Handle result
  } finally {
    setLoading(false);
  }
};
```

### 3. Handle Errors Gracefully

```typescript
const [error, setError] = useState('');

const handleLogin = async () => {
  setError('');
  const result = await login(email, password);
  if (!result.success) {
    setError(result.error || 'Login failed');
  }
};
```

## Debugging

### Common Issues

1. **"useAuth must be used within an AuthProvider"**
   - Ensure your component is wrapped in `<AuthProvider>`
   - Check that `AuthProvider` is in your root layout

2. **User data not loading**
   - Check server endpoint is working
   - Verify token is being sent correctly
   - Check network connectivity

3. **Session not persisting**
   - Verify AsyncStorage permissions
   - Check for storage errors in console

### Debug Logging

```typescript
// Add to AuthContext for debugging
console.log('Auth state:', { user, token, isAuthenticated, isLoading });
```

## Security Considerations

1. **Token Storage**: Tokens are stored in AsyncStorage (secure on device)
2. **Token Validation**: Automatic validation with server
3. **Session Cleanup**: Invalid sessions are automatically cleared
4. **Network Security**: Always use HTTPS in production

## Migration from Old System

If migrating from the old AsyncStorage approach:

1. Remove direct AsyncStorage usage
2. Replace with `useAuth()` hook
3. Update API calls to use context token
4. Remove manual token validation logic

```typescript
// OLD
const token = await AsyncStorage.getItem('token');

// NEW
const { token } = useAuth();
```

## Testing

### Mock AuthContext for Tests

```typescript
const mockAuthContext = {
  user: { id: 1, email: 'test@example.com', name: 'Test User' },
  token: 'mock-token',
  isLoading: false,
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
  updateUser: jest.fn(),
  refreshUser: jest.fn(),
};

// Wrap test components
<AuthContext.Provider value={mockAuthContext}>
  <YourComponent />
</AuthContext.Provider>
``` 