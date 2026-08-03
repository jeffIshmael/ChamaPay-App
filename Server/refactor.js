const fs = require('fs');
const glob = require('glob');
const path = require('path');

const serverDir = path.join(process.cwd(), 'Server');
const files = glob.sync('Controllers/**/*.ts', { cwd: serverDir }).map(f => path.join(serverDir, f));
files.push(path.join(serverDir, 'Lib/send.ts'));
files.push(path.join(serverDir, 'Blockchain/erc20Functions.ts'));

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    
    content = content.replace(/user\.hashedPrivkey as `0x\$\{string\}`/g, "user.cdpWalletId");
    content = content.replace(/callerUserForDeposit\.hashedPrivkey as `0x\$\{string\}`/g, "callerUserForDeposit.cdpWalletId");
    content = content.replace(/adminUser\.hashedPrivkey as `0x\$\{string\}`/g, "adminUser.cdpWalletId");
    
    content = content.replace(/const privKeyData = await getPrivateKey\(Number\(userId\)\);\n\s+if \(!privKeyData\.success \|\| !privKeyData\.privateKey\) \{\n\s+return res\.status\(400\)\.json\(\{ success: false, error: "Unable to get user private key\." \}\);\n\s+\}\n\n\s+\/\/ Call the blockchain function\n\s+const txHash = await bcUpdateChamaDetails\(\n\s+privKeyData\.privateKey,/g, `if (!user.cdpWalletId) {\n      return res.status(400).json({ success: false, error: "Unable to get user CDP wallet." });\n    }\n\n    // Call the blockchain function\n    const txHash = await bcUpdateChamaDetails(\n      user.cdpWalletId,`);

    if (file.includes('erc20Functions.ts')) {
        content = content.replace(/cdpAddress: string/g, "cdpWalletId: string");
        content = content.replace(/createEIP7702SmartAccount\(cdpAddress\)/g, "createEIP7702SmartAccount(cdpWalletId)");
        content = content.replace(/export const approveTx = async \(privateKey: `0x\$\{string\}`/g, "export const approveTx = async (cdpWalletId: string");
        content = content.replace(/createEIP7702SmartAccount\(privateKey\)/g, "createEIP7702SmartAccount(cdpWalletId)");
    }
    
    fs.writeFileSync(file, content);
});
console.log('Refactoring complete');
