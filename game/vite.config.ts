import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [{
    name: 'tidebreakers-entry',
    transformIndexHtml(html) {
      const tag = '<scr' + 'ipt type=\"module\" src=\"/src/main.ts\"></scr' + 'ipt>';
      return html.replace('</body>', tag + '</body>');
    }
  }]
});
