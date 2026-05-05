import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'three';
          if (id.includes('/node_modules/lucide/')) return 'lucide';
          if (id.includes('/src/data/')) return 'atlas-data';
          return undefined;
        }
      }
    }
  }
});
