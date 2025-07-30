# Encryption Documentation - ChamaPay Server

## Overview

ChamaPay implements a multi-layered encryption system to protect sensitive user data, particularly cryptocurrency wallet private keys and mnemonic phrases. The encryption service uses industry-standard algorithms and best practices to ensure the highest level of security.

## Architecture

The encryption system is built around the `EncryptionService` class located in `Utils/Encryption.js`, which provides multiple encryption methods for different use cases:

1. **User Password-Based Encryption** (Primary method)
2. **Simple Encryption** (Fallback method)  
3. **Master Key Encryption** (Server-side encryption)

## Security Algorithms

### Primary Encryption: AES-256-GCM

**Algorithm**: `aes-256-gcm` (Advanced Encryption Standard with Galois/Counter Mode)

**Key Features**:
- **256-bit encryption key** - Maximum security level
- **Authenticated encryption** - Provides both confidentiality and authenticity
- **128-bit IV (Initialization Vector)** - Ensures encryption uniqueness
- **128-bit authentication tag** - Prevents tampering
- **Additional Authenticated Data (AAD)** - Extra layer of authentication

**Use Case**: Encrypting wallet private keys and mnemonic phrases

### Fallback Encryption: AES-256-CBC

**Algorithm**: `aes-256-cbc` (Advanced Encryption Standard with Cipher Block Chaining)

**Key Features**:
- **256-bit encryption key** - High security level
- **128-bit IV** - Ensures encryption uniqueness
- **Simpler implementation** - Better compatibility

**Use Case**: Fallback option and simple data encryption

## Key Derivation

### PBKDF2 (Password-Based Key Derivation Function 2)

The system uses PBKDF2 with the following parameters:

```javascript
// Primary encryption
crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256')

// Simple encryption  
crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256')
```

**Parameters**:
- **Hash Function**: SHA-256
- **Iterations**: 100,000 (primary) / 10,000 (simple)
- **Key Length**: 32 bytes (256 bits)
- **Salt Length**: 32 bytes (256 bits)

**Security Benefits**:
- **Slow computation** - Makes brute force attacks impractical
- **Unique salts** - Prevents rainbow table attacks
- **SHA-256 hashing** - Cryptographically secure hash function

## Encryption Methods

### 1. Primary Encryption (`encrypt` / `decrypt`)

**Purpose**: Maximum security for critical data (private keys, mnemonics)

**Process**:
```javascript
// Encryption
const result = encryptionService.encrypt(privateKey, userPassword);
// Returns: { encrypted, salt, iv, tag, algorithm }

// Decryption  
const decrypted = encryptionService.decrypt(result, userPassword);
```

**Security Features**:
- AES-256-GCM with authentication
- 100,000 PBKDF2 iterations
- Additional Authenticated Data (AAD): `'wallet-data'`
- Random salt and IV generation
- Authentication tag verification

### 2. Simple Encryption (`simpleEncrypt` / `simpleDecrypt`)

**Purpose**: Compatible fallback for less critical data

**Process**:
```javascript
// Encryption
const result = encryptionService.simpleEncrypt(data, password);
// Returns: { encrypted, salt, iv, algorithm }

// Decryption
const decrypted = encryptionService.simpleDecrypt(result, password);
```

**Security Features**:
- AES-256-CBC encryption
- 10,000 PBKDF2 iterations
- Random salt and IV generation

### 3. Master Key Encryption (`encryptWithMasterKey` / `decryptWithMasterKey`)

**Purpose**: Server-side encryption using environment-based master key

**Process**:
```javascript
// Encryption
const result = encryptionService.encryptWithMasterKey(data);
// Returns: { encrypted, iv, algorithm }

// Decryption
const decrypted = encryptionService.decryptWithMasterKey(result);
```

**Security Features**:
- Uses `ENCRYPTION_MASTER_KEY` environment variable
- 32-byte (256-bit) master key
- AES-256-CBC encryption
- No password derivation needed

## Data Flow Security

### User Registration/Login Flow

1. **User Password**: Never stored in plaintext
2. **Private Key Generation**: Generated client-side or server-side
3. **Encryption**: Private key encrypted with user password
4. **Storage**: Only encrypted data stored in database
5. **Retrieval**: Encrypted data decrypted only with correct password

### Wallet Data Protection

```javascript
// Example: Storing encrypted wallet data
const walletData = {
  privateKey: "0x1234567890abcdef...",
  mnemonic: "word1 word2 word3 ..."
};

// Encrypt private key
const encryptedPrivKey = encryptionService.encrypt(
  walletData.privateKey, 
  userPassword
);

// Encrypt mnemonic
const encryptedMnemonic = encryptionService.encrypt(
  walletData.mnemonic, 
  userPassword
);

// Store in database
await prisma.user.create({
  data: {
    // ... other fields
    privKey: JSON.stringify(encryptedPrivKey),
    mnemonics: JSON.stringify(encryptedMnemonic)
  }
});
```

## Security Best Practices Implemented

### 1. **Never Store Plaintext Passwords**
- User passwords are hashed (not encrypted) for authentication
- Passwords are only used for key derivation, never stored

### 2. **Unique Salts and IVs**
- Every encryption operation uses a new random salt
- Every encryption operation uses a new random IV
- Prevents pattern recognition and replay attacks

### 3. **Strong Key Derivation**
- High iteration counts (100,000) make brute force attacks impractical
- Salt prevents rainbow table attacks
- SHA-256 provides cryptographic security

### 4. **Authenticated Encryption**
- GCM mode provides built-in authentication
- Authentication tags prevent tampering
- AAD provides additional authentication context

### 5. **Error Handling**
- All encryption operations wrapped in try-catch blocks
- Generic error messages prevent information leakage
- Failed operations don't expose sensitive data

## Environment Configuration

### Required Environment Variables

```bash
# Master key for server-side encryption (64 hex characters = 32 bytes)
ENCRYPTION_MASTER_KEY=your_64_character_hex_string_here
```

### Master Key Generation

```javascript
// Generate a new master key
const newMasterKey = encryptionService.generateMasterKey();
console.log('New master key:', newMasterKey);
```

## Testing and Validation

### Built-in Test Function

```javascript
// Test encryption/decryption functionality
const testResult = encryptionService.testEncryption();
console.log('Encryption test:', testResult ? 'PASSED' : 'FAILED');
```

### Test Coverage
- **Encryption/Decryption Roundtrip**: Ensures data integrity
- **Password Validation**: Verifies password-based encryption
- **Error Handling**: Tests various failure scenarios

## Security Considerations

### ✅ Implemented Protections

1. **Brute Force Protection**: High PBKDF2 iterations
2. **Rainbow Table Protection**: Unique random salts
3. **Tampering Protection**: Authentication tags (GCM mode)
4. **Pattern Analysis Protection**: Random IVs
5. **Side-Channel Protection**: Constant-time operations where possible

### ⚠️ Security Notes

1. **Password Strength**: Security depends on user password strength
2. **Memory Security**: Sensitive data should be cleared from memory when possible
3. **Key Management**: Master key must be securely stored and backed up
4. **Network Security**: Always use HTTPS for data transmission

## Performance Considerations

### Encryption Performance
- **GCM Operations**: ~1-5ms per operation
- **PBKDF2 Derivation**: ~100-200ms (intentionally slow)
- **Memory Usage**: Minimal, operations are streaming-capable

### Optimization Tips
- Cache derived keys temporarily for multiple operations
- Use simple encryption for non-critical data
- Consider async operations for UI responsiveness

## Error Handling

### Common Error Scenarios

1. **Invalid Password**: "Decryption failed: bad decrypt"
2. **Missing Master Key**: "Invalid or missing ENCRYPTION_MASTER_KEY"
3. **Corrupted Data**: "Decryption failed: Invalid encrypted data"
4. **Algorithm Mismatch**: "Unsupported algorithm"

### Error Response Strategy
- Generic error messages to prevent information leakage
- Detailed logging for debugging (server-side only)
- Graceful fallback to simple encryption when needed

## Compliance and Standards

### Industry Standards
- **NIST Recommendations**: AES-256, SHA-256, PBKDF2
- **OWASP Guidelines**: Secure key derivation and storage
- **Cryptocurrency Standards**: BIP-39 mnemonic protection

### Audit Trail
- All encryption operations logged (metadata only)
- Key derivation parameters recorded
- Algorithm versions tracked for future migrations

## Future Enhancements

### Planned Improvements
1. **Hardware Security Module (HSM)** integration
2. **Key rotation** mechanisms
3. **Multi-factor encryption** (2FA integration)
4. **Quantum-resistant algorithms** preparation
5. **Client-side encryption** options

---

## Quick Reference

### Basic Usage Example

```javascript
const encryptionService = require('./Utils/Encryption');

// Encrypt sensitive data
const encrypted = encryptionService.encrypt(
  "sensitive-private-key", 
  "user-password-123"
);

// Decrypt when needed
const decrypted = encryptionService.decrypt(
  encrypted, 
  "user-password-123"
);

console.log('Original data recovered:', decrypted);
```

### Security Checklist

- [ ] Strong master key generated and secured
- [ ] Environment variables properly configured
- [ ] User passwords meet complexity requirements
- [ ] HTTPS enabled for all communications
- [ ] Database access properly secured
- [ ] Backup procedures include encrypted data
- [ ] Key rotation schedule established
- [ ] Security testing performed regularly

---

*This documentation covers the current encryption implementation as of the latest version. For updates or security concerns, please refer to the development team.* 