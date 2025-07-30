// Utils/encryption.js
const crypto = require('node:crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.tagLength = 16; // 128 bits
    this.saltLength = 32; // 256 bits
  }

  /**
   * Derives an encryption key from user password using PBKDF2
   * @param {string} password - User's password
   * @param {Buffer} salt - Salt for key derivation
   * @returns {Buffer} - Derived key
   */
  deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha256');
  }

  /**
   * Encrypts sensitive data using user's password
   * @param {string} data - Data to encrypt (private key or mnemonic)
   * @param {string} userPassword - User's password for encryption
   * @returns {object} - Encrypted data with metadata
   */
  encrypt(data, userPassword) {
    try {
      // Generate random salt and IV
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);
      
      // Derive key from password
      const key = this.deriveKey(userPassword, salt);
      
      // Create cipher using createCipheriv (the correct method)
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      // Set additional authenticated data
      cipher.setAAD(Buffer.from('wallet-data'));
      
      // Encrypt data
      let encrypted = cipher.update(data, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      // Get authentication tag (for GCM mode)
      const tag = cipher.getAuthTag();
      
      // Combine all components
      const result = {
        encrypted: encrypted.toString('base64'),
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        algorithm: this.algorithm
      };
      
      return result;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypts sensitive data using user's password
   * @param {object} encryptedData - Encrypted data object
   * @param {string} userPassword - User's password for decryption
   * @returns {string} - Decrypted data
   */
  decrypt(encryptedData, userPassword) {
    try {
      const { encrypted, salt, iv, tag, algorithm } = encryptedData;
      
      // Convert from base64
      const encryptedBuffer = Buffer.from(encrypted, 'base64');
      const saltBuffer = Buffer.from(salt, 'base64');
      const ivBuffer = Buffer.from(iv, 'base64');
      const tagBuffer = Buffer.from(tag, 'base64');
      
      // Derive key from password
      const key = this.deriveKey(userPassword, saltBuffer);
      
      // Create decipher using createDecipheriv (the correct method)
      const decipher = crypto.createDecipheriv(algorithm, key, ivBuffer);
      
      // Set authentication tag (for GCM mode)
      decipher.setAuthTag(tagBuffer);
      
      // Set additional authenticated data
      decipher.setAAD(Buffer.from('wallet-data'));
      
      // Decrypt data
      let decrypted = decipher.update(encryptedBuffer);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Simple encryption using AES-256-CBC (more compatible fallback)
   * @param {string} data - Data to encrypt
   * @param {string} password - Password for encryption
   * @returns {object} - Encrypted data
   */
  simpleEncrypt(data, password) {
    try {
      const algorithm = 'aes-256-cbc';
      const salt = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);
      
      // Derive key
      const key = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
      
      // Create cipher
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      
      // Encrypt
      let encrypted = cipher.update(data, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      return {
        encrypted: encrypted.toString('base64'),
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
        algorithm
      };
    } catch (error) {
      throw new Error(`Simple encryption failed: ${error.message}`);
    }
  }

  /**
   * Simple decryption using AES-256-CBC
   * @param {object} encryptedData - Encrypted data
   * @param {string} password - Password for decryption
   * @returns {string} - Decrypted data
   */
  simpleDecrypt(encryptedData, password) {
    try {
      const { encrypted, salt, iv, algorithm } = encryptedData;
      
      // Convert from base64
      const encryptedBuffer = Buffer.from(encrypted, 'base64');
      const saltBuffer = Buffer.from(salt, 'base64');
      const ivBuffer = Buffer.from(iv, 'base64');
      
      // Derive key
      const key = crypto.pbkdf2Sync(password, saltBuffer, 10000, 32, 'sha256');
      
      // Create decipher
      const decipher = crypto.createDecipheriv(algorithm, key, ivBuffer);
      
      // Decrypt
      let decrypted = decipher.update(encryptedBuffer);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error(`Simple decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypts data with a master key (for server-side encryption)
   * @param {string} data - Data to encrypt
   * @returns {object} - Encrypted data
   */
  encryptWithMasterKey(data) {
    try {
      const masterKey = process.env.ENCRYPTION_MASTER_KEY;
      if (!masterKey || masterKey.length !== 64) { // 32 bytes = 64 hex chars
        throw new Error('Invalid or missing ENCRYPTION_MASTER_KEY');
      }
      
      const algorithm = 'aes-256-cbc';
      const key = Buffer.from(masterKey, 'hex');
      const iv = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      
      // Encrypt
      let encrypted = cipher.update(data, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      return {
        encrypted: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        algorithm
      };
    } catch (error) {
      throw new Error(`Master key encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypts data with master key
   * @param {object} encryptedData - Encrypted data object
   * @returns {string} - Decrypted data
   */
  decryptWithMasterKey(encryptedData) {
    try {
      const masterKey = process.env.ENCRYPTION_MASTER_KEY;
      if (!masterKey) {
        throw new Error('Missing ENCRYPTION_MASTER_KEY');
      }
      
      const { encrypted, iv, algorithm } = encryptedData;
      const key = Buffer.from(masterKey, 'hex');
      const ivBuffer = Buffer.from(iv, 'base64');
      const encryptedBuffer = Buffer.from(encrypted, 'base64');
      
      // Create decipher
      const decipher = crypto.createDecipheriv(algorithm, key, ivBuffer);
      
      // Decrypt
      let decrypted = decipher.update(encryptedBuffer);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error(`Master key decryption failed: ${error.message}`);
    }
  }

  /**
   * Generates a secure master key
   * @returns {string} - Hex encoded master key
   */
  generateMasterKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Test the encryption/decryption functionality
   * @param {string} testData - Data to test with
   * @param {string} password - Password to test with
   * @returns {boolean} - Whether test passed
   */
  testEncryption(testData = 'test-wallet-data', password = 'test-password-123') {
    try {
      console.log('Testing encryption/decryption...');
      
      // Test simple encryption first
      const encrypted = this.simpleEncrypt(testData, password);
      console.log('Encryption successful:', encrypted);
      
      const decrypted = this.simpleDecrypt(encrypted, password);
      console.log('Decryption successful:', decrypted);
      
      const success = decrypted === testData;
      console.log('Test result:', success ? 'PASSED' : 'FAILED');
      
      return success;
    } catch (error) {
      console.error('Test failed:', error.message);
      return false;
    }
  }
}

module.exports = new EncryptionService();