// the creation of wallet
import { ethers } from "ethers";

export async function createUserWallet(){
    const wallet = await ethers.Wallet.createRandom();
    return wallet;
}
