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

// --- 5. AI ANALYSIS ROUTE (Robust Gateway + Correct Model) ---
app.post('/api/analyze-report', async (req, res) => {
    try {
        const { cid, category } = req.body;
        console.log("🤖 AI Analyzing:", category, cid);

        // 1. GATEWAY STRATEGY (Expanded List)
        const gateways = [
            `https://gateway.pinata.cloud/ipfs/${cid}`,
            `https://cloudflare-ipfs.com/ipfs/${cid}`,
            `https://ipfs.io/ipfs/${cid}`,
            `https://dweb.link/ipfs/${cid}`
        ];

        let response;
        let fileData;
        let mimeType;

        // Loop through gateways until one works
        for (const url of gateways) {
            try {
                console.log(`⬇️ Trying gateway: ${url}`);
                response = await axios.get(url, {
                    responseType: 'arraybuffer',
                    timeout: 45000
                });
                if (response.status === 200) {
                    console.log(`✅ Success via ${url}`);
                    break;
                }
            } catch (err) {
                console.log(`⚠️ Gateway failed: ${url}`);
            }
        }

        if (!response) {
            throw new Error("Could not fetch file from any IPFS gateway.");
        }

        fileData = Buffer.from(response.data);
        mimeType = response.headers['content-type'];
        console.log("📄 File fetched. Type:", mimeType);

        // 2. Initialize Gemini
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

        // 3. Construct Enhanced Medical Prompt
        let prompt = `
You are a highly accurate medical AI assistant.
Analyze the provided ${category} and explain it in a way a non-medical patient can easily understand.

CORE RULES:
• Extract ONLY what is clearly visible in the document
• Do NOT guess, infer, or invent missing details
• If something is unclear or unreadable, explicitly state "**Not visible or unclear**"
• Use simple, reassuring, patient-friendly language
`;

        if (category === "X-Ray") {
            prompt += `
TASK (X-RAY):
• Identify the body part and side (left/right) if visible
• Identify fractures, dislocations, degenerative changes, or other abnormalities

IF AN ISSUE IS FOUND:
• Explain what it means in simple language
• Mention whether the finding is commonly acute or chronic
• Estimate typical healing or recovery time ranges (only if commonly known)

IF NO ABNORMALITY IS VISIBLE:
• Clearly state that no obvious abnormality is seen
`;
        }
        else if (category === "Lab Report") {
            prompt += `
TASK (LAB REPORT):
For each test, extract:
• Test name
• Reported value
• Reference range (if shown)
• Status: Normal / High / Low

FOR ABNORMAL RESULTS:
• Briefly explain what the result may indicate in plain English
• Mention common and non-alarming causes first when possible

Group results by test category if applicable.
`;
        }
        else if (category === "Prescription") {
            prompt += `
TASK (PRESCRIPTION):
Extract the following IF VISIBLE:
• Patient Name
• Date
• Prescribing Doctor Name

For EACH medication, list:
• Medication name
• Strength
• Dosage
• Frequency
• Duration (if mentioned)
• Special instructions

Clearly mark any missing or unreadable information.
`;
        }
        else {
            prompt += `
TASK (OTHER MEDICAL DOCUMENT):
• Identify the document type if possible
• Summarize key medical findings
• Highlight important instructions, results, or follow-up actions
• Mention anything that may require patient attention
`;
        }

        // 4. Strict Output Rules
        prompt += `
OUTPUT FORMAT RULES:
1. Start directly with the data (no titles like "Analysis of...")
2. Use Markdown with clear section headers and bullet points
3. Bold all medical terms, values, and key findings
4. Do NOT include legal or medical disclaimers
5. Do NOT provide diagnoses beyond what is explicitly stated
6. If information is missing or unclear, say "**Not visible or unclear**"
`;

        // 5. Send to Gemini
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: fileData.toString("base64"),
                    mimeType: mimeType
                }
            }
        ]);

        const text = result.response.text();
        console.log("✅ AI Analysis Success");

        res.json({ analysis: text });

    } catch (error) {
        console.error("❌ AI Error:", error.message);
        res.status(500).json({
            error: "Analysis failed. IPFS network may be busy or the file is unsupported."
        });
    }
});


const PORT = 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));