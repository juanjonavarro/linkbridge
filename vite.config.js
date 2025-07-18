import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {  
  const isDebug = mode === 'dev';

  return {
    build: {
      outDir: 'dist',
      sourcemap: mode === 'prod' ? false : true,
      rollupOptions: {
        input: {
          newtab: resolve(__dirname, 'src/newtab/newtab.html')
        },
        output: {
          entryFileNames: mode === 'dev' ? 'assets/[name].js' : 'assets/[name].[hash].js',
          assetFileNames: mode === 'dev' ? 'assets/[name].[ext]' : 'assets/[name].[hash].[ext]',
        }
      },
      minify: mode === 'prod' ? 'esbuild' : false,
    },
    publicDir: 'public',
    define: {
      __APP_DEBUG__: JSON.stringify(isDebug),
    },
  };
});
