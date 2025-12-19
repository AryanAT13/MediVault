import React, { useState, useContext } from 'react';
import { WalletContext } from '../context/WalletContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import { Search, ShieldAlert, ShieldCheck, FileText, User, Activity, Lock, LogOut, ExternalLink } from 'lucide-react';
import PdfUpload from './PdfUpload';

const HospitalHomepage = () => {
    const { account, contract, connectWallet } = useContext(WalletContext);
    const navigate = useNavigate();

    // Search State
    const [searchAddress, setSearchAddress] = useState('');
    const [patientData, setPatientData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [accessStatus, setAccessStatus] = useState('unknown'); // 'granted', 'denied', 'unknown'
    const [patientReports, setPatientReports] = useState([]);

    // --- 1. SEARCH PATIENT ---
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!contract || !searchAddress) return;

        setLoading(true);
        setPatientData(null);
        setAccessStatus('unknown');

        try {
            // A. Check if user exists on Blockchain
            // We use the mapping: registeredPatients(address) => bool
            const isRegistered = await contract.registeredPatients(searchAddress);

            if (!isRegistered) {
                toast.error("Patient not found on Blockchain.");
                setLoading(false);
                return;
            }

            // B. Check Access Permission
            // We use the mapping: permitted(patient, hospital) => bool
            const hasAccess = await contract.permitted(searchAddress, account);

            if (hasAccess) {
                setAccessStatus('granted');
                fetchPatientDetails(searchAddress);
            } else {
                setAccessStatus('denied');
            }

        } catch (error) {
            console.error("Search Error:", error);
            toast.error("Error searching for patient.");
        }
        setLoading(false);
    };

    // --- 2. FETCH PATIENT DETAILS ---
    const fetchPatientDetails = async (patientAddress) => {
        try {
            // Fetch Basic Data
            const data = await contract.patients(patientAddress);
            setPatientData({
                name: data[0],
                // ... (Keep existing mapping) ...
                chronic: data[7] || "None"
            });

            // NEW: Fetch Reports
            // Solidity: getReports(address) returns Report[]
            const reports = await contract.getReports(patientAddress);
            console.log("Reports fetched:", reports);
            setPatientReports(reports);

        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error("Could not fetch patient files.");
        }
    };

    // --- 3. REQUEST ACCESS (Write to DB) ---
    const handleRequestAccess = async () => {
        try {
            toast.info("Sending access request...");

            // We send this to the Central Database so the Patient gets a notification
            await axios.post('/api/request-access', {
                patientAddress: searchAddress,
                hospitalAddress: account,
                hospitalName: "City General Hospital" // You could make this dynamic later
            });

            toast.success("Request sent! Patient has been notified.");

        } catch (error) {
            console.error("Request Error:", error);
            toast.error("Failed to send request.");
        }
    };

    const handleLogout = () => {
        navigate('/');
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans">
            <ToastContainer theme="dark" />

            {/* NAVBAR */}
            <nav className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="bg-green-600 p-2 rounded-lg">
                        <Activity size={24} className="text-white" />
                    </div>
                    <span className="text-2xl font-bold tracking-wider">MediVault <span className="text-green-400 text-sm font-normal">Doctor's Portal</span></span>
                </div>

                <div className="flex items-center gap-6">
                    <button
                        onClick={connectWallet}
                        className="bg-slate-700 px-4 py-2 rounded-full text-sm font-mono text-green-300 border border-slate-600 hover:bg-slate-600 hover:text-white transition cursor-pointer shadow-lg"
                    >
                        {account ? `${account.substring(0, 6)}...${account.substring(38)}` : "🔌 Connect Wallet"}
                    </button>
                    <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition">
                        <LogOut size={24} />
                    </button>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto p-8">

                {/* SEARCH BAR */}
                <div className="bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700 mb-8">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Search className="text-blue-400" /> Find Patient Records
                    </h2>
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <input
                            type="text"
                            placeholder="Enter Patient Wallet Address (0x...)"
                            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-mono"
                            value={searchAddress}
                            onChange={(e) => setSearchAddress(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-bold transition disabled:opacity-50"
                        >
                            {loading ? "Searching..." : "Search"}
                        </button>
                    </form>
                </div>

                {/* RESULTS SECTION */}
                {accessStatus === 'denied' && (
                    <div className="bg-slate-800/50 border border-red-500/30 rounded-2xl p-10 text-center">
                        <div className="bg-red-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Lock size={40} className="text-red-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Access Restricted</h3>
                        <p className="text-slate-400 mb-8 max-w-md mx-auto">
                            You do not have permission to view this patient's medical records. You must request access first.
                        </p>
                        <button
                            onClick={handleRequestAccess}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 mx-auto transition"
                        >
                            <ShieldAlert size={20} /> Request Access
                        </button>
                    </div>
                )}

                {accessStatus === 'granted' && patientData && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                        {/* Patient Card */}
                        <div className="md:col-span-1 bg-slate-800 rounded-2xl p-6 border border-green-500/30 shadow-lg shadow-green-900/10">
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="bg-slate-700 w-24 h-24 rounded-full flex items-center justify-center mb-4">
                                    <User size={48} className="text-slate-400" />
                                </div>
                                <h3 className="text-2xl font-bold">{patientData.name}</h3>
                                <p className="text-green-400 text-sm font-mono mt-1">Access Granted</p>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between border-b border-slate-700 pb-2">
                                    <span className="text-slate-400">Age / Gender</span>
                                    <span>{patientData.age} / {patientData.gender}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-700 pb-2">
                                    <span className="text-slate-400">Contact</span>
                                    <span>{patientData.contact}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-700 pb-2">
                                    <span className="text-slate-400">Blood Type</span>
                                    <span className="text-red-400 font-bold">{patientData.blood}</span>
                                </div>
                            </div>
                        </div>

                        {/* Medical Data */}
                        <div className="md:col-span-2 space-y-6">
                            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <Activity className="text-red-400" /> Critical Information
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-900 p-4 rounded-lg">
                                        <label className="text-xs text-slate-500 uppercase">Allergies</label>
                                        <p className="font-medium text-red-300">{patientData.allergies}</p>
                                    </div>
                                    <div className="bg-slate-900 p-4 rounded-lg">
                                        <label className="text-xs text-slate-500 uppercase">Chronic Conditions</label>
                                        <p className="font-medium text-yellow-300">{patientData.chronic}</p>
                                    </div>
                                </div>
                            </div>

                            {/* REPLACES THE "Past Reports (Coming Soon)" DIV */}

                            {/* Uploader Section */}
                            <div className="mb-8">
                                <PdfUpload
                                    patientAddress={searchAddress}
                                    onUploadSuccess={() => fetchPatientDetails(searchAddress)}
                                />
                            </div>

                            {/* Reports List */}
                            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <FileText className="text-blue-400" /> Medical Reports
                                </h3>

                                {patientReports.length === 0 ? (
                                    <p className="text-slate-500 italic">No reports found for this patient.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {patientReports.map((report, index) => (
                                            <div key={index} className="bg-slate-900 p-4 rounded-lg flex justify-between items-center border border-slate-700 hover:border-blue-500 transition">
                                                <div>
                                                    <p className="font-bold text-white">{report.category || "General Report"}</p>
                                                    <p className="text-xs text-slate-500">{report.timeStamp}</p>
                                                </div>
                                                <a
                                                    href={`http://localhost:5001/uploads/${report.cID}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm font-bold"
                                                >
                                                    View <ExternalLink size={14} />
                                                </a>
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