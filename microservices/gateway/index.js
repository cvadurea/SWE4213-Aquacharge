const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3000;

const VALID_TOKEN = 'token123';

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.substring(7); 
  if (token !== VALID_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
  }
  next();
};


app.use('/api/analytics', authenticate, createProxyMiddleware({
  target: 'http://user-service:3001',
  changeOrigin: true,
  pathRewrite: { '^/api/analytics': '/analytics' },
}));

app.use('/api/auth', authenticate, createProxyMiddleware({
  target: 'http://user-service:3002',
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '/auth' },
}));

app.use('/api/bookings', authenticate, createProxyMiddleware({
  target: 'http://user-service:3003',
  changeOrigin: true,
  pathRewrite: { '^/api/bookings': '/bookings' },
}));

app.use('/api/vessels', authenticate, createProxyMiddleware({
  target: 'http://user-service:3004',
  changeOrigin: true,
  pathRewrite: { '^/api/vessels': '/vessels' },
}));

app.use('/api/notifications', authenticate, createProxyMiddleware({
  target: 'http://user-service:3005',
  changeOrigin: true,
  pathRewrite: { '^/api/notifications': '/notifications' },
}));

app.use('/api/ports', authenticate, createProxyMiddleware({
  target: 'http://user-service:3006',
  changeOrigin: true,
  pathRewrite: { '^/api/ports': '/ports' },
}));

app.use('/api/users', authenticate, createProxyMiddleware({
  target: 'http://user-service:3007',
  changeOrigin: true,
  pathRewrite: { '^/api/users': '/users' },
}));

app.get('/health', (req, res) => {
  res.json({ status: 'Gateway is running' });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});