// Zero-dependency static server for Horang.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const EDGE_TTS = process.env.EDGE_TTS || '/tmp/ttsenv/bin/edge-tts';
const VOICES = {
  sunhi: 'ko-KR-SunHiNeural',
  injoon: 'ko-KR-InJoonNeural',
  hyunsu: 'ko-KR-HyunsuMultilingualNeural',
};
const DYN_DIR = path.join(__dirname, 'app/audio/dyn');

// Neural TTS for text that cannot be pre-generated (the learner's name, future
// dynamic content). Cached by hash so each phrase is synthesised once.
function serveTts(req, res, parsed) {
  const text = String(parsed.searchParams.get('text') || '').slice(0, 300).trim();
  const voice = VOICES[parsed.searchParams.get('voice')] || VOICES.sunhi;
  const rate = String(parsed.searchParams.get('rate') || '-6%').replace(/[^0-9%+\-]/g, '');
  if (!text) {
    res.writeHead(400, { 'Content-Type': 'text/plain' }).end('text required');
    return;
  }
  if (!fs.existsSync(EDGE_TTS)) {
    res.writeHead(503, { 'Content-Type': 'text/plain' }).end('neural TTS not installed');
    return;
  }
  const hash = crypto.createHash('sha1').update(`${voice}|${rate}|${text}`).digest('hex').slice(0, 20);
  const file = path.join(DYN_DIR, `${hash}.mp3`);
  const send = () => {
    fs.readFile(file, (err, buf) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' }).end('tts failed');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buf.length,
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
      res.end(buf);
    });
  };
  if (fs.existsSync(file)) return send();
  fs.mkdirSync(DYN_DIR, { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  const p = spawn(EDGE_TTS, ['--voice', voice, '--rate', rate, '--pitch', '-2Hz', '--text', text, '--write-media', tmp]);
  let err = '';
  p.stderr.on('data', (d) => (err += d));
  p.on('error', () => res.writeHead(503, { 'Content-Type': 'text/plain' }).end('tts spawn failed'));
  p.on('exit', (code) => {
    if (code === 0 && fs.existsSync(tmp)) {
      try {
        fs.renameSync(tmp, file);
      } catch {
        /* another request may have won the race */
      }
      send();
    } else {
      try {
        fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
      res.writeHead(502, { 'Content-Type': 'text/plain' }).end('tts error ' + err.slice(0, 120));
    }
  });
}

const server = http.createServer((req, res) => {
  const parsed = new URL(req.url || '/', 'http://localhost');
  if (parsed.pathname === '/api/tts') {
    serveTts(req, res, parsed);
    return;
  }
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let filePath = path.join(__dirname, url === '/' ? 'index.html' : url);
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      // SPA fallback
      if (!path.extname(url)) {
        fs.readFile(path.join(__dirname, 'index.html'), (e2, b2) => {
          if (e2) res.writeHead(404).end('Not found');
          else res.writeHead(200, { 'Content-Type': MIME['.html'] }).end(b2);
        });
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found: ' + url);
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(buf);
  });
});

server.listen(PORT, () => {
  console.log(`Horang running → http://localhost:${PORT}`);
});
