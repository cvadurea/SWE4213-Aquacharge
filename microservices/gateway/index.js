const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3000;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use('/api/analytics', createProxyMiddleware({
  target: 'http://analytics-service:3001',
  changeOrigin: true,
  pathRewrite: { '^/api/analytics': '/analytics' },
}));

app.use('/api/auth', createProxyMiddleware({
  target: 'http://auth-service:3002',
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '' },
}));

app.use('/api/bookings', createProxyMiddleware({
  target: 'http://booking-service:3003',
  changeOrigin: true,
  pathRewrite: { '^/api/bookings': '/bookings' },
}));

app.use('/api/vessels', createProxyMiddleware({
  target: 'http://fleet-service:3004',
  changeOrigin: true,
  pathRewrite: { '^/api/vessels': '/vessels' },
}));

app.use('/api/notifications', createProxyMiddleware({
  target: 'http://notification-service:3005',
  changeOrigin: true,
  pathRewrite: { '^/api/notifications': '/notifications' },
}));

app.use('/api/ports', createProxyMiddleware({
  target: 'http://port-service:3006',
  changeOrigin: true,
  pathRewrite: { '^/api/ports': '/ports' },
}));

app.use('/api/chargers', createProxyMiddleware({
  target: 'http://port-service:3006',
  changeOrigin: true,
  pathRewrite: { '^/api/chargers': '/chargers' },
}));

app.use('/api/users', createProxyMiddleware({
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