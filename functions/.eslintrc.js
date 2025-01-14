module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
  ],
  parserOptions: {
    ecmaVersion: 2018,
  },
  rules: {
    "max-len": ["error", { "code": 120 }],
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_|next" }],
  },
};
