// Patch the OpenNext worker.js to add a scheduled event handler for cron triggers.
// Run after `opennextjs-cloudflare build`.

const fs = require("fs");
const path = require("path");

const workerPath = path.join(__dirname, "..", ".open-next", "worker.js");
let code = fs.readFileSync(workerPath, "utf8");

if (code.includes("async scheduled(")) {
  console.log("worker.js already has scheduled handler, skipping patch.");
  process.exit(0);
}

// The worker ends with `};` — replace it to add the scheduled handler
code = code.trimEnd().replace(/};\s*$/, `    async scheduled(event, env, ctx) {
        const baseUrl = "http://localhost";
        const headers = { "Authorization": "Bearer " + env.CRON_SECRET };
        ctx.waitUntil(Promise.all([
            this.fetch(new Request(baseUrl + "/api/server-snapshot", { headers }), env, ctx),
            this.fetch(new Request(baseUrl + "/api/game-data-snapshot", { headers }), env, ctx),
        ]));
    },
};
`);

fs.writeFileSync(workerPath, code, "utf8");
console.log("Patched worker.js with scheduled handler.");
