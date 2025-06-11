// src/components/Form/AddItemGroupPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaBox, FaTrash } from 'react-icons/fa';

function AddItemGroupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ group_name: '' });
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch existing item groups
  const fetchGroups = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/item-groups');
      setGroups(response.data);
    } catch (err) {
      setError('Failed to fetch item groups');
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleGoBack = () => navigate('/admin');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post('http://localhost:5000/api/item-groups', {
        group_name: formData.group_name.trim(),
      });
      setSuccess(response.data.message);
      setFormData({ group_name: '' });
      fetchGroups(); // Refresh the group list
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create item group');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this item group?')) return;

    try {
      setLoading(true);
      setError(null);
      await axios.delete(`http://localhost:5000/api/item-groups/${groupId}`);
      setSuccess('Item group deleted successfully');
      fetchGroups(); // Refresh the group list
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete item group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
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
          transition: 'background-color 0.3s',
        }}
        onMouseOver={(e) => (e.target.style.backgroundColor = '#3498db')}
        onMouseOut={(e) => (e.target.style.backgroundColor = '#f0f0f0')}
      >
        <FaArrowLeft style={{ fontSize: '24px', color: '#333' }} />
      </button>

      <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>
        <FaBox style={{ marginRight: '10px' }} /> Add Item Group
      </h2>

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
      {success && (
        <div
          style={{
            backgroundColor: '#d4edda',
            padding: '10px',
            marginBottom: '20px',
            color: '#155724',
            borderRadius: '5px',
          }}
        >
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Group Name</label>
          <input
            type="text"
            name="group_name"
            value={formData.group_name}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
            placeholder="e.g., Burgers, Addons, Combos"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: loading ? '#ccc' : '#3498db',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.3s',
          }}
          onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#2980b9')}
          onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#3498db')}
        >
          {loading ? 'Adding...' : 'Add Item Group'}
        </button>
      </form>

      {/* Display Groups List */}
      <div style={{ marginTop: '30px' }}>
        <h3 style={{ color: '#333', fontSize: '1.5rem', marginBottom: '15px' }}>Existing Item Groups</h3>
        {groups.length === 0 ? (
          <p style={{ color: '#666' }}>No item groups added yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {groups.map((group) => (
              <li
                key={group._id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px',
                  backgroundColor: '#fff',
                  borderRadius: '5px',
                  marginBottom: '10px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <span>{group.group_name}</span>
                <button
                  onClick={() => handleDelete(group._id)}
                  style={{
                    backgroundColor: '#e74c3c',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '5px 10px',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s',
                  }}
                  onMouseOver={(e) => (e.target.style.backgroundColor = '#c0392b')}
                  onMouseOut={(e) => (e.target.style.backgroundColor = '#e74c3c')}
                >
                  <FaTrash />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default AddItemGroupPage;