import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import './UserList.css';

const UserList = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    firstName: '',
    phoneNumber: '',
    roleProfile: 'User',
    password: '',
  });
  const [warningMessage, setWarningMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/users', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`Failed to fetch users: ${response.statusText}`);
      const data = await response.json();
      setUsers(
        data.map((user) => ({
          fullName: user.firstName || 'Unknown',
          status: user.status || 'Active',
          userType: user.role || 'User',
          phoneNumber: user.phone_number || 'N/A',
          id: user.email,
          isTest: user.is_test || false,
        }))
      );
    } catch (error) {
      console.error('Error fetching users:', error);
      setWarningMessage(`Failed to fetch users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNewUserChange = (e) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.firstName || !newUser.phoneNumber || !newUser.password) {
      setWarningMessage('Please fill in all required fields.');
      return;
    }

    const newUserData = {
      email: newUser.email,
      firstName: newUser.firstName,
      phoneNumber: newUser.phoneNumber,
      role: newUser.roleProfile.toLowerCase(),
      password: newUser.password,
      status: 'Active',
      company: 'POS 8',
      pos_profile: 'POS-001',
    };

    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add user');
      }
      await fetchUsers();
      setNewUser({ email: '', firstName: '', phoneNumber: '', roleProfile: 'User', password: '' });
      setShowAddUserForm(false);
      setWarningMessage('User added successfully! You can now login with these credentials.');
    } catch (error) {
      console.error('Error adding user:', error);
      setWarningMessage(`Failed to add user: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (email) => {
    setUserToDelete(email);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/users/${userToDelete}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete user');
      }
      await fetchUsers();
      setWarningMessage('User deleted successfully!');
    } catch (error) {
      console.error('Error deleting user:', error);
      setWarningMessage(`Failed to delete user: ${error.message}`);
    } finally {
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      setLoading(false);
    }
  };

  const roleProfileOptions = ['User', 'Admin', 'Bearer'];

  return (
    <div className="user-list-page">
      <div className="header">
        <button className="back-btn" onClick={() => navigate('/admin')} disabled={loading}>
          <FaArrowLeft /> Back to Admin
        </button>
        <h2>User List</h2>
      </div>

      {warningMessage && (
        <div className="warning-box">
          <p className="warning-text">{warningMessage}</p>
          <button className="close-warning" onClick={() => setWarningMessage('')} disabled={loading}>
            ×
          </button>
        </div>
      )}

      {loading && <div className="loading">Loading...</div>}

      {!loading && (
        <div className="user-list-container">
          <div className="sidebar">
            <h3>Filters</h3>
            <div>
              <label>Filter By</label>
              <input type="text" placeholder="Begin typing" disabled={loading} />
            </div>
            <button className="edit-filters-btn" disabled={loading}>Edit Filters</button>
            <label>
              <input type="checkbox" disabled={loading} /> Show Tags
            </label>
            <div>
              <label>Save Filter</label>
              <input type="text" placeholder="Filter Name" disabled={loading} />
            </div>
          </div>

          <div className="main-content">
            <div className="user-list-header">
              <h3>User List</h3>
              <button className="add-user-btn" onClick={() => setShowAddUserForm(true)} disabled={loading}>
                Add User
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Status</th>
                  <th>User Type</th>
                  <th>Phone Number</th>
                  <th>ID</th>
                  <th>Test User</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((user, index) => (
                    <tr key={index}>
                      <td>{user.fullName}</td>
                      <td>{user.status}</td>
                      <td>{user.userType}</td>
                      <td>{user.phoneNumber}</td>
                      <td>{user.id}</td>
                      <td>{user.isTest ? 'Yes' : 'No'}</td>
                      <td>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={loading || user.isTest}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center' }}>
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="table-footer">{users.length} of {users.length}</div>

            {showAddUserForm && (
              <div className="add-user-form">
                <h3>Add New User</h3>
                <div className="form-content">
                  <div>
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={newUser.email}
                      onChange={handleNewUserChange}
                      placeholder="e.g., test@example.com"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label>First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={newUser.firstName}
                      onChange={handleNewUserChange}
                      placeholder="e.g., Test"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label>Phone Number</label>
                    <input
                      type="text"
                      name="phoneNumber"
                      value={newUser.phoneNumber}
                      onChange={handleNewUserChange}
                      placeholder="e.g., 1234567890"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label>Role Profile</label>
                    <select
                      name="roleProfile"
                      value={newUser.roleProfile}
                      onChange={handleNewUserChange}
                      disabled={loading}
                    >
                      {roleProfileOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Password</label>
                    <input
                      type="password"
                      name="password"
                      value={newUser.password}
                      onChange={handleNewUserChange}
                      placeholder="Enter password"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="form-buttons">
                  <button
                    className="cancel-btn"
                    onClick={() => setShowAddUserForm(false)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button className="save-btn" onClick={handleAddUser} disabled={loading}>
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <>
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)} />
          <div className="confirm-modal">
            <p className="confirm-text">Are you sure you want to delete user {userToDelete}?</p>
            <div className="modal-button-group">
              <button className="confirm-delete-btn" onClick={confirmDelete} disabled={loading}>
                {loading ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                className="cancel-delete-btn"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
              >
                No, Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserList;