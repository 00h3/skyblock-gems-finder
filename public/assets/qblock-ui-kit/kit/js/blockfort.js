/* ==========================================================================
   Blockfort UI kit  —  blockfort.js   (no dependencies)

   Declarative (just add attributes):
     data-bf-open="#id"      click → open that modal
     data-bf-close           click → close the modal it sits in
     data-bf-close="#id"     click → close that modal
     data-bf-toggle="#id"    click → open if closed, close if open
     data-bf-static          on a .bf-overlay: backdrop click / Esc won't close it
     data-bf-tabs            container holding .bf-tab[data-bf-pane="#paneId"]
     data-bf-selectable      container whose .bf-slot / .bf-island children can be picked
        data-multiple          → allow several selected at once
     data-bf-toast="text"    click → show a toast
     data-bf-enable / data-bf-disable="#id"   click → enable / disable another element

   Programmatic:
     BF.open('#id') · BF.close('#id') · BF.toggle('#id') · BF.closeAll()
     BF.dialog({ title, message | html, buttons:[{label,value,variant}], closable }) → Promise(value)
     BF.confirm('Sure?', { title, yes, no }) → Promise(boolean)
     BF.toast('Saved', { duration: 2200 })
     BF.setEnabled(el, true|false)       // buttons / slots / islands / tabs
     BF.select(el)                        // select a slot or island programmatically
   Events (bubble from the overlay):  bf:open · bf:close · bf:select · bf:tab
   ========================================================================== */
(function (global) {
  'use strict';

  var stack = [];                 // open overlays, top = last
  var lastFocus = new WeakMap();

  function $(sel, root) { return typeof sel === 'string' ? (root || document).querySelector(sel) : sel; }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function emit(el, name, detail) { el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: detail || {} })); }

  /* ---------- fit to screen ------------------------------------------- */
  function fit(overlay) {
    var wrap = overlay.querySelector('.bf-modal-wrap');
    if (!wrap) return;
    wrap.style.setProperty('--bf-fit', 1);
    var w = wrap.offsetWidth, h = wrap.offsetHeight;
    var k = Math.min(1, (window.innerWidth - 8) / w, (window.innerHeight - 8) / h);
    wrap.style.setProperty('--bf-fit', k.toFixed(4));
  }
  window.addEventListener('resize', function () { stack.forEach(fit); });

  /* ---------- modals ---------------------------------------------------- */
  function resolveOverlay(t) {
    var el = $(t);
    if (!el) return null;
    return el.classList.contains('bf-overlay') ? el : el.closest('.bf-overlay');
  }
  function focusables(root) {
    return $$('a[href],button:not([disabled]):not(.is-disabled),input,select,textarea,[tabindex]:not([tabindex="-1"])', root)
      .filter(function (e) { return e.offsetParent !== null && e.getAttribute('aria-disabled') !== 'true'; });
  }

  function open(target) {
    var ov = resolveOverlay(target);
    if (!ov || ov.classList.contains('is-open')) return ov;
    lastFocus.set(ov, document.activeElement);
    ov.classList.remove('is-closing');
    ov.classList.add('is-open');
    ov.setAttribute('aria-hidden', 'false');
    document.body.classList.add('bf-lock');
    stack.push(ov);
    ov.style.zIndex = 1000 + stack.length * 10;
    fit(ov);
    var dlg = ov.querySelector('[role="dialog"]') || ov;
    var first = ov.querySelector('[data-bf-autofocus]');
    if (!first) { dlg.setAttribute('tabindex', '-1'); first = dlg; }   // no focus ring until the user presses Tab
    first.focus({ preventScroll: true });
    emit(ov, 'bf:open');
    return ov;
  }

  function close(target) {
    var ov = target ? resolveOverlay(target) : stack[stack.length - 1];
    if (!ov || !ov.classList.contains('is-open')) return ov;
    var i = stack.indexOf(ov); if (i > -1) stack.splice(i, 1);
    ov.classList.add('is-closing');
    var done = function () {
      ov.classList.remove('is-open', 'is-closing');
      ov.setAttribute('aria-hidden', 'true');
      if (!stack.length) document.body.classList.remove('bf-lock');
      var f = lastFocus.get(ov); if (f && f.focus) f.focus({ preventScroll: true });
      emit(ov, 'bf:close');
      if (ov.hasAttribute('data-bf-dynamic')) ov.remove();
    };
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    reduce ? done() : setTimeout(done, 140);
    return ov;
  }

  function toggle(target) {
    var ov = resolveOverlay(target);
    return ov && ov.classList.contains('is-open') ? close(ov) : open(ov);
  }
  function closeAll() { stack.slice().reverse().forEach(close); }

  /* ---------- dialogs ---------------------------------------------------- */
  var uid = 0;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function dialog(opts) {
    opts = opts || {};
    var id = 'bf-dlg-' + (++uid);
    var buttons = opts.buttons || [{ label: 'OK', value: true }];
    var closable = opts.closable !== false;
    var ov = document.createElement('div');
    ov.className = 'bf-overlay'; ov.id = id; ov.setAttribute('data-bf-dynamic', '');
    ov.setAttribute('aria-hidden', 'true');
    if (!closable) ov.setAttribute('data-bf-static', '');
    ov.innerHTML =
      '<div class="bf-modal-wrap bf-modal-wrap--board"><div class="bf-modal bf-dialog" role="dialog" aria-modal="true" aria-labelledby="' + id + '-t">' +
        '<div class="bf-dialog__title"><span class="bf-plate bf-plate--title" id="' + id + '-t">' + esc(opts.title || 'Notice') + '</span></div>' +
        (closable ? '<button class="bf-close bf-panel__close" aria-label="Close" data-bf-close></button>' : '') +
        '<div class="bf-dialog__body">' + (opts.html != null ? opts.html : esc(opts.message || '')) + '</div>' +
        '<div class="bf-dialog__actions"></div>' +
      '</div></div>';
    var actions = ov.querySelector('.bf-dialog__actions');
    var result;
    buttons.forEach(function (b, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bf-btn bf-btn--' + (b.variant || 'plain');
      btn.innerHTML = '<span class="bf-btn__label">' + esc(b.label) + '</span>';
      if (i === 0) btn.setAttribute('data-bf-autofocus', '');
      btn.addEventListener('click', function () { result = b.value; close(ov); });
      actions.appendChild(btn);
    });
    document.body.appendChild(ov);
    return new Promise(function (resolve) {
      ov.addEventListener('bf:close', function () { resolve(result); });
      open(ov);
    });
  }

  function confirm(message, o) {
    o = o || {};
    return dialog({
      title: o.title || 'Are you sure?', message: message,
      buttons: [{ label: o.yes || 'Yes', value: true }, { label: o.no || 'Cancel', value: false }]
    }).then(function (v) { return v === true; });
  }

  /* ---------- toast ------------------------------------------------------ */
  function toast(msg, o) {
    o = o || {};
    var box = document.querySelector('.bf-toasts');
    if (!box) { box = document.createElement('div'); box.className = 'bf-toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    var t = document.createElement('div');
    t.className = 'bf-toast'; t.textContent = msg; box.appendChild(t);
    setTimeout(function () { t.classList.add('is-leaving'); setTimeout(function () { t.remove(); }, 220); }, o.duration || 2200);
  }

  /* ---------- enable / disable ------------------------------------------- */
  function setEnabled(el, on) {
    el = $(el); if (!el) return;
    var isSlot = el.classList.contains('bf-slot') || el.classList.contains('bf-island');
    if (isSlot) {
      el.classList.toggle('is-locked', !on);
      on ? el.removeAttribute('aria-disabled') : el.setAttribute('aria-disabled', 'true');
      if (!on) el.classList.remove('is-selected');
    } else {
      el.classList.toggle('is-disabled', !on);
      if ('disabled' in el) el.disabled = !on;
      on ? el.removeAttribute('aria-disabled') : el.setAttribute('aria-disabled', 'true');
    }
  }

  /* ---------- selectable (slots / islands) ------------------------------- */
  function select(el) {
    el = $(el);
    if (!el || el.getAttribute('aria-disabled') === 'true') return;
    var group = el.closest('[data-bf-selectable]');
    var multi = group && group.hasAttribute('data-multiple');
    if (group && !multi) $$('.is-selected', group).forEach(function (s) { s.classList.remove('is-selected'); s.setAttribute('aria-pressed', 'false'); });
    var on = multi ? !el.classList.contains('is-selected') : true;
    el.classList.toggle('is-selected', on);
    el.setAttribute('aria-pressed', on ? 'true' : 'false');
    emit(el, 'bf:select', { element: el, value: el.getAttribute('data-value'), selected: on });
  }

  /* ---------- tabs ------------------------------------------------------- */
  function activateTab(tab) {
    var root = tab.closest('[data-bf-tabs]'); if (!root) return;
    if (tab.getAttribute('aria-disabled') === 'true') return;
    $$('.bf-tab', root).forEach(function (t) {
      var on = t === tab;
      t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1;
      var pane = t.getAttribute('data-bf-pane') && $(t.getAttribute('data-bf-pane'));
      if (pane) pane.classList.toggle('is-active', on);
    });
    emit(tab, 'bf:tab', { tab: tab, pane: tab.getAttribute('data-bf-pane') });
  }

  /* ---------- global delegation ------------------------------------------ */
  document.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-bf-open]')))   { e.preventDefault(); open(t.getAttribute('data-bf-open')); return; }
    if ((t = e.target.closest('[data-bf-toggle]'))) { e.preventDefault(); toggle(t.getAttribute('data-bf-toggle')); return; }
    if ((t = e.target.closest('[data-bf-close]')))  { e.preventDefault(); var v = t.getAttribute('data-bf-close'); close(v ? v : t.closest('.bf-overlay')); return; }
    if ((t = e.target.closest('[data-bf-enable]')))  { setEnabled(t.getAttribute('data-bf-enable'), true); }
    if ((t = e.target.closest('[data-bf-disable]'))) { setEnabled(t.getAttribute('data-bf-disable'), false); }
    if ((t = e.target.closest('[data-bf-toast]')))   { toast(t.getAttribute('data-bf-toast')); }
    if ((t = e.target.closest('.bf-tab')))           { activateTab(t); return; }
    if ((t = e.target.closest('[data-bf-selectable] .bf-slot, [data-bf-selectable] .bf-island'))) { select(t); return; }
    // click on the dark backdrop itself
    if (e.target.classList && e.target.classList.contains('bf-overlay') && !e.target.hasAttribute('data-bf-static')) close(e.target);
    else if (e.target.classList && e.target.classList.contains('bf-modal-wrap')) {
      var ov = e.target.closest('.bf-overlay'); if (ov && !ov.hasAttribute('data-bf-static')) close(ov);
    }
  });

  document.addEventListener('keydown', function (e) {
    var top = stack[stack.length - 1];
    if (e.key === 'Escape' && top && !top.hasAttribute('data-bf-static')) { e.preventDefault(); close(top); return; }
    if (e.key === 'Tab' && top) {                     // focus trap
      var f = focusables(top); if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
    var tab = e.target.closest && e.target.closest('.bf-tab');       // arrow keys on tabs
    if (tab && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      var all = $$('.bf-tab', tab.closest('[data-bf-tabs]')), i = all.indexOf(tab);
      var n = all[(i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length];
      n.focus(); activateTab(n); e.preventDefault();
    }
  });

  /* ---------- init: wire up ARIA on load -------------------------------- */
  function init(root) {
    $$('.bf-overlay', root).forEach(function (o) { if (!o.hasAttribute('aria-hidden')) o.setAttribute('aria-hidden', 'true'); });
    $$('[data-bf-tabs]', root).forEach(function (c) {
      c.setAttribute('role', 'tablist');
      var tabs = $$('.bf-tab', c);
      var active = tabs.filter(function (t) { return t.classList.contains('is-active'); })[0] || tabs[0];
      tabs.forEach(function (t) { t.setAttribute('role', 'tab'); });
      if (active) activateTab(active);
    });
    $$('[data-bf-selectable] .bf-slot, [data-bf-selectable] .bf-island', root).forEach(function (s) {
      if (s.classList.contains('is-locked')) s.setAttribute('aria-disabled', 'true');
      s.setAttribute('aria-pressed', s.classList.contains('is-selected') ? 'true' : 'false');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(document); });
  else init(document);

  global.BF = { open: open, close: close, toggle: toggle, closeAll: closeAll, dialog: dialog, confirm: confirm,
                toast: toast, setEnabled: setEnabled, select: select, init: init };
})(window);
