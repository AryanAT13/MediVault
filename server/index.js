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
    userType: String, 
    name: String,
    pendingRequests: [{
        hospitalAddress: String,
        hospitalName: String,
        timestamp: { type: Date, default: Date.now }
    }]
});
const User = mongoose.model('User', userSchema);

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


app.post('/api/register', async (req, res) => {
    try {
        const { walletAddress, userType, name } = req.body;
        
        let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        
        if (!user) {
            user = new User({ 
                walletAddress: walletAddress.toLowerCase(), 
                userType, 
                name: name || "Unnamed User" 
            });
        } else {
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

app.post('/api/request-access', async (req, res) => {
    try {
        const { patientAddress, hospitalAddress } = req.body; 

        const hospitalUser = await User.findOne({ walletAddress: hospitalAddress.toLowerCase() });
        const realHospitalName = hospitalUser ? hospitalUser.name : "Unregistered Hospital";

        const patient = await User.findOne({ walletAddress: patientAddress.toLowerCase() });

        if (!patient) {
            return res.status(404).json({ error: "Patient not found in database" });
        }
        patient.pendingRequests.push({
            hospitalAddress,
            hospitalName: realHospitalName, 
            timestamp: new Date()
        });

        await patient.save();
        res.json({ success: true });

    } catch (error) {
        console.error("Request Error:", error);
        res.status(500).json({ error: "Failed to send request" });
    }
});

app.get('/api/notifications/:address', async (req, res) => {
    try {
        const user = await User.findOne({ walletAddress: req.params.address.toLowerCase() });
        res.json(user ? user.pendingRequests : []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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

app.post('/api/get-user-name', async (req, res) => {
    try {
        const { walletAddress } = req.body;
        
        const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        
        if (user) {
            res.json({ name: user.name });
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } catch (error) {
        console.error("Error fetching user name:", error);
        res.status(500).json({ error: "Server Error" });
    }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
        console.log("Uploading to IPFS via Pinata...");

        const filePath = req.file.path;
        const fileStream = fs.createReadStream(filePath);

        const formData = new FormData();
        formData.append('file', fileStream);

        const pinataMetadata = JSON.stringify({ name: req.file.originalname });
        formData.append('pinataMetadata', pinataMetadata);

        const pinataOptions = JSON.stringify({ cidVersion: 0 });
        formData.append('pinataOptions', pinataOptions);

        const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
            maxBodyLength: 'Infinity',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
                'pinata_api_key': process.env.PINATA_API_KEY,
                'pinata_secret_api_key': process.env.PINATA_SECRET_API_KEY
            },
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });

        const ipfsHash = response.data.IpfsHash;
        console.log("Pinned to IPFS! Hash:", ipfsHash);

        fs.unlinkSync(filePath);

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

app.post('/api/analyze-report', async (req, res) => {
    try {
        const { cid, category } = req.body;
        console.log("🤖 AI Analyzing:", category, cid);

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
                console.log(`Trying gateway: ${url}`);
                response = await axios.get(url, { 
                    responseType: 'arraybuffer',
                    timeout: 45000 
                });
                if (response.status === 200) {
                    console.log(`File fetched from ${url}`);
                    break; 
                }
            } catch (err) {
                // Sssh, keep trying silently
            }
        }

        if (!response) throw new Error("Could not fetch file from any IPFS gateway.");

        fileData = Buffer.from(response.data);
        mimeType = response.headers['content-type'];

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
                
                if (aiError.message.includes("503") || aiError.message.includes("overloaded")) {
                    console.log("Google is busy. Waiting 2 seconds...");
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    break;
                }
            }
        }

        if (!text) throw new Error(`AI Service Overloaded after ${maxAttempts} attempts.`);

        console.log("AI Analysis Success");
        res.json({ analysis: text });

    } catch (error) {
        console.error("❌ Final Error:", error.message);
        res.status(500).json({ error: "System is overloaded. Please wait 1 minute and try again." });
    }
});


const PORT = 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));