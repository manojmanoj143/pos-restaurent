import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FaArrowLeft,
  FaHome,
  FaMoneyBill,
  FaFileAlt,
  FaChartBar,
  FaDatabase,
  FaCog,
  FaUsers,
  FaBox,
  FaPlusCircle,
  FaTable,
  FaUtensils,
  FaLayerGroup,
  FaUserTie,
  FaEnvelope, // Added for Email Settings icon
} from 'react-icons/fa';

function AdminPage() {
  const navigate = useNavigate();
  const [customerCount, setCustomerCount] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [backupCount, setBackupCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMasterOpen, setIsMasterOpen] = useState(true);
  const [importFile, setImportFile] = useState(null);
  const [message, setMessage] = useState('');

  // Navigation handlers
  const handleGoBack = () => navigate('/');
  const handleNavigation = (path) => navigate(path);
  const toggleMasterMenu = () => setIsMasterOpen(!isMasterOpen);

  // Fetch dashboard counts
  const fetchCounts = async () => {
    try {
      const customerResponse = await axios.get('http://localhost:5000/api/customers');
      setCustomerCount(customerResponse.data.length);

      const itemResponse = await axios.get('http://localhost:5000/api/items');
      setItemCount(itemResponse.data.length);

      const backupResponse = await axios.get('http://localhost:5000/api/backup-info').catch(() => ({ data: [] }));
      setBackupCount(Math.min(backupResponse.data.length, 5));
    } catch (err) {
      setError(`Failed to fetch dashboard data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  // File import handlers
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.json')) {
      setImportFile(file);
      setMessage('');
      setError(null);
      console.log('Selected file:', file.name);
    } else {
      setImportFile(null);
      setError('Please select a valid JSON file');
    }
  };

  const handleImportMongoDB = async () => {
    if (!importFile) {
      setError('Please select a JSON file to import');
      return;
    }
    const formData = new FormData();
    formData.append('file', importFile);
    try {
      setLoading(true);
      setMessage('');
      setError(null);
      console.log('Sending POST request to /api/import-mongodb with file:', importFile.name);
      const response = await axios.post('http://localhost:5000/api/import-mongodb', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
        },
      });
      console.log('Import successful. Response:', response.data);
      setMessage(response.data.message);
      setImportFile(null);
      fetchCounts();
    } catch (err) {
      console.error('Import request failed:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        headers: err.response?.headers,
      });
      setError(
        err.response?.data?.error ||
        `Failed to import data: ${err.response?.status || 'Unknown'} - ${err.response?.statusText || err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <div
        className="sidebar"
        style={{
          width: '250px',
          backgroundColor: '#fff',
          padding: '20px 0',
          position: 'fixed',
          height: '100%',
          boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
          overflowY: 'auto',
        }}
      >
        <h3 style={{ color: '#000', textAlign: 'center', padding: '20px 0', fontSize: '1.5rem', fontWeight: '600' }}>
          Admin Menu
        </h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li
            style={{
              padding: '15px 20px',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={toggleMasterMenu}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <FaHome style={{ marginRight: '15px', fontSize: '1.2rem' }} />
            <span>Master</span>
          </li>
          {isMasterOpen && (
            <ul style={{ listStyle: 'none', paddingLeft: '40px' }}>
              {[
                { icon: <FaUsers />, text: 'View All Customers', path: '/customers' },
                { icon: <FaBox />, text: 'View All Items', path: '/items' },
                { icon: <FaPlusCircle />, text: 'Add New Item', path: '/create-item' },
                { icon: <FaTable />, text: 'Add New Table', path: '/add-table' },
                { icon: <FaBox />, text: 'Add Item Group', path: '/add-item-group' },
                { icon: <FaUtensils />, text: 'Add Kitchen', path: '/add-kitchen' },
                { icon: <FaUtensils />, text: 'Add Ingredient & Nutrition', path: '/add-ingredients-nutrition' },
                { icon: <FaLayerGroup />, text: 'Add Variant', path: '/create-variant' },
                { icon: <FaUserTie />, text: 'Employees', path: '/employees' },
                { icon: <FaEnvelope />, text: 'Email Settings', path: '/email-settings' }, // Added Email Settings
              ].map((item, index) => (
                <li
                  key={index}
                  onClick={() => handleNavigation(item.path)}
                  style={{
                    padding: '10px 20px',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span style={{ marginRight: '10px', fontSize: '1rem' }}>{item.icon}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          )}
          {[
            { icon: <FaUsers />, text: 'Users', path: '/users' },
            { icon: <FaFileAlt />, text: 'Record', path: '/record' },
            { icon: <FaDatabase />, text: 'Backups', path: '/backup' },
            { icon: <FaCog />, text: 'Settings', path: '/system-settings' },
          ].map((item, index) => (
            <li
              key={index}
              onClick={() => handleNavigation(item.path)}
              style={{
                padding: '15px 20px',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span style={{ marginRight: '15px', fontSize: '1.2rem' }}>{item.icon}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginLeft: '250px', flex: 1, padding: '20px' }}>
        <div style={{ maxWidth: '1200px', margin: '40px auto 0' }}>
          <button
            onClick={handleGoBack}
            style={{
              position: 'absolute',
              top: '20px',
              left: '270px',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              cursor: 'pointer',
              transition: 'background-color 0.3s',
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = '#3498db')}
            onMouseOut={(e) => (e.target.style.backgroundColor = '#f0f0f0')}
          >
            <FaArrowLeft style={{ fontSize: '24px', color: '#333' }} />
          </button>

          <h2 style={{ textAlign: 'center', marginBottom: '40px', color: '#333', fontSize: '2rem', fontWeight: '600' }}>
            Admin Dashboard
          </h2>

          {loading && (
            <div style={{ textAlign: 'center', color: '#666', fontSize: '1.2rem' }}>Loading...</div>
          )}
          {error && (
            <div
              style={{
                backgroundColor: '#ffebee',
                padding: '10px',
                marginBottom: '20px',
                color: '#c0392b',
                borderRadius: '5px',
              }}
            >
              {error}
            </div>
          )}
          {message && (
            <div
              style={{
                backgroundColor: message.includes('success') ? '#d4edda' : '#ffebee',
                padding: '10px',
                marginBottom: '20px',
                color: message.includes('success') ? '#155724' : '#c0392b',
                borderRadius: '5px',
              }}
            >
              {message}
            </div>
          )}

          {!loading && !error && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div
                style={{
                  padding: '20px',
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  textAlign: 'center',
                  width: '200px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                }}
                onClick={() => handleNavigation('/customers')}
                onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <FaUsers style={{ fontSize: '2rem', color: '#3498db', marginBottom: '10px' }} />
                <h4 style={{ margin: '0', color: '#333' }}>Total Customers</h4>
                <p style={{ fontSize: '1.5rem', margin: '5px 0 0', color: '#555' }}>{customerCount}</p>
              </div>
              <div
                style={{
                  padding: '20px',
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  textAlign: 'center',
                  width: '200px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                }}
                onClick={() => handleNavigation('/items')}
                onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <FaBox style={{ fontSize: '2rem', color: '#3498db', marginBottom: '10px' }} />
                <h4 style={{ margin: '0', color: '#333' }}>Total Items</h4>
                <p style={{ fontSize: '1.5rem', margin: '5px 0 0', color: '#555' }}>{itemCount}</p>
              </div>
              <div
                style={{
                  padding: '20px',
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  textAlign: 'center',
                  width: '200px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                }}
                onClick={() => handleNavigation('/backup')}
                onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <FaDatabase style={{ fontSize: '2rem', color: '#3498db', marginBottom: '10px' }} />
                <h4 style={{ margin: '0', color: '#333' }}>Total Backups</h4>
                <p style={{ fontSize: '1.5rem', margin: '5px 0 0', color: '#555' }}>{backupCount}</p>
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: '40px',
              backgroundColor: '#fff',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ marginBottom: '20px', color: '#333', fontSize: '1.5rem', fontWeight: '600' }}>
              Import Data to MongoDB
            </h3>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                style={{
                  padding: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '1rem',
                }}
              />
              <button
                onClick={handleImportMongoDB}
                disabled={loading || !importFile}
                style={{
                  padding: '10px 20px',
                  backgroundColor: loading || !importFile ? '#ccc' : '#3498db',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: loading || !importFile ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.3s',
                }}
                onMouseOver={(e) =>
                  !loading && importFile && (e.target.style.backgroundColor = '#2980b9')
                }
                onMouseOut={(e) =>
                  !loading && importFile && (e.target.style.backgroundColor = '#3498db')
                }
              >
                {loading ? 'Importing...' : 'Import JSON'}
              </button>
            </div>
            {importFile && (
              <p style={{ marginTop: '10px', color: '#555' }}>Selected file: {importFile.name}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPage;