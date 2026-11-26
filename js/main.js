const REGISTRATION_FORM_URL = "https://forms.gle/5PieX9QA6cerrd3S7";

const CLOSE_PAST_WORKSHOPS = false;

(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
  };

  const markReady = () => { document.body.classList.remove("is-loading", "is-leaving"); document.body.classList.add("is-ready"); };
  if (document.readyState === "complete") markReady(); else window.addEventListener("load", markReady);
  setTimeout(markReady, 2500); 
  window.addEventListener("pageshow", (e) => { if (e.persisted) markReady(); });

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (a.target === "_blank" || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    const samePage = url.pathname === location.pathname;
    if (samePage) return; 
    if (reduceMotion) return;
    e.preventDefault();
    const oc = bootstrap.Offcanvas.getInstance($("#menu"));
    if (oc) oc.hide();
    document.body.classList.remove("is-ready");
    document.body.classList.add("is-leaving");
    setTimeout(() => { location.href = a.href; }, 520);
  });

  $$("[data-form-link]").forEach((a) => { a.href = REGISTRATION_FORM_URL; });
  $$("[data-year]").forEach((n) => { n.textContent = new Date().getFullYear(); });

  const fill = $(".vine-fill");
  const nav = $(".site-nav");
  const onScroll = () => {
    const h = document.documentElement;
    const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    if (fill) fill.style.width = Math.min(100, p * 100) + "%";
    if (nav) nav.classList.toggle("scrolled", h.scrollTop > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const revealEls = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach((el) => io.observe(el));
  } else revealEls.forEach((el) => el.classList.add("in"));

  const counters = $$("[data-count]");
  if (counters.length) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target; cio.unobserve(el);
        const end = +el.dataset.count, suffix = el.dataset.suffix || "";
        if (reduceMotion) { el.textContent = end + suffix; return; }
        const t0 = performance.now(), dur = 1600;
        const tick = (t) => {
          const k = Math.min(1, (t - t0) / dur), eased = 1 - Math.pow(1 - k, 3);
          el.textContent = Math.round(end * eased) + suffix;
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    counters.forEach((c) => cio.observe(c));
  }

  const toastEl = $("#appToast");
  const showToast = (msg) => {
    if (!toastEl) return;
    $(".toast-body", toastEl).textContent = msg;
    bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 4500 }).show();
  };

  $$(".chip[data-filter]").forEach((chip) => chip.addEventListener("click", () => {
    $$(".chip[data-filter]").forEach((c) => { c.classList.remove("active"); c.setAttribute("aria-pressed", "false"); });
    chip.classList.add("active"); chip.setAttribute("aria-pressed", "true");
    const f = chip.dataset.filter;
    $$(".seed-item").forEach((it) => {
      const show = f === "all" || it.dataset.sun.split(" ").includes(f) || it.dataset.type === f;
      it.classList.toggle("hide", !show);
      if (show && !reduceMotion) { it.animate([{ opacity: 0, transform: "scale(.92)" }, { opacity: 1, transform: "none" }], { duration: 350, easing: "ease-out" }); }
    });
  }));

  const seedModalEl = $("#seedModal");
  if (seedModalEl) {
    const seedModal = new bootstrap.Modal(seedModalEl);
    const form = $("#seedForm");
    let mode = "request";
    $$("[data-seed-action]").forEach((btn) => btn.addEventListener("click", () => {
      mode = btn.dataset.seedAction;
      const seed = btn.dataset.seed;
      $("#seedModalTitle").textContent = (mode === "request" ? "Request seeds · " : "Donate seeds · ") + seed;
      $("#seedName").value = seed;
      $("#seedQtyLabel").textContent = mode === "request" ? "How many packets do you need?" : "How many packets can you share?";
      $("#seedSubmit").textContent = mode === "request" ? "Send request" : "Pledge donation";
      form.classList.remove("was-validated");
      seedModal.show();
    }));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.classList.add("was-validated"); return; }
      const rec = Object.fromEntries(new FormData(form)); rec.mode = mode; rec.at = new Date().toISOString();
      store.set("bb_seed_log", [...store.get("bb_seed_log", []), rec]);
      seedModal.hide(); form.reset();
      showToast(mode === "request"
        ? `Thanks, ${rec.fullname.split(" ")[0]}! Your ${rec.seed} request is in. A coordinator will message you about pickup.`
        : `Salamat, ${rec.fullname.split(" ")[0]}! Your ${rec.seed} donation pledge is noted.`);
    });
  }

  const regLog = store.get("bb_workshop_reg", {});
  const todayManila = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date()); // YYYY-MM-DD
  $$(".workshop").forEach((w) => {
    const cap = +w.dataset.cap, id = w.dataset.id;
    const taken = +w.dataset.taken + (regLog[id] || 0);
    const left = Math.max(0, cap - taken);
    const past = CLOSE_PAST_WORKSHOPS && w.dataset.iso < todayManila;
    $(".slots-text", w).textContent = past ? "Session completed" : left ? `${left} of ${cap} seats left` : "Fully booked";
    const btn = $("[data-workshop]", w);
    if (past) { btn.disabled = true; btn.textContent = "Closed"; w.classList.add("is-past"); }
    else if (!left) { btn.disabled = true; btn.textContent = "Full"; }
    requestAnimationFrame(() => setTimeout(() => { $(".slot-bar i", w).style.width = Math.min(100, (taken / cap) * 100) + "%"; }, 400));
  });
  const wsModalEl = $("#workshopModal");
  if (wsModalEl) {
    const wsModal = new bootstrap.Modal(wsModalEl);
    const form = $("#workshopForm");
    let current = null;
    $$("[data-workshop]").forEach((btn) => btn.addEventListener("click", () => {
      current = btn.closest(".workshop");
      $("#workshopDate").textContent = current.dataset.date;
      $("#workshopId").value = current.dataset.id;
      form.classList.remove("was-validated");
      wsModal.show();
    }));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.classList.add("was-validated"); return; }
      const rec = Object.fromEntries(new FormData(form));
      const id = current.dataset.id;
      const log = store.get("bb_workshop_reg", {}); log[id] = (log[id] || 0) + 1; store.set("bb_workshop_reg", log);
      const left = Math.max(0, +current.dataset.cap - (+current.dataset.taken + log[id]));
      $(".slots-text", current).textContent = left ? `${left} of ${current.dataset.cap} seats left` : "Fully booked";
      $(".slot-bar i", current).style.width = Math.min(100, ((+current.dataset.taken + log[id]) / +current.dataset.cap) * 100) + "%";
      if (!left) { const b = $("[data-workshop]", current); b.disabled = true; b.textContent = "Full"; }
      wsModal.hide(); form.reset();
      showToast(`You're in, ${rec.fullname.split(" ")[0]}! See you on ${current.dataset.date}. Bring a clean fabric scrap if you have one.`);
    });
  }

  const wishes = $$(".wish input");
  if (wishes.length) {
    const saved = store.get("bb_wish", []);
    wishes.forEach((cb, i) => {
      cb.checked = saved.includes(i);
      cb.addEventListener("change", () => {
        store.set("bb_wish", wishes.map((c, j) => (c.checked ? j : -1)).filter((j) => j >= 0));
        if (cb.checked) showToast("Marked as something you'll bring. Drop-off is at the Botanical Garden office.");
      });
    });
  }

  const lbEl = $("#lightbox");
  if (lbEl) {
    const lb = new bootstrap.Modal(lbEl);
    $$(".gal-grid button").forEach((b) => b.addEventListener("click", () => {
      const img = $("img", b); const big = $(".lightbox-img", lbEl);
      big.src = img.src; big.alt = img.alt; lb.show();
    }));
  }

  const tabs = $$(".track-tabs a");
  if (tabs.length && "IntersectionObserver" in window) {
    const map = new Map(tabs.map((t) => [t.getAttribute("href").slice(1), t]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { tabs.forEach((t) => t.classList.remove("active")); map.get(en.target.id)?.classList.add("active"); }
      });
    }, { rootMargin: "-35% 0px -55% 0px" });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }

  $$(".t-card").forEach((card) => {
    const q = $(".q", card), btn = $(".more", card);
    if (!q || !btn) return;
    btn.addEventListener("click", () => {
      const open = q.classList.toggle("open");
      btn.textContent = open ? "Show less" : "Read more";
      btn.setAttribute("aria-expanded", open);
    });
  });

  const hours = $(".hrs");
  if (hours) {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", weekday: "short", hour: "numeric", hour12: false }).formatToParts(new Date());
    const day = parts.find((p) => p.type === "weekday").value;
    const hr = +parts.find((p) => p.type === "hour").value % 24;
    const sched = { Mon: null, Tue: [8, 17], Wed: [8, 17], Thu: [8, 17], Fri: [8, 17], Sat: [7, 16], Sun: [7, 16] };
    $$(`[data-days~="${day}"]`, hours).forEach((r) => r.classList.add("today"));
    const pill = $("#openNow"); const s = sched[day];
    if (pill) {
      const open = s && hr >= s[0] && hr < s[1];
      pill.classList.add(open ? "is-open" : "is-closed");
      pill.textContent = open ? "Open now" : "Closed right now";
    }
  }
})();
