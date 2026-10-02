/* ═══════════════════════════════════════════════════════════
   LiveQR landing — demo tương tác
   Khán giả (trái) donate → overlay OBS (phải) hiện alert tuần tự,
   có hàng đợi, kiểm duyệt tiếng Việt, đọc bình luận TikTok Live
   (chỉ phát âm thanh — không hiện chữ lên overlay).
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

  /* ── Catalog quà tặng (demo để 4 quà tiêu biểu — catalog đầy đủ trong app LiveQR) ── */
  var GIFTS = [
    { id: 'rose', name: 'Hoa hồng', emoji: '🌹', minAmountVnd: 10000, tier: 'rail', accent: '#e8365d', animation: 'assets/gifts/rose.webm' },
    { id: 'coffee', name: 'Cà phê', emoji: '☕', minAmountVnd: 30000, tier: 'rail', accent: '#c08457', animation: 'assets/gifts/coffee.webm' },
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

  /* bỏ chọn quà → khôi phục chip tiền gần với mức hiện tại */
  function restoreNearestChip() {
    if (!amountGrid) return;
    var chips = Array.prototype.slice.call(amountGrid.querySelectorAll('.amount-chip'))
      .map(function (c) { return parseInt(c.dataset.amount, 10); })
      .sort(function (a, b) { return a - b; });
    if (!chips.length) return;
    var pick = chips[0];
    for (var i = 0; i < chips.length; i++) {
      if (chips[i] <= selectedAmount) pick = chips[i];
    }
    selectedAmount = pick;
    selectAmountChip(pick);
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
      }
    } else {
      restoreNearestChip();
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
    return selectedAmount;
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

  /* ── Đọc bình luận TikTok Live (giả lập — chỉ phát âm thanh) ── */
  var TT_NAMES = [
    'buivannam.2k5', 'meocobe.121', 'thanh.ne.2k3', 'hibap.studio', 'loan.chabanh',
    'tranducbo.888', 'kemxoi.99', 'nhim.uday', 'hoathoxinh', 'sky.vn.official'
  ];
  var TT_COMMENTS = [
    'Hola stream ơi 🥰', 'Vào đúng lúc hay quá', 'Chơi màn này ghê thật',
    'Xin combo 3 phát đi ạ 🔥', 'Ai Hà Nội giơ tay 🙋', 'Follow rồi nhé, kênh vui quá',
    'Cười muốn xỉu 😂', 'Giọng đọc bình luận mượt ghê', 'Chiến hết mình nào stream',
    'Đắk Lắk có ai không', 'Tối nay live tới mấy giờ vậy ạ', 'Gửi tim rồi nhé ❤️'
  ];
  var ttChat = $('ttChat');
  var ttTtsText = $('ttTtsText');
  var ttInput = $('ttComment');
  var ttSendBtn = $('ttSendBtn');
  var ttBurstBtn = $('ttBurstBtn');
  var ttQueue = [];
  var ttReading = false;
  var ttBursting = false;
  var ttHideTimer = null;

  function ttRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* Bình luận KHÔNG hiện lên overlay — overlay chỉ có badge trạng thái đang đọc */
  function ttRenderBadge() {
    ttTtsText.textContent = ttQueue.length > 0
      ? 'Đang đọc bình luận TikTok · còn ' + ttQueue.length + ' chờ'
      : 'Đang đọc bình luận TikTok…';
  }

  function ttNext() {
    if (ttQueue.length === 0) {
      ttReading = false;
      ttTtsText.textContent = 'Đã đọc hết bình luận';
      clearTimeout(ttHideTimer);
      ttHideTimer = setTimeout(function () {
        if (!ttReading && ttQueue.length === 0) ttChat.classList.add('hidden');
      }, 1600);
      return;
    }
    ttReading = true;
    var item = ttQueue.shift();
    ttRenderBadge();
    if (soundOn) pop();
    setTimeout(ttNext, Math.min(3400, 1100 + item.text.length * 65));
  }

  function ttComment(name, text) {
    /* bình luận TikTok cũng đi qua kiểm duyệt tiếng Việt */
    if (violates(text)) {
      showModToast();
      if (soundOn) buzz();
      return;
    }
    if (obsIdle) obsIdle.classList.add('hidden');
    ttChat.classList.remove('hidden');
    clearTimeout(ttHideTimer);
    if (soundOn) tone(660, 0, 0.09, 'triangle', 0.06);
    ttQueue.push({ name: name, text: text });
    if (!ttReading) ttNext();
    else ttRenderBadge();
  }

  if (ttSendBtn) {
    ttSendBtn.addEventListener('click', function () {
      var text = ttInput ? ttInput.value.trim() : '';
      if (!text) { if (ttInput) ttInput.focus(); return; }
      ttInput.value = '';
      var name = (nameInput && nameInput.value.trim()) || ttRandom(TT_NAMES);
      ttComment(name, text);
    });
  }
  if (ttInput) {
    ttInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && ttSendBtn) ttSendBtn.click();
    });
  }

  /* ── Mô phỏng trận chat TikTok dồn dập ──────────────────── */
  if (ttBurstBtn) {
    ttBurstBtn.addEventListener('click', function () {
      if (ttBursting) return;
      ttBursting = true;
      var left = 6 + Math.floor(Math.random() * 4);
      (function fire() {
        if (left-- <= 0) { ttBursting = false; return; }
        ttComment(ttRandom(TT_NAMES), ttRandom(TT_COMMENTS));
        setTimeout(fire, 420 + Math.random() * 680);
      })();
    });
  }
})();
