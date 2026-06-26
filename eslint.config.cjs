const js = require('@eslint/js');
const nextPlugin = require('@next/eslint-plugin-next');
const importPlugin = require('eslint-plugin-import');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const jsxA11yPlugin = require('eslint-plugin-jsx-a11y');
const prettierPlugin = require('eslint-plugin-prettier');
const typescriptPlugin = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');
const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Use Next.js legacy config through compat layer
const nextLegacyConfigs = compat.config(nextPlugin.configs['core-web-vitals']);

module.exports = [
  ...nextLegacyConfigs,
  // 0. Global ignores for generated files
  {
    ignores: ['**/.next/**', '**/node_modules/**', '**/dist/**', '**/.pnpm-store/**', '**/pnpm-lock.yaml', '**/ormconfig.ts'],
  },

  // 1. Configuration files (no type checking, simple parser) - MUST COME FIRST
  {
    files: [
      '**/*.config.js',
      '**/*.config.*.js',
      '**/next.config.js',
      '**/tailwind.config.js',
      '**/postcss.config.js',
      '**/jest.config.js',
      '**/jest.setup.js',
    ],
    ignores: ['**/.next/**', '**/node_modules/**'],
    plugins: {
      'import': importPlugin,
      'prettier': prettierPlugin,
    },
    languageOptions: {
      globals: {
        module: 'readonly',
        exports: 'writable',
        require: 'readonly',
      },
      parser: js.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'import/order': 'off',
      'prettier/prettier': 'off',
    },
  },

  // 2. Test files configuration
  {
    files: ['**/__tests__/**/*.{js,jsx,ts,tsx}'],
    ignores: ['**/.next/**', '**/node_modules/**', '**/*.config.*', '**/jest.setup.js', '**/next.config.js', '**/tailwind.config.js', '**/postcss.config.js', '**/jest.config.js'],
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      'import': importPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
      'prettier': prettierPlugin,
      'next': nextPlugin,
    },
    languageOptions: {
      globals: {
        React: 'readonly',
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        global: 'readonly',
      },
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: true,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'next/no-html-link-for-pages': 'error',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'import/order': 'off',
      'jsx-a11y/label-has-associated-control': 'off',
      'jsx-a11y/no-noninteractive-tabindex': 'off',
    },
  },

  // 3. Script files configuration (no type checking required)
  {
    files: ['**/scripts/**/*.{js,ts}'],
    ignores: ['**/.next/**', '**/node_modules/**', '**/*.config.*', '**/jest.setup.js', '**/next.config.js', '**/tailwind.config.js', '**/postcss.config.js', '**/jest.config.js'],
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      'import': importPlugin,
      'prettier': prettierPlugin,
    },
    languageOptions: {
      globals: {
        console: 'writable',
        process: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: false,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/ban-ts-comment': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'import/order': 'off',
      'jsx-a11y/label-has-associated-control': 'off',
      'jsx-a11y/no-noninteractive-tabindex': 'off',
    },
  },

  // 4. TypeScript files configuration (main source files only)
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/.next/**', '**/node_modules/**', '**/dist/**', '**/__tests__/**', '**/*.config.*', '**/jest.setup.js', '**/next.config.js', '**/tailwind.config.js', '**/postcss.config.js', '**/jest.config.js', '**/ormconfig.ts'],
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      'import': importPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
      'prettier': prettierPlugin,
      'next': nextPlugin,
    },
    languageOptions: {
      globals: {
        React: 'readonly',
        console: 'writable',
        process: 'readonly',
        fetch: 'readonly',
      },
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: true,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'next/no-html-link-for-pages': 'error',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal'],
          pathGroups: [
            {
              pattern: 'react',
              group: 'external',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['react'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'jsx-a11y/label-has-associated-control': 'off',
      'jsx-a11y/no-noninteractive-tabindex': 'off',
    },
  },

  // 5. JavaScript/JSX files configuration (app files - TypeScript syntax)
  {
    files: ['**/app/**/*.{js,jsx}'],
    ignores: ['**/.next/**', '**/node_modules/**', '**/*.config.*', '**/jest.setup.js', '**/next.config.js', '**/tailwind.config.js', '**/postcss.config.js', '**/jest.config.js'],
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      'import': importPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
      'prettier': prettierPlugin,
      'next': nextPlugin,
    },
    languageOptions: {
      globals: {
        React: 'readonly',
        console: 'writable',
        fetch: 'readonly',
      },
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: false,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'next/no-html-link-for-pages': 'error',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/ban-ts-comment': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal'],
          pathGroups: [
            {
              pattern: 'react',
              group: 'external',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['react'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'jsx-a11y/label-has-associated-control': 'off',
      'jsx-a11y/no-noninteractive-tabindex': 'off',
    },
  },

  // 6. JavaScript files configuration (non-app files - Node.js environment)
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['**/.next/**', '**/node_modules/**', '**/app/**', '**/__tests__/**', '**/scripts/**', '**/*.config.*', '**/jest.setup.js', '**/next.config.js', '**/tailwind.config.js', '**/postcss.config.js', '**/jest.config.js', '**/ormconfig.ts'],
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      'import': importPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
      'prettier': prettierPlugin,
      'next': nextPlugin,
    },
    languageOptions: {
      globals: {
        React: 'readonly',
        console: 'writable',
        process: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        localStorage: 'readonly',
        document: 'readonly',
        window: 'readonly',
      },
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: false,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'next/no-html-link-for-pages': 'error',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/ban-ts-comment': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal'],
          pathGroups: [
            {
              pattern: 'react',
              group: 'external',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['react'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'jsx-a11y/label-has-associated-control': 'off',
      'jsx-a11y/no-noninteractive-tabindex': 'off',
    },
  },

  // 7. Base JavaScript config for other JS files
  {
    files: ['**/*.js'],
    ignores: [
      '**/.next/**',
      '**/node_modules/**',
      '**/app/**',
      '**/__tests__/**',
      '**/scripts/**',
      '**/*.config.*',
    ],
    plugins: {
      'import': importPlugin,
      'prettier': prettierPlugin,
    },
    languageOptions: {
      globals: {
        console: 'writable',
        process: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
      parser: js.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'import/order': 'off',
      'prettier/prettier': 'error',
    },
  },
];
