const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;

const data = {
  categories: [
    'Mobiles',
    'Fashion',
    'Electronics',
    'Home & Kitchen',
    'Beauty',
    'Books'
  ],
  products: [
    {
      id: 1,
      name: 'Nova X Pro Smartphone',
      price: 24999,
      oldPrice: 29999,
      rating: 4.4,
      category: 'Mobiles',
      badge: 'Best Seller',
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600'
    },
    {
      id: 2,
      name: 'AirBeat Wireless Headphones',
      price: 3999,
      oldPrice: 5999,
      rating: 4.2,
      category: 'Electronics',
      badge: 'Limited Offer',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600'
    },
    {
      id: 3,
      name: 'UrbanFlex Running Shoes',
      price: 1899,
      oldPrice: 2499,
      rating: 4.1,
      category: 'Fashion',
      badge: 'Trending',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'
    },
    {
      id: 4,
      name: 'SmartChef Air Fryer',
      price: 5499,
      oldPrice: 7499,
      rating: 4.6,
      category: 'Home & Kitchen',
      badge: 'Top Rated',
      image: 'https://images.unsplash.com/photo-1585515656973-f5d8f6f5cb29?w=600'
    },
    {
      id: 5,
      name: 'GlowCare Skin Kit',
      price: 1299,
      oldPrice: 1799,
      rating: 4.0,
      category: 'Beauty',
      badge: 'Hot Deal',
      image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600'
    },
    {
      id: 6,
      name: 'PageTurner Book Combo',
      price: 899,
      oldPrice: 1299,
      rating: 4.7,
      category: 'Books',
      badge: "Editor's Pick",
      image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600'
    }
  ],
  cart: []
};

const publicDir = path.join(__dirname, 'public');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1e6) {
        req.socket.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function handleApi(req, res, parsedUrl) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return true;
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/api/home') {
    const featured = data.products.slice(0, 4);
    const deals = data.products
      .map(product => ({
        ...product,
        discountPercent: Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      }))
      .sort((a, b) => b.discountPercent - a.discountPercent)
      .slice(0, 3);

    sendJson(res, 200, {
      hero: {
        title: 'Mega Festival Sale',
        subtitle: 'Inspired by Flipkart & Amazon shopping experiences',
        cta: 'Shop Now'
      },
      categories: data.categories,
      featured,
      deals
    });
    return true;
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/api/products') {
    const category = parsedUrl.searchParams.get('category');
    const query = parsedUrl.searchParams.get('q');

    let products = [...data.products];

    if (category && category !== 'All') {
      products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    if (query) {
      const keyword = query.toLowerCase();
      products = products.filter(
        p => p.name.toLowerCase().includes(keyword) || p.category.toLowerCase().includes(keyword)
      );
    }

    sendJson(res, 200, { count: products.length, products });
    return true;
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/api/cart') {
    const items = data.cart.map(item => {
      const product = data.products.find(p => p.id === item.productId);
      return {
        ...item,
        product
      };
    });

    const total = items.reduce((sum, item) => sum + item.qty * (item.product?.price || 0), 0);
    sendJson(res, 200, { items, total });
    return true;
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/api/cart') {
    parseRequestBody(req)
      .then(body => {
        const productId = Number(body.productId);
        const product = data.products.find(p => p.id === productId);

        if (!product) {
          sendJson(res, 404, { message: 'Product not found' });
          return;
        }

        const existing = data.cart.find(item => item.productId === productId);
        if (existing) {
          existing.qty += 1;
        } else {
          data.cart.push({ productId, qty: 1 });
        }

        sendJson(res, 201, { message: `${product.name} added to cart` });
      })
      .catch(() => sendJson(res, 400, { message: 'Invalid JSON payload' }));
    return true;
  }

  if (req.method === 'DELETE' && parsedUrl.pathname.startsWith('/api/cart/')) {
    const id = Number(parsedUrl.pathname.split('/').pop());
    const initialLength = data.cart.length;
    data.cart = data.cart.filter(item => item.productId !== id);

    if (initialLength === data.cart.length) {
      sendJson(res, 404, { message: 'Item not found in cart' });
      return true;
    }

    sendJson(res, 200, { message: 'Item removed from cart' });
    return true;
  }

  return false;
}

function serveStatic(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  if (parsedUrl.pathname.startsWith('/api/')) {
    const handled = handleApi(req, res, parsedUrl);
    if (!handled) {
      sendJson(res, 404, { message: 'API route not found' });
    }
    return;
  }

  let filePath = path.join(publicDir, parsedUrl.pathname === '/' ? 'index.html' : parsedUrl.pathname);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    serveStatic(res, filePath);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
