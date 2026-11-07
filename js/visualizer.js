/**
 * AudioVisualizer - Quản lý hiệu ứng sóng âm (Waveform / Equalizer) trên Canvas
 * Hỗ trợ cả Web Audio API AnalyserNode thật và chế độ mô phỏng sinh động khi dùng SpeechSynthesis
 */

class AudioVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
    this.animationId = null;
    this.isActive = false;
    this.mode = 'bars'; // 'bars' | 'wave'

    // Dữ liệu mô phỏng khi dùng SpeechSynthesis
    this.simulatedBars = Array.from({ length: 36 }, () => ({
      val: 2,
      target: 2,
      speed: 0.1 + Math.random() * 0.15
    }));
    this.phase = 0;

    this.initCanvasSize();
    window.addEventListener('resize', () => this.initCanvasSize());
    this.drawRestingState();
  }

  initCanvasSize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    if (!this.isActive) {
      this.drawRestingState();
    }
  }

  /**
   * Kết nối phần tử <audio> vào AnalyserNode để đọc tần số thực tế
   */
  connectAudioElement(audioElement) {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      if (!this.analyser) {
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 128;
        this.analyser.smoothingTimeConstant = 0.8;
      }

      if (!this.sourceNode && audioElement) {
        // Tránh tạo nhiều mediaElementSource trên cùng 1 audio element
        try {
          this.sourceNode = this.audioContext.createMediaElementSource(audioElement);
          this.sourceNode.connect(this.analyser);
          this.analyser.connect(this.audioContext.destination);
        } catch (e) {
          // Bỏ qua nếu audio element đã được kết nối trước đó
        }
      }
    } catch (err) {
      console.warn("Không thể kết nối Web Audio Analyser, dùng visualizer mô phỏng:", err);
    }
  }

  start(isRealAudio = false) {
    this.isActive = true;
    if (this.animationId) cancelAnimationFrame(this.animationId);

    const render = () => {
      if (!this.isActive) return;
      this.draw(isRealAudio);
      this.animationId = requestAnimationFrame(render);
    };
    render();
  }

  stop() {
    this.isActive = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.drawRestingState();
  }

  drawRestingState() {
    if (!this.ctx || !this.width) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    // Vẽ đường baseline tinh tế
    const isDark = document.documentElement.classList.contains('dark');
    ctx.beginPath();
    ctx.strokeStyle = isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.2)';
    ctx.lineWidth = 2;
    ctx.moveTo(10, h / 2);
    ctx.lineTo(w - 10, h / 2);
    ctx.stroke();

    // Điểm nhấn ở giữa
    const barCount = 28;
    const barWidth = Math.max(3, (w - 40) / barCount - 3);
    for (let i = 0; i < barCount; i++) {
      const x = 20 + i * (barWidth + 3);
      const barH = 3;
      ctx.fillStyle = isDark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(148, 163, 184, 0.35)';
      ctx.beginPath();
      ctx.roundRect(x, (h - barH) / 2, barWidth, barH, 2);
      ctx.fill();
    }
  }

  draw(isRealAudio) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    const isDark = document.documentElement.classList.contains('dark');

    // Gradient màu sóng âm hiện đại (Indigo -> Violet -> Cyan)
    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    if (isDark) {
      gradient.addColorStop(0, '#6366f1');   // Indigo 500
      gradient.addColorStop(0.35, '#8b5cf6'); // Violet 500
      gradient.addColorStop(0.7, '#ec4899');  // Pink 500
      gradient.addColorStop(1, '#06b6d4');   // Cyan 500
    } else {
      gradient.addColorStop(0, '#4f46e5');   // Indigo 600
      gradient.addColorStop(0.35, '#7c3aed'); // Violet 600
      gradient.addColorStop(0.7, '#db2777');  // Pink 600
      gradient.addColorStop(1, '#0891b2');   // Cyan 600
    }

    if (isRealAudio && this.analyser) {
      // Dùng dữ liệu tần số thật
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyser.getByteFrequencyData(dataArray);

      const barCount = 36;
      const barWidth = Math.max(3, (w - 40) / barCount - 3);
      const step = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        const val = dataArray[i * step] || 0;
        const normalized = val / 255;
        const barHeight = Math.max(4, normalized * (h * 0.85));
        const x = 20 + i * (barWidth + 3);
        const y = (h - barHeight) / 2;

        ctx.fillStyle = gradient;
        ctx.shadowColor = isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.2)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    } else {
      // Dùng thuật toán mô phỏng chuyển động nhịp điệu giọng nói
      this.phase += 0.08;
      const barCount = this.simulatedBars.length;
      const barWidth = Math.max(3, (w - 40) / barCount - 3);

      for (let i = 0; i < barCount; i++) {
        const item = this.simulatedBars[i];

        // Ngẫu nhiên thay đổi mục tiêu theo nhịp
        if (Math.abs(item.val - item.target) < 1 || Math.random() < 0.1) {
          const envelope = Math.sin((i / barCount) * Math.PI); // Giữa cao, 2 bên thấp
          const noise = Math.sin(this.phase * item.speed + i) * 0.5 + 0.5;
          item.target = 4 + (h * 0.75) * envelope * (0.3 + noise * 0.7);
        }

        item.val += (item.target - item.val) * 0.18;
        const barHeight = Math.max(4, item.val);
        const x = 20 + i * (barWidth + 3);
        const y = (h - barHeight) / 2;

        ctx.fillStyle = gradient;
        ctx.shadowColor = isDark ? 'rgba(139, 92, 246, 0.45)' : 'rgba(139, 92, 246, 0.25)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AudioVisualizer };
}

