import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import passport from "passport";
import "./config/passport";
import MongoStore from "connect-mongo";
import session from "express-session";
import authRoute from "./routes/auth";
import contractsRoute from "./routes/contracts";

const app = express();

// Add database name and authentication options to MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pactbot';

// Configure MongoDB connection options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  authSource: 'admin', // Specify the authentication database
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
};

// Connect to MongoDB with better error handling
mongoose
  .connect(MONGODB_URI, mongooseOptions)
  .then(() => {
    console.log("Connected to MongoDB server");
    console.log("Database:", mongoose.connection.name);
  })
  .catch((err) => {
    console.error("MongoDB connection error:", {
      message: err.message,
      code: err.code,
      codeName: err.codeName,
      details: err.errorResponse || err
    });
    // Don't exit process in development
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

// Configure session store with better error handling
const sessionStore = MongoStore.create({ 
  mongoUrl: MONGODB_URI,
  ttl: 24 * 60 * 60, // 1 day
  autoRemove: 'native',
  touchAfter: 24 * 3600, // time period in seconds
  crypto: {
    secret: process.env.SESSION_SECRET!
  },
  mongoOptions: mongooseOptions
});

// Handle session store errors
sessionStore.on('error', function(error) {
  console.error('Session Store Error:', error);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(helmet());
app.use(morgan("dev"));

app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Initialize passport after session middleware
app.use(passport.initialize());
app.use(passport.session());

// Add request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use("/api/auth", authRoute);
app.use("/api/contracts", contractsRoute);

// Add health check route
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok",
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

// Add MongoDB test route
app.get("/api/db-test", async (req, res) => {
  try {
    // Test database connection
    const dbState = mongoose.connection.readyState;
    const dbName = mongoose.connection.name;
    
    // Try to perform a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    res.json({
      status: "ok",
      connection: dbState === 1 ? "connected" : "disconnected",
      database: dbName,
      collections: collections.map(c => c.name)
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: error.message,
      details: {
        code: error.code,
        codeName: error.codeName,
        errorResponse: error.errorResponse
      }
    });
  }
});

// Monitor MongoDB connection
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Handle process termination
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error closing MongoDB connection:', err);
    process.exit(1);
  }
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: "Internal Server Error",
    message: err.message || "Something went wrong"
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: `Cannot ${req.method} ${req.path}`
  });
});

export default app;

if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}