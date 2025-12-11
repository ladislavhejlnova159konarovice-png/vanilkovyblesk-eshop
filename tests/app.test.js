// Ensure test env before loading app
process.env.NODE_ENV = 'test';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const request = require('supertest');
const app = require('../app');
const db = require('../db');

beforeAll(async () => {
  await db.init();
});

describe('Eshop integration tests', () => {
  test('GET / should return 200', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
  });

  test('Admin login flow, add product, cart and checkout', async () => {
    const agent = request.agent(app);

    // not logged in -> redirect to login
    const r1 = await agent.get('/admin');
    expect([301, 302, 303, 307, 308]).toContain(r1.statusCode);

    // login
    const login = await agent.post('/admin/login').send({ password: process.env.ADMIN_PASSWORD });
    expect([301, 302, 303, 307, 308]).toContain(login.statusCode);

    // access admin page
    const adminPage = await agent.get('/admin');
    expect(adminPage.statusCode).toBe(200);

    // add product
    const add = await agent.post('/admin/add').send({ title: 'TestProduct', description: 'desc', price: '12.50', image: '/images/placeholder.svg' });
    expect([301, 302, 303]).toContain(add.statusCode);
    const loc = add.headers.location;
    expect(loc).toMatch(/\/product\/(\d+)/);
    const match = loc.match(/\/product\/(\d+)/);
    const prodId = match ? match[1] : null;
    expect(prodId).toBeTruthy();

    // visit product page
    const prodPage = await request(app).get(`/product/${prodId}`);
    expect(prodPage.statusCode).toBe(200);
    expect(prodPage.text).toContain('TestProduct');

    // add to cart (different agent to simulate customer)
    const customer = request.agent(app);
    const cartAdd = await customer.post('/cart/add').send({ productId: prodId, qty: 2 });
    expect([301,302,303]).toContain(cartAdd.statusCode);

    const cartPage = await customer.get('/cart');
    expect(cartPage.statusCode).toBe(200);
    expect(cartPage.text).toContain('TestProduct');

    // checkout
    const checkout = await customer.post('/checkout').send({ name: 'Test Buyer', email: 'buyer@example.com', address: 'Some street 1' });
    expect(checkout.statusCode).toBe(200);
    expect(checkout.text).toContain('Vaše objednávka byla přijata');

    // ensure order saved
    const orders = await db.getOrders();
    expect(Array.isArray(orders)).toBe(true);
    expect(orders.length).toBeGreaterThan(0);
    const found = orders.find(o => o.name === 'Test Buyer');
    expect(found).toBeTruthy();
  }, 20000);
});
