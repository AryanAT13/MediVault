import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WalletProvider from './context/WalletContext';

// --- IMPORT PAGES ---
import RegistrationPage from './pages/RegistrationPage';
import UserSiteHomepage from './pages/UserSiteHomepage'; // <--- The New Dashboard

// Placeholder for Hospital (We will build this next)
const HospitalHomepage = () => (
  <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
    <h1 className="text-3xl">🏥 Hospital Dashboard Coming Soon</h1>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <div className="App">
           <Routes>
              {/* Default Route */}
              <Route path='/' element={<RegistrationPage />} />
              
              {/* Registration Route */}
              <Route path='/register' element={<RegistrationPage />} />
              
              {/* Patient Dashboard Route */}
              <Route path='/userpage' element={<UserSiteHomepage />} />
              
              {/* Hospital Dashboard Route */}
              <Route path='/hospitalpage' element={<HospitalHomepage />} />
           </Routes>
        </div>
      </WalletProvider>
    </BrowserRouter>
  );
}

export default App;