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
    {
        // scripts 目录的 .mjs 是 Node.js ESM 脚本, 启用 Node 全局变量
        files: ['scripts/**/*.mjs'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                process: 'readonly',
                console: 'readonly',
                URL: 'readonly',
                AbortSignal: 'readonly',
                setTimeout: 'readonly',
                setInterval: 'readonly',
                clearTimeout: 'readonly',
                clearInterval: 'readonly',
                // capture-screenshots.mjs 的 page.evaluate/waitForFunction 回调里内联浏览器代码
                document: 'readonly',
                window: 'readonly',
                requestAnimationFrame: 'readonly',
                innerWidth: 'readonly',
                innerHeight: 'readonly',
            },
        },
    },
    {
        // scripts 目录的 .cjs 是 Node.js CommonJS 脚本, 启用 require/process
        files: ['scripts/**/*.cjs'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                process: 'readonly',
                console: 'readonly',
                require: 'readonly',
                module: 'readonly',
                exports: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                document: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                // verify-*.cjs 的 page.evaluate 代码段里会用到浏览器定时回调
                requestAnimationFrame: 'readonly',
            },
        },
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
    {
        // verify-3d-scene-switching.js 是浏览器控制台注入脚本, 启用 browser 环境
        files: ['scripts/verify-3d-scene-switching.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
            },
        },
    },
);
