const path = require('path');
const fs = require('fs');
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('express').urlencoded;
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const csurf = require('csurf');
const layouts = require('express-ejs-layouts');
const { body, validationResult } = require('express-validator');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(layouts);
app.set('layout', 'layout');

app.use(helmet());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(session({ secret: process.env.SESSION_SECRET || 'vanilkovyblesk-secret', resave: false, saveUninitialized: true }));

// middleware to ensure cart exists
app.use((req, res, next) => {
  if (!req.session.cart) req.session.cart = {};
  res.locals.cart = req.session.cart;
  res.locals.isAdmin = !!req.session.isAdmin;
  next();
});

// CSRF protection (after session and cookie parser)
if (process.env.NODE_ENV !== 'test') {
  app.use(csurf());
  app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
  });
} else {
  // in tests we disable CSRF and provide a dummy token to templates
  app.use((req, res, next) => {
    res.locals.csrfToken = '';
    next();
  });
}

app.get('/', async (req, res) => {
  const products = await db.getProducts();
  res.render('index', { products });
});

// Simple health check for readiness probes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/product/:id', async (req, res) => {
  const product = await db.getProduct(req.params.id);
  if (!product) return res.status(404).send('Produkt nenalezen');
  res.render('product', { product });
});

app.post('/cart/add',
  // sanitize inputs
  body('productId').trim().escape(),
  body('qty').toInt().if(body('qty').not().isInt()).toInt(),
  async (req, res) => {
    const id = req.body.productId;
    const qty = parseInt(req.body.qty || '1', 10);
    const product = await db.getProduct(id);
    if (!product) return res.status(400).send('Neplatný produkt');
  req.session.cart[id] = (req.session.cart[id] || 0) + qty;
  // use explicit referrer fallback instead of deprecated 'back'
  res.redirect(req.get('Referrer') || '/');
  }
);

app.get('/cart', async (req, res) => {
  const items = [];
  let total = 0;
  for (const id of Object.keys(req.session.cart)) {
    const qty = req.session.cart[id];
    const product = await db.getProduct(id);
    if (!product) continue;
    const subtotal = product.price * qty;
    total += subtotal;
    items.push({ product, qty, subtotal });
  }
  res.render('cart', { items, total });
});

app.get('/checkout', async (req, res) => {
  // show checkout form
  const items = [];
  let total = 0;
  for (const id of Object.keys(req.session.cart)) {
    const qty = req.session.cart[id];
    const product = await db.getProduct(id);
    if (!product) continue;
    const subtotal = product.price * qty;
    total += subtotal;
    items.push({ product, qty, subtotal });
  }
  res.render('checkout', { items, total });
});

app.post('/checkout',
  // validate + sanitize
  body('name').trim().isLength({ min: 2 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('address').trim().isLength({ min: 5 }).escape(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('checkout', { items: [], total: 0, errors: errors.array() });
    }
    const { name, email, address } = req.body;
    const items = [];
    let total = 0;
    for (const id of Object.keys(req.session.cart)) {
      const qty = req.session.cart[id];
      const product = await db.getProduct(id);
      if (!product) continue;
      const subtotal = product.price * qty;
      total += subtotal;
      items.push({ id: product.id, title: product.title, price: product.price, qty });
    }
    try {
      const orderId = await db.addOrder({ name, email, address, items, total });
      req.session.cart = {};
      res.render('confirmation', { orderId });
    } catch (err) {
      console.error('Order save error', err);
      res.status(500).send('Chyba při ukládání objednávky');
    }
  }
);

// --- Admin auth and routes ---
function ensureAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.redirect('/admin/login');
}

app.get('/admin/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/admin/login', (req, res) => {
  const pw = process.env.ADMIN_PASSWORD || 'admin123';
  const password = (req.body.password || '').toString();
  if (password === pw) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }
  res.status(401).render('login', { error: 'Špatné heslo' });
});

app.get('/admin/logout', (req, res) => {
  req.session.isAdmin = false;
  res.redirect('/');
});

app.get('/admin', ensureAdmin, (req, res) => {
  res.render('admin');
});

app.post('/admin/add', ensureAdmin,
  body('title').trim().isLength({ min: 1 }).escape(),
  body('description').trim().escape(),
  body('price').isFloat({ gt: 0 }),
  body('image').trim().escape(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).send('Neplatné vstupy');
    const { title, description, price, image } = req.body;
    const id = await db.addProduct({ title, description, price: parseFloat(price), image });
    res.redirect('/product/' + id);
  }
);

app.get('/admin/orders', ensureAdmin, async (req, res) => {
  const orders = await db.getOrders();
  res.render('admin_orders', { orders });
});

// Start server after DB init
// Export app for testing; start server when run directly
module.exports = app;

if (require.main === module) {
  db.init().then(() => {
    app.listen(PORT, () => console.log(`vanilkovyblesk demo běží na http://localhost:${PORT}`));
  }).catch(err => {
    console.error('Chyba při inicializaci DB', err);
  });
}
