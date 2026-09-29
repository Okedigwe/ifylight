document.documentElement.classList.add("js");

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* Header: solid background after scrolling */
const header = $(".site-header");
const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 40);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

/* Mobile menu */
const toggle = $("#menu-toggle");
const nav = $("#site-nav");
function setMenu(open) {
  nav.classList.toggle("show", open);
  header.classList.toggle("menu-open", open);
  toggle.setAttribute("aria-expanded", open);
  toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  document.body.style.overflow = open ? "hidden" : "";
}
toggle.addEventListener("click", () => setMenu(!nav.classList.contains("show")));
$$("a", nav).forEach(a => a.addEventListener("click", () => setMenu(false)));

/* Hero spotlight follows the pointer */
const hero = $("#hero");
if (hero && matchMedia("(pointer: fine)").matches) {
  hero.addEventListener("pointermove", e => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty("--mx", `${e.clientX - r.left}px`);
    hero.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
}

/* Reveal on scroll */
const io = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  });
}, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
$$(".reveal, .steps li").forEach(el => io.observe(el));
// stagger items that sit side by side
$$(".steps").forEach(g => $$(":scope > *", g).forEach((el, i) => el.style.setProperty("--d", `${(i % 4) * 0.07}s`)));

/* ---------- Sliders (solutions + equipment rows) ---------- */
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const sliders = $$(".slider").map(el => {
  const track = $(".track", el);
  const scope = el.closest(".row") || el;
  const prev = $(".arr.prev", scope), next = $(".arr.next", scope);
  const bar = $(".bar i", el);
  const dotsBox = $(".dots", el);
  const s = { el, track, timer: null, paused: false, visible: false, hold: 0 };

  const slides = () => [...track.children].filter(c => !c.hidden);
  const step = () => { const f = slides()[0]; return f ? f.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 16) : track.clientWidth; };
  const atEnd = () => track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  s.go = dir => {
    if (dir > 0 && atEnd()) track.scrollTo({ left: 0 });
    else if (dir < 0 && track.scrollLeft <= 4) track.scrollTo({ left: track.scrollWidth });
    else track.scrollBy({ left: dir * step() });
  };
  prev && prev.addEventListener("click", () => { s.go(-1); s.nudge(); });
  next && next.addEventListener("click", () => { s.go(1); s.nudge(); });

  // progress bar + dots
  let dots = [];
  s.buildDots = () => {
    if (!dotsBox) return;
    dotsBox.innerHTML = "";
    dots = slides().map((_, i) => {
      const b = document.createElement("button");
      b.addEventListener("click", () => { track.scrollTo({ left: i * step() }); s.nudge(); });
      dotsBox.appendChild(b);
      return b;
    });
  };
  s.update = () => {
    const max = track.scrollWidth - track.clientWidth;
    const vis = track.clientWidth / track.scrollWidth;
    if (bar) {
      bar.style.width = `${Math.min(100, vis * 100)}%`;
      bar.style.transform = `translateX(${max > 0 ? (track.scrollLeft / max) * (1 / vis - 1) * 100 : 0}%)`;
    }
    if (dots.length) {
      const i = Math.round(track.scrollLeft / step());
      dots.forEach((d, k) => d.classList.toggle("on", k === Math.min(i, dots.length - 1)));
    }
    const noScroll = max <= 4;
    [prev, next].forEach(b => b && (b.disabled = noScroll, b.style.opacity = noScroll ? .35 : ""));
  };
  track.addEventListener("scroll", () => requestAnimationFrame(s.update), { passive: true });
  window.addEventListener("resize", s.update);

  // autoplay: pauses on hover, touch, when off-screen or tab hidden
  const every = +el.dataset.autoplay || 0;
  s.nudge = () => { s.hold = Date.now() + 7000; };
  el.addEventListener("pointerenter", () => s.paused = true);
  el.addEventListener("pointerleave", () => s.paused = false);
  track.addEventListener("touchstart", s.nudge, { passive: true });
  track.addEventListener("wheel", s.nudge, { passive: true });
  el.addEventListener("focusin", s.nudge);
  if (every && !reduce) {
    s.timer = setInterval(() => {
      if (s.paused || !s.visible || document.hidden || Date.now() < s.hold || lbOpen()) return;
      s.go(1);
    }, every);
  }
  new IntersectionObserver(([en]) => { s.visible = en.isIntersecting; }, { threshold: 0.35 }).observe(el);
  s.buildDots(); s.update();
  return s;
});
const lbOpen = () => !document.getElementById("lightbox").hidden;

/* ---------- Filter + search across the rows ---------- */
const cards = $$(".card");
const rows = $$(".row");
const chips = $$(".chip");
const search = $("#search");
const empty = $("#empty");
let activeCat = "all";

function applyFilter() {
  const q = search.value.trim().toLowerCase();
  let shown = 0;
  rows.forEach(r => {
    const okCat = activeCat === "all" || r.dataset.category === activeCat;
    let n = 0;
    $$(".card", r).forEach(c => {
      const ok = okCat && (!q || c.textContent.toLowerCase().includes(q));
      c.hidden = !ok;
      if (ok) n++;
    });
    r.hidden = n === 0;
    shown += n;
    $(".track", r).scrollTo({ left: 0 });
  });
  empty.hidden = shown > 0;
  sliders.forEach(s => { s.buildDots(); s.update(); });
}
function setCat(cat) {
  activeCat = cat;
  chips.forEach(b => {
    const on = b.dataset.category === cat;
    b.classList.toggle("active", on);
    b.setAttribute("aria-pressed", on);
  });
  applyFilter();
}
chips.forEach(b => b.addEventListener("click", () => setCat(b.dataset.category)));
search.addEventListener("input", applyFilter);
$$("[data-filter]").forEach(a => a.addEventListener("click", () => { search.value = ""; setCat(a.dataset.filter); }));

/* ---------- Hero card: rotating featured products ---------- */
const hcSlides = $$(".hc-slide");
let hcIdx = 0;
const hcTitle = $("#hc-title");
const hcBar = $(".hc-progress i");
const HC_MS = 3800;
function hcShow(i) {
  if (!hcSlides.length) return;
  hcSlides[hcIdx].classList.remove("on");
  hcIdx = (i + hcSlides.length) % hcSlides.length;
  const sl = hcSlides[hcIdx];
  sl.classList.add("on");
  hcTitle.textContent = sl.dataset.title;
  hcBar.classList.remove("run"); void hcBar.offsetWidth;
  if (!reduce) { hcBar.style.setProperty("--hc", HC_MS + "ms"); hcBar.classList.add("run"); }
}
if (hcSlides.length) {
  hcShow(0);
  const card = $("#hero-card");
  let hcPause = false;
  card.addEventListener("pointerenter", () => hcPause = true);
  card.addEventListener("pointerleave", () => hcPause = false);
  if (!reduce) setInterval(() => { if (!hcPause && !document.hidden && !lbOpen()) hcShow(hcIdx + 1); }, HC_MS);
  const openCurrent = () => { const c = cards.find(c => c.dataset.id === hcSlides[hcIdx].dataset.id); if (c) openLb(c); };
  $(".hero-card-img", card).addEventListener("click", openCurrent);
  $("#hc-open").addEventListener("click", openCurrent);
}

/* ---------- Crossfading image stacks (About) ---------- */
$$(".fader").forEach(f => {
  const imgs = $$("img", f);
  if (imgs.length < 2 || reduce) return;
  let i = 0;
  setInterval(() => {
    if (document.hidden) return;
    imgs[i].classList.remove("on");
    i = (i + 1) % imgs.length;
    imgs[i].classList.add("on");
  }, +f.dataset.interval || 4000);
});

/* ---------- Fixed background videos ---------- */
const saveData = navigator.connection && navigator.connection.saveData;
$$(".bg-video").forEach(v => {
  if (reduce || saveData) return;                 // poster image only
  const src = () => (innerWidth < 900 ? v.dataset.sd : v.dataset.hd);
  const load = () => { if (!v.src) { v.src = src(); v.load(); } v.play().catch(() => {}); };
  new IntersectionObserver(([en]) => {
    if (en.isIntersecting) load(); else if (v.src) v.pause();
  }, { rootMargin: "200px 0px" }).observe(v.parentElement);
});

/* Lightbox */
const lb = $("#lightbox");
const lbImg = $("#lb-img");
let list = [], idx = 0, lastFocus = null;

function show(i) {
  idx = (i + list.length) % list.length;
  const c = list[idx];
  lbImg.src = $(".card-media", c).getAttribute("href");
  lbImg.alt = $("img", c).alt;
  $("#lb-title").textContent = $("h3", c).textContent;
  $("#lb-desc").textContent = $("p", c).textContent;
  $("#lb-cat").textContent = c.dataset.catLabel;
  $("#lb-wa").href = $(".card-wa", c).href;
  $("#lb-count").textContent = `${String(idx + 1).padStart(2, "0")} / ${String(list.length).padStart(2, "0")}`;
  // restart the pop animation
  lbImg.style.animation = "none"; lbImg.offsetHeight; lbImg.style.animation = "";
  // preload neighbours
  [idx + 1, idx - 1].forEach(n => { const nc = list[(n + list.length) % list.length]; new Image().src = $(".card-media", nc).getAttribute("href"); });
}
function openLb(card) {
  list = cards.filter(c => !c.hidden && !c.closest('.row').hidden);
  if (!list.includes(card)) list = cards;
  lastFocus = document.activeElement;
  show(list.indexOf(card));
  lb.hidden = false;
  document.body.classList.add("lb-open");
  $(".lb-close", lb).focus();
}
function closeLb() {
  lb.hidden = true;
  lbImg.src = "";
  document.body.classList.remove("lb-open");
  if (lastFocus) lastFocus.focus();
}
$$(".card-media, .card-view").forEach(a => a.addEventListener("click", e => { e.preventDefault(); openLb(a.closest(".card")); }));
$(".lb-close", lb).addEventListener("click", closeLb);
$(".lb-prev", lb).addEventListener("click", () => show(idx - 1));
$(".lb-next", lb).addEventListener("click", () => show(idx + 1));
lb.addEventListener("click", e => { if (e.target === lb || e.target.classList.contains("lb-inner") || e.target.classList.contains("lb-media")) closeLb(); });
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && nav.classList.contains("show")) setMenu(false);
  if (lb.hidden) return;
  if (e.key === "Escape") closeLb();
  if (e.key === "ArrowLeft") show(idx - 1);
  if (e.key === "ArrowRight") show(idx + 1);
});
let tx = null;
lb.addEventListener("touchstart", e => { tx = e.touches[0].clientX; }, { passive: true });
lb.addEventListener("touchend", e => {
  if (tx === null) return;
  const dx = e.changedTouches[0].clientX - tx;
  if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
  tx = null;
});

/* FAQ: keep one open at a time */
$$(".faq-list details").forEach(d => d.addEventListener("toggle", () => {
  if (d.open) $$(".faq-list details").forEach(o => { if (o !== d) o.open = false; });
}));

/* Contact form → Formspree */
const form = $("#contact-form");
const status = $("#form-status");
form.addEventListener("submit", async e => {
  e.preventDefault();
  const btn = $("button", form);
  btn.disabled = true;
  status.className = "form-status";
  status.textContent = "Sending…";
  try {
    const res = await fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error();
    status.classList.add("ok");
    status.textContent = "Thank you! We’ll get back to you shortly. For a faster reply, message us on WhatsApp.";
    form.reset();
  } catch {
    status.classList.add("err");
    status.textContent = "Sorry, that didn’t send. Please call or WhatsApp +234 704 370 9023.";
  } finally {
    btn.disabled = false;
  }
});

$("#year").textContent = new Date().getFullYear();
