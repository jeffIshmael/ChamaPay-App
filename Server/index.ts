import { createServer } from "http";
import { initialiseSocket } from "./Socket/socket";
import app from "./app";
import { initCronJobs } from "./Lib/cronService";

const PORT: number = parseInt(process.env.PORT || "3000", 10);
const server = createServer(app);

async function startServer(): Promise<void> {
  try {
    // Start the server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    // initialise the socket
    initialiseSocket(server);

    // Initialise scheduled cron jobs
    initCronJobs();

    // Handle graceful shutdown
    process.on("SIGTERM", (): void => {
      console.log("🛑 Shutting down gracefully...");
      server.close((): void => {
        console.log("💤 Server terminated");
        process.exit(0);
      });
    });

    process.on("SIGINT", (): void => {
      console.log("🛑 Received SIGINT, shutting down gracefully...");
      server.close((): void => {
        console.log("💤 Server terminated");
        process.exit(0);
      });
    });
  } catch (error: unknown) {
    console.error("🔥 Failed to initialize:", error);
    process.exit(1); // Exit with error code
  }
}

startServer().catch((error: unknown) => {
  console.error("🔥 Unhandled error during startup:", error);
  process.exit(1);
});
