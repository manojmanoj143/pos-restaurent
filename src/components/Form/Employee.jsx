import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaPlusCircle, FaUsers, FaEdit, FaTrash } from 'react-icons/fa';

function EmployeePage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    countryCode: '+91', // Default to India
    phoneNumber: '',
    vehicleNumber: '',
    role: 'Delivery Boy',
  });
  const [editMode, setEditMode] = useState(false);
  const [editEmployeeId, setEditEmployeeId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  // List of country codes for dropdown
  const countryCodes = [
    { code: '+91', country: 'India' },
    { code: '+1', country: 'USA' },
    { code: '+971', country: 'UAE (Dubai)' },
    { code: '+44', country: 'UK' },
    { code: '+61', country: 'Australia' },
  ];

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('http://localhost:5000/api/employees');
      const data = Array.isArray(response.data) ? response.data : [];
      setEmployees(data);
    } catch (err) {
      setError(`Failed to fetch employees: ${err.message}`);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle employee creation
  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    const fullPhoneNumber = `${formData.countryCode}${formData.phoneNumber}`;
    if (!formData.name || !formData.phoneNumber || !formData.vehicleNumber) {
      setError('Please fill in all fields');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setMessage('');
      await axios.post('http://localhost:5000/api/employees', {
        name: formData.name,
        phoneNumber: fullPhoneNumber,
        vehicleNumber: formData.vehicleNumber,
        role: formData.role,
      });
      setMessage('Employee created successfully');
      setFormData({ name: '', countryCode: '+91', phoneNumber: '', vehicleNumber: '', role: 'Delivery Boy' });
      fetchEmployees();
    } catch (err) {
      setError(`Failed to create employee: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle employee edit
  const handleEditEmployee = (employee) => {
    setEditMode(true);
    setEditEmployeeId(employee.employeeId);
    const countryCode = countryCodes.find(code => employee.phoneNumber.startsWith(code.code))?.code || '+91';
    const phoneNumber = employee.phoneNumber.slice(countryCode.length);
    setFormData({
      name: employee.name,
      countryCode,
      phoneNumber,
      vehicleNumber: employee.vehicleNumber,
      role: employee.role,
    });
    setSelectedEmployee(employee);
  };

  // Handle employee update
  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    const fullPhoneNumber = `${formData.countryCode}${formData.phoneNumber}`;
    if (!formData.name || !formData.phoneNumber || !formData.vehicleNumber) {
      setError('Please fill in all fields');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setMessage('');
      await axios.put(`http://localhost:5000/api/employees/${editEmployeeId}`, {
        name: formData.name,
        phoneNumber: fullPhoneNumber,
        vehicleNumber: formData.vehicleNumber,
        role: formData.role,
      });
      setMessage('Employee updated successfully');
      setFormData({ name: '', countryCode: '+91', phoneNumber: '', vehicleNumber: '', role: 'Delivery Boy' });
      setEditMode(false);
      setEditEmployeeId(null);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (err) {
      setError(`Failed to update employee: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle employee deletion
  const handleDeleteEmployee = async (employeeId) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      setLoading(true);
      setError(null);
      setMessage('');
      await axios.delete(`http://localhost:5000/api/employees/${employeeId}`);
      setMessage('Employee deleted successfully');
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (err) {
      setError(`Failed to delete employee: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle employee selection
  const handleSelectEmployee = (employee) => {
    setSelectedEmployee(employee);
    setEditMode(false);
    setFormData({ name: '', countryCode: '+91', phoneNumber: '', vehicleNumber: '', role: 'Delivery Boy' });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f6fa', padding: '20px', marginLeft: '250px' }}>
      <div style={{ maxWidth: '1200px', margin: '40px auto 0' }}>
        <button
          onClick={() => navigate('/admin')}
          style={{
            position: 'fixed',
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
            zIndex: 1000,
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = '#3498db')}
          onMouseOut={(e) => (e.target.style.backgroundColor = '#f0f0f0')}
        >
          <FaArrowLeft style={{ fontSize: '24px', color: '#333' }} />
        </button>

        <h2 style={{ textAlign: 'center', marginBottom: '40px', color: '#333', fontSize: '2rem', fontWeight: '600' }}>
          Employee Management
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

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* Create/Edit Employee Form */}
          <div
            style={{
              flex: '1',
              backgroundColor: '#fff',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
              minWidth: '300px',
            }}
          >
            <h3 style={{ marginBottom: '20px', color: '#333', fontSize: '1.5rem', fontWeight: '600' }}>
              {editMode ? 'Edit Employee' : 'Create Delivery Boy'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Employee Name"
                style={{
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '1rem',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  name="countryCode"
                  value={formData.countryCode}
                  onChange={handleInputChange}
                  style={{
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '5px',
                    fontSize: '1rem',
                    outline: 'none',
                    width: '150px',
                  }}
                >
                  {countryCodes.map(({ code, country }) => (
                    <option key={code} value={code}>
                      {`${country} (${code})`}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="Phone Number"
                  style={{
                    flex: '1',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '5px',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />
              </div>
              <input
                type="text"
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={handleInputChange}
                placeholder="Vehicle Number"
                style={{
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '1rem',
                  outline: 'none',
                }}
              />
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                style={{
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '1rem',
                  outline: 'none',
                }}
              >
                <option value="Delivery Boy">Delivery Boy</option>
              </select>
              <button
                onClick={editMode ? handleUpdateEmployee : handleCreateEmployee}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: loading ? '#ccc' : '#3498db',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#2980b9')}
                onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#3498db')}
              >
                <FaPlusCircle style={{ marginRight: '5px' }} />
                {loading ? 'Processing...' : editMode ? 'Update Employee' : 'Create Employee'}
              </button>
              {editMode && (
                <button
                  onClick={() => {
                    setEditMode(false);
                    setFormData({ name: '', countryCode: '+91', phoneNumber: '', vehicleNumber: '', role: 'Delivery Boy' });
                    setEditEmployeeId(null);
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#ccc',
                    color: '#333',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s',
                  }}
                  onMouseOver={(e) => (e.target.style.backgroundColor = '#bbb')}
                  onMouseOut={(e) => (e.target.style.backgroundColor = '#ccc')}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Employee List */}
          <div
            style={{
              flex: '1',
              backgroundColor: '#fff',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
              minWidth: '300px',
            }}
          >
            <h3 style={{ marginBottom: '20px', color: '#333', fontSize: '1.5rem', fontWeight: '600' }}>
              Employee List
            </h3>
            {employees.length === 0 ? (
              <p style={{ color: '#555' }}>No employees found</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: '0' }}>
                {employees.map((employee) => (
                  <li
                    key={employee.employeeId}
                    style={{
                      padding: '10px',
                      borderBottom: '1px solid #eee',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
                  >
                    <div
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      onClick={() => handleSelectEmployee(employee)}
                    >
                      <FaUsers style={{ marginRight: '10px', color: '#3498db' }} />
                      <span>{employee.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        onClick={() => handleEditEmployee(employee)}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: '#f1c40f',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        onMouseOver={(e) => (e.target.style.backgroundColor = '#d4ac0d')}
                        onMouseOut={(e) => (e.target.style.backgroundColor = '#f1c40f')}
                      >
                        <FaEdit style={{ marginRight: '5px' }} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(employee.employeeId)}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: '#e74c3c',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        onMouseOver={(e) => (e.target.style.backgroundColor = '#c0392b')}
                        onMouseOut={(e) => (e.target.style.backgroundColor = '#e74c3c')}
                      >
                        <FaTrash style={{ marginRight: '5px' }} />
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Employee Details */}
        {selectedEmployee && (
          <div
            style={{
              marginTop: '20px',
              backgroundColor: '#fff',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ marginBottom: '20px', color: '#333', fontSize: '1.5rem', fontWeight: '600' }}>
              Employee Details
            </h3>
            <p style={{ margin: '5px 0' }}><strong>Name:</strong> {selectedEmployee.name}</p>
            <p style={{ margin: '5px 0' }}><strong>Phone Number:</strong> {selectedEmployee.phoneNumber}</p>
            <p style={{ margin: '5px 0' }}><strong>Vehicle Number:</strong> {selectedEmployee.vehicleNumber}</p>
            <p style={{ margin: '5px 0' }}><strong>Role:</strong> {selectedEmployee.role}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmployeePage;