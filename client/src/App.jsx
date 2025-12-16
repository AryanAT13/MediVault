import React from 'react';
import WalletProvider from './context/WalletContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Import the new page
import RegistrationPage from './pages/RegistrationPage';

// Placeholder components so the app doesn't crash if you haven't built these yet
const UserSiteHomepage = () => <div className="text-white">User Dashboard (Coming Soon)</div>;
const HospitalHomepage = () => <div className="text-white">Hospital Dashboard (Coming Soon)</div>;
const LoginPage = () => <div className="text-white">Login Page</div>;

function App() {
  return (
    <BrowserRouter> {/* Router must be outside Provider in some setups, but here it's fine */}
      <WalletProvider>
        <div className="App">
           <Routes>
              <Route path='/' element={<RegistrationPage />} /> {/* Default to Register for now */}
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