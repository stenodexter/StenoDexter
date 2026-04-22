// src/index.js
var index_default = {
  // required even if unused
  async fetch(request, env, ctx) {
    return new Response("OK", { status: 200 });
  },
  async scheduled(event, env, ctx) {
    console.log("RUNNING SCHEDULED", ctx);
    const BASE_URL = "https://www.stenodexter.com";
    const headers = {
      Authorization: `Bearer ${env.CRON_SECRET}`,
      "Content-Type": "application/json"
    };
    if (event.cron === "0 */2 * * *") {
      await fetch(`${BASE_URL}/api/crons/2hr`, { headers });
      console.log("2hr cron done");
    } else if (event.cron === "0 0 * * *") {
      await fetch(`${BASE_URL}/api/crons/daily`, { headers });
      console.log("Daily cron done");
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
