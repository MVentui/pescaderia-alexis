'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dot = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const money = n => '$ ' + dot(Math.round(n));
const num = n => String(Math.round(n * 1000) / 1000).replace('.', ',');
const parseNum = v => { const n = parseFloat(String(v).trim().replace(',', '.')); return isNaN(n) ? NaN : n; };
const pad = n => String(n).padStart(2, '0');
const fmtDate = iso => { const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const fmtTime = iso => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtDT = iso => `${fmtDate(iso)} ${fmtTime(iso)}`;
const inputDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDay = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const sameDay = (a, b) => inputDate(new Date(a)) === inputDate(new Date(b));
const initials = name => name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
const ago = (days, h, m) => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(h, m, 0, 0); return d.toISOString(); };
const shift = (iso, min) => new Date(+new Date(iso) + min * 60000).toISOString();
const nextId = arr => arr.reduce((m, x) => Math.max(m, x.id), 0) + 1;

function hash(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

const DB_KEY = 'alexis_db_v10';
const SESSION_KEY = 'alexis_session';

function seed() {
  const d = { seq: { order: 1074 }, users: [], categories: [], products: [], suppliers: [], purchaseOrders: [], purchases: [], orders: [], cash: [], stockMovs: [], alerts: [], audit: [], carts: {}, caja: null, cajaHist: [] };
  const pw = hash('alexis123');

  [
    [1, 'Alexis Romero', 'administrador@gmail.com', '11 5555-0101', 'Administrador', true],
    [2, 'Marcos Díaz', 'vendedor@gmail.com', '11 5555-0102', 'Vendedor', true],
    [3, 'Lucía Fernández', 'lucia@alexis.com', '11 5555-0142', 'Vendedor', true],
    [4, 'Carla Medina', 'cliente@gmail.com', '11 5555-0103', 'Cliente', true],
    [5, 'Diego Luna', 'diego@email.com', '11 5555-0104', 'Cliente', true],
    [6, 'Marta Ruiz', 'marta@email.com', '11 5555-0105', 'Cliente', true],
    [7, 'Hugo Pereyra', 'hugo@email.com', '11 5555-0106', 'Cliente', true],
    [8, 'Julia Sosa', 'julia@email.com', '11 5555-0107', 'Cliente', true],
    [9, 'Rosa Benítez', 'rosa@email.com', '11 5555-0108', 'Cliente', true],
    [10, 'Usuario inactivo', 'inactivo@alexis.com', '11 5555-0109', 'Vendedor', false],
  ].forEach(([id, name, email, phone, role, active]) =>
    d.users.push({ id, name, email, phone, role, active, pass: pw, created: ago(30, 10, 0) }));

  ['Pescado fresco', 'Mariscos', 'Congelados', 'Enlatados', 'Bebidas', 'Otros'].forEach((name, i) => d.categories.push({ id: i + 1, name }));

  [
    ['PF-001', 'Merluza (filet)', 1, 8900, 4500, 'Kilo', 24.5, 8, 'Filet de merluza limpio, sin espinas.', 'img/filetmerzluza.jpg'],
    ['PF-002', 'Salmón rosado', 1, 19500, 14000, 'Kilo', 6.2, 4, 'Salmón rosado fresco, ideal para plancha u horno.', 'img/salmonrosado.jpg'],
    ['PF-003', 'Trucha arcoíris', 1, 11200, 8000, 'Kilo', 3.4, 5, 'Trucha entera fresca de criadero.', 'img/truchaarcoiris.jpg'],
    ['PF-004', 'Surubí (postas)', 1, 12500, 9000, 'Kilo', 11, 5, 'Postas de surubí de río.', 'img/postassurubi.jpg'],
    ['PF-005', 'Pejerrey', 1, 9800, 7000, 'Kilo', 0, 3, 'Pejerrey fresco, ideal para freír.', 'img/pejerrey.jpg'],
    ['MA-001', 'Langostinos pelados', 2, 24000, 16000, 'Kilo', 7.8, 5, 'Langostinos pelados y desvenados.', 'img/langostinopelado.jpg'],
    ['MA-002', 'Calamar (anillas)', 2, 10900, 7500, 'Kilo', 9, 4, 'Anillas de calamar limpias.', 'img/calamaranillas.jpg'],
    ['MA-003', 'Mejillones 1 kg', 2, 6500, 4500, 'Unidad', 18, 10, 'Bolsa de mejillones de 1 kg.', 'img/mejillones.jpg'],
    ['MA-004', 'Pulpo', 2, 21000, 15000, 'Kilo', 4.5, 3, 'Pulpo cocido listo para servir.', 'img/pulpo.jpg'],
    ['CO-001', 'Bastoncitos de merluza 400 g', 3, 4200, 3000, 'Unidad', 32, 10, 'Bastoncitos empanados congelados.', 'img/bastonmerluza.jpg'],
    ['CO-002', 'Hamburguesas de pescado x4', 3, 5800, 4000, 'Unidad', 5, 8, 'Pack de 4 hamburguesas de pescado.', 'img/hamburgesapescado.jpg'],
    ['EN-001', 'Atún en lata 170 g', 4, 2900, 2000, 'Unidad', 40, 10, 'Atún al natural en lata.', 'img/atunlata.jpg'],
    ['EN-002', 'Caballa en lata 300 g', 4, 3400, 2400, 'Unidad', 25, 8, 'Caballa en aceite.', 'img/caballalata.jpg'],
    ['BE-001', 'Agua mineral 2 lts', 5, 1600, 1000, 'Unidad', 35, 10, 'Agua mineral sin gas bidón/botella 2L.', 'img/aguamineral.jpg'],
    ['BE-002', 'Agua con gas 2 lts', 5, 1600, 1000, 'Unidad', 28, 8, 'Agua mineral con gas 2L.', 'img/aguagas.jpg'],
    ['BE-003', 'Coca-Cola 1,5 lts', 5, 2400, 1600, 'Unidad', 30, 10, 'Gaseosa Coca-Cola sabor original 1.5L.', 'img/cocamedio.jpg'],
    ['BE-004', 'Coca-Cola 2 lts', 5, 3100, 2100, 'Unidad', 45, 12, 'Gaseosa Coca-Cola sabor original 2L descartable.', 'img/cocados.jpg'],
    ['BE-005', 'Sprite 1,5 lts', 5, 2300, 1500, 'Unidad', 22, 8, 'Gaseosa Sprite lima-limón 1.5L.', 'img/spritemedio.jpg'],
    ['BE-006', 'Sprite 2 lts', 5, 3000, 2000, 'Unidad', 25, 8, 'Gaseosa Sprite lima-limón 2L.', 'img/spritedos.jpg'],
    ['BE-007', 'Fanta Naranja 1,5 lts', 5, 2300, 1500, 'Unidad', 20, 6, 'Gaseosa Fanta Naranja 1.5L.', 'img/fantamedio.jpg'],
    ['BE-008', 'Fanta Naranja 2 lts', 5, 3000, 2000, 'Unidad', 24, 8, 'Gaseosa Fanta Naranja 2L.', 'img/fantados.jpg'],
    ['BE-009', 'Aquarius de manzana 2 lts', 5, 2200, 1400, 'Unidad', 30, 10, 'Bebida saborizada Aquarius manzana 2L.', 'img/aquariusmanzana.jpg'],
    ['BE-010', 'Aquarius de pera 2 lts', 5, 2200, 1400, 'Unidad', 25, 8, 'Bebida saborizada Aquarius pera 2L.', 'img/aquariuspera.jpg'],
    ['BE-011', 'Jugo Baggio multifruta 1 lt', 5, 1800, 1200, 'Unidad', 20, 5, 'Jugo exprimido Baggio sabor multifruta 1L.', 'img/baggiomulti.jpg'],
    ['BE-012', 'Jugo Baggio durazno 1 lt', 5, 1800, 1200, 'Unidad', 22, 6, 'Jugo Baggio sabor durazno 1L.', 'img/baggiodurazno.jpg'],
    ['BE-013', 'Cerveza Heineken Lata 473cc', 5, 2200, 1500, 'Unidad', 50, 15, 'Cerveza Heineken rubia en lata 473 ml.', 'img/heinekenlata.jpg'],
    ['BE-014', 'Cerveza Heineken botella 1 lt', 5, 3600, 2500, 'Unidad', 20, 6, 'Cerveza Heineken botella retornable 1 Litro.', 'img/heinekenbotella.jpg'],
    ['BE-015', 'Cerveza Santa Fe 1 lt', 5, 2800, 1900, 'Unidad', 40, 12, 'Cerveza tradicional Santa Fe 1L retornable.', 'img/santafe.jpg'],
    ['BE-016', 'Cerveza Quilmes Clásica 1 lt', 5, 2700, 1800, 'Unidad', 45, 12, 'Cerveza Quilmes Clásica 1L.', 'img/quilmes.jpg'],
    ['OT-001', 'Hielo en bolsa', 6, 1500, 900, 'Unidad', 30, 10, 'Bolsa de hielo para conservar el pescado.', 'img/hielo.jpg'],
  ].forEach(([code, name, catId, price, cost, unit, stock, min, desc, img], i) =>
    d.products.push({ id: i + 1, code, name, catId, price, cost, unit, stock, min, desc, img, active: true }));

  [
    [1, 'Frigorífico Mar del Plata S.A.', '30-71112223-9', 'Av. Juan B. Justo 4200, Mar del Plata', '0223 482-1122', 'ventas@frigorificomdpl.com'],
    [2, 'Distribuidora del Litoral SRL', '30-68889991-4', 'Ruta 168 km 4.5, Santa Fe', '0342 455-8899', 'pedidos@distribuidoradellitoral.com'],
    [3, 'Mariscos del Sur S.A.', '30-55443322-1', 'Puerto de Comodoro Rivadavia', '0297 447-3322', 'contacto@mariscosdelsur.com']
  ].forEach(([id, name, cuit, address, phone, email]) =>
    d.suppliers.push({ id, name, cuit, address, phone, email, active: true }));

  d.purchaseOrders.push({
    id: 1,
    number: 'OP-0000001',
    supplierId: 1,
    date: ago(1, 10, 0),
    status: 'Enviada',
    items: [{ productId: 1, qty: 30 }, { productId: 2, qty: 10 }],
    userId: 1,
    notes: 'Pedido semanal'
  });

  d.purchases.push({
    id: 1,
    supplierId: 1,
    remito: 'REC-2026-00482',
    date: ago(0, 8, 15),
    userId: 1,
    condition: 'Contado',
    items: [
      { productId: 1, qty: 50, cost: 4500 },
      { productId: 6, qty: 15, cost: 14000 }
    ],
    total: 435000
  });

  const flow = ['Pendiente', 'Pagado', 'En preparación', 'Listo', 'Entregado'];
  function seedOrder(n, days, h, mi, channel, clientId, sellerId, items, method, status) {
    const date = ago(days, h, mi);
    const lines = items.map(([code, q]) => { const p = d.products.find(x => x.code === code); return { productId: p.id, name: p.name, unit: p.unit, qty: q, price: p.price }; });
    const total = lines.reduce((s, i) => s + i.qty * i.price, 0);
    const history = [];
    if (channel === 'Mostrador') history.push({ date, status: 'Entregado', userId: sellerId, obs: 'Venta en mostrador' });
    else if (status === 'Cancelado') {
      history.push({ date, status: 'Pendiente', userId: clientId, obs: '' });
      history.push({ date: shift(date, 20), status: 'Cancelado', userId: sellerId, obs: 'Cancelado por el cliente' });
    } else {
      for (let i = 0; i <= flow.indexOf(status); i++) history.push({ date: shift(date, i * 12), status: flow[i], userId: i === 0 ? clientId : sellerId, obs: '' });
    }
    d.orders.push({ id: d.orders.length + 1, number: 'PA-' + String(n).padStart(7, '0'), date, channel, userId: clientId, sellerId, status, method, notes: '', items: lines, total, history });
    const cobrado = channel === 'Mostrador' || ['Pagado', 'En preparación', 'Listo', 'Entregado'].includes(status);
    if (cobrado) d.cash.push({ id: d.cash.length + 1, date: channel === 'Mostrador' ? date : shift(date, 12), type: 'ingreso', amount: total, method, desc: 'Pedido PA-' + String(n).padStart(7, '0'), origin: channel === 'Mostrador' ? 'Venta' : 'Pedido', cajaId: 99 });
  }
  seedOrder(1049, 2, 15, 0, 'Web', 7, 2, [['PF-005', 1]], 'Efectivo', 'Cancelado');
  seedOrder(1050, 6, 10, 20, 'Mostrador', null, 2, [['PF-001', 2], ['MA-001', 1]], 'Efectivo', 'Entregado');
  seedOrder(1066, 0, 9, 12, 'Mostrador', null, 2, [['PF-002', 1], ['MA-001', 0.5], ['OT-001', 4]], 'Efectivo', 'Entregado');
  seedOrder(1067, 0, 10, 3, 'Mostrador', null, 3, [['PF-001', 1.5], ['MA-004', 0.5], ['CO-001', 2]], 'Tarjeta', 'Entregado');
  seedOrder(1069, 0, 10, 15, 'Web', 4, null, [['PF-001', 1.5], ['MA-001', 0.5]], 'Transferencia', 'Pendiente');
  seedOrder(1071, 0, 9, 30, 'Web', 7, 2, [['PF-002', 1], ['MA-002', 0.5]], 'Tarjeta', 'Pagado');

  d.cash.push({ id: d.cash.length + 1, date: ago(1, 17, 55), type: 'egreso', amount: 6400, method: 'Efectivo', desc: 'Compra de hielo y bolsas', origin: 'Manual', cajaId: 99 });
  d.caja = { id: 99, saldoInicial: 20000, opening: ago(0, 8, 30), userId: 2 };

  const sm = (days, h, m, code, type, qty, reason, userId) => {
    const p = d.products.find(x => x.code === code);
    d.stockMovs.push({ id: d.stockMovs.length + 1, productId: p.id, type, qty, date: ago(days, h, m), reason, userId });
  };
  sm(0, 8, 15, 'PF-001', 'ingreso', 50, 'Compra a proveedor (Remito REC-2026-00482)', 1);

  d.products.filter(p => p.stock <= p.min).forEach(p => d.alerts.push({ id: d.alerts.length + 1, productId: p.id, date: ago(0, 9, 0), attended: false }));

  d.audit.push({ id: 1, date: ago(0, 8, 15), userId: 1, action: 'Registró compra', element: 'Remito REC-2026-00482 · Frigorífico Mar del Plata', oldV: '—', newV: '$ 435.000' });
  d.carts[4] = [{ productId: 1, qty: 1.5 }, { productId: 6, qty: 0.5 }];
  return d;
}

function loadDB() {
  try { const raw = localStorage.getItem(DB_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
  const d = seed(); localStorage.setItem(DB_KEY, JSON.stringify(d)); return d;
}
let db = loadDB();
function save() { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) {} }
function resetDB() { localStorage.removeItem(DB_KEY); sessionStorage.removeItem(SESSION_KEY); db = loadDB(); }

const prod = id => db.products.find(p => p.id === id);
const supplierById = id => db.suppliers.find(s => s.id === id);
const userById = id => db.users.find(u => u.id === id);
const catName = id => (db.categories.find(c => c.id === id) || {}).name || '—';
const sessionUser = () => { const id = +sessionStorage.getItem(SESSION_KEY); return id ? userById(id) : null; };
const unitShort = p => (p.unit === 'Kilo' ? 'kg' : 'u');
const qtyTxt = (p, n) => `${num(n)} ${unitShort(p)}`;
const levelOf = p => (p.stock <= 0 ? 'Sin stock' : p.stock <= p.min ? 'Bajo' : 'Normal');
const levelBadge = lv => `<span class="badge ${lv === 'Sin stock' ? 'danger' : lv === 'Bajo' ? 'warn' : 'ok'}">${lv}</span>`;
const STATUS_CLASS = { 'Pendiente': 'warn', 'Pagado': 'info', 'En preparación': 'info', 'Listo': 'teal', 'Entregado': 'ok', 'Cancelado': 'danger' };
const statusBadge = s => `<span class="badge ${STATUS_CLASS[s] || ''}">${s}</span>`;
const NEXT_STATES = {
  'Pendiente': ['Pagado', 'En preparación', 'Cancelado'],
  'Pagado': ['En preparación', 'Listo', 'Entregado', 'Cancelado'],
  'En preparación': ['Listo', 'Entregado', 'Cancelado'],
  'Listo': ['Entregado', 'Cancelado'],
  'Entregado': [], 'Cancelado': [],
};
const clientName = o => (o.userId ? (userById(o.userId) || { name: '—' }).name : 'Mostrador');
const pendingAlerts = () => db.alerts.filter(a => !a.attended);

function validateCredentials(email, password) {
  const u = db.users.find(x => x.email.toLowerCase() === email.trim().toLowerCase());
  if (!u || u.pass !== hash(password)) return { ok: false, error: 'credenciales' };
  if (!u.active) return { ok: false, error: 'inactiva' };
  return { ok: true, user: u };
}

function generateAlert(p) {
  if (db.alerts.some(a => a.productId === p.id && !a.attended)) return;
  db.alerts.push({ id: nextId(db.alerts), productId: p.id, date: new Date().toISOString(), attended: false });
}

function updateStock(p, qty, type, reason, userId) {
  const next = Math.round((type === 'ingreso' ? p.stock + qty : p.stock - qty) * 1000) / 1000;
  if (next < 0) return { ok: false, error: 'Stock insuficiente' };
  p.stock = next;
  db.stockMovs.push({ id: nextId(db.stockMovs), productId: p.id, type, qty, date: new Date().toISOString(), reason, userId });
  if (p.stock <= p.min) generateAlert(p);
  return { ok: true };
}

function registerCash({ type, amount, method, desc, origin }) {
  if (!db.caja) return { ok: false, error: 'Abrí la caja para registrar movimientos.' };
  db.cash.push({ id: nextId(db.cash), date: new Date().toISOString(), type, amount, method, desc, origin, cajaId: db.caja.id });
  return { ok: true };
}

function cajaTotals() {
  if (!db.caja) return { mv: [], ing: 0, egr: 0, saldo: 0 };
  const mv = db.cash.filter(c => c.cajaId === db.caja.id);
  const ing = mv.filter(c => c.type === 'ingreso').reduce((s, c) => s + c.amount, 0);
  const egr = mv.filter(c => c.type === 'egreso').reduce((s, c) => s + c.amount, 0);
  return { mv, ing, egr, saldo: db.caja.saldoInicial + ing - egr };
}

function addHistory(order, status, userId, obs = '') {
  order.history.push({ date: new Date().toISOString(), status, userId, obs });
}

function audit(action, element, oldV, newV, userId) {
  db.audit.push({ id: nextId(db.audit), date: new Date().toISOString(), userId, action, element, oldV, newV });
}

function createOrder({ channel, clientId, sellerId, items, method, notes }) {
  for (const it of items) {
    const p = prod(it.productId);
    if (it.qty > p.stock + 1e-9) return { ok: false, error: `«${p.name}» se quedó sin stock suficiente. Disponible: ${qtyTxt(p, p.stock)}.` };
  }
  const number = 'PA-' + String(db.seq.order++).padStart(7, '0');
  const lines = items.map(it => { const p = prod(it.productId); return { productId: p.id, name: p.name, unit: p.unit, qty: it.qty, price: p.price }; });
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const status = channel === 'Mostrador' ? 'Entregado' : 'Pendiente';
  const o = { id: nextId(db.orders), number, date: new Date().toISOString(), channel, userId: clientId, sellerId, status, method, notes: notes || '', items: lines, total, history: [] };
  db.orders.push(o);
  const actor = channel === 'Mostrador' ? sellerId : clientId;
  items.forEach(it => updateStock(prod(it.productId), it.qty, 'egreso', (channel === 'Mostrador' ? 'Venta ' : 'Pedido ') + number, actor));
  addHistory(o, status, actor, channel === 'Mostrador' ? 'Venta en mostrador' : 'Pedido confirmado');
  if (channel === 'Mostrador') registerCash({ type: 'ingreso', amount: total, method, desc: 'Pedido ' + number, origin: 'Venta' });
  save();
  return { ok: true, order: o };
}

function changeOrderStatus(order, status, userId, { method, obs }) {
  if (status === 'Pagado') {
    const r = registerCash({ type: 'ingreso', amount: order.total, method, desc: 'Pedido ' + order.number, origin: 'Pedido' });
    if (!r.ok) return r;
    order.method = method;
  }
  if (status === 'Cancelado') {
    order.items.forEach(i => updateStock(prod(i.productId), i.qty, 'ingreso', 'Cancelación ' + order.number, userId));
  }
  order.status = status;
  addHistory(order, status, userId, obs || '');
  save();
  return { ok: true };
}
