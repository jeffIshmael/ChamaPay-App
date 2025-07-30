// This file contains a function to create the user's wallet
const { ethers } = require("ethers");

// creates a new walllet for a new user
const getWallets = () => {
    const randomWallet = ethers.Wallet.createRandom();
    return randomWallet;
};


module.exports = {getWallets}