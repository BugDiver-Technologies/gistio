module.exports = {
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['./tests/setup.js'],
  transform: {
    '\\.gs$': './tests/gsTransform.js',
  },
};
