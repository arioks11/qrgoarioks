// Tiny static server for the built site (no install needed, Node 18+).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'site');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.normalize(path.join(root, p));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
});
let port = +process.env.PORT || 8080;
server.on('error', e => { if (e.code === 'EADDRINUSE' && port < 8100) { port++; server.listen(port); } else { console.error(e.message); process.exit(1); } });
server.on('listening', () => {
  const url = 'http://localhost:' + port;
  console.log('\nQRGO is running at ' + url + '\nPress Ctrl+C to stop.\n');
  if (!process.env.NO_OPEN) exec(process.platform === 'win32' ? `start "" ${url}` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`);
});
server.listen(port);
