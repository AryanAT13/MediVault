import React, { createContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../utils/constants';

export const WalletContext = createContext();

const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [role, setRole] = useState(''); 
  const [loading, setLoading] = useState(false);

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Please install MetaMask!");
    
    setLoading(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const currentAccount = accounts[0];
      setAccount(currentAccount);

      const tempProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await tempProvider.getSigner();
      const tempContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      setProvider(tempProvider);
      setContract(tempContract);

      await checkUserRole(tempContract, currentAccount);

    } catch (error) {
      console.error("Connection Failed:", error);
    }
    setLoading(false);
  };

  const checkUserRole = async (contractInstance, address) => {
    try {   
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

      setRole('guest'); 
    } catch (error) {
      console.error("Error checking role:", error);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        setAccount(accounts[0]);
        window.location.reload(); 
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