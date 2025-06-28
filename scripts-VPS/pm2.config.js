module.exports = {
  apps: [
    {
      name: "robotads-optimizer",
      script: "./optimize.js",
      exec_mode: "cluster",
      instances: 1,
      cron_restart: "0 */24 * * *",
      watch: false,
      env: {
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        AMAZON_CLIENT_ID: process.env.AMAZON_CLIENT_ID,
        AMAZON_CLIENT_SECRET: process.env.AMAZON_CLIENT_SECRET,
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON
      }
    }
  ]
};
