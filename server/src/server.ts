import app from './app';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API URL: ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}`);
}); 