/* ================================================================
   스크롤 인뷰 리빌 + 숫자 카운트업
   - .reveal 요소가 화면에 들어오면 .is-in → CSS가 fade+slide
   - data-delay="200"(ms) 로 순차 등장(스태거)
   - .countup[data-to] 는 뷰 진입 시 0 → 목표값 카운트업 (가격 등)
   - 한 번 나타난 요소는 유지, prefers-reduced-motion 대응
   ================================================================ */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 히어로 자동 슬라이드 ---------- */
  (function heroSlider() {
    var track = document.getElementById('heroTrack');
    var dotsWrap = document.getElementById('heroDots');
    if (!track) return;
    var n = parseInt(getComputedStyle(track).getPropertyValue('--n')) || 2;
    var dots = dotsWrap ? [].slice.call(dotsWrap.children) : [];
    var i = 0, timer = null, firstTimer = null, INTERVAL = 3500, FIRST_DELAY = 900;

    function go(idx) {
      i = (idx + n) % n;
      track.style.setProperty('--i', i);
      dots.forEach(function (d, k) { d.classList.toggle('on', k === i); });
    }
    function next() { go(i + 1); }
    function start() {
      if (reduce) return;
      stop();
      firstTimer = setTimeout(function () {
        next();
        timer = setInterval(next, INTERVAL);
      }, FIRST_DELAY);
    }
    function stop() { if (timer) clearInterval(timer); if (firstTimer) clearTimeout(firstTimer); }

    dots.forEach(function (d, k) {
      d.addEventListener('click', function () { go(k); start(); });
    });
    // 탭이 백그라운드면 멈춤(성능)
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
    start();
  })();

  /* ---------- 숫자 카운트업 ---------- */
  function countUp(el) {
    var to = parseInt(el.getAttribute('data-to') || '0', 10);
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduce) { el.textContent = prefix + to.toLocaleString('ko-KR') + suffix; return; }
    var dur = 1100, start = null;
    function tick(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);           // ease-out
      var val = Math.round(to * eased);
      el.textContent = prefix + val.toLocaleString('ko-KR') + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- 리빌 ---------- */
  var items = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-in'); });
    document.querySelectorAll('.countup').forEach(countUp);
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var delay = parseInt(el.getAttribute('data-delay') || '0', 10);
      setTimeout(function () { el.classList.add('is-in'); }, delay);
      io.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  items.forEach(function (el) { io.observe(el); });

  /* 카운트업은 별도 관찰 (요소가 리빌 안에 있어도 개별 트리거) */
  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      countUp(entry.target);
      cio.unobserve(entry.target);
    });
  }, { threshold: 0.6 });

  document.querySelectorAll('.countup').forEach(function (el) { cio.observe(el); });
})();
