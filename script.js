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
$$(".grid, .solutions, .steps").forEach(g => $$(":scope > *", g).forEach((el, i) => el.style.setProperty("--d", `${(i % 4) * 0.07}s`)));

/* Quote band parallax */
const band = $(".quote-band > img");
if (band && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const par = () => {
    const r = band.parentElement.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
    band.style.transform = `translateY(${p * -8}%)`;
  };
  window.addEventListener("scroll", par, { passive: true });
  par();
}

/* Filter + search */
const cards = $$(".card");
const chips = $$(".chip");
const search = $("#search");
const empty = $("#empty");
let activeCat = "all";

function applyFilter() {
  const q = search.value.trim().toLowerCase();
  let shown = 0;
  cards.forEach(c => {
    const okCat = activeCat === "all" || c.dataset.category === activeCat;
    const okQ = !q || c.textContent.toLowerCase().includes(q);
    c.hidden = !(okCat && okQ);
    if (!c.hidden) { shown++; c.classList.add("in"); }
  });
  empty.hidden = shown > 0;
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
// Solution tiles and footer links jump to a filtered catalogue
$$("[data-filter]").forEach(a => a.addEventListener("click", () => { search.value = ""; setCat(a.dataset.filter); }));

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
  list = cards.filter(c => !c.hidden);
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
$$("[data-open]").forEach(a => a.addEventListener("click", e => {
  const card = cards.find(c => c.dataset.id === a.dataset.open);
  if (card) { e.preventDefault(); openLb(card); }
}));
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
