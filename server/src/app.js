import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/auth.js';   // <-- ADD THIS

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);            // <-- ADD THIS

app.get('/', (req, res) => {
  res.json({ message: "Server running" });
});

export default app;
