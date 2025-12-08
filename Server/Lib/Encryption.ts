// Utils/encryption.ts
import crypto from 'node:crypto';

// Interface for encrypted data structure
interface EncryptedData {
  encrypted: string;
  salt: string;
  iv: string;
  tag: string;
  algorithm: string;
}

// Interface for simple encrypted data (without tag)
interface SimpleEncryptedData {
  encrypted: string;
  salt: string;
  iv: string;
  algorithm: string;
}

// Interface for master key encrypted data
interface MasterKeyEncryptedData {
  encrypted: string;
  iv: string;
  algorithm: string;
}

class EncryptionService {
  private readonly algorithm: string;
  private readonly keyLength: number;
  private readonly ivLength: number;
  private readonly tagLength: number;
  private readonly saltLength: number;

  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.tagLength = 16; // 128 bits
    this.saltLength = 32; // 256 bits
  }

  /**
   * Derives an encryption key from user password using PBKDF2
   * @param password - User's password
   * @param salt - Salt for key derivation
   * @returns Derived key
   */
  private deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha256');
  }

  /**
   * Encrypts sensitive data using user's password
   * @param data - Data to encrypt (private key or mnemonic)
   * @param userPassword - User's password for encryption
   * @returns Encrypted data with metadata
   */
  encrypt(data: string, userPassword: string): EncryptedData {
    try {
      // Generate random salt and IV
      const salt: Buffer = crypto.randomBytes(this.saltLength);
      const iv: Buffer = crypto.randomBytes(this.ivLength);
      
      // Derive key from password
      const key: Buffer = this.deriveKey(userPassword, salt);
      
      // Create cipher using createCipheriv (the correct method)
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      // Set additional authenticated data
      (cipher as any).setAAD(Buffer.from('wallet-data'));
      
      // Encrypt data
      let encrypted: Buffer = cipher.update(data, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      // Get authentication tag (for GCM mode)
      const tag: Buffer = (cipher as any).getAuthTag();
      
      // Combine all components
      const result: EncryptedData = {
        encrypted: encrypted.toString('base64'),
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        algorithm: this.algorithm
      };
      
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Encryption failed: ${errorMessage}`);
    }
  }

  /**
   * Decrypts sensitive data using user's password
   * @param encryptedData - Encrypted data object
   * @param userPassword - User's password for decryption
   * @returns Decrypted data
   */
  decrypt(encryptedData: EncryptedData, userPassword: string): string {
    try {
      const { encrypted, salt, iv, tag, algorithm } = encryptedData;
      
      // Convert from base64
      const encryptedBuffer: Buffer = Buffer.from(encrypted, 'base64');
      const saltBuffer: Buffer = Buffer.from(salt, 'base64');
      const ivBuffer: Buffer = Buffer.from(iv, 'base64');
      const tagBuffer: Buffer = Buffer.from(tag, 'base64');
      
      // Derive key from password
      const key: Buffer = this.deriveKey(userPassword, saltBuffer);
      
      // Create decipher using createDecipheriv (the correct method)
      const decipher = crypto.createDecipheriv(algorithm, key, ivBuffer);
      
      // Set authentication tag (for GCM mode)
      (decipher as any).setAuthTag(tagBuffer);
      
      // Set additional authenticated data
      (decipher as any).setAAD(Buffer.from('wallet-data'));
      
      // Decrypt data
      let decrypted: Buffer = decipher.update(encryptedBuffer);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString('utf8');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Decryption failed: ${errorMessage}`);
    }
  }

  /**
   * Simple encryption using AES-256-CBC (more compatible fallback)
   * @param data - Data to encrypt
   * @param password - Password for encryption
   * @returns Encrypted data
   */
  simpleEncrypt(data: string, password: string): SimpleEncryptedData {
    try {
      const algorithm = 'aes-256-cbc';
      const salt: Buffer = crypto.randomBytes(32);
      const iv: Buffer = crypto.randomBytes(16);
      
      // Derive key
      const key: Buffer = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
      
      // Create cipher
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      
      // Encrypt
      let encrypted: Buffer = cipher.update(data, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      return {
        encrypted: encrypted.toString('base64'),
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
        algorithm
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Simple encryption failed: ${errorMessage}`);
    }
  }

  /**
   * Simple decryption using AES-256-CBC
   * @param encryptedData - Encrypted data
   * @param password - Password for decryption
   * @returns Decrypted data
   */
  simpleDecrypt(encryptedData: SimpleEncryptedData, password: string): string {
    try {
      const { encrypted, salt, iv, algorithm } = encryptedData;
      
      // Convert from base64
      const encryptedBuffer: Buffer = Buffer.from(encrypted, 'base64');
      const saltBuffer: Buffer = Buffer.from(salt, 'base64');
      const ivBuffer: Buffer = Buffer.from(iv, 'base64');
      
      // Derive key
      const key: Buffer = crypto.pbkdf2Sync(password, saltBuffer, 10000, 32, 'sha256');
      
      // Create decipher
      const decipher = crypto.createDecipheriv(algorithm, key, ivBuffer);
      
      // Decrypt
      let decrypted: Buffer = decipher.update(encryptedBuffer);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString('utf8');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Simple decryption failed: ${errorMessage}`);
    }
  }

  /**
   * Encrypts data with a master key (for server-side encryption)
   * @param data - Data to encrypt
   * @returns Encrypted data
   */
  encryptWithMasterKey(data: string): MasterKeyEncryptedData {
    try {
      const masterKey: string | undefined = process.env.ENCRYPTION_MASTER_KEY;
      if (!masterKey || masterKey.length !== 64) { // 32 bytes = 64 hex chars
        throw new Error('Invalid or missing ENCRYPTION_MASTER_KEY');
      }
      
      const algorithm = 'aes-256-cbc';
      const key: Buffer = Buffer.from(masterKey, 'hex');
      const iv: Buffer = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      
      // Encrypt
      let encrypted: Buffer = cipher.update(data, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      return {
        encrypted: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        algorithm
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Master key encryption failed: ${errorMessage}`);
    }
  }

  /**
   * Decrypts data with master key
   * @param encryptedData - Encrypted data object
   * @returns Decrypted data
   */
  decryptWithMasterKey(encryptedData: MasterKeyEncryptedData): string {
    try {
      const masterKey: string | undefined = process.env.ENCRYPTION_MASTER_KEY;
      if (!masterKey) {
        throw new Error('Missing ENCRYPTION_MASTER_KEY');
      }
      
      const { encrypted, iv, algorithm } = encryptedData;
      const key: Buffer = Buffer.from(masterKey, 'hex');
      const ivBuffer: Buffer = Buffer.from(iv, 'base64');
      const encryptedBuffer: Buffer = Buffer.from(encrypted, 'base64');
      
      // Create decipher
      const decipher = crypto.createDecipheriv(algorithm, key, ivBuffer);
      
      // Decrypt
      let decrypted: Buffer = decipher.update(encryptedBuffer);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString('utf8');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Master key decryption failed: ${errorMessage}`);
    }
  }

  /**
   * Generates a secure master key
   * @returns Hex encoded master key
   */
  generateMasterKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Test the encryption/decryption functionality
   * @param testData - Data to test with
   * @param password - Password to test with
   * @returns Whether test passed
   */
  testEncryption(testData: string = 'test-wallet-data', password: string = 'test-password-123'): boolean {
    try {
      console.log('Testing encryption/decryption...');
      
      // Test simple encryption first
      const encrypted: SimpleEncryptedData = this.simpleEncrypt(testData, password);
      console.log('Encryption successful:', encrypted);
      
      const decrypted: string = this.simpleDecrypt(encrypted, password);
      console.log('Decryption successful:', decrypted);
      
      const success: boolean = decrypted === testData;
      console.log('Test result:', success ? 'PASSED' : 'FAILED');
      
      return success;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Test failed:', errorMessage);
      return false;
    }
  }
}

export default new EncryptionService(); 