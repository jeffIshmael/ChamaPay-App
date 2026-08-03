// SPDX-License-Identifier: MIT
// -----------------------------------------------------------------------------
// MIGRATION ADDITION FOR ChamaPay.sol
// -----------------------------------------------------------------------------
// I don't have your actual ChamaPay.sol source, so the field names below
// (members, balances, hasSent, lockedAmounts, payoutOrder, admin, chamas,
// chamaCount) are based on what you described in the migration doc. You will
// need to adapt the exact storage layout to match your real contract before
// this compiles. The IMPORTANT parts to keep regardless of your exact struct
// layout are:
//
//   1. `migrationComplete` flag that PERMANENTLY disables migrateUser once set
//   2. Ownership-proof signature check (new address must prove it controls
//      itself before old-address data gets pointed at it)
//   3. `hasMigrated` guard so no address can be migrated twice
//   4. Events for a full audit trail
//
// Add this as a new implementation via your existing UUPS upgrade path.
// -----------------------------------------------------------------------------

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/*
   Paste the following into ChamaPay.sol (inside the existing contract body).
*/

// ---- New storage (append — do NOT reorder existing storage slots in a UUPS upgrade) ----

/// @notice Once true, migrateUser can never be called again. Permanent kill-switch.
bool public migrationComplete;

/// @notice Prevents a given old address from being migrated more than once.
mapping(address => bool) public hasMigrated;

event UserMigrated(address indexed oldAddress, address indexed newAddress, uint256 timestamp);
event MigrationFinalized(uint256 timestamp);

modifier migrationActive() {
    require(!migrationComplete, "ChamaPay: migration window closed");
    _;
}

/**
 * @notice One-time migration of a user's on-chain identity from `oldAddress`
 *         to `newAddress` (e.g. moving from a raw-EOA custody model to a
 *         CDP-managed wallet). Requires the NEW address to have signed a
 *         message proving it consents to receiving `oldAddress`'s data —
 *         this stops the function from being usable to redirect funds to
 *         an address the user never controlled, even if the owner key
 *         were compromised during the migration window.
 *
 * @param oldAddress the user's existing (soon to be retired) address
 * @param newAddress the user's new CDP-managed address
 * @param newAddressSignature signature over a fixed message, produced by
 *        `newAddress`, proving it consents to this migration
 */
function migrateUser(
    address oldAddress,
    address newAddress,
    bytes calldata newAddressSignature
) external onlyOwner migrationActive {
    require(oldAddress != address(0) && newAddress != address(0), "ChamaPay: zero address");
    require(oldAddress != newAddress, "ChamaPay: same address");
    require(!hasMigrated[oldAddress], "ChamaPay: already migrated");

    // --- Ownership proof: newAddress must have signed a commitment message ---
    // Message format is deliberately scoped to (this contract, oldAddress) so
    // a signature can't be replayed against a different contract or a
    // different user's migration.
    bytes32 messageHash = keccak256(
        abi.encodePacked("ChamaPay Migration v1:", address(this), oldAddress)
    );
    bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
    address recovered = ECDSA.recover(ethSignedMessageHash, newAddressSignature);
    require(recovered == newAddress, "ChamaPay: new address did not authorize migration");

    // --- Walk every chama and move this user's data over ---
    // NOTE: adapt this loop/struct access to your real `chamas` storage layout.
    for (uint256 i = 0; i < chamaCount; i++) {
        Chama storage chama = chamas[i];

        if (chama.members[oldAddress]) {
            chama.members[oldAddress] = false;
            chama.members[newAddress] = true;
        }

        if (chama.balances[oldAddress] > 0) {
            chama.balances[newAddress] += chama.balances[oldAddress];
            chama.balances[oldAddress] = 0;
        }

        chama.hasSent[newAddress] = chama.hasSent[oldAddress];
        delete chama.hasSent[oldAddress];

        chama.lockedAmounts[newAddress] = chama.lockedAmounts[oldAddress];
        delete chama.lockedAmounts[oldAddress];

        for (uint256 j = 0; j < chama.payoutOrder.length; j++) {
            if (chama.payoutOrder[j] == oldAddress) {
                chama.payoutOrder[j] = newAddress;
            }
        }

        if (chama.admin == oldAddress) {
            chama.admin = newAddress;
        }
    }

    hasMigrated[oldAddress] = true;
    emit UserMigrated(oldAddress, newAddress, block.timestamp);
}

/**
 * @notice Permanently disables migrateUser. Call this once, after every
 *         user has been migrated and verified. This is what turns the
 *         migration tool from "standing admin power" into "one-time hatch
 *         that no longer exists."
 */
function finalizeMigration() external onlyOwner {
    migrationComplete = true;
    emit MigrationFinalized(block.timestamp);
}

// -----------------------------------------------------------------------------
// RECOMMENDED (not code, process):
// - Deploy this upgrade, run the FULL migration on Base Sepolia against a
//   forked/cloned copy of your real chama state (including the active,
//   in-progress chama), not just a fresh test chama.
// - Owner key that can call migrateUser/finalizeMigration should be a
//   multisig (even a 2-of-3 with you + co-founder + a hardware key) for
//   the duration of the migration window, not a single EOA.
// - Call finalizeMigration() in the SAME deployment/maintenance window as
//   the last migrateUser call — don't leave the window open longer than
//   necessary.
// -----------------------------------------------------------------------------
