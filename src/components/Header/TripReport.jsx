import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft } from 'react-icons/fa';
import './TripReport.css';

function TripReport() {
  const navigate = useNavigate();
  const [deliveryPerson, setDeliveryPerson] = useState('');
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [tripReports, setTripReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const vatRate = 0.10;

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('http://localhost:5000/api/employees');
      const data = Array.isArray(response.data) ? response.data : [];
      setEmployees(data);
      setFilteredEmployees(data);
    } catch (err) {
      setError(`Failed to fetch employees: ${err.message}`);
      setEmployees([]);
      setFilteredEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTripReports = async (employeeId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`http://localhost:5000/api/tripreports/${employeeId}`);
      const data = Array.isArray(response.data) ? response.data : [];
      const sanitizedReports = data.map((report) => ({
        ...report,
        chairsBooked: Array.isArray(report.chairsBooked) ? report.chairsBooked : [],
        cartItems: Array.isArray(report.cartItems) ? report.cartItems : [],
        pickedUpTime: report.pickedUpTime || null,
      }));
      setTripReports(sanitizedReports);
      filterReportsByDate(sanitizedReports, selectedDate);
    } catch (err) {
      setError(`Failed to fetch trip reports: ${err.message}`);
      setTripReports([]);
      setFilteredReports([]);
    } finally {
      setLoading(false);
    }
  };

  const filterReportsByDate = (reports, date) => {
    if (!date) {
      setFilteredReports(reports);
      return;
    }
    const selectedDateObj = new Date(date);
    const filtered = reports.filter((report) => {
      if (!report.timestamp) return false;
      const reportDate = new Date(report.timestamp);
      return (
        reportDate.getFullYear() === selectedDateObj.getFullYear() &&
        reportDate.getMonth() === selectedDateObj.getMonth() &&
        reportDate.getDate() === selectedDateObj.getDate()
      );
    });
    setFilteredReports(filtered);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setDeliveryPerson(value);
    setSelectedEmployee(null);
    setTripReports([]);
    setFilteredReports([]);
    if (value.trim()) {
      const filtered = employees.filter((emp) =>
        emp.name.toLowerCase().includes(value.toLowerCase()) &&
        emp.role.toLowerCase() === 'delivery boy'
      );
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(employees.filter((emp) => emp.role.toLowerCase() === 'delivery boy'));
    }
  };

  const handleSelectEmployee = (e) => {
    const employeeId = e.target.value;
    const employee = employees.find((emp) => emp.employeeId === employeeId);
    if (employee) {
      setDeliveryPerson(employee.name);
      setSelectedEmployee(employee);
      fetchTripReports(employee.employeeId);
    } else {
      setDeliveryPerson('');
      setSelectedEmployee(null);
      setTripReports([]);
      setFilteredReports([]);
    }
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    filterReportsByDate(tripReports, date);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!deliveryPerson.trim()) {
      alert('Please select a delivery person');
      return;
    }
    const employee = employees.find((emp) => emp.name.toLowerCase() === deliveryPerson.toLowerCase());
    if (employee) {
      setSelectedEmployee(employee);
      fetchTripReports(employee.employeeId);
      alert(`Delivery Person Selected: ${employee.name}`);
    } else {
      alert('Delivery person not found');
      setSelectedEmployee(null);
      setTripReports([]);
      setFilteredReports([]);
    }
  };

  const handleBack = () => {
    navigate('/home');
  };

  const handleShowDetails = (report) => {
    setSelectedReport(report);
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setSelectedReport(null);
  };

  const handlePayment = (method, amount) => {
    alert(`Payment of ₹${amount} via ${method} initiated.`);
    // Implement payment logic here
  };

  const formatDeliveryAddress = (deliveryAddress) => {
    if (!deliveryAddress) return 'Not provided';
    const { building_name, flat_villa_no, location } = deliveryAddress;
    const parts = [flat_villa_no, building_name, location].filter((part) => part && part.trim() !== '');
    return parts.length > 0 ? parts.join(', ') : 'Not provided';
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const calculateOrderTotal = (cartItems) => {
    if (!Array.isArray(cartItems)) return '0.00';
    return cartItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0).toFixed(2);
  };

  const calculateGrandTotal = (cartItems) => {
    if (!Array.isArray(cartItems)) return '0.00';
    const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
    const vat = subtotal * vatRate;
    return (subtotal + vat).toFixed(2);
  };

  return (
    <div className="trip-main">
      <div className="active-orders-header">
        <FaArrowLeft
          className="active-orders-back-button"
          onClick={handleBack}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === 'Enter' && handleBack()}
        />
        <h1>Delivery Person Trip Report</h1>
      </div>

      <div className="content-wrapper">
        {loading && (
          <div style={{ textAlign: 'center', color: '#666', fontSize: '1.2rem' }}>
            Loading...
          </div>
        )}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        <div className="form-container">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="deliveryPerson" className="form-label">
                Delivery Person
              </label>
              <input
                type="text"
                className="form-control"
                id="deliveryPersonInput"
                value={deliveryPerson}
                onChange={handleInputChange}
                placeholder="Type delivery person name"
                autoComplete="off"
              />
              <select
                className="form-control mt-2"
                id="deliveryPerson"
                name="deliveryPerson"
                value={selectedEmployee ? selectedEmployee.employeeId : ''}
                onChange={handleSelectEmployee}
              >
                <option value="">Select a delivery person</option>
                {filteredEmployees
                  .filter((emp) => emp.role.toLowerCase() === 'delivery boy')
                  .map((employee) => (
                    <option key={employee.employeeId} value={employee.employeeId}>
                      {employee.name} (ID: {employee.employeeId})
                    </option>
                  ))}
              </select>
            </div>
            <div className="mb-3">
              <label htmlFor="dateFilter" className="form-label">
                Filter by Date
              </label>
              <input
                type="date"
                className="form-control"
                id="dateFilter"
                value={selectedDate}
                onChange={handleDateChange}
              />
            </div>
            <button type="submit" className="submit-button">
              Submit
            </button>
          </form>
        </div>

        {selectedEmployee && (
          <div className="employee-details">
            <h3>Selected Delivery Person</h3>
            <p><strong>Name:</strong> {selectedEmployee.name}</p>
            <p><strong>ID:</strong> {selectedEmployee.employeeId}</p>
            <p><strong>Role:</strong> {selectedEmployee.role}</p>
          </div>
        )}

        {selectedEmployee && filteredReports.length > 0 && (
          <div className="active-orders-table-wrapper">
            <h2>Assigned Delivery Orders</h2>
            <div className="grand-totals">
              {filteredReports.map((report, index) => (
                <div key={report.tripId} className="grand-total-item">
                  <span>Grand Total: ₹{calculateGrandTotal(report.cartItems)}</span>
                  <div className="payment-buttons">
                    <button
                      className="payment-button cash"
                      onClick={() => handlePayment('Cash', calculateGrandTotal(report.cartItems))}
                    >
                      Cash
                    </button>
                    <button
                      className="payment-button card"
                      onClick={() => handlePayment('Card', calculateGrandTotal(report.cartItems))}
                    >
                      Card
                    </button>
                    <button
                      className="payment-button upi"
                      onClick={() => handlePayment('UPI', calculateGrandTotal(report.cartItems))}
                    >
                      UPI
                    </button>
                    <button
                      className="details-button"
                      onClick={() => handleShowDetails(report)}
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {selectedEmployee && filteredReports.length === 0 && !loading && (
          <div className="no-orders">
            <p>No delivery orders assigned to {selectedEmployee.name} for the selected date.</p>
          </div>
        )}

        {showPopup && selectedReport && (
          <div className="popup-overlay">
            <div className="popup-content">
              <h3>Order Details</h3>
              <table className="popup-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Delivery Address</th>
                    <th>Timestamp</th>
                    <th>Total (₹)</th>
                    <th>Grand Total (₹)</th>
                    <th>Picked Up Time</th>
                    <th>Items</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{selectedReport.customerName || 'N/A'}</td>
                    <td>{selectedReport.phoneNumber || 'N/A'}</td>
                    <td>{formatDeliveryAddress(selectedReport.deliveryAddress)}</td>
                    <td>{formatTimestamp(selectedReport.timestamp)}</td>
                    <td>{calculateOrderTotal(selectedReport.cartItems)}</td>
                    <td>{calculateGrandTotal(selectedReport.cartItems)}</td>
                    <td>{formatTimestamp(selectedReport.pickedUpTime)}</td>
                    <td>{selectedReport.cartItems[0]?.name || selectedReport.cartItems[0]?.item_name || 'No items'}</td>
                    <td>
                      <button className="close-popup" onClick={handleClosePopup}>
                        Close
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TripReport;                            