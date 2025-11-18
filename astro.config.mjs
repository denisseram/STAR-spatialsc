import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  site: 'https://denisseram.github.io',
  base: '/star-spatialsc',
});
