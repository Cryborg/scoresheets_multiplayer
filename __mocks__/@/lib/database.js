// Mock tursoClient for testing
const tursoClient = {
  execute: jest.fn(),
};

module.exports = {
  tursoClient,
  db: tursoClient, // New export for Laravel architecture
};