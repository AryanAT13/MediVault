import React, { useState, useEffect, useContext } from 'react';
import { WalletContext } from '../context/WalletContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import { User, Activity, FileText, Bell, ShieldCheck, ShieldAlert, LogOut, Edit2, ExternalLink, Clock } from 'lucide-react';
import UpdateProfileModal from '../components/UpdateProfileModal';

const UserSiteHomepage = () => {
  const { account, contract, connectWallet } = useContext(WalletContext);
  const navigate = useNavigate();

  const [generalData, setGeneralData] = useState({ name: 'Loading...', age: '', gender: '', contact: '' });
  const [emergencyData, setEmergencyData] = useState({ blood: 'N/A', allergies: 'None', deficiency: 'None', chronic: 'None' });
  const [notifications, setNotifications] = useState([]);
  const [patientReports, setPatientReports] = useState([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // FETCH DATA
  const fetchBlockchainData = async () => {
    if (!contract || !account) return;
    try {
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
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    if (account && contract) {
      fetchBlockchainData();
      fetchNotifications();
    }
  }, [account, contract]);

  const handleGrantAccess = async (hospitalAddress, hospitalName) => {
    if (!contract) return;
    try {
      toast.info(`Granting access...`);
      const tx = await contract.grantAccess(hospitalAddress);
      await tx.wait();
      await axios.post('/api/resolve-request', { patientAddress: account, hospitalAddress });
      toast.success("Access Granted!");
      fetchNotifications();
    } catch (error) { toast.error("Transaction Failed"); }
  };

  const handleLogout = () => { navigate('/'); window.location.reload(); };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-blue-500 selection:text-white">
      <ToastContainer theme="dark" />
      {showUpdateModal && <UpdateProfileModal onClose={() => setShowUpdateModal(false)} onUpdateSuccess={fetchBlockchainData} />}

      {/* NAVBAR */}
      <nav className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Activity size={24} className="text-blue-500" />
          <span className="text-2xl font-bold tracking-wider">MediVault</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={connectWallet} className="bg-slate-700 px-4 py-2 rounded-full text-sm font-mono text-blue-300 border border-slate-600 hover:bg-slate-600 transition">
            {account ? `${account.substring(0, 6)}...` : "🔌 Connect"}
          </button>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-400"><LogOut size={24} /></button>
        </div>
      </nav>

      {/* MAIN LAYOUT: PROFILE + NOTIFICATIONS */}
      <main className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* PROFILE CARD */}
          <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 relative overflow-hidden flex flex-col justify-between h-64">
            <User size={120} className="absolute -bottom-4 -right-4 text-slate-700 opacity-30" />
            <div>
              <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-2">Patient Profile</h2>
              <h1 className="text-4xl font-bold mb-1">{generalData.name}</h1>
              <p className="text-blue-400 font-mono text-sm">{generalData.contact !== '0' ? generalData.contact : "Contact Not Set"}</p>
            </div>
            <div className="flex gap-8 mt-4">
              <div><label className="text-slate-500 text-xs uppercase">Age</label><p className="text-2xl">{generalData.age}</p></div>
              <div><label className="text-slate-500 text-xs uppercase">Gender</label><p className="text-2xl">{generalData.gender}</p></div>
            </div>
          </div>

          {/* NOTIFICATIONS CARD */}
          <div className="lg:col-span-2 bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 h-64 overflow-y-auto">
            <div className="flex items-center gap-3 mb-4 sticky top-0 bg-slate-800 pb-2 z-10">
              <Bell className="text-yellow-400" />
              <h2 className="text-xl font-bold">Access Requests</h2>
              {notifications.length > 0 && <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">{notifications.length} New</span>}
            </div>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                <p>No pending requests.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((req, index) => (
                  <div key={index} className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-md">{req.hospitalName}</h3>
                      <p className="text-xs text-gray-500 font-mono">{req.hospitalAddress}</p>
                    </div>
                    <button onClick={() => handleGrantAccess(req.hospitalAddress, req.hospitalName)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm">
                      <ShieldCheck size={16} /> Approve
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* THE 4-BOX GRID (Restored) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          
          {/* BOX 1: EMERGENCY DATA */}
          <div className="bg-red-900/10 rounded-2xl p-6 shadow-xl border border-red-500/20 relative h-64">
            <button onClick={() => setShowUpdateModal(true)} className="absolute top-4 right-4 bg-slate-800 p-2 rounded-full hover:bg-blue-600 text-slate-400 transition"><Edit2 size={16} /></button>
            <h2 className="text-red-400 text-sm uppercase tracking-widest mb-6 flex items-center gap-2"><Activity size={18}/> Emergency Data</h2>
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-slate-900/50 p-3 rounded-lg"><span className="text-red-300 text-xs block">Blood Type</span><span className="text-xl font-bold">{emergencyData.blood}</span></div>
               <div className="bg-slate-900/50 p-3 rounded-lg"><span className="text-red-300 text-xs block">Allergies</span><span className="font-bold">{emergencyData.allergies}</span></div>
               <div className="bg-slate-900/50 p-3 rounded-lg col-span-2"><span className="text-red-300 text-xs block">Chronic Conditions</span><span className="font-bold">{emergencyData.chronic}</span></div>
            </div>
          </div>

          {/* BOX 2: TIMELINE (Restored!) */}
          <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 h-64 relative overflow-hidden group">
             <div className="absolute -right-6 -bottom-6 bg-purple-500/10 w-32 h-32 rounded-full group-hover:bg-purple-500/20 transition"></div>
             <h2 className="text-purple-400 text-sm uppercase tracking-widest mb-6 flex items-center gap-2"><Clock size={18}/> Health Timeline</h2>
             <div className="space-y-4 h-40 overflow-y-auto pr-2 custom-scrollbar">
                {patientReports.length === 0 ? <p className="text-slate-500 text-sm">No history yet.</p> : patientReports.map((r,i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <div><p className="text-sm font-bold">{r.category}</p><p className="text-xs text-slate-500">{new Date(r.timeStamp).toLocaleDateString()}</p></div>
                  </div>
                ))}
             </div>
          </div>

          {/* BOX 3: MEDICAL REPORTS */}
          <div className="md:col-span-2 bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileText className="text-blue-400" /> Medical Reports Repository</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patientReports.length === 0 ? <p className="text-slate-500 text-sm">No reports uploaded.</p> : patientReports.map((report, index) => (
                <div key={index} className="bg-slate-900 p-4 rounded-xl border border-slate-700 hover:border-blue-500 transition flex justify-between items-center">
                  <div>
                    <span className="bg-blue-500/20 text-blue-300 text-xs font-bold px-2 py-1 rounded uppercase">{report.category}</span>
                    <p className="text-xs text-slate-500 mt-2">{new Date(report.timeStamp).toLocaleDateString()}</p>
                  </div>
                  <a href={`https://gateway.pinata.cloud/ipfs/${report.cID}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white"><ExternalLink size={20} /></a>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};
export default UserSiteHomepage;