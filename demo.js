/* ═══════════════════════════════════════════════════════════
   LiveQR landing — demo tương tác
   Khán giả (trái) donate → overlay OBS (phải) hiện alert tuần tự,
   có hàng đợi, kiểm duyệt tiếng Việt, TTS giọng Việt (Google),
   vòng quay, bình chọn.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* ── Âm thanh hiệu ứng tổng hợp WebAudio ─────────────────── */
  var audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function tone(freq, start, dur, type, vol) {
    var ctx = ensureAudio();
    if (!ctx) return;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'triangle';
    osc.frequency.value = freq;
    var t = ctx.currentTime + start;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol || 0.16, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
  function chime() { tone(880, 0, 0.45); tone(1174.7, 0.09, 0.5); tone(1568, 0.18, 0.55, 'triangle', 0.1); }
  function buzz() { tone(140, 0, 0.22, 'sawtooth', 0.1); tone(110, 0.1, 0.25, 'sawtooth', 0.08); }
  function winSound() { tone(523.3, 0, 0.18); tone(659.3, 0.12, 0.18); tone(784, 0.24, 0.3); }

  /* ── Bật/tắt âm thanh & giọng đọc ───────────────────────── */
  var soundOn = true;
  var soundToggle = $('soundToggle');
  if (soundToggle) {
    soundToggle.addEventListener('click', function () {
      soundOn = !soundOn;
      soundToggle.textContent = soundOn ? '🔊 Âm thanh: BẬT' : '🔇 Âm thanh: TẮT';
      if (!soundOn && window.speechSynthesis) window.speechSynthesis.cancel();
      if (soundOn) chime();
    });
  }

  /* ── TTS giọng Việt (ưu tiên giọng Google Tiếng Việt) ───── */
  function pickVietnameseVoice() {
    if (!('speechSynthesis' in window)) return null;
    var voices = window.speechSynthesis.getVoices() || [];
    var vi = voices.filter(function (v) { return (v.lang || '').toLowerCase().indexOf('vi') === 0; });
    if (!vi.length) return null;
    var google = vi.filter(function (v) { return /google/i.test(v.name || ''); });
    var female = vi.filter(function (v) { return /minh|female|nữ/i.test(v.name || ''); });
    return google[0] || female[0] || vi[0];
  }
  /* warm-up danh sách giọng (Chrome tải bất đồng bộ) */
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
      window.speechSynthesis.onvoiceschanged = function () { window.speechSynthesis.getVoices(); };
    }
  }

  function speak(text, onEnd) {
    var voice = pickVietnameseVoice();
    if (!soundOn || !voice) { if (onEnd) onEnd(false); return; }
    try {
      var synth = window.speechSynthesis;
      synth.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.lang = 'vi-VN';
      u.rate = 1.05;
      u.pitch = 1.1;
      var done = false;
      function finish(ok) { if (done) return; done = true; if (onEnd) onEnd(ok); }
      u.onend = function () { finish(true); };
      u.onerror = function () { finish(false); };
      synth.speak(u);
      setTimeout(function () { finish(false); }, 16000);
    } catch (e) {
      if (onEnd) onEnd(false);
    }
  }

  /* Đọc số tiền thành chữ tiếng Việt: 200000 → "hai trăm nghìn" */
  function docSo(n) {
    var digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    function block3(x) {
      var tr = Math.floor(x / 100), ch = Math.floor((x % 100) / 10), dv = x % 10, out = [];
      if (tr > 0) out.push(digits[tr], 'trăm');
      if (ch > 1) {
        out.push(digits[ch], 'mươi');
        if (dv === 1) out.push('mốt');
        else if (dv === 5) out.push('lăm');
        else if (dv > 0) out.push(digits[dv]);
      } else if (ch === 1) {
        out.push('mười');
        if (dv === 5) out.push('lăm');
        else if (dv > 0) out.push(digits[dv]);
      } else if (dv > 0) {
        if (tr > 0) out.push('linh');
        out.push(digits[dv]);
      }
      return out.join(' ');
    }
    if (n === 0) return 'không';
    var units = [['tỷ', 1e9], ['triệu', 1e6], ['nghìn', 1e3]];
    var parts = [];
    for (var i = 0; i < units.length; i++) {
      if (n >= units[i][1]) {
        var q = Math.floor(n / units[i][1]);
        parts.push(block3(q) + ' ' + units[i][0]);
        n -= q * units[i][1];
      }
    }
    if (n > 0) parts.push(block3(n));
    return parts.join(' ');
  }

  /* ── Kiểm duyệt tiếng Việt (bản demo thu nhỏ) ────────────── */
  var BAD_TOKENS = ['dm', 'dmm', 'dcm', 'dcmm', 'vcl', 'cl', 'cc', 'fuck', 'fck', 'dkm', 'loz'];
  var BAD_PHRASES = ['dit me', 'de me', 'du me', 'suc vat', 'oc cho', 'ngu nhu cho', 'cho de', 'me may', 'may mat'];
  function normalize(text) {
    return text.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  function violates(message) {
    var n = ' ' + normalize(message) + ' ';
    for (var i = 0; i < BAD_PHRASES.length; i++) {
      if (n.indexOf(BAD_PHRASES[i]) !== -1) return true;
    }
    var tokens = n.trim().split(' ');
    for (var j = 0; j < tokens.length; j++) {
      if (BAD_TOKENS.indexOf(tokens[j]) !== -1) return true;
    }
    return false;
  }

  /* ── Format tiền tệ ─────────────────────────────────────── */
  function vnd(amount) {
    try { return amount.toLocaleString('vi-VN') + '₫'; }
    catch (e) { return amount.toLocaleString() + '₫'; }
  }

  /* ── Trạng thái demo ────────────────────────────────────── */
  var queue = [];
  var playing = false;
  var selectedAmount = 100000;
  var GUEST_NAMES = ['Fan số 1', 'Bé Na', 'Thánh Lurk', 'Bé Mít', 'Cá Voi Kỳ Lộn', 'Khán giả ẩn danh'];

  var amountGrid = $('amountGrid');
  var customAmount = $('demoAmountCustom');
  var nameInput = $('demoName');
  var msgInput = $('demoMessage');
  var donateBtn = $('donateBtn');
  var toxicBtn = $('toxicBtn');
  var obsIdle = $('obsIdle');
  var obsAlert = $('obsAlert');
  var alertAvatar = $('alertAvatar');
  var alertName = $('alertName');
  var alertAmount = $('alertAmount');
  var alertMsg = $('alertMsg');
  var alertCaret = $('alertCaret');
  var alertTts = $('alertTts');
  var queueBadge = $('queueBadge');
  var queueCount = $('queueCount');
  var modToast = $('modToast');

  /* ── Chọn số tiền ───────────────────────────────────────── */
  if (amountGrid) {
    amountGrid.addEventListener('click', function (e) {
      var chip = e.target.closest('.amount-chip');
      if (!chip) return;
      amountGrid.querySelectorAll('.amount-chip').forEach(function (c) { c.classList.remove('selected'); });
      chip.classList.add('selected');
      selectedAmount = parseInt(chip.dataset.amount, 10);
      if (customAmount) customAmount.value = '';
    });
  }
  if (customAmount) {
    customAmount.addEventListener('input', function () {
      var v = parseInt(customAmount.value, 10);
      if (v > 0) {
        selectedAmount = v;
        amountGrid.querySelectorAll('.amount-chip').forEach(function (c) { c.classList.remove('selected'); });
      }
    });
  }

  /* ── Donate ─────────────────────────────────────────────── */
  function donate(name, message, amount) {
    if (violates(message)) {
      showModToast();
      if (soundOn) buzz();
      return;
    }
    queue.push({ name: name, message: message, amount: amount });
    updateQueueBadge();
    if (!playing) next();
  }

  function currentAmount() {
    var custom = customAmount ? parseInt(customAmount.value, 10) : NaN;
    return (custom >= 10000) ? custom : selectedAmount;
  }

  if (donateBtn) {
    donateBtn.addEventListener('click', function () {
      var name = (nameInput && nameInput.value.trim()) || GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
      var message = (msgInput && msgInput.value.trim()) || 'Cày tiếp đi stream ơi! 🔥';
      if (msgInput) msgInput.value = '';
      donate(name, message, currentAmount());
    });
  }
  if (toxicBtn) {
    toxicBtn.addEventListener('click', function () {
      if (msgInput) msgInput.value = 'dm stream này chán quá';
      var name = (nameInput && nameInput.value.trim()) || 'Tài Khoản Troll';
      donate(name, 'dm stream này chán quá', currentAmount());
    });
  }
  if (msgInput) {
    msgInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && donateBtn) donateBtn.click();
    });
  }

  /* ── Hàng đợi & phát alert ──────────────────────────────── */
  function updateQueueBadge() {
    if (!queueBadge) return;
    if (queue.length > 0) {
      queueCount.textContent = queue.length;
      queueBadge.classList.remove('hidden');
    } else {
      queueBadge.classList.add('hidden');
    }
  }

  var typeTimer = null;

  function next() {
    if (queue.length === 0) { playing = false; updateQueueBadge(); return; }
    playing = true;
    var item = queue.shift();
    updateQueueBadge();

    if (obsIdle) obsIdle.classList.add('hidden');
    obsAlert.classList.remove('hidden', 'out');

    var initial = (item.name || '?').trim().charAt(0).toUpperCase() || '?';
    alertAvatar.textContent = initial;
    alertName.textContent = item.name;
    alertAmount.textContent = vnd(item.amount);
    alertMsg.textContent = '';
    alertCaret.style.display = 'inline-block';
    alertTts.textContent = '🔊 Giọng đọc đang đọc lời nhắn…';

    if (soundOn) chime();

    var text = item.message;

    /* typewriter giả lập dòng chữ chạy theo giọng đọc */
    var i = 0;
    clearInterval(typeTimer);
    typeTimer = setInterval(function () {
      i++;
      alertMsg.textContent = text.slice(0, i);
      if (i >= text.length) clearInterval(typeTimer);
    }, Math.max(22, Math.min(45, 2600 / Math.max(text.length, 1))));

    /* alert hiện tại kết thúc → chuyển alert kế tiếp */
    var advanced = false;
    function advance() {
      if (advanced) return;
      advanced = true;
      clearInterval(typeTimer);
      alertCaret.style.display = 'none';
      obsAlert.classList.add('out');
      setTimeout(function () {
        obsAlert.classList.add('hidden');
        obsAlert.classList.remove('out');
        next();
      }, 380);
    }

    var spoken = item.name + ' vừa donate ' + docSo(item.amount) + ' đồng. ' + text;
    speak(spoken, function (ok) {
      if (ok) {
        alertTts.textContent = '✓ Giọng đọc đã đọc xong';
        setTimeout(advance, 550);
      } else {
        /* không có giọng Việt / đang tắt tiếng → tính theo độ dài lời nhắn */
        setTimeout(advance, Math.min(7500, 2800 + text.length * 55));
      }
    });
  }

  /* ── Toast kiểm duyệt ───────────────────────────────────── */
  var modTimer = null;
  function showModToast() {
    modToast.classList.remove('hidden');
    /* restart animation */
    modToast.style.animation = 'none';
    void modToast.offsetWidth;
    modToast.style.animation = '';
    clearTimeout(modTimer);
    modTimer = setTimeout(function () { modToast.classList.add('hidden'); }, 2800);
  }

  /* ── Vòng quay ──────────────────────────────────────────── */
  var WHEEL_EMOJI = ['🎤', '💃', '🕐', '🔥', '💚', '🎯'];
  var WHEEL_RESULTS = ['Hát 1 bài 🎤', 'Nhảy 1 bài 💃', 'AFK 1 phút 🕐', 'Chơi màn khó hơn 🔥', 'Tặng fan 10k 💚', 'Quay lại 🎯'];
  var wheelOverlay = $('wheelOverlay');
  var wheelInner = $('wheelInner');
  var wheelResult = $('wheelResult');
  var wheelBtn = $('wheelBtn');
  var wheelSpinning = false;
  var wheelAngle = 0;

  if (wheelInner) {
    WHEEL_EMOJI.forEach(function (emo, idx) {
      var label = document.createElement('span');
      label.className = 'wheel-label';
      label.textContent = emo;
      label.style.transform = 'rotate(' + (idx * 60 + 30) + 'deg) translateY(-80px)';
      wheelInner.appendChild(label);
    });
    var hub = document.createElement('span');
    hub.className = 'wheel-hub';
    hub.textContent = '🎁';
    $('wheel').appendChild(hub);
  }

  if (wheelBtn) {
    wheelBtn.addEventListener('click', function () {
      if (wheelSpinning) return;
      wheelSpinning = true;
      wheelOverlay.classList.remove('hidden');
      wheelResult.textContent = 'Đang quay…';

      var target = Math.floor(Math.random() * 6);
      /* đưa tâm segment `target` về vị trí con trỏ (đỉnh) + jitter */
      var jitter = (Math.random() * 36 - 18);
      var finalAngle = wheelAngle + 360 * 5 + (360 - (target * 60 + 30)) - (wheelAngle % 360) + jitter;
      wheelInner.style.transform = 'rotate(' + finalAngle + 'deg)';
      wheelAngle = finalAngle;

      setTimeout(function () {
        wheelResult.textContent = 'Kết quả: ' + WHEEL_RESULTS[target] + '!';
        if (soundOn) winSound();
        setTimeout(function () {
          wheelOverlay.classList.add('hidden');
          wheelSpinning = false;
        }, 2400);
      }, 4400);
    });
  }

  /* ── Bình chọn ──────────────────────────────────────────── */
  var voteOverlay = $('voteOverlay');
  var voteBtn = $('voteBtn');
  var voteClose = $('voteClose');
  var voteBarA = $('voteBarA');
  var voteBarB = $('voteBarB');
  var votePctA = $('votePctA');
  var votePctB = $('votePctB');
  var voteTotal = $('voteTotal');
  var votes = { a: 0, b: 0 };
  var voteTimer = null;

  function renderVote() {
    var total = votes.a + votes.b;
    var pa = total ? Math.round((votes.a / total) * 100) : 50;
    var pb = total ? 100 - pa : 50;
    voteBarA.style.width = pa + '%';
    voteBarB.style.width = pb + '%';
    votePctA.textContent = pa + '%';
    votePctB.textContent = pb + '%';
    voteTotal.textContent = total;
  }

  function castVote(side) {
    votes[side]++;
    renderVote();
    if (soundOn) tone(side === 'a' ? 660 : 550, 0, 0.14, 'triangle', 0.08);
  }

  if (voteBtn) {
    voteBtn.addEventListener('click', function () {
      votes = { a: 3 + Math.floor(Math.random() * 5), b: 3 + Math.floor(Math.random() * 5) };
      renderVote();
      voteOverlay.classList.remove('hidden');
      clearInterval(voteTimer);
      /* giả lập khán giả khác cũng đang bình chọn */
      voteTimer = setInterval(function () {
        castVote(Math.random() > 0.5 ? 'a' : 'b');
      }, 1100);
    });
  }
  ['voteA', 'voteB'].forEach(function (id, i) {
    var el = $(id);
    if (el) el.addEventListener('click', function () { castVote(i === 0 ? 'a' : 'b'); });
  });
  if (voteClose) {
    voteClose.addEventListener('click', function () {
      voteOverlay.classList.add('hidden');
      clearInterval(voteTimer);
    });
  }
})();
