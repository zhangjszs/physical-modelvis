const js = require('@eslint/js');

module.exports = [
    js.configs.recommended,
    {
        ignores: ['node_modules/**', 'physics-core/dist/**', 'visualization/dist/**']
    }
];
