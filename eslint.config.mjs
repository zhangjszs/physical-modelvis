import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';

export default tseslint.config(
    {
        ignores: [
            'node_modules/**',
            '**/node_modules/**',
            '**/dist/**',
            '**/coverage/**',
            '.scratch/**',
            '**/*.config.*',
            'scripts/**',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
        },
        plugins: {
            'unused-imports': unusedImports,
        },
        rules: {
            '@typescript-eslint/no-unused-vars': 'off',
            'unused-imports/no-unused-imports': 'error',
            'unused-imports/no-unused-vars': [
                'error',
                {
                    args: 'none',
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
        },
    },
    {
        // 测试代码用 any 访问 physics-core 的松散通道 (extra/charts) 属合理取舍,
        // 故在 tests 目录把 no-explicit-any 降级为 warn —— 既能被看见, 又不阻塞门禁。
        files: ['**/tests/**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
        },
    },
);
