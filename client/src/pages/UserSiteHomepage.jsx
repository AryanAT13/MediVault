import React, { useState, useEffect, useContext } from 'react';
import { WalletContext } from '../context/WalletContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import { User, Activity, FileText, Bell, ShieldCheck, ShieldAlert, LogOut, Edit2, ExternalLink } from 'lucide-react';
import UpdateProfileModal from '../components/UpdateProfileModal'; // Import the new component

const UserSiteHomepage = () => {
  const { account, contract, connectWallet } = useContext(WalletContext);
  const navigate = useNavigate();

  // State
  const [generalData, setGeneralData] = useState({ name: 'Loading...', age: '', gender: '', contact: '' });
  const [emergencyData, setEmergencyData] = useState({ blood: 'N/A', allergies: 'None', deficiency: 'None', chronic: 'None' });
  const [notifications, setNotifications] = useState([]);
  const [patientReports, setPatientReports] = useState([]); // Stores the list of reports
  const [showUpdateModal, setShowUpdateModal] = useState(false); // Controls the popup

  // --- 1. FETCH DATA (Now includes Reports) ---
  const fetchBlockchainData = async () => {
    if (!contract || !account) return;

    try {
      // A. Fetch Patient Details
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
        deficiency: data[6] || "None",
        chronic: data[7] || "None"
      });

      // B. Fetch Reports (FIX for Issue #3)
      const reports = await contract.getReports(account);
      setPatientReports(reports);

    } catch (error) {
      console.error("Blockchain Fetch Error:", error);
    }
  };

  const fetchNotifications = async () => {
    if (!account) return;
    try {
      const res = await axios.get(`/api/notifications/${account}`);
      setNotifications(res.data);
    } catch (error) {
      console.error("Notification Error:", error);
    }
  };

  useEffect(() => {
    if (account && contract) {
      fetchBlockchainData();
      fetchNotifications();
    }
  }, [account, contract]);


  // --- 2. GRANT ACCESS (Now removes notification) ---
  const handleGrantAccess = async (hospitalAddress, hospitalName) => {
    if (!contract) return;
    try {
      toast.info(`Granting access... Check MetaMask.`);
      
      // Blockchain Write
      const tx = await contract.grantAccess(hospitalAddress);
      await tx.wait(); 

      // Database Cleanup (FIX for Issue #1)
      await axios.post('/api/resolve-request', {
        patientAddress: account,
        hospitalAddress: hospitalAddress
      });

      toast.success("Access Granted!");
      fetchNotifications(); // Refresh list to make it disappear

    } catch (error) {
      console.error(error);
      toast.error("Transaction Failed");
    }
  };

  const handleLogout = () => {
    navigate('/');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-blue-500 selection:text-white">
      <ToastContainer theme="dark" />
      
      {/* POPUP MODAL */}
      {showUpdateModal && (
        <UpdateProfileModal 
            onClose={() => setShowUpdateModal(false)} 
            onUpdateSuccess={fetchBlockchainData} 
        />
      )}

      {/* NAVBAR */}
      <nav className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
             <Activity size={24} className="text-white" />
          </div>
          <span className="text-2xl font-bold tracking-wider">MediVault</span>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={connectWallet} 
            className="bg-slate-700 px-4 py-2 rounded-full text-sm font-mono text-blue-300 border border-slate-600 hover:bg-slate-600 transition cursor-pointer"
          >
            {account ? `${account.substring(0, 6)}...${account.substring(38)}` : "🔌 Connect Wallet"}
          </button>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition">
            <LogOut size={24} />
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Profile */}
        <div className="lg:col-span-1 space-y-8">
          
          <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 relative overflow-hidden">
            <User size={100} className="absolute -top-4 -right-4 text-slate-700 opacity-50" />
            <h2 className="text-gray-400 text-sm uppercase tracking-widest mb-4">Patient Profile</h2>
            <div className="space-y-4 relative z-10">
              <div><label className="text-slate-500 text-xs">Full Name</label><p className="text-2xl font-bold">{generalData.name}</p></div>
              <div className="flex justify-between">
                <div><label className="text-slate-500 text-xs">Age</label><p className="text-xl">{generalData.age}</p></div>
                <div><label className="text-slate-500 text-xs">Gender</label><p className="text-xl">{generalData.gender}</p></div>
              </div>
              <div><label className="text-slate-500 text-xs">Contact</label><p className="text-lg font-mono text-blue-300">{generalData.contact}</p></div>
            </div>
          </div>

          {/* EMERGENCY DATA (With Edit Button) */}
          <div className="bg-red-900/10 rounded-2xl p-6 shadow-xl border border-red-500/20 relative">
             <button 
                onClick={() => setShowUpdateModal(true)} 
                className="absolute top-4 right-4 bg-slate-800 p-2 rounded-full hover:bg-blue-600 hover:text-white transition text-slate-400"
             >
                <Edit2 size={16} />
             </button>

            <h2 className="text-red-400 text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity size={16}/> Emergency Data
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-red-500/10">
                <span className="text-red-300 text-sm">Blood Type</span>
                <span className="text-xl font-bold text-white">{emergencyData.blood}</span>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-red-500/10">
                <label className="text-red-300 text-xs block mb-1">Allergies</label>
                <p className="font-medium text-white">{emergencyData.allergies}</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-red-500/10">
                <label className="text-red-300 text-xs block mb-1">Chronic Conditions</label>
                <p className="font-medium text-white">{emergencyData.chronic}</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Actions */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* NOTIFICATIONS */}
          <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="text-yellow-400" />
              <h2 className="text-xl font-bold">Access Requests</h2>
              {notifications.length > 0 && <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">{notifications.length} New</span>}
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-8 bg-slate-900/50 rounded-xl border border-dashed border-slate-700 text-slate-500">
                No pending requests.
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((req, index) => (
                  <div key={index} className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-900/30 p-3 rounded-full text-blue-400"><ShieldAlert size={24} /></div>
                      <div>
                        <h3 className="font-bold text-lg">{req.hospitalName || "Unknown Hospital"}</h3>
                        <p className="text-xs text-gray-500 font-mono">{req.hospitalAddress}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleGrantAccess(req.hospitalAddress, req.hospitalName)}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition"
                    >
                      <ShieldCheck size={18} /> Approve
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* REPORTS LIST (FIXED) */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 h-96 overflow-y-auto custom-scrollbar">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
               <FileText className="text-blue-400" /> Medical Reports
            </h3>
            
            {patientReports.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                 <FileText size={40} className="mb-2 opacity-20" />
                 <p>No medical reports found.</p>
               </div>
            ) : (
              <div className="grid gap-3">
                {patientReports.map((report, index) => (
                  <div key={index} className="bg-slate-900 p-4 rounded-xl border border-slate-700 hover:border-blue-500 transition group flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2">
                             <span className="bg-blue-500/20 text-blue-300 text-xs font-bold px-2 py-1 rounded uppercase">{report.category}</span>
                             <span className="text-slate-400 text-xs">{new Date().toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 font-mono truncate w-64">{report.cID}</p>
                    </div>
                    <a 
                      href={`http://localhost:5001/uploads/${report.cID}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-400 p-2 rounded-lg transition"
                    >
                      <ExternalLink size={20} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default UserSiteHomepage;