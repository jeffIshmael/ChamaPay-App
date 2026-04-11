Error creating chama: UserOperationExecutionError: The `validateUserOp` function on the Smart Account reverted.
Request Arguments:
  callData:                       0xb61d27f6000000000000000000000000f89c1312d9a92d84f2bfbf870089c29a09bc638a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c19094eb2600000000000000000000000000000000000000000000000000000000000128e000000000000000000000000000000000000000000000000000000000000000070000000000000000000000000000000000000000000000000000000069dafbec0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000062635f776269346139346e0b008021802180218021802180218021802100000000000000000000000000000000000000000000000000000000000000
  callGasLimit:                   0
  maxFeePerGas:                   0.007906928 gwei
  maxPriorityFeePerGas:           0.0011 gwei
  nonce:                          32760415780826044017998173306880
  paymaster:                      0x888888888888Ec68A58AB8094Cc1AD20Ba3D2402
  paymasterData:                  0x01000000000000000000000000cd91f19f0f19ce862d7bec7b7d9b95457145afc6f639c28fd0360f488937bfa41e6eedcd3a46054fd95fcd0e3ef6b0bc0a615c4d975eef55c8a3517257904d5b1c
  paymasterPostOpGasLimit:        1
  paymasterVerificationGasLimit:  0
  preVerificationGas:             0
  sender:                         0x4c8C5C4d4954dcCC81733b5b4f4C4Fe7B4733200
  signature:                      0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c
  verificationGasLimit:           0
Details: UserOperation reverted during simulation with reason: AA23 reverted 0x3c10b94e
Version: viem@2.33.2
    at getUserOperationError (/opt/render/project/src/Server/node_modules/viem/_cjs/account-abstraction/utils/errors/getUserOperationError.js:21:12)
    at estimateUserOperationGas (/opt/render/project/src/Server/node_modules/viem/_cjs/account-abstraction/actions/bundler/estimateUserOperationGas.js:43:68)
    ... 5 lines matching cause stack trace ...
    at async bcCreateChama (/opt/render/project/src/Server/dist/Blockchain/WriteFunction.js:22:22)
    at async createChama (/opt/render/project/src/Server/dist/Controllers/chamaControllers.js:40:32) {
  cause: SmartAccountFunctionRevertedError: The `validateUserOp` function on the Smart Account reverted.
  
  Details: UserOperation reverted during simulation with reason: AA23 reverted 0x3c10b94e
  Version: viem@2.33.2
      at getBundlerError (/opt/render/project/src/Server/node_modules/viem/_cjs/account-abstraction/utils/errors/getBundlerError.js:100:16)
      at /opt/render/project/src/Server/node_modules/viem/_cjs/account-abstraction/utils/errors/getUserOperationError.js:12:64
      at getUserOperationError (/opt/render/project/src/Server/node_modules/viem/_cjs/account-abstraction/utils/errors/getUserOperationError.js:20:7)
      at estimateUserOperationGas (/opt/render/project/src/Server/node_modules/viem/_cjs/account-abstraction/actions/bundler/estimateUserOperationGas.js:43:68)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async prepareUserOperation (/opt/render/project/src/Server/node_modules/viem/_cjs/account-abstraction/actions/bundler/prepareUserOperation.js:221:25)
      at async sendUserOperation (/opt/render/project/src/Server/node_modules/viem/_cjs/account-abstraction/actions/bundler/sendUserOperation.js:16:11)
      at async sendTransaction (/opt/render/project/src/Server/node_modules/permissionless/_cjs/actions/smartAccount/sendTransaction.js:19:22)
      at async writeContract (/opt/render/project/src/Server/node_modules/permissionless/_cjs/actions/smartAccount/writeContract.js:13:18)
      at async bcCreateChama (/opt/render/project/src/Server/dist/Blockchain/WriteFunction.js:22:22) {
    details: 'UserOperation reverted during simulation with reason: AA23 reverted 0x3c10b94e',
    docsPath: undefined,
    metaMessages: undefined,
    shortMessage: 'The `validateUserOp` function on the Smart Account reverted.',
    version: '2.33.2',
    [cause]: RpcRequestError: RPC Request failed.
    
    URL: https://api.pimlico.io/v2/8453/rpc?apikey=pim_SJTeEAXGdKomK1J2bhBiuQ
    Request body: {"method":"eth_estimateUserOperationGas","params":[{"callData":"0xb61d27f6000000000000000000000000f89c1312d9a92d84f2bfbf870089c29a09bc638a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c19094eb2600000000000000000000000000000000000000000000000000000000000128e000000000000000000000000000000000000000000000000000000000000000070000000000000000000000000000000000000000000000000000000069dafbec0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000062635f776269346139346e0b008021802180218021802180218021802100000000000000000000000000000000000000000000000000000000000000","callGasLimit":"0x0","maxFeePerGas":"0x78a670","maxPriorityFeePerGas":"0x10c8e0","nonce":"0x19d7e9ccb070000000000000000","paymaster":"0x888888888888Ec68A58AB8094Cc1AD20Ba3D2402","paymasterData":"0x01000000000000000000000000cd91f19f0f19ce862d7bec7b7d9b95457145afc6f639c28fd0360f488937bfa41e6eedcd3a46054fd95fcd0e3ef6b0bc0a615c4d975eef55c8a3517257904d5b1c","paymasterPostOpGasLimit":"0x1","paymasterVerificationGasLimit":"0x0","preVerificationGas":"0x0","sender":"0x4c8C5C4d4954dcCC81733b5b4f4C4Fe7B4733200","signature":"0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c","verificationGasLimit":"0x0","eip7702Auth":{"address":"0x7702cb554e6bFb442cb743A7dF23154544a7176C","chainId":"0x2105","nonce":"0x0","r":"0xfffffffffffffffffffffffffffffff000000000000000000000000000000000","s":"0x7aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","yParity":"0x01"}},"0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108"]}
    
    Details: UserOperation reverted during simulation with reason: AA23 reverted 0x3c10b94e
    Version: viem@2.33.2
        at request (/opt/render/project/src/Server/node_modules/viem/_cjs/clients/transports/http.js:52:27)
        at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
        at async delay.count.count (/opt/render/project/src/Server/node_modules/viem/_cjs/utils/buildRequest.js:32:24)
        at async attemptRetry (/opt/render/project/src/Server/node_modules/viem/_cjs/utils/promise/withRetry.js:15:30) {
      details: 'UserOperation reverted during simulation with reason: AA23 reverted 0x3c10b94e',
      docsPath: undefined,
      metaMessages: [Array],
      shortMessage: 'RPC Request failed.',
      version: '2.33.2',
      code: -32500,
      data: undefined,
      [cause]: [Object]
    }
  },
  details: 'UserOperation reverted during simulation with reason: AA23 reverted 0x3c10b94e',
  docsPath: undefined,
  metaMessages: [
    'Request Arguments:',
    '  callData:                       0xb61d27f6000000000000000000000000f89c1312d9a92d84f2bfbf870089c29a09bc638a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c19094eb2600000000000000000000000000000000000000000000000000000000000128e000000000000000000000000000000000000000000000000000000000000000070000000000000000000000000000000000000000000000000000000069dafbec0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000062635f776269346139346e0b008021802180218021802180218021802100000000000000000000000000000000000000000000000000000000000000\n' +
      '  callGasLimit:                   0\n' +
      '  maxFeePerGas:                   0.007906928 gwei\n' +
      '  maxPriorityFeePerGas:           0.0011 gwei\n' +
      '  nonce:                          32760415780826044017998173306880\n' +
      '  paymaster:                      0x888888888888Ec68A58AB8094Cc1AD20Ba3D2402\n' +
      '  paymasterData:                  0x01000000000000000000000000cd91f19f0f19ce862d7bec7b7d9b95457145afc6f639c28fd0360f488937bfa41e6eedcd3a46054fd95fcd0e3ef6b0bc0a615c4d975eef55c8a3517257904d5b1c\n' +
      '  paymasterPostOpGasLimit:        1\n' +
      '  paymasterVerificationGasLimit:  0\n' +
      '  preVerificationGas:             0\n' +
      '  sender:                         0x4c8C5C4d4954dcCC81733b5b4f4C4Fe7B4733200\n' +
      '  signature:                      0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c\n' +
      '  verificationGasLimit:           0'
  ],
  shortMessage: 'The `validateUserOp` function on the Smart Account reverted.',
  version: '2.33.2'
}
UserOperationExecutionError: The `validateUserOp` function on the Smart Account reverted.
Request Arguments:
  callData:                       0xb61d27f6000000000000000000000000f89c1312d9a92d84f2bfbf870089c29a09bc638a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c19094eb2600000000000000000000000000000000000000000000000000000000000128e000000000000000000000000000000000000000000000000000000000000000070000000000000000000000000000000000000000000000000000000069dafbec0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000062635f776269346139346e0b008021802180218021802180218021802100000000000000000000000000000000000000000000000000000000000000
  callGasLimit:                   0
  maxFeePerGas:                   0.007906928 gwei
  maxPriorityFeePerGas:           0.0011 gwei
  nonce:                          32760415780826044017998173306880
  paymaster:                      0x888888888888Ec68A58AB8094Cc1AD20Ba3D2402
  paymasterData:                  0x01000000000000000000000000cd91f19f0f19ce862d7bec7b7d9b95457145afc6f639c28fd0360f488937bfa41e6eedcd3a46054fd95fcd0e3ef6b0bc0a615c4d975eef55c8a3517257904d5b1c
  paymasterPostOpGasLimit:        1
  paymasterVerificationGasLimit:  0
  preVerificationGas:             0
  sender:                         0x4c8C5C4d4954dcCC81733b5b4f4C4Fe7B4733200
  signature:                      0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c
  verificationGasLimit:           0
Details: UserOperation reverted during simulation with reason: AA23 reverted 0x3c10b94e
Version: viem@2.33.2
    at getUserOperationError (/opt/render/project/src/Server/node_modules/viem/_cjs/account-abstraction/utils/errors/getUserOperationError.js:21:12)
    at estimateUserOperationGas (/opt/render/project/src/Server/node_modules/viem/_cjs/account-abstraction/actions/bundler/estimateUserOperationGas.js:43:68)
    ... 5 lines matching cause stack trace ...
    at async bcCreateChama (/opt/render/project/src/Server/dist/Blockchain/WriteFunction.js:22:22)
    at async createChama (/opt/render/project/src/Server/dist/Controllers/chamaControllers.js:40:32) {
  cause: SmartAccountFunctionRevertedError: The `validateUserOp` function on the Smart Account reverted.
  
  Details: UserOperation reverted during simulation with reason: AA23 reverted 0x3c10b94e
  Version: viem@2.33.2
      at getBundlerError (/opt/render/project/src/Server/node_modules/viem/_cjs/account-abstraction/utils/errors/getBundlerError.js:100:16)
      at /opt/render/project/src/Server/node_modules/viem/_cjs/account-abstraction/utils/errors/getUserOperationError.js:12:64
      at getUserOperationError (/opt/render/project/src/Server/node_modules/viem/_cjs/account-abstraction/utils/errors/getUserOperationError.js:20:7)
      at estimateUserOperationGas (/opt/render/project/src/Server/node_modules/viem/_cjs/account-abstraction/actions/bundler/estimateUserOperationGas.js:43:68)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async prepareUserOperation (/opt/render/project/src/Server/node_modules/viem/_cjs/account-abstraction/actions/bundler/prepareUserOperation.js:221:25)
      at async sendUserOperation (/opt/render/project/src/Server/node_modules/viem/_cjs/account-abstraction/actions/bundler/sendUserOperation.js:16:11)
      at async sendTransaction (/opt/render/project/src/Server/node_modules/permissionless/_cjs/actions/smartAccount/sendTransaction.js:19:22)
      at async writeContract (/opt/render/project/src/Server/node_modules/permissionless/_cjs/actions/smartAccount/writeContract.js:13:18)
      at async bcCreateChama (/opt/render/project/src/Server/dist/Blockchain/WriteFunction.js:22:22) {
    details: 'UserOperation reverted during simulation with reason: AA23 reverted 0x3c10b94e',
    docsPath: undefined,
    metaMessages: undefined,
    shortMessage: 'The `validateUserOp` function on the Smart Account reverted.',
    version: '2.33.2',
    [cause]: RpcRequestError: RPC Request failed.
    
    URL: https://api.pimlico.io/v2/8453/rpc?apikey=pim_SJTeEAXGdKomK1J2bhBiuQ
    Request body: {"method":"eth_estimateUserOperationGas","params":[{"callData":"0xb61d27f6000000000000000000000000f89c1312d9a92d84f2bfbf870089c29a09bc638a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c19094eb2600000000000000000000000000000000000000000000000000000000000128e000000000000000000000000000000000000000000000000000000000000000070000000000000000000000000000000000000000000000000000000069dafbec0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000062635f776269346139346e0b008021802180218021802180218021802100000000000000000000000000000000000000000000000000000000000000","callGasLimit":"0x0","maxFeePerGas":"0x78a670","maxPriorityFeePerGas":"0x10c8e0","nonce":"0x19d7e9ccb070000000000000000","paymaster":"0x888888888888Ec68A58AB8094Cc1AD20Ba3D2402","paymasterData":"0x01000000000000000000000000cd91f19f0f19ce862d7bec7b7d9b95457145afc6f639c28fd0360f488937bfa41e6eedcd3a46054fd95fcd0e3ef6b0bc0a615c4d975eef55c8a3517257904d5b1c","paymasterPostOpGasLimit":"0x1","paymasterVerificationGasLimit":"0x0","preVerificationGas":"0x0","sender":"0x4c8C5C4d4954dcCC81733b5b4f4C4Fe7B4733200","signature":"0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c","verificationGasLimit":"0x0","eip7702Auth":{"address":"0x7702cb554e6bFb442cb743A7dF23154544a7176C","chainId":"0x2105","nonce":"0x0","r":"0xfffffffffffffffffffffffffffffff000000000000000000000000000000000","s":"0x7aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","yParity":"0x01"}},"0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108"]}
    
    Details: UserOperation reverted during simulation with reason: AA23 reverted 0x3c10b94e
    Version: viem@2.33.2
        at request (/opt/render/project/src/Server/node_modules/viem/_cjs/clients/transports/http.js:52:27)
        at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
        at async delay.count.count (/opt/render/project/src/Server/node_modules/viem/_cjs/utils/buildRequest.js:32:24)
        at async attemptRetry (/opt/render/project/src/Server/node_modules/viem/_cjs/utils/promise/withRetry.js:15:30) {
      details: 'UserOperation reverted during simulation with reason: AA23 reverted 0x3c10b94e',
      docsPath: undefined,
      metaMessages: [Array],
      shortMessage: 'RPC Request failed.',
      version: '2.33.2',
      code: -32500,
      data: undefined,
      [cause]: [Object]
    }
  },
  details: 'UserOperation reverted during simulation with reason: AA23 reverted 0x3c10b94e',
  docsPath: undefined,
  metaMessages: [
    'Request Arguments:',
    '  callData:                       0xb61d27f6000000000000000000000000f89c1312d9a92d84f2bfbf870089c29a09bc638a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c19094eb2600000000000000000000000000000000000000000000000000000000000128e000000000000000000000000000000000000000000000000000000000000000070000000000000000000000000000000000000000000000000000000069dafbec0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000062635f776269346139346e0b008021802180218021802180218021802100000000000000000000000000000000000000000000000000000000000000\n' +
      '  callGasLimit:                   0\n' +
      '  maxFeePerGas:                   0.007906928 gwei\n' +
      '  maxPriorityFeePerGas:           0.0011 gwei\n' +
      '  nonce:                          32760415780826044017998173306880\n' +
      '  paymaster:                      0x888888888888Ec68A58AB8094Cc1AD20Ba3D2402\n' +
      '  paymasterData:                  0x01000000000000000000000000cd91f19f0f19ce862d7bec7b7d9b95457145afc6f639c28fd0360f488937bfa41e6eedcd3a46054fd95fcd0e3ef6b0bc0a615c4d975eef55c8a3517257904d5b1c\n' +
      '  paymasterPostOpGasLimit:        1\n' +
      '  paymasterVerificationGasLimit:  0\n' +
      '  preVerificationGas:             0\n' +
      '  sender:                         0x4c8C5C4d4954dcCC81733b5b4f4C4Fe7B4733200\n' +
      '  signature:                      0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c\n' +
Menu
      '  verificationGasLimit:           0'
  ],
  shortMessage: 'The `validateUserOp` function on the Smart Account reverted.',
  version: '2.33.2'
}