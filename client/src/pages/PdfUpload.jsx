import React, { useState, useContext } from 'react';
import axios from 'axios';
import { Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { WalletContext } from '../context/WalletContext';

const PdfUpload = ({ patientAddress, onUploadSuccess }) => {
  const { contract, account } = useContext(WalletContext);
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState("Lab Report");
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file || !contract) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (!res.data.success) throw new Error("Upload failed");

      const { ipfsHash, timestamp } = res.data;
      console.log("File Stored. Hash:", ipfsHash);
      const tx = await contract.addReport(
        patientAddress,
        ipfsHash,
        timestamp,
        category
      );
      
      console.log("⏳ Waiting for blockchain confirmation...");
      await tx.wait(); 

      setUploading(false);
      setFile(null);
      if (onUploadSuccess) onUploadSuccess();
      alert("Report Uploaded Successfully!");

    } catch (error) {
      console.error("Upload Error:", error);
      alert("Failed to upload report.");
      setUploading(false);
    }
  };

  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-700">
      <h3 className="font-bold text-lg mb-4 text-white flex gap-2 items-center">
        <Upload size={20} className="text-blue-400"/> Upload Medical Record
      </h3>
      
      <div className="space-y-4">
        <select 
          value={category} 
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-slate-800 text-white p-3 rounded-lg border border-slate-600 focus:border-blue-500 outline-none"
        >
          <option value="Lab Report">🧪 Lab Report</option>
          <option value="X-Ray">💀 X-Ray / Scan</option>
          <option value="Prescription">💊 Prescription</option>
          <option value="Other">📄 Other</option>
        </select>

        <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-blue-500 transition cursor-pointer relative">
          <input 
            type="file" 
            accept="application/pdf,image/*" 
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {file ? (
            <div className="text-green-400 flex items-center justify-center gap-2">
              <CheckCircle size={20} /> {file.name}
            </div>
          ) : (
            <div className="text-slate-400">
              <p>Click to select PDF or Image</p>
            </div>
          )}
        </div>

        <button 
          onClick={handleUpload} 
          disabled={!file || uploading}
          className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition ${
            !file || uploading 
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {uploading ? <Loader className="animate-spin" /> : <Upload size={18} />}
          {uploading ? "Encrypting & Uploading..." : "Upload to Blockchain"}
        </button>
      </div>
    </div>
  );
};

export default PdfUpload;