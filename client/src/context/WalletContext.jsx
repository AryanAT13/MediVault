import React, { createContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../utils/constants';

export const WalletContext = createContext();

const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [role, setRole] = useState(''); // 'patient', 'hospital', or 'guest'
  const [loading, setLoading] = useState(false);

  // 1. Connect Wallet Function
  const connectWallet = async () => {
    if (!window.ethereum) return alert("Please install MetaMask!");
    
    setLoading(true);
    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const currentAccount = accounts[0];
      setAccount(currentAccount);

      // Setup Ethers Provider & Contract
      const tempProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await tempProvider.getSigner();
      const tempContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      setProvider(tempProvider);
      setContract(tempContract);

      // Check User Role (Auto-Login logic)
      await checkUserRole(tempContract, currentAccount);

    } catch (error) {
      console.error("Connection Failed:", error);
    }
    setLoading(false);
  };

// 2. Check Role Logic 
  const checkUserRole = async (contractInstance, address) => {
    try {
      // In Solidity, public mappings create a getter function with the same name.
      // So 'mapping(address => bool) public registeredPatients' becomes 'registeredPatients(address)'
      
      const isPatient = await contractInstance.registeredPatients(address);
      if (isPatient) {
        setRole('patient');
        return;
      }

      const isHospital = await contractInstance.registeredHospitals(address);
      if (isHospital) {
        setRole('hospital');
        return;
      }

      setRole('guest'); // Not registered yet
    } catch (error) {
      console.error("Error checking role:", error);
    }
  };

  // 3. Listen for Account Changes (If user switches wallet in MetaMask)
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        setAccount(accounts[0]);
        window.location.reload(); // Reload to refresh state
      });
    }
  }, []);

  return (
    <WalletContext.Provider value={{ account, contract, role, connectWallet, loading }}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletProvider;