export async function register() {
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { logProductionRuntimeStatus } = require("./lib/server/runtime-startup");
  logProductionRuntimeStatus();
}
