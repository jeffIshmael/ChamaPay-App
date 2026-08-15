require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { createWalletClient, http, publicActions } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { base } = require('viem/chains');
const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    this.saltLength = 32;
  }
  deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha256');
  }
  decrypt(encryptedData, userPassword) {
    const { encrypted, salt, iv, tag, algorithm } = encryptedData;
    const encryptedBuffer = Buffer.from(encrypted, 'base64');
    const saltBuffer = Buffer.from(salt, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');
    const tagBuffer = Buffer.from(tag, 'base64');
    const key = this.deriveKey(userPassword, saltBuffer);
    const decipher = crypto.createDecipheriv(algorithm, key, ivBuffer);
    decipher.setAuthTag(tagBuffer);
    decipher.setAAD(Buffer.from('wallet-data'));
    let decrypted = decipher.update(encryptedBuffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  }
}

const Encryption = new EncryptionService();
const abi = require('./Blockchain/chamaPay.json');
const prisma = new PrismaClient();
const secret = process.env.ENCRYPTION_SECRET;

async function run() {
  const user = await prisma.user.findFirst({ where: { userName: "mint" }});
  const decodedStr = Buffer.from(user.hashedPrivkey, 'base64').toString('utf8');
  const encryptedData = JSON.parse(decodedStr);
  const decryptionKey = crypto.createHash("sha256").update(secret).digest("hex");
  let privateKey = Encryption.decrypt(encryptedData, decryptionKey);
  if (!privateKey.startsWith('0x')) privateKey = '0x' + privateKey;
  
  const account = privateKeyToAccount(privateKey);
  const client = createWalletClient({
    account,
    chain: base,
    transport: http()
  }).extend(publicActions);

  console.log("Admin address:", account.address);
  
  const hash = await client.writeContract({
    address: '0xf89c1312d9a92d84f2bfbf870089c29a09bc638a',
    abi,
    functionName: 'updateChamaDetails',
    args: [
      5n,
      7576000n,
      2n,
      1n,
      1786690800n,
      30n
    ]
  });
  
  console.log("Tx sent:", hash);
  const receipt = await client.waitForTransactionReceipt({ hash });
  console.log("Tx confirmed:", receipt.status);
}

run().catch(console.error).finally(() => prisma.$disconnect());
