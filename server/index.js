require('dotenv').config();
const express = require('express');
const cors = require('cors'); // Ensure you have this: npm install cors
const connectDB = require('./db');
const User = require('./models/User'); 

const app = express();

// --- THE FIX: BRUTE FORCE CORS ---
// We place this at the very top to catch every request
app.use(cors({
    origin: "http://localhost:5173", // Allow your frontend
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true // Allow cookies/headers
}));

// Manual Backup Header (Just in case the package fails)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
});

// JSON Parser
app.use(express.json());

// Connect to Database
connectDB();

// --- ROUTES ---

// 1. Check if User/Hospital is Registered
app.get('/api/check-user/:address', async (req, res) => {
    try {
        const user = await User.findOne({ walletAddress: req.params.address.toLowerCase() });
        if (user) {
            res.json({ exists: true, userType: user.userType });
        } else {
            res.json({ exists: false });
        }
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Register a New User
app.post('/api/register', async (req, res) => {
    console.log("📝 Register Request Received:", req.body); // Debug log
    try {
        const { walletAddress, userType } = req.body;
        
        let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        if (user) return res.status(400).json({ msg: 'User already registered' });

        user = new User({
            walletAddress: walletAddress.toLowerCase(),
            userType
        });

        await user.save();
        console.log("✅ User Saved to DB:", user);
        res.json({ msg: 'Registration successful', user });
    } catch (err) {
        console.error("❌ Registration Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Get Notifications
app.get('/api/notifications/:address', async (req, res) => {
    try {
        const user = await User.findOne({ walletAddress: req.params.address.toLowerCase() });
        if (!user) return res.status(404).json({ msg: 'User not found' });
        
        res.json(user.pendingRequests || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Add Notification
app.post('/api/request-access', async (req, res) => {
    try {
        const { patientAddress, hospitalAddress, hospitalName } = req.body;
        const patient = await User.findOne({ walletAddress: patientAddress.toLowerCase() });
        if (!patient) return res.status(404).json({ msg: 'Patient not found' });

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

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));