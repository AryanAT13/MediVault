import React, { useState, useContext } from 'react';
import { WalletContext } from '../context/WalletContext'; // Access the brain
import { useNavigate } from 'react-router-dom'; // To redirect after success
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify'; // Slick notifications
import 'react-toastify/dist/ReactToastify.css';

const RegistrationPage = () => {
  const { account, contract, connectWallet } = useContext(WalletContext);
  const navigate = useNavigate();
  
  const [userType, setUserType] = useState('patient'); // 'patient' or 'hospital'
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male', // Default
    contactInfo: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- THE CORE LOGIC ---
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!account) return toast.error("Please connect your wallet first!");
    if (!contract) return toast.error("Contract not loaded. Reload page.");

    setLoading(true);

    try {
      // 1. BLOCKCHAIN WRITE
      // We send the transaction to the Smart Contract
      let tx;
      if (userType === 'patient') {
        // Note: We parse Age as a number because Solidity expects uint256
        tx = await contract.registerPatient(
            formData.name, 
            parseInt(formData.age), 
            formData.gender
        );
      } else {
        tx = await contract.registerHospital();
      }

      toast.info("Transaction sent... waiting for confirmation.");
      await tx.wait(); // Wait for the block to be mined

      // 2. DATABASE WRITE (The Sync)
      // Once blockchain confirms, we save to MongoDB so search works fast
      await axios.post('http://localhost:5000/api/register', {
        walletAddress: account,
        userType: userType
      });

      toast.success("Registration Successful!");
      
      // Redirect to the dashboard
      setTimeout(() => {
        navigate(userType === 'patient' ? '/userpage' : '/hospitalpage');
        window.location.reload(); // Force refresh to update Role in Context
      }, 2000);

    } catch (error) {
      console.error("Registration Error:", error);
      // Nice error handling
      if (error.reason) toast.error(`Blockchain Error: ${error.reason}`);
      else if (error.response) toast.error(`Server Error: ${error.response.data.msg}`);
      else toast.error("Registration failed. See console.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <ToastContainer theme="dark" />
      
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-700">
        
        {/* Header */}
        <div className="bg-blue-600 p-6 text-center">
          <h1 className="text-3xl font-bold text-white tracking-wider">MediVault</h1>
          <p className="text-blue-100 mt-2">Decentralized Medical Identity</p>
        </div>

        {/* Wallet Checker */}
        {!account ? (
          <div className="p-8 text-center">
             <p className="text-gray-400 mb-4">You need to connect your wallet to register.</p>
             <button 
                onClick={connectWallet}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded transition"
             >
                Connect MetaMask
             </button>
          </div>
        ) : (
          <div className="p-8">
            
            {/* Tabs */}
            <div className="flex bg-slate-700 rounded-lg p-1 mb-6">
              <button 
                className={`flex-1 py-2 rounded-md font-medium transition ${userType === 'patient' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setUserType('patient')}
              >
                Patient
              </button>
              <button 
                className={`flex-1 py-2 rounded-md font-medium transition ${userType === 'hospital' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setUserType('hospital')}
              >
                Hospital
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRegister} className="space-y-4">
              
              {userType === 'patient' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                    <input 
                      name="name" type="text" required
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
                      onChange={handleChange}
                    />
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm text-gray-400 mb-1">Age</label>
                      <input 
                        name="age" type="number" required
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
                        onChange={handleChange}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm text-gray-400 mb-1">Gender</label>
                      <select 
                        name="gender" 
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
                        onChange={handleChange}
                      >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Contact Number</label>
                    <input 
                      name="contactInfo" type="text" required
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
                      onChange={handleChange}
                    />
                  </div>
                </>
              )}

              {userType === 'hospital' && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-200 text-sm text-center">
                  Hospitals are registered by address only. No extra details required for demo.
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className={`w-full py-3 rounded-lg font-bold text-white transition ${loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {loading ? 'Processing Transaction...' : 'Register Now'}
              </button>

            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrationPage;