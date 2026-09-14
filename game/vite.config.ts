import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [{
    name: 'tidebreakers-entry',
    transformIndexHtml(html) {
      return {
        html,
        tags: [{ tag: 'script', attrs: { type: 'module', src: './src/main.ts' }, injectTo: 'body' }]
      };
    }
  }]
});
