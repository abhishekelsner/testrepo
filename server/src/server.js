import './config/loadEnv.js';
import { connectDb } from './config/db.js';
import app from './app.js';
import dns from "node:dns/promises"

// console.log("logging dns ", dns.getServers())
dns.setServers(["1.1.1.1"]);

const PORT = process.env.API_PORT || 3001;

connectDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('DB connect failed:', err.message);
    process.exit(1);
  });
