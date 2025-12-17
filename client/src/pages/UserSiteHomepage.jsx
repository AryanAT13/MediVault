import React, { useState, useEffect, useContext } from 'react';
import { WalletContext } from '../context/WalletContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import { User, Activity, FileText, Bell, ShieldCheck, ShieldAlert, LogOut } from 'lucide-react'; // Slick icons

const UserSiteHomepage = () => {
    const { account, contract, connectWallet } = useContext(WalletContext);
    const navigate = useNavigate();

    // State for Data
    const [generalData, setGeneralData] = useState({ name: 'Loading...', age: '', gender: '', contact: '' });
    const [emergencyData, setEmergencyData] = useState({ blood: '', allergies: '', deficiency: '', chronic: '' });
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

// --- 1. FETCH DATA FROM BLOCKCHAIN (FINAL FIX) ---
  const fetchBlockchainData = async () => {
    if (!contract || !account) return;

    try {
      console.log("Fetching profile for:", account);

      // CALLING THE MAPPING FROM LINE 31 OF YOUR SOLIDITY CODE
      // struct PatientData { Name, Gender, Age, Contact, Blood, Allergies... }
      const data = await contract.patients(account);
      
      console.log("Data Received:", data);

      // MAPPING THE RESULT (Order matters!)
      // Index 0: Name
      // Index 1: Gender
      // Index 2: Age
      // Index 3: Contact Number
      // Index 4: Blood Type
      // Index 5: Allergies
      // Index 6: Deficiencies
      // Index 7: Chronic Diseases

      setGeneralData({
        name: data[0], 
        gender: data[1],
        age: data[2].toString(), // Convert BigInt to string
        contact: data[3].toString()
      });

      setEmergencyData({
        blood: data[4] || "N/A",
        allergies: data[5] || "None",
        deficiency: data[6] || "None",
        chronic: data[7] || "None"
      });

    } catch (error) {
      console.error("Blockchain Fetch Error:", error);
    }
  };

    // --- 2. FETCH NOTIFICATIONS FROM MONGODB ---
    const fetchNotifications = async () => {
        if (!account) return;
        try {
            const res = await axios.get(`/api/notifications/${account}`);
            setNotifications(res.data);
        } catch (error) {
            console.error("Notification Error:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (account && contract) {
            fetchBlockchainData();
            fetchNotifications();
        }
    }, [account, contract]);


    // --- 3. GRANT ACCESS (Blockchain Write) ---
    const handleGrantAccess = async (hospitalAddress, hospitalName) => {
        if (!contract) return;
        try {
            toast.info(`Granting access to ${hospitalName}... Check MetaMask.`);

            // Call the Smart Contract function to allow access
            const tx = await contract.addAllowedAddress(account, hospitalAddress);
            await tx.wait(); // Wait for mining

            toast.success("Access Granted Successfully!");

            // Optional: Remove notification from DB after success (To clean up UI)
            // await axios.post('/api/remove-notification', ...) 
            fetchNotifications(); // Refresh list

        } catch (error) {
            console.error(error);
            toast.error("Transaction Failed");
        }
    };

    const handleLogout = () => {
        // In Web3, "Logout" is just clearing the state, user is still connected in MetaMask
        navigate('/');
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-blue-500 selection:text-white">
            <ToastContainer theme="dark" />

            {/* --- NAVBAR --- */}
            <nav className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <Activity size={24} className="text-white" />
                    </div>
                    <span className="text-2xl font-bold tracking-wider">MediVault</span>
                </div>

                <div className="flex items-center gap-6">
                    {/* REPLACE THIS SECTION */}
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

            {/* --- MAIN CONTENT --- */}
            <main className="max-w-7xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN: User Profile */}
                <div className="lg:col-span-1 space-y-8">

                    {/* Profile Card */}
                    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 relative overflow-hidden group hover:border-blue-500/50 transition">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                            <User size={120} />
                        </div>
                        <h2 className="text-gray-400 text-sm uppercase tracking-widest mb-4">Patient Profile</h2>

                        <div className="space-y-4 relative z-10">
                            <div>
                                <label className="text-slate-500 text-xs">Full Name</label>
                                <p className="text-2xl font-bold">{generalData.name}</p>
                            </div>
                            <div className="flex justify-between">
                                <div>
                                    <label className="text-slate-500 text-xs">Age</label>
                                    <p className="text-xl">{generalData.age}</p>
                                </div>
                                <div>
                                    <label className="text-slate-500 text-xs">Gender</label>
                                    <p className="text-xl">{generalData.gender}</p>
                                </div>
                            </div>
                            <div>
                                <label className="text-slate-500 text-xs">Contact</label>
                                <p className="text-lg font-mono text-blue-300">{generalData.contact}</p>
                            </div>
                        </div>
                    </div>

                    {/* Emergency Card */}
                    <div className="bg-red-900/20 rounded-2xl p-6 shadow-xl border border-red-500/30 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 text-red-500 opacity-20">
                            <Activity size={100} />
                        </div>
                        <h2 className="text-red-400 text-sm uppercase tracking-widest mb-4">Emergency Data</h2>
                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            <div className="bg-slate-900/50 p-3 rounded-lg border border-red-500/20">
                                <label className="text-red-300 text-xs">Blood Type</label>
                                <p className="text-xl font-bold text-white">{emergencyData.blood}</p>
                            </div>
                            <div className="bg-slate-900/50 p-3 rounded-lg border border-red-500/20">
                                <label className="text-red-300 text-xs">Allergies</label>
                                <p className="text-md font-bold text-white">{emergencyData.allergies}</p>
                            </div>
                            <div className="bg-slate-900/50 p-3 rounded-lg border border-red-500/20 col-span-2">
                                <label className="text-red-300 text-xs">Chronic Conditions</label>
                                <p className="text-md font-bold text-white">{emergencyData.chronic}</p>
                            </div>
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN: Actions & Notifications */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Notifications Panel */}
                    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
                        <div className="flex items-center gap-3 mb-6">
                            <Bell className="text-yellow-400" />
                            <h2 className="text-xl font-bold">Access Requests</h2>
                            <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2 py-1 rounded-full">{notifications.length} New</span>
                        </div>

                        {notifications.length === 0 ? (
                            <div className="text-center py-10 bg-slate-900/50 rounded-xl border border-dashed border-slate-700">
                                <p className="text-gray-500">No pending requests from hospitals.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {notifications.map((req, index) => (
                                    <div key={index} className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-blue-900/30 p-3 rounded-full text-blue-400">
                                                <ShieldAlert size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">{req.hospitalName || "Unknown Hospital"}</h3>
                                                <p className="text-xs text-gray-500 font-mono">{req.hospitalAddress}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleGrantAccess(req.hospitalAddress, req.hospitalName)}
                                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition"
                                            >
                                                <ShieldCheck size={18} /> Approve
                                            </button>
                                            <button className="bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/50 px-4 py-2 rounded-lg font-bold transition">
                                                Deny
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Records & Timeline Placeholders (To be built later if needed) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-blue-500 transition cursor-pointer group">
                            <FileText size={40} className="text-blue-500 mb-4 group-hover:scale-110 transition" />
                            <h3 className="text-lg font-bold">Medical Reports</h3>
                            <p className="text-slate-400 text-sm">View your uploaded X-Rays, Lab results, and prescriptions.</p>
                        </div>
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-purple-500 transition cursor-pointer group">
                            <Activity size={40} className="text-purple-500 mb-4 group-hover:scale-110 transition" />
                            <h3 className="text-lg font-bold">Health Timeline</h3>
                            <p className="text-slate-400 text-sm">Track your medical history and hospital visits over time.</p>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default UserSiteHomepage;