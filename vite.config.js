import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

// Read package.json to get the version
const packageJson = JSON.parse(fs.readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
const appVersion = packageJson.version;
const appVersionName = packageJson.version_name;

// Plugin to generate manifest.json with the correct version
function generateManifest() {
  return {
    name: 'generate-manifest',
    generateBundle() {
      const manifestPath = resolve(__dirname, 'public', 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

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
    root: 'src',
    base: './',
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      sourcemap: mode === 'prod' ? false : true,
      rollupOptions: {
        output: {
          entryFileNames: mode === 'dev' ? 'assets/[name].js' : 'assets/[name].[hash].js',
          assetFileNames: mode === 'dev' ? 'assets/[name].[ext]' : 'assets/[name].[hash].[ext]',
        }
      },
      minify: mode === 'prod' ? 'esbuild' : false,
    },
    publicDir: '../public',
    plugins: [
      generateManifest()
    ],
    define: {
      __APP_DEBUG__: JSON.stringify(isDebug),
      __APP_VERSION__: JSON.stringify(appVersion),
      __APP_VERSION_NAME__: JSON.stringify(appVersionName),
    },
  };
});
