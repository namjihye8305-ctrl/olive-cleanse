/* 스크롤 등장 모션(.reveal-txt, .rise-fade, .mask-reveal): 뷰에 들어오면 .is-in 추가, 한 번만 재생 */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var items = [].slice.call(document.querySelectorAll('.reveal-txt, .rise-fade, .mask-reveal'));
  if (!items.length) return;

  function show(el) { el.classList.add('is-in'); }

  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(show);
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var delay = el.classList.contains('rise-fade') ? 350 : 250;
      setTimeout(function () { show(el); }, delay);
      io.unobserve(el);
    });
  }, { threshold: 0.25, rootMargin: '0px 0px -8% 0px' });

  items.forEach(function (el) { io.observe(el); });

  /* 안전장치: 앵커 이동 등으로 화면을 건너뛴 경우, 이미 지나간(화면 위쪽) 요소는 바로 보이게 처리
     → 스크롤 중간에 글자/사진이 숨은 채 남지 않음 */
  var pending = true;
  function sweep() {
    pending = false;
    var vh = window.innerHeight;
    items.forEach(function (el) {
      if (el.classList.contains('is-in')) return;
      var r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top < vh * 0.15) { show(el); io.unobserve(el); }
    });
  }
  window.addEventListener('scroll', function () {
    if (pending) return;
    pending = true;
    setTimeout(sweep, 200);
  }, { passive: true });
  pending = false;
  window.addEventListener('load', sweep);
})();

/* 스크롤 연동(스크러빙): 휠 스크롤 진행률에 맞춰서만 움직임 (자동재생 없음)
   - .scrub-zoom / .blur-scrub : 사진 전체 줌인 + 블러→선명
   - .scrub-slide              : 사진 2장 가로 슬라이드 (+ 드래그 스와이프)
   - .parallax                 : 사진 전체가 영역 안에서 가볍게 상하 이동 */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var zooms = [].slice.call(document.querySelectorAll('.scrub-zoom')).map(function (el) {
    return { el: el, img: el.querySelector('img') };
  });
  var slides = [].slice.call(document.querySelectorAll('.scrub-slide')).map(function (el) {
    return { el: el, track: el.querySelector('.scrub-slide__track'), percent: 0, dragging: false };
  });
  var blurs = [].slice.call(document.querySelectorAll('.blur-scrub')).map(function (el) {
    return { el: el };
  });
  var parallaxes = [].slice.call(document.querySelectorAll('.parallax')).map(function (el) {
    return { el: el };
  });

  function progressOf(el, totalOverride) {
    var rect = el.getBoundingClientRect();
    var vh = window.innerHeight;
    var total = totalOverride || (vh + rect.height);
    var p = (vh - rect.top) / total;
    return Math.max(0, Math.min(1, p));
  }

  var ZOOM_FROM = 1.04, ZOOM_TO = 1.16; // 1보다 살짝 크게 시작 — 블러 상태일 때 가장자리 흰 여백 방지
  var MAX_BLUR = 18;
  var PARALLAX = 0.045;                 // 영역 높이 대비 이동 폭(±4.5%) — scale(1.1) 여유 안쪽

  /* 슬라이드: 화면에 보이기 시작(하단 진입) 후 시작점(0%), 화면을 빠져나갈 때 끝점(100%) */
  function update() {
    zooms.forEach(function (z) {
      var p = progressOf(z.el);
      var scale = ZOOM_FROM + (ZOOM_TO - ZOOM_FROM) * p;
      z.img.style.transform = 'scale(' + scale.toFixed(4) + ')';
    });
    slides.forEach(function (s) {
      if (s.dragging) return; // 드래그 중에는 포인터 핸들러가 직접 위치를 제어
      var raw = progressOf(s.el);
      var p = s.el.classList.contains('slide-late') ? Math.max(0, (raw - 0.35) / 0.5) : raw;
      p = Math.min(1, p);
      s.percent = p;
      s.track.style.transform = 'translateX(' + (-50 * p).toFixed(2) + '%)';
    });
    blurs.forEach(function (b) {
      var raw = progressOf(b.el);
      var p = Math.min(1, raw / 0.35); // 화면에 들어오고 나서 얼마 안 가 바로 또렷해짐
      b.el.style.filter = 'blur(' + (MAX_BLUR * (1 - p)).toFixed(2) + 'px)';
    });
    parallaxes.forEach(function (x) {
      var p = progressOf(x.el);
      var h = x.el.getBoundingClientRect().height;
      x.el.style.setProperty('--py', ((0.5 - p) * 2 * PARALLAX * h).toFixed(1) + 'px');
    });
  }

  if (!reduce) {
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { update(); ticking = false; });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* 슬라이드 영역: 스크롤 연동과 별개로 마우스/손가락 드래그로도 스와이프 가능
     (모션 최소화 환경에서도 두 번째 사진을 볼 수 있도록 드래그는 유지) */
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
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          locked = false;
          s.dragging = false;
          el.style.cursor = 'grab';
          return;
        }
        locked = true;
        if (el.setPointerCapture) { try { el.setPointerCapture(e.pointerId); } catch (err) {} }
      }
      if (locked !== true) return;
      e.preventDefault();

      var width = el.getBoundingClientRect().width || 1;
      var p = Math.max(0, Math.min(1, startPercent - dx / width));
      s.percent = p;
      track.style.transform = 'translateX(' + (-50 * p).toFixed(2) + '%)';
      var now = Date.now();
      var dt = now - lastTime;
      if (dt > 0) velocity = (e.clientX - lastX) / dt;
      lastX = e.clientX; lastTime = now;
    }
    function onUp() {
      if (!s.dragging) return;
      s.dragging = false;
      el.style.cursor = 'grab';
      if (locked !== true) return;
      var movedEnough = Math.abs(s.percent - startPercent) > 0.12;
      var flicked = Math.abs(velocity) > 0.5;
      var target;
      if (movedEnough || flicked) {
        target = flicked ? (velocity < 0 ? 1 : 0) : (s.percent > startPercent ? 1 : 0);
      } else {
        target = startPercent > 0.5 ? 1 : 0;
      }
      s.percent = target;
      track.style.transition = reduce ? 'none' : 'transform .32s cubic-bezier(.16,.84,.34,1)';
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
