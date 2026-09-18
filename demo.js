/* ═══════════════════════════════════════════════════════════
   LiveQR landing — demo tương tác
   Khán giả (trái) donate → overlay OBS (phải) hiện alert tuần tự,
   có hàng đợi, kiểm duyệt tiếng Việt, trạng thái đang đọc,
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
  function pop() { tone(520, 0, 0.12, 'triangle', 0.1); tone(780, 0.06, 0.14, 'triangle', 0.08); }
  function buzz() { tone(140, 0, 0.22, 'sawtooth', 0.1); tone(110, 0.1, 0.25, 'sawtooth', 0.08); }
  function winSound() { tone(523.3, 0, 0.18); tone(659.3, 0.12, 0.18); tone(784, 0.24, 0.3); }

  /* ── Bật/tắt âm thanh & giọng đọc ───────────────────────── */
  var soundOn = true;
  var soundToggle = $('soundToggle');
  if (soundToggle) {
    soundToggle.addEventListener('click', function () {
      soundOn = !soundOn;
      soundToggle.textContent = soundOn ? '🔊 Âm thanh: BẬT' : '🔇 Âm thanh: TẮT';
      if (soundOn) chime();
    });
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

  /* ── Catalog quà tặng (khớp app LiveQR) ─────────────────── */
  var GIFTS = [
    { id: 'rose', name: 'Hoa hồng', emoji: '🌹', minAmountVnd: 10000, tier: 'rail', accent: '#e8365d', animation: 'assets/gifts/rose.webm' },
    { id: 'heart', name: 'Trái tim', emoji: '❤️', minAmountVnd: 20000, tier: 'rail', accent: '#ff5c7d', animation: 'assets/gifts/heart.webm' },
    { id: 'coffee', name: 'Cà phê', emoji: '☕', minAmountVnd: 30000, tier: 'rail', accent: '#c08457', animation: 'assets/gifts/coffee.webm' },
    { id: 'gift-box', name: 'Hộp quà', emoji: '🎁', minAmountVnd: 50000, tier: 'banner', accent: '#5ee5a2', animation: 'assets/gifts/gift-box.webm' },
    { id: 'star', name: 'Ngôi sao', emoji: '⭐', minAmountVnd: 100000, tier: 'banner', accent: '#ffd76a', animation: 'assets/gifts/star.webm' },
    { id: 'rocket', name: 'Tên lửa', emoji: '🚀', minAmountVnd: 200000, tier: 'takeover', accent: '#ffae70', animation: 'assets/gifts/rocket.webm' },
    { id: 'fireworks', name: 'Pháo hoa', emoji: '🎆', minAmountVnd: 1000000, tier: 'takeover', accent: '#9b7cff', animation: 'assets/gifts/fireworks.webm' }
  ];
  var GIFT_TIER_PLAY = { rail: 5, banner: 7, takeover: 9 };

  function findGift(id) {
    if (!id) return null;
    for (var g = 0; g < GIFTS.length; g++) {
      if (GIFTS[g].id === id) return GIFTS[g];
    }
    return null;
  }

  function mountGiftArt(container, gift, size) {
    container.className = 'gift-art';
    if (size) {
      container.style.width = size + 'px';
      container.style.height = size + 'px';
      container.style.setProperty('--gift-art-size', size + 'px');
    }
    container.innerHTML = '';
    if (!gift.animation) {
      container.innerHTML = '<span class="gift-emoji">' + gift.emoji + '</span>';
      return;
    }
    var video = document.createElement('video');
    video.loop = true;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.src = gift.animation;
    video.addEventListener('error', function () {
      container.innerHTML = '<span class="gift-emoji">' + gift.emoji + '</span>';
    });
    container.appendChild(video);
    video.play().catch(function () {
      container.innerHTML = '<span class="gift-emoji">' + gift.emoji + '</span>';
    });
  }

  function formatMoney(amount) {
    try { return amount.toLocaleString('vi-VN') + ' ₫'; }
    catch (e) { return amount.toLocaleString() + ' ₫'; }
  }

  /* ── Trạng thái demo ────────────────────────────────────── */
  var queue = [];
  var playing = false;
  var selectedAmount = 100000;
  var selectedGiftId = null;
  var GUEST_NAMES = ['Fan số 1', 'Bé Na', 'Thánh Lurk', 'Bé Mít', 'Cá Voi Kỳ Lộn', 'Khán giả ẩn danh'];

  var giftGrid = $('giftGrid');
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
  var alertAction = $('alertAction');
  var alertAmount = $('alertAmount');
  var alertMsg = $('alertMsg');
  var alertCaret = $('alertCaret');
  var alertTts = $('alertTts');
  var queueBadge = $('queueBadge');
  var queueCount = $('queueCount');
  var modToast = $('modToast');
  var giftFeed = $('giftFeed');
  var obsScene = document.querySelector('.obs-scene');

  /* ── Render lưới quà tặng ───────────────────────────────── */
  function selectAmountChip(amount) {
    if (!amountGrid) return;
    amountGrid.querySelectorAll('.amount-chip').forEach(function (c) {
      c.classList.toggle('selected', parseInt(c.dataset.amount, 10) === amount);
    });
  }

  function selectGift(id) {
    selectedGiftId = id;
    if (!giftGrid) return;
    giftGrid.querySelectorAll('.gift-option').forEach(function (btn) {
      btn.classList.toggle('selected', btn.dataset.giftId === id);
    });
    if (id) {
      var gift = findGift(id);
      if (gift) {
        selectedAmount = gift.minAmountVnd;
        selectAmountChip(gift.minAmountVnd);
        if (customAmount) customAmount.value = '';
      }
    }
  }

  if (giftGrid) {
    GIFTS.forEach(function (gift) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gift-option';
      btn.dataset.giftId = gift.id;
      btn.title = gift.name + ' — từ ' + formatMoney(gift.minAmountVnd);

      var art = document.createElement('span');
      art.className = 'gift-option-art';
      mountGiftArt(art, gift, 38);

      var name = document.createElement('strong');
      name.textContent = gift.name;

      var price = document.createElement('small');
      price.textContent = 'từ ' + formatMoney(gift.minAmountVnd);

      btn.appendChild(art);
      btn.appendChild(name);
      btn.appendChild(price);
      btn.addEventListener('click', function () {
        selectGift(selectedGiftId === gift.id ? null : gift.id);
      });
      giftGrid.appendChild(btn);
    });
  }

  /* ── Chọn số tiền ───────────────────────────────────────── */
  if (amountGrid) {
    amountGrid.addEventListener('click', function (e) {
      var chip = e.target.closest('.amount-chip');
      if (!chip) return;
      amountGrid.querySelectorAll('.amount-chip').forEach(function (c) { c.classList.remove('selected'); });
      chip.classList.add('selected');
      selectedAmount = parseInt(chip.dataset.amount, 10);
      selectGift(null);
      if (customAmount) customAmount.value = '';
    });
  }
  if (customAmount) {
    customAmount.addEventListener('input', function () {
      var v = parseInt(customAmount.value, 10);
      if (v > 0) {
        selectedAmount = v;
        amountGrid.querySelectorAll('.amount-chip').forEach(function (c) { c.classList.remove('selected'); });
        selectGift(null);
      }
    });
  }

  /* ── Donate ─────────────────────────────────────────────── */
  function playGift(item) {
    if (obsIdle) obsIdle.classList.add('hidden');
    appendGiftFeed(item);
    showGiftFloat(item);
  }

  function donate(name, message, amount, gift) {
    if (violates(message)) {
      showModToast();
      if (soundOn) buzz();
      return;
    }
    var item = { name: name, message: message, amount: amount, gift: gift || null };
    if (gift) {
      /* Quà tặng bỏ qua hàng đợi alert — phát ngay, chỉ feed góc + animation */
      playGift(item);
      return;
    }
    queue.push(item);
    updateQueueBadge();
    if (!playing) next();
  }

  function currentGift() {
    return findGift(selectedGiftId);
  }

  function currentAmount() {
    var gift = currentGift();
    if (gift) return gift.minAmountVnd;
    var custom = customAmount ? parseInt(customAmount.value, 10) : NaN;
    return (custom >= 10000) ? custom : selectedAmount;
  }

  if (donateBtn) {
    donateBtn.addEventListener('click', function () {
      var name = (nameInput && nameInput.value.trim()) || GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
      var message = (msgInput && msgInput.value.trim()) || 'Cày tiếp đi stream ơi! 🔥';
      if (msgInput) msgInput.value = '';
      donate(name, message, currentAmount(), currentGift());
    });
  }
  if (toxicBtn) {
    toxicBtn.addEventListener('click', function () {
      if (msgInput) msgInput.value = 'dm stream này chán quá';
      var name = (nameInput && nameInput.value.trim()) || 'Tài Khoản Troll';
      donate(name, 'dm stream này chán quá', currentAmount(), currentGift());
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

  function appendGiftFeed(item) {
    if (!giftFeed || !item.gift) return;
    var row = document.createElement('div');
    row.className = 'gift-feed-row';
    row.style.setProperty('--gift-accent', item.gift.accent || '#9b7cff');
    var note = item.message ? ' · ' + item.message.slice(0, 48) : '';
    row.innerHTML =
      '<span class="gift-feed-emoji">' + item.gift.emoji + '</span>' +
      '<div><strong>' + item.name + ' vừa tặng ' + item.gift.name + '</strong>' +
      '<small>' + formatMoney(item.amount) + note + '</small></div>';
    giftFeed.appendChild(row);
    while (giftFeed.children.length > 4) {
      if (giftFeed.firstElementChild) giftFeed.removeChild(giftFeed.firstElementChild);
    }
    setTimeout(function () {
      row.classList.add('out');
      setTimeout(function () { if (row.parentNode) row.remove(); }, 420);
    }, 8000);
  }

  function burstConfetti(accent, parent) {
    if (!parent) return;
    var layer = document.createElement('div');
    layer.className = 'gift-confetti';
    var colors = [accent || '#ffd76a', '#9b7cff', '#5ee5a2', '#e8799d', '#ffae70', '#ffffff'];
    for (var c = 0; c < 36; c++) {
      var bit = document.createElement('i');
      bit.style.left = (38 + Math.random() * 24) + '%';
      bit.style.top = (28 + Math.random() * 18) + '%';
      bit.style.background = colors[c % colors.length];
      bit.style.animationDelay = (Math.random() * 0.25) + 's';
      bit.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
      layer.appendChild(bit);
    }
    parent.appendChild(layer);
    setTimeout(function () { layer.remove(); }, 2000);
  }

  function showGiftFloat(item) {
    if (!obsScene || !item.gift) return;
    var gift = item.gift;
    var float = document.createElement('div');
    float.className = 'gift-float tier-' + (gift.tier || 'banner');
    float.style.setProperty('--gift-accent', gift.accent || '#9b7cff');
    float.style.left = (18 + Math.random() * 64) + '%';
    float.style.top = (20 + Math.random() * 52) + '%';
    var art = document.createElement('div');
    float.appendChild(art);
    obsScene.appendChild(float);
    mountGiftArt(art, gift, 0);

    if (gift.tier === 'takeover') {
      burstConfetti(gift.accent, obsScene);
      var flash = document.createElement('div');
      flash.className = 'gift-flash';
      obsScene.appendChild(flash);
      setTimeout(function () { flash.remove(); }, 700);
      if (soundOn) chime();
    } else if (soundOn) {
      pop();
    }

    var seconds = GIFT_TIER_PLAY[gift.tier] || GIFT_TIER_PLAY.banner;
    setTimeout(function () {
      float.classList.add('out');
      setTimeout(function () { float.remove(); }, 520);
    }, seconds * 1000);
  }

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
    if (alertAction) alertAction.textContent = 'vừa donate';
    alertAmount.textContent = vnd(item.amount);
    alertMsg.textContent = '';
    alertCaret.style.display = 'inline-block';
    alertTts.textContent = '🔊 TTS đang đọc lời nhắn…';

    if (soundOn) chime();

    var text = item.message;

    /* typewriter giả lập dòng chữ đang được đọc */
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

    setTimeout(advance, Math.min(7500, 2800 + text.length * 55));
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
      wheelResult.textContent = 'Đang quay…';
      wheelOverlay.classList.remove('hidden');

      var target = Math.floor(Math.random() * 6);
      /* đưa tâm segment `target` về vị trí con trỏ (đỉnh) + jitter */
      var jitter = (Math.random() * 36 - 18);
      var finalAngle = wheelAngle + 360 * 5 + (360 - (target * 60 + 30)) - (wheelAngle % 360) + jitter;

      /* overlay vừa bỏ display:none — phải paint góc hiện tại rồi mới quay */
      wheelInner.style.transition = 'none';
      wheelInner.style.transform = 'rotate(' + wheelAngle + 'deg)';
      void wheelInner.offsetWidth;

      requestAnimationFrame(function () {
        wheelInner.style.transition = '';
        wheelInner.style.transform = 'rotate(' + finalAngle + 'deg)';
        wheelAngle = finalAngle;
      });

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
