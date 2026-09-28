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
    return { el: el, track: el.querySelector('.scrub-slide__track'), percent: 0, dragging: false };
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
      if (s.dragging) return; // 드래그 중에는 포인터 핸들러가 직접 위치를 제어
      var raw = progressOf(s.el);
      var p = s.el.classList.contains('slide-late') ? Math.max(0, (raw - 0.35) / 0.65) : raw;
      s.percent = p;
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

  /* 20번 전용: 기존 스크롤 연동은 그대로 두고, 마우스/손가락 드래그로도 스와이프 가능하게 추가 */
  slides.forEach(function (s) {
    var el = s.el, track = s.track;
    var startX = 0, startY = 0, startPercent = 0, lastX = 0, lastTime = 0, velocity = 0;
    var locked = null; // null=미정, true=가로 드래그로 확정, false=세로 스크롤로 확정(드래그 포기)
    el.style.touchAction = 'pan-y';
    el.style.cursor = 'grab';

    function onDown(e) {
      s.dragging = true;
      locked = null;
      startX = lastX = e.clientX;
      startY = e.clientY;
      startPercent = s.percent;
      lastTime = Date.now();
      velocity = 0;
      el.style.cursor = 'grabbing';
      track.style.transition = 'none';
    }
    function onMove(e) {
      if (!s.dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;

      if (locked === null) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return; // 방향 판단하기엔 아직 이동량 부족
        if (Math.abs(dy) > Math.abs(dx)) {
          // 세로 움직임이 더 크면 스크롤 의도 -> 드래그 포기하고 네이티브 스크롤에 맡김
          locked = false;
          s.dragging = false;
          el.style.cursor = 'grab';
          return;
        }
        locked = true;
        if (el.setPointerCapture) { try { el.setPointerCapture(e.pointerId); } catch (err) {} }
      }
      if (locked !== true) return;
      e.preventDefault(); // 가로 드래그로 확정된 뒤엔 페이지가 같이 스크롤되지 않게 막음

      var width = el.getBoundingClientRect().width || 1;
      var p = startPercent - dx / width;
      p = Math.max(0, Math.min(1, p));
      s.percent = p;
      track.style.transform = 'translateX(' + (-50 * p).toFixed(2) + '%)';
      var now = Date.now();
      var dt = now - lastTime;
      if (dt > 0) velocity = (e.clientX - lastX) / dt; // px per ms
      lastX = e.clientX; lastTime = now;
    }
    function onUp() {
      if (!s.dragging) return;
      s.dragging = false;
      el.style.cursor = 'grab';
      if (locked !== true) return; // 세로 스크롤로 판정된 제스처는 스냅 처리하지 않음
      // 스와이프 판정: 일정 거리 이상 이동했거나 빠르게 튕기면(velocity) 이미지가 완전히 전환됨(0 또는 1로 스냅)
      var movedEnough = Math.abs(s.percent - startPercent) > 0.12;
      var flicked = Math.abs(velocity) > 0.5; // px/ms
      var target;
      if (movedEnough || flicked) {
        var direction = flicked ? (velocity < 0 ? 1 : 0) : (s.percent > startPercent ? 1 : 0);
        target = direction;
      } else {
        target = startPercent > 0.5 ? 1 : 0;
      }
      s.percent = target;
      track.style.transition = 'transform .32s cubic-bezier(.16,.84,.34,1)';
      track.style.transform = 'translateX(' + (-50 * target).toFixed(2) + '%)';
      setTimeout(function () { track.style.transition = 'none'; }, 340);
    }

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove, { passive: false });
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerleave', function () { if (s.dragging && locked !== true) onUp(); });
  });
})();
