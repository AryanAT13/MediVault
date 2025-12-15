import React, { useContext } from 'react';
import WalletProvider, { WalletContext } from './context/WalletContext';

// Temporary Test Component
const TestComponent = () => {
  // FIXED: Using standard useContext hook instead of require
  const { connectWallet, account, role, loading } = useContext(WalletContext);
  
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-8">MediVault Boss Edition</h1>
      
      {/* Loading State */}
      {loading && <p className="text-yellow-400 mb-4">Connecting to Blockchain...</p>}

      {!account ? (
        <button 
          onClick={connectWallet}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-bold transition transform hover:scale-105"
        >
          Connect MetaMask
        </button>
      ) : (
        <div className="text-center space-y-4 bg-slate-800 p-8 rounded-xl border border-slate-700">
          <p className="text-green-400 text-xl font-mono">
            ✅ Connected
          </p>
          <div className="bg-black/50 p-2 rounded text-sm text-gray-400 font-mono">
            {account}
          </div>
          <p className="text-yellow-400 font-bold uppercase tracking-widest">
            Role: {role || "GUEST"}
          </p>
          
          {role === 'guest' && (
            <p className="text-red-400 text-sm mt-2">
              (You are not registered in the system yet)
            </p>
          )}
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <WalletProvider>
      <div className="App">
         <TestComponent /> 
      </div>
    </WalletProvider>
  );
}

export default App;