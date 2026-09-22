/* 스크롤 등장 모션(.reveal-txt): 뷰에 들어오면 .is-in 추가, 한 번만 재생 */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var items = document.querySelectorAll('.reveal-txt');
  if (!items.length) return;

  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-in'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
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
  if (!zooms.length && !slides.length) return;

  function progressOf(el, totalOverride) {
    var rect = el.getBoundingClientRect();
    var vh = window.innerHeight;
    var total = totalOverride || (vh + rect.height);
    var p = (vh - rect.top) / total;
    return Math.max(0, Math.min(1, p));
  }

  var ZOOM_FROM = 1, ZOOM_TO = 1.22;

  /* 20번: 이미지가 화면 정중앙에 오기 전까지는 0, 정중앙을 지나는 시점부터
     자기 높이(SLIDE_DIST_RATIO 배)만큼 더 스크롤하는 동안 스와이프 진행 */
  var SLIDE_DIST_RATIO = 0.6;

  function slideProgress(el) {
    var rect = el.getBoundingClientRect();
    var vh = window.innerHeight;
    var elCenter = rect.top + rect.height / 2;
    var viewCenter = vh / 2;
    var dist = rect.height * SLIDE_DIST_RATIO;
    var p = (viewCenter - elCenter) / dist;
    return Math.max(0, Math.min(1, p));
  }

  function update() {
    zooms.forEach(function (z) {
      var p = progressOf(z.el);
      var scale = ZOOM_FROM + (ZOOM_TO - ZOOM_FROM) * p;
      z.img.style.transform = 'scale(' + scale.toFixed(4) + ')';
    });
    slides.forEach(function (s) {
      var p = slideProgress(s.el);
      s.track.style.transform = 'translateX(' + (-50 * p).toFixed(2) + '%)';
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
