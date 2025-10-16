// this file contains all the read functions for the blockchain

import { client, chain } from "../constants/thirdweb";
import { chamapayContract } from "../constants/thirdweb";

// get total chamas
// export const getTotalChamas = async () => {
//   const totalChamas = await client.readContract({
//     contract: chamapayContract,
//     functionName: "totalChamas",
//   });
//   return totalChamas;
// };