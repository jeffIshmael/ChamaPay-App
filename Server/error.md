the chama data {
  name: 'Test 1',
  description: 'Trying to give',
  type: 'Private',
  adminTerms: '[]',
  amount: '0.076',
  cycleTime: 7,
  maxNo: 4,
  startDate: '2026-04-13T08:54:00.000Z',
  collateralRequired: false
}
Error creating chama: UserOperationExecutionError: Invalid fields set on User Operation.
Request Arguments:
  callData:                       0xb61d27f6000000000000000000000000f89c1312d9a92d84f2bfbf870089c29a09bc638a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c19094eb2600000000000000000000000000000000000000000000000000000000000128e000000000000000000000000000000000000000000000000000000000000000070000000000000000000000000000000000000000000000000000000069dcaf280000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000062635f776269346139346e0b008021802180218021802180218021802100000000000000000000000000000000000000000000000000000000000000
  callGasLimit:                   340220
  maxFeePerGas:                   0.0082225 gwei
  maxPriorityFeePerGas:           0.0011 gwei
  nonce:                          32761123436150365237124354015232
  paymaster:                      0x888888888888Ec68A58AB8094Cc1AD20Ba3D2402
  paymasterData:                  0x01000069db601500000000000056e28943495c3caa4d18ec385c0d525866b5342cc4ead93c160ca907e7d03e3249840e818c9d263f87e17502a3e6a8876e24c846ec404bab5c4dc6d434c736f31b
  paymasterPostOpGasLimit:        1
  paymasterVerificationGasLimit:  35470
  preVerificationGas:             80759
  sender:                         0x4c8C5C4d4954dcCC81733b5b4f4C4Fe7B4733200
  signature:                      0xfcac7c89aadfbde2bc8603ed8911d052439d786f18d70bce2626bd73c2300e11399f18828c23a3d7bf0b754fa3c218a49fb85caabe770cf0fc403f53c4ac907e1b
  verificationGasLimit:           51698
Details: Invalid EIP-7702 authorization: The recovered signer address does not match the userOperation sender address
Version: viem@2.33.2
    at getUserOperationError (/opt/render/project/src/Server/node_modules/viem/_cjs/account-abstraction/utils/errors/getUserOperationError.js:21:12)
Menu
    at sendUserOperation (/opt/render/project/src/Server/node_modules/viem/_cjs/account-abstraction/actions/bundler/sendUserOperation.js:35:68)
    ... 4 lines matching cause stack trace ...
    at async createChama (/opt/render/project/src/Server/dist/Controllers/chamaControllers.js:40:32) {
  cause: InvalidFieldsError: Invalid fields set on User Operation.
  
  Details: Invalid EIP-7702 authorization: The recovered signer address does not match the userOperation sender address