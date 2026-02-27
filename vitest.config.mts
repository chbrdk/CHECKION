import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**/*.ts'],
    exclude: ['node_modules', '.next', 'lib/saliency-fusion.test.ts', 'lib/scanpath.test.ts', 'lib/db/*.test.ts', 'lib/geo-eeat/*.test.ts', 'lib/domain-graph-data.test.ts', 'lib/page-index.test.ts'],
    globals: true,
  },
});
