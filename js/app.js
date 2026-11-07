/**
 * App.js - Trung tâm điều khiển chính của ứng dụng Text-to-Speech
 * Xử lý tương tác giao diện người dùng, bộ đếm từ, kết nối TTSEngine,
 * visualizer, cài đặt và hệ thống thông báo Toast.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Khởi tạo các module
  const engine = new TTSEngine();
  const visualizer = new AudioVisualizer('waveformCanvas');

  // 2. Tham chiếu các phần tử DOM
  const textInput = document.getElementById('textInput');
  const charCountEl = document.getElementById('charCount');
  const wordCountEl = document.getElementById('wordCount');
  const estTimeEl = document.getElementById('estTime');

  const sourceSelect = document.getElementById('sourceSelect');
  const browserVoiceGroup = document.getElementById('browserVoiceGroup');
  const browserVoiceSelect = document.getElementById('browserVoiceSelect');
  const googleVoiceGroup = document.getElementById('googleVoiceGroup');
  const googleLangSelect = document.getElementById('googleLangSelect');
  const hfVoiceGroup = document.getElementById('hfVoiceGroup');
  const hfModelSelect = document.getElementById('hfModelSelect');
  const elevenVoiceGroup = document.getElementById('elevenVoiceGroup');
  const elevenVoiceSelect = document.getElementById('elevenVoiceSelect');

  const rateSlider = document.getElementById('rateSlider');
  const rateValue = document.getElementById('rateValue');
  const pitchSlider = document.getElementById('pitchSlider');
  const pitchValue = document.getElementById('pitchValue');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeValue = document.getElementById('volumeValue');
  const resetParamsBtn = document.getElementById('resetParamsBtn');

  const playBtn = document.getElementById('playBtn');
  const playBtnIcon = document.getElementById('playBtnIcon');
  const playBtnText = document.getElementById('playBtnText');
  const pauseBtn = document.getElementById('pauseBtn');
  const stopBtn = document.getElementById('stopBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const downloadFormatBadge = document.getElementById('downloadFormatBadge');

  const clearTextBtn = document.getElementById('clearTextBtn');
  const pasteTextBtn = document.getElementById('pasteTextBtn');
  const templateSelect = document.getElementById('templateSelect');
  const themeToggle = document.getElementById('themeToggle');
  const micBtn = document.getElementById('micBtn');
  const micIcon = document.getElementById('micIcon');
  const micText = document.getElementById('micText');
  const embedBtn = document.getElementById('embedBtn');

  // Modal cài đặt
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const hfTokenInput = document.getElementById('hfTokenInput');
  const elevenKeyInput = document.getElementById('elevenKeyInput');

  // 3. Quản lý Dark/Light Mode
  function initTheme() {
    const savedTheme = localStorage.getItem('tts_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
  initTheme();

  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('tts_theme', isDark ? 'dark' : 'light');
    visualizer.drawRestingState();
  });

  // 4. Hệ thống Toast thông báo hiện đại
  function showToast(message, type = 'info', duration = 3800) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium glass-card toast-enter border transition-all duration-300 max-w-sm pointer-events-auto`;

    let iconSvg = '';
    let borderClass = '';
    let textClass = '';

    if (type === 'success') {
      borderClass = 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300';
      iconSvg = `<svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
    } else if (type === 'error') {
      borderClass = 'border-rose-500/30 text-rose-700 dark:text-rose-300';
      iconSvg = `<svg class="w-5 h-5 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
    } else if (type === 'warning') {
      borderClass = 'border-amber-500/30 text-amber-700 dark:text-amber-300';
      iconSvg = `<svg class="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
    } else {
      borderClass = 'border-indigo-500/30 text-slate-800 dark:text-slate-200';
      iconSvg = `<svg class="w-5 h-5 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    }

    toast.classList.add(...borderClass.split(' '));
    toast.innerHTML = `
      ${iconSvg}
      <div class="flex-1 text-xs sm:text-sm leading-tight">${message}</div>
      <button class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1 shrink-0 p-1">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    `;

    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', () => removeToast(toast));

    container.appendChild(toast);

    const timer = setTimeout(() => {
      removeToast(toast);
    }, duration);

    function removeToast(el) {
      clearTimeout(timer);
      el.classList.remove('toast-enter');
      el.classList.add('toast-leave');
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 250);
    }
  }

  // 5. Cập nhật thống kê văn bản (Ký tự, Số từ, Thời gian đọc ước tính)
  function updateTextStats() {
    const text = textInput.value;
    const charCount = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;

    charCountEl.textContent = charCount.toLocaleString('vi-VN');
    wordCountEl.textContent = words.toLocaleString('vi-VN');

    // Tốc độ đọc trung bình khoảng 140 - 160 từ/phút ở mức rate 1.0x
    const rate = parseFloat(rateSlider.value) || 1.0;
    const effectiveWpm = 150 * rate;
    const totalSeconds = words > 0 ? Math.ceil((words / effectiveWpm) * 60) : 0;

    if (totalSeconds < 60) {
      estTimeEl.textContent = `~${totalSeconds} giây`;
    } else {
      const minutes = Math.floor(totalSeconds / 60);
      const remainingSecs = totalSeconds % 60;
      estTimeEl.textContent = remainingSecs > 0 ? `~${minutes}p ${remainingSecs}s` : `~${minutes} phút`;
    }
  }

  textInput.addEventListener('input', () => {
    updateTextStats();
    engine.currentAudioBlob = null; // Xóa cache âm thanh khi nội dung thay đổi
    engine.lastRenderedText = null;
    if (typeof updateVideoPreview === 'function') {
      updateVideoPreview();
    }
  });

  // 6. Tải danh sách Giọng đọc Trình duyệt
  function populateBrowserVoices() {
    const voices = engine.getAvailableBrowserVoices();
    browserVoiceSelect.innerHTML = '';

    if (voices.length === 0) {
      browserVoiceSelect.innerHTML = '<option value="">(Đang tải danh sách giọng...)</option>';
      return;
    }

    // Nhóm giọng đọc theo tiếng Việt, tiếng Anh và các ngôn ngữ khác
    const vietnameseVoices = [];
    const englishVoices = [];
    const otherVoices = [];

    voices.forEach(voice => {
      const lang = voice.lang.toLowerCase();
      if (lang.includes('vi')) {
        vietnameseVoices.push(voice);
      } else if (lang.includes('en')) {
        englishVoices.push(voice);
      } else {
        otherVoices.push(voice);
      }
    });

    const createOptGroup = (label, voiceList) => {
      if (voiceList.length === 0) return null;
      const group = document.createElement('optgroup');
      group.label = label;
      voiceList.forEach(v => {
        const option = document.createElement('option');
        option.value = v.voiceURI;
        const isDefault = v.default ? ' [Mặc định]' : '';
        const isLocal = v.localService ? ' ⚡' : ' 🌐';
        option.textContent = `${v.name} (${v.lang})${isDefault}${isLocal}`;
        group.appendChild(option);
      });
      return group;
    };

    const gVi = createOptGroup('🇻🇳 Tiếng Việt', vietnameseVoices);
    const gEn = createOptGroup('🇺🇸/🇬🇧 Tiếng Anh', englishVoices);
    const gOther = createOptGroup('🌍 Các ngôn ngữ khác', otherVoices);

    if (gVi) browserVoiceSelect.appendChild(gVi);
    if (gEn) browserVoiceSelect.appendChild(gEn);
    if (gOther) browserVoiceSelect.appendChild(gOther);

    // Ưu tiên tự động chọn giọng tiếng Việt nếu có
    if (vietnameseVoices.length > 0) {
      browserVoiceSelect.value = vietnameseVoices[0].voiceURI;
      engine.settings.selectedBrowserVoiceURI = vietnameseVoices[0].voiceURI;
    } else if (voices.length > 0) {
      browserVoiceSelect.value = voices[0].voiceURI;
      engine.settings.selectedBrowserVoiceURI = voices[0].voiceURI;
    }
  }

  // Lắng nghe thay đổi giọng trình duyệt
  if (window.speechSynthesis) {
    populateBrowserVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      populateBrowserVoices();
    };
  }

  browserVoiceSelect.addEventListener('change', (e) => {
    engine.settings.selectedBrowserVoiceURI = e.target.value;
    engine.currentAudioBlob = null;
    engine._cachedVoiceSig = null;
    engine.lastRenderedText = null;
  });

  googleLangSelect.addEventListener('change', (e) => {
    engine.settings.selectedGoogleLang = e.target.value;
    engine.currentAudioBlob = null;
    engine._cachedVoiceSig = null;
    engine.lastRenderedText = null;
  });

  hfModelSelect.addEventListener('change', (e) => {
    engine.settings.hfModel = e.target.value;
    localStorage.setItem('tts_hf_model', e.target.value);
    engine.currentAudioBlob = null;
    engine._cachedVoiceSig = null;
    engine.lastRenderedText = null;
  });

  elevenVoiceSelect.addEventListener('change', (e) => {
    engine.settings.elevenLabsVoiceId = e.target.value;
    localStorage.setItem('tts_elevenlabs_voice', e.target.value);
    engine.currentAudioBlob = null;
    engine._cachedVoiceSig = null;
    engine.lastRenderedText = null;
  });

  // 7. Chuyển đổi Nguồn giọng đọc (Source Selection)
  sourceSelect.addEventListener('change', (e) => {
    const src = e.target.value;
    engine.currentSource = src;
    engine.currentAudioBlob = null;
    engine._cachedVoiceSig = null;
    engine.lastRenderedText = null;

    // Ẩn tất cả các nhóm tùy chọn giọng
    browserVoiceGroup.classList.add('hidden');
    googleVoiceGroup.classList.add('hidden');
    hfVoiceGroup.classList.add('hidden');
    elevenVoiceGroup.classList.add('hidden');

    if (src === 'browser') {
      browserVoiceGroup.classList.remove('hidden');
      downloadFormatBadge.textContent = "MP3 (Chuyển đổi)";
      showToast("Đã chọn: Giọng đọc trình duyệt (Offline & Miễn phí)", "info");
    } else if (src === 'google') {
      googleVoiceGroup.classList.remove('hidden');
      downloadFormatBadge.textContent = "MP3 Trực tiếp";
      showToast("Đã chọn: Google Translate TTS (Miễn phí, tự nhiên, không cần API Key)", "success");
    } else if (src === 'huggingface') {
      hfVoiceGroup.classList.remove('hidden');
      downloadFormatBadge.textContent = "WAV / AI Audio";
      showToast("Đã chọn: Hugging Face AI Neural TTS", "info");
      if (!engine.settings.hfToken) {
        showToast("Mẹo: Bạn có thể nhập Token Hugging Face miễn phí trong Cài đặt để tăng hạn mức truy vấn.", "warning", 5000);
      }
    } else if (src === 'elevenlabs') {
      elevenVoiceGroup.classList.remove('hidden');
      downloadFormatBadge.textContent = "MP3 Studio";
      if (!engine.settings.elevenLabsKey) {
        showToast("Vui lòng cấu hình API Key ElevenLabs trong menu Cài đặt để sử dụng.", "warning", 4500);
      }
    }
  });

  // 8. Điều khiển thanh trượt (Pitch, Rate, Volume)
  rateSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    rateValue.textContent = `${val.toFixed(2)}x`;
    engine.settings.rate = val;
    if (typeof videoExporter !== 'undefined') {
      videoExporter.config.playbackRate = val;
    }
    updateTextStats();
  });

  pitchSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    pitchValue.textContent = val.toFixed(2);
    engine.settings.pitch = val;
    if (typeof videoExporter !== 'undefined') {
      videoExporter.config.pitch = val;
    }
  });

  volumeSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    volumeValue.textContent = `${val}%`;
    engine.settings.volume = val / 100;
  });

  resetParamsBtn.addEventListener('click', () => {
    rateSlider.value = 1.0;
    rateValue.textContent = "1.00x";
    engine.settings.rate = 1.0;

    pitchSlider.value = 1.0;
    pitchValue.textContent = "1.00";
    engine.settings.pitch = 1.0;

    volumeSlider.value = 100;
    volumeValue.textContent = "100%";
    engine.settings.volume = 1.0;

    if (typeof videoExporter !== 'undefined') {
      videoExporter.config.playbackRate = 1.0;
      videoExporter.config.pitch = 1.0;
    }

    updateTextStats();
    showToast("Đã khôi phục các thông số về mặc định", "info");
  });

  // 9. Nạp văn bản mẫu (Templates)
  function initTemplates() {
    templateSelect.innerHTML = '<option value="">⚡ Chọn văn bản mẫu thử nghiệm...</option>';
    if (typeof SAMPLE_TEMPLATES !== 'undefined') {
      SAMPLE_TEMPLATES.forEach(tpl => {
        const opt = document.createElement('option');
        opt.value = tpl.id;
        opt.textContent = `${tpl.title}`;
        templateSelect.appendChild(opt);
      });
    }
  }
  initTemplates();

  templateSelect.addEventListener('change', (e) => {
    const id = e.target.value;
    if (!id) return;
    const item = SAMPLE_TEMPLATES.find(t => t.id === id);
    if (item) {
      textInput.value = item.text;
      updateTextStats();
      showToast(`Đã nạp mẫu: ${item.category}`, "success");
      // Tự động gợi ý chuyển ngôn ngữ nếu là mẫu tiếng Anh
      if (item.category === 'English' && engine.currentSource === 'google') {
        googleLangSelect.value = 'en';
        engine.settings.selectedGoogleLang = 'en';
      }
    }
  });

  // Xóa nhanh văn bản
  clearTextBtn.addEventListener('click', () => {
    if (!textInput.value.trim()) return;
    textInput.value = '';
    updateTextStats();
    engine.stop();
    showToast("Đã xóa trắng khung văn bản", "info");
  });

  // Dán từ Clipboard
  pasteTextBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        textInput.value = text;
        updateTextStats();
        showToast("Đã dán văn bản từ bộ nhớ tạm", "success");
      } else {
        showToast("Bộ nhớ tạm rỗng hoặc không có văn bản", "warning");
      }
    } catch (err) {
      showToast("Không thể truy cập Clipboard (trình duyệt chặn quyền truy cập)", "error");
    }
  });

  // Nhập văn bản bằng giọng nói (Microphone Dictation)
  if (micBtn) {
    let originalPlaceholder = textInput.placeholder;

    engine.onRecognitionResult = ({ final, interim }) => {
      if (final) {
        textInput.value = (textInput.value + ' ' + final).trim();
        updateTextStats();
      }
      if (interim) {
        textInput.placeholder = `Đang nghe: "${interim}"...`;
      }
    };

    engine.onRecognitionEnd = () => {
      micBtn.classList.remove('bg-rose-500', 'text-white', 'animate-pulse');
      micBtn.classList.add('text-slate-600', 'dark:text-slate-300');
      micText.textContent = "Nhập bằng mic";
      textInput.placeholder = originalPlaceholder;
    };

    micBtn.addEventListener('click', () => {
      try {
        const lang = engine.settings.selectedGoogleLang === 'en' ? 'en-US' : 'vi-VN';
        const isStarted = engine.toggleSpeechRecognition(lang);

        if (isStarted) {
          micBtn.classList.remove('text-slate-600', 'dark:text-slate-300');
          micBtn.classList.add('bg-rose-500', 'text-white', 'animate-pulse');
          micText.textContent = "Đang nghe...";
          showToast("Đang lắng nghe giọng nói của bạn... Hãy nói vào micro!", "info");
        } else {
          engine.onRecognitionEnd();
          showToast("Đã dừng ghi âm giọng nói", "info");
        }
      } catch (err) {
        showToast(err.message, "warning", 5000);
      }
    });
  }

  // Lấy mã nhúng Widget (Embed)
  if (embedBtn) {
    embedBtn.addEventListener('click', async () => {
      const embedCode = `<iframe src="${window.location.origin || 'http://localhost:3000'}" width="100%" height="780" frameborder="0" style="border-radius:16px; border:none; box-shadow:0 10px 30px rgba(0,0,0,0.15);" allow="microphone; clipboard-read; clipboard-write"></iframe>`;
      try {
        await navigator.clipboard.writeText(embedCode);
        showToast("Đã sao chép thẻ <iframe> mã nhúng vào bộ nhớ tạm!", "success");
      } catch (e) {
        prompt("Sao chép mã nhúng bên dưới:", embedCode);
      }
    });
  }

  // Tải tệp văn bản (.txt, .md, .json) từ máy tính
  const importFileBtn = document.getElementById('importFileBtn');
  const textFileInput = document.getElementById('textFileInput');

  if (importFileBtn && textFileInput) {
    importFileBtn.addEventListener('click', () => textFileInput.click());

    textFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        textInput.value = event.target.result;
        updateTextStats();
        showToast(`Đã mở tệp: ${file.name} (${textInput.value.length.toLocaleString('vi-VN')} ký tự)`, "success");
      };
      reader.onerror = () => showToast("Không thể đọc tệp văn bản này.", "error");
      reader.readAsText(file);
    });
  }

  // Kéo & Thả tệp văn bản vào Textarea
  textInput.addEventListener('dragover', (e) => {
    e.preventDefault();
    textInput.classList.add('border-indigo-500', 'ring-2', 'ring-indigo-500/20');
  });

  textInput.addEventListener('dragleave', () => {
    textInput.classList.remove('border-indigo-500', 'ring-2', 'ring-indigo-500/20');
  });

  textInput.addEventListener('drop', (e) => {
    e.preventDefault();
    textInput.classList.remove('border-indigo-500', 'ring-2', 'ring-indigo-500/20');

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        textInput.value = event.target.result;
        updateTextStats();
        showToast(`Đã nạp tệp: ${file.name}`, "success");
      };
      reader.readAsText(file);
    }
  });

  // Chèn khoảng nghỉ (Pause Chips)
  const pauseChips = document.querySelectorAll('.insert-pause-chip');
  pauseChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const pauseStr = chip.dataset.pause;
      const start = textInput.selectionStart;
      const end = textInput.selectionEnd;
      const val = textInput.value;

      textInput.value = val.substring(0, start) + pauseStr + val.substring(end);
      textInput.selectionStart = textInput.selectionEnd = start + pauseStr.length;
      textInput.focus();
      updateTextStats();
      showToast(`Đã chèn khoảng nghỉ "${pauseStr.trim()}"`, "info", 1800);
    });
  });

  // 10. Xử lý các sự kiện TTSEngine & Visualizer
  engine.onStateChange = (state) => {
    if (state === 'playing') {
      playBtnIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
      playBtnText.textContent = "Tạm dừng";
      playBtn.classList.remove('from-indigo-600', 'to-violet-600', 'hover:from-indigo-500', 'hover:to-violet-500');
      playBtn.classList.add('from-amber-600', 'to-orange-600', 'hover:from-amber-500', 'hover:to-orange-500');

      // Kích hoạt Visualizer
      if (engine.currentSource === 'google' || engine.currentSource === 'huggingface' || engine.currentSource === 'elevenlabs') {
        visualizer.connectAudioElement(engine.audioElement);
        visualizer.start(true);
      } else {
        visualizer.start(false);
      }
    } else if (state === 'paused') {
      playBtnIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
      playBtnText.textContent = "Tiếp tục";
      playBtn.classList.remove('from-amber-600', 'to-orange-600', 'hover:from-amber-500', 'hover:to-orange-500');
      playBtn.classList.add('from-emerald-600', 'to-teal-600', 'hover:from-emerald-500', 'hover:to-teal-500');
      visualizer.stop();
    } else if (state === 'loading') {
      playBtnIcon.innerHTML = `<svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>`;
      playBtnText.textContent = "Đang tổng hợp...";
      playBtn.disabled = true;
    } else { // 'idle'
      playBtn.disabled = false;
      playBtnIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
      playBtnText.textContent = "Phát giọng đọc";
      playBtn.className = "glow-button px-6 py-2.5 rounded-xl font-medium text-white shadow-lg shadow-indigo-500/25 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 flex items-center justify-center gap-2 cursor-pointer transition-all";
      visualizer.stop();
    }
  };

  engine.onError = (errMsg) => {
    showToast(errMsg, "error", 5500);
  };

  engine.onAudioReady = (info) => {
    showToast(`Đã sẵn sàng tải tệp âm thanh định dạng .${info.type.toUpperCase()}`, "success");
  };

  // 11. Nút Phát / Tạm dừng / Dừng lại
  playBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();
    if (!text) {
      showToast("Vui lòng nhập nội dung văn bản cần chuyển đổi thành giọng nói!", "warning");
      textInput.focus();
      return;
    }

    function getSourceName(src) {
      if (src === 'browser') return 'Giọng Trình duyệt';
      if (src === 'google') return 'Google TTS';
      if (src === 'huggingface') return 'Hugging Face AI';
      if (src === 'elevenlabs') return 'ElevenLabs Studio';
      return 'TTS';
    }

    if (engine.state === 'playing') {
      engine.pause();
    } else if (engine.state === 'paused') {
      engine.resume();
    } else {
      try {
        await engine.speak(text);
        addHistoryItem(text, getSourceName(engine.currentSource));
      } catch (err) {
        if (err.message && (err.message.includes('ElevenLabs') || err.message.includes('Free users cannot use') || err.message.includes('paid_plan_required'))) {
          showToast("⚠️ Tài khoản ElevenLabs miễn phí bị giới hạn API. Hệ thống tự động chuyển sang Google TTS miễn phí để phát ngay...", "warning", 5000);
          sourceSelect.value = 'google';
          sourceSelect.dispatchEvent(new Event('change'));
          try {
            await engine.speak(text);
            addHistoryItem(text, 'Google TTS');
            return;
          } catch (retryErr) {
            showToast(retryErr.message, "error", 5000);
          }
        } else {
          showToast(err.message || "Đã xảy ra lỗi khi phát giọng nói.", "error", 5000);
        }
      }
    }
  });

  pauseBtn.addEventListener('click', () => {
    if (engine.state === 'playing') {
      engine.pause();
      showToast("Đã tạm dừng giọng đọc", "info");
    }
  });

  stopBtn.addEventListener('click', () => {
    engine.stop();
    visualizer.stop();
    showToast("Đã dừng phát âm thanh", "info");
  });

  /**
   * Lấy tệp âm thanh Blob chuẩn xác 100% theo đúng nguồn, ngôn ngữ và giọng đọc đã chọn ở Khối 2
   */
  async function fetchAudioBlobForSource(text) {
    const src = engine.currentSource;
    const gLang = engine.settings.selectedGoogleLang || 'vi';
    const hfMod = engine.settings.hfModel || 'facebook/mms-tts-vie';
    const elVoice = engine.settings.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM';
    const brVoice = engine.settings.selectedBrowserVoiceURI || '';

    // Định danh phiên bản âm thanh đang lưu
    const currentSig = `${src}|${gLang}|${hfMod}|${elVoice}|${brVoice}|${text}`;

    if (engine.currentAudioBlob && engine._cachedVoiceSig === currentSig) {
      return engine.currentAudioBlob;
    }

    let blob = null;

    if (src === 'elevenlabs') {
      const apiKey = engine.settings.elevenLabsKey;
      if (!apiKey) {
        throw new Error("Chưa cấu hình ElevenLabs API Key. Vui lòng bấm vào biểu tượng Cài đặt để thêm API Key.");
      }
      const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${elVoice}`;
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
          throw new Error("Tài khoản ElevenLabs miễn phí không thể dùng giọng thư viện qua API. Hãy chuyển sang nguồn 'Google Translate TTS' (Miễn phí 100%)!");
        }
        throw new Error(err.detail?.message || `Lỗi ElevenLabs (${response.status})`);
      }
      blob = await response.blob();

    } else if (src === 'huggingface') {
      const token = engine.settings.hfToken ? engine.settings.hfToken.trim() : '';
      const endpoint = `https://api-inference.huggingface.co/models/${hfMod}`;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ inputs: text.slice(0, 500) })
      });

      if (response.status === 503) {
        const data = await response.json().catch(() => ({}));
        const estTime = Math.round(data.estimated_time || 20);
        throw new Error(`Mô hình AI đang khởi động (Cold Start). Vui lòng đợi ${estTime}s rồi thử lại.`);
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error("Cần Access Token Hugging Face để dùng mô hình này. Hãy bấm Cài đặt để nhập Token.");
      }
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Lỗi Hugging Face (${response.status}): ${errorText.slice(0, 150)}`);
      }
      blob = await response.blob();

    } else {
      // Nguồn Google TTS hoặc Browser Voice
      let lang = 'vi';
      if (src === 'google') {
        lang = gLang;
      } else if (src === 'browser') {
        const v = engine.browserVoices.find(voice => voice.voiceURI === brVoice);
        if (v && v.lang) {
          lang = v.lang.slice(0, 2).toLowerCase();
        }
      }

      let baseHost = window.location.port === '3000' ? '' : 'http://localhost:3000';
      let endpoint = `${baseHost}/api/tts?text=${encodeURIComponent(text)}&lang=${lang}`;

      let res;
      try {
        res = await fetch(endpoint);
        if (!res.ok && res.status === 404 && baseHost !== 'http://localhost:3000') {
          endpoint = `http://localhost:3000/api/tts?text=${encodeURIComponent(text)}&lang=${lang}`;
          res = await fetch(endpoint);
        }
      } catch (netErr) {
        if (baseHost !== 'http://localhost:3000') {
          endpoint = `http://localhost:3000/api/tts?text=${encodeURIComponent(text)}&lang=${lang}`;
          res = await fetch(endpoint);
        } else {
          throw netErr;
        }
      }

      if (!res || !res.ok) {
        const errData = await (res ? res.json().catch(() => ({})) : {});
        throw new Error(errData.error || `Lỗi máy chủ (${res ? res.status : 'Không phản hồi'})`);
      }
      blob = await res.blob();
    }

    engine.currentAudioBlob = blob;
    engine._cachedVoiceSig = currentSig;
    engine.lastRenderedText = text;
    return blob;
  }

  // 12. Tải xuống tệp âm thanh (.wav/.mp3)
  downloadBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();
    if (!text) {
      showToast("Vui lòng nhập nội dung văn bản trước khi tải xuống!", "warning");
      return;
    }

    const originalContent = downloadBtn.innerHTML;
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = `
      <svg class="w-4 h-4 animate-spin text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
      </svg>
      <span>Đang chuẩn bị âm thanh...</span>
    `;

    try {
      showToast("Đang chuẩn bị tệp âm thanh chất lượng cao theo đúng nguồn giọng đọc...", "info", 2000);
      const blob = await fetchAudioBlobForSource(text);
      const ext = (blob.type && blob.type.includes('wav')) ? 'wav' : 'mp3';

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `vocalflow-speech-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);

      showToast(`Đã tải xuống tệp âm thanh (${ext.toUpperCase()}) thành công!`, "success");
    } catch (err) {
      console.error("Lỗi tải tệp âm thanh:", err);
      showToast("Không thể tải tệp âm thanh: " + err.message, "error", 5000);
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = originalContent;
    }
  });

  // 13. Xử lý Modal Cài đặt API
  settingsBtn.addEventListener('click', () => {
    hfTokenInput.value = engine.settings.hfToken;
    elevenKeyInput.value = engine.settings.elevenLabsKey;
    settingsModal.classList.remove('hidden');
    settingsModal.classList.add('flex');
  });

  const closeModal = () => {
    settingsModal.classList.add('hidden');
    settingsModal.classList.remove('flex');
  };

  closeSettingsBtn.addEventListener('click', closeModal);
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeModal();
  });

  saveSettingsBtn.addEventListener('click', () => {
    const hfToken = hfTokenInput.value.trim();
    const elevenKey = elevenKeyInput.value.trim();

    engine.settings.hfToken = hfToken;
    engine.settings.elevenLabsKey = elevenKey;

    localStorage.setItem('tts_hf_token', hfToken);
    localStorage.setItem('tts_elevenlabs_key', elevenKey);

    closeModal();
    showToast("Đã lưu thông tin cấu hình API thành công!", "success");
  });

  // 14. Điều khiển Nút Chọn Tốc Độ Nhanh (Speed Presets)
  const speedPresetBtns = document.querySelectorAll('.speed-preset-btn');
  speedPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const speed = parseFloat(btn.dataset.speed);
      rateSlider.value = speed;
      rateValue.textContent = `${speed.toFixed(2)}x`;
      engine.settings.rate = speed;
      if (typeof videoExporter !== 'undefined') {
        videoExporter.config.playbackRate = speed;
      }
      updateTextStats();

      speedPresetBtns.forEach(b => {
        b.classList.remove('bg-indigo-100', 'dark:bg-indigo-900/60', 'text-indigo-700', 'dark:text-indigo-300', 'font-bold');
        b.classList.add('bg-slate-200/60', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300');
      });
      btn.classList.remove('bg-slate-200/60', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300');
      btn.classList.add('bg-indigo-100', 'dark:bg-indigo-900/60', 'text-indigo-700', 'dark:text-indigo-300', 'font-bold');
    });
  });

  // 15. Quản lý Lịch Sử Âm Thanh (Audio History Tray)
  const historyListContainer = document.getElementById('historyListContainer');
  const historyCountBadge = document.getElementById('historyCountBadge');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');

  let audioHistory = [];
  try {
    const saved = localStorage.getItem('vocalflow_history');
    if (saved) audioHistory = JSON.parse(saved);
  } catch (e) {}

  function renderHistory() {
    if (!historyListContainer) return;
    historyListContainer.innerHTML = '';

    if (audioHistory.length === 0) {
      if (historyCountBadge) historyCountBadge.textContent = '0';
      historyListContainer.innerHTML = `
        <p id="emptyHistoryMsg" class="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
          Chưa có tệp âm thanh nào trong phiên làm việc này. Hãy nhấn "Phát" hoặc "Tải xuống" để lưu bản ghi vào đây.
        </p>
      `;
      return;
    }

    if (historyCountBadge) historyCountBadge.textContent = audioHistory.length.toString();

    audioHistory.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = "flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/80 gap-3 text-xs";
      div.innerHTML = `
        <div class="flex items-center gap-2.5 flex-1 min-w-0">
          <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
          </div>
          <div class="truncate">
            <div class="font-medium text-slate-700 dark:text-slate-200 truncate">${item.text}</div>
            <div class="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span class="text-indigo-500 font-medium">${item.source}</span>
              <span>•</span>
              <span>${item.time}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button class="replay-history-btn p-1.5 rounded-lg bg-slate-200/60 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 transition" title="Phát lại" data-index="${index}">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path></svg>
          </button>
          <button class="download-history-btn p-1.5 rounded-lg bg-slate-200/60 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 transition" title="Tải file" data-index="${index}">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          </button>
        </div>
      `;
      historyListContainer.appendChild(div);
    });

    // Replay & Download trong lịch sử
    historyListContainer.querySelectorAll('.replay-history-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        const item = audioHistory[idx];
        if (item) {
          textInput.value = item.text;
          updateTextStats();
          playBtn.click();
          showToast(`Đang phát lại: "${item.text.slice(0, 35)}..."`, "info");
        }
      });
    });

    historyListContainer.querySelectorAll('.download-history-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        const item = audioHistory[idx];
        if (item) {
          textInput.value = item.text;
          updateTextStats();
          downloadBtn.click();
        }
      });
    });
  }

  function addHistoryItem(text, sourceName) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    audioHistory.unshift({
      text: text.slice(0, 80),
      source: sourceName,
      time: timeStr
    });
    if (audioHistory.length > 20) audioHistory.pop();
    try {
      localStorage.setItem('vocalflow_history', JSON.stringify(audioHistory));
    } catch (e) {}
    renderHistory();
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      audioHistory = [];
      localStorage.removeItem('vocalflow_history');
      renderHistory();
      showToast("Đã xóa sạch lịch sử âm thanh", "info");
    });
  }

  renderHistory();

  // 16. Đăng ký Service Worker cho PWA
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  // 17. Quản lý Xưởng Xuất Video (Video Export Studio)
  const videoExporter = new VideoExporter();

  const openVideoStudioBtn = document.getElementById('openVideoStudioBtn');
  const videoPreviewCanvas = document.getElementById('videoPreviewCanvas');
  const previewAspectBadge = document.getElementById('previewAspectBadge');

  const ar169Btn = document.getElementById('ar169Btn');
  const ar916Btn = document.getElementById('ar916Btn');

  const bgPresetBtns = document.querySelectorAll('.bg-preset-btn');
  const triggerBgUploadBtn = document.getElementById('triggerBgUploadBtn');
  const customBgFileInput = document.getElementById('customBgFileInput');
  const customBgFileName = document.getElementById('customBgFileName');
  const bgObjectFitSelect = document.getElementById('bgObjectFitSelect');

  // Điều khiển chế độ Nền Video (Preset / Ảnh / Video nền TikTok & YouTube)
  const tabBgPresetBtn = document.getElementById('tabBgPresetBtn');
  const tabBgVideoBtn = document.getElementById('tabBgVideoBtn');
  const bgPresetTabContent = document.getElementById('bgPresetTabContent');
  const bgVideoTabContent = document.getElementById('bgVideoTabContent');

  const customVideoFileInput = document.getElementById('customVideoFileInput');
  const triggerVideoUploadBtn = document.getElementById('triggerVideoUploadBtn');
  const videoLinkInput = document.getElementById('videoLinkInput');
  const loadVideoLinkBtn = document.getElementById('loadVideoLinkBtn');
  const loadVideoLinkIcon = document.getElementById('loadVideoLinkIcon');
  const loadVideoLinkText = document.getElementById('loadVideoLinkText');
  const customVideoStatusBox = document.getElementById('customVideoStatusBox');
  const customVideoTitle = document.getElementById('customVideoTitle');
  const removeBgVideoBtn = document.getElementById('removeBgVideoBtn');
  const bgVideoElement = document.getElementById('bgVideoElement');

  const enableBgmCheckbox = document.getElementById('enableBgmCheckbox');
  const bgmControlsContainer = document.getElementById('bgmControlsContainer');
  const bgmSelect = document.getElementById('bgmSelect');
  const previewBgmBtn = document.getElementById('previewBgmBtn');
  const previewBgmIcon = document.getElementById('previewBgmIcon');
  const previewBgmText = document.getElementById('previewBgmText');
  const customBgmFileInput = document.getElementById('customBgmFileInput');
  const bgmVolumeSlider = document.getElementById('bgmVolumeSlider');
  const bgmVolumeVal = document.getElementById('bgmVolumeVal');

  const showWaveformCheckbox = document.getElementById('showWaveformCheckbox');
  const showSubtitlesCheckbox = document.getElementById('showSubtitlesCheckbox');
  const waveformStyleSelect = document.getElementById('waveformStyleSelect');
  const subtitlePositionSelect = document.getElementById('subtitlePositionSelect');

  const showWatermarkCheckbox = document.getElementById('showWatermarkCheckbox');
  const watermarkTextInput = document.getElementById('watermarkTextInput');
  const videoFormatSelect = document.getElementById('videoFormatSelect');

  const startRenderVideoBtn = document.getElementById('startRenderVideoBtn');
  const renderOverlay = document.getElementById('renderOverlay');
  const renderStatusText = document.getElementById('renderStatusText');
  const renderProgressBar = document.getElementById('renderProgressBar');
  const renderSuccessBox = document.getElementById('renderSuccessBox');
  const downloadVideoDirectLink = document.getElementById('downloadVideoDirectLink');

  // Khởi tạo thông số mặc định cho videoExporter từ giao diện
  if (rateSlider) videoExporter.config.playbackRate = parseFloat(rateSlider.value) || 1.0;
  if (pitchSlider) videoExporter.config.pitch = parseFloat(pitchSlider.value) || 1.0;
  if (bgObjectFitSelect) videoExporter.config.bgObjectFit = bgObjectFitSelect.value || 'cover';
  if (bgmVolumeSlider) videoExporter.config.bgmVolume = (parseInt(bgmVolumeSlider.value, 10) || 22) / 100;
  if (bgmSelect) videoExporter.config.bgmType = bgmSelect.value || 'lofi';
  if (waveformStyleSelect) videoExporter.config.waveformStyle = waveformStyleSelect.value || 'bars';
  if (subtitlePositionSelect) videoExporter.config.subtitlePosition = subtitlePositionSelect.value || 'center';
  if (showWatermarkCheckbox) videoExporter.config.showWatermark = showWatermarkCheckbox.checked;
  if (watermarkTextInput) videoExporter.config.watermarkText = watermarkTextInput.value.trim() || 'Huawnef';
  if (videoFormatSelect) videoExporter.config.videoFormat = videoFormatSelect.value || 'mp4';

  // Vẽ hình xem trước lên Canvas Preview (Live Preview WYSIWYG)
  function updateVideoPreview() {
    if (!videoPreviewCanvas) return;
    const isPortrait = videoExporter.config.aspectRatio === '9:16';
    videoPreviewCanvas.width = isPortrait ? 720 : 1280;
    videoPreviewCanvas.height = isPortrait ? 1280 : 720;
    const ctx = videoPreviewCanvas.getContext('2d');
    const w = videoPreviewCanvas.width;
    const h = videoPreviewCanvas.height;

    // 1. Nền video (Video nền / Ảnh tùy chỉnh / Preset)
    if (videoExporter.config.bgType === 'video' && videoExporter.config.customBgVideo) {
      const vid = videoExporter.config.customBgVideo;
      videoExporter.drawImageObjectFit(ctx, vid, w, h, videoExporter.config.bgObjectFit || 'cover', 1.0);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.40)';
      ctx.fillRect(0, 0, w, h);
    } else if (videoExporter.config.bgType === 'custom' && videoExporter.config.customBgImage) {
      videoExporter.drawImageObjectFit(ctx, videoExporter.config.customBgImage, w, h, videoExporter.config.bgObjectFit || 'cover', 1.0);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
      ctx.fillRect(0, 0, w, h);
    } else {
      videoExporter.drawPresetBackground(ctx, w, h, 0);
    }

    // 2. Sóng âm xem trước (Vẽ trước phụ đề để chữ luôn nằm trên)
    if (videoExporter.config.showWaveform) {
      if (videoExporter.config.waveformStyle === 'circle') {
        const centerX = w / 2;
        let centerY;
        if (videoExporter.config.subtitlePosition === 'bottom') {
          centerY = isPortrait ? h * 0.40 : h * 0.38;
        } else if (videoExporter.config.subtitlePosition === 'top') {
          centerY = isPortrait ? h * 0.60 : h * 0.58;
        } else {
          centerY = isPortrait ? h * 0.80 : h * 0.82;
        }

        const baseRadius = isPortrait ? 55 : 65;
        const numRays = 40;

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
          const simLen = 10 + Math.sin(i * 0.5) * 26 + Math.cos(i * 0.9) * 16;
          const x1 = Math.cos(angle) * baseRadius;
          const y1 = Math.sin(angle) * baseRadius;
          const x2 = Math.cos(angle) * (baseRadius + simLen);
          const y2 = Math.sin(angle) * (baseRadius + simLen);

          ctx.strokeStyle = i % 2 === 0 ? '#6366f1' : '#ec4899';
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        ctx.restore();

      } else if (videoExporter.config.waveformStyle === 'waterfall') {
        // Dải sóng Thác nước đa tầng (Waterfall Wave)
        let waveBaseY;
        if (videoExporter.config.subtitlePosition === 'bottom') {
          waveBaseY = isPortrait ? h * 0.40 : h * 0.38;
        } else if (videoExporter.config.subtitlePosition === 'top') {
          waveBaseY = isPortrait ? h * 0.78 : h * 0.76;
        } else {
          waveBaseY = isPortrait ? h * 0.82 : h * 0.80;
        }

        const layers = [
          { color: 'rgba(99, 102, 241, 0.40)', stroke: '#818cf8', freq: 0.008, amp: isPortrait ? 30 : 25, phase: 0 },
          { color: 'rgba(236, 72, 153, 0.32)', stroke: '#f472b6', freq: 0.012, amp: isPortrait ? 22 : 18, phase: 1.5 },
          { color: 'rgba(6, 182, 212, 0.36)', stroke: '#22d3ee', freq: 0.015, amp: isPortrait ? 26 : 22, phase: 3.0 }
        ];

        layers.forEach(layer => {
          ctx.beginPath();
          ctx.moveTo(0, h);
          ctx.lineTo(0, waveBaseY);

          for (let x = 0; x <= w; x += 10) {
            const y = waveBaseY + Math.sin(x * layer.freq + layer.phase) * layer.amp;
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
        const barCount = isPortrait ? 32 : 48;
        const barWidth = Math.max(4, (w * 0.75) / barCount - 4);
        const totalWaveWidth = barCount * (barWidth + 4);
        const startX = (w - totalWaveWidth) / 2;

        let waveY;
        if (videoExporter.config.subtitlePosition === 'bottom') {
          waveY = isPortrait ? h * 0.38 : h * 0.36;
        } else if (videoExporter.config.subtitlePosition === 'top') {
          waveY = isPortrait ? h * 0.80 : h * 0.78;
        } else {
          waveY = isPortrait ? h * 0.82 : h * 0.80;
        }

        const waveGrad = ctx.createLinearGradient(startX, 0, startX + totalWaveWidth, 0);
        waveGrad.addColorStop(0, '#6366f1');
        waveGrad.addColorStop(0.5, '#ec4899');
        waveGrad.addColorStop(1, '#06b6d4');

        for (let i = 0; i < barCount; i++) {
          const simH = 12 + Math.sin(i * 0.32) * 35 + Math.cos(i * 0.65) * 22;
          const x = startX + i * (barWidth + 4);
          const y = waveY - simH / 2;
          ctx.fillStyle = waveGrad;
          ctx.shadowColor = 'rgba(99, 102, 241, 0.6)';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, simH, barWidth / 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }

    // 3. Phụ đề xem trước (SUBTITLES)
    if (videoExporter.config.showSubtitles) {
      const sampleText = textInput.value.trim() || "VocalFlow AI - Trình xuất Video & Lồng nhạc nền tự động";
      const fontSize = isPortrait ? 22 : 24;
      const lineHeight = isPortrait ? 34 : 36;
      ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", sans-serif`;

      const maxTextWidth = isPortrait ? (w * 0.78) : (w * 0.74);
      const lines = videoExporter.wrapText(ctx, sampleText, maxTextWidth);

      const maxVisibleLines = isPortrait ? 3 : 2;
      const visible = lines.slice(0, maxVisibleLines);

      let maxLineWidth = 0;
      visible.forEach(l => {
        const m = ctx.measureText(l);
        if (m.width > maxLineWidth) maxLineWidth = m.width;
      });

      const padX = isPortrait ? 24 : 32;
      const padY = isPortrait ? 16 : 18;
      const boxW = Math.min(w * 0.90, maxLineWidth + padX * 2);
      const boxH = visible.length * lineHeight + padY * 2;

      let startY;
      if (videoExporter.config.subtitlePosition === 'top') {
        startY = isPortrait ? 130 : 60;
      } else if (videoExporter.config.subtitlePosition === 'bottom') {
        startY = isPortrait ? (h - boxH - 130) : (h - boxH - 60);
      } else {
        startY = (h - boxH) / 2;
      }
      startY = Math.max(20, Math.min(h - boxH - 20, startY));

      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect((w - boxW) / 2, startY, boxW, boxH, 18);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      visible.forEach((line, idx) => {
        const textY = startY + padY + idx * lineHeight + lineHeight / 2;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(line, w / 2, textY);
        ctx.shadowBlur = 0;
      });
    }

    // 4. Watermark / Logo thương hiệu hiển thị góc trên (Mặc định: Huawnef)
    if (videoExporter.config.showWatermark && videoExporter.config.watermarkText) {
      ctx.save();
      ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 4;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('✨ ' + videoExporter.config.watermarkText, 24, 24);
      ctx.restore();
    }
  }

  // Mở & Cuộn đến Khối Video Studio
  if (openVideoStudioBtn) {
    openVideoStudioBtn.addEventListener('click', () => {
      const text = textInput.value.trim();
      if (!text) {
        showToast("Vui lòng nhập văn bản trước khi xuất video!", "warning");
        textInput.focus();
        return;
      }
      const studioSec = document.getElementById('videoStudioSection');
      if (studioSec) {
        studioSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        studioSec.classList.add('ring-4', 'ring-purple-500/50');
        setTimeout(() => studioSec.classList.remove('ring-4', 'ring-purple-500/50'), 1500);
      }
      updateVideoPreview();
      showToast("Đã chuyển đến Xưởng Xuất Video ở bên dưới!", "info", 2200);
    });
  }

  // Chuyển đổi Tỉ lệ khung hình (16:9 vs 9:16)
  if (ar169Btn && ar916Btn) {
    ar169Btn.addEventListener('click', () => {
      videoExporter.config.aspectRatio = '16:9';
      ar169Btn.className = "ar-btn p-3 rounded-xl border border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center gap-2 transition cursor-pointer";
      ar916Btn.className = "ar-btn p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center justify-center gap-2 transition cursor-pointer";
      if (previewAspectBadge) previewAspectBadge.textContent = "16:9 Landscape";
      updateVideoPreview();
    });

    ar916Btn.addEventListener('click', () => {
      videoExporter.config.aspectRatio = '9:16';
      ar916Btn.className = "ar-btn p-3 rounded-xl border border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center gap-2 transition cursor-pointer";
      ar169Btn.className = "ar-btn p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center justify-center gap-2 transition cursor-pointer";
      if (previewAspectBadge) previewAspectBadge.textContent = "9:16 Vertical (Shorts/TikTok)";
      updateVideoPreview();
    });
  }

  // Chọn Preset hình nền
  bgPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const bgName = btn.dataset.bg;
      videoExporter.config.bgType = 'preset';
      videoExporter.config.presetBg = bgName;
      videoExporter.config.customBgImage = null;
      if (videoExporter.config.customBgVideo) {
        try { videoExporter.config.customBgVideo.pause(); } catch (e) {}
        videoExporter.config.customBgVideo = null;
      }
      if (customBgFileName) customBgFileName.classList.add('hidden');
      if (customVideoStatusBox) customVideoStatusBox.classList.add('hidden');

      bgPresetBtns.forEach(b => {
        b.classList.remove('border-indigo-500', 'bg-indigo-50/60', 'dark:bg-indigo-950/60');
        b.classList.add('border-slate-200', 'dark:border-slate-700');
      });
      btn.classList.add('border-indigo-500', 'bg-indigo-50/60', 'dark:bg-indigo-950/60');
      btn.classList.remove('border-slate-200', 'dark:border-slate-700');

      updateVideoPreview();
    });
  });

  // Tải ảnh nền tùy chỉnh
  if (triggerBgUploadBtn && customBgFileInput) {
    triggerBgUploadBtn.addEventListener('click', () => customBgFileInput.click());

    customBgFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          if (videoExporter.config.customBgVideo) {
            try { videoExporter.config.customBgVideo.pause(); } catch (e) {}
            videoExporter.config.customBgVideo = null;
          }
          if (customVideoStatusBox) customVideoStatusBox.classList.add('hidden');

          videoExporter.config.bgType = 'custom';
          videoExporter.config.customBgImage = img;
          if (customBgFileName) {
            customBgFileName.classList.remove('hidden');
            const span = customBgFileName.querySelector('span');
            if (span) span.textContent = file.name;
          }

          bgPresetBtns.forEach(b => {
            b.classList.remove('border-indigo-500', 'bg-indigo-50/60', 'dark:bg-indigo-950/60');
            b.classList.add('border-slate-200', 'dark:border-slate-700');
          });

          updateVideoPreview();
          showToast(`Đã nạp hình nền tùy chỉnh: ${file.name}`, "success");
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // --- QUẢN LÝ CHÈN VIDEO NỀN (LOCAL / TIKTOK / YOUTUBE) ---
  // 1. Chuyển đổi qua lại giữa Tab Preset/Ảnh và Tab Video nền
  if (tabBgPresetBtn && tabBgVideoBtn && bgPresetTabContent && bgVideoTabContent) {
    tabBgPresetBtn.addEventListener('click', () => {
      tabBgPresetBtn.className = "px-2.5 py-1 rounded-md bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-300 transition cursor-pointer font-semibold";
      tabBgVideoBtn.className = "px-2.5 py-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer font-semibold";
      bgPresetTabContent.classList.remove('hidden');
      bgVideoTabContent.classList.add('hidden');

      if (videoExporter.config.customBgVideo) {
        try { videoExporter.config.customBgVideo.pause(); } catch (e) {}
      }
      videoExporter.config.bgType = videoExporter.config.customBgImage ? 'custom' : 'preset';
      updateVideoPreview();
    });

    tabBgVideoBtn.addEventListener('click', () => {
      tabBgVideoBtn.className = "px-2.5 py-1 rounded-md bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-300 transition cursor-pointer font-semibold";
      tabBgPresetBtn.className = "px-2.5 py-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer font-semibold";
      bgVideoTabContent.classList.remove('hidden');
      bgPresetTabContent.classList.add('hidden');

      if (videoExporter.config.customBgVideo) {
        videoExporter.config.bgType = 'video';
        videoExporter.config.customBgVideo.play().catch(() => {});
        updateVideoPreview();
      }
    });
  }

  // 2. Hàm thiết lập Video Nền: LOẠI BỎ ÂM THANH GỐC 100%
  function setupBackgroundVideo(url, title) {
    if (!bgVideoElement) return;

    bgVideoElement.src = url;
    bgVideoElement.muted = true; // LOẠI BỎ ÂM THANH GỐC HOÀN TOÀN
    bgVideoElement.volume = 0;
    bgVideoElement.loop = true;
    bgVideoElement.playsInline = true;
    bgVideoElement.crossOrigin = 'anonymous';

    const onReady = () => {
      videoExporter.config.bgType = 'video';
      videoExporter.config.customBgVideo = bgVideoElement;
      videoExporter.config.customBgImage = null;

      if (customVideoStatusBox) customVideoStatusBox.classList.remove('hidden');
      if (customVideoTitle) customVideoTitle.textContent = title || 'Video nền đã nạp';

      // Chuyển tab sang Chèn Video
      if (tabBgVideoBtn) tabBgVideoBtn.click();

      // Hủy highlight các preset ảnh
      bgPresetBtns.forEach(b => {
        b.classList.remove('border-indigo-500', 'bg-indigo-50/60', 'dark:bg-indigo-950/60');
        b.classList.add('border-slate-200', 'dark:border-slate-700');
      });

      bgVideoElement.play().catch(() => {});
      updateVideoPreview();
      showToast(`Đã nạp video nền: "${(title || '').slice(0, 30)}...". Âm thanh gốc đã được loại bỏ hoàn toàn!`, "success", 4500);
      bgVideoElement.removeEventListener('loadeddata', onReady);
    };

    bgVideoElement.addEventListener('loadeddata', onReady);
    bgVideoElement.load();
  }

  // 3. Tải Video nền từ máy tính (Local File)
  if (triggerVideoUploadBtn && customVideoFileInput) {
    triggerVideoUploadBtn.addEventListener('click', () => customVideoFileInput.click());

    customVideoFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const videoUrl = URL.createObjectURL(file);
      setupBackgroundVideo(videoUrl, file.name);
    });
  }

  // 4. Giải mã và nạp Video từ Link TikTok / YouTube / MP4
  if (loadVideoLinkBtn && videoLinkInput) {
    const handleLoadLink = async () => {
      const link = videoLinkInput.value.trim();
      if (!link) {
        showToast("Vui lòng dán link video TikTok, YouTube hoặc link MP4!", "warning");
        videoLinkInput.focus();
        return;
      }

      loadVideoLinkBtn.disabled = true;
      if (loadVideoLinkIcon) loadVideoLinkIcon.textContent = '⏳';
      if (loadVideoLinkText) loadVideoLinkText.textContent = 'Đang giải mã...';
      showToast("Đang kết nối máy chủ để bóc tách luồng video...", "info", 3000);

      try {
        let baseHost = window.location.port === '3000' ? '' : 'http://localhost:3000';
        let endpoint = `${baseHost}/api/resolve-video?url=${encodeURIComponent(link)}`;

        let res;
        try {
          res = await fetch(endpoint);
          if (!res.ok && res.status === 404 && baseHost !== 'http://localhost:3000') {
            endpoint = `http://localhost:3000/api/resolve-video?url=${encodeURIComponent(link)}`;
            res = await fetch(endpoint);
          }
        } catch (netErr) {
          if (baseHost !== 'http://localhost:3000') {
            endpoint = `http://localhost:3000/api/resolve-video?url=${encodeURIComponent(link)}`;
            res = await fetch(endpoint);
          } else {
            throw netErr;
          }
        }

        const data = await (res ? res.json() : {});
        if (!data || !data.success || !data.videoUrl) {
          throw new Error(data.error || "Không thể phân tích video từ đường link này. Hãy kiểm tra lại link.");
        }

        const finalStreamUrl = data.videoUrl.startsWith('http') ? data.videoUrl : `${baseHost}${data.videoUrl}`;
        setupBackgroundVideo(finalStreamUrl, data.title || link);

      } catch (err) {
        console.error("Lỗi nạp video từ link:", err);
        showToast("Lỗi nạp video: " + err.message, "error", 5500);
      } finally {
        loadVideoLinkBtn.disabled = false;
        if (loadVideoLinkIcon) loadVideoLinkIcon.textContent = '⚡';
        if (loadVideoLinkText) loadVideoLinkText.textContent = 'Nạp video';
      }
    };

    loadVideoLinkBtn.addEventListener('click', handleLoadLink);
    videoLinkInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleLoadLink();
      }
    });
  }

  // 5. Gỡ bỏ Video Nền
  if (removeBgVideoBtn) {
    removeBgVideoBtn.addEventListener('click', () => {
      if (bgVideoElement) {
        try { bgVideoElement.pause(); } catch (e) {}
        bgVideoElement.removeAttribute('src');
        bgVideoElement.load();
      }
      videoExporter.config.customBgVideo = null;
      videoExporter.config.bgType = videoExporter.config.customBgImage ? 'custom' : 'preset';

      if (customVideoStatusBox) customVideoStatusBox.classList.add('hidden');
      if (videoLinkInput) videoLinkInput.value = '';
      if (customVideoFileInput) customVideoFileInput.value = '';

      // Chuyển lại tab Preset
      if (tabBgPresetBtn) tabBgPresetBtn.click();
      updateVideoPreview();
      showToast("Đã gỡ bỏ video nền, chuyển về hình nền mặc định.", "info");
    });
  }

  // 6. Đồng bộ khung hình Video lên Live Preview Canvas liên tục
  if (bgVideoElement) {
    bgVideoElement.addEventListener('timeupdate', () => {
      if (videoExporter.config.bgType === 'video' && !videoExporter.isRendering) {
        updateVideoPreview();
      }
    });
  }

  // Tùy chọn Nhạc nền (BGM)
  if (enableBgmCheckbox && bgmControlsContainer) {
    enableBgmCheckbox.addEventListener('change', (e) => {
      videoExporter.config.enableBgm = e.target.checked;
      if (e.target.checked) {
        bgmControlsContainer.classList.remove('opacity-40', 'pointer-events-none');
      } else {
        bgmControlsContainer.classList.add('opacity-40', 'pointer-events-none');
        videoExporter.stopPreviewBgm();
        if (previewBgmIcon) previewBgmIcon.textContent = '▶';
        if (previewBgmText) previewBgmText.textContent = 'Nghe thử';
        if (previewBgmBtn) previewBgmBtn.classList.remove('bg-rose-100', 'text-rose-700', 'border-rose-300', 'dark:bg-rose-950', 'dark:text-rose-300');
      }
    });
  }

  if (bgmSelect) {
    bgmSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      videoExporter.stopPreviewBgm();
      if (previewBgmIcon) previewBgmIcon.textContent = '▶';
      if (previewBgmText) previewBgmText.textContent = 'Nghe thử';
      if (previewBgmBtn) previewBgmBtn.classList.remove('bg-rose-100', 'text-rose-700', 'border-rose-300', 'dark:bg-rose-950', 'dark:text-rose-300');

      if (val === 'custom') {
        if (customBgmFileInput) customBgmFileInput.click();
      } else {
        videoExporter.config.bgmType = val;
        videoExporter.config.customBgmAudio = null;
        showToast("Đã chọn phong cách nhạc nền: " + e.target.options[e.target.selectedIndex].text, "info");
      }
    });
  }

  // Nghe thử Nhạc Nền (Preview BGM Audio)
  if (previewBgmBtn) {
    previewBgmBtn.addEventListener('click', async () => {
      const vol = (parseInt(bgmVolumeSlider.value, 10) || 22) / 100;
      const isPlaying = await videoExporter.previewBgm(bgmSelect.value, vol);
      if (isPlaying) {
        if (previewBgmIcon) previewBgmIcon.textContent = '⏹';
        if (previewBgmText) previewBgmText.textContent = 'Dừng thử';
        previewBgmBtn.classList.add('bg-rose-100', 'text-rose-700', 'border-rose-300', 'dark:bg-rose-950', 'dark:text-rose-300');
        showToast("Đang phát nghe thử nhạc nền 🎵 Bấm 'Dừng thử' khi xong.", "info", 3000);
      } else {
        if (previewBgmIcon) previewBgmIcon.textContent = '▶';
        if (previewBgmText) previewBgmText.textContent = 'Nghe thử';
        previewBgmBtn.classList.remove('bg-rose-100', 'text-rose-700', 'border-rose-300', 'dark:bg-rose-950', 'dark:text-rose-300');
      }
    });
  }

  if (customBgmFileInput) {
    customBgmFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        videoExporter.config.bgmType = 'custom';
        videoExporter.config.customBgmAudio = file;
        showToast(`Đã nạp tệp nhạc nền tùy chỉnh: ${file.name}`, "success");
      }
    });
  }

  if (bgmVolumeSlider && bgmVolumeVal) {
    bgmVolumeSlider.addEventListener('input', async (e) => {
      const val = parseInt(e.target.value, 10);
      bgmVolumeVal.textContent = `${val}%`;
      videoExporter.config.bgmVolume = val / 100;
      // Cập nhật âm lượng nghe thử ngay lập tức nếu đang phát
      if (videoExporter._previewSource) {
        videoExporter.stopPreviewBgm();
        await videoExporter.previewBgm(bgmSelect.value, val / 100);
      }
    });
  }

  // Tùy chọn hiển thị Sóng âm & Phụ đề
  if (showWaveformCheckbox) {
    showWaveformCheckbox.addEventListener('change', (e) => {
      videoExporter.config.showWaveform = e.target.checked;
      updateVideoPreview();
    });
  }

  if (showSubtitlesCheckbox) {
    showSubtitlesCheckbox.addEventListener('change', (e) => {
      videoExporter.config.showSubtitles = e.target.checked;
      updateVideoPreview();
    });
  }

  // Đổi Kiểu Sóng Âm (Bars vs Circular)
  if (waveformStyleSelect) {
    waveformStyleSelect.addEventListener('change', (e) => {
      videoExporter.config.waveformStyle = e.target.value;
      updateVideoPreview();
      showToast("Đã đổi kiểu sóng âm: " + e.target.options[e.target.selectedIndex].text, "info", 2000);
    });
  }

  // Đổi Vị Trí Phụ Đề (Top, Center, Bottom)
  if (subtitlePositionSelect) {
    subtitlePositionSelect.addEventListener('change', (e) => {
      videoExporter.config.subtitlePosition = e.target.value;
      updateVideoPreview();
      showToast("Đã đổi vị trí phụ đề: " + e.target.options[e.target.selectedIndex].text, "info", 2000);
    });
  }

  // Kiểu khớp hình nền tùy chỉnh (Object-fit: Cover vs Contain)
  if (bgObjectFitSelect) {
    bgObjectFitSelect.addEventListener('change', (e) => {
      videoExporter.config.bgObjectFit = e.target.value;
      updateVideoPreview();
      showToast("Đã đổi kiểu khớp ảnh: " + e.target.options[e.target.selectedIndex].text, "info", 1800);
    });
  }

  // Tùy chỉnh Watermark hiển thị
  if (showWatermarkCheckbox) {
    showWatermarkCheckbox.addEventListener('change', (e) => {
      videoExporter.config.showWatermark = e.target.checked;
      updateVideoPreview();
    });
  }

  if (watermarkTextInput) {
    watermarkTextInput.addEventListener('input', (e) => {
      videoExporter.config.watermarkText = e.target.value.trim() || 'Huawnef';
      updateVideoPreview();
    });
  }

  // Tùy chọn định dạng tệp xuất Video (MP4 / WebM)
  if (videoFormatSelect) {
    videoFormatSelect.addEventListener('change', (e) => {
      videoExporter.config.videoFormat = e.target.value;
      showToast("Đã chọn định dạng xuất video: " + e.target.value.toUpperCase(), "info", 1800);
    });
  }

  // NÚT BẮT ĐẦU XUẤT VIDEO LỚN
  if (startRenderVideoBtn) {
    startRenderVideoBtn.addEventListener('click', async () => {
      const text = textInput.value.trim();
      if (!text) {
        showToast("Vui lòng nhập nội dung văn bản trước khi xuất video!", "warning");
        textInput.focus();
        return;
      }

      // Dừng nghe thử nhạc nền nếu đang phát
      if (videoExporter._previewSource) {
        videoExporter.stopPreviewBgm();
        if (previewBgmIcon) previewBgmIcon.textContent = '▶';
        if (previewBgmText) previewBgmText.textContent = 'Nghe thử';
        if (previewBgmBtn) previewBgmBtn.classList.remove('bg-rose-100', 'text-rose-700', 'border-rose-300', 'dark:bg-rose-950', 'dark:text-rose-300');
      }

      // ĐỒNG BỘ TOÀN BỘ CẤU HÌNH TRỰC TIẾP TỪ GIAO DIỆN
      videoExporter.config.playbackRate = parseFloat(rateSlider.value) || 1.0;
      videoExporter.config.pitch = parseFloat(pitchSlider ? pitchSlider.value : 1.0) || 1.0;
      videoExporter.config.bgObjectFit = bgObjectFitSelect ? bgObjectFitSelect.value : 'cover';
      if (videoExporter.config.customBgVideo) {
        videoExporter.config.bgType = 'video';
      }
      videoExporter.config.enableBgm = enableBgmCheckbox ? enableBgmCheckbox.checked : true;
      videoExporter.config.bgmType = bgmSelect ? bgmSelect.value : 'lofi';
      videoExporter.config.bgmVolume = (parseInt(bgmVolumeSlider.value, 10) || 22) / 100;
      videoExporter.config.showWaveform = showWaveformCheckbox ? showWaveformCheckbox.checked : true;
      videoExporter.config.waveformStyle = waveformStyleSelect ? waveformStyleSelect.value : 'bars';
      videoExporter.config.showSubtitles = showSubtitlesCheckbox ? showSubtitlesCheckbox.checked : true;
      videoExporter.config.subtitlePosition = subtitlePositionSelect ? subtitlePositionSelect.value : 'center';
      videoExporter.config.showWatermark = showWatermarkCheckbox ? showWatermarkCheckbox.checked : true;
      videoExporter.config.watermarkText = watermarkTextInput ? (watermarkTextInput.value.trim() || 'Huawnef') : 'Huawnef';
      videoExporter.config.videoFormat = videoFormatSelect ? videoFormatSelect.value : 'mp4';

      renderOverlay.classList.remove('hidden');
      renderOverlay.classList.add('flex');
      renderProgressBar.style.width = '3%';
      renderStatusText.textContent = `Đang chuẩn bị âm thanh giọng đọc (${videoExporter.config.playbackRate.toFixed(2)}x)...`;
      startRenderVideoBtn.disabled = true;

      try {
        // 1. Chuẩn bị file âm thanh giọng đọc TTS theo đúng cấu hình giọng đã chọn ở Khối 2
        const voiceBlob = await fetchAudioBlobForSource(text);

        // 2. Thiết lập callbacks cho VideoExporter
        videoExporter.onProgress = (percent, statusMsg) => {
          renderProgressBar.style.width = `${percent}%`;
          renderStatusText.textContent = statusMsg;
        };

        videoExporter.onComplete = (blob, videoUrl, ext) => {
          renderOverlay.classList.add('hidden');
          renderOverlay.classList.remove('flex');
          startRenderVideoBtn.disabled = false;

          renderSuccessBox.classList.remove('hidden');
          downloadVideoDirectLink.href = videoUrl;
          downloadVideoDirectLink.download = `vocalflow-video-${Date.now()}.${ext}`;

          // Tự động kích hoạt tải video về máy
          const a = document.createElement('a');
          a.href = videoUrl;
          a.download = `vocalflow-video-${Date.now()}.${ext}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          // Thêm vào lịch sử hoạt động
          addHistoryItem(text, `Video ${ext.toUpperCase()} (${videoExporter.config.aspectRatio} • ${videoExporter.config.playbackRate}x)`);
          showToast(`Đã kết xuất và tải xuống video ${ext.toUpperCase()} thành công!`, "success", 5000);
        };

        videoExporter.onError = (errMsg) => {
          renderOverlay.classList.add('hidden');
          renderOverlay.classList.remove('flex');
          startRenderVideoBtn.disabled = false;
          showToast("Lỗi xuất video: " + errMsg, "error", 6000);
        };

        // 3. Tiến hành Render Video với đầy đủ âm thanh, hình nền, nhạc nền
        await videoExporter.exportVideo(voiceBlob, text);

      } catch (err) {
        console.error("Lỗi xuất video:", err);
        renderOverlay.classList.add('hidden');
        renderOverlay.classList.remove('flex');
        startRenderVideoBtn.disabled = false;
        showToast("Không thể xuất video: " + err.message, "error", 6000);
      }
    });
  }

  // Nạp văn bản mẫu mặc định ban đầu
  if (!textInput.value) {
    textInput.value = SAMPLE_TEMPLATES[0].text;
    updateTextStats();
  }

  // Khởi tạo Canvas xem trước Video ngay khi mở trang
  updateVideoPreview();
});

