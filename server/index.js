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

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect('mongodb://127.0.0.1:27017/medivault')
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

const userSchema = new mongoose.Schema({
    walletAddress: String,
    userType: String, // 'patient' or 'hospital'
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

// 1. Register User
app.post('/api/register', async (req, res) => {
    try {
        const { walletAddress, userType } = req.body;
        let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        
        if (user) return res.json({ msg: 'User synced', user });

        user = new User({ walletAddress: walletAddress.toLowerCase(), userType });
        await user.save();
        res.json({ msg: 'Registration successful', user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Request Access
app.post('/api/request-access', async (req, res) => {
    try {
        const { patientAddress, hospitalAddress, hospitalName } = req.body;
        const user = await User.findOne({ walletAddress: patientAddress.toLowerCase() });
        
        if (!user) return res.status(404).json({ error: "Patient not found" });

        // Check if request already exists
        const exists = user.pendingRequests.some(req => req.hospitalAddress === hospitalAddress);
        if (!exists) {
            user.pendingRequests.push({ hospitalAddress, hospitalName });
            await user.save();
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
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
            }
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

// --- 5. AI ANALYSIS ROUTE (Final Polish) ---
app.post('/api/analyze-report', async (req, res) => {
    try {
        const { cid, category } = req.body;
        console.log("🤖 AI Analyzing:", category, cid);

        const gateways = [
            `https://gateway.pinata.cloud/ipfs/${cid}`,
            `https://ipfs.io/ipfs/${cid}`
        ];

        let response;
        let fileData;
        let mimeType;

        for (const url of gateways) {
            try {
                console.log(`⬇️ Trying gateway: ${url}`);
                response = await axios.get(url, { 
                    responseType: 'arraybuffer',
                    timeout: 30000 
                });
                if (response.status === 200) break;
            } catch (err) {
                console.log(`⚠️ Gateway failed: ${url}`);
            }
        }

        if (!response) throw new Error("Could not fetch file from any IPFS gateway.");

        fileData = Buffer.from(response.data);
        mimeType = response.headers['content-type'];
        console.log("📄 File fetched. Type:", mimeType);

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        let prompt = `You are a medical AI assistant. Analyze this ${category} for a patient. `;

        if (category === "X-Ray") {
            prompt += "Identify the body part. Analyze for fractures, dislocations, or abnormalities. If an issue is found, estimate typical healing time.";
        } else if (category === "Lab Report") {
            prompt += "Extract key values. Flag any abnormal (High/Low) results and briefly explain their significance in plain English.";
        } else if (category === "Prescription") {
            prompt += "Extract the Patient Name, Date, and Doctor Name if visible. List every medication, dosage, frequency, and instruction found.";
        } else {
            prompt += "Summarize the key medical insights from this document.";
        }
        
        prompt += "\n\nSTRICT OUTPUT RULES:";
        prompt += "\n2. Do NOT include a disclaimer at the end.";
        prompt += "\n3. Use Markdown (bolding keys, bullet points) for clear readability.";

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: fileData.toString("base64"), mimeType: mimeType } }
        ]);

        const text = result.response.text();
        console.log("✅ AI Analysis Success");
        res.json({ analysis: text });

    } catch (error) {
        console.error("❌ AI Error:", error.message);
        res.status(500).json({ error: "Analysis timed out or failed. Please try again." });
    }
});

const PORT = 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));