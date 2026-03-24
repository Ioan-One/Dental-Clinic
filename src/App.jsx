import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import MasterView from './pages/MasterView';
import DetailView from './pages/DetailView';
import Navbar from './components/Navbar';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/appointments" element={<MasterView />} />
            <Route path="/patient/:id" element={<DetailView />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
