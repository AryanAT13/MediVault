import React, { useState, useContext } from 'react';
import { WalletContext } from '../context/WalletContext';
import { X, Save, Activity } from 'lucide-react';

const UpdateProfileModal = ({ onClose, onUpdateSuccess }) => {
  const { contract } = useContext(WalletContext);
  const [formData, setFormData] = useState({
    blood: '', allergies: '', deficiency: '', chronic: ''
  });
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!contract) return;
    setLoading(true);
    try {
      // Sending data to Blockchain
      const tx = await contract.updateMedicalInfo(
        formData.blood,
        formData.allergies,
        formData.deficiency,
        formData.chronic
      );
      await tx.wait(); // Wait for mining
      onUpdateSuccess(); // Refresh the dashboard data
      onClose(); // Close the popup
    } catch (error) {
      console.error(error);
      alert("Update Failed");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-slate-900 p-8 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition">
            <X size={24} />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="text-blue-500" /> Edit Medical Data
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase text-slate-500 font-bold mb-1 block">Blood Type</label>
            <input 
                placeholder="e.g. O+" 
                className="w-full bg-slate-800 p-4 rounded-xl text-white border border-slate-600 focus:border-blue-500 focus:outline-none" 
                onChange={(e) => setFormData({...formData, blood: e.target.value})} 
            />
          </div>
          <div>
            <label className="text-xs uppercase text-slate-500 font-bold mb-1 block">Allergies</label>
            <input 
                placeholder="e.g. Peanuts, Penicillin" 
                className="w-full bg-slate-800 p-4 rounded-xl text-white border border-slate-600 focus:border-blue-500 focus:outline-none" 
                onChange={(e) => setFormData({...formData, allergies: e.target.value})} 
            />
          </div>
          <div>
             <label className="text-xs uppercase text-slate-500 font-bold mb-1 block">Chronic Conditions</label>
            <input 
                placeholder="e.g. Asthma, Diabetes" 
                className="w-full bg-slate-800 p-4 rounded-xl text-white border border-slate-600 focus:border-blue-500 focus:outline-none" 
                onChange={(e) => setFormData({...formData, chronic: e.target.value})} 
            />
          </div>
          
          <button 
            onClick={handleUpdate} 
            disabled={loading} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl mt-4 flex items-center justify-center gap-2 transition"
          >
            {loading ? "Updating Blockchain..." : <><Save size={20} /> Save Records</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateProfileModal;