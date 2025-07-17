import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {  
  const isDebug = mode === 'dev';

  return {
    build: {
      outDir: 'dist',
      sourcemap: true, 
      rollupOptions: {
        input: {
          newtab: resolve(__dirname, 'src/newtab/newtab.html')
        },
        output: {
          entryFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        }
      },
      minify: false,
    },
    publicDir: 'public',
    define: {
      __APP_DEBUG__: JSON.stringify(isDebug),
    },
  };
});
