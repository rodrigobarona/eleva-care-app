module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'next/core-web-vitals',
    'prettier',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', '@typescript-eslint'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',

    // Custom rule to prevent direct workflow.trigger() calls
    'no-restricted-syntax': [
      'error',
      {
        selector:
          'CallExpression[callee.type="MemberExpression"][callee.property.name="trigger"][callee.object.name=/.*[Ww]orkflow$/]',
        message:
          '🚫 Direct workflow.trigger() calls cause 401 authentication errors. Use triggerWorkflow() from @/app/utils/novu instead. See: docs/novu-integration-guide.md',
      },
      {
        selector:
          'CallExpression[callee.type="MemberExpression"][callee.property.name="trigger"][callee.object.type="Identifier"]',
        message:
          '⚠️  Potential direct workflow trigger detected. If this is a Novu workflow, use triggerWorkflow() from @/app/utils/novu instead.',
      },
    ],

    // Encourage proper Novu imports
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@/config/novu',
            importNames: ['*Workflow'],
            message:
              '🔄 Import Novu workflows for definition only. For triggering, use triggerWorkflow() from @/app/utils/novu',
          },
        ],
        patterns: [
          {
            group: ['@/config/novu'],
            message:
              '📚 Importing from @/config/novu? Remember: workflows are for definition, use @/app/utils/novu for triggering',
          },
        ],
      },
    ],
  },
};
