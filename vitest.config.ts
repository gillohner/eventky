import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'happy-dom',
        globals: true,
        setupFiles: ['./lib/test-utils/setup.ts'],
        include: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
        exclude: ['node_modules', '.next', 'e2e'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['lib/**', 'hooks/**', 'stores/**'],
            exclude: [
                '**/*.d.ts',
                '**/index.ts',
                'lib/test-utils/**',
                '**/__tests__/**',
            ],
            thresholds: {
                // Start with lower thresholds, increase as coverage improves
                statements: 50,
                branches: 40,
                functions: 50,
                lines: 50,
            },
        },
        // Reporter for flagging unexpected behaviors
        reporters: ['verbose'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
        },
    },
})
