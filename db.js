const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'data', 'db.sqlite');

function open() {
  return new sqlite3.Database(DB_PATH);
}

async function runAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

async function allAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function getAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

module.exports = {
  init: async () => {
    // ensure data dir
    const dir = path.join(__dirname, 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const dbExists = fs.existsSync(DB_PATH);
    const db = open();
    if (!dbExists) {
      await runAsync(db, `CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        image TEXT
      )`);
      await runAsync(db, `CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT,
        address TEXT,
        items TEXT,
        total REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      // seed
      const products = [
        { title: 'Vanilkový dort', description: 'Čerstvý domácí dort s vanilkovým krémem', price: 499.00, image: '/images/placeholder.svg' },
        { title: 'Vanilkové sušenky (12 ks)', description: 'Křehké sušenky s vanilkou', price: 89.00, image: '/images/placeholder.svg' },
        { title: 'Vanilkové latte', description: 'Horký nápoj s vanilkovým sirupem', price: 79.00, image: '/images/placeholder.svg' }
      ];
      for (const p of products) {
        await runAsync(db, 'INSERT INTO products (title, description, price, image) VALUES (?, ?, ?, ?)', [p.title, p.description, p.price, p.image]);
      }
    }
    db.close();
  },
  getProducts: async () => {
    const db = open();
    const rows = await allAsync(db, 'SELECT * FROM products');
    db.close();
    return rows;
  },
  getProduct: async (id) => {
    const db = open();
    const row = await getAsync(db, 'SELECT * FROM products WHERE id = ?', [id]);
    db.close();
    return row;
  },
  getOrders: async () => {
    const db = open();
    const rows = await allAsync(db, 'SELECT * FROM orders ORDER BY created_at DESC');
    db.close();
    return rows;
  },
  addProduct: async ({ title, description, price, image }) => {
    const db = open();
    const id = await runAsync(db, 'INSERT INTO products (title, description, price, image) VALUES (?, ?, ?, ?)', [title, description, price, image]);
    db.close();
    return id;
  }
  ,addOrder: async ({ name, email, address, items, total }) => {
    const db = open();
    const id = await runAsync(db, 'INSERT INTO orders (name, email, address, items, total) VALUES (?, ?, ?, ?, ?)', [name, email, address, JSON.stringify(items), total]);
    db.close();
    return id;
  }
};
