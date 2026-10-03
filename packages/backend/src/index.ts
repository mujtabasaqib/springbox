import 'dotenv/config';
import express from 'express';
import adRoutes from "./routes/ads";
import campaignRoutes from "./routes/campaigns";
import claimRoutes from "./routes/claims";
import eventRoutes from "./routes/events";
import profilesRoutes from "./routes/profiles";
import publisherRoutes from "./routes/publisher";
import faucetRoutes from "./routes/faucet";

const app = express();
app.use(express.json());

// Allow the SDK (served from a different origin) to call this API during local dev.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use("/v1/ads", adRoutes);
app.use("/v1/campaigns", campaignRoutes);
app.use("/v1/claims", claimRoutes);
app.use("/v1/events", eventRoutes);
app.use("/v1/profiles", profilesRoutes);
app.use("/v1/publisher", publisherRoutes);
app.use("/v1/faucet", faucetRoutes);

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => console.log(`Mock ad backend listening on http://localhost:${PORT}`));