import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WalletProvider from './context/WalletContext';

import RegistrationPage from './pages/RegistrationPage';
import UserSiteHomepage from './pages/UserSiteHomepage'; 
import HospitalHomepage from './pages/HospitalHomepage'; 

function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <div className="App">
           <Routes>
              <Route path='/' element={<RegistrationPage />} />
              
              <Route path='/register' element={<RegistrationPage />} />
              
              <Route path='/userpage' element={<UserSiteHomepage />} />
              
              <Route path='/hospitalpage' element={<HospitalHomepage />} />
           </Routes>
        </div>
      </WalletProvider>
    </BrowserRouter>
  );
}

export default App;