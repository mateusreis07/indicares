import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Relatorios from './components/Relatorios';

// Um PrivateRoute simples que verifica o localStorage
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/relatorios" 
          element={
            <PrivateRoute>
              <Relatorios />
            </PrivateRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
