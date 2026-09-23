/* 스크롤 등장 모션(.reveal-txt, .rise-fade): 뷰에 들어오면 .is-in 추가, 한 번만 재생 */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var items = document.querySelectorAll('.reveal-txt, .rise-fade');
  if (!items.length) return;

  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-in'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var delay = el.classList.contains('rise-fade') ? 350 : 300;
      setTimeout(function () { el.classList.add('is-in'); }, delay);
      io.unobserve(el);
    });
  }, { threshold: 0.4, rootMargin: '0px 0px -10% 0px' });

  items.forEach(function (el) { io.observe(el); });
})();

/* 스크롤 연동(스크러빙): 휠 스크롤 진행률에 맞춰서만 움직임 (자동재생 없음) */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  var zooms = [].slice.call(document.querySelectorAll('.scrub-zoom')).map(function (el) {
    return { el: el, img: el.querySelector('img') };
  });
  var slides = [].slice.call(document.querySelectorAll('.scrub-slide')).map(function (el) {
    return { el: el, track: el.querySelector('.scrub-slide__track') };
  });
  var blurs = [].slice.call(document.querySelectorAll('.blur-scrub')).map(function (el) {
    return { el: el };
  });
  if (!zooms.length && !slides.length && !blurs.length) return;

  function progressOf(el, totalOverride) {
    var rect = el.getBoundingClientRect();
    var vh = window.innerHeight;
    var total = totalOverride || (vh + rect.height);
    var p = (vh - rect.top) / total;
    return Math.max(0, Math.min(1, p));
  }

  var ZOOM_FROM = 1.06, ZOOM_TO = 1.22; // 1보다 살짝 크게 시작 — 블러 상태일 때 가장자리 흰 여백 방지
  var MAX_BLUR = 18;

  /* 20번: 화면에 보이기 시작(하단 진입)할 때 시작점(0%), 화면을 다 빠져나갈 때(상단 이탈) 끝점(100%)
     — 보이는 동안 내내 천천히 진행되고, 시작/끝이 항상 화면 안에서 일어남 */
  function update() {
    zooms.forEach(function (z) {
      var raw = progressOf(z.el);
      var p = z.el.classList.contains('zoom-late') ? Math.max(0, (raw - 0.3) / 0.7) : raw;
      var scale = ZOOM_FROM + (ZOOM_TO - ZOOM_FROM) * p;
      z.img.style.transform = 'scale(' + scale.toFixed(4) + ')';
    });
    slides.forEach(function (s) {
      var raw = progressOf(s.el);
      var p = s.el.classList.contains('slide-late') ? Math.max(0, (raw - 0.35) / 0.65) : raw;
      s.track.style.transform = 'translateX(' + (-50 * p).toFixed(2) + '%)';
    });
    blurs.forEach(function (b) {
      var raw = progressOf(b.el);
      var p = Math.min(1, raw / 0.35); // 화면에 들어오고 나서 얼마 안 가 바로 또렷해짐
      b.el.style.filter = 'blur(' + (MAX_BLUR * (1 - p)).toFixed(2) + 'px)';
    });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { update(); ticking = false; });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
