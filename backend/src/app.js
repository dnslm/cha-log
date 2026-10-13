import express from 'express';

const app = express();

// учит сервер читать JSON из тела запроса (пригодится для POST)
app.use(express.json());

// маршрут: GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;