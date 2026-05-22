import React, { useState } from 'react';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleLogin = () => {
    // Add your login logic here
    console.log('Login button clicked');
  };

  const handleSignup = () => {
    // Add your signup logic here
    console.log('Signup button clicked');
  };

  const handleToggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className={isDarkMode ? 'app dark-mode' : 'app'}>
      {currentPage === 'home' && (
        <div className="home-page">
          <h1>Welcome to our website!</h1>
          <button className="login-button" onClick={() => setCurrentPage('login')}>Login</button>
          <button className="signup-button" onClick={() => setCurrentPage('signup')}>Signup</button>
        </div>
      )}
      {currentPage === 'login' && (
        <div className="login-page">
          <h1>Login</h1>
          <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="login-button" onClick={handleLogin}>Login</button>
          <button className="back-button" onClick={() => setCurrentPage('home')}>Back</button>
        </div>
      )}
      {currentPage === 'signup' && (
        <div className="signup-page">
          <h1>Signup</h1>
          <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input type="password" placeholder="Confirm Password" />
          <button className="signup-button" onClick={handleSignup}>Signup</button>
          <button className="back-button" onClick={() => setCurrentPage('home')}>Back</button>
        </div>
      )}
      <button className="toggle-dark-mode-button" onClick={handleToggleDarkMode}>Toggle Dark Mode</button>
    </div>
  );
}

export default App;