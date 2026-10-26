import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { PgStore } from "./pg-store.js";

const config = loadConfig();
const store = new PgStore(config.databaseUrl);
const server = createApp(store, config).listen(config.port, config.host, () => {
  console.log(`Campus portal API listening on http://${config.host}:${config.port} in ${config.writeMode} mode.`);
});

async function shutdown() {
  server.close();
  await store.close();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
