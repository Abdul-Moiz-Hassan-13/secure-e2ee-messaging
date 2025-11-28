import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/auth.js';   // <-- ADD THIS
import usersRoutes from './routes/users.js';
import keyExchangeRoutes from './routes/keyexchange.js';
import messagesRoutes from './routes/messages.js';
import filesRoutes from "./routes/files.js";
import mitmDemoRoutes from "./routes/mitmDemo.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);            // <-- ADD THIS
app.use('/api/users', usersRoutes);
app.use('/api/keyexchange', keyExchangeRoutes);
app.use('/api/messages', messagesRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/mitm-demo", mitmDemoRoutes);

app.get('/', (req, res) => {
  res.json({ message: "Server running" });
});

export default app;
