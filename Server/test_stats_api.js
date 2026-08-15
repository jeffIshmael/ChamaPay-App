const http = require('http');

http.get('http://localhost:3000/api/stats/onchain', (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        const parsed = JSON.parse(data);
        console.log("Action Breakdown:", parsed.actionBreakdown);
        console.log("Recent Transactions (Top 5):", parsed.recentTransactions.slice(0, 5));
    });
}).on("error", (err) => {
    console.log("Error: " + err.message);
});
