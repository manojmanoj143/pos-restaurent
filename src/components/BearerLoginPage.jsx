// src/components/BearerLoginPage.js
import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../Context/UserContext';
import axios from 'axios';
import './BearerLoginPage.css';

function BearerLoginPage() {
  const navigate = useNavigate();
  const { setUser } = useContext(UserContext);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [usernames, setUsernames] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    const storedUsernames = JSON.parse(localStorage.getItem('usernames') || '[]');
    setUsernames(storedUsernames);
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/settings', {
        headers: { 'Content-Type': 'application/json' },
      });
      setSettings(response.data);
    } catch (err) {
      setError('Failed to fetch settings: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleIdentifierChange = (e) => {
    const value = e.target.value;
    setIdentifier(value);
    setShowDropdown(value.length > 0 && usernames.length > 0);
  };

  const handleUsernameSelect = (selectedUsername) => {
    setIdentifier(selectedUsername);
    setShowDropdown(false);
    if (inputRef.current) {
      inputRef.current.value = selectedUsername;
      inputRef.current.focus();
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        identifier,
        password,
        type: 'mobile_or_username',
      }, {
        headers: { 'Content-Type': 'application/json' },
      });

      const { user, requires_opening_entry } = response.data;
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));

      if (identifier) {
        const updatedUsernames = usernames.includes(identifier)
          ? usernames
          : [...usernames, identifier].slice(-5); // Limit to last 5 usernames
        localStorage.setItem('usernames', JSON.stringify(updatedUsernames));
        setUsernames(updatedUsernames);
      }

      const role = user.role.toLowerCase();
      if (role === 'bearer') {
        // Navigate based on requires_opening_entry
        navigate(requires_opening_entry ? '/opening-entry' : '/home');
      } else if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate(`/${role}/${user.id}`);
      }
      console.log('Login successful:', response.data);
    } catch (err) {
      setError('Login failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const getLabel = () => {
    const mobileOrUsername = settings.allowLoginUsingMobileNumber && settings.allowLoginUsingUserName && !settings.loginWithEmailLink;
    return mobileOrUsername ? 'Mobile Number or Username' : 'Identifier';
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2 className="login-title">Login</h2>
        <form className="login-form" onSubmit={handleLoginSubmit}>
          <div className="form-group username-container">
            <label className="form-label">{getLabel()}:</label>
            <input
              type="text"
              className="form-input"
              value={identifier}
              onChange={handleIdentifierChange}
              ref={inputRef}
              placeholder={`Enter ${getLabel().toLowerCase()}`}
              disabled={isLoading}
              autoComplete="off"
            />
            {showDropdown && (
              <ul className="username-dropdown">
                {usernames
                  .filter((name) => name.toLowerCase().includes(identifier.toLowerCase()))
                  .map((name) => (
                    <li key={name} className="dropdown-item" onClick={() => handleUsernameSelect(name)}>
                      {name}
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Password:</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={isLoading}
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="submit-button" disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default BearerLoginPage;