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
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.4, rootMargin: '0px 0px -10% 0px' });

  items.forEach(function (el) { io.observe(el); });
})();
