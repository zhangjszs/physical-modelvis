import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';

// 显式声明各运行环境所需的全局变量 (不引入未在 package.json 声明的 globals 包)
const NODE_GLOBALS = {
    require: 'readonly',
    module: 'writable',
    exports: 'writable',
    __dirname: 'readonly',
    __filename: 'readonly',
    process: 'readonly',
    console: 'readonly',
    Buffer: 'readonly',
    global: 'readonly',
    URL: 'readonly',
    TextEncoder: 'readonly',
    TextDecoder: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
    setImmediate: 'readonly',
    clearImmediate: 'readonly',
    queueMicrotask: 'readonly',
    structuredClone: 'readonly',
};

// verify-3d-scene-switching.js 是粘贴进浏览器 Console 执行的注入脚本, 依赖 DOM/计时器全局
const BROWSER_GLOBALS = {
    window: 'readonly',
    document: 'readonly',
    console: 'readonly',
    location: 'readonly',
    navigator: 'readonly',
    history: 'readonly',
    localStorage: 'readonly',
    sessionStorage: 'readonly',
    requestAnimationFrame: 'readonly',
    cancelAnimationFrame: 'readonly',
    customElements: 'readonly',
    fetch: 'readonly',
    alert: 'readonly',
    confirm: 'readonly',
    prompt: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
};

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
    // 测试代码放宽 no-explicit-any (warn 而非 off, 保证仍可见); 生产源码严格度不变
    {
        files: ['physics-core/tests/**/*.ts', 'visualization/tests/**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
        },
    },
    // Node CommonJS 脚本 (.cjs): require/module/process 等可用
    {
        files: ['scripts/**/*.cjs'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: NODE_GLOBALS,
        },
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
    // Node ES Module 脚本 (.mjs): 无 require/__dirname, 仅 Node 全局
    {
        files: ['scripts/**/*.mjs'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: NODE_GLOBALS,
        },
        rules: {
            '@typescript-eslint/no-require-imports': 'error',
        },
    },
    // 浏览器 Console 注入脚本: DOM 全局
    {
        files: ['scripts/verify-3d-scene-switching.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: BROWSER_GLOBALS,
        },
    },
);
