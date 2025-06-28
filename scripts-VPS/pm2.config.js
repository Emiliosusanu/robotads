// pm2.config.js
export default {
  apps: [
    {
      name: "robotads-optimizer", // Name of the PM2 process
      script: "./scripts/optimize.js",    
      exec_mode: "cluster",       // Run in cluster mode for performance
      instances: 1,               // You can use "max" for full CPU usage
      cron_restart: "0 */24 * * *", // Run once every 24 hours
      watch: false,               // Disable file watch
      env: {
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        AMAZON_CLIENT_ID: process.env.AMAZON_CLIENT_ID,
        AMAZON_CLIENT_SECRET: process.env.AMAZON_CLIENT_SECRET,
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON
      }
    },
    {
      name: "robotads-web",
      script: "npm",
      args: "run preview",
      cwd: ".",
    }
  ]
}
