import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const removeCrossorigin = () => {
  return {
    name: 'no-attribute-crossorigin',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(/ crossorigin/g, '');
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), removeCrossorigin()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
