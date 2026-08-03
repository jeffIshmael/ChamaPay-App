const fs = require('fs');
const glob = require('glob');
const path = require('path');

const serverDir = path.join(process.cwd(), 'Server');
const files = glob.sync('Controllers/**/*.ts', { cwd: serverDir }).map(f => path.join(serverDir, f));

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    
    content = content.replace(/!\s*user\.hashedPrivkey/g, "!user.cdpWalletId");
    content = content.replace(/!\s*callerUserForDeposit\.hashedPrivkey/g, "!callerUserForDeposit.cdpWalletId");
    content = content.replace(/!\s*adminUser\.hashedPrivkey/g, "!adminUser.cdpWalletId");
    
    fs.writeFileSync(file, content);
});
console.log('Null checks refactored');
