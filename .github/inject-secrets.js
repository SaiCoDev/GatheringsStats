// Injects secrets from environment variables into wrangler.jsonc vars
// Used by CI deploy workflow — secrets never committed to the repo
const fs = require("fs");

let cfg = fs.readFileSync("wrangler.jsonc", "utf8");
// Strip JSONC comments
cfg = cfg.replace(/\/\/[^\n]*/g, "");
cfg = cfg.replace(/\/\*[\s\S]*?\*\//g, "");
const obj = JSON.parse(cfg);

const secrets = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "GAME_SUPABASE_SERVICE_ROLE_KEY",
  "GATHERINGS_API_KEY",
  "CRON_SECRET",
];

for (const key of secrets) {
  if (process.env[key]) {
    obj.vars[key] = process.env[key];
  } else {
    console.warn(`Warning: ${key} not set in environment`);
  }
}

fs.writeFileSync("wrangler.jsonc", JSON.stringify(obj, null, 2));
console.log("Injected secrets into wrangler.jsonc vars");
