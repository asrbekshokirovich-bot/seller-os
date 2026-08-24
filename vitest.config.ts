import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/*/test/**/*.test.ts',
      'apps/*/test/**/*.test.ts',
      // Ombor darajasidagi vositalar: seed yuklovchi, qorovullar.
      // Ular paketga tegishli emas, lekin testsiz qolmasligi kerak.
      'supabase/test/**/*.test.ts',
    ],
    passWithNoTests: false,
  },
});
