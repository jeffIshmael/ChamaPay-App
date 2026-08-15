require('ts-node').register({ transpileOnly: true });
const { getOnchainStats, getStats } = require('./Controllers/statsController');

async function run() {
    const req = {};
    let onchainResData, globalResData;

    const resOnchain = {
        status: function(code) { return this; },
        json: function(data) { onchainResData = data; return this; }
    };
    await getOnchainStats(req, resOnchain);

    const resGlobal = {
        status: function(code) { return this; },
        setHeader: function() { return this; },
        json: function(data) { globalResData = data; return this; }
    };
    await getStats(req, resGlobal);

    const onchainTotal = onchainResData.actionBreakdown.reduce((acc, curr) => acc + curr.transactionCountAllTime, 0);
    const globalTotal = globalResData.transactions.total;

    console.log("Onchain Total:", onchainTotal);
    console.log("Global Total:", globalTotal);
}
run();
