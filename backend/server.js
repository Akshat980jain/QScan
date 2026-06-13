const app = require('./app');

const PORT = process.env.PORT || 5000;

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m'
};

const server = app.listen(PORT, () => {
  const line = (content) => `  ${colors.cyan}│${colors.reset} ${content}`;
  
  console.log('\n' + line(''));
  console.log(line(`  ${colors.bold}${colors.magenta}🚀 SERVER INITIALIZED${colors.reset}`));
  console.log(line(`  ${colors.gray}─────────────────────────────────────────────────${colors.reset}`));
  console.log(line(`  ${colors.bold}${colors.white}Port:         ${colors.reset}${colors.cyan}${PORT}${colors.reset}`));
  console.log(line(`  ${colors.bold}${colors.white}Environment:  ${colors.reset}${colors.cyan}${process.env.NODE_ENV || 'development'}${colors.reset}`));
  console.log(line(`  ${colors.bold}${colors.white}Frontend URL: ${colors.reset}${colors.cyan}${process.env.FRONTEND_URL || 'http://localhost:5173'}${colors.reset}`));
  console.log(line(''));
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});