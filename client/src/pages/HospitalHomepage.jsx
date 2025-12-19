import React, { useState, useContext } from 'react';
import { WalletContext } from '../context/WalletContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import { Search, ShieldAlert, FileText, User, Activity, Lock, LogOut, ExternalLink } from 'lucide-react';
import PdfUpload from './PdfUpload';

const HospitalHomepage = () => {
  const { account, contract, connectWallet } = useContext(WalletContext);
  const navigate = useNavigate();
  const [searchAddress, setSearchAddress] = useState('');
  const [patientData, setPatientData] = useState(null);
  const [patientReports, setPatientReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accessStatus, setAccessStatus] = useState('unknown'); 

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!contract || !searchAddress) return;
    setLoading(true); setPatientData(null); setAccessStatus('unknown');

    try {
      const isRegistered = await contract.registeredPatients(searchAddress);
      if (!isRegistered) { toast.error("Patient not found."); setLoading(false); return; }

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

  const fetchPatientDetails = async (patientAddress) => {
    try {
      const data = await contract.patients(patientAddress);
      // Ensure we handle empty strings correctly
      setPatientData({
        name: data[0],
        gender: data[1],
        age: data[2].toString(),
        contact: data[3].toString(),
        blood: data[4] && data[4] !== "" ? data[4] : "N/A",
        allergies: data[5] && data[5] !== "" ? data[5] : "None",
        chronic: data[7] && data[7] !== "" ? data[7] : "None"
      });
      const reports = await contract.getReports(patientAddress);
      setPatientReports(reports);
    } catch (error) { toast.error("Could not fetch data."); }
  };

  const handleRequestAccess = async () => {
    try {
      await axios.post('/api/request-access', { patientAddress: searchAddress, hospitalAddress: account, hospitalName: "City General Hospital" });
      toast.success("Request sent!");
    } catch (error) { toast.error("Failed to send request."); }
  };

  const handleLogout = () => { navigate('/'); window.location.reload(); };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      <ToastContainer theme="dark" />
      <nav className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Activity size={24} className="text-green-500" />
          <span className="text-2xl font-bold tracking-wider">MediVault <span className="text-green-400 text-sm">Doctor</span></span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={connectWallet} className="bg-slate-700 px-4 py-2 rounded-full text-sm font-mono text-green-300 border border-slate-600 hover:bg-slate-600">{account ? `${account.substring(0,6)}...` : "Connect"}</button>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-400"><LogOut size={24} /></button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-8">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700 mb-8">
          <form onSubmit={handleSearch} className="flex gap-4">
            <input type="text" placeholder="Enter Patient Address (0x...)" className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-mono" value={searchAddress} onChange={(e) => setSearchAddress(e.target.value)} />
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-bold transition disabled:opacity-50">{loading ? "..." : "Search"}</button>
          </form>
        </div>

        {accessStatus === 'denied' && (
          <div className="bg-slate-800/50 border border-red-500/30 rounded-2xl p-10 text-center">
            <Lock size={40} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Access Restricted</h3>
            <button onClick={handleRequestAccess} className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 mx-auto mt-4"><ShieldAlert size={20} /> Request Access</button>
          </div>
        )}

        {accessStatus === 'granted' && patientData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 bg-slate-800 rounded-2xl p-6 border border-green-500/30 shadow-lg">
              <div className="text-center mb-6">
                <User size={80} className="text-slate-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold">{patientData.name}</h3>
                <p className="text-green-400 text-sm font-mono mt-1">Access Granted</p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-slate-700 pb-2"><span className="text-slate-400">Age / Gender</span><span>{patientData.age} / {patientData.gender}</span></div>
                <div className="flex justify-between border-b border-slate-700 pb-2"><span className="text-slate-400">Contact</span><span>{patientData.contact}</span></div>
                <div className="flex justify-between border-b border-slate-700 pb-2"><span className="text-slate-400">Blood Type</span><span className="text-red-400 font-bold">{patientData.blood}</span></div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-6">
              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Activity className="text-red-400" /> Critical Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 p-4 rounded-lg"><label className="text-xs text-slate-500 uppercase">Allergies</label><p className="font-medium text-red-300">{patientData.allergies}</p></div>
                  <div className="bg-slate-900 p-4 rounded-lg"><label className="text-xs text-slate-500 uppercase">Chronic Conditions</label><p className="font-medium text-yellow-300">{patientData.chronic}</p></div>
                </div>
              </div>

              <div className="mb-4"><PdfUpload patientAddress={searchAddress} onUploadSuccess={() => fetchPatientDetails(searchAddress)} /></div>

              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileText className="text-blue-400" /> Medical Reports</h3>
                {patientReports.length === 0 ? <p className="text-slate-500 italic">No reports found.</p> : (
                  <div className="space-y-3">
                    {patientReports.map((report, index) => (
                      <div key={index} className="bg-slate-900 p-4 rounded-lg flex justify-between items-center border border-slate-700">
                        <div><p className="font-bold text-white">{report.category}</p><p className="text-xs text-slate-500">{new Date(report.timeStamp).toLocaleDateString()}</p></div>
                        <a href={`http://localhost:5001/uploads/${report.cID}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm font-bold">View <ExternalLink size={14} /></a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
export default HospitalHomepage;