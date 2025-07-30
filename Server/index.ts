import { Server } from "http";
import app from "./app";

const PORT: number = parseInt(process.env.PORT || "3000", 10);

async function startServer(): Promise<void> {
  try {
    // Start the server
    const server: Server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', (): void => {
      console.log('🛑 Shutting down gracefully...');
      server.close((): void => {
        console.log('💤 Server terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', (): void => {
      console.log('🛑 Received SIGINT, shutting down gracefully...');
      server.close((): void => {
        console.log('💤 Server terminated');
        process.exit(0);
      });
    });

  } catch (error: unknown) {
    console.error('🔥 Failed to initialize:', error);
    process.exit(1); // Exit with error code
  }
}

startServer().catch((error: unknown) => {
  console.error('🔥 Unhandled error during startup:', error);
  process.exit(1);
}); 