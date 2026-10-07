export const WITHDRAWAL_FEE_BRACKETS = [
    { min: 60, max: 500, fee: 5 }, // +5 from floor
    { min: 501, max: 1000, fee: 10 }, // +5
    { min: 1001, max: 2500, fee: 20 }, // +10
    { min: 2501, max: 5000, fee: 35 }, // +15
    { min: 5001, max: 10000, fee: 55 }, // +20
    { min: 10001, max: 20000, fee: 60 }, // +25 // 80
    { min: 20001, max: 35000, fee: 110 }, // +30
    { min: 35001, max: 50000, fee: 145 }, // +35
    { min: 50001, max: 70000, fee: 180 }, // +35
    { min: 70001, max: 85000, fee: 215 }, // +35
    { min: 85001, max: 100000, fee: 250 }, // +35
  ] as const;