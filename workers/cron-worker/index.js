// Cloudflare Worker cron — calls snapshot endpoints every minute
// Uses Service Binding to call the main site worker directly (no HTTP routing issues)
export default {
  async scheduled(event, env) {
    const headers = new Headers({
      Authorization: `Bearer ${env.CRON_SECRET}`,
    });

    const results = await Promise.allSettled([
      env.MAIN_SITE.fetch("https://dummy/api/server-snapshot", { headers }),
      env.MAIN_SITE.fetch("https://dummy/api/game-data-snapshot", { headers }),
    ]);

    for (const [i, r] of results.entries()) {
      const name = i === 0 ? "server-snapshot" : "game-data-snapshot";
      if (r.status === "fulfilled") {
        const body = await r.value.text();
        console.log(`${name}: ${r.value.status} ${body.slice(0, 200)}`);
      } else {
        console.error(`${name}: FAILED ${r.reason}`);
      }
    }
  },
};
