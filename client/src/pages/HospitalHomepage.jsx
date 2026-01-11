import React, { useState, useContext, useEffect } from 'react';
import { WalletContext } from '../context/WalletContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  Activity, FileText, Search, ShieldAlert, Lock, LogOut, 
  ExternalLink, Loader, User, Shield, AlertTriangle, Upload, X, File
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

  // --- 1. SEARCH PATIENT ---
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!contract || !searchAddress) return;
    setLoading(true); setPatientData(null); setAccessStatus('unknown');

    try {
      const isRegistered = await contract.registeredPatients(searchAddress);
      if (!isRegistered) { 
          toast.error("Patient not found on blockchain."); 
          setLoading(false); 
          return; 
      }

      // Check Access
      const hasAccess = await contract.permitted(searchAddress, account);
      if (hasAccess) {
        setAccessStatus('granted');
        fetchPatientDetails(searchAddress);
      } else {
        setAccessStatus('denied');
      }
    } catch (error) { console.error("Search Error:", error); }
    setLoading(false);
  };

  // --- 2. FETCH DETAILS ---
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

      // Fetch Reports & Fix Data
      const reports = await contract.getReports(patientAddress);
      const processed = reports.map(r => {
        // Handle "Category||Title" logic
        let cat = r.category || "General";
        let title = r.fileName || "Medical Record";
        
        if (cat.includes("||")) {
            const parts = cat.split("||");
            cat = parts[0];
            title = parts[1];
        }

        return {
            fileName: title,
            category: cat,
            cID: r.cID,
            url: `https://gateway.pinata.cloud/ipfs/${r.cID}`,
            formattedDate: new Date(Number(r.timeStamp) * 1000).toLocaleDateString()
        };
      });

      setPatientReports(processed.reverse());
    } catch (error) { toast.error("Could not fetch patient data."); }
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

  // --- 4. UPLOAD LOGIC ---
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
        
        // Packing Title into Category for consistency
        const packedCategory = `${uploadMeta.category}||${uploadMeta.title}`;

        // Contract Call: addReport(patientAddress, cid, time, category)
        const tx = await contract.addReport(searchAddress, ipfsHash, timestamp, packedCategory);
        await tx.wait();

        toast.success("Report Added to Patient Vault!");
        setShowUploadModal(false);
        fetchPatientDetails(searchAddress); // Refresh
    } catch (error) {
        console.error(error);
        toast.error("Upload Failed");
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

  // --- UI COMPONENT: LOGO (Blue Version) ---
  const MediVaultLogo = () => (
    <div className="flex items-center gap-3">
      <div className="relative w-8 h-8 flex items-center justify-center">
        <div className="absolute inset-0 bg-blue-500 blur-md opacity-40"></div>
        <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-white relative z-10" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span className="text-xl font-bold tracking-tight text-white">MediVault <span className="text-base font-semibold text-slate-500 ml-1">| Doctor Portal</span></span>
    </div>
  );

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30 pb-20">
      <ToastContainer theme="dark" />

      {/* NAVBAR */}
      <nav className="fixed top-0 w-full px-8 py-6 flex justify-between items-center z-40 bg-[#050505]/80 backdrop-blur-md border-b border-white/5">
        <MediVaultLogo />
        <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-mono text-slate-400">{account?.substring(0,6)}...</span>
            </div>
            <button onClick={() => { navigate('/'); window.location.reload(); }} className="text-slate-500 hover:text-white transition"><LogOut size={20} /></button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="relative z-10 pt-32 px-6 max-w-6xl mx-auto">
        
        {/* SEARCH BAR (Blue Theme) */}
        <div className="mb-12">
            <h1 className="text-3xl font-light text-center mb-8 text-slate-300">Access Patient Vault</h1>
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative group">
                <div className="absolute inset-0 bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
                <div className="relative flex items-center bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden p-2 transition focus-within:border-blue-500/50">
                    <Search className="ml-4 text-slate-500" size={20} />
                    <input 
                        type="text" 
                        placeholder="Enter Patient Wallet Address (0x...)" 
                        className="w-full bg-transparent text-white font-mono px-4 py-3 outline-none placeholder:text-slate-600"
                        value={searchAddress}
                        onChange={(e) => setSearchAddress(e.target.value)}
                    />
                    <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition flex items-center gap-2">
                        {loading ? <Loader className="animate-spin" size={16}/> : "Search"}
                    </button>
                </div>
            </form>
        </div>

        {/* STATE: ACCESS DENIED */}
        {accessStatus === 'denied' && (
            <div className="max-w-lg mx-auto bg-[#0F0505] border border-red-500/20 rounded-3xl p-12 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock size={40} className="text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
                <p className="text-slate-500 mb-8">This patient has not granted you permission to view their medical records.</p>
                <button onClick={handleRequestAccess} className="bg-white text-black font-bold px-8 py-4 rounded-xl hover:scale-105 transition flex items-center gap-2 mx-auto">
                    <ShieldAlert size={20} /> Request Permission
                </button>
            </div>
        )}

        {/* STATE: ACCESS GRANTED (DASHBOARD) */}
        {accessStatus === 'granted' && patientData && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* 1. PATIENT HEADER GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    
                    {/* ID CARD */}
                    <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-blue-500/20 transition duration-500">
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
                        <div className="flex items-center gap-6 relative z-10">
                            <img src={getAvatar(patientData.gender)} className="w-24 h-24 rounded-2xl object-cover border-2 border-white/10 shadow-2xl" alt="Patient"/>
                            <div>
                                <h2 className="text-2xl font-bold text-white">{patientData.name}</h2>
                                <div className="flex gap-2 mt-2">
                                    <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-[10px] font-bold border border-green-500/20">ACCESS GRANTED</span>
                                    <span className="px-2 py-1 bg-white/10 text-slate-300 rounded text-[10px] uppercase">{patientData.gender}</span>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/5 relative z-10">
                            <div><div className="text-[10px] text-slate-500 font-bold tracking-wider">AGE</div><div className="text-xl text-white">{patientData.age}</div></div>
                            <div><div className="text-[10px] text-slate-500 font-bold tracking-wider">BLOOD</div><div className="text-xl text-white">{patientData.blood}</div></div>
                        </div>
                    </div>

                    {/* CRITICAL DATA */}
                    <div className="lg:col-span-2 grid grid-cols-2 gap-6">
                        <div className="bg-[#0F0505] border border-red-500/10 rounded-3xl p-6 relative overflow-hidden group transition hover:border-red-500/30">
                             <AlertTriangle className="absolute top-4 right-4 text-red-500/10 group-hover:scale-110 group-hover:text-red-500/20 transition duration-500" size={60} />
                             <h3 className="text-red-400 text-sm font-bold uppercase mb-2 tracking-widest flex items-center gap-2"><Activity size={16}/> Allergies</h3>
                             <div className="text-xl text-white font-medium">{patientData.allergies}</div>
                        </div>
                        <div className="bg-[#0F0A00] border border-yellow-500/10 rounded-3xl p-6 relative overflow-hidden group transition hover:border-yellow-500/30">
                             <Activity className="absolute top-4 right-4 text-yellow-500/10 group-hover:scale-110 group-hover:text-yellow-500/20 transition duration-500" size={60} />
                             <h3 className="text-yellow-500 text-sm font-bold uppercase mb-2 tracking-widest flex items-center gap-2"><Activity size={16}/> Conditions</h3>
                             <div className="text-xl text-white font-medium">{patientData.chronic}</div>
                        </div>
                    </div>
                </div>

                {/* 2. ACTIONS & RECORDS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* UPLOAD PANEL */}
                    <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-6 h-fit">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Upload size={20} className="text-blue-500"/> Add Record
                        </h3>
                        <button 
                            onClick={() => setShowUploadModal(true)}
                            className="w-full py-8 border-2 border-dashed border-blue-500/30 rounded-2xl hover:bg-blue-500/5 hover:border-blue-500/50 transition flex flex-col items-center justify-center gap-3 group"
                        >
                            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center group-hover:scale-110 transition shadow-[0_0_15px_rgba(59,130,246,0.2)]"><Upload className="text-blue-500"/></div>
                            <span className="text-sm text-blue-400 font-bold">Upload New Report</span>
                        </button>
                    </div>

                    {/* RECORDS LIST */}
                    <div className="lg:col-span-2 space-y-4">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <FileText className="text-slate-500" size={20}/> Patient History
                        </h3>
                        {patientReports.length === 0 ? (
                            <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl text-slate-500">
                                <FileText size={40} className="mx-auto mb-4 opacity-50"/>
                                <p>No medical records found for this patient.</p>
                            </div>
                        ) : (
                            patientReports.map((rec, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:border-blue-500/30 transition group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition"><FileText size={18}/></div>
                                        <div>
                                            <div className="font-bold text-white text-sm">{rec.fileName}</div>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300 font-mono uppercase tracking-wider">{rec.category}</span>
                                                <span className="text-[10px] text-slate-500 font-mono">{rec.formattedDate}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <a href={rec.url} target="_blank" rel="noreferrer" className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition"><ExternalLink size={18}/></a>
                                </div>
                            ))
                        )}
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
                   {/* File Input */}
                   <div className="relative group">
                       <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                       <div className="w-full py-4 border border-white/10 rounded-xl bg-white/5 flex items-center justify-center gap-2 text-slate-400 group-hover:border-blue-500/50 group-hover:text-white transition">
                           <Upload size={16} /> 
                           {selectedFile ? selectedFile.name : "Click to Select File"}
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