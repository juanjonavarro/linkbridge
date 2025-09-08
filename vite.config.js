import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

// Lee package.json para obtener la versión
const packageJson = JSON.parse(fs.readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
const appVersion = packageJson.version;

// Plugin para generar el manifest.json con la versión correcta
function generateManifest() {
  return {
    name: 'generate-manifest',
    generateBundle() {
      const manifestPath = resolve(__dirname, 'public', 'manifest.json');
      let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      
      manifest.version = appVersion;
      
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(manifest, null, 2)
      });
    }
  };
}


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
    plugins: [
      generateManifest()
    ],
    define: {
      __APP_DEBUG__: JSON.stringify(isDebug),
      __APP_VERSION__: JSON.stringify(appVersion),
    },
  };
});
