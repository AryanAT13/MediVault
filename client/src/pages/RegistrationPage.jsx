import React, { useState, useContext, useEffect } from 'react';
import { WalletContext } from '../context/WalletContext';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import axios from 'axios';
import 'react-toastify/dist/ReactToastify.css';
import {
  ArrowRight, Shield, Database, Cpu, Activity,
  CheckCircle, Zap, Globe, Lock, FileText,
  X, Loader
} from 'lucide-react';

const RegistrationPage = () => {
  const { connectWallet, account, contract } = useContext(WalletContext);
  const navigate = useNavigate();

  // Registration State
  const [showRegModal, setShowRegModal] = useState(false);
  const [userType, setUserType] = useState('patient');
  const [formData, setFormData] = useState({ name: '', age: '', gender: 'Male', contact: '' });
  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);

// --- 1. AUTO-LOGIN & PERSISTENCE LOGIC ---
  
  // A. Check if wallet is ALREADY connected on page load
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          // Ask MetaMask if we are already trusted
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            // If yes, silently connect so the button updates to "Enter Dashboard"
            connectWallet(); 
          }
        } catch (err) {
          console.error("Auto-connect failed", err);
        }
      }
    };
    checkConnection();
  }, []);


  const checkIfUserExists = async () => {
    setCheckingUser(true);
    try {
      const isPatient = await contract.registeredPatients(account);
      if (isPatient) {
        toast.success("Welcome back, Patient!");
        navigate('/userpage');
        return;
      }
      const isHospital = await contract.registeredHospitals(account);
      if (isHospital) {
        toast.success("Welcome back, Doctor!");
        navigate('/hospitalpage');
        return;
      }
      setCheckingUser(false);
      setShowRegModal(true);
    } catch (error) {
      console.error("Login Check Failed:", error);
      setCheckingUser(false);
    }
  };

  // New handler for the Hero Button
  const handleHeroBtnClick = () => {
    if (!account) {
      connectWallet();
    } else {
      // If already connected, NOW we check registration to direct them
      checkIfUserExists();
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!contract) return toast.error("Wallet not connected!");
    setLoading(true);
    try {
      let tx;
      if (userType === 'patient') {
        tx = await contract.registerPatient(formData.name, Number(formData.age), formData.gender, Number(formData.contact));
      } else {
        tx = await contract.registerHospital();
      }
      await tx.wait();
      await axios.post('/api/register', { walletAddress: account, userType: userType });
      toast.success("Identity Created Successfully!");
      navigate(userType === 'patient' ? '/userpage' : '/hospitalpage');
    } catch (error) {
      console.error(error);
      toast.error("Registration Failed: " + (error.reason || error.message));
    }
    setLoading(false);
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

  // UPDATED: Aesthetically Pleasing Tech Badge
  const TechBadge = ({ icon: Icon, text }) => (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 transition cursor-default backdrop-blur-md">
      <Icon size={14} className="text-blue-400" />
      <span className="text-[10px] font-bold tracking-[0.2em] text-slate-300 uppercase font-sans">{text}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30 overflow-x-hidden font-sans">
      <ToastContainer theme="dark" />
      
      {/* CSS FOR ANIMATIONS */}
      <style>{`
      @keyframes moveX { 0% { left: 0; } 50% { left: 100%; } 100% { left: 0; } }
        @keyframes moveY { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }
        .bouncing-orb-container { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
        .bouncing-orb-x { position: absolute; width: 100%; height: 100%; animation: moveX 20s linear infinite; }
        /* Brighter, larger, mix-blend-mode for glow */
        .bouncing-orb-y { position: absolute; width: 500px; height: 500px; background: radial-gradient(circle, rgba(59,130,246,0.3) 0%, rgba(0,0,0,0) 70%); border-radius: 50%; animation: moveY 15s linear infinite; transform: translate(-50%, -50%); filter: blur(60px); mix-blend-mode: screen; }
     
        @keyframes scan-move {
          0% { mask-position: -20% -20%; -webkit-mask-position: -20% -20%; }
          100% { mask-position: 120% 120%; -webkit-mask-position: 120% 120%; }
        }
        @keyframes flow-glow {
          to { background-position: 200% center; }
        }
        .glowing-text-flow {
          /* The gradient: Dark Slate -> Bright Blue streak -> Dark Slate */
          background-image: linear-gradient(
            to right,
            #475569 0%,   /* Slate 600 base */
            #475569 35%,
            #3b82f6 50%,  /* Bright Blue 500 Center */
            #475569 65%,
            #475569 100%
          );
          background-size: 200% auto;
          
          /* Clip background to text */
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          
          /* Animate */
          animation: flow-glow 5s linear infinite;
        }
      `}</style>

      {/* NAVBAR */}
      <nav className="fixed top-0 w-full px-8 py-6 flex justify-between items-center z-40 bg-[#050505]/80 backdrop-blur-md border-b border-white/5">
        <MediVaultLogo />

        {/* UPDATED: Tech Badges with new styling */}
        <div className="hidden md:flex gap-4">
          <TechBadge icon={Shield} text="AES-256" />
          <TechBadge icon={Database} text="IPFS Network" />
          <TechBadge icon={Cpu} text="AI Analysis" />
        </div>

        <button
          onClick={connectWallet}
          className="group flex items-center gap-2 bg-white text-black px-5 py-2 rounded-full text-sm font-bold hover:bg-slate-200 transition"
        >
          {account ? (checkingUser ? "Verifying..." : "Connected") : "Connect"}
          {!account && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
        </button>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-48 pb-32 px-6 border-b border-white/5 overflow-hidden">

        {/* Background Grid */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '60px 60px' }}>
        </div>

        {/* THE BOUNCING ORB */}
        <div className="bouncing-orb-container z-0">
          <div className="bouncing-orb-x">
            <div className="bouncing-orb-y"></div>
          </div>
        </div>

        {/* Hero Content */}
        <div className="max-w-7xl mx-auto relative z-10">
          <h1 className="text-7xl md:text-[10rem] font-semibold tracking-tighter leading-none mb-8 mix-blend-screen">
            <span className="block glowing-text-flow">Decentralize</span>
            <span className="block bg-gradient-to-r from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">
              Your Health.
            </span>
          </h1>

          <div className="flex flex-col md:flex-row justify-between items-end gap-12 mt-16">
            <p className="text-xl md:text-2xl text-slate-400 max-w-xl leading-relaxed">
              The first patient sovereign medical ledger. <br />
              Your data, Your keys, Your control.
            </p>

            {/* UPDATED: Sleek Glowing Glass Button */}
            <button
              onClick={handleHeroBtnClick}
              className="group relative px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden transition-all duration-500 hover:border-blue-500/50 hover:shadow-[0_0_40px_rgba(59,130,246,0.2)]"
            >
              {/* Inner Hover Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition duration-500" />

              <div className="relative flex items-center gap-4">
                <div className="text-left">
                  <div className="text-[10px] text-blue-400 font-sans tracking-widest uppercase mb-1">
                    {account ? "Access Granted" : "Get Started"}
                  </div>
                  <div className="text-xl font-bold text-white tracking-tight">
                    {account ? "Enter Dashboard" : "Connect Wallet"}
                  </div>
                </div>
                {/* Minimal Arrow that slides */}
                <ArrowRight className="text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-300" size={20} />
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* --- SECTION 2: THE PIPELINE (Replaced "Vibe Coded" Cards with Tech Diagram) --- */}
      <section className="py-32 px-6 bg-[#080808] border-b border-white/5 relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20">
            <div>
              <h2 className="text-sm font-mono text-blue-500 mb-4 tracking-widest uppercase">Architecture</h2>
              <h3 className="text-4xl md:text-6xl font-bold tracking-tighter text-white">Transparency by Design.</h3>
            </div>
            <p className="text-slate-500 max-w-sm text-right text-sm leading-relaxed mt-6 md:mt-0">
              Data flows linearly from client-side encryption to decentralized storage. No middleman servers.
            </p>
          </div>

          {/* Technical Pipeline Diagram */}
          <div className="relative mt-12">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-8 left-0 w-full h-[1px] bg-gradient-to-r from-blue-900 via-slate-800 to-slate-900 z-0"></div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
              {[
                { step: "01", title: "Authenticate", icon: Lock, desc: "Wallet signature verifies identity." },
                { step: "02", title: "Encrypt", icon: Shield, desc: "AES-256 client-side hashing." },
                { step: "03", title: "Distribute", icon: Database, desc: "IPFS pin & smart contract log." },
                { step: "04", title: "Interpret", icon: Cpu, desc: "AI multimodal analysis." }
              ].map((item, i) => (
                <div key={i} className="group">
                  <div className="w-16 h-16 bg-[#0a0a0a] border border-white/10 rounded-full flex items-center justify-center mb-6 group-hover:border-blue-500/50 group-hover:bg-blue-900/10 transition duration-500 relative">
                    <item.icon className="text-slate-400 group-hover:text-blue-400 transition" size={20} />
                    {/* Glowing Dot on Line */}
                    <div className="hidden md:block absolute -top-[33px] left-1/2 -translate-x-1/2 w-3 h-3 bg-[#050505] border border-slate-700 rounded-full group-hover:border-blue-500 group-hover:bg-blue-500 transition duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                  </div>
                  <h4 className="text-[10px] font-mono text-slate-500 mb-2 tracking-widest">STEP {item.step}</h4>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION 3: BENTO GRID FEATURES (Kept as requested) --- */}
      <section className="py-32 px-6 max-w-7xl mx-auto">
        <div className="mb-16">
          <h2 className="text-sm font-mono text-blue-400 mb-4 tracking-widest uppercase">System Capabilities</h2>
          <h3 className="text-4xl md:text-5xl font-bold tracking-tight">Built for the next century.</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Encryption */}
          <div className="md:col-span-2 bg-[#0A0A0A] border border-white/10 p-8 rounded-3xl hover:border-blue-500/30 transition group">
            <Shield className="text-blue-500 mb-6 group-hover:scale-110 transition duration-500" size={40} />
            <h4 className="text-2xl font-bold mb-2">Zero Trust Privacy</h4>
            <p className="text-slate-400 text-lg">Your data is encrypted before it ever touches the network. Only you hold the keys. Hospitals must request permission, which you grant via smart contract signatures.</p>
          </div>
          {/* AI */}
          <div className="bg-[#0A0A0A] border border-white/10 p-8 rounded-3xl hover:border-purple-500/30 transition group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-3xl"></div>
            <Cpu className="text-purple-500 mb-6 group-hover:rotate-12 transition duration-500" size={40} />
            <h4 className="text-2xl font-bold mb-2">AI Diagnostics</h4>
            <p className="text-slate-400">Instantly translate complex X-Rays and lab reports into plain English using embedded multimodal AI.</p>
          </div>
          {/* Speed */}
          <div className="bg-[#0A0A0A] border border-white/10 p-8 rounded-3xl hover:border-green-500/30 transition group">
            <Zap className="text-green-500 mb-6 group-hover:scale-110 transition duration-500" size={40} />
            <h4 className="text-2xl font-bold mb-2">Instant Retrieval</h4>
            <p className="text-slate-400">Optimized IPFS pinning ensures your medical history loads in milliseconds, anywhere on earth.</p>
          </div>
          {/* Global */}
          <div className="md:col-span-2 bg-[#0A0A0A] border border-white/10 p-8 rounded-3xl hover:border-blue-500/30 transition group">
            <Globe className="text-blue-500 mb-6 group-hover:rotate-12 transition duration-500" size={40} />
            <h4 className="text-2xl font-bold mb-2">Universal Standard</h4>
            <p className="text-slate-400 text-lg">Whether you are in Delhi or New York, your medical history travels with you on the blockchain. No more faxing records.</p>
          </div>
        </div>
      </section>

{/* UPDATED FOOTER CONTENT */}
<footer className="bg-[#020202] border-t border-white/5 py-20 px-6">
   <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
      
      {/* Left Side: Brand */}
      <div>
         <MediVaultLogo />
         <p className="text-slate-500 mt-6 max-w-sm leading-relaxed">
            The standard for decentralized medical records. <br/>
            Empowering patients & doctors with sovereignty, privacy, and intelligence.
         </p>
      </div>
      
{/* Right Side: Deep Tech Stack */}
      <div className="flex flex-col justify-center">
         <h4 className="text-[15px] font-mono text-blue-500 uppercase tracking-widest mb-6">Engineered With</h4>
         
         <div className="grid grid-cols-2 gap-y-4 gap-x-12">
            
            {/* 1. Development Environment (Instead of just 'Ethereum') */}
            <div className="flex items-center gap-3 text-slate-400 text-sm font-medium">
               <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
               <span className="hover:text-white transition cursor-default">Hardhat / Solidity</span>
            </div>

            {/* 2. Storage Layer */}
            <div className="flex items-center gap-3 text-slate-400 text-sm font-medium">
               <div className="w-1.5 h-1.5 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
               <span className="hover:text-white transition cursor-default">IPFS / Pinata Cloud</span>
            </div>

            {/* 3. AI Engine (Specific Model Name = Pro) */}
            <div className="flex items-center gap-3 text-slate-400 text-sm font-medium">
               <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
               <span className="hover:text-white transition cursor-default">Ethereum (Sepolia)</span>
            </div>

            {/* 4. Security Layer (Instead of 'React') */}
            <div className="flex items-center gap-3 text-slate-400 text-sm font-medium">
               <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.8)]"></div>
               <span className="hover:text-white transition cursor-default">Ethers.js / AES-256</span>
            </div>

         </div>
      </div>

   </div>
   
   {/* Bottom Bar */}
   <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-xs text-slate-600">
      <p>© 2026 MediVault Protocol.</p>
      <div className="flex items-center gap-2 mt-4 md:mt-0">
         <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
         <span className="font-mono">Online</span>
      </div>
   </div>
</footer>

      {/* --- REGISTRATION MODAL --- */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-[#0f0f0f] border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl p-8 relative">
            <button onClick={() => setShowRegModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X /></button>
            <div className="mb-8 text-center">
              <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500"><CheckCircle size={32} /></div>
              <h2 className="text-3xl font-bold tracking-tight">Claim Identity</h2>
              <p className="text-slate-400 mt-2">Initialize your vault on the blockchain.</p>
            </div>
            <div className="flex bg-white/5 p-1 rounded-xl mb-6">
              <button onClick={() => setUserType('patient')} className={`flex-1 py-3 rounded-lg text-sm font-bold transition ${userType === 'patient' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Patient</button>
              <button onClick={() => setUserType('hospital')} className={`flex-1 py-3 rounded-lg text-sm font-bold transition ${userType === 'hospital' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Doctor / Hospital</button>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
              {userType === 'patient' ? (
                <>
                  <input required type="text" placeholder="Legal Name" className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 focus:border-blue-500 focus:outline-none transition" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  <div className="grid grid-cols-2 gap-4">
                    <input required type="number" placeholder="Age" className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 focus:border-blue-500 focus:outline-none" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} />
                    <select className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 focus:border-blue-500 focus:outline-none" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                      <option>Male</option> <option>Female</option> <option>Other</option>
                    </select>
                  </div>
                  <input required type="number" placeholder="Mobile Number" className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 focus:border-blue-500 focus:outline-none" value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} />
                </>
              ) : (
                <div className="p-6 bg-blue-900/10 border border-blue-500/20 rounded-xl text-center">
                  <p className="text-blue-200 text-sm">Hospital accounts are verified via Wallet Address: <br /> <span className="font-mono text-xs opacity-70">{account}</span></p>
                </div>
              )}
              <button disabled={loading} className="w-full bg-white text-black hover:bg-slate-200 font-bold py-4 rounded-xl mt-4 transition flex items-center justify-center gap-2 text-lg">
                {loading ? <Loader className="animate-spin" /> : "Mint Identity"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationPage;