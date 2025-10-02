import { createServerWallet, sponsorGasOnCelo } from "./Utils/Thirdweb";

async function main() {
  try {
    // Example identifier: use a stable unique string (user id/email)
    const res = await sponsorGasOnCelo("user123", "0x4821ced48Fb4456055c86E42587f61c1F39c6315","10000000000000");
    console.log(res);
  } catch (err) {
    console.error(err);
  }
}

main();