import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WalletProvider from './context/WalletContext';

// --- IMPORT PAGES ---
import RegistrationPage from './pages/RegistrationPage';
import UserSiteHomepage from './pages/UserSiteHomepage'; 
import HospitalHomepage from './pages/HospitalHomepage'; //0xbda5747bfd65f08deb54cb465eb87d40e51b197e

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