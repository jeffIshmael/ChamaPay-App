require('ts-node').register({ transpileOnly: true });
const { getOnchainStats } = require('./Controllers/statsController');

async function run() {
    const req = {};
    const res = {
        status: function(code) { this.code = code; return this; },
        json: function(data) { console.log(JSON.stringify(data, null, 2)); return this; }
    };
    await getOnchainStats(req, res);
}
run();
