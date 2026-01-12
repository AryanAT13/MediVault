require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const https = require('https');

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect('mongodb://127.0.0.1:27017/medivault')
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Error:", err));

const userSchema = new mongoose.Schema({
    walletAddress: String,
    userType: String, // 'patient' or 'hospital'
    name: String,
    pendingRequests: [{
        hospitalAddress: String,
        hospitalName: String,
        timestamp: { type: Date, default: Date.now }
    }]
});
const User = mongoose.model('User', userSchema);

// --- MULTER SETUP (Temporary Storage) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });


// --- ROUTES ---

// --- 1. REGISTER ROUTE (Fixed: Updates existing users) ---
app.post('/api/register', async (req, res) => {
    try {
        const { walletAddress, userType, name } = req.body;
        
        // Check if user exists
        let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        
        if (!user) {
            // Create new user
            user = new User({ 
                walletAddress: walletAddress.toLowerCase(), 
                userType, 
                name: name || "Unnamed User" 
            });
        } else {
            // CRITICAL FIX: If user exists, UPDATE the name!
            user.name = name || user.name; 
            user.userType = userType;
        }
        
        await user.save();
        res.json({ success: true, user });
    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
});

// 2. REQUEST ACCESS ROUTE (Bulletproof: Fetches Name from DB)
app.post('/api/request-access', async (req, res) => {
    try {
        const { patientAddress, hospitalAddress } = req.body; // We ignore hospitalName from frontend

        // A. Find the Hospital in DB to get the REAL Name
        const hospitalUser = await User.findOne({ walletAddress: hospitalAddress.toLowerCase() });
        const realHospitalName = hospitalUser ? hospitalUser.name : "Unregistered Hospital";

        // B. Find the Patient
        const patient = await User.findOne({ walletAddress: patientAddress.toLowerCase() });

        if (!patient) {
            return res.status(404).json({ error: "Patient not found in database" });
        }

        // C. Push the request to their list with the REAL Name
        patient.pendingRequests.push({
            hospitalAddress,
            hospitalName: realHospitalName, // <--- This uses the DB value
            timestamp: new Date()
        });

        await patient.save();
        res.json({ success: true });

    } catch (error) {
        console.error("Request Error:", error);
        res.status(500).json({ error: "Failed to send request" });
    }
});

// 3. Get Notifications
app.get('/api/notifications/:address', async (req, res) => {
    try {
        const user = await User.findOne({ walletAddress: req.params.address.toLowerCase() });
        res.json(user ? user.pendingRequests : []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Resolve Request (Remove Notification)
app.post('/api/resolve-request', async (req, res) => {
    try {
        const { patientAddress, hospitalAddress } = req.body;
        const user = await User.findOne({ walletAddress: patientAddress.toLowerCase() });
        if (user) {
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

// --- NEW ROUTE: Get User Name (For Hospital Dashboard) ---
app.post('/api/get-user-name', async (req, res) => {
    try {
        const { walletAddress } = req.body;
        
        // Find user by wallet address
        const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        
        if (user) {
            // Return the saved name (Hospital Name or Patient Name)
            res.json({ name: user.name });
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } catch (error) {
        console.error("Error fetching user name:", error);
        res.status(500).json({ error: "Server Error" });
    }
});

// --- NEW: IPFS UPLOAD ROUTE (Pinata) ---
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
        console.log("🚀 Uploading to IPFS via Pinata...");

        // 1. Read the file from disk
        const filePath = req.file.path;
        const fileStream = fs.createReadStream(filePath);

        // 2. Prepare data for Pinata
        const formData = new FormData();
        formData.append('file', fileStream);

        const pinataMetadata = JSON.stringify({ name: req.file.originalname });
        formData.append('pinataMetadata', pinataMetadata);

        const pinataOptions = JSON.stringify({ cidVersion: 0 });
        formData.append('pinataOptions', pinataOptions);

        // 3. Send to Pinata
        const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
            maxBodyLength: 'Infinity',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
                'pinata_api_key': process.env.PINATA_API_KEY,
                'pinata_secret_api_key': process.env.PINATA_SECRET_API_KEY
            },
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });

        // 4. Success! Get the Hash (CID)
        const ipfsHash = response.data.IpfsHash;
        console.log("✅ Pinned to IPFS! Hash:", ipfsHash);

        // 5. Cleanup: Delete the local file to save space
        fs.unlinkSync(filePath);

        // 6. Respond to Frontend
        res.json({
            success: true,
            ipfsHash: ipfsHash,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("❌ IPFS Upload Error:", error);
        res.status(500).json({ error: "Failed to upload to IPFS" });
    }
});

// --- 5. AI ANALYSIS ROUTE (With Retry Logic) ---
app.post('/api/analyze-report', async (req, res) => {
    try {
        const { cid, category } = req.body;
        console.log("🤖 AI Analyzing:", category, cid);

        // --- STEP 1: FETCH FILE (Gateways) ---
        const gateways = [
            `https://gateway.pinata.cloud/ipfs/${cid}`,
            `https://cloudflare-ipfs.com/ipfs/${cid}`,
            `https://ipfs.io/ipfs/${cid}`,
            `https://dweb.link/ipfs/${cid}`
        ];

        let response;
        let fileData;
        let mimeType;

        for (const url of gateways) {
            try {
                console.log(`⬇️ Trying gateway: ${url}`);
                response = await axios.get(url, { 
                    responseType: 'arraybuffer',
                    timeout: 45000 
                });
                if (response.status === 200) {
                    console.log(`✅ File fetched from ${url}`);
                    break; 
                }
            } catch (err) {
                // Sssh, keep trying silently
            }
        }

        if (!response) throw new Error("Could not fetch file from any IPFS gateway.");

        fileData = Buffer.from(response.data);
        mimeType = response.headers['content-type'];

        // --- STEP 2: PREPARE AI ---
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        const MODEL_NAME = "gemini-2.5-flash"; 
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        let prompt = `You are a medical AI assistant. Analyze this ${category}. `;
        
        if (category === "X-Ray") prompt += "Identify the body part. Analyze for fractures/abnormalities. Estimate healing time.";
        else if (category === "Lab Report") prompt += "Extract key values. Flag abnormal results and explain significance.";
        else if (category === "Prescription") prompt += "Extract Patient/Doctor Name. List medications, dosage, frequency, instructions.";
        else prompt += "Summarize key medical insights.";

        prompt += "\n\nSTRICT OUTPUT RULES:";
        prompt += "\n2. Do NOT include a disclaimer.";
        prompt += "\n3. Use Markdown.";

        // --- STEP 3: THE RETRY LOOP (Fix for 503 Overloaded) ---
        let text = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts && !text) {
            try {
                attempts++;
                console.log(`🧠 AI Attempt ${attempts}/${maxAttempts}...`);
                
                const result = await model.generateContent([
                    prompt,
                    { inlineData: { data: fileData.toString("base64"), mimeType: mimeType } }
                ]);
                text = result.response.text();
            
            } catch (aiError) {
                console.error(`⚠️ Attempt ${attempts} failed: ${aiError.message}`);
                
                // If it's a 503 (Overloaded), wait 2 seconds and try again
                if (aiError.message.includes("503") || aiError.message.includes("overloaded")) {
                    console.log("⏳ Google is busy. Waiting 2 seconds...");
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    // If it's a different error (like 400 Bad Request), stop trying
                    break;
                }
            }
        }

        if (!text) throw new Error(`AI Service Overloaded after ${maxAttempts} attempts.`);

        console.log("✅ AI Analysis Success");
        res.json({ analysis: text });

    } catch (error) {
        console.error("❌ Final Error:", error.message);
        res.status(500).json({ error: "System is overloaded. Please wait 1 minute and try again." });
    }
});


const PORT = 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));