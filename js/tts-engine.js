/**
 * TTSEngine - Bộ điều phối đa nguồn giọng đọc (Multi-source TTS Engine)
 * Hỗ trợ:
 * 1. Web Speech API (Offline, chuẩn trình duyệt, miễn phí)
 * 2. Google Translate TTS (Miễn phí, không cần API Key, MP3 trực tiếp)
 * 3. Hugging Face Inference API (Mô hình AI Neural: Meta MMS vie/eng, VITS)
 * 4. ElevenLabs API (Tùy chọn nâng cao với API Key của người dùng)
 */

/**
 * Xác định Base URL cho API theo môi trường triển khai (Render, Vercel, VPS hoặc Localhost)
 */
function getApiBaseUrl() {
  if (typeof window === 'undefined') return '';
  // Nếu mở trực tiếp bằng tệp file:// (chưa chạy qua Web Server)
  if (window.location.protocol === 'file:') return 'http://localhost:3000';
  // Nếu đang dev localhost ở cổng khác (ví dụ Live Server 5500, Vite 5173...)
  if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port && window.location.port !== '3000') {
    return `http://${window.location.hostname}:3000`;
  }
  // Môi trường Production (Render, Vercel, Cloud...) hoặc chạy cùng port: dùng relative path ""
  return '';
}

// Danh sách các mô hình giọng đọc AI Piper TTS WebAssembly (chạy offline trên máy khách)
const PIPER_VOICES = [
  { id: 'vi_VN-vais1000-medium', name: '🇻🇳 Tiếng Việt - Vais1000 (AI Neural)', lang: 'vi-VN', size: '~60MB' },
  { id: 'vi_VN-25hours_single-low', name: '🇻🇳 Tiếng Việt - 25Hours (AI Nhanh)', lang: 'vi-VN', size: '~60MB' },
  { id: 'vi_VN-vivos-x_low', name: '🇻🇳 Tiếng Việt - Vivos (AI Nhẹ 27MB)', lang: 'vi-VN', size: '~27MB' },
  { id: 'en_US-lessac-medium', name: '🇺🇸 English (US) - Lessac (AI Nữ)', lang: 'en-US', size: '~60MB' },
  { id: 'en_US-libritts-high', name: '🇺🇸 English (US) - LibriTTS (AI Cao cấp)', lang: 'en-US', size: '~60MB' },
  { id: 'en_US-ryan-medium', name: '🇺🇸 English (US) - Ryan (AI Nam)', lang: 'en-US', size: '~60MB' },
  { id: 'en_GB-cori-high', name: '🇬🇧 English (UK) - Cori (AI Anh)', lang: 'en-GB', size: '~60MB' },
  { id: 'fr_FR-siwis-medium', name: '🇫🇷 Français - Siwis (AI Pháp)', lang: 'fr-FR', size: '~60MB' },
  { id: 'de_DE-thorsten-medium', name: '🇩🇪 Deutsch - Thorsten (AI Đức)', lang: 'de-DE', size: '~60MB' },
  { id: 'es_ES-sharvard-medium', name: '🇪🇸 Español - Sharvard (AI Tây Ban Nha)', lang: 'es-ES', size: '~60MB' },
  { id: 'zh_CN-huayan-medium', name: '🇨🇳 Trung Quốc - Huayan (AI Tiếng Trung)', lang: 'zh-CN', size: '~60MB' }
];

class TTSEngine {
  constructor() {
    this.currentSource = 'browser'; // 'browser' | 'google' | 'huggingface' | 'elevenlabs' | 'piper'
    this.speechSynthesis = window.speechSynthesis || null;
    this.browserVoices = [];
    this.piperVoices = PIPER_VOICES;
    this.piper = null;
    this.currentUtterance = null;
    this.audioElement = new Audio();
    this.currentAudioUrl = null;
    this.currentAudioBlob = null;
    this.currentAudioType = 'mp3'; // 'mp3' | 'wav'

    // Trạng thái phát
    this.state = 'idle'; // 'idle' | 'playing' | 'paused' | 'loading'

    // Callback tiến độ tải Piper WASM model
    this.onPiperProgress = null;

    // Danh sách các đoạn âm thanh khi phát đa phần (chunking)
    this.audioPlaylist = [];
    this.currentPlayIndex = 0;

    // Cài đặt giọng đọc
    this.settings = {
      pitch: 1.0,
      rate: 1.0,
      volume: 1.0,
      selectedBrowserVoiceURI: null,
      selectedGoogleLang: 'vi',
      hfToken: localStorage.getItem('tts_hf_token') || '',
      hfModel: localStorage.getItem('tts_hf_model') || 'facebook/mms-tts-vie',
      elevenLabsKey: localStorage.getItem('tts_elevenlabs_key') || '',
      elevenLabsVoiceId: localStorage.getItem('tts_elevenlabs_voice') || '21m00Tcm4TlvDq8ikWAM' // Rachel
    };

    // Callback sự kiện
    this.onStateChange = null;
    this.onWordBoundary = null;
    this.onError = null;
    this.onAudioReady = null;

    // Speech-to-Text (Nhận diện giọng nói)
    this.recognition = null;
    this.isRecording = false;
    this.onRecognitionResult = null;
    this.onRecognitionEnd = null;

    this.initBrowserVoices();
    this.initAudioElement();
    this.initSpeechRecognition();
  }

  initSpeechRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      this.recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (this.onRecognitionResult) {
          this.onRecognitionResult({
            final: finalTranscript,
            interim: interimTranscript
          });
        }
      };

      this.recognition.onerror = (event) => {
        console.warn("Lỗi nhận diện giọng nói:", event.error);
        this.isRecording = false;
        if (this.onRecognitionEnd) this.onRecognitionEnd();
        if (event.error !== 'no-speech' && this.onError) {
          this.onError(`Lỗi micro nhận diện giọng nói: ${event.error}`);
        }
      };

      this.recognition.onend = () => {
        this.isRecording = false;
        if (this.onRecognitionEnd) this.onRecognitionEnd();
      };
    }
  }

  toggleSpeechRecognition(lang = 'vi-VN') {
    if (!this.recognition) {
      throw new Error("Trình duyệt không hỗ trợ Web Speech Recognition (Mic). Hãy dùng Chrome hoặc Edge.");
    }

    if (this.isRecording) {
      this.recognition.stop();
      this.isRecording = false;
      return false;
    } else {
      this.recognition.lang = lang;
      this.recognition.start();
      this.isRecording = true;
      return true;
    }
  }

  initBrowserVoices() {
    if (!this.speechSynthesis) return;

    const loadVoices = () => {
      const v = this.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        this.browserVoices = v;
        if (typeof this.onVoicesChanged === 'function') {
          this.onVoicesChanged(this.browserVoices);
        }
      }
    };

    loadVoices();
    if (this.speechSynthesis.onvoiceschanged !== undefined) {
      this.speechSynthesis.onvoiceschanged = () => {
        loadVoices();
      };
    }

    // Polling retry: Trình duyệt di động (iOS Safari / Android Chrome) thường nạp danh sách giọng bất đồng bộ
    let retries = 0;
    const interval = setInterval(() => {
      retries++;
      loadVoices();
      if (this.browserVoices.length > 0 || retries >= 16) {
        clearInterval(interval);
      }
    }, 250);

    // Kích hoạt giọng khi người dùng chạm màn hình lần đầu trên điện thoại
    const wakeUp = () => {
      try {
        loadVoices();
        // Một số phiên bản iOS Safari cần tạo SpeechSynthesisUtterance rỗng để mở AudioContext
        if (this.speechSynthesis && this.browserVoices.length === 0) {
          const silentUtterance = new SpeechSynthesisUtterance('');
          silentUtterance.volume = 0;
          this.speechSynthesis.speak(silentUtterance);
          setTimeout(() => {
            loadVoices();
          }, 150);
        }
      } catch (e) {}
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('touchstart', wakeUp, { once: true, passive: true });
      window.addEventListener('click', wakeUp, { once: true, passive: true });
      window.addEventListener('pointerdown', wakeUp, { once: true, passive: true });
    }
  }

  initAudioElement() {
    this.audioElement.addEventListener('ended', () => {
      if (this.audioPlaylist.length > 0 && this.currentPlayIndex < this.audioPlaylist.length - 1) {
        this.currentPlayIndex++;
        this.playCurrentAudioChunk();
      } else {
        this.setState('idle');
      }
    });

    this.audioElement.addEventListener('pause', () => {
      if (this.state === 'playing') {
        this.setState('paused');
      }
    });

    this.audioElement.addEventListener('play', () => {
      this.setState('playing');
    });

    this.audioElement.addEventListener('error', (e) => {
      console.error("Lỗi phát audio element:", e);
      this.setState('idle');
      if (this.onError) {
        this.onError("Không thể phát luồng âm thanh từ máy chủ hoặc đường truyền bị ngắt.");
      }
    });
  }

  setState(newState) {
    this.state = newState;
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }

  /**
   * Kiểm tra xem một voiceURI có phải là giọng Piper AI WebAssembly không
   */
  isPiperVoice(voiceURI) {
    if (!voiceURI) return false;
    return voiceURI.startsWith('piper:') || this.piperVoices.some(p => p.id === voiceURI);
  }

  /**
   * Lấy voiceId chuẩn cho Piper (loại bỏ tiền tố piper:)
   */
  getCleanPiperVoiceId(voiceURI) {
    if (!voiceURI) return 'vi_VN-vais1000-medium';
    return voiceURI.replace(/^piper:/, '');
  }

  /**
   * Khởi tạo hoặc lấy module Piper TTS WebAssembly (@mintplex-labs/piper-tts-web)
   */
  async getPiper() {
    if (this.piper) return this.piper;
    if (typeof window !== 'undefined' && window.piperTts) {
      this.piper = window.piperTts;
      return this.piper;
    }

    try {
      this.piper = await import('https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.5/+esm');
      if (typeof window !== 'undefined') window.piperTts = this.piper;
      return this.piper;
    } catch (err) {
      console.warn("Lỗi nạp module Piper TTS:", err);
      throw new Error("Không thể nạp thư viện Piper TTS WebAssembly. Hãy kiểm tra kết nối mạng lần đầu.");
    }
  }

  /**
   * Kiểm tra danh sách các giọng Piper đã được lưu trong bộ nhớ máy (OPFS)
   */
  async getStoredPiperVoices() {
    try {
      const piper = await this.getPiper();
      if (piper && typeof piper.stored === 'function') {
        return await piper.stored();
      }
    } catch (e) {
      console.warn("Không thể kiểm tra giọng Piper đã lưu:", e);
    }
    return [];
  }

  /**
   * Kiểm tra và dọn dẹp file mô hình trong bộ nhớ máy (OPFS) nếu bị lỗi hoặc tải chưa hoàn chỉnh (< 1MB)
   */
  async validateAndCleanPiperModel(voiceId) {
    if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.getDirectory) return;
    try {
      const root = await navigator.storage.getDirectory();
      const piperDir = await root.getDirectoryHandle('piper', { create: false }).catch(() => null);
      if (!piperDir) return;

      const fileName = `${voiceId}.onnx`;
      const fileHandle = await piperDir.getFileHandle(fileName, { create: false }).catch(() => null);
      if (fileHandle) {
        const file = await fileHandle.getFile();
        // Một mô hình ONNX Piper thực sự luôn từ 15MB đến 65MB.
        // Nếu kích thước < 1MB, chắc chắn là file tải lỗi dở dang hoặc trang báo lỗi HTML (gây lỗi "No graph was found in the protobuf")
        if (file.size < 1000000) {
          console.warn(`[Piper TTS] Phát hiện file cache ${fileName} bị hỏng (${file.size} bytes). Đang xóa để tự động tải lại...`);
          await piperDir.removeEntry(fileName).catch(() => {});
          await piperDir.removeEntry(`${fileName}.json`).catch(() => {});
        }
      }
    } catch (e) {
      console.warn("[Piper TTS] Lỗi khi kiểm tra tính toàn vẹn của cache:", e);
    }
  }

  /**
   * Xóa hẳn mô hình Piper bị hỏng khỏi bộ nhớ máy (OPFS)
   */
  async cleanCorruptedPiperModel(voiceId) {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.getDirectory) {
        const root = await navigator.storage.getDirectory();
        const piperDir = await root.getDirectoryHandle('piper', { create: false }).catch(() => null);
        if (piperDir) {
          const fileName = `${voiceId}.onnx`;
          await piperDir.removeEntry(fileName).catch(() => {});
          await piperDir.removeEntry(`${fileName}.json`).catch(() => {});
        }
      }
      const piper = await this.getPiper().catch(() => null);
      if (piper && typeof piper.remove === 'function') {
        await piper.remove(voiceId).catch(() => {});
      }
      if (piper && piper.TtsSession) {
        piper.TtsSession._instance = null;
      }
    } catch (e) {
      console.warn("[Piper TTS] Lỗi khi xóa file cache:", e);
    }
  }

  /**
   * Xóa toàn bộ bộ nhớ đệm (cache) Piper TTS trong OPFS
   */
  async clearAllPiperCache() {
    try {
      const piper = await this.getPiper().catch(() => null);
      if (piper && typeof piper.flush === 'function') {
        await piper.flush().catch(() => {});
      }
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.getDirectory) {
        const root = await navigator.storage.getDirectory();
        await root.removeEntry('piper', { recursive: true }).catch(() => {});
      }
      if (piper && piper.TtsSession) {
        piper.TtsSession._instance = null;
      }
      return true;
    } catch (e) {
      console.warn("[Piper TTS] Lỗi khi dọn dẹp toàn bộ cache:", e);
      return false;
    }
  }

  /**
   * NGUỒN PIPER: Piper TTS WebAssembly (Chạy Offline 100% trong trình duyệt qua ONNX Runtime Web)
   */
  async speakPiper(text, retryCount = 0) {
    this.setState('loading');
    const cleanText = text.trim();
    if (!cleanText) {
      this.setState('idle');
      throw new Error("Vui lòng nhập văn bản cần đọc!");
    }

    const voiceId = this.getCleanPiperVoiceId(this.settings.selectedBrowserVoiceURI || 'vi_VN-vais1000-medium');

    // Tự động kiểm tra và dọn dẹp file cache nếu bị hỏng
    await this.validateAndCleanPiperModel(voiceId);

    try {
      const piper = await this.getPiper();

      if (this.onPiperProgress) {
        this.onPiperProgress({ status: 'starting', percent: 0, voiceId });
      }

      // Khắc phục lỗi 404 cdnjs của @mintplex-labs/piper-tts-web:
      // Thư viện nạp onnxruntime-web@1.27.0 nhưng mặc định trỏ về cdnjs 1.18.0 (không có ort-wasm-simd-threaded.mjs).
      // Ta truyền wasmPaths trỏ chính xác về jsDelivr của onnxruntime-web@1.27.0:
      const ONNX_WASM_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';
      const PIPER_WASM_BASE = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize';

      const progressCallback = (progress) => {
        if (progress && progress.total) {
          const percent = Math.min(100, Math.round((progress.loaded / progress.total) * 100));
          if (this.onPiperProgress) {
            this.onPiperProgress({ status: 'downloading', percent, loaded: progress.loaded, total: progress.total, voiceId });
          }
        }
      };

      // Đảm bảo tạo mới phiên nếu người dùng chuyển sang voiceId khác
      if (piper.TtsSession && piper.TtsSession._instance && piper.TtsSession._instance.voiceId !== voiceId) {
        piper.TtsSession._instance = null;
      }

      let wavBlob;
      if (typeof piper.TtsSession === 'function') {
        const session = new piper.TtsSession({
          voiceId: voiceId,
          progress: progressCallback,
          wasmPaths: {
            onnxWasm: ONNX_WASM_BASE,
            piperData: `${PIPER_WASM_BASE}.data`,
            piperWasm: `${PIPER_WASM_BASE}.wasm`
          }
        });
        await session.waitReady;
        wavBlob = await session.predict(cleanText);
      } else {
        wavBlob = await piper.predict(
          { text: cleanText, voiceId: voiceId },
          progressCallback
        );
      }

      if (this.onPiperProgress) {
        this.onPiperProgress({ status: 'ready', percent: 100, voiceId });
      }

      this.currentAudioBlob = wavBlob;
      this.currentAudioUrl = URL.createObjectURL(wavBlob);
      this.currentAudioType = 'wav';
      this.lastRenderedText = cleanText;

      this.audioElement.src = this.currentAudioUrl;
      this.audioElement.playbackRate = this.settings.rate || 1.0;
      this.audioElement.volume = this.settings.volume !== undefined ? this.settings.volume : 1.0;

      await this.audioElement.play();
      this.setState('playing');

      if (this.onAudioReady) {
        this.onAudioReady({ url: this.currentAudioUrl, blob: this.currentAudioBlob, type: 'wav' });
      }
      return wavBlob;
    } catch (err) {
      console.error("Lỗi Piper TTS:", err);

      // Nếu phát hiện lỗi Protobuf (do file cache trước đó bị tải dở hoặc lưu nhầm HTML error)
      const isProtobufError = err.message && (err.message.includes('protobuf') || err.message.includes('No graph was found'));
      if (isProtobufError && retryCount === 0) {
        console.warn(`[Piper TTS] Phát hiện file model ${voiceId} bị lỗi protobuf. Đang tự động dọn cache và tải lại lần 2...`);
        await this.cleanCorruptedPiperModel(voiceId);
        return this.speakPiper(text, 1);
      }

      this.setState('idle');
      if (this.onPiperProgress) {
        this.onPiperProgress({ status: 'error', error: err.message });
      }
      throw new Error(`Lỗi Piper AI WebAssembly: ${err.message || 'Không thể tổng hợp giọng đọc'}`);
    }
  }

  /**
   * Lấy danh sách giọng đọc của trình duyệt, nhóm theo ngôn ngữ
   */
  getAvailableBrowserVoices() {
    if (!this.speechSynthesis) return [];
    if (this.browserVoices.length === 0) {
      this.browserVoices = this.speechSynthesis.getVoices();
    }
    return this.browserVoices;
  }

  /**
   * Phát văn bản với nguồn được chọn
   */
  async speak(text) {
    const cleanText = text.trim();
    if (!cleanText) {
      throw new Error("Vui lòng nhập văn bản cần đọc!");
    }

    // Dừng tác vụ đang phát trước đó
    this.stop();

    if (this.currentSource === 'piper' || (this.currentSource === 'browser' && this.isPiperVoice(this.settings.selectedBrowserVoiceURI))) {
      return this.speakPiper(cleanText);
    } else if (this.currentSource === 'browser') {
      return this.speakBrowser(cleanText);
    } else if (this.currentSource === 'google') {
      return this.speakGoogle(cleanText);
    } else if (this.currentSource === 'huggingface') {
      return this.speakHuggingFace(cleanText);
    } else if (this.currentSource === 'elevenlabs') {
      return this.speakElevenLabs(cleanText);
    }
  }

  /**
   * NGUỒN 1: Web Speech API (Offline, chuẩn trình duyệt)
   */
  speakBrowser(text) {
    if (!this.speechSynthesis) {
      throw new Error("Trình duyệt của bạn không hỗ trợ Web Speech API.");
    }

    this.setState('playing');

    // Khắc phục bug Chrome tự ngắt sau 15 giây bằng cách ngắt thành các câu tự nhiên
    const sentences = this.splitIntoSentences(text, 180);
    let currentIndex = 0;

    const speakNext = () => {
      if (this.state !== 'playing' || currentIndex >= sentences.length) {
        this.setState('idle');
        return;
      }

      const sentence = sentences[currentIndex];
      const utterance = new SpeechSynthesisUtterance(sentence);
      this.currentUtterance = utterance;

      utterance.pitch = this.settings.pitch;
      utterance.rate = this.settings.rate;
      utterance.volume = this.settings.volume;

      // Chọn giọng đọc
      if (this.settings.selectedBrowserVoiceURI) {
        const voice = this.browserVoices.find(v => v.voiceURI === this.settings.selectedBrowserVoiceURI);
        if (voice) utterance.voice = voice;
      }

      utterance.onboundary = (event) => {
        if (this.onWordBoundary && event.name === 'word') {
          this.onWordBoundary({
            charIndex: event.charIndex,
            charLength: event.charLength || 0,
            sentenceIndex: currentIndex
          });
        }
      };

      utterance.onend = () => {
        currentIndex++;
        speakNext();
      };

      utterance.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.error("Lỗi Web Speech:", e);
          if (this.onError) this.onError(`Lỗi đọc giọng trình duyệt: ${e.error}`);
        }
        this.setState('idle');
      };

      this.speechSynthesis.speak(utterance);
    };

    // Chrome keep-alive hack
    if (this._keepAliveTimer) clearInterval(this._keepAliveTimer);
    this._keepAliveTimer = setInterval(() => {
      if (this.state === 'playing' && this.speechSynthesis.speaking) {
        this.speechSynthesis.pause();
        this.speechSynthesis.resume();
      }
    }, 10000);

    speakNext();
  }

  /**
   * NGUỒN 2: Google Translate TTS (Miễn phí, không cần token)
   */
  async speakGoogle(text) {
    this.setState('loading');

    try {
      const lang = this.settings.selectedGoogleLang || 'vi';

      // Thử dùng API proxy /api/tts để lấy luồng âm thanh hoàn chỉnh và hỗ trợ visualizer + download
      const base = getApiBaseUrl();
      let proxyUrl = `${base}/api/tts?text=${encodeURIComponent(text)}&lang=${lang}`;

      try {
        let response = await fetch(proxyUrl);
        if (!response.ok && response.status === 404 && base === '' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
          proxyUrl = `http://localhost:3000/api/tts?text=${encodeURIComponent(text)}&lang=${lang}`;
          response = await fetch(proxyUrl);
        }

        if (response.ok) {
          this.currentAudioBlob = await response.blob();
          this.currentAudioUrl = URL.createObjectURL(this.currentAudioBlob);
          this.currentAudioType = 'mp3';

          this.audioElement.src = this.currentAudioUrl;
          this.audioElement.playbackRate = this.settings.rate;
          this.audioElement.volume = this.settings.volume;

          await this.audioElement.play();
          this.setState('playing');

          if (this.onAudioReady) {
            this.onAudioReady({ url: this.currentAudioUrl, blob: this.currentAudioBlob, type: 'mp3' });
          }
          return;
        }
      } catch (proxyErr) {
        console.warn("Proxy /api/tts chưa sẵn sàng, chuyển sang chế độ audio chunks trực tiếp:", proxyErr);
      }

      // Phương án dự phòng: Chia nhỏ văn bản tối đa 160 ký tự mỗi đoạn
      const chunks = this.splitIntoSentences(text, 160);
      this.audioPlaylist = chunks.map(chunk => {
        const encoded = encodeURIComponent(chunk);
        return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encoded}`;
      });

      this.currentPlayIndex = 0;
      this.currentAudioType = 'mp3';

      this.playCurrentAudioChunk();
      this.setState('playing');

      this.prepareGoogleAudioBlob(text, lang);

    } catch (err) {
      this.setState('idle');
      throw err;
    }
  }

  playCurrentAudioChunk() {
    if (this.currentPlayIndex >= this.audioPlaylist.length) {
      this.setState('idle');
      return;
    }

    const url = this.audioPlaylist[this.currentPlayIndex];
    this.audioElement.src = url;
    this.audioElement.playbackRate = this.settings.rate;
    this.audioElement.volume = this.settings.volume;
    this.audioElement.play().catch(e => {
      console.warn("Lỗi auto-play Google TTS:", e);
      this.setState('idle');
      if (this.onError) this.onError("Trình duyệt chặn phát âm thanh tự động. Vui lòng bấm 'Phát' lại.");
    });
  }

  /**
   * Chuẩn bị file Blob âm thanh hoàn chỉnh
   */
  async prepareGoogleAudioBlob(text, lang) {
    try {
      const base = getApiBaseUrl();
      let proxyUrl = `${base}/api/tts?text=${encodeURIComponent(text)}&lang=${lang}`;
      let res = await fetch(proxyUrl);
      if (!res.ok && res.status === 404 && base === '' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        proxyUrl = `http://localhost:3000/api/tts?text=${encodeURIComponent(text)}&lang=${lang}`;
        res = await fetch(proxyUrl);
      }
      if (res.ok) {
        this.currentAudioBlob = await res.blob();
        this.currentAudioUrl = URL.createObjectURL(this.currentAudioBlob);
        this.currentAudioType = 'mp3';
        if (this.onAudioReady) {
          this.onAudioReady({ url: this.currentAudioUrl, blob: this.currentAudioBlob, type: 'mp3' });
        }
      }
    } catch (err) {
      console.warn("Không thể chuẩn bị trước audio blob:", err);
    }
  }

  /**
   * NGUỒN 3: Hugging Face Inference API (Mô hình AI Neural TTS)
   */
  async speakHuggingFace(text) {
    this.setState('loading');

    const model = this.settings.hfModel || 'facebook/mms-tts-vie';
    const token = this.settings.hfToken ? this.settings.hfToken.trim() : '';

    const endpoint = `https://api-inference.huggingface.co/models/${model}`;
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ inputs: text.slice(0, 500) }) // Giới hạn ký tự hợp lý cho inference free
      });

      if (response.status === 503) {
        const data = await response.json();
        const estTime = Math.round(data.estimated_time || 20);
        throw new Error(`Mô hình AI đang khởi động lại (Cold Start). Vui lòng đợi khoảng ${estTime} giây rồi thử lại!`);
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error("Cần Token Hugging Face để dùng mô hình này. Hãy nhấp vào biểu tượng Bánh răng (Cài đặt) để nhập Access Token miễn phí của bạn.");
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Lỗi Hugging Face (${response.status}): ${errorText.slice(0, 150)}`);
      }

      const contentType = response.headers.get('content-type') || '';
      let mimeType = 'audio/wav';
      if (contentType.includes('flac')) mimeType = 'audio/flac';
      else if (contentType.includes('mpeg') || contentType.includes('mp3')) mimeType = 'audio/mp3';

      const blob = await response.blob();
      this.currentAudioBlob = new Blob([blob], { type: mimeType });
      this.currentAudioUrl = URL.createObjectURL(this.currentAudioBlob);
      this.currentAudioType = mimeType.includes('wav') ? 'wav' : 'mp3';

      this.audioElement.src = this.currentAudioUrl;
      this.audioElement.playbackRate = this.settings.rate;
      this.audioElement.volume = this.settings.volume;

      await this.audioElement.play();
      this.setState('playing');

      if (this.onAudioReady) {
        this.onAudioReady({ url: this.currentAudioUrl, blob: this.currentAudioBlob, type: this.currentAudioType });
      }

    } catch (err) {
      this.setState('idle');
      throw err;
    }
  }

  /**
   * NGUỒN 4: ElevenLabs API (Chất lượng Ultra-Realistic)
   */
  async speakElevenLabs(text) {
    const apiKey = this.settings.elevenLabsKey;
    if (!apiKey) {
      throw new Error("Chưa cấu hình ElevenLabs API Key. Vui lòng bấm vào Cài đặt để thêm API Key của bạn.");
    }

    this.setState('loading');
    const voiceId = this.settings.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM';
    const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (err.detail?.code === 'paid_plan_required' || err.detail?.status === 'payment_required' || (err.detail?.message && err.detail.message.includes('Free users cannot use library voices'))) {
          throw new Error("Tài khoản ElevenLabs miễn phí (Free plan) không cho phép gọi API với các giọng trong thư viện. Hãy chuyển sang nguồn 'Google Translate TTS' (Miễn phí 100%, không cần tài khoản) hoặc nâng cấp gói trên ElevenLabs để tiếp tục.");
        }
        throw new Error(err.detail?.message || `Lỗi ElevenLabs (${response.status})`);
      }

      const blob = await response.blob();
      this.currentAudioBlob = new Blob([blob], { type: 'audio/mpeg' });
      this.currentAudioUrl = URL.createObjectURL(this.currentAudioBlob);
      this.currentAudioType = 'mp3';

      this.audioElement.src = this.currentAudioUrl;
      this.audioElement.playbackRate = this.settings.rate;
      this.audioElement.volume = this.settings.volume;

      await this.audioElement.play();
      this.setState('playing');

      if (this.onAudioReady) {
        this.onAudioReady({ url: this.currentAudioUrl, blob: this.currentAudioBlob, type: 'mp3' });
      }
    } catch (err) {
      this.setState('idle');
      throw err;
    }
  }

  /**
   * Tạm dừng
   */
  pause() {
    if (this.currentSource === 'browser' && !this.isPiperVoice(this.settings.selectedBrowserVoiceURI)) {
      if (this.speechSynthesis && this.speechSynthesis.speaking) {
        this.speechSynthesis.pause();
        this.setState('paused');
      }
    } else {
      if (!this.audioElement.paused) {
        this.audioElement.pause();
        this.setState('paused');
      }
    }
  }

  /**
   * Tiếp tục phát
   */
  resume() {
    if (this.currentSource === 'browser' && !this.isPiperVoice(this.settings.selectedBrowserVoiceURI)) {
      if (this.speechSynthesis && this.speechSynthesis.paused) {
        this.speechSynthesis.resume();
        this.setState('playing');
      }
    } else {
      if (this.audioElement.paused && this.audioElement.src) {
        this.audioElement.play();
        this.setState('playing');
      }
    }
  }

  /**
   * Dừng hẳn
   */
  stop() {
    if (this._keepAliveTimer) {
      clearInterval(this._keepAliveTimer);
      this._keepAliveTimer = null;
    }

    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
    }

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }

    this.audioPlaylist = [];
    this.currentPlayIndex = 0;
    this.setState('idle');
  }

  /**
   * Tải tệp âm thanh hiện tại về máy (.mp3 hoặc .wav)
   */
  downloadAudio(filename = "speech-audio") {
    if (this.currentAudioBlob) {
      const ext = this.currentAudioType || 'mp3';
      const url = URL.createObjectURL(this.currentAudioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    } else if (this.currentAudioUrl) {
      // Trường hợp audio URL trực tiếp
      const a = document.createElement('a');
      a.href = this.currentAudioUrl;
      a.target = '_blank';
      a.download = `${filename}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    }
    return false;
  }

  /**
   * Hàm tiện ích: Chia văn bản dài thành các câu nhỏ tự nhiên
   */
  splitIntoSentences(text, maxChunkLen = 160) {
    if (!text) return [];
    
    // Tách theo dấu chấm câu, dấu chấm hỏi, dấu than, dấu xuống dòng
    const rawSentences = text
      .replace(/([.?!;\n]+)/g, "$1|")
      .split("|")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const result = [];
    let currentChunk = "";

    for (const sent of rawSentences) {
      if ((currentChunk + " " + sent).trim().length <= maxChunkLen) {
        currentChunk = (currentChunk + " " + sent).trim();
      } else {
        if (currentChunk) result.push(currentChunk);
        
        // Nếu một câu đơn lẻ vượt quá maxChunkLen, ta cắt theo dấu phẩy hoặc khoảng trắng
        if (sent.length > maxChunkLen) {
          const words = sent.split(" ");
          let subChunk = "";
          for (const w of words) {
            if ((subChunk + " " + w).trim().length <= maxChunkLen) {
              subChunk = (subChunk + " " + w).trim();
            } else {
              if (subChunk) result.push(subChunk);
              subChunk = w;
            }
          }
          currentChunk = subChunk;
        } else {
          currentChunk = sent;
        }
      }
    }

    if (currentChunk) {
      result.push(currentChunk);
    }

    return result.length > 0 ? result : [text];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TTSEngine };
}

