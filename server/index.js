require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const User = require('./models/User'); // Our new model
const { CONTRACT_ADDRESS } = require('./config'); // Your contract address

const app = express();

// Middleware
app.use(express.json()); // Replaces body-parser
app.use(cors({
  origin: "http://localhost:5173", // Allow your specific frontend
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// Connect to Database
connectDB();

// --- ROUTES ---

// 1. Check if User/Hospital is Registered (Replaces their complex app.post('/'))
app.get('/api/check-user/:address', async (req, res) => {
    try {
        const user = await User.findOne({ walletAddress: req.params.address.toLowerCase() });
        if (user) {
            res.json({ exists: true, userType: user.userType });
        } else {
            res.json({ exists: false });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Register a New User (Replaces app.post('/register'))
app.post('/api/register', async (req, res) => {
    try {
        const { walletAddress, userType } = req.body;
        
        // Check if already exists
        let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        if (user) return res.status(400).json({ msg: 'User already registered' });

        user = new User({
            walletAddress: walletAddress.toLowerCase(),
            userType
        });

        await user.save();
        res.json({ msg: 'Registration successful', user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Get Notifications (Pending Requests for a Patient)
app.get('/api/notifications/:address', async (req, res) => {
    try {
        const user = await User.findOne({ walletAddress: req.params.address.toLowerCase() });
        if (!user) return res.status(404).json({ msg: 'User not found' });
        
        res.json(user.pendingRequests || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Add Notification (When Hospital requests access)
app.post('/api/request-access', async (req, res) => {
    try {
        const { patientAddress, hospitalAddress, hospitalName } = req.body;

        const patient = await User.findOne({ walletAddress: patientAddress.toLowerCase() });
        if (!patient) return res.status(404).json({ msg: 'Patient not found' });

        // Add to pending requests if not already there
        const alreadyRequested = patient.pendingRequests.some(req => req.hospitalAddress === hospitalAddress.toLowerCase());
        
        if (!alreadyRequested) {
            patient.pendingRequests.push({
                hospitalAddress: hospitalAddress.toLowerCase(),
                hospitalName: hospitalName
            });
            await patient.save();
        }

        res.json({ msg: 'Request sent' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));