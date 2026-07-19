const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');
const metricsPath = path.join(__dirname, 'models', 'metrics.json');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
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

function readMetrics() {
  if (!fs.existsSync(metricsPath)) {
    return {
      status: 'demo',
      rows: 12000,
      fraud_rate: 0.018,
      roc_auc: 0.987,
      average_precision: 0.84,
      top_risk_features: [
        { feature: 'distance_from_home', importance: 0.23 },
        { feature: 'amount', importance: 0.21 },
        { feature: 'merchant_risk_score', importance: 0.18 },
        { feature: 'device_age_days', importance: 0.12 },
        { feature: 'transactions_1h', importance: 0.1 }
      ]
    };
  }

  return JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
}

function handleApi(req, res) {
  if (req.method === 'GET' && req.url === '/api/metrics') {
    sendJson(res, 200, readMetrics());
    return true;
  }

  if (req.method === 'GET' && req.url === '/api/pipeline') {
    sendJson(res, 200, {
      stages: [
        'Ingest transactions and validate schema',
        'Engineer behavioral, velocity, merchant, and device features',
        'Train a class-balanced supervised fraud classifier',
        'Train an Isolation Forest anomaly detector for unlabeled threats',
        'Score transactions and route high-risk items to analyst review',
        'Monitor drift, false positives, and model performance over time'
      ]
    });
    return true;
  }

  return false;
}

function serveStatic(req, res) {
  const requestedPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const safePath = path.normalize(requestedPath).replace(/^([.][.][\/])+/, '');
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  if (handleApi(req, res)) {
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Fraud detection dashboard running at http://localhost:${PORT}`);
});
