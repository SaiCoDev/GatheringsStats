// Cloudflare Worker cron — calls snapshot endpoints every minute
// Server snapshot: every minute (lightweight)
// Game data snapshot: every 5th minute (heavy — 5k+ rows from Supabase)
export default {
  async scheduled(event, env) {
    const headers = new Headers({
      Authorization: `Bearer ${env.CRON_SECRET}`,
    });

    // Server snapshot — always run (fast, ~2s)
    try {
      const res = await env.MAIN_SITE.fetch("https://dummy/api/server-snapshot", { headers });
      const body = await res.text();
      console.log(`server-snapshot: ${res.status} ${body.slice(0, 200)}`);
    } catch (e) {
      console.error(`server-snapshot: FAILED ${e.message}`);
    }

    // Game data snapshot — only on minutes divisible by 5 (heavy, ~10s)
    const minute = new Date(event.scheduledTime).getMinutes();
    if (minute % 5 === 0) {
      try {
        const res = await env.MAIN_SITE.fetch("https://dummy/api/game-data-snapshot", { headers });
        const body = await res.text();
        console.log(`game-data-snapshot: ${res.status} ${body.slice(0, 200)}`);
      } catch (e) {
        console.error(`game-data-snapshot: FAILED ${e.message}`);
      }
    }
  },
};
