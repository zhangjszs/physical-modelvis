const js = require('@eslint/js');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
    js.configs.recommended,
    {
        files: ['physim/src/**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module'
            },
            globals: {
                console: 'readonly'
            }
        },
        plugins: {
            '@typescript-eslint': tsPlugin
        },
        rules: {
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-undef': 'off',
            'prefer-const': 'warn',
            'no-var': 'error'
        }
    },
    {
        files: ['js/**/*.js', 'templates/**/*.js', 'problems/**/*.js', 'test/**/*.js'],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'script',
            globals: {
                console: 'readonly',
                window: 'readonly',
                document: 'readonly',
                setTimeout: 'readonly',
                requestAnimationFrame: 'readonly',
                cancelAnimationFrame: 'readonly',
                parseFloat: 'readonly',
                THREE: 'readonly',
                PhysSim: 'readonly',
                PhysVis: 'readonly',
                SceneTemplates: 'readonly',
                BaiyinSanmoProblem: 'readonly',
                VelocitySelectorProblem: 'readonly',
                ParallelPlateElectricProblem: 'readonly',
                Renderer3D: 'readonly',
                Simulator: 'readonly',
                UIManager: 'readonly',
                App: 'readonly',
                module: 'readonly',
                require: 'readonly',
                __dirname: 'readonly'
            }
        },
        rules: {
            'no-redeclare': 'off',
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'prefer-const': 'warn',
            'no-var': 'error'
        }
    },
    {
        ignores: ['physim/dist/**', 'physim/node_modules/**', 'node_modules/**']
    }
];
