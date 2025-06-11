import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'bearer', // Default role
    username: '',
    company: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Registration failed');

      console.log('Registration successful:', data);
      navigate('/login'); // Redirect to login page after successful registration
    } catch (err) {
      setError(err.message);
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const styles = {
    container: { 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      height: "100vh", 
      backgroundColor: "#f4f4f9",
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%'
    },
    registerBox: { 
      backgroundColor: "#fff", 
      padding: "20px", 
      borderRadius: "8px", 
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)", 
      width: "100%", 
      maxWidth: "400px" 
    },
    title: { 
      fontSize: "1.5em", 
      marginBottom: "20px", 
      color: "#333", 
      textAlign: "center" 
    },
    form: { 
      display: "flex", 
      flexDirection: "column" 
    },
    formGroup: { 
      marginBottom: "15px" 
    },
    label: { 
      fontSize: "14px", 
      marginBottom: "5px", 
      color: "#555" 
    },
    input: { 
      width: "100%", 
      padding: "10px", 
      fontSize: "14px", 
      border: "1px solid #ccc", 
      borderRadius: "5px", 
      outline: "none" 
    },
    button: { 
      width: "100%", 
      padding: "10px", 
      backgroundColor: "#28a745", 
      border: "none", 
      color: "white", 
      fontSize: "16px", 
      borderRadius: "5px", 
      cursor: "pointer",
      marginTop: "10px"
    },
    backButton: {
      width: "100%",
      padding: "10px",
      backgroundColor: "#6c757d",
      border: "none",
      color: "white",
      fontSize: "16px",
      borderRadius: "5px",
      cursor: "pointer",
      marginTop: "10px"
    },
    errorMessage: { 
      marginTop: "10px", 
      color: "red", 
      fontSize: "14px", 
      textAlign: "center" 
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.registerBox}>
        <h1 style={styles.title}>Register New User</h1>
        <form onSubmit={handleRegisterSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              style={styles.input}
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              style={styles.input}
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="role">Role</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              style={styles.input}
              required
            >
              <option value="bearer">Bearer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              style={styles.input}
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="company">Company</label>
            <input
              type="text"
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Enter your company (optional)"
              style={styles.input}
            />
          </div>
          <button type="submit" style={styles.button} disabled={isLoading}>
            {isLoading ? "Registering..." : "Register"}
          </button>
          <button
            type="button"
            style={styles.backButton}
            onClick={() => navigate('/login')}
          >
            Back to Login
          </button>
          {error && <div style={styles.errorMessage}>{error}</div>}
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;