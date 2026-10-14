import nextConfig from 'eslint-config-next';
import tseslint from 'typescript-eslint';
import security from 'eslint-plugin-security';

const config = [
  ...nextConfig,
  ...tseslint.configs.recommended,
  security.configs.recommended,
  {
    rules: {
      'no-console': ['error', { allow: ['error'] }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'security/detect-object-injection': 'off',
    },
  },
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'src/lib/api/schema.d.ts',
      'coverage/**',
      'playwright-report/**',
    ],
  },
];

export default config;
