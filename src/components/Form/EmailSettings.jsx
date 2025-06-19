import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import axios from 'axios';

function EmailSettings() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const fetchEmailSettings = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/get-email-settings');
        if (response.data.success) {
          setEmail(response.data.email || '');
          setFromEmail(response.data.from_email || '');
        }
      } catch (error) {
        setMessage(`Failed to fetch email settings: ${error.message}`);
        setMessageType('error');
      }
    };
    fetchEmailSettings();
  }, []);

  const handleGoBack = () => {
    navigate('/admin');
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleTestSettings = async () => {
    if (!email || !password) {
      setMessage('Please provide email and app password to test');
      setMessageType('error');
      return;
    }

    if (!validateEmail(email)) {
      setMessage('Please enter a valid email address');
      setMessageType('error');
      return;
    }

    setTesting(true);
    try {
      const response = await axios.post('http://localhost:5000/api/test-email-settings', {
        email,
        password,
      });
      setMessage(response.data.message);
      setMessageType('success');
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      setMessage(errorMessage);
      setMessageType('error');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!email || !password || !fromEmail) {
      setMessage('Please provide email, app password, and from email');
      setMessageType('error');
      return;
    }

    if (!validateEmail(email) || !validateEmail(fromEmail)) {
      setMessage('Please enter valid email addresses');
      setMessageType('error');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/save-email-settings', {
        email,
        password,
        from_email: fromEmail,
      });
      setMessage(response.data.message);
      setMessageType('success');
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      setMessage(errorMessage);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '600px' }}>
      {message && (
        <div
          className={`alert alert-${messageType === 'success' ? 'success' : 'danger'} text-center alert-dismissible fade show`}
          role="alert"
        >
          {message}
          <button
            type="button"
            className="btn-close"
            onClick={() => setMessage('')}
            aria-label="Close"
          ></button>
        </div>
      )}

      <button
        onClick={handleGoBack}
        className="btn btn-outline-secondary"
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
        }}
        onMouseOver={(e) => {
          e.target.style.backgroundColor = '#e0e0e0';
          e.target.style.transform = 'scale(1.1)';
        }}
        onMouseOut={(e) => {
          e.target.style.backgroundColor = 'transparent';
          e.target.style.transform = 'scale(1)';
        }}
      >
        <FaArrowLeft style={{ fontSize: '24px' }} />
      </button>

      <h2
        className="text-center mb-5"
        style={{
          color: '#333',
          fontWeight: '600',
          fontSize: '2.5rem',
          textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
        }}
      >
        Email Settings
      </h2>

      <div className="card p-4" style={{ boxShadow: '0 4px 8px rgba(0,0,0,0.1)', borderRadius: '10px' }}>
        <div className="mb-3">
          <label htmlFor="email" className="form-label" style={{ fontWeight: '500', color: '#333' }}>
            Email Address
          </label>
          <input
            type="email"
            className="form-control"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            style={{ borderRadius: '8px', padding: '10px' }}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="fromEmail" className="form-label" style={{ fontWeight: '500', color: '#333' }}>
            From Email Address
          </label>
          <input
            type="email"
            className="form-control"
            id="fromEmail"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder="Enter sender email"
            style={{ borderRadius: '8px', padding: '10px' }}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="password" className="form-label" style={{ fontWeight: '500', color: '#333' }}>
            App Password
          </label>
          <input
            type="password"
            className="form-control"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your app password"
            style={{ borderRadius: '8px', padding: '10px' }}
          />
          <small className="form-text text-muted">
            For Gmail, use an App Password from your Google Account settings.{' '}
            <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer">
              Learn more
            </a>
          </small>
        </div>
        <div className="d-flex justify-content-between">
          <button
            className="btn btn-secondary"
            onClick={handleTestSettings}
            disabled={testing || loading}
            style={{
              width: '48%',
              padding: '12px',
              fontSize: '1.2rem',
              borderRadius: '8px',
              backgroundColor: testing || loading ? '#ccc' : '#6c757d',
              border: 'none',
              transition: 'all 0.3s ease',
            }}
            onMouseOver={(e) => !(testing || loading) && (e.target.style.backgroundColor = '#5a6268')}
            onMouseOut={(e) => !(testing || loading) && (e.target.style.backgroundColor = '#6c757d')}
          >
            {testing ? 'Testing...' : 'Test Settings'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSaveSettings}
            disabled={loading || testing}
            style={{
              width: '48%',
              padding: '12px',
              fontSize: '1.2rem',
              borderRadius: '8px',
              backgroundColor: loading || testing ? '#ccc' : '#007bff',
              border: 'none',
              transition: 'all 0.3s ease',
            }}
            onMouseOver={(e) => !(loading || testing) && (e.target.style.backgroundColor = '#0056b3')}
            onMouseOut={(e) => !(loading || testing) && (e.target.style.backgroundColor = '#007bff')}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .alert {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1050;
          min-width: 300px;
          padding: 15px;
          font-size: 1rem;
        }
        @media (max-width: 991px) {
          .alert {
            min-width: 80%;
          }
        }
        @media (max-width: 576px) {
          .alert {
            min-width: 90%;
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
}

export default EmailSettings;