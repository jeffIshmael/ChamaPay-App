import { getChamaBySlug } from "./Controllers/chamaControllers";

async function measure() {
  const req = {
    params: { slug: "tripple-threat" },
    user: { userId: 4 }
  } as any;
  const res = {
    status: (code: number) => ({
      json: (data: any) => { /* console.log(`Status ${code}`, data); */ return data; }
    })
  } as any;

  console.log("Measuring first call (cache miss)");
  console.time("getChamaBySlug-1");
  await getChamaBySlug(req, res);
  console.timeEnd("getChamaBySlug-1");

  console.log("Measuring second call (cache hit)");
  console.time("getChamaBySlug-2");
  await getChamaBySlug(req, res);
  console.timeEnd("getChamaBySlug-2");
}
measure().catch(console.error).finally(() => process.exit(0));

const message = " Confirmed. You have <dynamic value e.g withdrawn, deposited> <dynamic value i.e amount> KES (<amount> USDC) to <dynamic value i.e chama or chamapay account>. <dynamic "

