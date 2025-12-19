require('dotenv').config();
const express = require('express');
const cors = require('cors'); // Ensure you have this: npm install cors
const connectDB = require('./db');
const User = require('./models/User'); 
const app = express();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Local Storage (Simulating IPFS)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // We use the timestamp to make the filename unique
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Serve uploaded files statically (so we can view them)
app.use('/uploads', express.static('uploads'));
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

// 2. Register a New User (Updated for Sync Issues)
app.post('/api/register', async (req, res) => {
    console.log("📝 Register Request Received:", req.body);
    try {
        const { walletAddress, userType } = req.body;
        
        let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        
        if (user) {
            // FIX: If user exists, don't error out. Just return success.
            // This fixes the issue where Blockchain was reset but DB wasn't.
            console.log("⚠️ User already in DB. Syncing...");
            return res.json({ msg: 'User already registered (Synced)', user });
        }

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

// 5. Upload File Route
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        // In a real Web3 app, you would send 'req.file.path' to Pinata here.
        // For now, we simulate IPFS by returning the local filename as the "Hash".
        const fakeIpfsHash = req.file.filename; 
        
        console.log("📂 File Uploaded:", fakeIpfsHash);
        
        res.json({ 
            success: true, 
            ipfsHash: fakeIpfsHash, 
            timestamp: new Date().toISOString() 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- FIX: Remove Notification Route ---
app.post('/api/resolve-request', async (req, res) => {
    try {
        const { patientAddress, hospitalAddress } = req.body;
        // Find the patient
        const user = await User.findOne({ walletAddress: patientAddress.toLowerCase() });
        
        if (user) {
            // Filter out the request from the specific hospital
            user.pendingRequests = user.pendingRequests.filter(
                req => req.hospitalAddress.toLowerCase() !== hospitalAddress.toLowerCase()
            );
            await user.save();
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));