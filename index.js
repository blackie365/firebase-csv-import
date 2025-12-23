const app = require('./src/api/app');

if (require.main === module) {
    const PORT = process.env.PORT || 3000;

    const server = app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
        server.close(() => {
            console.log('Server shut down gracefully');
            process.exit(0);
        });
    });
}

// Export for testing
module.exports = app;
