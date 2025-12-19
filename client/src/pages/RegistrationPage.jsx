import React, { useState, useContext, useEffect } from 'react';
import { WalletContext } from '../context/WalletContext';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import axios from 'axios';
import 'react-toastify/dist/ReactToastify.css';
import { User, Activity, Loader, ShieldCheck } from 'lucide-react';

const RegistrationPage = () => {
  const { connectWallet, account, contract } = useContext(WalletContext);
  const navigate = useNavigate();

  const [userType, setUserType] = useState('patient'); // 'patient' or 'hospital'
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    contact: '' // Added contact field
  });
  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);

  // --- AUTO-LOGIN LOGIC ---
  useEffect(() => {
    if (account && contract) {
      checkIfUserExists();
    }
  }, [account, contract]);

  const checkIfUserExists = async () => {
    setCheckingUser(true);
    try {
      // 1. Check if Patient
      const isPatient = await contract.registeredPatients(account);
      if (isPatient) {
        toast.success("Welcome back, Patient!");
        navigate('/userpage');
        return;
      }

      // 2. Check if Hospital
      const isHospital = await contract.registeredHospitals(account);
      if (isHospital) {
        toast.success("Welcome back, Doctor!");
        navigate('/hospitalpage');
        return;
      }

      // 3. If neither, stay here to Register
      setCheckingUser(false);

    } catch (error) {
      console.error("Login Check Failed:", error);
      setCheckingUser(false);
    }
  };
  // ------------------------

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!contract) {
      toast.error("Wallet not connected!");
      return;
    }

    setLoading(true);
    try {
      let tx;
      
      if (userType === 'patient') {
        // PATIENT REGISTRATION
        console.log("Registering Patient:", formData.name);
        
        // 1. Blockchain Transaction (Smart Contract)
        // Note: We are passing age and contact as simple numbers/strings
        tx = await contract.registerPatient(
           formData.name, 
           Number(formData.age), 
           formData.gender,
           Number(formData.contact)
        );
        
      } else {
        // HOSPITAL REGISTRATION
        console.log("Registering Hospital");
        tx = await contract.registerHospital();
      }

      // Wait for Blockchain Confirmation
      await tx.wait();

      // 2. Database Backup (MongoDB)
      await axios.post('/api/register', {
        walletAddress: account,
        userType: userType
      });

      toast.success("Registration Successful!");
      
      // Redirect based on type
      if (userType === 'patient') navigate('/userpage');
      else navigate('/hospitalpage');

    } catch (error) {
      console.error("Registration Error:", error);
      // Nice error handling for the user
      if (error.reason && error.reason.includes("already registered")) {
        toast.error("You are already registered! Redirecting...");
        checkIfUserExists(); // Force redirect
      } else {
        toast.error("Registration Failed: " + (error.reason || error.message));
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <ToastContainer theme="dark" />
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-slate-700 w-full max-w-md relative z-10">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">MediVault</h1>
          <p className="text-blue-200 font-light">Decentralized Medical Records</p>
        </div>

        {/* Wallet Connection State */}
        {!account ? (
          <div className="text-center py-10">
            <div className="bg-slate-700/50 p-6 rounded-2xl mb-6 border border-dashed border-slate-600">
               <ShieldCheck size={48} className="mx-auto text-blue-400 mb-4" />
               <p className="text-slate-300">Connect your wallet to access your secure medical history.</p>
            </div>
            <button 
              onClick={connectWallet}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 group"
            >
              Connect Wallet 
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        ) : checkingUser ? (
          /* LOADING STATE (Checking Login) */
          <div className="text-center py-12">
            <Loader className="animate-spin mx-auto text-blue-400 mb-4" size={40} />
            <p className="text-slate-300">Verifying Identity...</p>
          </div>
        ) : (
          /* REGISTRATION FORM (Only shown if NOT registered) */
          <form onSubmit={handleRegister} className="space-y-6">
            
            {/* User Type Toggle */}
            <div className="grid grid-cols-2 gap-2 bg-slate-700/50 p-1 rounded-xl">
              <button
                type="button"
                className={`py-2 rounded-lg text-sm font-medium transition-all ${userType === 'patient' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                onClick={() => setUserType('patient')}
              >
                <div className="flex items-center justify-center gap-2">
                  <User size={16} /> Patient
                </div>
              </button>
              <button
                type="button"
                className={`py-2 rounded-lg text-sm font-medium transition-all ${userType === 'hospital' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                onClick={() => setUserType('hospital')}
              >
                <div className="flex items-center justify-center gap-2">
                  <Activity size={16} /> Hospital
                </div>
              </button>
            </div>

            {/* Inputs (Patient Only) */}
            {userType === 'patient' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <label className="block text-slate-400 text-sm mb-1 ml-1">Full Name</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="John Doe"
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-sm mb-1 ml-1">Age</label>
                    <input 
                      required 
                      type="number" 
                      placeholder="25"
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                      value={formData.age}
                      onChange={(e) => setFormData({...formData, age: e.target.value})}
                    />
                  </div>
                   <div>
                    <label className="block text-slate-400 text-sm mb-1 ml-1">Gender</label>
                    <select 
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                      value={formData.gender}
                      onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-1 ml-1">Contact (Mobile)</label>
                  <input 
                    required 
                    type="number" 
                    placeholder="9876543210"
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    value={formData.contact}
                    onChange={(e) => setFormData({...formData, contact: e.target.value})}
                  />
                </div>
              </div>
            )}

            {userType === 'hospital' && (
              <div className="bg-purple-900/20 p-4 rounded-xl border border-purple-500/30 text-center animate-in fade-in zoom-in duration-300">
                <p className="text-purple-200 text-sm">
                  Hospital registration is simplified. Your wallet address will be your official identifier on the blockchain.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button 
              disabled={loading}
              className="w-full bg-white text-slate-900 font-bold py-4 rounded-xl hover:bg-slate-200 transition-all shadow-lg flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader className="animate-spin" /> : "Complete Registration"}
            </button>
            
          </form>
        )}
        
        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-slate-500 text-xs font-mono">Connected: {account ? `${account.substring(0, 6)}...${account.substring(38)}` : "No"}</p>
        </div>

      </div>
    </div>
  );
};

export default RegistrationPage;