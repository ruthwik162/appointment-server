const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
require('dotenv').config();


const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'https://teacher-student-appointment-a7hf.onrender.com/','http://localhost:3001', 'http://localhost:3002'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],  // Added PATCH
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', userRoutes);
app.use('/api/', appointmentRoutes);


// Health check
app.get('/get', (req, res) => {
  res.send('API is working');
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
