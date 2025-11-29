import app from './app.js';
import { connectDB } from '../config/db.js';

connectDB();

const PORT = 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

