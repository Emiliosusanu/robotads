# 1. Upload and unzip the project folder
cd ~
unzip robotads.zip
cd robotads

# 2. Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install PM2 globally
npm install -g pm2

# 4. Install local project dependencies
npm install

# 5. Start the optimizer using PM2
pm2 start pm2.config.js

# 6. Optional: Start on system boot
pm2 startup
pm2 save

# 8. View logs to confirm it works
pm2 logs
