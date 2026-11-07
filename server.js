/**
 * Simple Static & TTS Proxy Server for VocalFlow AI
 * Hỗ trợ phát tĩnh và endpoint /api/tts tải file MP3 không giới hạn
 * Chạy với Node.js thuần, 0 dependency!
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Khởi tạo Ytdl cho YouTube
let YtdlClass = null;
try {
  const distube = require('@distube/ytdl-core');
  YtdlClass = distube.Ytdl || distube;
} catch (e) {
  console.warn("Chưa nạp @distube/ytdl-core:", e.message);
}

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4'
};

/**
 * Tách văn bản thành các đoạn nhỏ dưới 160 ký tự theo ngắt câu tự nhiên
 */
function splitTextIntoChunks(text, maxLength = 160) {
  if (!text) return [];
  const rawSentences = text
    .replace(/([.?!;\n]+)/g, "$1|")
    .split("|")
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const chunks = [];
  let current = "";

  for (const sent of rawSentences) {
    if ((current + " " + sent).trim().length <= maxLength) {
      current = (current + " " + sent).trim();
    } else {
      if (current) chunks.push(current);
      if (sent.length > maxLength) {
        const words = sent.split(" ");
        let sub = "";
        for (const w of words) {
          if ((sub + " " + w).trim().length <= maxLength) {
            sub = (sub + " " + w).trim();
          } else {
            if (sub) chunks.push(sub);
            sub = w;
          }
        }
        current = sub;
      } else {
        current = sent;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text];
}

/**
 * Tải 1 đoạn âm thanh từ Google TTS
 */
function fetchTTSChunk(text, lang = 'vi') {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(text);
    const targetUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encoded}`;

    const req = https.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Google TTS status code: ${res.statusCode}`));
      }
      const data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    });

    req.on('error', reject);
    req.setTimeout(12000, () => {
      req.destroy();
      reject(new Error('Yêu cầu Google TTS quá thời gian chờ (timeout)'));
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // Xử lý CORS headers cho mọi request (kể cả khi gọi từ file:// hoặc localhost khác)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // 1. ENDPOINT TỔNG HỢP & TẢI FILE MP3: /api/tts
  if (parsedUrl.pathname === '/api/tts') {
    const text = (parsedUrl.query.text || '').trim();
    const lang = parsedUrl.query.lang || 'vi';

    if (!text) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Tham số text là bắt buộc' }));
    }

    try {
      const chunks = splitTextIntoChunks(text, 160);
      const audioBuffers = [];

      for (const chunk of chunks) {
        const buf = await fetchTTSChunk(chunk, lang);
        audioBuffers.push(buf);
      }

      const combinedAudio = Buffer.concat(audioBuffers);
      const filename = `vocalflow-tts-${Date.now()}.mp3`;

      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': combinedAudio.length,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      });

      return res.end(combinedAudio);

    } catch (err) {
      console.error('Lỗi tổng hợp TTS:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Không thể tổng hợp âm thanh: ' + err.message }));
    }
  }

  // 2. ENDPOINT PHÂN TÍCH & GIẢI MÃ LINK VIDEO: /api/resolve-video (TikTok, YouTube, Direct MP4)
  if (parsedUrl.pathname === '/api/resolve-video') {
    const videoUrl = (parsedUrl.query.url || '').trim();
    if (!videoUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Vui lòng cung cấp link video qua tham số url!' }));
    }

    try {
      // A. Phân tích Link TikTok (vm.tiktok.com, vt.tiktok.com, tiktok.com/@user/video/...)
      if (videoUrl.includes('tiktok.com')) {
        const formData = new URLSearchParams();
        formData.append('url', videoUrl);

        const tikRes = await fetch('https://www.tikwm.com/api/', {
          method: 'POST',
          body: formData,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        const tikData = await tikRes.json().catch(() => ({}));
        if (tikData.code === 0 && tikData.data && (tikData.data.play || tikData.data.wmplay)) {
          let directPlay = tikData.data.play || tikData.data.wmplay;
          if (!directPlay.startsWith('http')) {
            directPlay = 'https://www.tikwm.com' + directPlay;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: true,
            type: 'tiktok',
            title: tikData.data.title || 'Video TikTok',
            duration: tikData.data.duration || 0,
            originalUrl: directPlay,
            videoUrl: `/api/proxy-video?url=${encodeURIComponent(directPlay)}`
          }));
        } else {
          throw new Error(tikData.msg || "Không thể phân tích video TikTok. Hãy kiểm tra lại đường dẫn!");
        }
      }

      // B. Phân tích Link YouTube (youtube.com, youtu.be, shorts)
      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        if (!YtdlClass) {
          throw new Error("Mô-đun xử lý YouTube chưa sẵn sàng trên máy chủ.");
        }
        const yt = new YtdlClass();
        const info = await yt.getInfo(videoUrl);
        const videoFormats = (info.formats || []).filter(f => f.hasVideo && f.url);
        if (videoFormats.length === 0) {
          throw new Error("Không tìm thấy luồng video khả dụng trên YouTube.");
        }

        // Ưu tiên format có video <= 1080p, ưu tiên container mp4
        videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0));
        const chosen = videoFormats.find(f => f.container === 'mp4' && (f.height || 0) <= 1080) || videoFormats[0];

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          type: 'youtube',
          title: info.videoDetails.title || 'Video YouTube',
          duration: parseInt(info.videoDetails.lengthSeconds, 10) || 0,
          quality: chosen.qualityLabel,
          originalUrl: chosen.url,
          videoUrl: `/api/proxy-video?url=${encodeURIComponent(chosen.url)}`
        }));
      }

      // C. Link Video Trực Tiếp (Direct MP4, WebM, etc.)
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: true,
        type: 'direct',
        title: 'Video Web Trực Tiếp',
        originalUrl: videoUrl,
        videoUrl: `/api/proxy-video?url=${encodeURIComponent(videoUrl)}`
      }));

    } catch (err) {
      console.error("Lỗi resolve video:", err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: false,
        error: err.message || "Không thể tải video từ đường dẫn này."
      }));
    }
  }

  // 3. ENDPOINT PROXY LUỒNG VIDEO TRÁNH CORS: /api/proxy-video
  if (parsedUrl.pathname === '/api/proxy-video') {
    const rawTarget = parsedUrl.query.url;
    if (!rawTarget) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Thiếu tham số url' }));
    }

    try {
      const targetUrl = decodeURIComponent(rawTarget);
      const parsedTarget = new URL(targetUrl);
      const clientHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': targetUrl.includes('googlevideo') ? 'https://www.youtube.com/' : (targetUrl.includes('tiktok') ? 'https://www.tiktok.com/' : targetUrl)
      };

      if (req.headers.range) {
        clientHeaders['Range'] = req.headers.range;
      }

      const transport = parsedTarget.protocol === 'http:' ? http : https;
      const proxyReq = transport.get(targetUrl, { headers: clientHeaders }, (proxyRes) => {
        // Xử lý chuyển hướng 301, 302
        if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
          const redirectUrl = proxyRes.headers.location;
          res.writeHead(302, { 'Location': `/api/proxy-video?url=${encodeURIComponent(redirectUrl)}` });
          return res.end();
        }

        const outHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Range, Content-Type',
          'Content-Type': proxyRes.headers['content-type'] || 'video/mp4',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600'
        };

        if (proxyRes.headers['content-length']) outHeaders['Content-Length'] = proxyRes.headers['content-length'];
        if (proxyRes.headers['content-range']) outHeaders['Content-Range'] = proxyRes.headers['content-range'];

        res.writeHead(proxyRes.statusCode || 200, outHeaders);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        console.error('Lỗi proxy video stream:', err);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Lỗi tải luồng video: ' + err.message }));
        }
      });

      req.on('close', () => {
        proxyReq.destroy();
      });

    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Đường dẫn video không hợp lệ: ' + e.message }));
    }
    return;
  }

  // 4. PHỤC VỤ FILE TĨNH (HTML, CSS, JS)
  let reqPath = parsedUrl.pathname;
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, reqPath);

  // Ngăn chặn Path Traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 VocalFlow AI TTS đang chạy tại: http://localhost:${PORT}`);
  console.log(`🎧 API Tải Audio: http://localhost:${PORT}/api/tts?text=Xin+chao&lang=vi`);
  console.log(`📂 Thư mục: ${PUBLIC_DIR}`);
  console.log(`======================================================\n`);
});
