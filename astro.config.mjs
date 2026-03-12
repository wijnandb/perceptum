import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://perceptum.nl',
  integrations: [
    tailwind(),
    sitemap({
      filter: (page) => !page.includes('/notes/'),
    }),
  ],
  output: 'static',
});
