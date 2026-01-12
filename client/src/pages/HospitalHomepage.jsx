import React, { useState, useContext, useEffect } from 'react';
import { WalletContext } from '../context/WalletContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  Activity, FileText, Search, ShieldAlert, Lock, LogOut, 
  ExternalLink, Loader, User, Shield, AlertTriangle, Upload, X, File, CheckCircle
} from 'lucide-react';

const HospitalHomepage = () => {
  const { account, contract } = useContext(WalletContext);
  const navigate = useNavigate();

  // State
  const [searchAddress, setSearchAddress] = useState('');
  const [patientData, setPatientData] = useState(null);
  const [patientReports, setPatientReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accessStatus, setAccessStatus] = useState('unknown'); // unknown | granted | denied
  const [doctorRecords, setDoctorRecords] = useState([]);
  const [patientRecords, setPatientRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  
  // Hospital Profile State (To fix the "Missing Name" issue)
  const [hospitalName, setHospitalName] = useState("Unknown Clinic");

  // Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMeta, setUploadMeta] = useState({ title: '', category: 'Lab Report' });
  const [isUploading, setIsUploading] = useState(false);

  // --- 0. FETCH HOSPITAL PROFILE ON LOAD ---
  useEffect(() => {
    const fetchHospitalProfile = async () => {
        if(!account) return;
        try {
            // Attempt to get the name we saved during registration
            const res = await axios.post('/api/get-user-name', { walletAddress: account });
            if (res.data && res.data.name) {
                setHospitalName(res.data.name);
            }
        } catch (error) {
            console.error("Could not fetch hospital name", error);
            // Fallback if backend fetch fails
            setHospitalName("Authorized Medical Center");
        }
    };
    fetchHospitalProfile();
  }, [account]);

// --- 1. SEARCH PATIENT (Fixed ENS Error) ---
  const handleSearch = async (e) => {
    e.preventDefault();
    
    // 1. Sanitize Input (Remove spaces)
    const targetAddress = searchAddress.trim();

    if (!contract || !targetAddress) return;
    
    // 2. Simple Validation (Must start with 0x and be 42 chars)
    if (!targetAddress.startsWith("0x") || targetAddress.length !== 42) {
        toast.error("Invalid Wallet Address format");
        return;
    }

    setLoading(true); setPatientData(null); setAccessStatus('unknown');

    try {
      const isRegistered = await contract.registeredPatients(targetAddress);
      if (!isRegistered) { 
          toast.error("Patient not found on blockchain."); 
          setLoading(false); 
          return; 
      }

      const hasAccess = await contract.permitted(targetAddress, account);
      if (hasAccess) {
        setAccessStatus('granted');
        fetchPatientDetails(targetAddress);
      } else {
        setAccessStatus('denied');
      }
    } catch (error) { 
        console.error("Search Error:", error);
        toast.error("Connection Error. Check console.");
    }
    setLoading(false);
  };

// --- 2. FETCH DETAILS (Updated: Splits Records for Timeline) ---
  const fetchPatientDetails = async (patientAddress) => {
    try {
      const data = await contract.patients(patientAddress);
      setPatientData({
        name: data[0],
        gender: data[1],
        age: data[2].toString(),
        contact: data[3].toString(),
        blood: data[4] || "N/A",
        allergies: data[5] || "None",
        chronic: data[7] || "None"
      });

      const reports = await contract.getReports(patientAddress);
      
      const docs = [];
      const pats = [];
      const timeline = [];

      reports.forEach(r => {
        // Unpack "Category||Title"
        let cat = r.category || "General";
        let title = r.fileName || "Medical Record";
        
        if (cat.includes("||")) {
            const parts = cat.split("||");
            cat = parts[0];
            title = parts[1];
        }

        const timestamp = Number(r.timeStamp);
        const dateString = timestamp > 0 ? new Date(timestamp * 1000).toLocaleDateString() : "Invalid Date";

        const recordObj = {
            fileName: title,
            category: cat,
            cID: r.cID,
            url: `https://gateway.pinata.cloud/ipfs/${r.cID}`,
            formattedDate: dateString,
            rawTime: timestamp
        };

        timeline.push(recordObj);

        // Split Logic
        if (cat === "Patient Upload") {
            pats.push(recordObj);
        } else {
            docs.push(recordObj);
        }
      });

      // Sort Newest First
      timeline.sort((a, b) => b.rawTime - a.rawTime);

      setDoctorRecords(docs);
      setPatientRecords(pats);
      setAllRecords(timeline);

    } catch (error) { toast.error("Could not fetch patient data."); }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning:";
    if (hour < 18) return "Good Afternoon:";
    return "Good Evening:";
  };

  // --- 3. REQUEST ACCESS (Fixed: Sends Name) ---
  const handleRequestAccess = async () => {
    try {
      await axios.post('/api/request-access', { 
          patientAddress: searchAddress, 
          hospitalAddress: account,
          hospitalName: hospitalName // <--- SENDING THE NAME NOW
      });
      toast.success("Access Request Sent!");
    } catch (error) { toast.error("Failed to send request."); }
  };

// --- 4. UPLOAD LOGIC (Fixed ENS Error) ---
  const handleConfirmUpload = async () => {
    if (!selectedFile || !patientData) return;
    setIsUploading(true);
    try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const res = await axios.post('/api/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        const ipfsHash = res.data.ipfsHash;
        const timestamp = Math.floor(Date.now() / 1000).toString();
        
        const packedCategory = `${uploadMeta.category}||${uploadMeta.title}`;

        // CRITICAL FIX: Added .trim() to remove invisible spaces
        const targetAddress = searchAddress.trim();

        // Contract Call
        const tx = await contract.addReport(targetAddress, ipfsHash, timestamp, packedCategory);
        await tx.wait();

        toast.success("Report Added to Patient Vault!");
        setShowUploadModal(false);
        fetchPatientDetails(targetAddress); // Refresh using the clean address
    } catch (error) {
        console.error(error);
        toast.error("Upload Failed. Check console.");
    }
    setIsUploading(false);
  };

  // Helper for Avatar
  const getAvatar = (gender) => {
    const g = gender ? gender.toLowerCase() : '';
    if (g === 'male') return "/joel.jpg"; 
    if (g === 'female') return "/ellie.jpg"; 
    return "/new.jpg"; 
  };

// --- UI COMPONENT: LOGO (Matches Patient Portal) ---
  const MediVaultLogo = () => (
    <div className="flex items-center gap-3">
      <div className="relative w-8 h-8 flex items-center justify-center">
        <div className="absolute inset-0 bg-blue-500 blur-md opacity-40"></div>
        <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-white relative z-10" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span className="text-xl font-bold tracking-tight text-white">MediVault</span>
    </div>
  );

  // --- RENDER ---
 return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30 pb-20">
      <ToastContainer theme="dark" />

{/* NAVBAR */}
      <nav className="fixed top-0 w-full px-8 py-6 flex justify-between items-center z-40 bg-[#050505]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-4">
           <MediVaultLogo />
           {/* The Aesthetic Vertical Divider & Text */}
           <div className="hidden md:block w-px h-6 bg-white/10"></div>
           <span className="hidden md:block text-xs font-semibold text-slate-500 tracking-widest uppercase">Doctor Portal</span>
        </div>

        <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-mono text-slate-400">{account?.substring(0,6)}...{account?.substring(38)}</span>
            </div>
            <button onClick={() => { navigate('/'); window.location.reload(); }} className="text-slate-500 hover:text-white transition"><LogOut size={20} /></button>
         </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="relative z-10 pt-32 px-6 max-w-7xl mx-auto space-y-12">
        
        {/* --- SECTION A: SEARCH BAR (Centered Top) --- */}
        <div className="w-full max-w-3xl mx-auto">
<h2 className="text-3xl md:text-4xl font-light text-center mb-10 tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500">
                Access Patient Vault
            </h2>
            <form onSubmit={handleSearch} className="relative group">
                <div className="absolute -inset-1 bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-50 transition duration-500"></div>
                <div className="relative flex items-center bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden transition focus-within:border-blue-500/50">
                    <Search className="ml-5 text-blue-500" size={20} />
                    <input 
                        type="text" 
                        placeholder="Enter Patient Wallet Address" 
                        className="w-full bg-transparent text-white font-mono px-4 py-4 outline-none placeholder:text-slate-600 text-sm md:text-base"
                        value={searchAddress}
                        onChange={(e) => setSearchAddress(e.target.value)}
                    />
                    <button type="submit" disabled={loading} className="mr-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-900/20 flex items-center gap-2">
                        {loading ? <Loader className="animate-spin" size={18}/> : "Search"}
                    </button>
                </div>
            </form>
        </div>

        {/* --- SECTION B: HEADER & ACTIONS (Matches Patient Style) --- */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-8">
            {/* Left: Greeting */}
            <div>
                <h1 className="text-4xl md:text-5xl font-light text-white mb-2">
                    {getGreeting()} <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">{hospitalName}</span>
                </h1>
                <p className="text-slate-500 text-sm flex items-center gap-2">
                    <Shield size={14} className="text-green-500" /> 
                    Authorized Medical Node • Vault Encrypted
                </p>
            </div>

            {/* Right: Actions (Only visible if patient loaded) */}
            <div className="flex gap-3">
                {accessStatus === 'granted' && (
                    <>
                        <div className="flex items-center gap-2 px-5 py-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-sm font-bold cursor-default shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                            <CheckCircle size={16} /> Access Granted
                        </div>
                        <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 px-5 py-3 bg-blue-600 border border-blue-500 rounded-xl hover:bg-blue-500 transition text-sm font-bold shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                            <Upload size={16} /> Upload Record
                        </button>
                    </>
                )}
                {/* Placeholder button so header doesn't look empty when no patient */}
                {accessStatus !== 'granted' && (
                    <div className="px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-500 text-sm font-bold cursor-not-allowed">
                        Waiting for Input...
                    </div>
                )}
            </div>
        </div>

        {/* --- SECTION C: CONTENT AREA --- */}
        
        {/* 1. STATE: ACCESS DENIED */}
        {accessStatus === 'denied' && (
            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                    <Lock size={40} className="text-red-500" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Access Restricted</h2>
                <p className="text-slate-500 mb-8 text-center max-w-md">The patient at <span className="font-mono text-slate-400">{searchAddress}</span> has not granted you permission to view their vault.</p>
                <button onClick={handleRequestAccess} className="bg-white text-black font-bold px-8 py-4 rounded-xl hover:scale-105 transition flex items-center gap-2 shadow-xl">
                    <ShieldAlert size={20} /> Request Permission
                </button>
            </div>
        )}

        {/* 2. STATE: NO PATIENT (Initial View) */}
        {accessStatus === 'unknown' && (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <Search size={64} className="text-slate-700 mb-4" />
                <p className="text-slate-500 text-lg">Enter a Wallet Address above to access records.</p>
            </div>
        )}

        {/* 3. STATE: DASHBOARD (Access Granted) */}
        {accessStatus === 'granted' && patientData && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
                
                {/* PROFILE & VITALS GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* ID CARD */}
                    <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-blue-500/20 transition duration-500">
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
                        <div className="flex items-center gap-6 relative z-10">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl shrink-0">
                                <img src={getAvatar(patientData.gender)} className="w-full h-full object-cover" alt="Patient"/>
                            </div>
                            <div className="overflow-hidden flex-1">
                                <h3 className="text-2xl font-bold text-white truncate">{patientData.name}</h3>
                                <div className="flex gap-2 mt-3">
                                    <span className="px-3 py-1 bg-white/10 rounded-md text-xs font-mono text-slate-300 uppercase tracking-wide">AGE: {patientData.age}</span>
                                    <span className="px-3 py-1 bg-white/10 rounded-md text-xs font-mono text-slate-300 uppercase tracking-wide">{patientData.gender}</span>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/5 relative z-10">
                            <div><div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">Blood Type</div><div className="text-3xl font-light text-white">{patientData.blood}</div></div>
                            <div><div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">Contact</div><div className="text-3xl font-light text-white">{patientData.contact}</div></div>
                        </div>
                    </div>

                    {/* CRITICAL DATA */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[#0F0505] border border-red-500/10 rounded-3xl p-6 relative overflow-hidden group transition hover:border-red-500/30">
                             <div className="absolute top-0 right-0 p-4 opacity-10 transition duration-500 group-hover:opacity-20 group-hover:scale-110"><AlertTriangle size={64} className="text-red-500" /></div>
                             <h3 className="text-red-400 text-sm font-bold uppercase mb-4 tracking-widest flex items-center gap-2"><Activity size={16}/> Allergies</h3>
                             <div className="text-xl text-white font-medium pl-1">{patientData.allergies}</div>
                        </div>
                        <div className="bg-[#0F0A00] border border-yellow-500/10 rounded-3xl p-6 relative overflow-hidden group transition hover:border-yellow-500/30">
                             <div className="absolute top-0 right-0 p-4 opacity-10 transition duration-500 group-hover:opacity-20 group-hover:scale-110"><Activity size={64} className="text-yellow-500" /></div>
                             <h3 className="text-yellow-500 text-sm font-bold uppercase mb-4 tracking-widest flex items-center gap-2"><Activity size={16}/> Chronic Conditions</h3>
                             <div className="text-xl text-white font-medium pl-1">{patientData.chronic}</div>
                        </div>
                    </div>
                </div>

                {/* TIMELINE & VAULTS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                    {/* TIMELINE */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">Health Timeline</h3>
                            <span className="text-xs text-slate-500 font-mono">HISTORY</span>
                        </div>
                        <div className="relative border-l-2 border-white/10 ml-3 space-y-8 pl-8 py-2 min-h-[300px]">
                            {allRecords.length === 0 ? <p className="text-slate-500 text-sm">No history recorded.</p> : allRecords.map((rec, i) => (
                                <div key={i} className="relative">
                                    <div className={`absolute -left-[40.5px] top-1.5 w-4 h-4 rounded-full border-4 border-[#050505] ${rec.category === 'Patient Upload' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                                    <div className="text-xs text-slate-500 mb-1 font-mono">{rec.formattedDate}</div>
                                    <div className="bg-[#0A0A0A] border border-white/5 p-4 rounded-xl hover:bg-white/5 transition group cursor-default">
                                        <h4 className="text-white font-bold group-hover:text-blue-400 transition">{rec.fileName}</h4>
                                        <p className="text-slate-500 text-xs mt-1 uppercase tracking-wider">{rec.category}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* VAULTS */}
                    <div className="space-y-8">
                        {/* Hospital Records */}
                        <div>
                             <div className="flex items-center justify-between mb-4"><h3 className="text-xl font-bold text-white flex items-center gap-2"><Shield size={20} className="text-blue-500"/> Medical Records</h3><span className="text-xs text-blue-500 font-mono">VERIFIED HOSPITAL</span></div>
                             <div className="bg-[#0A0A0A] border border-blue-500/10 rounded-3xl p-6">
                                {doctorRecords.length === 0 ? <p className="text-slate-500 text-sm italic">No hospital records found.</p> : (
                                    <div className="space-y-3">
                                        {doctorRecords.map((rec, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:border-blue-500/30 transition">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center"><FileText size={18}/></div>
                                                    <div><div className="font-bold text-white text-sm">{rec.fileName}</div><div className="text-[10px] font-mono text-slate-500">{rec.formattedDate}</div></div>
                                                </div>
                                                <a href={rec.url} target="_blank" rel="noreferrer" className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition"><ExternalLink size={18}/></a>
                                            </div>
                                        ))}
                                    </div>
                                )}
                             </div>
                        </div>
                        {/* Patient Uploads */}
                        <div>
                             <div className="flex items-center justify-between mb-4"><h3 className="text-xl font-bold text-white flex items-center gap-2"><User size={20} className="text-purple-500"/> Patient Uploads</h3><span className="text-xs text-purple-500 font-mono">SELF UPLOADED</span></div>
                             <div className="bg-[#0A0A0A] border border-purple-500/10 rounded-3xl p-6">
                                {patientRecords.length === 0 ? <p className="text-slate-500 text-sm italic">No patient uploads found.</p> : (
                                    <div className="space-y-3">
                                        {patientRecords.map((rec, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:border-purple-500/30 transition">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-purple-500/10 text-purple-500 rounded-lg flex items-center justify-center"><File size={18}/></div>
                                                    <div><div className="font-bold text-white text-sm">{rec.fileName}</div><div className="text-[10px] font-mono text-slate-500">{rec.formattedDate}</div></div>
                                                </div>
                                                <a href={rec.url} target="_blank" rel="noreferrer" className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition"><ExternalLink size={18}/></a>
                                            </div>
                                        ))}
                                    </div>
                                )}
                             </div>
                        </div>
                    </div>
                </div>

            </div>
        )}
      </main>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-md rounded-2xl p-6 relative shadow-2xl">
               <button onClick={() => setShowUploadModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20}/></button>
               <h3 className="text-xl font-bold mb-6 text-white">Upload Medical Record</h3>
               
               <div className="space-y-4">
                   <div className="relative group">
                       <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                       <div className="w-full py-8 border-2 border-dashed border-white/10 rounded-xl bg-white/5 flex flex-col items-center justify-center gap-2 text-slate-400 group-hover:border-blue-500/50 group-hover:text-white transition">
                           <Upload size={24} className="mb-2"/> 
                           <span className="text-sm font-bold">{selectedFile ? selectedFile.name : "Click to Select File"}</span>
                       </div>
                   </div>
                   
                   <input type="text" placeholder="Document Title (e.g. X-Ray Chest)" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none" 
                     value={uploadMeta.title} onChange={(e) => setUploadMeta({...uploadMeta, title: e.target.value})} />
                   
                   <div className="relative">
                        <select className="w-full appearance-none bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                            value={uploadMeta.category} onChange={(e) => setUploadMeta({...uploadMeta, category: e.target.value})}>
                            <option>Lab Report</option><option>Prescription</option><option>X-Ray / Scan</option><option>Diagnosis</option><option>Vaccination</option>
                        </select>
                        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"><Search size={14} className="rotate-90"/></div>
                   </div>

                   <button onClick={handleConfirmUpload} disabled={isUploading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl mt-2 flex justify-center transition">
                       {isUploading ? <Loader className="animate-spin"/> : "Mint to Blockchain"}
                   </button>
               </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default HospitalHomepage;