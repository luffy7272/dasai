import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PetSelection from './components/PetSelection';
import MainPage from './components/MainPage';
import './App.css';

function App() {
  const [selectedPet, setSelectedPet] = useState(null);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/" 
            element={
              <PetSelection 
                selectedPet={selectedPet} 
                setSelectedPet={setSelectedPet} 
              />
            } 
          />
          <Route 
            path="/main" 
            element={
              <MainPage 
                selectedPet={selectedPet} 
              />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;