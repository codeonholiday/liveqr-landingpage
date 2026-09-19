/* LiveQR landing — menu mobile, header, FAQ accordion, scroll-reveal */
(function () {
  'use strict';

  /* Header đổ bóng khi cuộn */
  var header = document.getElementById('siteHeader');
  function onScroll() {
    if (header) header.classList.toggle('scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Menu mobile */
  var toggle = document.getElementById('menuToggle');
  var nav = document.getElementById('mainNav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* FAQ accordion — mở 1 mục, đóng các mục khác */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    if (!q) return;
    q.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function (other) {
        other.classList.remove('open');
        var b = other.querySelector('.faq-q');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        q.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* Hero demo video — play/pause, seek, âm thanh */
  var heroVideo = document.getElementById('heroDemoVideo');
  var heroPlay = document.getElementById('heroDemoPlay');
  var heroSeek = document.getElementById('heroDemoSeek');
  var heroTime = document.getElementById('heroDemoTime');
  var heroMute = document.getElementById('heroDemoMute');
  if (heroVideo && heroPlay && heroSeek && heroTime && heroMute) {
    var heroSeeking = false;

    function fmtTime(sec) {
      if (!isFinite(sec) || sec < 0) return '0:00';
      var m = Math.floor(sec / 60);
      var s = Math.floor(sec % 60);
      return m + ':' + String(s).padStart(2, '0');
    }

    function syncPlayUi() {
      var playing = !heroVideo.paused && !heroVideo.ended;
      heroPlay.querySelector('.icon-play').classList.toggle('hidden', playing);
      heroPlay.querySelector('.icon-pause').classList.toggle('hidden', !playing);
      heroPlay.setAttribute('aria-label', playing ? 'Tạm dừng video' : 'Phát video');
    }

    function syncMuteUi() {
      var muted = heroVideo.muted || heroVideo.volume === 0;
      heroMute.querySelector('.icon-vol').classList.toggle('hidden', muted);
      heroMute.querySelector('.icon-muted').classList.toggle('hidden', !muted);
      heroMute.setAttribute('aria-label', muted ? 'Bật tiếng' : 'Tắt tiếng');
    }

    function syncSeekUi() {
      if (heroSeeking || !heroVideo.duration) return;
      heroSeek.value = String((heroVideo.currentTime / heroVideo.duration) * 100);
      heroTime.textContent = fmtTime(heroVideo.currentTime) + ' / ' + fmtTime(heroVideo.duration);
    }

    heroPlay.addEventListener('click', function () {
      if (heroVideo.paused || heroVideo.ended) {
        heroVideo.muted = false;
        syncMuteUi();
        heroVideo.play().catch(function () {
          heroVideo.muted = true;
          syncMuteUi();
          heroVideo.play();
        });
      } else {
        heroVideo.pause();
      }
      syncPlayUi();
    });

    heroMute.addEventListener('click', function () {
      heroVideo.muted = !heroVideo.muted;
      if (!heroVideo.muted && heroVideo.volume === 0) heroVideo.volume = 1;
      syncMuteUi();
    });

    heroSeek.addEventListener('input', function () {
      heroSeeking = true;
      if (heroVideo.duration) {
        var t = (Number(heroSeek.value) / 100) * heroVideo.duration;
        heroVideo.currentTime = t;
        heroTime.textContent = fmtTime(t) + ' / ' + fmtTime(heroVideo.duration);
      }
    });
    heroSeek.addEventListener('change', function () { heroSeeking = false; });

    heroVideo.addEventListener('play', syncPlayUi);
    heroVideo.addEventListener('pause', syncPlayUi);
    heroVideo.addEventListener('ended', syncPlayUi);
    heroVideo.addEventListener('timeupdate', syncSeekUi);
    heroVideo.addEventListener('loadedmetadata', syncSeekUi);
    heroVideo.addEventListener('volumechange', syncMuteUi);

    syncPlayUi();
    syncMuteUi();
    syncSeekUi();
  }

  /* Scroll-reveal */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('visible'); });
  }
})();
