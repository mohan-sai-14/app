// Entry point for Google Cloud Functions
// This file loads the compiled server.js which exports the API function
// The server.js file is compiled by the build:server script

// Set production environment
process.env.NODE_ENV = 'production';

// Import and export the api function
const server = require('./dist/server.js');
exports.api = server.api; 