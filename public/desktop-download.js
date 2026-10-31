/** Populate LiveQR TikTok download links from electron-builder feed on media.liveqr.me */
(function () {
  var CDN = 'https://media.liveqr.me/desktop/';
  var versionEl = document.getElementById('desktop-app-version');
  var armEl = document.getElementById('dl-mac-arm');
  var intelEl = document.getElementById('dl-mac-intel');
  var winEl = document.getElementById('dl-win');
  if (!versionEl || !armEl || !intelEl || !winEl) return;

  function fileUrl(name) {
    return CDN + encodeURIComponent(name);
  }

  function urlsFromYaml(text) {
    var out = [];
    var re = /^\s+-\s+url:\s*(.+)\s*$/gm;
    var m;
    while ((m = re.exec(text)) !== null) out.push(m[1].trim());
    return out;
  }

  function versionFromYaml(text) {
    var m = text.match(/^version:\s*(\S+)\s*$/m);
    return m ? m[1] : '';
  }

  function showLink(el, labelSuffix, fileName) {
    el.hidden = false;
    el.classList.remove('is-loading');
    el.href = fileUrl(fileName);
    el.setAttribute('download', '');
    if (labelSuffix) {
      var small = el.querySelector('small');
      if (small) small.textContent = labelSuffix + ' · ' + fileName;
    }
  }

  function pickMac(urls) {
    var arm = urls.find(function (u) { return u.includes('arm64') && u.endsWith('.dmg'); });
    var intel = urls.find(function (u) { return u.endsWith('.dmg') && !u.includes('arm64'); });
    return { arm: arm, intel: intel };
  }

  function pickWin(urls) {
    return urls.find(function (u) { return u.endsWith('.exe'); });
  }

  async function load() {
    try {
      var macText = await fetch(CDN + 'latest-mac.yml').then(function (r) {
        if (!r.ok) throw new Error('mac feed');
        return r.text();
      });
      var winText = await fetch(CDN + 'latest.yml').then(function (r) {
        if (!r.ok) throw new Error('win feed');
        return r.text();
      });
      var version = versionFromYaml(macText) || versionFromYaml(winText);
      if (version) versionEl.textContent = 'v' + version;

      var macUrls = urlsFromYaml(macText);
      var mac = pickMac(macUrls);
      if (mac.arm) showLink(armEl, 'Apple Silicon', mac.arm);
      if (mac.intel) showLink(intelEl, 'Intel', mac.intel);

      var winFile = pickWin(urlsFromYaml(winText));
      if (winFile) showLink(winEl, 'Windows', winFile);
    } catch (err) {
      versionEl.textContent = '—';
      var fallback = CDN;
      [armEl, intelEl, winEl].forEach(function (el) {
        el.hidden = false;
        el.classList.remove('is-loading');
        el.href = fallback;
        el.removeAttribute('download');
      });
    }
  }

  void load();
})();
