import React, { useState, useEffect, useContext } from 'react';
import { WalletContext } from '../context/WalletContext';
import { useNavigate } from 'react-router-dom';
import UpdateProfileModal from '../components/UpdateProfileModal';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
    Activity, FileText, Shield, Bell, Settings,
    Upload, User, Clock, CheckCircle, XCircle,
    ChevronRight, LogOut, Download, AlertTriangle, ExternalLink, Loader, X, File,
    Sparkles, Bot
} from 'lucide-react';

const UserSiteHomepage = () => {
    const { account, contract, connectWallet } = useContext(WalletContext);
    const navigate = useNavigate();

    // --- STATE ---
    const [generalData, setGeneralData] = useState({ name: 'Loading...', age: '--', gender: '', contact: '--' });
    const [emergencyData, setEmergencyData] = useState({ blood: '--', allergies: '--', chronic: '--' });

    // Separate records for display
    const [doctorRecords, setDoctorRecords] = useState([]);
    const [patientRecords, setPatientRecords] = useState([]);
    const [allRecords, setAllRecords] = useState([]); // For Timeline

    const [notifications, setNotifications] = useState([]);

    // Modals
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);

    // --- AI ANALYSIS STATE ---
    const [showAIModal, setShowAIModal] = useState(false);
    const [aiResult, setAiResult] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // --- AI HANDLER ---
    const handleAnalyzeReport = async (cid, category) => {
        setShowAIModal(true);
        setIsAnalyzing(true);
        setAiResult("Initializing Neural Network... Reading document structure...");

        try {
            const res = await axios.post('/api/analyze-report', { cid, category });
            setAiResult(res.data.analysis);
        } catch (error) {
            console.error("AI Error:", error);
            setAiResult("Error: Could not analyze this report. The file might be too large or encrypted.");
        }
        setIsAnalyzing(false);
    };

    // Upload State
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadMeta, setUploadMeta] = useState({ fileName: '', description: '' });
    const [isUploading, setIsUploading] = useState(false);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };



    // --- 0. SESSION RESTORE LOGIC (Fixes Refresh Issue) ---
    useEffect(() => {
        const restoreSession = async () => {
            // If we are on this page but account is null, try to reconnect silently
            if (!account && window.ethereum) {
                try {
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                    if (accounts.length > 0) {
                        connectWallet(); // Re-establish context
                    }
                } catch (err) {
                    console.error("Session restore failed", err);
                }
            }
        };
        restoreSession();
    }, [account]);

    // --- 1. AVATAR LOGIC (Local Assets) ---
    const getAvatar = (gender) => {
        const g = gender ? gender.toLowerCase() : '';
        if (g === 'male') return "/joel.jpg";
        if (g === 'female') return "/ellie.jpg";
        return "/new.jpg"; // Default/Other
    };

    // --- 2. FETCH DATA (Fixed Mapping) ---
    const fetchBlockchainData = async () => {
        if (!contract || !account) return;

        try {
            // A. Patient Details
            const data = await contract.patients(account);
            setGeneralData({
                name: data[0],
                gender: data[1],
                age: data[2].toString(),
                contact: data[3].toString()
            });

            setEmergencyData({
                blood: data[4] || "N/A",
                allergies: data[5] || "None",
                chronic: data[7] || "None"
            });

            // B. Fetch Reports
            const reports = await contract.getReports(account);

            const docs = [];
            const pats = [];
            const timeline = [];

            reports.forEach(r => {
                // --- 1. UNPACK DATA ---
                // Contract Struct: cID, timeStamp, category
                const cid = r.cID;
                const rawTime = r.timeStamp;
                const rawCat = r.category;

                // --- 2. PARSE CATEGORY & TITLE ---
                // We look for our "||" separator to find the title
                let displayCategory = "General";
                let displayTitle = "Medical Record";

                if (rawCat && rawCat.includes("||")) {
                    const parts = rawCat.split("||");
                    displayCategory = parts[0]; // "Patient Upload"
                    displayTitle = parts[1];    // "My MRI Scan"
                } else {
                    // Fallback for old/doctor records
                    displayCategory = rawCat;
                    displayTitle = "View Document";
                }

                // --- 3. FIX DATE ---
                let dateString = "Unknown Date";
                const timeNum = Number(rawTime);
                if (!isNaN(timeNum) && timeNum > 0) {
                    dateString = new Date(timeNum * 1000).toLocaleDateString("en-GB");
                }

                // --- 4. FIX LINK ---
                const ipfsLink = `https://gateway.pinata.cloud/ipfs/${cid}`;

                const recordObj = {
                    fileName: displayTitle,
                    category: displayCategory,
                    cID: cid,
                    formattedDate: dateString,
                    url: ipfsLink,
                    rawTime: timeNum
                };

                timeline.push(recordObj);

                // --- 5. SORTING ---
                if (displayCategory === "Patient Upload") {
                    pats.push(recordObj);
                } else {
                    docs.push(recordObj);
                }
            });

            // Sort by newest first
            timeline.sort((a, b) => b.rawTime - a.rawTime);

            setDoctorRecords(docs);
            setPatientRecords(pats);
            setAllRecords(timeline);

            // C. Notifications
            const notifs = await axios.get(`/api/notifications/${account}`);
            setNotifications(notifs.data);

        } catch (error) {
            console.error("Blockchain Fetch Error:", error);
        }
    };

    useEffect(() => {
        fetchBlockchainData();
    }, [contract, account]);


    // --- 3. UPLOAD HANDLERS ---
    const onFileSelect = (e) => {
        if (e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            // Default the title to the filename, user can edit
            setUploadMeta({ ...uploadMeta, fileName: e.target.files[0].name });
            setShowUploadModal(true);
        }
    };

    const handleConfirmUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) return;

        setIsUploading(true);
        try {
            // 1. IPFS Upload via Server
            const formData = new FormData();
            formData.append('file', selectedFile);

            const res = await axios.post('/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const ipfsHash = res.data.ipfsHash;
            const timestamp = Math.floor(Date.now() / 1000).toString(); // Current Unix Timestamp

            // TRICK: We pack the Title and Category together since Contract has no Title field
            // Format: "Category||FileName"
            const packedCategory = `Patient Upload||${uploadMeta.fileName}`;

            // 2. Blockchain Write (Sending args in CORRECT ORDER)
            // Order: addReport(patientAddress, cID, timeStamp, category)
            const tx = await contract.addReport(
                account,
                ipfsHash,       // 1. CID (The Hash)
                timestamp,      // 2. Time (The Date)
                packedCategory  // 3. Category (includes Title)
            );
            await tx.wait();

            toast.success("Uploaded Successfully!");
            setShowUploadModal(false);
            setSelectedFile(null);
            setUploadMeta({ fileName: '', description: '' });
            fetchBlockchainData();

        } catch (error) {
            console.error("Upload Error:", error);
            toast.error("Upload Failed.");
        }
        setIsUploading(false);
    };

    const handleAccessResponse = async (hospitalAddress, approve) => {
        try {
            if (approve) {
                const tx = await contract.grantAccess(hospitalAddress);
                await tx.wait();
            }
            await axios.post('/api/resolve-request', { patientAddress: account, hospitalAddress });
            fetchBlockchainData();
            toast.success(approve ? "Access Granted" : "Request Denied");
        } catch (error) {
            console.error("Access Error", error);
            toast.error("Transaction Failed");
        }
    };

    // --- UI COMPONENTS ---
    const MediVaultLogo = () => (
        <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 flex items-center justify-center">
                <div className="absolute inset-0 bg-blue-500 blur-md opacity-40"></div>
                <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-white relative z-10" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">MediVault</span>
        </div>
    );

    // If loading and no data yet
    if (!account) return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
            <div className="flex flex-col items-center gap-4">
                <Loader className="animate-spin text-blue-500" size={40} />
                <div className="font-mono text-sm text-slate-500">Restoring Secure Connection...</div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30 pb-20">
            <ToastContainer theme="dark" />

            {/* BACKGROUND GRID */}
            <div className="fixed inset-0 z-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            </div>

            {/* --- NAVBAR --- */}
            <nav className="fixed top-0 w-full h-20 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 z-40 px-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <MediVaultLogo />
                    <div className="hidden md:block w-px h-6 bg-white/10"></div>
                    <span className="hidden md:block text-xs font-semibold text-slate-500 tracking-widest uppercase">Patient Portal</span>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-mono text-slate-400">{account?.substring(0, 6)}...{account?.substring(38)}</span>
                    </div>
                    <button onClick={() => { navigate('/'); window.location.reload(); }} className="text-slate-500 hover:text-white transition"><LogOut size={20} /></button>
                </div>
            </nav>

            {/* --- MAIN CONTENT --- */}
            <main className="relative z-10 pt-32 px-6 max-w-7xl mx-auto space-y-8">

                {/* 1. HEADER & ACTIONS */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-light text-white mb-2">
                            {getGreeting()}, <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">{generalData.name}</span>
                        </h1>
                        <p className="text-slate-500 text-sm flex items-center gap-2">
                            <Shield size={14} className="text-green-500" />
                            Identity Verified • Vault Encrypted
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowUpdateModal(true)} className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition text-sm font-bold">
                            <Settings size={16} /> Edit Profile
                        </button>

                        {/* UPLOAD BUTTON */}
                        <label className="flex items-center gap-2 px-5 py-3 bg-blue-600 border border-blue-500 rounded-xl hover:bg-blue-500 transition text-sm font-bold cursor-pointer shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                            <Upload size={16} /> Upload Record
                            <input type="file" className="hidden" onChange={onFileSelect} />
                        </label>
                    </div>
                </div>

                {/* 2. PROFILE & VITALS GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ID CARD (Refined Layout) */}
                    <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-blue-500/20 transition duration-500">
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>

                        <div className="flex items-center gap-6 relative z-10">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl shrink-0">
                                <img src={getAvatar(generalData.gender)} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                            <div className="overflow-hidden flex-1">
                                <h3 className="text-2xl font-bold text-white truncate">{generalData.name}</h3>
                                <div className="flex gap-2 mt-3">
                                    {/* Increased text size and padding for better balance */}
                                    <span className="px-3 py-1 bg-white/10 rounded-md text-xs font-mono text-slate-300 uppercase tracking-wide">
                                        AGE: {generalData.age}
                                    </span>
                                    <span className="px-3 py-1 bg-white/10 rounded-md text-xs font-mono text-slate-300 uppercase tracking-wide">
                                        {generalData.gender || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/5 relative z-10">
                            <div>
                                <div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">Blood Type</div>
                                <div className="text-3xl font-light text-white">{emergencyData.blood}</div>
                            </div>
                            <div>
                                <div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">Contact</div>
                                <div className="text-3xl font-light text-white">{generalData.contact}</div>

                            </div>
                        </div>
                    </div>

                    {/* CRITICAL DATA */}
                    {/* CRITICAL DATA (With Hover Glow Effects) */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Allergies */}
                        <div className="bg-[#0F0505] border border-red-500/10 rounded-3xl p-6 relative overflow-hidden group transition hover:border-red-500/30">
                            <div className="absolute top-0 right-0 p-4 opacity-10 transition duration-500 group-hover:opacity-20 group-hover:scale-110">
                                <AlertTriangle size={64} className="text-red-500" />
                            </div>
                            <h3 className="text-red-400 text-sm font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
                                <Activity size={16} /> Allergies
                            </h3>
                            <div className="text-xl text-white font-medium pl-1">{emergencyData.allergies}</div>
                        </div>

                        {/* Chronic Conditions */}
                        <div className="bg-[#0F0A00] border border-yellow-500/10 rounded-3xl p-6 relative overflow-hidden group transition hover:border-yellow-500/30">
                            <div className="absolute top-0 right-0 p-4 opacity-10 transition duration-500 group-hover:opacity-20 group-hover:scale-110">
                                <Activity size={64} className="text-yellow-500" />
                            </div>
                            <h3 className="text-yellow-500 text-sm font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
                                <Activity size={16} /> Chronic Conditions
                            </h3>
                            <div className="text-xl text-white font-medium pl-1">{emergencyData.chronic}</div>
                        </div>

                        {/* NOTIFICATIONS */}
                        <div className="md:col-span-2 bg-[#0A0A0A] border border-white/5 rounded-3xl p-6">
                            <h3 className="text-slate-400 text-sm font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
                                <Bell size={16} className="text-blue-500" /> Access Requests
                            </h3>
                            {notifications.length === 0 ? (
                                <div className="text-slate-600 text-sm italic">No pending requests. Your vault is secure.</div>
                            ) : (
                                <div className="space-y-3">
                                    {notifications.map((req, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center"><Shield size={14} /></div>
                                                <div>
                                                    <div className="font-bold text-white text-sm">{req.hospitalName}</div>
                                                    <div className="text-[10px] font-mono text-slate-500">{req.hospitalAddress}</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleAccessResponse(req.hospitalAddress, true)} className="px-3 py-1 bg-green-500/10 text-green-500 text-xs font-bold rounded hover:bg-green-500/20">Accept</button>
                                                <button onClick={() => handleAccessResponse(req.hospitalAddress, false)} className="px-3 py-1 bg-red-500/10 text-red-500 text-xs font-bold rounded hover:bg-red-500/20">Deny</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. SPLIT VIEW: TIMELINE & VAULTS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-white/5">

                    {/* LEFT: HEALTH TIMELINE */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">Health Timeline</h3>
                            <span className="text-xs text-slate-500 font-mono">HISTORY</span>
                        </div>

                        <div className="relative border-l-2 border-white/10 ml-3 space-y-8 pl-8 py-2 min-h-[300px]">
                            {allRecords.length === 0 ? (
                                <p className="text-slate-500 text-sm">No history recorded yet.</p>
                            ) : (
                                allRecords.map((rec, i) => (
                                    <div key={i} className="relative">
                                        {/* Dot Alignment Fixed */}
                                        <div className={`absolute -left-[40.5px] top-1.5 w-4 h-4 rounded-full border-4 border-[#050505] ${rec.category === 'Patient Upload' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                                        <div className="text-xs text-slate-500 mb-1 font-mono">{rec.formattedDate}</div>
                                        <div className="bg-[#0A0A0A] border border-white/5 p-4 rounded-xl hover:bg-white/5 transition">
                                            <h4 className="text-white font-bold">{rec.fileName}</h4>
                                            <p className="text-slate-500 text-xs mt-1 uppercase tracking-wider">{rec.category}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* RIGHT: SPLIT VAULTS */}
                    <div className="space-y-8">

                        {/* A. HOSPITAL RECORDS */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Shield size={20} className="text-blue-500" /> Medical Records
                                </h3>
                                <span className="text-xs text-blue-500 font-mono">VERIFIED HOSPITAL</span>
                            </div>
                            <div className="bg-[#0A0A0A] border border-blue-500/10 rounded-3xl p-6">
                                {doctorRecords.length === 0 ? (
                                    <p className="text-slate-500 text-sm italic">No hospital records found.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {doctorRecords.map((rec, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center"><FileText size={18} /></div>
                                                    <div>
                                                        <div className="font-bold text-white text-sm">{rec.fileName}</div>
                                                        <div className="text-[10px] font-mono text-slate-500">{rec.formattedDate}</div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    {/* AI Analysis Button */}
                                                    <button
                                                        onClick={() => handleAnalyzeReport(rec.cID, rec.category)}
                                                        className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition duration-300 group-hover:scale-110"
                                                        title="Analyze with AI"
                                                    >
                                                        <Sparkles size={18} />
                                                    </button>

                                                    {/* View Document Button */}
                                                    <a href={rec.url} target="_blank" rel="noreferrer" className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition">
                                                        <ExternalLink size={18} />
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* B. MY UPLOADS */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <User size={20} className="text-purple-500" /> My Uploads
                                </h3>
                                <span className="text-xs text-purple-500 font-mono">SELF UPLOADED</span>
                            </div>
                            <div className="bg-[#0A0A0A] border border-purple-500/10 rounded-3xl p-6">
                                {patientRecords.length === 0 ? (
                                    <p className="text-slate-500 text-sm italic">You haven't uploaded any files.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {patientRecords.map((rec, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-purple-500/10 text-purple-500 rounded-lg flex items-center justify-center"><File size={18} /></div>
                                                    <div>
                                                        <div className="font-bold text-white text-sm">{rec.fileName}</div>
                                                        <div className="text-[10px] font-mono text-slate-500">{rec.formattedDate}</div>
                                                    </div>
                                                </div>
                                                <a href={rec.url} target="_blank" rel="noreferrer" className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition"><ExternalLink size={18} /></a>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                </div>

            </main>

            {/* --- MODALS --- */}

            {/* 1. EDIT PROFILE MODAL */}
            {showUpdateModal && (
                <UpdateProfileModal
                    onClose={() => setShowUpdateModal(false)}
                    onUpdateSuccess={fetchBlockchainData}
                />
            )}

            {/* 2. UPLOAD FILE MODAL */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
                        <button onClick={() => { setShowUploadModal(false); setSelectedFile(null); }} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>

                        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                            <Upload size={20} className="text-blue-500" /> Upload Record
                        </h3>

                        <div className="space-y-4">
                            <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex items-center gap-3">
                                <FileText className="text-blue-500" size={24} />
                                <div className="overflow-hidden">
                                    <p className="text-sm text-slate-300 font-bold truncate">{selectedFile?.name}</p>
                                    <p className="text-xs text-slate-500">{(selectedFile?.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs uppercase text-slate-500 font-bold mb-2 block">Document Title</label>
                                <input
                                    type="text"
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none placeholder:text-slate-700"
                                    placeholder="e.g. MRI Scan Results"
                                    value={uploadMeta.fileName}
                                    onChange={(e) => setUploadMeta({ ...uploadMeta, fileName: e.target.value })}
                                    autoFocus
                                />
                            </div>

                            <button
                                onClick={handleConfirmUpload}
                                disabled={isUploading || !uploadMeta.fileName}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                {isUploading ? <Loader className="animate-spin" /> : "Confirm & Mint"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. AI ANALYSIS MODAL */}
      {showAIModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
           <div className="bg-[#0A0A0A] border border-blue-500/30 w-full max-w-2xl rounded-2xl shadow-[0_0_50px_rgba(59,130,246,0.2)] overflow-hidden flex flex-col max-h-[80vh]">
               
               {/* Modal Header */}
               <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-blue-900/20 to-transparent">
                   <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                           <Bot size={24} className="text-white" />
                       </div>
                       <div>
                           <h3 className="text-xl font-bold text-white">MediVault AI</h3>
                           <p className="text-xs text-blue-400 font-mono uppercase tracking-wider">Automated Diagnosis Assistant</p>
                       </div>
                   </div>
                   <button onClick={() => setShowAIModal(false)} className="text-slate-500 hover:text-white transition"><X size={24}/></button>
               </div>

               {/* Modal Content */}
               <div className="p-8 overflow-y-auto custom-scrollbar">
                   {isAnalyzing ? (
                       <div className="flex flex-col items-center justify-center py-12 space-y-6">
                           <div className="relative w-20 h-20">
                               <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
                               <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                               <Sparkles className="absolute inset-0 m-auto text-blue-400 animate-pulse" size={24}/>
                           </div>
                           <p className="text-slate-400 animate-pulse font-mono text-sm text-center">
                               Running Clinical Analysis Models...
                           </p>
                       </div>
                   ) : (
                       <div className="prose prose-invert max-w-none">
                           <div className="bg-white/5 rounded-xl p-6 border border-white/5 text-slate-300 leading-relaxed whitespace-pre-wrap font-sans text-sm md:text-base">
                               {aiResult}
                           </div>
                       </div>
                   )}
               </div>

               {/* Modal Footer */}
               <div className="p-4 border-t border-white/10 bg-[#050505] flex justify-between items-center text-xs text-slate-500 font-mono">
                   <span>CONFIDENTIAL REPORT</span>
               </div>
           </div>
        </div>
      )}

        </div>
    );
};

export default UserSiteHomepage;