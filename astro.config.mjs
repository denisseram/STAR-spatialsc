import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  site: 'https://denisseram.github.io/star-spatialsc',
  base: '/star-spatialsc',
});
