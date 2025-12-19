import React, { useState, useContext } from 'react';
import { WalletContext } from '../context/WalletContext';
import { X } from 'lucide-react';

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
      // Call updateMedicalInfo(blood, allergies, deficiency, chronic)
      const tx = await contract.updateMedicalInfo(
        formData.blood,
        formData.allergies,
        formData.deficiency,
        formData.chronic
      );
      await tx.wait();
      onUpdateSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Update Failed");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 p-6 rounded-2xl w-96 border border-slate-600">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Update Medical Data</h2>
          <button onClick={onClose}><X className="text-slate-400 hover:text-white" /></button>
        </div>
        
        <div className="space-y-3">
          <input placeholder="Blood Type (e.g. O+)" className="w-full bg-slate-900 p-3 rounded text-white border border-slate-700" 
            onChange={(e) => setFormData({...formData, blood: e.target.value})} />
          <input placeholder="Allergies" className="w-full bg-slate-900 p-3 rounded text-white border border-slate-700" 
            onChange={(e) => setFormData({...formData, allergies: e.target.value})} />
          <input placeholder="Chronic Conditions" className="w-full bg-slate-900 p-3 rounded text-white border border-slate-700" 
            onChange={(e) => setFormData({...formData, chronic: e.target.value})} />
          
          <button onClick={handleUpdate} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded mt-2">
            {loading ? "Updating Blockchain..." : "Save Records"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateProfileModal;