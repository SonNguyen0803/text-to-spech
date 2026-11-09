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
let YtdlClient = null;
try {
  const distube = require('@distube/ytdl-core');
  YtdlClass = distube.Ytdl || distube;
  YtdlClient = distube.Client || {};
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

/**
 * Giải mã ký tự HTML entities thành chuỗi văn bản sạch
 */
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Giải mã unicode và ký tự thoát trong URL từ Facebook JSON
 */
function unescapeFbUrl(str) {
  if (!str) return '';
  return str
    .replace(/\\u0025/g, '%')
    .replace(/\\u0026/g, '&')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&');
}

/**
 * Bóc tách và giải mã link Facebook (Reels, Watch, Video bài viết, Share link)
 */
async function resolveFacebookVideo(videoUrl) {
  const match = videoUrl.match(/https?:\/\/[^\s]+/);
  const cleanUrl = match ? match[0] : videoUrl;

  // 1. Ưu tiên bóc tách trực tiếp từ trang Facebook công khai
  try {
    const res = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000)
    });

    let html = await res.text();
    html = html.split('&quot;').join('"').split('&amp;').join('&');

    const hdMatch = html.match(/"browser_native_hd_url":"(.*?)"/) ||
                    html.match(/"playable_url_quality_hd":"(.*?)"/) ||
                    html.match(/hd_src\s*:\s*"([^"]*)"/);

    const sdMatch = html.match(/"browser_native_sd_url":"(.*?)"/) ||
                    html.match(/"playable_url":"(.*?)"/) ||
                    html.match(/sd_src\s*:\s*"([^"]*)"/) ||
                    html.match(/<meta\s+property="og:video(?::url)?"\s+content="(.*?)"/i);

    const titleMatch = html.match(/<meta\s+name="description"\s+content="(.*?)"/i) ||
                       html.match(/<meta\s+property="og:title"\s+content="(.*?)"/i) ||
                       html.match(/<title>(.*?)<\/title>/i);

    const rawHd = hdMatch ? unescapeFbUrl(hdMatch[1]) : '';
    const rawSd = sdMatch ? unescapeFbUrl(sdMatch[1]) : '';
    const chosenUrl = rawHd || rawSd;

    if (chosenUrl && chosenUrl.startsWith('http')) {
      let rawTitle = titleMatch ? titleMatch[1] : 'Video Facebook';
      rawTitle = decodeHtmlEntities(rawTitle).replace(/\s*\|\s*Facebook$/i, '').trim();
      return {
        success: true,
        type: 'facebook',
        quality: rawHd ? 'HD' : 'SD',
        title: rawTitle || 'Video Facebook',
        originalUrl: chosenUrl,
        videoUrl: `/api/proxy-video?url=${encodeURIComponent(chosenUrl)}`
      };
    }
  } catch (err) {
    console.warn('Scraping Facebook trực tiếp thất bại, chuyển sang API dự phòng:', err.message);
  }

  // 2. Dự phòng qua cổng API giải mã Facebook
  try {
    const apiRes = await fetch('https://backend1.tioo.eu.org/fbdown?url=' + encodeURIComponent(cleanUrl), {
      signal: AbortSignal.timeout(8000)
    });
    const apiData = await apiRes.json().catch(() => ({}));
    if (apiData && (apiData.HD || apiData.Normal_video)) {
      const chosenUrl = apiData.HD || apiData.Normal_video;
      return {
        success: true,
        type: 'facebook',
        quality: apiData.HD ? 'HD' : 'SD',
        title: apiData.title || 'Video Facebook',
        originalUrl: chosenUrl,
        videoUrl: `/api/proxy-video?url=${encodeURIComponent(chosenUrl)}`
      };
    }
  } catch (err) {
    console.warn('API Facebook dự phòng thất bại:', err.message);
  }

  throw new Error("Không thể trích xuất video Facebook từ link này. Hãy đảm bảo video ở chế độ Công khai (Public).");
}

/**
 * Bóc tách và giải mã link Douyin (抖音 - v.douyin.com, douyin.com/video/...)
 */
async function resolveDouyinVideo(videoUrl) {
  const match = videoUrl.match(/https?:\/\/[^\s]+/);
  const cleanUrl = match ? match[0] : videoUrl;

  // 1. Thử qua các API giải mã Douyin không watermark
  const douyinApis = [
    `https://zj.v.api.aa1.cn/api/douyinjx/?text=${encodeURIComponent(cleanUrl)}`,
    `https://backend1.tioo.eu.org/douyin?url=${encodeURIComponent(cleanUrl)}`
  ];

  for (const ep of douyinApis) {
    try {
      const res = await fetch(ep, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(7000)
      });
      const data = await res.json().catch(() => ({}));

      // Tuyến A: zj.v.api.aa1.cn
      if (data.code === 200 && data.data && data.data.video_Url && data.data.video_Url.startsWith('http')) {
        const direct = data.data.video_Url;
        return {
          success: true,
          type: 'douyin',
          title: data.data.desc || 'Video Douyin (抖音)',
          originalUrl: direct,
          videoUrl: `/api/proxy-video?url=${encodeURIComponent(direct)}`
        };
      }

      // Tuyến B: backend1
      if (data.status && data.result && (data.result.video || data.result.nowatermark || data.result.play)) {
        const direct = data.result.nowatermark || data.result.video || data.result.play;
        return {
          success: true,
          type: 'douyin',
          title: data.result.title || data.result.desc || 'Video Douyin (抖音)',
          originalUrl: direct,
          videoUrl: `/api/proxy-video?url=${encodeURIComponent(direct)}`
        };
      }
    } catch (e) {
      console.warn('Lỗi gọi API Douyin tuyến', ep.slice(0, 35), e.message);
    }
  }

  // 2. Bóc tách trực tiếp theo redirect và RENDER_DATA / aweme_id
  try {
    const headRes = await fetch(cleanUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000)
    });

    const finalUrl = headRes.url;
    const html = await headRes.text();

    const renderMatch = html.match(/<script id="RENDER_DATA" type="application\/json">(.*?)<\/script>/);
    if (renderMatch) {
      try {
        const decoded = JSON.parse(decodeURIComponent(renderMatch[1]));
        const jsonStr = JSON.stringify(decoded);
        const urlMatch = jsonStr.match(/https?:\/\/[^"]*(?:aweme\.snssdk\.com|douyinvod\.com|douyinpic\.com)[^"]*play[^"]*/);
        if (urlMatch) {
          const direct = urlMatch[0].replace(/playwm/g, 'play');
          return {
            success: true,
            type: 'douyin',
            title: 'Video Douyin (抖音)',
            originalUrl: direct,
            videoUrl: `/api/proxy-video?url=${encodeURIComponent(direct)}`
          };
        }
      } catch (e) {}
    }

    const idMatch = finalUrl.match(/\/video\/(\d+)/) || finalUrl.match(/modal_id=(\d+)/);
    if (idMatch) {
      const awemeId = idMatch[1];
      const direct = `https://aweme.snssdk.com/aweme/v1/play/?video_id=${awemeId}&ratio=1080p&line=0`;
      return {
        success: true,
        type: 'douyin',
        title: `Video Douyin #${awemeId}`,
        originalUrl: direct,
        videoUrl: `/api/proxy-video?url=${encodeURIComponent(direct)}`
      };
    }
  } catch (err) {
    console.warn('Lỗi trích xuất Douyin trực tiếp:', err.message);
  }

  throw new Error("Không thể phân tích video Douyin. Hãy kiểm tra lại link chia sẻ từ Douyin (ví dụ: https://v.douyin.com/... hoặc https://www.douyin.com/video/...)");
}

/**
 * Lấy cookie YouTube từ biến môi trường hoặc file cookies.txt (nếu có)
 */
function getYouTubeCookie() {
  const envCookie = (process.env.YOUTUBE_COOKIE || process.env.YT_COOKIE || '').trim();
  if (envCookie) return envCookie;

  try {
    const cookiesFile = path.join(__dirname, 'cookies.txt');
    if (fs.existsSync(cookiesFile)) {
      return fs.readFileSync(cookiesFile, 'utf8').trim();
    }
  } catch (e) {}

  return '';
}

/**
 * Bóc tách video YouTube qua Invidious Open Relay Network
 * Giúp bypass 100% chặn IP datacenter trên Render.com mà KHÔNG CẦN Cookie
 */
async function resolveYouTubeViaInvidious(videoId) {
  const instances = [
    'https://yt.chocolatemoo53.com',
    'https://inv.nadeko.net',
    'https://invidious.nerdvpn.de',
    'https://invidious.tiekoetter.com',
    'https://invidious.schenkl.is'
  ];

  // Thử động lấy thêm instance từ danh sách chính thức nếu có thể
  try {
    const listRes = await fetch('https://api.invidious.io/instances.json?sort_by=health', { signal: AbortSignal.timeout(3000) });
    if (listRes.ok) {
      const list = await listRes.json();
      const dyn = list.filter(i => i[1] && i[1].type === 'https' && i[1].api === true).map(i => i[1].uri);
      for (const d of dyn) {
        if (!instances.includes(d)) instances.push(d);
      }
    }
  } catch (e) {}

  for (const uri of instances) {
    try {
      // Yêu cầu Invidious proxy trực tiếp luồng qua tham số ?local=true để tránh ràng buộc IP của Google Video
      const res = await fetch(`${uri}/api/v1/videos/${videoId}?local=true`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) continue;

      const data = await res.json();
      const allFormats = (data.adaptiveFormats || []).concat(data.formatStreams || []).filter(f => f.type?.includes('mp4') && f.url);
      if (allFormats.length === 0) continue;

      // Ưu tiên H.264 (avc1) từ 480p đến 1080p
      const avcFormats = allFormats.filter(f => (f.type || '').includes('avc1') || !(f.type || '').includes('av01'));
      avcFormats.sort((a, b) => (parseInt(b.resolution || b.qualityLabel, 10) || 0) - (parseInt(a.resolution || a.qualityLabel, 10) || 0));

      const chosen = avcFormats.find(f => {
        const res = parseInt(f.resolution || f.qualityLabel, 10) || 0;
        return res <= 1080 && res >= 480;
      }) || avcFormats[0] || allFormats[0];

      let streamUrl = chosen.url;
      if (streamUrl.startsWith('/')) {
        streamUrl = uri.replace(/\/+$/, '') + streamUrl;
      }

      return {
        success: true,
        type: 'youtube',
        videoId: videoId,
        title: data.title || 'Video YouTube',
        duration: parseInt(data.lengthSeconds, 10) || 0,
        quality: chosen.qualityLabel || chosen.resolution || '720p',
        originalUrl: streamUrl,
        videoUrl: `/api/proxy-video?url=${encodeURIComponent(streamUrl)}`
      };
    } catch (err) {
      console.warn(`Thử bóc tách qua Invidious relay [${uri}] thất bại:`, err.message);
    }
  }

  throw new Error("Không thể kết nối tới các cổng giải mã relay YouTube mở.");
}

/**
 * Bóc tách và giải mã link YouTube (youtube.com, youtu.be, shorts, hoặc ID video)
 * Tối ưu chống chặn bot và hỗ trợ đa client (Tv, VisionOS, WebEmbedded) & xác thực Cookie trên Cloud/Render.com
 */
async function resolveYouTubeVideo(videoUrl) {
  // Chuẩn hóa nếu người dùng chỉ dán ID 11 ký tự hoặc link không có protocol
  let normalizedUrl = videoUrl.trim();
  let ytId = '';
  if (/^[a-zA-Z0-9_-]{11}$/.test(normalizedUrl)) {
    ytId = normalizedUrl;
    normalizedUrl = `https://www.youtube.com/watch?v=${normalizedUrl}`;
  } else {
    const idMatch = normalizedUrl.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (idMatch) ytId = idMatch[1];
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
  }

  const cookieStr = getYouTubeCookie();
  const hasValidCookie = cookieStr && (cookieStr.includes('SAPISID') || cookieStr.includes('__Secure-3PAPISID') || cookieStr.includes('.youtube.com'));

  // Tuyến 1: Thử các client Ytdl nội bộ
  if (YtdlClass) {
    const clientCandidates = [
      (YtdlClient && YtdlClient.Tv) ? YtdlClient.Tv : 'tv',
      (YtdlClient && YtdlClient.VisionOS) ? YtdlClient.VisionOS : 'visionos',
      (YtdlClient && YtdlClient.WebEmbedded) ? YtdlClient.WebEmbedded : 'web_embedded'
    ];

    for (const clientName of clientCandidates) {
      try {
        const opts = { clients: [clientName] };
        if (hasValidCookie) opts.cookie = cookieStr;
        const yt = new YtdlClass(opts);
        const info = await yt.getInfo(normalizedUrl);
        const videoFormats = (info.formats || []).filter(f => f.hasVideo && f.url);
        if (videoFormats.length > 0) {
          const mp4Formats = videoFormats.filter(f => f.container === 'mp4');
          mp4Formats.sort((a, b) => (b.height || 0) - (a.height || 0));
          const chosen = mp4Formats.find(f => (f.height || 0) <= 1080 && (f.height || 0) >= 480) || mp4Formats[0] || videoFormats[0];

          const resolvedId = (info.videoDetails && info.videoDetails.id) || ytId;
          return {
            success: true,
            type: 'youtube',
            videoId: resolvedId,
            title: (info.videoDetails && info.videoDetails.title) || 'Video YouTube',
            duration: parseInt((info.videoDetails && info.videoDetails.lengthSeconds) || 0, 10),
            quality: chosen.qualityLabel || `${chosen.height || 720}p`,
            originalUrl: chosen.url,
            videoUrl: `/api/proxy-video?yt=${encodeURIComponent(resolvedId)}`
          };
        }
      } catch (err) {
        console.warn(`Giải mã YouTube với client nội bộ ${clientName} thất bại:`, err.message);
      }
    }
  }

  // Tuyến 2 (TỰ ĐỘNG BYPASS TRÊN CLOUD / RENDER.COM KHÔNG CẦN COOKIE):
  // Dùng mạng lưới relay Invidious độc lập để bóc tách luồng trực tiếp
  if (ytId) {
    console.log(`Đang kích hoạt cơ chế bypass đám mây cho video YouTube #${ytId}...`);
    try {
      const relayData = await resolveYouTubeViaInvidious(ytId);
      return relayData;
    } catch (relayErr) {
      console.warn("Bypass qua relay Invidious thất bại:", relayErr.message);
    }
  }

  // Khi toàn bộ client và relay đều thất bại
  throw new Error(
    `Không thể giải mã YouTube trên máy chủ Cloud do YouTube chặn IP datacenter. ` +
    `Khắc phục: Thêm biến môi trường YOUTUBE_COOKIE trên Render Dashboard, hoặc dùng video Facebook / Douyin / TikTok / tải trực tiếp video từ máy tính lên!`
  );
}

  // 2. ENDPOINT PHÂN TÍCH & GIẢI MÃ LINK VIDEO: /api/resolve-video (Facebook, Douyin, TikTok, YouTube, Direct MP4)
  if (parsedUrl.pathname === '/api/resolve-video') {
    let videoUrl = (parsedUrl.query.url || '').trim();
    if (!videoUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Vui lòng cung cấp link video qua tham số url!' }));
    }

    // Tự động trích xuất URL nếu người dùng dán cả đoạn văn bản chia sẻ
    const urlInText = videoUrl.match(/https?:\/\/[^\s]+/);
    if (urlInText) {
      videoUrl = urlInText[0];
    }

    try {
      const lowerUrl = videoUrl.toLowerCase();

      // A. Phân tích Link Facebook (facebook.com, fb.watch, fb.com)
      if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch') || lowerUrl.includes('fb.com')) {
        const fbData = await resolveFacebookVideo(videoUrl);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(fbData));
      }

      // B. Phân tích Link Douyin - 抖音 (douyin.com, iesdouyin.com)
      if (lowerUrl.includes('douyin.com') || lowerUrl.includes('iesdouyin.com')) {
        const dyData = await resolveDouyinVideo(videoUrl);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(dyData));
      }

      // C. Phân tích Link TikTok (vm.tiktok.com, vt.tiktok.com, tiktok.com/@user/video/...)
      if (lowerUrl.includes('tiktok.com')) {
        // Tuyến 1: TikWM
        try {
          const formData = new URLSearchParams();
          formData.append('url', videoUrl);

          const tikRes = await fetch('https://www.tikwm.com/api/', {
            method: 'POST',
            body: formData,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            signal: AbortSignal.timeout(8000)
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
          }
        } catch (tikErr) {
          console.warn('TikWM thất bại, chuyển sang API dự phòng:', tikErr.message);
        }

        // Tuyến 2: backend1 fallback
        try {
          const ttdlRes = await fetch('https://backend1.tioo.eu.org/ttdl?url=' + encodeURIComponent(videoUrl), {
            signal: AbortSignal.timeout(8000)
          });
          const ttdlData = await ttdlRes.json().catch(() => ({}));
          if (ttdlData.status && Array.isArray(ttdlData.video) && ttdlData.video.length > 0) {
            const direct = ttdlData.video[0];
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
              success: true,
              type: 'tiktok',
              title: ttdlData.title || 'Video TikTok',
              originalUrl: direct,
              videoUrl: `/api/proxy-video?url=${encodeURIComponent(direct)}`
            }));
          }
        } catch (ttdlErr) {}

        throw new Error("Không thể phân tích video TikTok. Hãy kiểm tra lại đường dẫn chia sẻ!");
      }

      // D. Phân tích Link YouTube (youtube.com, youtu.be, shorts, hoặc ID video)
      if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || /^[a-zA-Z0-9_-]{11}$/.test(videoUrl.trim())) {
        const ytData = await resolveYouTubeVideo(videoUrl);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(ytData));
      }

      // E. Link Video Trực Tiếp (Direct MP4, WebM, etc.)
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

// Bộ đệm thông tin định dạng video YouTube để phục vụ các yêu cầu HTTP Range tức thì
const ytInfoCache = new Map();

async function getCachedYouTubeFormat(ytId) {
  const now = Date.now();
  if (ytInfoCache.has(ytId)) {
    const cached = ytInfoCache.get(ytId);
    if (now - cached.timestamp < 10 * 60 * 1000) { // cache 10 phút
      return cached;
    }
  }

  const cookieStr = getYouTubeCookie();
  const hasValidCookie = cookieStr && (cookieStr.includes('SAPISID') || cookieStr.includes('__Secure-3PAPISID') || cookieStr.includes('.youtube.com'));
  const clientCandidates = [
    (YtdlClient && YtdlClient.Tv) ? YtdlClient.Tv : 'tv',
    (YtdlClient && YtdlClient.VisionOS) ? YtdlClient.VisionOS : 'visionos'
  ];
  const ytOpts = { clients: clientCandidates };
  if (hasValidCookie) ytOpts.cookie = cookieStr;

  const ytInstance = new YtdlClass(ytOpts);
  const info = await ytInstance.getInfo(ytId);

  // Ưu tiên định dạng MP4 codec avc1 (H.264) tương thích 100% mọi trình duyệt và Canvas
  const mp4s = info.formats.filter(f => f.hasVideo && f.container === 'mp4' && (f.codecs || '').includes('avc1'));
  mp4s.sort((a, b) => (b.height || 0) - (a.height || 0));
  const chosen = mp4s.find(f => (f.height || 0) <= 1080 && (f.height || 0) >= 480) || mp4s[0] || info.formats.find(f => f.hasVideo && f.container === 'mp4') || info.formats[0];

  const result = { ytInstance, info, chosen, timestamp: now };
  ytInfoCache.set(ytId, result);
  if (ytInfoCache.size > 50) {
    const firstKey = ytInfoCache.keys().next().value;
    ytInfoCache.delete(firstKey);
  }
  return result;
}

  // 3. ENDPOINT PROXY LUỒNG VIDEO TRÁNH CORS: /api/proxy-video
  if (parsedUrl.pathname === '/api/proxy-video') {
    // 3A. Trường hợp video YouTube: Truyền luồng trực tiếp với chuẩn HTTP Range 206 đầy đủ
    const ytId = parsedUrl.query.yt || (parsedUrl.query.url && (parsedUrl.query.url.includes('youtube.com') || parsedUrl.query.url.includes('youtu.be')) ? parsedUrl.query.url.match(/[a-zA-Z0-9_-]{11}/)?.[0] : null);
    if (ytId && YtdlClass) {
      try {
        const { ytInstance, info, chosen } = await getCachedYouTubeFormat(ytId);
        const total = parseInt(chosen.contentLength, 10) || 0;

        let start = 0;
        let end = total > 0 ? total - 1 : undefined;
        let isRange = false;

        if (req.headers.range) {
          const match = req.headers.range.match(/bytes=(\d+)-(\d+)?/);
          if (match) {
            start = parseInt(match[1], 10);
            if (match[2]) {
              end = parseInt(match[2], 10);
            } else if (total > 0) {
              end = total - 1;
            }
            isRange = true;
          }
        }

        const outHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Range, Content-Type, Accept',
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600'
        };

        if (isRange && total > 0 && end !== undefined) {
          const chunkSize = (end - start) + 1;
          outHeaders['Content-Range'] = `bytes ${start}-${end}/${total}`;
          outHeaders['Content-Length'] = chunkSize;
          res.writeHead(206, outHeaders);
        } else if (total > 0) {
          outHeaders['Content-Length'] = total;
          res.writeHead(200, outHeaders);
        } else {
          res.writeHead(200, outHeaders);
        }

        const media = ytInstance.open(info, chosen);
        const readOpts = {};
        if (isRange) {
          readOpts.range = { start, end };
        }
        const stream = media.read(readOpts);
        stream.pipe(res);

        stream.on('error', (err) => {
          console.warn('Lỗi truyền luồng YouTube:', err.message);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });

        req.on('close', () => {
          try { stream.destroy(); } catch (e) {}
        });

        return;
      } catch (ytErr) {
        console.error('Lỗi khởi tạo stream YouTube:', ytErr.message);
      }
    }

    // 3B. Trường hợp video Facebook, Douyin, TikTok, YouTube Stream URL hoặc MP4 trực tiếp: Proxy qua fetch với tự động theo dõi chuyển hướng (follow redirects)
    const rawTarget = parsedUrl.query.url;
    if (!rawTarget) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Thiếu tham số url hoặc yt' }));
    }

    try {
      const targetUrl = decodeURIComponent(rawTarget);
      const lowerTarget = targetUrl.toLowerCase();
      let referer = '';
      if (lowerTarget.includes('tiktok') || lowerTarget.includes('byteoversea')) {
        referer = 'https://www.tiktok.com/';
      } else if (lowerTarget.includes('douyin') || lowerTarget.includes('snssdk') || lowerTarget.includes('douyinvod')) {
        referer = 'https://www.douyin.com/';
      } else if (lowerTarget.includes('fbcdn') || lowerTarget.includes('facebook')) {
        referer = 'https://www.facebook.com/';
      }

      const clientHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      };
      if (referer) clientHeaders['Referer'] = referer;
      if (req.headers.range) clientHeaders['Range'] = req.headers.range;

      // Sử dụng native fetch với redirect: 'follow' để xử lý mượt mà chuyển hướng 302 của Google Video CDN
      const upstreamRes = await fetch(targetUrl, {
        method: req.method,
        headers: clientHeaders,
        redirect: 'follow'
      });

      const outHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type, Accept',
        'Content-Type': upstreamRes.headers.get('content-type') || 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600'
      };

      if (upstreamRes.headers.get('content-range')) outHeaders['Content-Range'] = upstreamRes.headers.get('content-range');
      if (upstreamRes.headers.get('content-length')) outHeaders['Content-Length'] = upstreamRes.headers.get('content-length');

      res.writeHead(upstreamRes.status, outHeaders);

      if (req.method === 'HEAD') {
        return res.end();
      }

      if (upstreamRes.body) {
        const { Readable } = require('stream');
        const readableStream = Readable.fromWeb(upstreamRes.body);
        readableStream.pipe(res);
        req.on('close', () => {
          try { readableStream.destroy(); } catch (e) {}
        });
      } else {
        res.end();
      }
      return;

    } catch (e) {
      console.error('Lỗi proxy video stream:', e.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Lỗi tải luồng video: ' + e.message }));
      }
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 VocalFlow AI TTS đang chạy tại cổng: ${PORT}`);
  console.log(`🎧 API Tải Audio: /api/tts?text=Xin+chao&lang=vi`);
  console.log(`📂 Thư mục: ${PUBLIC_DIR}`);
  console.log(`======================================================\n`);
});
