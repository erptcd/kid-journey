// Build: node build.mjs  →  dist/index.html (một file, mở trực tiếp hoặc đưa lên GitHub Pages)
import { build } from 'esbuild';
import fs from 'fs';
const r = await build({ entryPoints: ['src/game.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', legalComments: 'none' });
const js = r.outputFiles[0].text;
if (js.toLowerCase().includes('</script')) throw new Error('script tag in bundle');
fs.mkdirSync('dist', { recursive: true });
const html = fs.readFileSync('index.src.html', 'utf8').replace('<!--APP-->', () => '<script>' + js + '</script>');
fs.writeFileSync('dist/index.html', html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' KB');
