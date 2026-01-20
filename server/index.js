import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import { createApp } from './app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = createApp();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Serve static files in production
if (isProduction) {
  const distPath = join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`RayDrop server running on http://localhost:${PORT}`);
});
