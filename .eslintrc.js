module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    // Turn off stricter rules temporarily until we can fix them all
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true,
    }],
    'react/no-unescaped-entities': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    'react-hooks/exhaustive-deps': 'warn',
  },
  // You can ignore certain files or patterns
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'out/',
    'public/'
  ]
}; 