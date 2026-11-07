/**
 * VideoExporter - Module kết xuất Video (MP4 / WebM) tích hợp âm thanh TTS, 
 * hình nền tùy chỉnh, sóng âm trực quan và lồng nhạc nền (Background Music - BGM)
 * Chạy 100% Client-side bằng HTML5 Canvas, Web Audio API & MediaRecorder!
 */

class VideoExporter {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.audioContext = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRendering = false;
    this._previewSource = null;

    // Cấu hình video mặc định
    this.config = {
      aspectRatio: '16:9', // '16:9' | '9:16'
      width: 1280,
      height: 720,
      bgType: 'preset', // 'preset' | 'custom' | 'video'
      presetBg: 'sunset', // 'sunset' | 'cyberpunk' | 'lofi' | 'gradient'
      customBgImage: null,
      customBgVideo: null,
      bgObjectFit: 'cover', // 'cover' (chuẩn tỉ lệ phủ kín) | 'contain' (vừa vặn khung)
      enableBgm: true,
      bgmType: 'lofi', // 'lofi' | 'piano' | 'ambient' | 'custom'
      customBgmAudio: null,
      bgmVolume: 0.22, // 22% rõ ràng, êm tai
      playbackRate: 1.0, // Tốc độ đọc
      pitch: 1.0, // Cao độ giọng
      showWaveform: true,
      waveformStyle: 'bars', // 'bars' | 'circle' | 'waterfall'
      showSubtitles: true,
      subtitlePosition: 'center', // 'top' | 'center' | 'bottom'
      showWatermark: true,
      watermarkText: 'Huawnef', // Tên thương hiệu hiển thị trên video
      videoFormat: 'mp4' // 'mp4' (mặc định) | 'webm'
    };

    this.onProgress = null; // callback(percent, statusText)
    this.onComplete = null; // callback(videoBlob, videoUrl, ext)
    this.onError = null;    // callback(errorMsg)

    // Khởi tạo kích thước canvas
    this.updateDimensions();
  }

  updateDimensions() {
    if (this.config.aspectRatio === '9:16') {
      this.config.width = 720;
      this.config.height = 1280;
    } else {
      this.config.width = 1280;
      this.config.height = 720;
    }
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
  }

  /**
   * Tạo AudioContext nếu chưa có
   */
  getAudioContext() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  /**
   * Nghe thử / Dừng nghe thử nhạc nền trước khi xuất video (Hỗ trợ cả nhạc mẫu & tệp tải lên)
   */
  async previewBgm(style = 'lofi', volume = 0.22) {
    const actx = this.getAudioContext();

    if (this._previewSource) {
      this.stopPreviewBgm();
      return false;
    }

    try {
      const testDuration = 12; // 12 giây nghe thử
      let buffer = null;

      if (this.config.customBgmAudio && this.config.bgmType === 'custom') {
        // Giải mã tệp nhạc người dùng tải lên để phát nghe thử trực tiếp
        try {
          const bgmArrayBuf = await this.config.customBgmAudio.arrayBuffer();
          buffer = await actx.decodeAudioData(bgmArrayBuf.slice(0));
        } catch (e) {
          console.warn("Không thể giải mã file nhạc tùy chỉnh khi nghe thử:", e);
          buffer = this.createSyntheticBgm(testDuration, 'lofi');
        }
      } else {
        buffer = this.createSyntheticBgm(testDuration, style);
      }

      const source = actx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const gain = actx.createGain();
      gain.gain.value = Math.max(0.12, (volume || 0.22) * 1.1);

      source.connect(gain);
      gain.connect(actx.destination);
      source.start();

      this._previewSource = source;
      return true;
    } catch (e) {
      console.warn("Không thể phát nghe thử BGM:", e);
      return false;
    }
  }

  stopPreviewBgm() {
    if (this._previewSource) {
      try {
        this._previewSource.stop();
        this._previewSource.disconnect();
      } catch (e) {}
      this._previewSource = null;
    }
  }

  /**
   * Tổng hợp giai điệu Lo-Fi / Ambient / Piano chất lượng cao làm nhạc nền
   */
  createSyntheticBgm(durationSeconds, style = 'lofi') {
    const actx = this.getAudioContext();
    const sampleRate = actx.sampleRate || 44100;
    const totalSamples = Math.ceil(durationSeconds * sampleRate);
    const audioBuffer = actx.createBuffer(2, totalSamples, sampleRate);
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);

    if (style === 'lofi') {
      // 1. LO-FI CHILL: Hợp âm Rhodes Jazz ấm + Mellow Sub-bass + Tiết tấu nhịp trống thư giãn
      const chords = [
        { notes: [261.63, 329.63, 392.00, 493.88], bass: 65.41 },  // Cmaj7 (C2)
        { notes: [220.00, 261.63, 329.63, 392.00], bass: 55.00 },  // Am7 (A1)
        { notes: [146.83, 220.00, 261.63, 349.23], bass: 73.42 },  // Dm7 (D2)
        { notes: [196.00, 246.94, 293.66, 349.23], bass: 49.00 }   // G7 (G1)
      ];
      const chordDuration = 3.2; // 3.2s mỗi hợp âm
      const totalChords = Math.ceil(durationSeconds / chordDuration);

      for (let c = 0; c < totalChords; c++) {
        const item = chords[c % chords.length];
        const startSample = Math.floor(c * chordDuration * sampleRate);
        const chordSamples = Math.floor(chordDuration * sampleRate);

        for (let i = 0; i < chordSamples; i++) {
          const sIdx = startSample + i;
          if (sIdx >= totalSamples) break;

          const t = i / sampleRate;
          const env = Math.sin((i / chordSamples) * Math.PI) * 0.82 + 0.18;
          const beatTime = t % 0.8;

          // Âm trầm Sub-bass ấm áp
          const bass = Math.sin(2 * Math.PI * item.bass * t) * 0.45;

          // Hợp âm Rhodes Electric Piano
          let chordL = 0;
          let chordR = 0;
          item.notes.forEach((freq, fIdx) => {
            const fund = Math.sin(2 * Math.PI * freq * t);
            const overtone = Math.sin(2 * Math.PI * (freq * 2) * t) * 0.28;
            const tremolo = 1 + 0.08 * Math.sin(2 * Math.PI * 4.5 * t);
            const val = (fund + overtone) * tremolo * (1 / (fIdx + 1.2));
            chordL += val * (fIdx % 2 === 0 ? 1 : 0.82);
            chordR += val * (fIdx % 2 === 0 ? 0.82 : 1);
          });

          // Tiết tấu trống Lo-Fi nhẹ nhàng (Kick & Soft Rim/Shaker)
          let drum = 0;
          if (beatTime < 0.12) {
            // Kick trầm ở đầu phách
            const kEnv = Math.exp(-beatTime * 36);
            drum += Math.sin(2 * Math.PI * (78 - beatTime * 260) * beatTime) * kEnv * 0.38;
          }
          if (t % 1.6 > 0.8 && (t % 1.6) - 0.8 < 0.10) {
            // Soft snare / rim ở phách 2 & 4
            const sT = (t % 1.6) - 0.8;
            drum += (Math.random() * 2 - 1) * Math.exp(-sT * 45) * 0.20;
          }

          left[sIdx] += (chordL * env * 0.58 + bass * 0.45 + drum);
          right[sIdx] += (chordR * env * 0.58 + bass * 0.45 + drum);
        }
      }

    } else if (style === 'piano') {
      // 2. PIANO ACOUSTIC: Giai điệu rải nốt piano arpeggio du dương (C - G - Am - F)
      const pianoChords = [
        [261.63, 329.63, 392.00, 523.25], // C
        [196.00, 246.94, 293.66, 392.00], // G
        [220.00, 261.63, 329.63, 440.00], // Am
        [174.61, 220.00, 261.63, 349.23]  // F
      ];
      const barDuration = 3.2;
      const totalBars = Math.ceil(durationSeconds / barDuration);

      for (let b = 0; b < totalBars; b++) {
        const chord = pianoChords[b % pianoChords.length];
        const barStart = Math.floor(b * barDuration * sampleRate);

        chord.forEach((freq, nIdx) => {
          const noteStart = barStart + Math.floor(nIdx * 0.48 * sampleRate);
          const noteLen = Math.floor(2.2 * sampleRate);

          for (let i = 0; i < noteLen; i++) {
            const idx = noteStart + i;
            if (idx >= totalSamples) break;

            const t = i / sampleRate;
            const env = Math.exp(-t * 2.1);
            const note = (Math.sin(2 * Math.PI * freq * t) + 
                          Math.sin(2 * Math.PI * freq * 2 * t) * 0.35 + 
                          Math.sin(2 * Math.PI * freq * 3 * t) * 0.15) * env;

            const panL = nIdx % 2 === 0 ? 0.9 : 0.6;
            const panR = nIdx % 2 === 0 ? 0.6 : 0.9;
            left[idx] += note * 0.45 * panL;
            right[idx] += note * 0.45 * panR;
          }
        });
      }

    } else {
      // 3. AMBIENT SHIMMER: Không gian thiền định lung linh, pad du dương không đứt quãng
      const ambientChords = [
        [174.61, 220.00, 261.63, 329.63, 392.00], // Fmaj9
        [196.00, 246.94, 293.66, 349.23, 440.00], // G9
        [164.81, 196.00, 246.94, 329.63, 392.00], // Em7
        [220.00, 261.63, 329.63, 392.00, 523.25]  // Am9
      ];
      const chordDuration = 4.0;
      const totalChords = Math.ceil(durationSeconds / chordDuration);

      for (let c = 0; c < totalChords; c++) {
        const chord = ambientChords[c % ambientChords.length];
        const startSample = Math.floor(c * chordDuration * sampleRate);
        const chordSamples = Math.floor(chordDuration * sampleRate);

        for (let i = 0; i < chordSamples; i++) {
          const sIdx = startSample + i;
          if (sIdx >= totalSamples) break;

          const t = i / sampleRate;
          const env = Math.sin((i / chordSamples) * Math.PI) * 0.85 + 0.15;

          let mixL = 0;
          let mixR = 0;

          chord.forEach((freq, fIdx) => {
            const osc1 = Math.sin(2 * Math.PI * freq * t);
            const osc2 = Math.sin(2 * Math.PI * (freq * 1.003) * t) * 0.4;
            const osc3 = Math.sin(2 * Math.PI * (freq * 0.997) * t) * 0.4;
            const sub = Math.sin(2 * Math.PI * (freq * 0.5) * t) * 0.25;

            const val = (osc1 + osc2 + osc3 + sub) * (1 / (fIdx + 1.2));
            mixL += val;
            mixR += val;
          });

          left[sIdx] += mixL * env * 0.45;
          right[sIdx] += mixR * env * 0.45;
        }
      }
    }

    // CHUẨN HÓA BIÊN ĐỘ (NORMALIZATION):
    // Đảm bảo âm lượng đạt đỉnh 0.90 rõ ràng, cân bằng hoàn hảo
    let peak = 0;
    for (let i = 0; i < totalSamples; i++) {
      const aL = Math.abs(left[i]);
      const aR = Math.abs(right[i]);
      if (aL > peak) peak = aL;
      if (aR > peak) peak = aR;
    }

    if (peak > 0) {
      const targetPeak = 0.90;
      const scale = targetPeak / peak;
      for (let i = 0; i < totalSamples; i++) {
        left[i] *= scale;
        right[i] *= scale;
      }
    }

    return audioBuffer;
  }

  /**
   * Vẽ hình ảnh hoặc video tuân thủ Object-Fit (Cover hoặc Contain), chống méo và giữ nguyên tỉ lệ gốc của media
   */
  drawImageObjectFit(ctx, media, canvasW, canvasH, fit = 'cover', zoom = 1.0) {
    if (!media) return;
    const mediaW = media.videoWidth || media.naturalWidth || media.width;
    const mediaH = media.videoHeight || media.naturalHeight || media.height;
    if (!mediaW || !mediaH) return;

    if (fit === 'contain') {
      // Scale để vừa trọn vẹn trong khung hình (không bị mất phần nào của ảnh/video)
      const scale = Math.min(canvasW / mediaW, canvasH / mediaH);
      const drawW = mediaW * scale;
      const drawH = mediaH * scale;
      const drawX = (canvasW - drawW) / 2;
      const drawY = (canvasH - drawH) / 2;

      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.drawImage(media, drawX, drawY, drawW, drawH);
    } else {
      // Cover (Khuyên dùng): scale để phủ kín toàn bộ khung hình, cắt đều 2 bên/trên dưới, không bị méo
      const scale = Math.max(canvasW / mediaW, canvasH / mediaH) * zoom;
      const drawW = mediaW * scale;
      const drawH = mediaH * scale;
      const drawX = (canvasW - drawW) / 2;
      const drawY = (canvasH - drawH) / 2;

      ctx.drawImage(media, drawX, drawY, drawW, drawH);
    }
  }

  /**
   * Tạo hình nền theo preset đồ họa ấn tượng
   */
  drawPresetBackground(ctx, w, h, time = 0) {
    if (this.config.presetBg === 'sunset') {
      // Hoàng hôn tím cam rực rỡ
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#1a0b2e');
      grad.addColorStop(0.35, '#431259');
      grad.addColorStop(0.65, '#8c2559');
      grad.addColorStop(0.85, '#d9534f');
      grad.addColorStop(1, '#f39c12');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Mặt trời lặn phía sau
      const sunY = h * 0.62;
      const sunGrad = ctx.createRadialGradient(w / 2, sunY, 10, w / 2, sunY, 180);
      sunGrad.addColorStop(0, 'rgba(255, 235, 150, 0.95)');
      sunGrad.addColorStop(0.5, 'rgba(243, 156, 18, 0.6)');
      sunGrad.addColorStop(1, 'rgba(217, 83, 79, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(w / 2, sunY, 180, 0, Math.PI * 2);
      ctx.fill();

      // Dãy núi phía chân trời
      ctx.fillStyle = '#0f051d';
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.72);
      ctx.lineTo(w * 0.25, h * 0.68);
      ctx.lineTo(w * 0.5, h * 0.75);
      ctx.lineTo(w * 0.75, h * 0.66);
      ctx.lineTo(w, h * 0.74);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

    } else if (this.config.presetBg === 'cyberpunk') {
      // Đêm Neon Cyberpunk
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#050510');
      grad.addColorStop(0.5, '#0b0c26');
      grad.addColorStop(1, '#1b0933');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Lưới ánh sáng Neon
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.lineWidth = 1;
      const step = 40;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Quầng sáng tím / hồng
      const glow = ctx.createRadialGradient(w * 0.8, h * 0.3, 20, w * 0.8, h * 0.3, 300);
      glow.addColorStop(0, 'rgba(236, 72, 153, 0.35)');
      glow.addColorStop(1, 'rgba(236, 72, 153, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(w * 0.8, h * 0.3, 300, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.config.presetBg === 'lofi') {
      // Cozy Lo-Fi Studio (Tông nâu ấm pastel)
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#1c1917');
      grad.addColorStop(0.5, '#292524');
      grad.addColorStop(1, '#44403c');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Đèn bàn vàng dịu
      const lamp = ctx.createRadialGradient(w * 0.2, h * 0.35, 10, w * 0.2, h * 0.35, 260);
      lamp.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
      lamp.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = lamp;
      ctx.beginPath();
      ctx.arc(w * 0.2, h * 0.35, 260, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // Minimalist Deep Indigo / Violet Gradient
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e1b4b');
      grad.addColorStop(1, '#31104b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Quả cầu phát sáng mềm mại
      const orb = ctx.createRadialGradient(w * 0.5, h * 0.5, 30, w * 0.5, h * 0.5, w * 0.45);
      orb.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
      orb.addColorStop(0.6, 'rgba(139, 92, 246, 0.15)');
      orb.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = orb;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, w * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Xác định định dạng MIME tối ưu của trình duyệt (Ưu tiên MP4 khi xuất video)
   */
  getOptimalMimeType(preferredFormat = 'mp4') {
    if (typeof MediaRecorder === 'undefined') {
      return { mimeType: 'video/mp4', ext: 'mp4' };
    }

    const mp4Types = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4;codecs=avc1',
      'video/mp4;codecs=h264,aac',
      'video/mp4;codecs=h264',
      'video/mp4'
    ];

    const webmTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm'
    ];

    if (preferredFormat === 'mp4') {
      // 1. Thử các chuẩn MP4 (H.264 / AAC) native của Chrome/Edge 106+, Safari
      for (const type of mp4Types) {
        if (MediaRecorder.isTypeSupported(type)) {
          return { mimeType: type, ext: 'mp4' };
        }
      }
      // 2. Nếu MediaRecorder chưa hỗ trợ container video/mp4 (ví dụ Firefox bản cũ), dùng WebM làm luồng thu và đóng gói file .mp4
      for (const type of webmTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          return { mimeType: type, ext: 'mp4' };
        }
      }
      return { mimeType: 'video/mp4', ext: 'mp4' };
    } else {
      // Ưu tiên WebM
      for (const type of webmTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          return { mimeType: type, ext: 'webm' };
        }
      }
      for (const type of mp4Types) {
        if (MediaRecorder.isTypeSupported(type)) {
          return { mimeType: type, ext: 'mp4' };
        }
      }
      return { mimeType: 'video/webm', ext: 'webm' };
    }
  }

  /**
   * Bắt đầu quá trình Render & Xuất Video
   * @param {Blob} voiceBlob - File âm thanh TTS của giọng đọc
   * @param {string} text - Văn bản để hiển thị phụ đề trên video
   */
  async exportVideo(voiceBlob, text) {
    if (this.isRendering) {
      throw new Error("Đang có tiến trình xuất video khác đang chạy.");
    }
    this.isRendering = true;
    this.stopPreviewBgm(); // Dừng nghe thử nếu đang mở
    this.updateDimensions();

    const actx = this.getAudioContext();
    if (actx.state === 'suspended') {
      try {
        await actx.resume();
      } catch (e) {}
    }

    try {
      if (this.onProgress) this.onProgress(5, "Đang giải mã và đồng bộ luồng âm thanh...");

      // 1. Giải mã Audio Buffer của Giọng đọc (Voice)
      const voiceArrayBuffer = await voiceBlob.arrayBuffer();
      const voiceAudioBuffer = await actx.decodeAudioData(voiceArrayBuffer);

      // ÁP DỤNG TỐC ĐỘ ĐỌC (SPEED / RATE):
      const playbackRate = Math.max(0.5, Math.min(2.5, parseFloat(this.config.playbackRate) || 1.0));
      const voiceDuration = voiceAudioBuffer.duration / playbackRate;
      const totalDuration = voiceDuration + 0.6; // Thêm 0.6s đuôi để video kết thúc êm ái

      // 2. Chuẩn bị Nhạc nền (BGM)
      let bgmAudioBuffer = null;
      if (this.config.enableBgm) {
        if (this.config.customBgmAudio) {
          try {
            const bgmArrayBuf = await this.config.customBgmAudio.arrayBuffer();
            bgmAudioBuffer = await actx.decodeAudioData(bgmArrayBuf);
          } catch (e) {
            console.warn("Không thể giải mã file nhạc tùy chỉnh, sử dụng nhạc nền tổng hợp:", e);
            bgmAudioBuffer = this.createSyntheticBgm(totalDuration, this.config.bgmType);
          }
        } else {
          bgmAudioBuffer = this.createSyntheticBgm(totalDuration, this.config.bgmType);
        }
      }

      // 3. Thiết lập Web Audio Mixing Graph
      const audioDestination = actx.createMediaStreamDestination();

      // Nguồn Giọng đọc (Áp dụng đúng tốc độ playbackRate và cao độ pitch)
      const voiceSource = actx.createBufferSource();
      voiceSource.buffer = voiceAudioBuffer;
      voiceSource.playbackRate.value = playbackRate;

      const pitch = Math.max(0.5, Math.min(2.0, parseFloat(this.config.pitch) || 1.0));
      if (pitch !== 1.0) {
        voiceSource.detune.value = Math.round(Math.log2(pitch) * 1200);
      }

      const voiceGain = actx.createGain();
      voiceGain.gain.value = 1.0;
      voiceSource.connect(voiceGain);
      voiceGain.connect(audioDestination);

      // Phân tích tần số cho Visualizer
      const analyser = actx.createAnalyser();
      analyser.fftSize = 128;
      voiceGain.connect(analyser);

      // Nguồn Nhạc nền (BGM) nếu được bật
      let bgmSource = null;
      if (bgmAudioBuffer) {
        bgmSource = actx.createBufferSource();
        bgmSource.buffer = bgmAudioBuffer;
        bgmSource.loop = true;
        const bgmGain = actx.createGain();
        // Cân bằng âm lượng BGM rõ ràng, êm tai (0.12 - 0.50)
        const vol = parseFloat(this.config.bgmVolume) || 0.22;
        bgmGain.gain.value = Math.max(0.10, Math.min(0.60, vol * 1.05));
        bgmSource.connect(bgmGain);
        bgmGain.connect(audioDestination);
      }

      // 4. Thiết lập Canvas Stream & MediaRecorder
      const canvasStream = this.canvas.captureStream(30); // 30 FPS
      const combinedTracks = [
        ...canvasStream.getVideoTracks(),
        ...audioDestination.stream.getAudioTracks()
      ];
      const combinedStream = new MediaStream(combinedTracks);

      // Chọn định dạng MIME tối ưu của trình duyệt (Ưu tiên MP4 khi xuất)
      const preferredFormat = this.config.videoFormat || 'mp4';
      const optimalFormat = this.getOptimalMimeType(preferredFormat);
      const mimeType = optimalFormat.mimeType;
      const fileExt = optimalFormat.ext;

      this.recordedChunks = [];
      const recorderOptions = {
        videoBitsPerSecond: 3500000 // 3.5 Mbps sắc nét
      };
      if (mimeType && typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeType)) {
        recorderOptions.mimeType = mimeType;
      }

      try {
        this.mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);
      } catch (recErr) {
        console.warn("Không thể dùng recorderOptions:", recorderOptions, "sử dụng cấu hình dự phòng:", recErr);
        try {
          this.mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
        } catch (e2) {
          this.mediaRecorder = new MediaRecorder(combinedStream);
        }
      }

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      // 5. Khởi động ghi hình
      // Chuẩn bị phát Video Nền nếu có (loại bỏ hoàn toàn âm thanh gốc của video)
      if (this.config.bgType === 'video' && this.config.customBgVideo) {
        const vid = this.config.customBgVideo;
        vid.currentTime = 0;
        vid.muted = true;
        vid.volume = 0;
        vid.loop = true;
        try {
          await vid.play();
        } catch (e) {
          console.warn("Lỗi tự động phát video nền:", e);
        }
      }

      this.mediaRecorder.start(100);
      const startTime = actx.currentTime;
      voiceSource.start(startTime);
      if (bgmSource) bgmSource.start(startTime);

      // 6. Vòng lặp vẽ Canvas theo thời gian thực (Render Loop)
      const w = this.canvas.width;
      const h = this.canvas.height;
      const ctx = this.ctx;
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      const isPortrait = this.config.aspectRatio === '9:16';

      // Thiết lập Font chính xác trước khi bẻ dòng và đo đạc
      const fontSize = isPortrait ? 22 : 24;
      const lineHeight = isPortrait ? 34 : 36;
      ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", sans-serif`;

      const maxTextWidth = isPortrait ? (w * 0.78) : (w * 0.74);
      const lines = this.wrapText(ctx, text, maxTextWidth);

      const renderFrame = () => {
        if (!this.isRendering) return;

        const elapsed = actx.currentTime - startTime;
        const progressPercent = Math.min(99, Math.round((elapsed / totalDuration) * 100));

        if (this.onProgress) {
          this.onProgress(progressPercent, `Đang kết xuất video (${playbackRate.toFixed(2)}x): ${progressPercent}%`);
        }

        // --- A. VẼ NỀN (VIDEO NỀN / ẢNH TÙY CHỈNH / PRESET) ---
        if (this.config.bgType === 'video' && this.config.customBgVideo) {
          const vid = this.config.customBgVideo;
          if (vid.paused && !vid.ended) {
            vid.play().catch(() => {});
          }
          this.drawImageObjectFit(ctx, vid, w, h, this.config.bgObjectFit || 'cover', 1.0);

          // Phủ lớp màn mờ tối điện ảnh (40%) để nổi bật phụ đề và sóng âm
          ctx.fillStyle = 'rgba(0, 0, 0, 0.40)';
          ctx.fillRect(0, 0, w, h);
        } else if (this.config.bgType === 'custom' && this.config.customBgImage) {
          const zoom = 1 + (elapsed / totalDuration) * 0.04;
          this.drawImageObjectFit(ctx, this.config.customBgImage, w, h, this.config.bgObjectFit || 'cover', zoom);

          ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
          ctx.fillRect(0, 0, w, h);
        } else {
          this.drawPresetBackground(ctx, w, h, elapsed);
        }

        // --- B. VẼ SÓNG ÂM THANH (AUDIO WAVEFORM) TRƯỚC PHỤ ĐỀ ---
        // Vẽ sóng âm trước để phụ đề luôn nằm trên cùng sắc nét
        if (this.config.showWaveform) {
          analyser.getByteFrequencyData(frequencyData);

          if (this.config.waveformStyle === 'circle') {
            // Sóng âm thanh dạng vòng tròn Podcast
            const centerX = w / 2;
            let centerY;
            if (this.config.subtitlePosition === 'bottom') {
              centerY = isPortrait ? h * 0.40 : h * 0.38;
            } else if (this.config.subtitlePosition === 'top') {
              centerY = isPortrait ? h * 0.60 : h * 0.58;
            } else {
              // center
              centerY = isPortrait ? h * 0.80 : h * 0.82;
            }

            const baseRadius = isPortrait ? 55 : 65;
            const numRays = 48;

            ctx.save();
            ctx.translate(centerX, centerY);

            ctx.beginPath();
            ctx.arc(0, 0, baseRadius - 6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
            ctx.fill();
            ctx.strokeStyle = '#818cf8';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            for (let i = 0; i < numRays; i++) {
              const angle = (i / numRays) * Math.PI * 2;
              const dataIdx = Math.floor((i / numRays) * frequencyData.length);
              const val = frequencyData[dataIdx] || 0;
              const rayLen = Math.max(4, (val / 255) * (isPortrait ? 60 : 70));

              const x1 = Math.cos(angle) * baseRadius;
              const y1 = Math.sin(angle) * baseRadius;
              const x2 = Math.cos(angle) * (baseRadius + rayLen);
              const y2 = Math.sin(angle) * (baseRadius + rayLen);

              ctx.strokeStyle = i % 2 === 0 ? '#6366f1' : '#ec4899';
              ctx.lineWidth = 3.5;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
            }
            ctx.restore();

          } else if (this.config.waveformStyle === 'waterfall') {
            // Sóng dải thác nước mềm mại đa tầng (Waterfall Flowing Waves)
            let waveBaseY;
            if (this.config.subtitlePosition === 'bottom') {
              waveBaseY = isPortrait ? h * 0.40 : h * 0.38;
            } else if (this.config.subtitlePosition === 'top') {
              waveBaseY = isPortrait ? h * 0.78 : h * 0.76;
            } else {
              waveBaseY = isPortrait ? h * 0.82 : h * 0.80;
            }

            let sumEnergy = 0;
            for (let k = 0; k < frequencyData.length; k++) sumEnergy += frequencyData[k];
            const avgEnergy = (sumEnergy / (frequencyData.length * 255)) || 0;
            const maxAmp = (isPortrait ? 40 : 36) * (0.35 + avgEnergy * 1.6);

            const layers = [
              { color: 'rgba(99, 102, 241, 0.40)', stroke: '#818cf8', freq: 0.008, speed: 2.8, offset: 0, ampMult: 1.0 },
              { color: 'rgba(236, 72, 153, 0.32)', stroke: '#f472b6', freq: 0.012, speed: -2.2, offset: Math.PI / 3, ampMult: 0.8 },
              { color: 'rgba(6, 182, 212, 0.36)', stroke: '#22d3ee', freq: 0.015, speed: 3.4, offset: Math.PI * 0.7, ampMult: 1.1 }
            ];

            layers.forEach(layer => {
              ctx.beginPath();
              ctx.moveTo(0, h);
              ctx.lineTo(0, waveBaseY);

              const step = 8;
              for (let x = 0; x <= w; x += step) {
                const dataIdx = Math.min(frequencyData.length - 1, Math.floor((x / w) * (frequencyData.length * 0.8)));
                const freqVal = (frequencyData[dataIdx] || 0) / 255;
                const dynamicAmp = maxAmp * (0.4 + freqVal * 0.9) * layer.ampMult;
                const waveSin = Math.sin(x * layer.freq + elapsed * layer.speed + layer.offset);
                const y = waveBaseY + waveSin * dynamicAmp;
                ctx.lineTo(x, y);
              }

              ctx.lineTo(w, h);
              ctx.closePath();
              ctx.fillStyle = layer.color;
              ctx.fill();
              ctx.strokeStyle = layer.stroke;
              ctx.lineWidth = 2.0;
              ctx.stroke();
            });

          } else {
            // Sóng âm thanh dạng thanh neon (Bars)
            const barCount = isPortrait ? 32 : 48;
            const barWidth = Math.max(4, (w * 0.75) / barCount - 4);
            const totalWaveWidth = barCount * (barWidth + 4);
            const startX = (w - totalWaveWidth) / 2;

            let waveY;
            if (this.config.subtitlePosition === 'bottom') {
              waveY = isPortrait ? h * 0.38 : h * 0.36;
            } else if (this.config.subtitlePosition === 'top') {
              waveY = isPortrait ? h * 0.80 : h * 0.78;
            } else {
              // center
              waveY = isPortrait ? h * 0.82 : h * 0.80;
            }

            const waveGrad = ctx.createLinearGradient(startX, 0, startX + totalWaveWidth, 0);
            waveGrad.addColorStop(0, '#6366f1');
            waveGrad.addColorStop(0.5, '#ec4899');
            waveGrad.addColorStop(1, '#06b6d4');

            for (let i = 0; i < barCount; i++) {
              const dataIdx = Math.floor((i / barCount) * frequencyData.length);
              const val = frequencyData[dataIdx] || 0;
              const barHeight = Math.max(6, (val / 255) * (isPortrait ? 85 : 75));
              const x = startX + i * (barWidth + 4);
              const y = waveY - barHeight / 2;

              ctx.fillStyle = waveGrad;
              ctx.shadowColor = 'rgba(99, 102, 241, 0.6)';
              ctx.shadowBlur = 8;
              ctx.beginPath();
              ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }
        }

        // --- C. VẼ PHỤ ĐỀ / NỘI DUNG VĂN BẢN (SUBTITLES) ---
        if (this.config.showSubtitles && lines.length > 0) {
          ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Giới hạn số dòng hiển thị mỗi trang để không tràn
          const maxVisibleLines = isPortrait ? 3 : 2;
          const numBatches = Math.max(1, Math.ceil(lines.length / maxVisibleLines));
          const lineStep = voiceDuration / numBatches;
          const currentBatch = Math.min(numBatches - 1, Math.floor(elapsed / lineStep));
          const startIndex = currentBatch * maxVisibleLines;
          const visibleLines = lines.slice(startIndex, startIndex + maxVisibleLines);

          // Tính toán chiều rộng và cao hộp theo dòng thực tế
          let maxLineWidth = 0;
          visibleLines.forEach(l => {
            const m = ctx.measureText(l);
            if (m.width > maxLineWidth) maxLineWidth = m.width;
          });

          const padX = isPortrait ? 24 : 32;
          const padY = isPortrait ? 16 : 18;
          const boxW = Math.min(w * 0.90, maxLineWidth + padX * 2);
          const boxH = visibleLines.length * lineHeight + padY * 2;

          // Vị trí theo cấu hình: Top, Center, Bottom (Không bị cắt mép)
          let startY;
          if (this.config.subtitlePosition === 'top') {
            startY = isPortrait ? 130 : 60;
          } else if (this.config.subtitlePosition === 'bottom') {
            startY = isPortrait ? (h - boxH - 130) : (h - boxH - 60);
          } else {
            // center
            startY = (h - boxH) / 2;
          }

          // Giới hạn an toàn tuyệt đối
          startY = Math.max(20, Math.min(h - boxH - 20, startY));

          // Hộp nền kính mờ bo tròn
          ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect((w - boxW) / 2, startY, boxW, boxH, 18);
          ctx.fill();
          ctx.stroke();

          // Vẽ từng dòng chữ chính giữa hộp
          visibleLines.forEach((line, idx) => {
            const textY = startY + padY + idx * lineHeight + lineHeight / 2;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            ctx.shadowBlur = 6;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(line, w / 2, textY);
            ctx.shadowBlur = 0;
          });
        }

        // --- D. LOGO & THANH TIẾN ĐỘ ---
        const barH = 4;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(0, h - barH, w, barH);
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(0, h - barH, w * (elapsed / totalDuration), barH);

        // Watermark thương hiệu góc trên (Mặc định: Huawnef)
        if (this.config.showWatermark && this.config.watermarkText) {
          ctx.save();
          ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
          ctx.shadowBlur = 4;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText('✨ ' + this.config.watermarkText, 24, 24);
          ctx.restore();
        }

        // Kiểm tra xem đã kết thúc chưa
        if (elapsed < totalDuration) {
          requestAnimationFrame(renderFrame);
        } else {
          // Dừng nguồn âm thanh & video nền trước khi hoàn tất ghi hình
          try {
            if (voiceSource) voiceSource.stop();
            if (bgSource) bgSource.stop();
            if (this.config.customBgVideo) this.config.customBgVideo.pause();
          } catch (e) {}
          // Hoàn thành xuất video (MP4 / WebM)
          this.finishRecording(mimeType, fileExt);
        }
      };

      requestAnimationFrame(renderFrame);

    } catch (err) {
      this.isRendering = false;
      try {
        if (typeof voiceSource !== 'undefined' && voiceSource) voiceSource.stop();
        if (typeof bgSource !== 'undefined' && bgSource) bgSource.stop();
        if (this.config.customBgVideo) this.config.customBgVideo.pause();
      } catch (e) {}
      if (this.onError) this.onError(err.message || "Lỗi trong quá trình kết xuất video.");
    }
  }

  /**
   * Kết thúc quá trình ghi hình và tạo Blob tải về
   */
  finishRecording(mimeType, targetExt = 'mp4') {
    if (!this.mediaRecorder) return;

    this.mediaRecorder.onstop = () => {
      this.isRendering = false;
      const finalExt = targetExt || (this.config.videoFormat === 'webm' ? 'webm' : 'mp4');
      const blobMime = finalExt === 'mp4' ? 'video/mp4' : (mimeType || 'video/webm');
      const videoBlob = new Blob(this.recordedChunks, { type: blobMime });
      const videoUrl = URL.createObjectURL(videoBlob);

      if (this.onProgress) this.onProgress(100, `Hoàn thành xuất video ${finalExt.toUpperCase()}!`);
      if (this.onComplete) {
        this.onComplete(videoBlob, videoUrl, finalExt);
      }
    };

    this.mediaRecorder.stop();
  }

  /**
   * Cắt dòng văn bản tự nhiên theo độ rộng khung hình, xử lý xuống dòng và từ dài
   */
  wrapText(ctx, text, maxWidth) {
    if (!text) return [];
    const paragraphs = text.split(/\r?\n+/);
    const lines = [];

    for (const paragraph of paragraphs) {
      const words = paragraph.trim().split(/\s+/).filter(Boolean);
      let currentLine = '';

      for (const word of words) {
        const wordMetric = ctx.measureText(word);
        if (wordMetric.width > maxWidth) {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = '';
          }
          let tempWord = '';
          for (const char of word) {
            if (ctx.measureText(tempWord + char).width > maxWidth - 24) {
              lines.push(tempWord + '-');
              tempWord = char;
            } else {
              tempWord += char;
            }
          }
          currentLine = tempWord;
          continue;
        }

        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
    }
    return lines.filter(Boolean);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VideoExporter };
}
