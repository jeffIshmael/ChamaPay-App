const app = require("./app");
const PORT = process.env.PORT || 3000;
// const { initializeCronJobs } = require("./utils/cronJobs");

async function startServer() {
  try {
    
    // Then start the server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 Shutting down gracefully...');
      server.close(() => {
        console.log('💤 Server terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('🔥 Failed to initialize:', error);
    process.exit(1); // Exit with error code
  }
}

startServer();