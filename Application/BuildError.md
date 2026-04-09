Running "npm ci --include=dev" in /home/expo/workingdir/build/Application directory
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: @metamask/sdk-communication-layer@0.33.1
npm warn Found: readable-stream@4.7.0
npm warn node_modules/readable-stream
npm warn   readable-stream@"^4.7.0" from the root project
npm warn   2 more (extension-port-stream, react-native-quick-crypto)
npm warn
npm warn Could not resolve dependency:
npm warn peer readable-stream@"^3.6.2" from @metamask/sdk-communication-layer@0.33.1
npm warn node_modules/@metamask/sdk-communication-layer
npm warn   @metamask/sdk-communication-layer@"0.33.1" from @metamask/sdk@0.33.1
npm warn   node_modules/@metamask/sdk
npm warn
npm warn Conflicting peer dependency: readable-stream@3.6.2
npm warn node_modules/readable-stream
npm warn   peer readable-stream@"^3.6.2" from @metamask/sdk-communication-layer@0.33.1
npm warn   node_modules/@metamask/sdk-communication-layer
npm warn     @metamask/sdk-communication-layer@"0.33.1" from @metamask/sdk@0.33.1
npm warn     node_modules/@metamask/sdk
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: @walletconnect/keyvaluestorage@1.1.1
npm warn Found: @react-native-async-storage/async-storage@2.2.0
npm warn node_modules/@react-native-async-storage/async-storage
npm warn   @react-native-async-storage/async-storage@"2.2.0" from the root project
npm warn   4 more (@mobile-wallet-protocol/client, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peerOptional @react-native-async-storage/async-storage@"1.x" from @walletconnect/keyvaluestorage@1.1.1
npm warn node_modules/@walletconnect/keyvaluestorage
npm warn   @walletconnect/keyvaluestorage@"1.1.1" from @walletconnect/core@2.21.0
npm warn   node_modules/@reown/appkit/node_modules/@walletconnect/core
npm warn   30 more (@walletconnect/types, ...)
npm warn
npm warn Conflicting peer dependency: @react-native-async-storage/async-storage@1.24.0
npm warn node_modules/@react-native-async-storage/async-storage
npm warn   peerOptional @react-native-async-storage/async-storage@"1.x" from @walletconnect/keyvaluestorage@1.1.1
npm warn   node_modules/@walletconnect/keyvaluestorage
npm warn     @walletconnect/keyvaluestorage@"1.1.1" from @walletconnect/core@2.21.0
npm warn     node_modules/@reown/appkit/node_modules/@walletconnect/core
npm warn     30 more (@walletconnect/types, ...)
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: use-sync-external-store@1.2.0
npm warn Found: react@19.1.0
npm warn node_modules/react
npm warn   react@"19.1.0" from the root project
npm warn   105 more (zustand, @coinbase/wallet-mobile-sdk, @emotion/react, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peer react@"^16.8.0 || ^17.0.0 || ^18.0.0" from use-sync-external-store@1.2.0
npm warn node_modules/valtio/node_modules/use-sync-external-store
npm warn   use-sync-external-store@"1.2.0" from valtio@1.11.2
npm warn   node_modules/valtio
npm warn
npm warn Conflicting peer dependency: react@18.3.1
npm warn node_modules/react
npm warn   peer react@"^16.8.0 || ^17.0.0 || ^18.0.0" from use-sync-external-store@1.2.0
npm warn   node_modules/valtio/node_modules/use-sync-external-store
npm warn     use-sync-external-store@"1.2.0" from valtio@1.11.2
npm warn     node_modules/valtio
npm error code EUSAGE
npm error
npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing.
npm error
npm error Invalid: lock file's @noble/ciphers@0.5.3 does not satisfy @noble/ciphers@1.3.0
npm error Missing: @hey-api/openapi-ts@0.95.0 from lock file
npm error Missing: @hey-api/codegen-core@0.7.4 from lock file
npm error Missing: @hey-api/json-schema-ref-parser@1.3.1 from lock file
npm error Missing: @hey-api/shared@0.3.0 from lock file
npm error Missing: @hey-api/spec-types@0.1.0 from lock file
npm error Missing: @hey-api/types@0.1.4 from lock file
npm error Missing: ansi-colors@4.1.3 from lock file
npm error Missing: color-support@1.1.3 from lock file
npm error Missing: commander@14.0.3 from lock file
npm error Missing: get-tsconfig@4.13.6 from lock file
npm error Missing: c12@3.3.3 from lock file
npm error Missing: @jsdevtools/ono@7.1.3 from lock file
npm error Missing: open@11.0.0 from lock file
npm error Missing: semver@7.7.3 from lock file
npm error Invalid: lock file's cross-fetch@3.2.0 does not satisfy cross-fetch@4.1.0
npm error Missing: @noble/ciphers@0.5.3 from lock file
npm error Invalid: lock file's @solana/kit@5.5.1 does not satisfy @solana/kit@2.3.0
npm error Missing: @solana-program/system@0.10.0 from lock file
npm error Missing: @solana/kit@5.5.1 from lock file
npm error Missing: @solana-program/token@0.9.0 from lock file
npm error Invalid: lock file's @solana/sysvars@5.5.1 does not satisfy @solana/sysvars@2.3.0
npm error Invalid: lock file's @solana/accounts@5.5.1 does not satisfy @solana/accounts@2.3.0
npm error Invalid: lock file's @solana/addresses@5.5.1 does not satisfy @solana/addresses@2.3.0
npm error Invalid: lock file's @solana/codecs@5.5.1 does not satisfy @solana/codecs@2.3.0
npm error Invalid: lock file's @solana/errors@5.5.1 does not satisfy @solana/errors@2.3.0
npm error Invalid: lock file's @solana/functional@5.5.1 does not satisfy @solana/functional@2.3.0
npm error Invalid: lock file's @solana/instructions@5.5.1 does not satisfy @solana/instructions@2.3.0
npm error Invalid: lock file's @solana/keys@5.5.1 does not satisfy @solana/keys@2.3.0
npm error Invalid: lock file's @solana/programs@5.5.1 does not satisfy @solana/programs@2.3.0
npm error Invalid: lock file's @solana/rpc@5.5.1 does not satisfy @solana/rpc@2.3.0
npm error Invalid: lock file's @solana/rpc-parsed-types@5.5.1 does not satisfy @solana/rpc-parsed-types@2.3.0
npm error Invalid: lock file's @solana/rpc-spec-types@5.5.1 does not satisfy @solana/rpc-spec-types@2.3.0
npm error Invalid: lock file's @solana/rpc-subscriptions@5.5.1 does not satisfy @solana/rpc-subscriptions@2.3.0
npm error Invalid: lock file's @solana/rpc-types@5.5.1 does not satisfy @solana/rpc-types@2.3.0
npm error Invalid: lock file's @solana/signers@5.5.1 does not satisfy @solana/signers@2.3.0
npm error Invalid: lock file's @solana/transaction-confirmation@5.5.1 does not satisfy @solana/transaction-confirmation@2.3.0
npm error Invalid: lock file's @solana/transaction-messages@5.5.1 does not satisfy @solana/transaction-messages@2.3.0
npm error Invalid: lock file's @solana/transactions@5.5.1 does not satisfy @solana/transactions@2.3.0
npm error Invalid: lock file's @solana/codecs-core@5.5.1 does not satisfy @solana/codecs-core@2.3.0
npm error Invalid: lock file's @solana/codecs-strings@5.5.1 does not satisfy @solana/codecs-strings@2.3.0
npm error Missing: fastestsmallesttextencoderdecoder@1.0.22 from lock file
npm error Invalid: lock file's @solana/rpc-spec@5.5.1 does not satisfy @solana/rpc-spec@2.3.0
npm error Invalid: lock file's @solana/assertions@5.5.1 does not satisfy @solana/assertions@2.3.0
npm error Invalid: lock file's @solana/nominal-types@5.5.1 does not satisfy @solana/nominal-types@2.3.0
npm error Invalid: lock file's @solana/codecs-data-structures@5.5.1 does not satisfy @solana/codecs-data-structures@2.3.0
npm error Invalid: lock file's @solana/codecs-numbers@5.5.1 does not satisfy @solana/codecs-numbers@2.3.0
npm error Invalid: lock file's @solana/options@5.5.1 does not satisfy @solana/options@2.3.0
npm error Invalid: lock file's commander@14.0.2 does not satisfy commander@14.0.3
npm error Invalid: lock file's @solana/fast-stable-stringify@5.5.1 does not satisfy @solana/fast-stable-stringify@2.3.0
npm error Invalid: lock file's @solana/rpc-api@5.5.1 does not satisfy @solana/rpc-api@2.3.0
npm error Invalid: lock file's @solana/rpc-transformers@5.5.1 does not satisfy @solana/rpc-transformers@2.3.0
npm error Invalid: lock file's @solana/rpc-transport-http@5.5.1 does not satisfy @solana/rpc-transport-http@2.3.0
npm error Invalid: lock file's @solana/promises@5.5.1 does not satisfy @solana/promises@2.3.0
npm error Invalid: lock file's @solana/rpc-subscriptions-api@5.5.1 does not satisfy @solana/rpc-subscriptions-api@2.3.0
npm error Invalid: lock file's @solana/rpc-subscriptions-channel-websocket@5.5.1 does not satisfy @solana/rpc-subscriptions-channel-websocket@2.3.0
npm error Invalid: lock file's @solana/rpc-subscriptions-spec@5.5.1 does not satisfy @solana/rpc-subscriptions-spec@2.3.0
npm error Invalid: lock file's @solana/subscribable@5.5.1 does not satisfy @solana/subscribable@2.3.0
npm error Missing: @biomejs/biome@2.0.6 from lock file
npm error Missing: @biomejs/cli-darwin-arm64@2.0.6 from lock file
npm error Missing: @biomejs/cli-darwin-x64@2.0.6 from lock file
npm error Missing: @biomejs/cli-linux-arm64@2.0.6 from lock file
npm error Missing: @biomejs/cli-linux-arm64-musl@2.0.6 from lock file
npm error Missing: @biomejs/cli-linux-x64@2.0.6 from lock file
npm error Missing: @biomejs/cli-linux-x64-musl@2.0.6 from lock file
npm error Missing: @biomejs/cli-win32-arm64@2.0.6 from lock file
npm error Missing: @biomejs/cli-win32-x64@2.0.6 from lock file
npm error Missing: cross-fetch@3.2.0 from lock file
npm error Missing: chokidar@5.0.0 from lock file
npm error Missing: confbox@0.2.4 from lock file
npm error Missing: dotenv@17.4.1 from lock file
npm error Missing: exsolve@1.0.8 from lock file
npm error Missing: giget@2.0.0 from lock file
npm error Missing: jiti@2.6.1 from lock file
npm error Missing: ohash@2.0.11 from lock file
npm error Missing: pathe@2.0.3 from lock file
npm error Missing: perfect-debounce@2.1.0 from lock file
npm error Missing: pkg-types@2.3.0 from lock file
npm error Missing: rc9@2.1.2 from lock file
npm error Missing: cross-fetch@3.2.0 from lock file
npm error Missing: citty@0.1.6 from lock file
npm error Missing: consola@3.4.2 from lock file
npm error Missing: nypm@0.6.5 from lock file
npm error Missing: citty@0.2.2 from lock file
npm error Missing: tinyexec@1.1.1 from lock file
npm error Missing: prettier@3.8.1 from lock file
npm error Missing: @solana/accounts@5.5.1 from lock file
npm error Missing: @solana/addresses@5.5.1 from lock file
npm error Missing: @solana/codecs@5.5.1 from lock file
npm error Missing: @solana/errors@5.5.1 from lock file
npm error Missing: @solana/functional@5.5.1 from lock file
npm error Missing: @solana/instructions@5.5.1 from lock file
npm error Missing: @solana/keys@5.5.1 from lock file
npm error Missing: @solana/programs@5.5.1 from lock file
npm error Missing: @solana/rpc@5.5.1 from lock file
npm error Missing: @solana/rpc-api@5.5.1 from lock file
npm error Missing: @solana/rpc-parsed-types@5.5.1 from lock file
npm error Missing: @solana/rpc-spec-types@5.5.1 from lock file
npm error Missing: @solana/rpc-subscriptions@5.5.1 from lock file
npm error Missing: @solana/rpc-types@5.5.1 from lock file
npm error Missing: @solana/signers@5.5.1 from lock file
npm error Missing: @solana/sysvars@5.5.1 from lock file
npm error Missing: @solana/transaction-confirmation@5.5.1 from lock file
npm error Missing: @solana/transaction-messages@5.5.1 from lock file
npm error Missing: @solana/transactions@5.5.1 from lock file
npm error Missing: @solana/errors@5.5.1 from lock file
npm error Missing: @solana/instructions@5.5.1 from lock file
npm error Missing: @solana/keys@5.5.1 from lock file
npm error Missing: @solana/promises@5.5.1 from lock file
npm error Missing: @solana/transaction-messages@5.5.1 from lock file
npm error Missing: @solana/transactions@5.5.1 from lock file
npm error Missing: @solana/addresses@5.5.1 from lock file
npm error Missing: @solana/codecs-core@5.5.1 from lock file
npm error Missing: @solana/codecs-data-structures@5.5.1 from lock file
npm error Missing: @solana/codecs-numbers@5.5.1 from lock file
npm error Missing: @solana/codecs-strings@5.5.1 from lock file
npm error Missing: @solana/errors@5.5.1 from lock file
npm error Missing: @solana/keys@5.5.1 from lock file
npm error Missing: @solana/nominal-types@5.5.1 from lock file
npm error Missing: @solana/codecs-core@5.5.1 from lock file
npm error Missing: @solana/codecs-strings@5.5.1 from lock file
npm error Missing: @solana/rpc-spec@5.5.1 from lock file
npm error Missing: @solana/assertions@5.5.1 from lock file
npm error Missing: @solana/nominal-types@5.5.1 from lock file
npm error Missing: @solana/codecs-data-structures@5.5.1 from lock file
npm error Missing: @solana/codecs-numbers@5.5.1 from lock file
npm error Missing: @solana/options@5.5.1 from lock file
npm error Missing: chalk@5.6.2 from lock file
npm error Missing: commander@14.0.2 from lock file
npm error Missing: @solana/fast-stable-stringify@5.5.1 from lock file
npm error Missing: @solana/rpc-transformers@5.5.1 from lock file
npm error Missing: @solana/rpc-transport-http@5.5.1 from lock file
npm error Missing: @solana/promises@5.5.1 from lock file
npm error Missing: @solana/rpc-subscriptions-api@5.5.1 from lock file
npm error Missing: @solana/rpc-subscriptions-channel-websocket@5.5.1 from lock file
npm error Missing: @solana/rpc-subscriptions-spec@5.5.1 from lock file
npm error Missing: @solana/subscribable@5.5.1 from lock file
npm error Missing: ws@8.20.0 from lock file
npm error Missing: undici-types@7.24.7 from lock file
npm error Missing: define-lazy-prop@3.0.0 from lock file
npm error Missing: is-in-ssh@1.0.0 from lock file
npm error Missing: powershell-utils@0.1.0 from lock file
npm error Missing: wsl-utils@0.3.1 from lock file
npm error Missing: is-wsl@3.1.1 from lock file
npm error Missing: react@18.3.1 from lock file
npm error Missing: react@18.3.1 from lock file
npm error Missing: react@18.3.1 from lock file
npm error Missing: react@18.3.1 from lock file
npm error Missing: chalk@5.6.2 from lock file
npm error Missing: commander@14.0.2 from lock file
npm error Missing: @solana/codecs-core@5.5.1 from lock file
npm error Missing: @solana/assertions@5.5.1 from lock file
npm error Missing: @solana/codecs-strings@5.5.1 from lock file
npm error Missing: @solana/nominal-types@5.5.1 from lock file
npm error Missing: @solana/codecs-numbers@5.5.1 from lock file
npm error Missing: @solana/addresses@5.5.1 from lock file
npm error Missing: @solana/codecs-data-structures@5.5.1 from lock file
npm error Missing: @solana/functional@5.5.1 from lock file
npm error Missing: @solana/rpc-types@5.5.1 from lock file
npm error Missing: @solana/assertions@5.5.1 from lock file
npm error Missing: chalk@5.6.2 from lock file
npm error Missing: commander@14.0.2 from lock file
npm error Missing: react@18.3.1 from lock file
npm error Missing: react-dom@18.3.1 from lock file
npm error Missing: scheduler@0.23.2 from lock file
npm error Missing: @types/react@18.3.28 from lock file
npm error Missing: @types/prop-types@15.7.15 from lock file
npm error Missing: @react-native-async-storage/async-storage@1.24.0 from lock file
npm error Missing: expo-web-browser@13.0.3 from lock file
npm error Missing: readdirp@5.0.0 from lock file
npm error
npm error Clean install a project
npm error
npm error Usage:
npm error npm ci
npm error
npm error Options:
npm error [--install-strategy <hoisted|nested|shallow|linked>] [--legacy-bundling]
npm error [--global-style] [--omit <dev|optional|peer> [--omit <dev|optional|peer> ...]]
npm error [--include <prod|dev|optional|peer> [--include <prod|dev|optional|peer> ...]]
npm error [--strict-peer-deps] [--foreground-scripts] [--ignore-scripts] [--no-audit]
npm error [--no-bin-links] [--no-fund] [--dry-run]
npm error [-w|--workspace <workspace-name> [-w|--workspace <workspace-name> ...]]
npm error [-ws|--workspaces] [--include-workspace-root] [--install-links]
npm error
npm error aliases: clean-install, ic, install-clean, isntall-clean
npm error
npm error Run "npm help ci" for more info
npm error A complete log of this run can be found in: /home/expo/.npm/_logs/2026-04-09T19_43_20_562Z-debug-0.log

Build failed
npm ci --include=dev exited with non-zero code: 1