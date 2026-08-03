# Chamapay Currency & Exchange Rate Tasks

- [x] Add `CHAMAPAY_RATE` to `Server/.env`
- [x] Create `GET /api/rates` endpoint on the backend to expose `CHAMAPAY_RATE` to the frontend (Option A)
- [x] Implement backend Deposit Flow with FX Reserve logic (Pretium Integration)
- [x] Implement backend Withdrawal Flow with live Pretium rate quote (Pretium Integration)
- [x] Create `useFormattedBalance` utility/hook in Frontend for calculating KES display from USDC
- [ ] Refactor Frontend UI components (Wallet, Chama Details, Savings, Deposits) to use static `CHAMAPAY_RATE` for 'KES' conversions
- [ ] Update Frontend Withdrawal Screen UI to fetch and use the live exchange rate quote from the backend
- [ ] Write backend unit tests for FX Reserve logic