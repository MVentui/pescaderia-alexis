'use strict';

const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const METHODS = ['Efectivo', 'Transferencia', 'Tarjeta'];
const me = sessionUser;

function toast(msg, type = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + type; t.textContent = msg;
  $('#toast-root').appendChild(t);
  setTimeout(() => t.remove(), 3800);
}

function modal(title, body, buttons = [], opts = {}) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true">
    <div class="modal-head"><h3>${title}</h3><button class="x" data-close aria-label="Cerrar">×</button></div>
    <div class="modal-body">${body}</div>${buttons.length ? '<div class="modal-foot"></div>' : ''}</div>`;
  const close = () => ov.remove();
  const foot = $('.modal-foot', ov);
  buttons.forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'btn ' + (b.cls || ''); btn.textContent = b.label;
    btn.onclick = () => { if (!b.fn) return close(); if (b.fn(ov, close) !== false) close(); };
    foot.appendChild(btn);
  });
  ov.addEventListener('mousedown', e => { if (e.target === ov || e.target.hasAttribute('data-close')) close(); });
  $('#modal-root').appendChild(ov);
  const first = $('input:not([type=radio]),select,textarea', ov); if (first) first.focus();
  return { el: ov, close };
}

function confirmBox(title, msg, okLabel, fn, danger = false) {
  modal(title, `<p>${msg}</p>`, [{ label: 'Cancelar' }, { label: okLabel, cls: danger ? 'danger' : 'primary', fn }]);
}

const field = (id, label, input, hint = '') =>
  `<div class="field"><label for="${id}">${label}</label>${input}${hint ? `<div class="hint">${hint}</div>` : ''}<div class="err" data-err="${id}"></div></div>`;
function setErr(root, id, msg) {
  const slot = $(`[data-err="${id}"]`, root); if (slot) slot.textContent = msg || '';
  const el = $('#' + id, root); if (el) el.classList.toggle('invalid', !!msg);
}
function clearErrs(root) { $$('[data-err]', root).forEach(s => (s.textContent = '')); $$('.invalid', root).forEach(e => e.classList.remove('invalid')); }
const options = (arr, sel) => arr.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${esc(l)}</option>`).join('');

function pageHead(n, cu, title, sub, right = '') {
  return `<div class="page-head"><div><h1>${title}</h1><p>${sub}</p></div><div class="head-actions no-print">${right}</div></div>`;
}
const priceLbl = p => `${money(p.price)} <small>/ ${unitShort(p)}</small>`;
const userName = id => (userById(id) ? userById(id).name : '—');

function route() { const h = location.hash.replace(/^#\/?/, ''); const [name, ...args] = h.split('/'); return { name: name || '', args }; }
function go(name, ...args) {
  const h = '#/' + [name, ...args].join('/');
  if (location.hash === h) render(); else location.hash = h;
}
window.addEventListener('hashchange', render);

const NAV = {
  Vendedor: [
    [null, [['panel', 'Panel principal']]],
    ['Ventas', [['pos', 'Punto de venta'], ['pedidos', 'Pedidos']]],
    ['Caja', [['caja', 'Caja del día']]],
    ['Inventario', [['catalogo', 'Catálogo'], ['alertas', 'Alertas de stock']]],
  ],
  Administrador: [
    [null, [['panel', 'Panel principal']]],
    ['Ventas', [['pedidos', 'Pedidos'], ['caja', 'Caja del día'], ['catalogo', 'Catálogo']]],
    ['Inventario', [['productos', 'Productos'], ['categorias', 'Categorías'], ['proveedores', 'Proveedores'], ['ordenes-compra', 'Órdenes de compra'], ['compras', 'Compras'], ['movstock', 'Movimientos de stock'], ['control', 'Control de stock'], ['alertas', 'Alertas de stock']]],
    ['Finanzas', [['movcaja', 'Movimientos de caja'], ['reportes', 'Reportes']]],
    ['Administración', [['usuarios', 'Usuarios y roles'], ['auditoria', 'Auditoría']]],
  ],
};
const ACTIVE_ALIAS = { comprobante: 'pedidos', confirmar: 'carrito' };

function userChip(u) {
  return `<div class="user-chip"><div class="avatar">${esc(initials(u.name))}</div><div class="who">${esc(u.name)}<small>${u.role}</small></div></div>`;
}
function logout() { sessionStorage.removeItem(SESSION_KEY); go(''); }

function clientShell(u, active) {
  const cartN = (db.carts[u.id] || []).length;
  const link = (r, l) => `<a href="#/${r}" class="${active === r ? 'active' : ''}">${l}</a>`;
  return `<header class="client-top no-print">
      <div class="brand"><div class="logo">🐟</div><div><b>Pescadería Alexis</b><small>Pedidos online</small></div></div>
      <nav class="client-nav">${link('catalogo', 'Catálogo')}${link('carrito', `Mi carrito (${cartN})`)}${link('mis-pedidos', 'Mis pedidos')}</nav>
      <div class="user-chip">${userChip(u)}<button class="btn sm" id="btn-logout">Salir</button></div>
    </header><main class="client-main" id="view"></main>`;
}

function staffShell(u, active) {
  const alerts = pendingAlerts().length;
  const groups = (NAV[u.role] || []).map(([title, links]) => `<div class="nav-group">${title ? `<div class="nav-title">${title.toUpperCase()}</div>` : ''}
    ${links.map(([r, l]) => `<a class="nav-link ${active === r ? 'active' : ''}" href="#/${r}">${l}${r === 'alertas' && alerts ? `<span class="nav-badge">${alerts}</span>` : ''}</a>`).join('')}</div>`).join('');
  return `<div class="staff"><aside class="sidebar no-print">
      <div class="brand"><div class="logo">🐟</div><div><b>Pescadería Alexis</b><small>Gestión interna</small></div></div>
      ${groups}<div class="side-foot"><a id="btn-logout" href="#">Cerrar sesión</a></div></aside>
    <div class="staff-main"><div class="staff-top no-print"><span>${u.role}</span>${userChip(u)}</div><main class="staff-content" id="view"></main></div></div>`;
}

function render() {
  const app = $('#app'); const u = me(); const r = route();
  if (!u) { if (r.name === 'registro') viewRegister(app); else viewLogin(app); return; }
  const v = VIEWS[r.name];
  const def = u.role === 'Cliente' ? 'catalogo' : 'panel';
  if (!v || !v.roles.includes(u.role)) { go(def); return; }
  const active = ACTIVE_ALIAS[r.name] || r.name;
  app.innerHTML = u.role === 'Cliente' ? clientShell(u, active) : staffShell(u, active);
  $('#btn-logout').onclick = e => { e.preventDefault(); logout(); };
  v.fn($('#view'), r.args);
}

function authLayout(inner) {
  return `<div class="auth-split">
    <section class="auth-hero">
      <div class="hero-inner">
        <div class="brand brand-lg"><div class="logo">🐟</div><div><b>Pescadería Alexis</b><small>Toda la confianza</small></div></div>
        <h1 class="hero-title">Del mar a tu mesa, <span>siempre fresco</span>.</h1>
        <p class="hero-sub">Pescados y mariscos de primera calidad. Armá tu pedido online y retiralo en el local, o pasá por el mostrador.</p>
        <ul class="hero-points">
          <li><span class="ico">${CHECK}</span>Pescado fresco todos los días</li>
          <li><span class="ico">${CHECK}</span>Pedidos online, sin hacer fila</li>
          <li><span class="ico">${CHECK}</span>Seguimiento de tu pedido paso a paso</li>
        </ul>
      </div>
      <svg class="hero-wave" viewBox="0 0 800 160" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 90 C120 40 240 140 400 90 S680 40 800 90 V160 H0Z" fill="rgba(26,95,122,.15)"/>
        <path d="M0 122 C140 72 260 160 420 116 S700 72 800 122 V160 H0Z" fill="rgba(217,56,30,.15)"/>
      </svg>
    </section>
    <section class="auth-panel"><div class="auth-box">${inner}
      <p class="auth-copy">© ${new Date().getFullYear()} Pescadería Alexis. Todos los derechos reservados.</p></div></section>
  </div>`;
}

const passField = (id, label, auto) => field(id, label, `<div class="pass-wrap"><input id="${id}" type="password" autocomplete="${auto}" placeholder="••••••••"><button type="button" class="pass-toggle" data-toggle="${id}">Mostrar</button></div>`);
function bindPassToggles(app) {
  $$('[data-toggle]', app).forEach(b => b.onclick = () => {
    const i = $('#' + b.dataset.toggle, app), show = i.type === 'password';
    i.type = show ? 'text' : 'password'; b.textContent = show ? 'Ocultar' : 'Mostrar';
  });
}

function viewLogin(app) {
  app.innerHTML = authLayout(`
    <h2>Bienvenido</h2><p class="sub">Ingresá con tu cuenta para hacer tu pedido o gestionar el local.</p>
    <form id="login-form" novalidate>
      ${field('l-email', 'Email', '<input id="l-email" type="email" placeholder="tu@email.com" autocomplete="username">')}
      ${passField('l-pass', 'Contraseña', 'current-password')}
      <div class="err" data-err="l-general" style="margin:-4px 0 10px"></div>
      <button class="btn primary block" type="submit">Ingresar</button>
    </form>
    <p class="auth-bottom">¿Todavía no tenés cuenta? <a href="#/registro">Crear cuenta</a></p>`);
  bindPassToggles(app);
  $('#login-form', app).onsubmit = e => {
    e.preventDefault(); clearErrs(app);
    const email = $('#l-email', app).value, pass = $('#l-pass', app).value;
    if (!email.trim()) return setErr(app, 'l-email', 'Ingresá tu email.');
    if (!pass) return setErr(app, 'l-pass', 'Ingresá tu contraseña.');
    const r = validateCredentials(email, pass);
    if (!r.ok) return setErr(app, 'l-general', r.error === 'inactiva' ? 'Tu cuenta está desactivada. Contactá al administrador.' : 'Email o contraseña incorrectos.');
    sessionStorage.setItem(SESSION_KEY, r.user.id);
    go(r.user.role === 'Cliente' ? 'catalogo' : 'panel');
  };
}

function viewRegister(app) {
  app.innerHTML = authLayout(`
    <h2>Crear cuenta</h2><p class="sub">Con tu cuenta podés hacer pedidos y seguirlos.</p>
    <form id="reg-form" novalidate>
      ${field('r-name', 'Nombre y apellido', '<input id="r-name" autocomplete="name">')}
      ${field('r-email', 'Email', '<input id="r-email" type="email" placeholder="tu@email.com" autocomplete="email">')}
      ${field('r-phone', 'Teléfono', '<input id="r-phone" type="tel" autocomplete="tel">')}
      ${passField('r-pass', 'Contraseña (mínimo 8 caracteres)', 'new-password')}
      <button class="btn primary block" type="submit">Registrarme</button>
    </form>
    <p class="auth-bottom">¿Ya tenés cuenta? <a href="#/">Iniciar sesión</a></p>`);
  bindPassToggles(app);
  $('#reg-form', app).onsubmit = e => {
    e.preventDefault(); clearErrs(app);
    const v = id => $('#' + id, app).value.trim();
    const name = v('r-name'), email = v('r-email'), phone = v('r-phone'), pass = $('#r-pass', app).value;
    let missing = false;
    [['r-name', name], ['r-email', email], ['r-phone', phone], ['r-pass', pass]].forEach(([id, val]) => { if (!val) { setErr(app, id, 'Completá este campo.'); missing = true; } });
    if (missing) return;
    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) return setErr(app, 'r-email', 'Ya existe una cuenta con ese email.');
    if (pass.length < 8) return setErr(app, 'r-pass', 'La contraseña debe tener al menos 8 caracteres.');
    db.users.push({ id: nextId(db.users), name, email, phone, role: 'Cliente', active: true, pass: hash(pass), created: new Date().toISOString() });
    save(); toast('Cuenta creada. Ya podés iniciar sesión.'); go('');
  };
}

function addToCartModal(p, done) {
  const u = me(); const cart = (db.carts[u.id] = db.carts[u.id] || []);
  const inCart = (cart.find(i => i.productId === p.id) || { qty: 0 }).qty;
  modal('Agregar al carrito', `<div style="display:flex;gap:12px;align-items:center;margin-bottom:12px"><img src="${p.img || 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=200&q=80'}" style="width:50px;height:50px;object-fit:cover;border-radius:8px"><div><b>${esc(p.name)}</b><br>${priceLbl(p)}</div></div>
    ${field('c-qty', `Cantidad (${p.unit === 'Kilo' ? 'kilos' : 'unidades'})`, `<input id="c-qty" inputmode="decimal" value="1">`, `Disponible: ${qtyTxt(p, p.stock)}`)}`,
    [{ label: 'Cancelar' }, {
      label: 'Agregar', cls: 'primary', fn: ov => {
        clearErrs(ov); const q = parseNum($('#c-qty', ov).value);
        if (!(q > 0)) { setErr(ov, 'c-qty', 'Ingresá una cantidad mayor a cero.'); return false; }
        if (p.unit === 'Unidad' && !Number.isInteger(q)) { setErr(ov, 'c-qty', 'La cantidad debe ser un número entero.'); return false; }
        if (q + inCart > p.stock + 1e-9) { setErr(ov, 'c-qty', `No hay suficiente stock. Disponible: ${num(p.stock - inCart)}.`); return false; }
        const line = cart.find(i => i.productId === p.id);
        if (line) line.qty = Math.round((line.qty + q) * 1000) / 1000; else cart.push({ productId: p.id, qty: q });
        save(); toast('Agregado al carrito'); done();
      }
    }]);
}

function viewCatalog(root) {
  const staff = me().role !== 'Cliente';
  let q = '', cat = 0;
  root.innerHTML = pageHead(3, 'CU-03', 'Catálogo de productos', staff ? 'Productos activos con su stock exacto.' : 'Elegí tus productos y armá tu pedido.') +
    `<div class="toolbar"><div class="field grow"><input id="cq" placeholder="Buscar por nombre o código"></div></div><div class="chips" id="cchips"></div><div class="grid-products" id="cgrid"></div>`;
  function chips() {
    $('#cchips', root).innerHTML = [`<button class="chip ${cat === 0 ? 'active' : ''}" data-cat="0">Todos</button>`].concat(db.categories.map(c => `<button class="chip ${cat === c.id ? 'active' : ''}" data-cat="${c.id}">${esc(c.name)}</button>`)).join('');
  }
  function grid() {
    const list = db.products.filter(p => p.active && (!cat || p.catId === cat) && (p.name + ' ' + p.code).toLowerCase().includes(q.toLowerCase()));
    $('#cgrid', root).innerHTML = list.length ? list.map(p => {
      const off = p.stock <= 0;
      const badge = staff ? (off ? '<span class="badge danger">Sin stock</span>' : `<span class="badge ${p.stock <= p.min ? 'warn' : 'ok'}">Quedan ${qtyTxt(p, p.stock)}</span>`)
        : (off ? '<span class="badge danger">Sin stock</span>' : '<span class="badge ok">Disponible</span>');
      const imgUrl = p.img || 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=400&q=80';
      return `<div class="pcard ${off ? 'off' : ''}"><div style="height:110px;border-radius:8px;overflow:hidden;margin-bottom:6px;background:#e2e8f0"><img src="${imgUrl}" alt="${esc(p.name)}" style="width:100%;height:100%;object-fit:cover"></div>
        <button class="pname" data-detail="${p.id}">${esc(p.name)}</button><div class="sub-code">${esc(catName(p.catId))} · ${p.code}</div>
        <div class="pprice">${priceLbl(p)}</div>${badge}
        ${staff ? '' : `<button class="btn primary" data-add="${p.id}" ${off ? 'disabled' : ''}>Agregar</button>`}</div>`;
    }).join('') : '<div class="empty" style="grid-column:1/-1">No hay productos que coincidan con la búsqueda.</div>';
  }
  chips(); grid();
  $('#cq', root).oninput = e => { q = e.target.value; grid(); };
  root.onclick = e => {
    const c = e.target.closest('[data-cat]'); if (c) { cat = +c.dataset.cat; chips(); grid(); return; }
    const a = e.target.closest('[data-add]'); if (a) { addToCartModal(prod(+a.dataset.add), () => render()); return; }
    const d = e.target.closest('[data-detail]');
    if (d) {
      const p = prod(+d.dataset.detail);
      const imgUrl = p.img || 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=400&q=80';
      modal(esc(p.name), `<div style="text-align:center;margin-bottom:12px"><img src="${imgUrl}" style="max-height:160px;border-radius:10px;object-fit:cover"></div><p class="muted">${esc(catName(p.catId))} · ${p.code}</p><br><p>${esc(p.desc || 'Sin descripción.')}</p><br>
        <div class="summary-box"><div class="kv"><span>Precio</span><b>${priceLbl(p)}</b></div>
        <div class="kv"><span>Unidad de venta</span><b>${p.unit}</b></div>
        <div class="kv"><span>Disponibilidad</span><b>${staff ? qtyTxt(p, p.stock) : (p.stock > 0 ? 'Disponible' : 'Sin stock')}</b></div></div>`,
        [{ label: 'Cerrar' }].concat(!staff && p.stock > 0 ? [{ label: 'Agregar', cls: 'primary', fn: () => { setTimeout(() => addToCartModal(p, () => render()), 0); } }] : []));
    }
  };
}

function viewCart(root) {
  const u = me(); const cart = (db.carts[u.id] = db.carts[u.id] || []);
  const total = cart.reduce((s, i) => s + i.qty * prod(i.productId).price, 0);
  root.innerHTML = pageHead(4, 'CU-04', 'Mi carrito', 'Cambiá cantidades o quitá productos. El stock se descuenta al confirmar el pedido.', cart.length ? '<button class="btn" data-act="empty">Vaciar carrito</button>' : '') +
    (cart.length ? `<div class="card table-wrap"><table><thead><tr><th>Producto</th><th class="num">Precio</th><th>Cantidad</th><th class="num">Subtotal</th><th></th></tr></thead><tbody>
      ${cart.map(i => { const p = prod(i.productId); return `<tr><td><div style="display:flex;align-items:center;gap:10px"><img src="${p.img || ''}" style="width:36px;height:36px;object-fit:cover;border-radius:6px"><div><b>${esc(p.name)}</b><div class="sub-code">${esc(catName(p.catId))}</div></div></div></td><td class="num">${money(p.price)} / ${unitShort(p)}</td>
        <td style="width:150px"><div style="display:flex;gap:6px;align-items:center"><input data-qty="${p.id}" value="${num(i.qty)}" style="width:80px"> ${unitShort(p)}</div></td>
        <td class="num"><b>${money(i.qty * p.price)}</b></td><td><a data-rm="${p.id}">Quitar</a></td></tr>`; }).join('')}</tbody></table></div>
      <div style="display:flex;justify-content:flex-end;align-items:center;gap:16px;margin-top:14px"><span>Total: <b style="font-size:22px">${money(total)}</b></span><button class="btn primary" data-act="next">Continuar con el pedido</button></div>`
      : `<div class="card empty">Tu carrito está vacío.<br><br><a href="#/catalogo">Ir al catálogo</a></div>`);
  root.onclick = e => {
    const rm = e.target.closest('[data-rm]');
    if (rm) { db.carts[u.id] = cart.filter(i => i.productId !== +rm.dataset.rm); save(); render(); return; }
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'empty') confirmBox('Vaciar carrito', '¿Querés quitar todos los productos del carrito?', 'Vaciar', () => { db.carts[u.id] = []; save(); render(); }, true);
    if (a.dataset.act === 'next') { if (!cart.length) return toast('Agregá al menos un producto.', 'error'); go('confirmar'); }
  };
  root.onchange = e => {
    const el = e.target.closest('[data-qty]'); if (!el) return;
    const p = prod(+el.dataset.qty), line = cart.find(i => i.productId === p.id), q = parseNum(el.value);
    if (!(q > 0)) toast('Ingresá una cantidad mayor a cero.', 'error');
    else if (p.unit === 'Unidad' && !Number.isInteger(q)) toast('La cantidad debe ser un número entero.', 'error');
    else if (q > p.stock + 1e-9) toast(`No hay suficiente stock. Disponible: ${num(p.stock)}.`, 'error');
    else { line.qty = q; save(); }
    render();
  };
}

function viewConfirm(root) {
  const u = me(); const cart = db.carts[u.id] || [];
  const total = cart.reduce((s, i) => s + i.qty * prod(i.productId).price, 0);
  root.innerHTML = pageHead(5, 'CU-05', 'Confirmar pedido', 'Revisá el resumen y elegí cómo vas a pagar.') +
    `<div class="two-col" style="grid-template-columns:1fr 1fr"><div class="card"><h3>Resumen</h3>
      ${cart.map(i => { const p = prod(i.productId); return `<div class="alert-row"><div><b>${esc(p.name)}</b><small>${qtyTxt(p, i.qty)} × ${money(p.price)}</small></div><b>${money(i.qty * p.price)}</b></div>`; }).join('') || '<div class="empty">Agregá al menos un producto.</div>'}
      <div class="total-row"><b>Total</b><b>${money(total)}</b></div></div>
    <div class="card"><h3>Método de pago</h3>
      ${METHODS.map(m => `<label class="radio"><input type="radio" name="pay" value="${m}"> ${m}</label>`).join('')}
      <div class="err" data-err="pay"></div><br>
      ${field('c-notes', 'Observaciones (opcional)', '<textarea id="c-notes" placeholder="Ej.: limpiar y filetear, retiro a las 18 h"></textarea>')}
      <div style="display:flex;gap:8px"><button class="btn" data-act="back">Volver al carrito</button><button class="btn primary" data-act="ok">Confirmar pedido</button></div></div></div>`;
  root.onclick = e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'back') return go('carrito');
    clearErrs(root);
    if (!cart.length) return toast('Agregá al menos un producto.', 'error');
    const pay = $('input[name=pay]:checked', root);
    if (!pay) return setErr(root, 'pay', 'Elegí un método de pago.');
    const r = createOrder({ channel: 'Web', clientId: u.id, sellerId: null, items: cart.map(i => ({ ...i })), method: pay.value, notes: $('#c-notes', root).value.trim() });
    if (!r.ok) { toast(r.error, 'error'); return go('carrito'); }
    db.carts[u.id] = []; save();
    modal('¡Pedido confirmado!', `<p>Tu pedido quedó registrado en estado <b>Pendiente</b>.</p><br><div class="summary-box"><div class="kv"><span>Número de pedido</span><b>${r.order.number}</b></div><div class="kv"><span>Total</span><b>${money(r.order.total)}</b></div></div>`,
      [{ label: 'Ver mis pedidos', cls: 'primary', fn: () => go('mis-pedidos') }]);
    go('mis-pedidos');
  };
}

function timelineHtml(o) {
  return `<ol class="timeline">${o.history.map(h => `<li>${statusBadge(h.status)}<small>${fmtDT(h.date)}${h.userId ? ' · ' + esc(userName(h.userId)) : ''}${h.obs ? ' · ' + esc(h.obs) : ''}</small></li>`).join('')}</ol>`;
}

function orderItemsHtml(o) {
  return `<div class="table-wrap"><table><thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Subtotal</th></tr></thead><tbody>
    ${o.items.map(i => `<tr><td>${esc(i.name)}</td><td class="num">${num(i.qty)} ${i.unit === 'Kilo' ? 'kg' : 'u'}</td><td class="num">${money(i.qty * i.price)}</td></tr>`).join('')}
    <tr><td><b>Total</b></td><td></td><td class="num"><b>${money(o.total)}</b></td></tr></tbody></table></div>`;
}

function viewMyOrders(root) {
  const u = me();
  const list = db.orders.filter(o => o.userId === u.id).sort((a, b) => b.date.localeCompare(a.date));
  root.innerHTML = pageHead(6, 'CU-06', 'Mis pedidos', 'Seguí el estado de cada pedido.') +
    (list.length ? `<div class="card table-wrap"><table><thead><tr><th>Pedido</th><th>Fecha</th><th class="num">Total</th><th>Estado</th></tr></thead><tbody>
      ${list.map(o => `<tr class="click" data-o="${o.id}"><td><b>${o.number}</b></td><td>${fmtDT(o.date)}</td><td class="num">${money(o.total)}</td><td>${statusBadge(o.status)}</td></tr>`).join('')}</tbody></table></div>`
      : '<div class="card empty">Todavía no hiciste ningún pedido.</div>');
  root.onclick = e => {
    const r = e.target.closest('[data-o]'); if (!r) return;
    const o = db.orders.find(x => x.id === +r.dataset.o);
    modal(`Pedido ${o.number}`, `<p class="muted">Pago: ${o.method}${o.notes ? ' · ' + esc(o.notes) : ''}</p><br>${orderItemsHtml(o)}<br><h3>Estados</h3>${timelineHtml(o)}`, [{ label: 'Cerrar' }], { wide: true });
  };
}

const pos = { items: [], pay: 'Efectivo', received: '', cat: 0, q: '' };
const posTotal = () => pos.items.reduce((s, i) => s + i.qty * prod(i.productId).price, 0);

function viewPos(root) {
  root.innerHTML = pageHead(7, 'CU-07', 'Punto de venta', 'Registrá ventas que el cliente retira en el local.') +
    `<div id="pos-warn"></div><div class="pos"><aside class="card pos-cart" id="pos-cart"></aside>
    <section><div class="toolbar"><div class="field grow"><input id="pos-q" placeholder="Buscar por nombre o código" value="${esc(pos.q)}"></div></div><div class="chips" id="pos-chips"></div><div class="grid-pos" id="pos-grid"></div></section></div>`;

  function warn() {
    $('#pos-warn', root).innerHTML = db.caja ? '' : '<div class="alert warn">Abrí la caja para registrar ventas. <button class="btn primary sm" data-act="to-caja">Ir a Caja</button></div>';
  }
  function cart() {
    const total = posTotal(), recv = parseNum(pos.received);
    $('#pos-cart', root).innerHTML = `<h3>Venta actual</h3>
      ${pos.items.length ? pos.items.map(i => { const p = prod(i.productId); return `<div class="line"><div><b>${esc(p.name)}</b><div class="sub-code">${priceLbl(p)}</div></div>
        <input data-q="${p.id}" value="${num(i.qty)}" aria-label="Cantidad"><b class="right">${money(i.qty * p.price)}</b><button class="x" data-rm="${p.id}" aria-label="Quitar">×</button></div>`; }).join('') : '<div class="empty">Agregá productos desde la derecha.</div>'}
      <div class="total-row"><b>Total</b><b>${money(total)}</b></div>
      ${field('pos-pay', 'Método de pago', `<select id="pos-pay">${options(METHODS.map(m => [m, m]), pos.pay)}</select>`)}
      ${pos.pay === 'Efectivo' ? `${field('pos-recv', 'Monto recibido', `<input id="pos-recv" inputmode="decimal" value="${esc(pos.received)}">`)}<div class="muted" style="margin:-6px 0 10px">Vuelto: <b class="pos-amount" id="pos-change">${recv > 0 ? money(Math.max(0, recv - total)) : '—'}</b></div>` : ''}
      <div class="err" id="pos-err" style="margin-bottom:8px"></div>
      <button class="btn primary block" data-act="confirm">Confirmar venta</button>`;
  }
  function chips() {
    $('#pos-chips', root).innerHTML = `<button class="chip ${pos.cat === 0 ? 'active' : ''}" data-cat="0">Todos</button>` + db.categories.map(c => `<button class="chip ${pos.cat === c.id ? 'active' : ''}" data-cat="${c.id}">${esc(c.name)}</button>`).join('');
  }
  function grid() {
    const list = db.products.filter(p => p.active && (!pos.cat || p.catId === pos.cat) && (p.name + ' ' + p.code).toLowerCase().includes(pos.q.toLowerCase()));
    $('#pos-grid', root).innerHTML = list.map(p => {
      const off = p.stock <= 0;
      return `<button class="pos-item" data-add="${p.id}" ${off ? 'disabled' : ''}><div style="width:100%;height:60px;overflow:hidden;border-radius:6px;margin-bottom:4px"><img src="${p.img || ''}" style="width:100%;height:100%;object-fit:cover"></div><b>${esc(p.name)}</b><span class="sub-code">${p.code}</span><span class="pp">${money(p.price)} / ${unitShort(p)}</span>
        ${off ? '<span class="badge danger">Sin stock</span>' : `<span class="badge ${p.stock <= p.min ? 'warn' : 'ok'}">Quedan ${qtyTxt(p, p.stock)}</span>`}</button>`;
    }).join('') || '<div class="empty" style="grid-column:1/-1">No hay productos que coincidan con la búsqueda.</div>';
  }
  const posErr = m => { $('#pos-err', root).textContent = m || ''; };
  warn(); cart(); chips(); grid();

  root.oninput = e => {
    if (e.target.id === 'pos-q') { pos.q = e.target.value; grid(); }
    if (e.target.id === 'pos-recv') { pos.received = e.target.value; const r = parseNum(pos.received); $('#pos-change', root).textContent = r > 0 ? money(Math.max(0, r - posTotal())) : '—'; }
  };
  root.onchange = e => {
    if (e.target.id === 'pos-pay') { pos.pay = e.target.value; cart(); return; }
    const qi = e.target.closest('[data-q]'); if (!qi) return;
    const p = prod(+qi.dataset.q), line = pos.items.find(i => i.productId === p.id), q = parseNum(qi.value);
    if (!(q > 0)) posErr('Ingresá una cantidad mayor a cero.');
    else if (p.unit === 'Unidad' && !Number.isInteger(q)) posErr('La cantidad debe ser un número entero.');
    else if (q > p.stock + 1e-9) posErr(`La cantidad supera el stock disponible: ${num(p.stock)}.`);
    else { line.qty = q; cart(); return; }
    qi.value = num(line.qty);
  };
  root.onclick = e => {
    const c = e.target.closest('[data-cat]'); if (c) { pos.cat = +c.dataset.cat; chips(); grid(); return; }
    const add = e.target.closest('[data-add]');
    if (add) {
      const p = prod(+add.dataset.add), line = pos.items.find(i => i.productId === p.id);
      if ((line ? line.qty : 0) + 1 > p.stock + 1e-9) return posErr(`La cantidad supera el stock disponible: ${num(p.stock)}.`);
      if (line) line.qty += 1; else pos.items.push({ productId: p.id, qty: 1 });
      posErr(); cart(); return;
    }
    const rm = e.target.closest('[data-rm]'); if (rm) { pos.items = pos.items.filter(i => i.productId !== +rm.dataset.rm); cart(); return; }
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'to-caja') return go('caja');
    if (a.dataset.act === 'confirm') {
      posErr();
      if (!db.caja) return posErr('Abrí la caja para registrar ventas.');
      if (!pos.items.length) return posErr('Agregá al menos un producto a la venta.');
      const total = posTotal(), recv = parseNum(pos.received);
      if (pos.pay === 'Efectivo' && pos.received.trim() && recv < total) return posErr('El monto recibido es menor al total.');
      const r = createOrder({ channel: 'Mostrador', clientId: null, sellerId: me().id, items: pos.items.map(i => ({ ...i })), method: pos.pay, notes: '' });
      if (!r.ok) return posErr(r.error);
      pos.items = []; pos.received = '';
      toast('Venta registrada ' + r.order.number);
      go('comprobante', r.order.id);
    }
  };
}

function viewReceipt(root, args) {
  const o = db.orders.find(x => x.id === +args[0]);
  if (!o) return go('pedidos');
  const lastStaff = [...o.history].reverse().find(h => h.userId && userById(h.userId) && userById(h.userId).role !== 'Cliente');
  root.innerHTML = pageHead(8, 'CU-08', 'Comprobante de venta', 'Comprobante interno. No es válido como factura.',
    '<button class="btn" data-act="back">Volver</button><button class="btn" data-act="print">Imprimir</button><button class="btn primary" data-act="pdf">Descargar PDF</button>') +
    `<div class="receipt"><h4>PESCADERÍA ALEXIS</h4><div class="c">Comprobante interno</div><hr>
      <div class="kv"><span>N°</span><b>${o.number}</b></div><div class="kv"><span>Fecha</span><span>${fmtDT(o.date)}</span></div>
      <div class="kv"><span>Canal</span><span>${o.channel}</span></div><div class="kv"><span>Atendió</span><span>${lastStaff ? esc(userName(lastStaff.userId)) : '—'}</span></div>
      <div class="kv"><span>Pago</span><span>${o.method}</span></div><hr>
      ${o.items.map(i => `<div class="it"><span>${esc(i.name)}</span><span>${money(i.qty * i.price)}</span></div><div class="sub">${num(i.qty)} ${i.unit === 'Kilo' ? 'kg' : 'u'} × ${money(i.price)}</div>`).join('')}<hr>
      <div class="kv tot"><span>TOTAL</span><span>${money(o.total)}</span></div><div class="c" style="margin-top:8px">¡Gracias por su compra!</div></div>`;
  root.onclick = e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'back') return go('pedidos');
    if (a.dataset.act === 'pdf') toast('En el diálogo de impresión elegí «Guardar como PDF».');
    try { window.print(); } catch (err) { toast('No se pudo generar el comprobante. Intentá de nuevo.', 'error'); }
  };
}

function changeStatusModal(o) {
  const nexts = NEXT_STATES[o.status] || [];
  if (!nexts.length) return toast(`El pedido ya está «${o.status}»: no se puede cambiar el estado.`, 'error');
  const body = `<p>Estado actual: ${statusBadge(o.status)}</p><br>
    ${field('s-new', 'Nuevo estado', `<select id="s-new">${options(nexts.map(s => [s, s]), nexts[0])}</select>`)}
    <div id="s-extra"></div>`;
  const m = modal(`Cambiar estado · ${o.number}`, body, [{ label: 'Cancelar' }, {
    label: 'Guardar estado', cls: 'primary', fn: ov => {
      clearErrs(ov);
      const st = $('#s-new', ov).value, obs = ($('#s-obs', ov).value || '').trim();
      if (st === 'Cancelado' && !obs) { setErr(ov, 's-obs', 'Ingresá el motivo de la cancelación.'); return false; }
      const r = changeOrderStatus(o, st, me().id, { method: ($('#s-method', ov) || {}).value, obs });
      if (!r.ok) { setErr(ov, 's-new', r.error); return false; }
      toast('Estado actualizado: ' + st); render();
    }
  }]);
  function extra() {
    const st = $('#s-new', m.el).value;
    $('#s-extra', m.el).innerHTML = (st === 'Pagado' ? field('s-method', 'Método de pago', `<select id="s-method">${options(METHODS.map(x => [x, x]), o.method)}</select>`) : '') +
      field('s-obs', st === 'Cancelado' ? 'Motivo de la cancelación' : 'Observaciones (opcional)', '<textarea id="s-obs"></textarea>');
  }
  $('#s-new', m.el).onchange = extra; extra();
}

function orderModal(o) {
  const nexts = NEXT_STATES[o.status] || [];
  modal(`Pedido ${o.number}`, `<p class="muted">${o.channel} · ${esc(clientName(o))} · Pago: ${o.method} · ${fmtDT(o.date)}${o.notes ? '<br>Obs.: ' + esc(o.notes) : ''}</p><br>${orderItemsHtml(o)}<br><h3>Línea de tiempo</h3>${timelineHtml(o)}`,
    [{ label: 'Cerrar' }, { label: 'Ver comprobante', fn: () => { go('comprobante', o.id); } }].concat(nexts.length ? [{ label: 'Cambiar estado', cls: 'primary', fn: () => { setTimeout(() => changeStatusModal(o), 0); } }] : []), { wide: true });
}

function viewOrders(root) {
  const todayStr = inputDate(new Date()), pastStr = inputDate(new Date(Date.now() - 30 * 86400000));
  let q = '', st = 'Todos los estados', df = pastStr, dt = todayStr;
  root.innerHTML = pageHead(9, 'CU-09', 'Pedidos', 'Abrí un pedido para ver su detalle y cambiar su estado.') +
    `<div class="toolbar"><div class="field grow"><input id="oq" placeholder="Buscar por número o cliente" value="${esc(q)}"></div>
    <div class="field"><select id="ost">${options(['Todos los estados', ...Object.keys(NEXT_STATES)].map(s => [s, s]), st)}</select></div>
    ${field('odf', 'Desde', `<input type="date" id="odf" value="${df}">`)}
    ${field('odt', 'Hasta', `<input type="date" id="odt" value="${dt}">`)}
    <button class="btn" id="oclear">Limpiar filtros</button></div><div class="card table-wrap" id="otable"></div>`;
  function draw() {
    const a = df ? parseDay(df) : new Date(0), b = dt ? new Date(parseDay(dt).getTime() + 86399999) : new Date(8.64e15);
    const list = db.orders.filter(o => {
      const d = new Date(o.date);
      return d >= a && d <= b && (st === 'Todos los estados' || o.status === st) && (o.number + ' ' + clientName(o)).toLowerCase().includes(q.toLowerCase());
    }).sort((x, y) => y.date.localeCompare(x.date));
    $('#otable', root).innerHTML = list.length ? `<table><thead><tr><th>Pedido</th><th>Fecha</th><th>Canal</th><th>Cliente</th><th class="num">Total</th><th>Estado</th></tr></thead><tbody>
      ${list.map(o => `<tr class="click" data-o="${o.id}"><td><b>${o.number}</b></td><td>${fmtDT(o.date)}</td><td><span class="badge">${o.channel}</span></td><td>${esc(clientName(o))}</td><td class="num">${money(o.total)}</td><td>${statusBadge(o.status)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">No hay pedidos para mostrar.</div>';
  }
  draw();
  $('#oq', root).oninput = e => { q = e.target.value; draw(); };
  $('#ost', root).onchange = e => { st = e.target.value; draw(); };
  $('#odf', root).onchange = e => { df = e.target.value; draw(); };
  $('#odt', root).onchange = e => { dt = e.target.value; draw(); };
  $('#oclear', root).onclick = () => { q = ''; st = 'Todos los estados'; df = ''; dt = ''; $('#oq', root).value = ''; $('#ost', root).value = st; $('#odf', root).value = ''; $('#odt', root).value = ''; draw(); };
  root.onclick = e => { const r = e.target.closest('[data-o]'); if (r) orderModal(db.orders.find(o => o.id === +r.dataset.o)); };
}

function cashMovementModal() {
  modal('Registrar movimiento', `<div class="row">${field('m-type', 'Tipo', `<select id="m-type">${options([['egreso', 'Egreso'], ['ingreso', 'Ingreso']], 'egreso')}</select>`)}
    ${field('m-method', 'Método de pago', `<select id="m-method">${options(METHODS.map(m => [m, m]), 'Efectivo')}</select>`)}</div>
    ${field('m-amount', 'Monto', '<input id="m-amount" inputmode="decimal">')}${field('m-desc', 'Descripción', '<input id="m-desc" placeholder="Ej.: compra de hielo y bolsas">')}`,
    [{ label: 'Cancelar' }, {
      label: 'Registrar', cls: 'primary', fn: ov => {
        clearErrs(ov);
        const type = $('#m-type', ov).value, method = $('#m-method', ov).value, amount = parseNum($('#m-amount', ov).value), desc = $('#m-desc', ov).value.trim();
        let bad = false;
        if (!(amount > 0)) { setErr(ov, 'm-amount', 'Ingresá un monto mayor a cero.'); bad = true; }
        if (!desc) { setErr(ov, 'm-desc', 'Ingresá una descripción.'); bad = true; }
        if (bad) return false;
        if (type === 'egreso' && amount > cajaTotals().saldo) { setErr(ov, 'm-amount', 'El egreso supera el saldo disponible.'); return false; }
        const r = registerCash({ type, amount, method, desc, origin: 'Manual' });
        if (!r.ok) { setErr(ov, 'm-amount', r.error); return false; }
        save(); toast('Movimiento registrado'); render();
      }
    }]);
}

function closeCajaModal() {
  const t = cajaTotals();
  const m = modal('Cerrar caja', `<div class="summary-box"><div class="kv"><span>Saldo inicial</span><b>${money(db.caja.saldoInicial)}</b></div><div class="kv"><span>Ingresos</span><b class="pos-amount">${money(t.ing)}</b></div>
    <div class="kv"><span>Egresos</span><b class="neg-amount">${money(t.egr)}</b></div></div>
    ${field('k-count', 'Efectivo contado', '<input id="k-count" inputmode="decimal">')}<div id="k-diff" class="hint"></div>
    <div id="k-obs-wrap"></div>`,
    [{ label: 'Cancelar' }, {
      label: 'Cerrar caja', cls: 'danger', fn: ov => {
        clearErrs(ov);
        const counted = parseNum($('#k-count', ov).value);
        if (isNaN(counted) || counted < 0) { setErr(ov, 'k-count', 'Ingresá el efectivo contado.'); return false; }
        const diff = Math.round((counted - t.saldo) * 100) / 100;
        const obs = ($('#k-obs', ov) || { value: '' }).value.trim();
        if (diff !== 0 && !obs) { setErr(ov, 'k-obs', 'Ingresá una observación por la diferencia.'); return false; }
        db.cajaHist.push({ ...db.caja, closing: new Date().toISOString(), saldoFinal: counted, diferencia: diff, obs, closedBy: me().id });
        db.caja = null; save(); toast('Caja cerrada'); render();
      }
    }]);
  $('#k-count', m.el).oninput = e => {
    const c = parseNum(e.target.value);
    if (isNaN(c)) { $('#k-diff', m.el).textContent = ''; $('#k-obs-wrap', m.el).innerHTML = ''; return; }
    const diff = Math.round((c - t.saldo) * 100) / 100;
    $('#k-diff', m.el).innerHTML = diff === 0 ? 'Sin diferencia.' : `Diferencia: <b class="${diff < 0 ? 'neg-amount' : 'pos-amount'}">${diff < 0 ? '-' : '+'} ${money(Math.abs(diff))}</b>`;
    if (diff !== 0 && !$('#k-obs', m.el)) $('#k-obs-wrap', m.el).innerHTML = field('k-obs', 'Observación', '<textarea id="k-obs"></textarea>');
    if (diff === 0) $('#k-obs-wrap', m.el).innerHTML = '';
  };
}

function viewCaja(root) {
  const c = db.caja;
  if (!c) {
    root.innerHTML = pageHead(10, 'CU-10, CU-11', 'Caja del día', 'La caja está cerrada.') +
      `<div class="card" style="max-width:420px"><h3>Abrir caja</h3><br>${field('o-init', 'Saldo inicial en efectivo', '<input id="o-init" inputmode="decimal" placeholder="Ej.: 20000">')}<button class="btn primary" data-act="open">Abrir caja</button></div>`;
    root.onclick = e => {
      if (!e.target.closest('[data-act=open]')) return;
      clearErrs(root);
      const v = parseNum($('#o-init', root).value);
      if (isNaN(v) || v < 0) return setErr(root, 'o-init', 'Ingresá un saldo inicial válido.');
      if (db.caja) return toast('Ya hay una caja abierta.', 'error');
      db.caja = { id: nextId([...db.cajaHist, { id: 99 }]), saldoInicial: v, opening: new Date().toISOString(), userId: me().id };
      save(); toast('Caja abierta'); render();
    };
    return;
  }
  const t = cajaTotals();
  const rows = [...t.mv.map(m => ({ date: m.date, concept: m.desc, origin: m.origin, method: m.method, amount: m.type === 'ingreso' ? m.amount : -m.amount })),
    { date: c.opening, concept: 'Apertura de caja', origin: 'Saldo inicial', method: 'Efectivo', amount: c.saldoInicial }].sort((a, b) => b.date.localeCompare(a.date));
  root.innerHTML = pageHead(10, 'CU-10, CU-11', 'Caja del día', `Caja abierta desde las ${fmtTime(c.opening)} · ${fmtDate(c.opening)}`,
    '<button class="btn primary" data-act="mov">+ Nuevo movimiento</button><button class="btn danger" data-act="close">Cerrar caja</button>') +
    `<div class="stats"><div class="stat"><small>Saldo inicial</small><b>${money(c.saldoInicial)}</b></div><div class="stat green"><small>Ingresos</small><b>${money(t.ing)}</b></div>
    <div class="stat red"><small>Egresos</small><b>${money(t.egr)}</b></div><div class="stat dark"><small>Saldo actual</small><b>${money(t.saldo)}</b></div></div>
    <div class="card"><h3>Movimientos de hoy</h3><div class="table-wrap"><table><thead><tr><th>Hora</th><th>Concepto</th><th>Origen</th><th>Método</th><th class="num">Monto</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${fmtTime(r.date)}</td><td>${esc(r.concept)}</td><td><span class="badge">${r.origin}</span></td><td>${r.method}</td><td class="num ${r.amount < 0 ? 'neg-amount' : 'pos-amount'}">${r.amount < 0 ? '- ' : '+ '}${money(Math.abs(r.amount))}</td></tr>`).join('')}</tbody></table></div></div>`;
  root.onclick = e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'mov') cashMovementModal();
    if (a.dataset.act === 'close') closeCajaModal();
  };
}

function viewAlerts(root) {
  let fc = '0', fl = 'Todos los niveles';
  root.innerHTML = pageHead(11, 'CU-12', 'Alertas de stock', 'Productos que llegaron al stock mínimo o se agotaron.') +
    `<div class="toolbar"><div class="field"><select id="a-cat">${options([['0', 'Todas las categorías'], ...db.categories.map(c => [c.id, c.name])], fc)}</select></div>
    <div class="field"><select id="a-lv">${options(['Todos los niveles', 'Bajo', 'Sin stock'].map(s => [s, s]), fl)}</select></div>
    <button class="btn" id="aclear">Limpiar filtros</button></div><div class="card table-wrap" id="a-table"></div>`;
  function draw() {
    const list = pendingAlerts().map(a => ({ a, p: prod(a.productId) })).filter(({ p }) => (fc === '0' || p.catId === +fc) && (fl === 'Todos los niveles' || levelOf(p) === fl));
    $('#a-table', root).innerHTML = list.length ? `<table><thead><tr><th>Producto</th><th>Categoría</th><th class="num">Stock actual</th><th class="num">Mínimo</th><th>Nivel</th><th>Alerta desde</th><th></th></tr></thead><tbody>
      ${list.map(({ a, p }) => `<tr><td><b>${esc(p.name)}</b><div class="sub-code">${p.code}</div></td><td>${esc(catName(p.catId))}</td><td class="num">${qtyTxt(p, p.stock)}</td><td class="num">${qtyTxt(p, p.min)}</td><td>${levelBadge(levelOf(p))}</td><td>${fmtDT(a.date)}</td><td><button class="btn sm" data-ok="${a.id}">Marcar atendida</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No hay productos con stock bajo.</div>';
  }
  draw();
  $('#a-cat', root).onchange = e => { fc = e.target.value; draw(); };
  $('#a-lv', root).onchange = e => { fl = e.target.value; draw(); };
  $('#aclear', root).onclick = () => { fc = '0'; fl = 'Todos los niveles'; $('#a-cat', root).value = fc; $('#a-lv', root).value = fl; draw(); };
  root.onclick = e => { const b = e.target.closest('[data-ok]'); if (b) { db.alerts.find(a => a.id === +b.dataset.ok).attended = true; save(); toast('Alerta marcada como atendida'); render(); } };
}

function supplierModal(s) {
  const isNew = !s;
  const v = s || { name: '', cuit: '', address: '', phone: '', email: '' };
  modal(isNew ? 'Nuevo proveedor' : `Editar proveedor · ${v.name}`, `
    ${field('sup-name', 'Razón social', `<input id="sup-name" value="${esc(v.name)}">`)}
    <div class="row">${field('sup-cuit', 'CUIT', `<input id="sup-cuit" value="${esc(v.cuit)}" placeholder="30-XXXXXXXX-X">`)}${field('sup-phone', 'Teléfono', `<input id="sup-phone" value="${esc(v.phone)}">`)}</div>
    ${field('sup-address', 'Dirección', `<input id="sup-address" value="${esc(v.address)}">`)}
    ${field('sup-email', 'Email', `<input id="sup-email" type="email" value="${esc(v.email)}">`)}`,
    [{ label: 'Cancelar' }, {
      label: 'Guardar', cls: 'primary', fn: ov => {
        clearErrs(ov);
        const name = $('#sup-name', ov).value.trim(), cuit = $('#sup-cuit', ov).value.trim(), address = $('#sup-address', ov).value.trim(), phone = $('#sup-phone', ov).value.trim(), email = $('#sup-email', ov).value.trim();
        let bad = false;
        [['sup-name', name], ['sup-cuit', cuit]].forEach(([id, val]) => { if (!val) { setErr(ov, id, 'Completá este campo.'); bad = true; } });
        if (bad) return false;
        if (isNew) {
          db.suppliers.push({ id: nextId(db.suppliers), name, cuit, address, phone, email, active: true });
          audit('Creó proveedor', `Proveedor ${name}`, '—', cuit, me().id);
        } else {
          audit('Modificó proveedor', `Proveedor ${s.name}`, s.cuit, cuit, me().id);
          Object.assign(s, { name, cuit, address, phone, email });
        }
        save(); toast('Proveedor guardado'); render();
      }
    }]);
}

function viewSuppliers(root) {
  root.innerHTML = pageHead(11, 'CU-11', 'Gestión de Proveedores', 'Proveedores activos y alta de nuevos prestadores de mercadería.', '<button class="btn primary" data-act="new">+ Nuevo proveedor</button>') +
    `<div class="card table-wrap"><table><thead><tr><th>Razón social</th><th>CUIT</th><th>Teléfono</th><th>Email</th><th>Estado</th><th></th></tr></thead><tbody>
    ${db.suppliers.map(s => `<tr><td><b>${esc(s.name)}</b><div class="sub-code">${esc(s.address)}</div></td><td>${s.cuit}</td><td>${s.phone || '—'}</td><td>${s.email || '—'}</td><td><span class="badge ${s.active ? 'ok' : ''}">${s.active ? 'Activo' : 'Inactivo'}</span></td>
      <td class="right"><button class="btn sm" data-edit="${s.id}">Editar</button> <button class="btn sm" data-tog="${s.id}">${s.active ? 'Desactivar' : 'Activar'}</button></td></tr>`).join('')}</tbody></table></div>`;
  root.onclick = e => {
    if (e.target.closest('[data-act=new]')) return supplierModal(null);
    const ed = e.target.closest('[data-edit]'); if (ed) return supplierModal(supplierById(+ed.dataset.edit));
    const tg = e.target.closest('[data-tog]');
    if (tg) {
      const s = supplierById(+tg.dataset.tog);
      s.active = !s.active; save(); toast('Estado del proveedor actualizado'); render();
    }
  };
}

function purchaseOrderModal(po) {
  const actives = db.suppliers.filter(s => s.active);
  const prods = db.products.filter(p => p.active);
  let items = po ? [...po.items] : [{ productId: prods[0] ? prods[0].id : 1, qty: 10 }];

  const m = modal(po ? `Editar Orden de Pedido · ${po.number}` : 'Nueva Orden de Pedido a Proveedor', `
    <div class="row">${field('po-sup', 'Proveedor', `<select id="po-sup">${options(actives.map(s => [s.id, s.name]), po ? po.supplierId : (actives[0] && actives[0].id))}</select>`)}
    ${field('po-notes', 'Observaciones', `<input id="po-notes" value="${esc(po ? po.notes : '')}" placeholder="Ej.: Urgente, entregar por mañana">`)}</div>
    <h3>Productos solicitados</h3><br>
    <div id="po-items"></div>
    <button class="btn sm" id="po-add" style="margin-top:8px">+ Agregar producto</button>`,
    [{ label: 'Cancelar' }, {
      label: 'Guardar Orden', cls: 'primary', fn: ov => {
        clearErrs(ov);
        const supplierId = +$('#po-sup', ov).value, notes = $('#po-notes', ov).value.trim();
        if (!items.length) { toast('Agregá al menos un producto.', 'error'); return false; }
        for (const it of items) {
          if (!(it.qty > 0)) { toast('La cantidad debe ser mayor a cero.', 'error'); return false; }
        }
        if (po) {
          po.supplierId = supplierId;
          po.items = items;
          po.notes = notes;
          audit('Modificó orden de pedido', `Orden ${po.number}`, '—', supplierById(supplierId).name, me().id);
        } else {
          const number = 'OP-' + String(db.purchaseOrders.length + 1).padStart(7, '0');
          db.purchaseOrders.push({
            id: nextId(db.purchaseOrders),
            number,
            supplierId,
            date: new Date().toISOString(),
            status: 'Pendiente',
            items: [...items],
            userId: me().id,
            notes
          });
          audit('Creó orden de pedido', `Orden ${number}`, '—', supplierById(supplierId).name, me().id);
        }
        save(); toast('Orden de pedido guardada'); render();
      }
    }], { wide: true });

  const renderItems = () => {
    $('#po-items', m.el).innerHTML = items.map((it, idx) => `
      <div class="row" style="align-items:center;margin-bottom:8px">
        <select data-po-p="${idx}">${options(prods.map(p => [p.id, `${p.name} (${p.code})`]), it.productId)}</select>
        <input data-po-q="${idx}" inputmode="decimal" value="${it.qty}" placeholder="Cantidad" style="width:120px">
        <button type="button" class="btn sm danger" data-po-rm="${idx}">✕</button>
      </div>`).join('');
  };

  m.el.oninput = e => {
    const q = e.target.closest('[data-po-q]');
    if (q) { const idx = +q.dataset.poQ; items[idx].qty = parseNum(q.value) || 0; }
  };
  m.el.onchange = e => {
    const sel = e.target.closest('[data-po-p]');
    if (sel) { const idx = +sel.dataset.poP; items[idx].productId = +sel.value; }
  };
  m.el.onclick = e => {
    if (e.target.id === 'po-add') { items.push({ productId: prods[0].id, qty: 10 }); renderItems(); }
    const rm = e.target.closest('[data-po-rm]');
    if (rm) { items.splice(+rm.dataset.poRm, 1); renderItems(); }
  };

  renderItems();
}

function viewPurchaseOrders(root) {
  const todayStr = inputDate(new Date()), pastStr = inputDate(new Date(Date.now() - 30 * 86400000));
  let st = 'Todos', df = pastStr, dt = todayStr;
  root.innerHTML = pageHead(11, 'CU-11b', 'Órdenes de Compra / Pedido a Proveedores', 'Generá y enviá órdenes de pedido a tus proveedores de mercadería.', '<button class="btn primary" data-act="new">+ Nueva Orden de Pedido</button>') +
    `<div class="toolbar"><div class="field"><select id="po-st">${options([['Todos', 'Todos los estados'], ['Pendiente', 'Pendiente'], ['Enviada', 'Enviada'], ['Recibida', 'Recibida']], st)}</select></div>
    ${field('podf', 'Desde', `<input type="date" id="podf" value="${df}">`)}
    ${field('podt', 'Hasta', `<input type="date" id="podt" value="${dt}">`)}
    <button class="btn" id="poclear">Limpiar filtros</button></div><div class="card table-wrap" id="po-table"></div>`;
  function draw() {
    const a = df ? parseDay(df) : new Date(0), b = dt ? new Date(parseDay(dt).getTime() + 86399999) : new Date(8.64e15);
    const list = db.purchaseOrders.filter(po => {
      const d = new Date(po.date);
      return d >= a && d <= b && (st === 'Todos' || po.status === st);
    }).sort((x, y) => y.date.localeCompare(x.date));
    $('#po-table', root).innerHTML = list.length ? `<table><thead><tr><th>N° Orden</th><th>Fecha</th><th>Proveedor</th><th>Ítems</th><th>Estado</th><th>Usuario</th><th class="right">Acciones</th></tr></thead><tbody>
      ${list.map(po => {
        const sup = supplierById(po.supplierId);
        return `<tr><td><b>${po.number}</b></td><td>${fmtDT(po.date)}</td><td>${esc(sup ? sup.name : '—')}</td><td>${po.items.length} prod.</td><td><span class="badge">${po.status}</span></td><td>${esc(userName(po.userId))}</td>
          <td class="right" style="white-space:nowrap"><button class="btn sm" data-view="${po.id}">Ver</button> ${po.status !== 'Recibida' ? `<button class="btn sm primary" data-send="${po.id}">${po.status === 'Pendiente' ? 'Marcar Enviada' : 'Recibir y Cargar'}</button>` : ''}</td></tr>`;
      }).join('')}</tbody></table>` : '<div class="empty">No hay órdenes de pedido registradas.</div>';
  }
  draw();
  $('#po-st', root).onchange = e => { st = e.target.value; draw(); };
  $('#podf', root).onchange = e => { df = e.target.value; draw(); };
  $('#podt', root).onchange = e => { dt = e.target.value; draw(); };
  $('#poclear', root).onclick = () => { st = 'Todos'; df = ''; dt = ''; $('#po-st', root).value = st; $('#podf', root).value = ''; $('#podt', root).value = ''; draw(); };
  root.onclick = e => {
    if (e.target.closest('[data-act=new]')) return purchaseOrderModal(null);
    const v = e.target.closest('[data-view]');
    if (v) {
      const po = db.purchaseOrders.find(x => x.id === +v.dataset.view);
      const sup = supplierById(po.supplierId);
      modal(`Orden de Pedido ${po.number}`, `<p class="muted">Proveedor: ${esc(sup ? sup.name : '—')} · Fecha: ${fmtDT(po.date)} · Estado: ${po.status}${po.notes ? '<br>Obs: ' + esc(po.notes) : ''}</p><br>
        <div class="table-wrap"><table><thead><tr><th>Producto</th><th class="num">Cantidad</th></tr></thead><tbody>
        ${po.items.map(it => { const p = prod(it.productId); return `<tr><td>${esc(p ? p.name : '—')}</td><td class="num">${num(it.qty)} ${p ? unitShort(p) : ''}</td></tr>`; }).join('')}
        </tbody></table></div>`, [{ label: 'Cerrar' }]);
      return;
    }
    const send = e.target.closest('[data-send]');
    if (send) {
      const po = db.purchaseOrders.find(x => x.id === +send.dataset.send);
      if (po.status === 'Pendiente') {
        po.status = 'Enviada';
        save(); toast('Orden marcada como enviada'); draw();
      } else if (po.status === 'Enviada') {
        po.status = 'Recibida';
        save(); toast('Orden recibida. Ya puede registrarla en Compras.'); draw();
      }
    }
  };
}

function viewPurchases(root) {
  const todayStr = inputDate(new Date()), pastStr = inputDate(new Date(Date.now() - 30 * 86400000));
  let df = pastStr, dt = todayStr;
  root.innerHTML = pageHead(12, 'CU-12', 'Compras y Recepción de Mercadería', 'Registro de ingresos por remito o factura y actualización de costos (RF05).', '<button class="btn primary" data-act="new">+ Registrar nueva compra</button>') +
    `<div class="toolbar">${field('pdf', 'Desde', `<input type="date" id="pdf" value="${df}">`)}
    ${field('pdt', 'Hasta', `<input type="date" id="pdt" value="${dt}">`)}
    <button class="btn" id="pclear">Limpiar filtros</button></div><div class="card table-wrap" id="ptable"></div>`;
  function draw() {
    const a = df ? parseDay(df) : new Date(0), b = dt ? new Date(parseDay(dt).getTime() + 86399999) : new Date(8.64e15);
    const list = db.purchases.filter(pu => {
      const d = new Date(pu.date);
      return d >= a && d <= b;
    }).sort((x, y) => y.date.localeCompare(x.date));
    $('#ptable', root).innerHTML = list.length ? `<table><thead><tr><th>N° Remito / Factura</th><th>Fecha</th><th>Proveedor</th><th>Condición</th><th class="num">Total Compra</th><th>Usuario</th></tr></thead><tbody>
    ${list.map(pu => {
      const sup = supplierById(pu.supplierId);
      return `<tr><td><b>${esc(pu.remito)}</b></td><td>${fmtDT(pu.date)}</td><td>${esc(sup ? sup.name : '—')}</td><td><span class="badge">${pu.condition}</span></td><td class="num"><b>${money(pu.total)}</b></td><td>${esc(userName(pu.userId))}</td></tr>`;
    }).join('')}</tbody></table>` : '<div class="empty">No hay compras registradas en el período.</div>';
  }
  draw();
  $('#pdf', root).onchange = e => { df = e.target.value; draw(); };
  $('#pdt', root).onchange = e => { dt = e.target.value; draw(); };
  $('#pclear', root).onclick = () => { df = ''; dt = ''; $('#pdf', root).value = ''; $('#pdt', root).value = ''; draw(); };
  root.onclick = e => {
    if (e.target.closest('[data-act=new]')) registerPurchaseModal();
  };
}

function registerPurchaseModal() {
  const actives = db.suppliers.filter(s => s.active);
  const prods = db.products.filter(p => p.active);
  let items = [{ productId: prods[0] ? prods[0].id : 1, qty: 10, cost: prods[0] ? prods[0].cost : 1000 }];

  const m = modal('Registrar Entrada de Mercadería / Remito Proveedor', `
    <div class="row">${field('pu-sup', 'Proveedor', `<select id="pu-sup">${options(actives.map(s => [s.id, s.name]), actives[0] && actives[0].id)}</select>`)}
    ${field('pu-rem', 'N° Remito / Factura', '<input id="pu-rem" placeholder="REC-2026-XXXXX">')}</div>
    <div class="row">${field('pu-date', 'Fecha de Recepción', `<input type="date" id="pu-date" value="${inputDate(new Date())}">`)}
    ${field('pu-cond', 'Condición de pago', `<select id="pu-cond">${options([['Contado', 'Contado (Caja del día)'], ['Cuenta corriente', 'Cuenta corriente proveedor']], 'Contado')}</select>`)}</div>
    
    <h3>Productos recibidos</h3><br>
    <div id="pu-items"></div>
    <button class="btn sm" id="pu-add" style="margin-top:8px">+ Agregar producto</button><br><br>
    <div class="summary-box"><div class="kv"><span>Total Compra</span><b id="pu-total" style="font-size:18px">$ 0</b></div></div>`,
    [{ label: 'Cancelar' }, {
      label: 'Confirmar e Ingresar a Stock', cls: 'primary', fn: ov => {
        clearErrs(ov);
        const supplierId = +$('#pu-sup', ov).value, remito = $('#pu-rem', ov).value.trim(), dateStr = $('#pu-date', ov).value, condition = $('#pu-cond', ov).value;
        if (!remito) { setErr(ov, 'pu-rem', 'Ingresá el número de remito o factura.'); return false; }
        if (!items.length) { toast('Agregá al menos un producto.', 'error'); return false; }

        let total = 0;
        const purchaseItems = [];
        for (const it of items) {
          const p = prod(it.productId);
          if (!(it.qty > 0)) { toast('La cantidad debe ser mayor a cero.', 'error'); return false; }
          if (!(it.cost >= 0)) { toast('El precio de costo no puede ser negativo.', 'error'); return false; }
          total += it.qty * it.cost;
          purchaseItems.push({ productId: p.id, qty: it.qty, cost: it.cost });
        }

        if (condition === 'Contado') {
          const res = registerCash({ type: 'egreso', amount: total, method: 'Efectivo', desc: `Compra proveedor ${remito}`, origin: 'Manual' });
          if (!res.ok) { toast(res.error, 'error'); return false; }
        }

        const dateIso = new Date(dateStr + 'T12:00:00').toISOString();
        db.purchases.push({ id: nextId(db.purchases), supplierId, remito, date: dateIso, userId: me().id, condition, items: purchaseItems, total });

        purchaseItems.forEach(it => {
          const p = prod(it.productId);
          p.cost = it.cost;
          updateStock(p, it.qty, 'ingreso', `Compra proveedor (Remito ${remito})`, me().id);
        });

        audit('Registró compra', `Remito ${remito} · ${supplierById(supplierId).name}`, '—', money(total), me().id);
        save(); toast('Compra registrada y stock actualizado'); render();
      }
    }], { wide: true });

  const renderItems = () => {
    $('#pu-items', m.el).innerHTML = items.map((it, idx) => `
      <div class="row" style="align-items:center;margin-bottom:8px">
        <select data-pu-p="${idx}">${options(prods.map(p => [p.id, `${p.name} (${p.code})`]), it.productId)}</select>
        <input data-pu-q="${idx}" inputmode="decimal" value="${it.qty}" placeholder="Cantidad" style="width:90px">
        <input data-pu-c="${idx}" inputmode="decimal" value="${it.cost}" placeholder="Costo Unit." style="width:110px">
        <button type="button" class="btn sm danger" data-pu-rm="${idx}">✕</button>
      </div>`).join('');
    
    let tot = items.reduce((s, i) => s + i.qty * i.cost, 0);
    $('#pu-total', m.el).textContent = money(tot);
  };

  m.el.oninput = e => {
    const q = e.target.closest('[data-pu-q]'), c = e.target.closest('[data-pu-c]');
    if (q) { const idx = +q.dataset.puQ; items[idx].qty = parseNum(q.value) || 0; renderItems(); }
    if (c) { const idx = +c.dataset.puC; items[idx].cost = parseNum(c.value) || 0; renderItems(); }
  };
  m.el.onchange = e => {
    const sel = e.target.closest('[data-pu-p]');
    if (sel) { const idx = +sel.dataset.puP; items[idx].productId = +sel.value; }
  };
  m.el.onclick = e => {
    if (e.target.id === 'pu-add') { items.push({ productId: prods[0].id, qty: 1, cost: 1000 }); renderItems(); }
    const rm = e.target.closest('[data-pu-rm]');
    if (rm) { items.splice(+rm.dataset.puRm, 1); renderItems(); }
  };

  renderItems();
}

function productModal(p) {
  const isNew = !p;
  const v = p || { code: '', name: '', desc: '', catId: db.categories[0] ? db.categories[0].id : '', price: '', cost: '', unit: 'Kilo', min: 0, img: '' };
  modal(isNew ? 'Nuevo producto' : `Editar producto · ${p.code}`, `
    <div class="row">${field('p-code', 'Código', `<input id="p-code" value="${esc(v.code)}" placeholder="PF-006">`)}${field('p-name', 'Nombre', `<input id="p-name" value="${esc(v.name)}">`)}</div>
    ${field('p-desc', 'Descripción', `<textarea id="p-desc">${esc(v.desc || '')}</textarea>`)}
    ${field('p-img', 'URL de Imagen', `<input id="p-img" value="${esc(v.img || '')}" placeholder="https://...">`)}
    <div class="row">${field('p-cat', 'Categoría', `<select id="p-cat">${options(db.categories.map(c => [c.id, c.name]), v.catId)}</select>`)}${field('p-unit', 'Unidad de venta', `<select id="p-unit">${options([['Kilo', 'Kilo'], ['Unidad', 'Unidad']], v.unit)}</select>`)}</div>
    <div class="row">${field('p-price', 'Precio Venta', `<input id="p-price" inputmode="decimal" value="${v.price}">`)}${field('p-cost', 'Precio Costo', `<input id="p-cost" inputmode="decimal" value="${v.cost || ''}">`)}</div>
    ${field('p-min', 'Stock mínimo', `<input id="p-min" inputmode="decimal" value="${v.min}">`)}`,
    [{ label: 'Cancelar' }, {
      label: 'Guardar', cls: 'primary', fn: ov => {
        clearErrs(ov);
        const code = $('#p-code', ov).value.trim(), name = $('#p-name', ov).value.trim(), desc = $('#p-desc', ov).value.trim(), img = $('#p-img', ov).value.trim();
        const catId = +$('#p-cat', ov).value, unit = $('#p-unit', ov).value, price = parseNum($('#p-price', ov).value), cost = parseNum($('#p-cost', ov).value) || 0, min = parseNum($('#p-min', ov).value);
        let bad = false;
        [['p-code', code], ['p-name', name], ['p-price', $('#p-price', ov).value.trim()], ['p-min', $('#p-min', ov).value.trim()]].forEach(([id, val]) => { if (!val) { setErr(ov, id, 'Completá este campo.'); bad = true; } });
        if (!catId) { setErr(ov, 'p-cat', 'Elegí una categoría.'); bad = true; }
        if (bad) return false;
        if (db.products.some(x => x.code.toLowerCase() === code.toLowerCase() && (!p || x.id !== p.id))) { setErr(ov, 'p-code', 'Ya existe un producto con ese código.'); return false; }
        if (!(price > 0)) { setErr(ov, 'p-price', 'Ingresá un precio mayor a cero.'); return false; }
        if (isNaN(min) || min < 0) { setErr(ov, 'p-min', 'El stock mínimo no puede ser negativo.'); return false; }
        const uid = me().id;
        if (isNew) {
          const np = { id: nextId(db.products), code, name, desc, catId, price, cost, unit, stock: 0, min, img, active: true };
          db.products.push(np);
          audit('Creó producto', `Producto ${code} · ${name}`, '—', `Activo · ${money(price)}`, uid);
        } else {
          Object.assign(p, { code, name, desc, catId, price, cost, unit, min, img });
          audit('Modificó producto', `Producto ${code} · ${name}`, '—', `${name} · ${money(price)}`, uid);
          if (p.stock <= p.min) generateAlert(p);
        }
        save(); toast('Producto guardado'); render();
      }
    }], { wide: true });
}

function viewProducts(root) {
  let q = '';
  root.innerHTML = pageHead(12, 'CU-13', 'Productos', 'Catálogo general de productos, costos y precios.', '<button class="btn primary" data-act="new">+ Nuevo producto</button>') +
    `<div class="toolbar"><div class="field grow"><input id="pq" placeholder="Buscar por nombre o código"></div><button class="btn" id="pclear">Limpiar filtros</button></div><div class="card table-wrap" id="ptable"></div>`;
  function draw() {
    const list = db.products.filter(p => (p.name + ' ' + p.code).toLowerCase().includes(q.toLowerCase()));
    $('#ptable', root).innerHTML = list.length ? `<table><thead><tr><th>Imagen</th><th>Código</th><th>Nombre</th><th>Categoría</th><th class="num">Costo</th><th class="num">Precio Venta</th><th>Stock</th><th>Estado</th><th></th></tr></thead><tbody>
      ${list.map(p => `<tr><td><img src="${p.img || ''}" style="width:32px;height:32px;object-fit:cover;border-radius:4px"></td><td>${p.code}</td><td><b>${esc(p.name)}</b></td><td>${esc(catName(p.catId))}</td><td class="num">${money(p.cost || 0)}</td><td class="num">${money(p.price)}</td><td class="num">${qtyTxt(p, p.stock)}</td>
        <td><span class="badge ${p.active ? 'ok' : ''}">${p.active ? 'Activo' : 'Inactivo'}</span></td>
        <td style="white-space:nowrap"><button class="btn sm" data-edit="${p.id}">Editar</button> <button class="btn sm" data-toggle="${p.id}">${p.active ? 'Desactivar' : 'Activar'}</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No hay productos que coincidan con la búsqueda.</div>';
  }
  draw();
  $('#pq', root).oninput = e => { q = e.target.value; draw(); };
  $('#pclear', root).onclick = () => { q = ''; $('#pq', root).value = ''; draw(); };
  root.onclick = e => {
    if (e.target.closest('[data-act=new]')) return productModal(null);
    const ed = e.target.closest('[data-edit]'); if (ed) return productModal(prod(+ed.dataset.edit));
    const tg = e.target.closest('[data-toggle]');
    if (tg) {
      const p = prod(+tg.dataset.toggle);
      p.active = !p.active; save(); render();
    }
  };
}

function categoryModal(c) {
  modal(c ? 'Renombrar categoría' : 'Nueva categoría', field('cat-name', 'Nombre', `<input id="cat-name" value="${esc(c ? c.name : '')}">`),
    [{ label: 'Cancelar' }, {
      label: 'Guardar', cls: 'primary', fn: ov => {
        clearErrs(ov); const name = $('#cat-name', ov).value.trim();
        if (!name) { setErr(ov, 'cat-name', 'Ingresá un nombre.'); return false; }
        if (db.categories.some(x => x.name.toLowerCase() === name.toLowerCase() && (!c || x.id !== c.id))) { setErr(ov, 'cat-name', 'Ya existe una categoría con ese nombre.'); return false; }
        if (c) c.name = name; else db.categories.push({ id: nextId(db.categories), name });
        save(); toast('Categoría guardada'); render();
      }
    }]);
}

function viewCategories(root) {
  root.innerHTML = pageHead(13, 'CU-14', 'Categorías', 'Agrupan a los productos del catálogo.', '<button class="btn primary" data-act="new">+ Nueva categoría</button>') +
    `<div class="card table-wrap"><table><thead><tr><th>Nombre</th><th class="num">Productos</th><th></th></tr></thead><tbody>
    ${db.categories.map(c => `<tr><td><b>${esc(c.name)}</b></td><td class="num">${db.products.filter(p => p.catId === c.id).length}</td><td class="right"><button class="btn sm" data-ren="${c.id}">Renombrar</button> <button class="btn sm" data-del="${c.id}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`;
  root.onclick = e => {
    if (e.target.closest('[data-act=new]')) return categoryModal(null);
    const r = e.target.closest('[data-ren]'); if (r) return categoryModal(db.categories.find(c => c.id === +r.dataset.ren));
    const d = e.target.closest('[data-del]');
    if (d) {
      const c = db.categories.find(x => x.id === +d.dataset.del);
      if (db.products.some(p => p.catId === c.id)) return toast('No se puede eliminar: tiene productos asociados.', 'error');
      confirmBox('Eliminar categoría', `¿Eliminar la categoría «${esc(c.name)}»?`, 'Eliminar', () => { db.categories = db.categories.filter(x => x.id !== c.id); save(); render(); }, true);
    }
  };
}

function stockMoveModal() {
  const actives = db.products.filter(p => p.active);
  const m = modal('Nuevo movimiento de stock', `<div class="row">${field('sm-type', 'Tipo', `<select id="sm-type">${options([['egreso', 'Egreso (Baja manual)'], ['ingreso', 'Ingreso']], 'egreso')}</select>`)}
    ${field('sm-prod', 'Producto', `<select id="sm-prod">${options(actives.map(p => [p.id, p.name]), actives[0] && actives[0].id)}</select>`)}</div>
    <div class="hint" id="sm-stock" style="margin:-6px 0 10px"></div>
    ${field('sm-qty', 'Cantidad', '<input id="sm-qty" inputmode="decimal">')}${field('sm-reason', 'Motivo', '<input id="sm-reason" placeholder="Ej.: merma, descarte, ajuste manual">')}`,
    [{ label: 'Cancelar' }, {
      label: 'Registrar', cls: 'primary', fn: ov => {
        clearErrs(ov);
        const type = $('#sm-type', ov).value, p = prod(+$('#sm-prod', ov).value), qty = parseNum($('#sm-qty', ov).value), reason = $('#sm-reason', ov).value.trim();
        let bad = false;
        if (!(qty > 0)) { setErr(ov, 'sm-qty', 'Ingresá una cantidad mayor a cero.'); bad = true; }
        else if (p.unit === 'Unidad' && !Number.isInteger(qty)) { setErr(ov, 'sm-qty', 'La cantidad debe ser un número entero.'); bad = true; }
        else if (type === 'egreso' && qty > p.stock + 1e-9) { setErr(ov, 'sm-qty', `El egreso supera el stock disponible: ${qtyTxt(p, p.stock)}.`); bad = true; }
        if (!reason) { setErr(ov, 'sm-reason', 'Ingresá un motivo.'); bad = true; }
        if (bad) return false;
        const oldStock = p.stock;
        const r = updateStock(p, qty, type, reason, me().id);
        if (!r.ok) { setErr(ov, 'sm-qty', r.error); return false; }
        if (type === 'egreso') {
          audit('Baja manual de stock', `Producto ${p.code} · ${p.name}`, `${num(oldStock)} ${unitShort(p)}`, `${num(p.stock)} ${unitShort(p)} (Motivo: ${reason})`, me().id);
        } else {
          audit('Ingreso manual de stock', `Producto ${p.code} · ${p.name}`, `${num(oldStock)} ${unitShort(p)}`, `${num(p.stock)} ${unitShort(p)} (Motivo: ${reason})`, me().id);
        }
        save(); toast(`Stock resultante de ${p.name}: ${qtyTxt(p, p.stock)}`); render();
      }
    }]);
  const upd = () => { const p = prod(+$('#sm-prod', m.el).value); $('#sm-stock', m.el).innerHTML = `Stock actual: <b>${qtyTxt(p, p.stock)}</b>`; };
  $('#sm-prod', m.el).onchange = upd; upd();
}

function viewStockMoves(root) {
  const todayStr = inputDate(new Date()), pastStr = inputDate(new Date(Date.now() - 30 * 86400000));
  let ft = 'Todos los tipos', fc = '0', fp = '0', df = pastStr, dt = todayStr;
  root.innerHTML = pageHead(14, 'CU-15', 'Movimientos de stock', 'Ingresos y egresos de mercadería con su motivo y auditoría.', '<button class="btn primary" data-act="new">+ Nuevo movimiento</button>') +
    `<div class="toolbar"><div class="field"><select id="f-type">${options([['Todos los tipos', 'Todos los tipos'], ['ingreso', 'Ingreso'], ['egreso', 'Egreso']], ft)}</select></div>
    <div class="field"><select id="f-cat">${options([['0', 'Todas las categorías'], ...db.categories.map(c => [c.id, c.name])], fc)}</select></div>
    <div class="field"><select id="f-prod"><option value="0">Todos los productos</option></select></div>
    ${field('smdf', 'Desde', `<input type="date" id="smdf" value="${df}">`)}
    ${field('smdt', 'Hasta', `<input type="date" id="smdt" value="${dt}">`)}
    <button class="btn" id="smclear">Limpiar filtros</button></div><div class="card table-wrap" id="sm-table"></div>`;
  function updateProdSelect() {
    const prods = db.products.filter(p => fc === '0' || p.catId === +fc);
    $('#f-prod', root).innerHTML = options([['0', 'Todos los productos'], ...prods.map(p => [p.id, p.name])], fp);
  }
  function draw() {
    const a = df ? parseDay(df) : new Date(0), b = dt ? new Date(parseDay(dt).getTime() + 86399999) : new Date(8.64e15);
    const list = db.stockMovs.filter(m => {
      const d = new Date(m.date);
      const p = prod(m.productId);
      return d >= a && d <= b && (ft === 'Todos los tipos' || m.type === ft) && (fc === '0' || (p && p.catId === +fc)) && (fp === '0' || m.productId === +fp);
    }).sort((x, y) => y.date.localeCompare(x.date));
    $('#sm-table', root).innerHTML = list.length ? `<table><thead><tr><th>Fecha y hora</th><th>Producto</th><th>Tipo</th><th class="num">Cantidad</th><th>Motivo</th><th>Usuario</th></tr></thead><tbody>
      ${list.map(m => { const p = prod(m.productId); return `<tr><td>${fmtDT(m.date)}</td><td><b>${esc(p ? p.name : '—')}</b></td><td><span class="badge ${m.type === 'ingreso' ? 'ok' : 'danger'}">${m.type === 'ingreso' ? 'Ingreso' : 'Egreso'}</span></td><td class="num">${p ? qtyTxt(p, m.qty) : m.qty}</td><td>${esc(m.reason)}</td><td>${esc(userName(m.userId))}</td></tr>`; }).join('')}</tbody></table>` : '<div class="empty">No hay movimientos para mostrar.</div>';
  }
  updateProdSelect(); draw();
  $('#f-type', root).onchange = e => { ft = e.target.value; draw(); };
  $('#f-cat', root).onchange = e => { fc = e.target.value; fp = '0'; updateProdSelect(); draw(); };
  $('#f-prod', root).onchange = e => { fp = e.target.value; draw(); };
  $('#smdf', root).onchange = e => { df = e.target.value; draw(); };
  $('#smdt', root).onchange = e => { dt = e.target.value; draw(); };
  $('#smclear', root).onclick = () => { ft = 'Todos los tipos'; fc = '0'; fp = '0'; df = ''; dt = ''; $('#f-type', root).value = ft; $('#f-cat', root).value = fc; updateProdSelect(); $('#smdf', root).value = ''; $('#smdt', root).value = ''; draw(); };
  root.onclick = e => { if (e.target.closest('[data-act=new]')) stockMoveModal(); };
}

function viewControl(root) {
  let q = '', fc = '0', fl = 'Todos los niveles';
  const rank = { 'Sin stock': 0, 'Bajo': 1, 'Normal': 2 };
  root.innerHTML = pageHead(15, 'CU-16', 'Control de stock', 'Stock actual frente al mínimo. Lo urgente aparece primero.') +
    `<div class="toolbar"><div class="field grow"><input id="cq2" placeholder="Buscar por nombre" value="${esc(q)}"></div>
    <div class="field"><select id="cc">${options([['0', 'Todas las categorías'], ...db.categories.map(c => [c.id, c.name])], fc)}</select></div>
    <div class="field"><select id="cl">${options(['Todos los niveles', 'Normal', 'Bajo', 'Sin stock'].map(s => [s, s]), fl)}</select></div>
    <button class="btn" id="cclear">Limpiar filtros</button></div><div class="card table-wrap" id="ctable"></div>`;
  function draw() {
    const list = db.products.filter(p => p.active && p.name.toLowerCase().includes(q.toLowerCase()) && (fc === '0' || p.catId === +fc) && (fl === 'Todos los niveles' || levelOf(p) === fl))
      .sort((a, b) => rank[levelOf(a)] - rank[levelOf(b)] || a.name.localeCompare(b.name));
    $('#ctable', root).innerHTML = list.length ? `<table><thead><tr><th>Producto</th><th>Categoría</th><th class="num">Stock actual</th><th class="num">Mínimo</th><th>Nivel</th><th></th></tr></thead><tbody>
      ${list.map(p => `<tr><td><b>${esc(p.name)}</b><div class="sub-code">${p.code}</div></td><td>${esc(catName(p.catId))}</td><td class="num">${qtyTxt(p, p.stock)}</td><td class="num">${qtyTxt(p, p.min)}</td><td>${levelBadge(levelOf(p))}</td><td class="right"><button class="btn sm" data-d="${p.id}">Ver detalle</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No hay productos que coincidan con la búsqueda.</div>';
  }
  draw();
  $('#cq2', root).oninput = e => { q = e.target.value; draw(); };
  $('#cc', root).onchange = e => { fc = e.target.value; draw(); };
  $('#cl', root).onchange = e => { fl = e.target.value; draw(); };
  $('#cclear', root).onclick = () => { q = ''; fc = '0'; fl = 'Todos los niveles'; $('#cq2', root).value = ''; $('#cc', root).value = fc; $('#cl', root).value = fl; draw(); };
  root.onclick = e => {
    const b = e.target.closest('[data-d]'); if (!b) return;
    const p = prod(+b.dataset.d);
    const last = db.stockMovs.filter(m => m.productId === p.id).sort((a, c) => c.date.localeCompare(a.date)).slice(0, 3);
    modal(`${esc(p.name)} · ${p.code}`, `<div class="row"><div class="stat"><small>Stock actual</small><b>${qtyTxt(p, p.stock)}</b></div><div class="stat"><small>Nivel</small>${levelBadge(levelOf(p))}</div></div><br>
      ${field('min', `Stock mínimo (${unitShort(p)})`, `<input id="min" inputmode="decimal" value="${num(p.min)}">`)}
      <h3>Últimos movimientos</h3>${last.length ? `<div class="table-wrap"><table><tbody>${last.map(m => `<tr><td>${fmtDT(m.date)}</td><td><span class="badge ${m.type === 'ingreso' ? 'ok' : 'danger'}">${m.type === 'ingreso' ? 'Ingreso' : 'Egreso'}</span></td><td class="num">${qtyTxt(p, m.qty)}</td><td>${esc(m.reason)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Sin movimientos.</div>'}`,
      [{ label: 'Cancelar' }, {
        label: 'Guardar', cls: 'primary', fn: ov => {
          clearErrs(ov); const v = parseNum($('#min', ov).value);
          if (isNaN(v) || v < 0) { setErr(ov, 'min', 'El stock mínimo no puede ser negativo.'); return false; }
          p.min = v; if (p.stock <= p.min) generateAlert(p); save(); toast('Stock mínimo guardado'); render();
        }
      }], { wide: true });
  };
}

function viewCashPeriod(root) {
  const today = new Date(), from = new Date(); from.setDate(from.getDate() - 6);
  const f = { from: inputDate(from), to: inputDate(today), type: 'Todos', method: 'Todos' };
  root.innerHTML = pageHead(16, 'CU-17', 'Movimientos de caja', 'Ingresos y egresos de un período, con su origen.') +
    `<div class="toolbar">${field('cf', 'Desde', `<input type="date" id="cf" value="${f.from}">`)}${field('ct', 'Hasta', `<input type="date" id="ct" value="${f.to}">`)}
    ${field('cty', 'Tipo', `<select id="cty">${options([['Todos', 'Todos'], ['ingreso', 'Ingresos'], ['egreso', 'Egresos']], 'Todos')}</select>`)}
    ${field('cme', 'Método de pago', `<select id="cme">${options([['Todos', 'Todos'], ...METHODS.map(m => [m, m])], 'Todos')}</select>`)}
    <button class="btn primary" id="cbtn">Buscar</button> <button class="btn" id="cclear">Limpiar</button></div><div id="cres"></div>`;
  function search() {
    clearErrs(root);
    f.from = $('#cf', root).value; f.to = $('#ct', root).value; f.type = $('#cty', root).value; f.method = $('#cme', root).value;
    if (f.from && f.to && f.from > f.to) { $('#cres', root).innerHTML = ''; return setErr(root, 'ct', 'La fecha Desde no puede ser posterior a la fecha Hasta.'); }
    const a = f.from ? parseDay(f.from) : new Date(0), b = f.to ? new Date(parseDay(f.to).getTime() + 86399999) : new Date(8.64e15);
    const list = db.cash.filter(c => { const d = new Date(c.date); return d >= a && d <= b && (f.type === 'Todos' || c.type === f.type) && (f.method === 'Todos' || c.method === f.method); }).sort((x, y) => y.date.localeCompare(x.date));
    const ing = list.filter(c => c.type === 'ingreso').reduce((s, c) => s + c.amount, 0), egr = list.filter(c => c.type === 'egreso').reduce((s, c) => s + c.amount, 0);
    $('#cres', root).innerHTML = `<div class="stats"><div class="stat green"><small>Total de ingresos</small><b>${money(ing)}</b></div><div class="stat red"><small>Total de egresos</small><b>${money(egr)}</b></div><div class="stat dark"><small>Balance del período</small><b>${money(ing - egr)}</b></div></div>` +
      (list.length ? `<div class="card table-wrap"><table><thead><tr><th>Fecha y hora</th><th>Origen</th><th>Detalle</th><th>Método</th><th class="num">Monto</th></tr></thead><tbody>
      ${list.map(c => `<tr><td>${fmtDT(c.date)}</td><td><span class="badge">${c.origin}</span></td><td>${esc(c.desc)}</td><td>${c.method}</td><td class="num ${c.type === 'ingreso' ? 'pos-amount' : 'neg-amount'}">${c.type === 'ingreso' ? '+' : '-'} ${money(c.amount)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="card empty">No hay movimientos en el período elegido.</div>');
  }
  $('#cbtn', root).onclick = search;
  $('#cclear', root).onclick = () => { $('#cf', root).value = inputDate(from); $('#ct', root).value = inputDate(today); $('#cty', root).value = 'Todos'; $('#cme', root).value = 'Todos'; search(); };
  search();
}

function viewReports(root) {
  const t = new Date(), s = new Date(); s.setDate(s.getDate() - 6);
  const st = { tab: 'ventas', from: inputDate(s), to: inputDate(t), cat: '0', prod: '0', channel: 'Todos' };
  const bars = rows => { const max = Math.max(...rows.map(r => r.v), 1); return rows.map(r => `<div class="hbar"><span>${esc(r.l)}</span><div class="track"><div class="fill" style="width:${(r.v / max) * 100}%"></div></div><b>${r.t}</b></div>`).join(''); };
  function draw() {
    const cats = [['0', 'Todas'], ...db.categories.map(c => [c.id, c.name])];
    const filteredProds = db.products.filter(p => st.cat === '0' || p.catId === +st.cat);
    const prods = [['0', 'Todos'], ...filteredProds.map(p => [p.id, p.name])];
    const tabs = `<div class="chips no-print"><button class="chip ${st.tab === 'ventas' ? 'active' : ''}" data-tab="ventas">Ventas</button><button class="chip ${st.tab === 'stock' ? 'active' : ''}" data-tab="stock">Stock valorizado</button></div>`;
    let filters = '', body = '';
    if (st.tab === 'ventas') {
      filters = `<div class="toolbar no-print">${field('rf', 'Desde', `<input type="date" id="rf" value="${st.from}">`)}${field('rt', 'Hasta', `<input type="date" id="rt" value="${st.to}">`)}
        ${field('rc', 'Categoría', `<select id="rc">${options(cats, st.cat)}</select>`)}${field('rp', 'Producto', `<select id="rp">${options(prods, st.prod)}</select>`)}
        ${field('rch', 'Canal', `<select id="rch">${options(['Todos', 'Web', 'Mostrador'].map(x => [x, x]), st.channel)}</select>`)}
        <button class="btn" id="rclear">Limpiar filtros</button></div>`;
      if (st.from > st.to) body = '<div class="card empty">La fecha Desde no puede ser posterior a la fecha Hasta.</div>';
      else {
        const a = parseDay(st.from), b = new Date(parseDay(st.to).getTime() + 86399999);
        let total = 0, orders = 0; const byCat = {};
        db.orders.filter(o => o.status !== 'Cancelado' && new Date(o.date) >= a && new Date(o.date) <= b && (st.channel === 'Todos' || o.channel === st.channel)).forEach(o => {
          let hit = false;
          o.items.forEach(i => {
            const p = prod(i.productId); if (+st.cat && p.catId !== +st.cat) return; if (+st.prod && p.id !== +st.prod) return;
            hit = true; const amt = i.qty * i.price; total += amt;
            byCat[p.catId] = (byCat[p.catId] || 0) + amt;
          });
          if (hit) orders++;
        });
        const agg = {}; db.orders.filter(o => o.status !== 'Cancelado' && new Date(o.date) >= a && new Date(o.date) <= b && (st.channel === 'Todos' || o.channel === st.channel)).forEach(o => o.items.forEach(i => {
          const p = prod(i.productId); if (+st.cat && p.catId !== +st.cat) return; if (+st.prod && p.id !== +st.prod) return;
          (agg[p.id] = agg[p.id] || { p, qty: 0, amt: 0 }); agg[p.id].qty += i.qty; agg[p.id].amt += i.qty * i.price;
        }));
        const top = Object.values(agg).sort((x, y) => y.amt - x.amt).slice(0, 5);
        const catRows = Object.entries(byCat).sort((x, y) => y[1] - x[1]).map(([id, v]) => ({ l: catName(+id), v, t: `${money(v)} · ${(v / total * 100).toFixed(1).replace('.', ',')} %` }));
        body = total ? `<div class="stats"><div class="stat dark"><small>Total vendido</small><b>${money(total)}</b></div><div class="stat"><small>Pedidos</small><b>${orders}</b></div><div class="stat"><small>Ticket promedio</small><b>${money(total / orders)}</b></div></div>
          <div class="two-col" style="grid-template-columns:1fr 1fr"><div class="card"><h3>Ventas por categoría</h3>${bars(catRows)}</div>
          <div class="card"><h3>Productos más vendidos</h3><div class="table-wrap"><table><thead><tr><th>#</th><th>Producto</th><th class="num">Cant.</th><th class="num">Monto</th></tr></thead><tbody>
          ${top.map((r, i) => `<tr><td>${i + 1}</td><td><div style="display:flex;align-items:center;gap:8px"><img src="${r.p.img || ''}" style="width:32px;height:32px;object-fit:cover;border-radius:6px"><b>${esc(r.p.name)}</b></div></td><td class="num">${qtyTxt(r.p, r.qty)}</td><td class="num">${money(r.amt)}</td></tr>`).join('')}</tbody></table></div></div></div>` : '<div class="card empty">No hay datos para los filtros elegidos.</div>';
      }
    } else {
      filters = `<div class="toolbar no-print">${field('rc', 'Categoría', `<select id="rc">${options(cats, st.cat)}</select>`)}${field('rp', 'Producto', `<select id="rp">${options(prods, st.prod)}</select>`)}<button class="btn" id="rclear">Limpiar filtros</button></div>`;
      const list = db.products.filter(p => p.active && (!+st.cat || p.catId === +st.cat) && (!+st.prod || p.id === +st.prod));
      if (!list.length) body = '<div class="card empty">No hay datos para los filtros elegidos.</div>';
      else {
        const val = p => p.stock * p.price, total = list.reduce((s, p) => s + val(p), 0), low = list.filter(p => levelOf(p) !== 'Normal').length;
        const byCat = {}; list.forEach(p => { byCat[p.catId] = (byCat[p.catId] || 0) + val(p); });
        const catRows = Object.entries(byCat).sort((x, y) => y[1] - x[1]).map(([id, v]) => ({ l: catName(+id), v, t: money(v) }));
        body = `<div class="stats"><div class="stat dark"><small>Stock valorizado (a precio de venta)</small><b>${money(total)}</b></div><div class="stat"><small>Productos activos</small><b>${list.length}</b></div><div class="stat red"><small>Productos con stock bajo o sin stock</small><b>${low}</b></div></div>
          <div class="two-col" style="grid-template-columns:1fr 1.2fr"><div class="card"><h3>Valor del stock por categoría</h3>${bars(catRows)}</div>
          <div class="card"><h3>Productos con mayor valor en stock</h3><div class="table-wrap"><thead><tr><th>Producto</th><th class="num">Stock</th><th class="num">Precio</th><th class="num">Valor</th></tr></thead><tbody>
          ${[...list].sort((x, y) => val(y) - val(x)).slice(0, 8).map(p => `<tr><td><b>${esc(p.name)}</b></td><td class="num">${qtyTxt(p, p.stock)}</td><td class="num">${money(p.price)}</td><td class="num">${money(val(p))}</td></tr>`).join('')}</tbody></table></div></div></div>`;
      }
    }
    root.innerHTML = pageHead(17, 'CU-18', 'Reportes', 'Ventas y stock por período, categoría, producto o canal.', '<button class="btn dark" data-act="pdf">Exportar PDF</button>') + tabs + filters + body;
  }
  draw();
  root.onclick = e => {
    const tb = e.target.closest('[data-tab]'); if (tb) { st.tab = tb.dataset.tab; draw(); return; }
    if (e.target.closest('[data-act=pdf]')) { toast('En el diálogo de impresión elegí «Guardar como PDF».'); try { window.print(); } catch (err) { toast('No se pudo exportar el reporte. Intentá de nuevo.', 'error'); } }
    if (e.target.id === 'rclear') { st.cat = '0'; st.prod = '0'; st.channel = 'Todos'; st.from = inputDate(s); st.to = inputDate(t); draw(); }
  };
  root.onchange = e => {
    if (e.target.id === 'rc') { st.cat = e.target.value; st.prod = '0'; draw(); return; }
    const map = { rf: 'from', rt: 'to', rp: 'prod', rch: 'channel' }, k = map[e.target.id];
    if (k) { st[k] = e.target.value; draw(); }
  };
}

const activeAdmins = () => db.users.filter(u => u.role === 'Administrador' && u.active);
function userModal() {
  modal('Nuevo usuario', `<div class="row">${field('u-name', 'Nombre y apellido', '<input id="u-name">')}${field('u-phone', 'Teléfono', '<input id="u-phone">')}</div>
    ${field('u-email', 'Email', '<input id="u-email" type="email">')}
    <div class="row">${field('u-pass', 'Contraseña inicial', '<input id="u-pass" type="password">')}${field('u-role', 'Rol', `<select id="u-role">${options([['Vendedor', 'Vendedor'], ['Administrador', 'Administrador']], 'Vendedor')}</select>`)}</div>`,
    [{ label: 'Cancelar' }, {
      label: 'Guardar', cls: 'primary', fn: ov => {
        clearErrs(ov);
        const name = $('#u-name', ov).value.trim(), phone = $('#u-phone', ov).value.trim(), email = $('#u-email', ov).value.trim(), pass = $('#u-pass', ov).value, role = $('#u-role', ov).value;
        let bad = false;
        [['u-name', name], ['u-phone', phone], ['u-email', email], ['u-pass', pass]].forEach(([id, v]) => { if (!v) { setErr(ov, id, 'Completá este campo.'); bad = true; } });
        if (bad) return false;
        if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) { setErr(ov, 'u-email', 'Ya existe una cuenta con ese email.'); return false; }
        if (pass.length < 8) { setErr(ov, 'u-pass', 'La contraseña debe tener al menos 8 caracteres.'); return false; }
        db.users.push({ id: nextId(db.users), name, email, phone, role, active: true, pass: hash(pass), created: new Date().toISOString() });
        audit('Creó usuario', `Usuario ${email}`, '—', `${role} · Activo`, me().id);
        save(); toast('Usuario creado'); render();
      }
    }]);
}

function viewUsers(root) {
  root.innerHTML = pageHead(18, 'CU-19', 'Usuarios y roles', 'Cuentas del personal y de los clientes, con su rol y estado.', '<button class="btn primary" data-act="new">+ Nuevo usuario</button>') +
    `<div class="card table-wrap"><table><thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th></th></tr></thead><tbody>
    ${db.users.map(u => `<tr><td><b>${esc(u.name)}</b></td><td>${esc(u.email)}</td><td><span class="badge ${u.role === 'Administrador' ? 'dark' : ''}">${u.role}</span></td><td><span class="badge ${u.active ? 'ok' : ''}">${u.active ? 'Activo' : 'Inactivo'}</span></td>
      <td class="right" style="white-space:nowrap"><button class="btn sm" data-role="${u.id}">Cambiar rol</button> <button class="btn sm" data-pass="${u.id}">Restablecer contraseña</button> <button class="btn sm" data-tog="${u.id}">${u.active ? 'Desactivar' : 'Activar'}</button></td></tr>`).join('')}</tbody></table></div>`;
  const lastAdminBlock = u => u.role === 'Administrador' && u.active && activeAdmins().length <= 1;
  root.onclick = e => {
    if (e.target.closest('[data-act=new]')) return userModal();
    const r = e.target.closest('[data-role]');
    if (r) {
      const u = userById(+r.dataset.role);
      modal(`Cambiar rol · ${esc(u.name)}`, field('cr', 'Rol', `<select id="cr">${options(['Cliente', 'Vendedor', 'Administrador'].map(x => [x, x]), u.role)}</select>`), [{ label: 'Cancelar' }, {
        label: 'Guardar', cls: 'primary', fn: ov => {
          const nr = $('#cr', ov).value; if (nr === u.role) return;
          if (lastAdminBlock(u) && nr !== 'Administrador') { setErr(ov, 'cr', 'Debe quedar al menos un administrador activo.'); return false; }
          audit('Cambió rol', `Usuario ${u.email}`, u.role, nr, me().id); u.role = nr; save(); toast('Rol actualizado'); render();
        }
      }]);
      return;
    }
    const p = e.target.closest('[data-pass]');
    if (p) {
      const u = userById(+p.dataset.pass);
      modal(`Restablecer contraseña · ${esc(u.name)}`, field('np', 'Nueva contraseña', '<input id="np" type="password">'), [{ label: 'Cancelar' }, {
        label: 'Guardar', cls: 'primary', fn: ov => {
          clearErrs(ov); const v = $('#np', ov).value;
          if (v.length < 8) { setErr(ov, 'np', 'La contraseña debe tener al menos 8 caracteres.'); return false; }
          u.pass = hash(v); audit('Restableció contraseña', `Usuario ${u.email}`, '—', '—', me().id); save(); toast('Contraseña restablecida');
        }
      }]);
      return;
    }
    const t = e.target.closest('[data-tog]');
    if (t) {
      const u = userById(+t.dataset.tog);
      if (u.active && (u.id === me().id || lastAdminBlock(u))) return toast('Debe quedar al menos un administrador activo.', 'error');
      audit(u.active ? 'Desactivó usuario' : 'Activó usuario', `Usuario ${u.email}`, u.active ? 'Activo' : 'Inactivo', u.active ? 'Inactivo' : 'Activo', me().id);
      u.active = !u.active; save(); render();
    }
  };
}

function viewAudit(root) {
  const todayStr = inputDate(new Date()), pastStr = inputDate(new Date(Date.now() - 30 * 86400000));
  const actors = [...new Set(db.audit.map(a => a.userId))].map(id => [id, userName(id)]);
  const actions = [...new Set(db.audit.map(a => a.action))];
  let df = pastStr, dt = todayStr, user = '0', action = 'Todas';
  root.innerHTML = pageHead(19, 'CU-20', 'Auditoría', 'Historial de solo lectura: quién hizo qué y cuándo.') +
    `<div class="toolbar">${field('af', 'Desde', `<input type="date" id="af" value="${df}">`)}${field('at', 'Hasta', `<input type="date" id="at" value="${dt}">`)}
    ${field('au', 'Usuario', `<select id="au">${options([['0', 'Todos'], ...actors], user)}</select>`)}${field('aa', 'Tipo de acción', `<select id="aa">${options([['Todas', 'Todas'], ...actions.map(a => [a, a])], action)}</select>`)}
    <button class="btn primary" id="abtn">Filtrar</button> <button class="btn" id="aclear">Limpiar</button></div><div id="ares"></div><p class="muted" style="margin-top:10px">Los registros no se pueden modificar ni borrar.</p>`;
  function search() {
    clearErrs(root);
    df = $('#af', root).value; dt = $('#at', root).value; user = $('#au', root).value; action = $('#aa', root).value;
    if (df && dt && df > dt) { $('#ares', root).innerHTML = ''; return setErr(root, 'at', 'La fecha Desde no puede ser posterior a la fecha Hasta.'); }
    const a = df ? parseDay(df) : new Date(0), b = dt ? new Date(parseDay(dt).getTime() + 86399999) : new Date(8.64e15);
    const list = db.audit.filter(r => { const d = new Date(r.date); return d >= a && d <= b && (user === '0' || r.userId === +user) && (action === 'Todas' || r.action === action); }).sort((x, y) => y.date.localeCompare(x.date));
    $('#ares', root).innerHTML = list.length ? `<div class="card table-wrap"><table><thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Acción</th><th>Elemento afectado</th><th>Valor anterior</th><th>Valor nuevo</th></tr></thead><tbody>
      ${list.map(r => `<tr><td>${fmtDT(r.date)}</td><td>${esc(userName(r.userId))}</td><td><span class="badge">${esc(r.action)}</span></td><td>${esc(r.element)}</td><td>${esc(r.oldV)}</td><td><b>${esc(r.newV)}</b></td></tr>`).join('')}</tbody></table></div>` : '<div class="card empty">No hay registros para los filtros elegidos.</div>';
  }
  $('#abtn', root).onclick = search;
  $('#aclear', root).onclick = () => { $('#af', root).value = pastStr; $('#at', root).value = todayStr; $('#au', root).value = '0'; $('#aa', root).value = 'Todas'; search(); };
  search();
}

function viewDashboard(root) {
  const now = new Date();
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const valid = db.orders.filter(o => o.status !== 'Cancelado');
  const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
  const sums = days.map(d => valid.filter(o => sameDay(o.date, d)).reduce((s, o) => s + o.total, 0));
  const max = Math.max(...sums, 1), todaySales = sums[6];
  const alerts = pendingAlerts().map(a => prod(a.productId));
  root.innerHTML = pageHead(20, 'CU-01, CU-12', 'Panel principal', `Resumen del día · ${dayNames[now.getDay()]} ${fmtDate(now)}`) +
    `<div class="stats"><div class="stat"><small>Productos activos</small><b>${db.products.filter(p => p.active).length}</b></div><div class="stat dark"><small>Ventas del día</small><b>${money(todaySales)}</b></div>
    <div class="stat amber"><small>Pedidos pendientes</small><b>${db.orders.filter(o => o.status === 'Pendiente').length}</b></div><div class="stat red"><small>Alertas de stock</small><b>${alerts.length}</b></div></div>
    <div class="two-col"><div class="card"><h3>Ventas de los últimos 7 días</h3><div class="bars">
      ${sums.map((v, i) => `<div class="bar-col ${i === 6 ? 'today' : ''}"><span class="v">${money(v)}</span><div class="bar" style="height:${Math.max(2, (v / max) * 150)}px"></div><span>${pad(days[i].getDate())}/${pad(days[i].getMonth() + 1)}</span></div>`).join('')}</div></div>
    <div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h3>Alertas de stock</h3><a href="#/alertas">Ver todas</a></div>
      ${alerts.length ? alerts.slice(0, 5).map(p => `<div class="alert-row"><div><b>${esc(p.name)}</b><small>${esc(catName(p.catId))} · mínimo ${qtyTxt(p, p.min)}</small></div><div class="right">${levelBadge(levelOf(p))}<small>${qtyTxt(p, p.stock)}</small></div></div>`).join('') : '<div class="empty">No hay productos con stock bajo.</div>'}</div></div>`;
}

const C = ['Cliente'], V = ['Vendedor'], A = ['Administrador'], S = ['Vendedor', 'Administrador'], ALL = ['Cliente', 'Vendedor', 'Administrador'];
const VIEWS = {
  catalogo: { roles: ALL, fn: viewCatalog },
  carrito: { roles: C, fn: viewCart },
  confirmar: { roles: C, fn: viewConfirm },
  'mis-pedidos': { roles: C, fn: viewMyOrders },
  panel: { roles: S, fn: viewDashboard },
  pos: { roles: V, fn: viewPos },
  comprobante: { roles: S, fn: viewReceipt },
  pedidos: { roles: S, fn: viewOrders },
  caja: { roles: S, fn: viewCaja },
  alertas: { roles: S, fn: viewAlerts },
  proveedores: { roles: A, fn: viewSuppliers },
  'ordenes-compra': { roles: A, fn: viewPurchaseOrders },
  compras: { roles: A, fn: viewPurchases },
  productos: { roles: A, fn: viewProducts },
  categorias: { roles: A, fn: viewCategories },
  movstock: { roles: A, fn: viewStockMoves },
  control: { roles: A, fn: viewControl },
  movcaja: { roles: A, fn: viewCashPeriod },
  reportes: { roles: A, fn: viewReports },
  usuarios: { roles: A, fn: viewUsers },
  auditoria: { roles: A, fn: viewAudit },
};

render();
