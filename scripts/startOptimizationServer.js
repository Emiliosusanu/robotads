import cron from 'node-cron';
import { runDailyOptimization } from './optimizationCron.js';

console.log('Starting optimization server...');

// Her gün saat 02:00'de optimizasyon çalıştır
const optimizationSchedule = '0 2 * * *'; // Her gün saat 02:00

// Cron job'ı başlat
const optimizationJob = cron.schedule(optimizationSchedule, async () => {
  console.log('Running scheduled optimization...');
  try {
    await runDailyOptimization();
    console.log('Scheduled optimization completed successfully');
  } catch (error) {
    console.error('Scheduled optimization failed:', error);
  }
}, {
  scheduled: true,
  timezone: "Europe/Istanbul"
});

// Server'ı başlat
console.log(`Optimization server started. Jobs will run at: ${optimizationSchedule}`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Stopping optimization server...');
  optimizationJob.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Stopping optimization server...');
  optimizationJob.stop();
  process.exit(0);
});

// Manuel test için endpoint (opsiyonel)
if (process.env.ENABLE_MANUAL_ENDPOINT === 'true') {
  import('http').then(({ createServer }) => {
    const server = createServer(async (req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
      } else if (req.url === '/optimize' && req.method === 'POST') {
        try {
          await runDailyOptimization();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', message: 'Optimization completed' }));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: error.message }));
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'not found' }));
      }
    });

    const port = process.env.OPTIMIZATION_SERVER_PORT || 3001;
    server.listen(port, () => {
      console.log(`Optimization server listening on port ${port}`);
    });
  });
} 