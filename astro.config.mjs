import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  site: 'https://denisseram.github.io/STAR-spatialsc',
  base: '/STAR-spatialsc',
});
