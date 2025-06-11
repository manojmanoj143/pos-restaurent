import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUtensils, FaSave, FaPlus, FaTrash } from 'react-icons/fa';

function AddKitchenPage() {
  const navigate = useNavigate();
  const [kitchenName, setKitchenName] = useState('');
  const [kitchens, setKitchens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  // Fetch existing kitchens on component mount
  const fetchKitchens = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/kitchens');
      setKitchens(response.data);
    } catch (err) {
      setError(`Failed to fetch kitchens: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchens();
  }, []);

  // Handle form submission to save kitchen
  const handleSaveKitchen = async (e) => {
    e.preventDefault();
    if (!kitchenName.trim()) {
      setError('Kitchen name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage('');
      const response = await axios.post('http://localhost:5000/api/kitchens', { kitchen_name: kitchenName });
      setMessage(response.data.message);
      setKitchenName(''); // Clear input
      fetchKitchens(); // Refresh kitchen list
    } catch (err) {
      setError(`Failed to save kitchen: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle kitchen deletion
  const handleDeleteKitchen = async (kitchenId) => {
    if (!window.confirm('Are you sure you want to delete this kitchen?')) return;

    try {
      setLoading(true);
      setError(null);
      setMessage('');
      const response = await axios.delete(`http://localhost:5000/api/kitchens/${kitchenId}`);
      setMessage(response.data.message);
      fetchKitchens(); // Refresh kitchen list
    } catch (err) {
      setError(`Failed to delete kitchen: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Navigation handler
  const handleGoBack = () => navigate('/admin');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f6fa', padding: '20px' }}>
      <div className="container" style={{ maxWidth: '800px', marginTop: '20px' }}>
        {/* Back Button */}
        <button
          onClick={handleGoBack}
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
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            cursor: 'pointer',
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = '#3498db')}
          onMouseOut={(e) => (e.target.style.backgroundColor = '#f0f0f0')}
        >
          <FaArrowLeft style={{ fontSize: '24px' }} />
        </button>

        {/* Header */}
        <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#333', fontSize: '2rem' }}>
          <FaUtensils style={{ marginRight: '10px' }} /> Add Kitchen
        </h2>

        {/* Messages */}
        {loading && <div style={{ textAlign: 'center' }}>Loading...</div>}
        {error && (
          <div style={{ backgroundColor: '#ffebee', padding: '10px', marginBottom: '20px', color: '#c0392b' }}>
            {error}
          </div>
        )}
        {message && (
          <div style={{ backgroundColor: '#d4edda', padding: '10px', marginBottom: '20px', color: '#155724' }}>
            {message}
          </div>
        )}

        {/* Kitchen Form */}
        <form onSubmit={handleSaveKitchen} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <input
              type="text"
              value={kitchenName}
              onChange={(e) => setKitchenName(e.target.value)}
              placeholder="Enter Kitchen Name"
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '5px',
                border: '1px solid #ccc',
                fontSize: '1rem',
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: loading ? '#ccc' : '#3498db',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <FaSave /> {loading ? 'Saving...' : 'Save Kitchen'}
            </button>
          </div>
        </form>

        {/* Kitchen List */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '20px', color: '#333' }}>Kitchen Details</h3>
          {kitchens.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666' }}>No kitchens added yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {kitchens.map((kitchen) => (
                <li
                  key={kitchen._id}
                  style={{
                    padding: '10px',
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <FaUtensils style={{ color: '#3498db' }} />
                  <span>{kitchen.kitchen_name}</span>
                  <span style={{ marginLeft: 'auto', color: '#666', fontSize: '0.9rem' }}>
                    Added on: {new Date(kitchen.created_at).toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleDeleteKitchen(kitchen._id)}
                    disabled={loading}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: loading ? '#ccc' : '#e74c3c',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <FaTrash /> Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default AddKitchenPage;