import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
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
  const [billNumber, setBillNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningType, setWarningType] = useState('warning');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({});
  const dropdownRef = useRef(null);
  const vatRate = 0.10;

  // Generate short UUID suffix for invoice number
  const generateShortUUID = () => {
    return uuidv4().slice(0, 8);
  };

  // Fetch employees on component mount
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('http://localhost:5000/api/employees');
      const data = Array.isArray(response.data) ? response.data : [];
      setEmployees(data);
      setFilteredEmployees(data.filter((emp) => emp.role.toLowerCase() === 'delivery boy'));
    } catch (err) {
      setError(`Failed to fetch employees: ${err.message}`);
      setEmployees([]);
      setFilteredEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch trip reports for the selected employee
  const fetchTripReports = async (employeeId, date, billNo, custName) => {
    if (!employeeId || !date) return;
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`http://localhost:5000/api/tripreports/${employeeId}`);
      const data = Array.isArray(response.data) ? response.data : [];
      const sanitizedReports = data.map((report) => ({
        ...report,
        orderNo: report.orderNo || 'N/A',
        chairsBooked: Array.isArray(report.chairsBooked) ? report.chairsBooked : [],
        cartItems: Array.isArray(report.cartItems) ? report.cartItems.map((item) => ({
          ...item,
          id: item.id || uuidv4(),
          item_name: item.item_name || item.name || 'Unknown',
          name: item.name || item.item_name || 'Unknown',
          quantity: Number(item.quantity) || 1,
          basePrice: Number(item.basePrice) || (Number(item.totalPrice) / (Number(item.quantity) || 1)) || 0,
          totalPrice: Number(item.totalPrice) || (Number(item.basePrice) * (Number(item.quantity) || 1)) || 0,
          selectedSize: item.selectedSize || 'M',
          icePreference: item.icePreference || 'without_ice',
          icePrice: Number(item.icePrice) || 0,
          isSpicy: item.isSpicy || false,
          spicyPrice: Number(item.spicyPrice) || 0,
          kitchen: item.kitchen || 'Main Kitchen',
          addonQuantities: item.addonQuantities || {},
          addonVariants: item.addonVariants || {},
          addonPrices: item.addonPrices || {},
          comboQuantities: item.comboQuantities || {},
          comboVariants: item.comboVariants || {},
          comboPrices: item.comboPrices || {},
          selectedCombos: Array.isArray(item.selectedCombos) ? item.selectedCombos : [],
          ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
          requiredKitchens: Array.isArray(item.requiredKitchens) ? item.requiredKitchens : [],
          kitchenStatuses: item.kitchenStatuses || {},
        })) : [],
        pickedUpTime: report.pickedUpTime || null,
        paymentMethods: Array.isArray(report.paymentMethods) ? report.paymentMethods : [],
        cardDetails: report.cardDetails || '',
        upiDetails: report.upiDetails || '',
      }));
      setTripReports(sanitizedReports);
      filterReportsByDate(sanitizedReports, date, billNo, custName);
    } catch (err) {
      setError(`Failed to fetch trip reports: ${err.message}`);
      setTripReports([]);
      setFilteredReports([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter reports by date, bill number (orderNo), and customer name
  const filterReportsByDate = (reports, date, billNo, custName) => {
    if (!date) {
      setFilteredReports([]);
      return;
    }
    const selectedDateObj = new Date(date);
    let filtered = reports.filter((report) => {
      if (!report.timestamp) return false;
      const reportDate = new Date(report.timestamp);
      return (
        reportDate.getFullYear() === selectedDateObj.getFullYear() &&
        reportDate.getMonth() === selectedDateObj.getMonth() &&
        reportDate.getDate() === selectedDateObj.getDate()
      );
    });
    if (billNo) {
      filtered = filtered.filter((report) => report.orderNo.toLowerCase().includes(billNo.toLowerCase()));
    }
    if (custName) {
      filtered = filtered.filter((report) =>
        report.customerName && report.customerName.toLowerCase().includes(custName.toLowerCase())
      );
    }
    setFilteredReports(filtered);
  };

  // Create sales invoice for a single report
  const createSalesInvoice = async (report) => {
    if (!report.paymentMethods.length || !['Cash', 'Card', 'UPI'].some(method => report.paymentMethods.includes(method))) {
      setWarningMessage('Please select at least one payment method (Cash, Card, or UPI) to create a sales invoice.');
      setWarningType('warning');
      return { success: false, invoice_no: null, error: 'Invalid payment method' };
    }
    if (report.paymentMethods.includes('Card') && !report.cardDetails) {
      setWarningMessage('Please enter a card reference number for Card payment.');
      setWarningType('warning');
      return { success: false, invoice_no: null, error: 'Missing card details' };
    }
    if (report.paymentMethods.includes('UPI') && !report.upiDetails) {
      setWarningMessage('Please enter a UPI reference number for UPI payment.');
      setWarningType('warning');
      return { success: false, invoice_no: null, error: 'Missing UPI details' };
    }
    try {
      setLoading(true);
      setError(null);
      const subtotal = calculateOrderTotal(report.cartItems);
      const vatAmount = Number(subtotal) * vatRate;
      const grandTotal = (Number(subtotal) + vatAmount).toFixed(2);

      const payments = report.paymentMethods.map(method => ({
        mode_of_payment: method.toUpperCase(),
        amount: Number(grandTotal),
        reference: method === 'Card' ? report.cardDetails : method === 'UPI' ? report.upiDetails : null,
      }));

      const salesData = {
        customer: report.customerName || 'N/A',
        items: report.cartItems.map((item) => ({
          item_name: item.name || item.item_name || 'Unknown',
          basePrice: Number(item.basePrice) || (Number(item.totalPrice) / (item.quantity || 1)) || 0,
          quantity: item.quantity || 1,
          amount: Number(item.totalPrice) || 0,
          addons: Object.entries(item.addonQuantities || {})
            .filter(([_, qty]) => qty > 0)
            .map(([addonName, qty]) => ({
              name1: addonName,
              addon_price: item.addonPrices?.[addonName] || 0,
              addon_quantity: qty,
              kitchen: item.addonVariants?.[addonName]?.kitchen || 'Unknown',
              addon_image: '',
              size: item.addonVariants?.[addonName]?.size || 'S',
            })),
          selectedCombos: Object.entries(item.comboQuantities || {})
            .filter(([_, qty]) => qty > 0)
            .map(([comboName, qty]) => ({
              name1: comboName,
              combo_price: item.comboPrices?.[comboName] || 0,
              combo_quantity: qty,
              combo_image: '',
              size: item.comboVariants?.[comboName]?.size || 'M',
              spicy: item.comboVariants?.[comboName]?.spicy || false,
              kitchen: item.comboVariants?.[comboName]?.kitchen || 'Unknown',
              selectedVariant: null,
            })),
          ingredients: item.ingredients || [],
          kitchen: item.kitchen || 'Main Kitchen',
          selectedSize: item.selectedSize || 'M',
          icePreference: item.icePreference || 'without_ice',
          isSpicy: item.isSpicy || false,
        })),
        total: Number(subtotal),
        vat_amount: Number(vatAmount.toFixed(2)),
        grand_total: Number(grandTotal),
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0],
        invoice_no: `INV-${report.orderNo}-${generateShortUUID()}`,
        payments: payments,
        deliveryAddress: report.deliveryAddress || null,
        phoneNumber: report.phoneNumber || 'N/A',
        email: report.email || 'N/A',
        whatsappNumber: report.whatsappNumber || 'N/A',
        status: 'Draft',
        orderType: 'Online Delivery',
      };

      const response = await axios.post('http://localhost:5000/api/sales', salesData, {
        headers: { 'Content-Type': 'application/json' },
      });

      setWarningMessage(`Sales invoice created successfully: ${response.data.invoice_no}`);
      setWarningType('success');
      return { success: true, invoice_no: response.data.invoice_no, error: null };
    } catch (err) {
      const errorMsg = `Failed to create sales invoice for order ${report.orderNo}: ${err.response?.data?.error || err.message}`;
      setError(errorMsg);
      setWarningType('warning');
      return { success: false, invoice_no: null, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Create sales invoices for all filtered reports
  const createAllSalesInvoices = async () => {
    setLoading(true);
    setError(null);
    let successCount = 0;
    let errorCount = 0;
    const errorMessages = [];

    for (const report of filteredReports) {
      const result = await createSalesInvoice(report);
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        errorMessages.push(result.error);
      }
    }

    setLoading(false);
    if (successCount > 0 && errorCount === 0) {
      setWarningMessage(`Successfully created ${successCount} sales invoices.`);
      setWarningType('success');
    } else if (successCount > 0) {
      setWarningMessage(
        `Created ${successCount} sales invoices successfully, but ${errorCount} failed: ${errorMessages.join('; ')}`
      );
      setWarningType('warning');
    } else {
      setWarningMessage(`Failed to create any sales invoices: ${errorMessages.join('; ')}`);
      setWarningType('warning');
    }
  };

  // Load employees on component mount
  useEffect(() => {
    fetchEmployees();
  }, []);

  // Handle search input change for delivery person
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setDeliveryPerson(value);
    setShowDropdown(true);

    const filtered = employees
      .filter((emp) => emp.role.toLowerCase() === 'delivery boy')
      .filter((emp) => emp.name.toLowerCase().includes(value.toLowerCase()));
    setFilteredEmployees(filtered);

    if (!value) {
      setSelectedEmployee(null);
      setTripReports([]);
      setFilteredReports([]);
    }
  };

  // Handle employee selection from dropdown
  const handleSelectEmployee = (employee) => {
    setSearchTerm(employee.name);
    setDeliveryPerson(employee.name);
    setSelectedEmployee(employee);
    setShowDropdown(false);
    setWarningMessage('');
    if (selectedDate) {
      fetchTripReports(employee.employeeId, selectedDate, billNumber, customerName);
    }
  };

  // Handle date change
  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    setWarningMessage('');
    if (selectedEmployee && date) {
      fetchTripReports(selectedEmployee.employeeId, date, billNumber, customerName);
    }
  };

  // Handle bill number change
  const handleBillNumberChange = (e) => {
    const billNo = e.target.value;
    setBillNumber(billNo);
    setWarningMessage('');
    if (selectedEmployee && selectedDate) {
      fetchTripReports(selectedEmployee.employeeId, selectedDate, billNo, customerName);
    }
  };

  // Handle customer name change
  const handleCustomerNameChange = (e) => {
    const custName = e.target.value;
    setCustomerName(custName);
    setWarningMessage('');
    if (selectedEmployee && selectedDate) {
      fetchTripReports(selectedEmployee.employeeId, selectedDate, billNumber, custName);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setWarningMessage('');
    if (!selectedEmployee) {
      setWarningMessage('Please select delivery person');
      setWarningType('warning');
      return;
    }
    if (!selectedDate) {
      setWarningMessage('Please select a date');
      setWarningType('warning');
      return;
    }
    fetchTripReports(selectedEmployee.employeeId, selectedDate, billNumber, customerName);
    setWarningMessage(
      `Delivery Person Selected: ${selectedEmployee.name} for date ${selectedDate}${
        billNumber ? `, Bill No: ${billNumber}` : ''
      }${customerName ? `, Customer: ${customerName}` : ''}`
    );
    setWarningType('success');
  };

  // Handle action submission for creating sales invoice
  const handleActionSubmit = (report) => {
    createSalesInvoice(report);
  };

  // Navigate back to home
  const handleBack = () => {
    navigate('/home');
  };

  // Show order details popup
  const handleShowDetails = (report) => {
    setSelectedReport(report);
    setShowPopup(true);
  };

  // Close popup
  const handleClosePopup = () => {
    setShowPopup(false);
    setSelectedReport(null);
  };

  // Handle payment method selection (mutually exclusive)
  const handlePaymentMethodSelect = (method, reportId) => {
    setFilteredReports((prevReports) =>
      prevReports.map((report) => {
        if (report.tripId === reportId) {
          const paymentMethods = report.paymentMethods.includes(method)
            ? []
            : [method];
          return {
            ...report,
            paymentMethods,
            cardDetails: method === 'Card' ? report.cardDetails : '',
            upiDetails: method === 'UPI' ? report.upiDetails : '',
          };
        }
        return report;
      })
    );
    setPaymentDetails((prev) => ({
      ...prev,
      [reportId]: {
        ...prev[reportId],
        showDetailsInput: method === 'Cash' ? null : method,
      },
    }));
    setWarningMessage(`Selected payment method: ${method}`);
    setWarningType('success');
  };

  // Handle payment details input
  const handlePaymentDetailsInput = (reportId, field, value) => {
    setFilteredReports((prevReports) =>
      prevReports.map((report) => {
        if (report.tripId === reportId) {
          return {
            ...report,
            [field]: value,
          };
        }
        return report;
      })
    );
  };

  // Handle warning message OK button
  const handleWarningOk = () => {
    setWarningMessage('');
    setWarningType('warning');
  };

  // Handle warning message Cancel button
  const handleWarningCancel = () => {
    setWarningMessage('');
    setWarningType('warning');
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  // Calculate order total
  const calculateOrderTotal = (cartItems) => {
    if (!Array.isArray(cartItems)) return '0.00';
    return cartItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0).toFixed(2);
  };

  // Calculate grand total with VAT
  const calculateGrandTotal = (cartItems) => {
    if (!Array.isArray(cartItems)) return '0.00';
    const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
    const vat = subtotal * vatRate;
    return (subtotal + vat).toFixed(2);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="trip-main">
      {warningMessage && (
        <div
          className={`active-orders-alert active-orders-alert-${
            warningType === 'success' ? 'success' : 'warning'
          }`}
        >
          {warningMessage}
          <div className="active-orders-alert-buttons">
            <button
              className="active-orders-btn active-orders-btn-primary"
              onClick={handleWarningOk}
            >
              OK
            </button>
            <button
              className="active-orders-btn-cancel"
              onClick={handleWarningCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {loading && (
        <div className="loading-message">
          Loading...
        </div>
      )}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
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
        <div className="form-container">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group-left">
                <label htmlFor="deliveryPerson" className="form-label">
                  Delivery Person
                </label>
                <div className="dropdown-container" ref={dropdownRef}>
                  <input
                    type="text"
                    className="form-control"
                    id="deliveryPerson"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Type to search delivery person"
                    required
                  />
                  {showDropdown && filteredEmployees.length > 0 && (
                    <ul className="dropdown-list">
                      {filteredEmployees.map((employee) => (
                        <li
                          key={employee.employeeId}
                          className="dropdown-item"
                          onClick={() => handleSelectEmployee(employee)}
                        >
                          {employee.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="form-group-right">
                <label htmlFor="dateFilter" className="form-label">
                  Filter by Date
                </label>
                <input
                  type="date"
                  className="form-control"
                  id="dateFilter"
                  value={selectedDate}
                  onChange={handleDateChange}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group-left">
                <label htmlFor="billNumber" className="form-label">
                  Bill Number
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="billNumber"
                  value={billNumber}
                  onChange={handleBillNumberChange}
                  placeholder="Enter bill number"
                />
              </div>
              <div className="form-group-right">
                <label htmlFor="customerName" className="form-label">
                  Customer Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="customerName"
                  value={customerName}
                  onChange={handleCustomerNameChange}
                  placeholder="Enter customer name"
                />
              </div>
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
            {filteredReports.length > 0 && (
              <button
                className="submit-all-button active-orders-btn active-orders-btn-success"
                onClick={createAllSalesInvoices}
              >
                Submit All
              </button>
            )}
          </div>
        )}

        {selectedEmployee && filteredReports.length > 0 && (
          <div className="active-orders-table-wrapper">
            <h2>Assigned Delivery Orders</h2>
            <table className="orders-table active-orders-table active-orders-table-striped active-orders-table-bordered">
              <thead>
                <tr>
                  <th>Order No</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Delivery Person</th>
                  <th>Grand Total (₹)</th>
                  <th>Payment Method</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.tripId}>
                    <td>{report.orderNo}</td>
                    <td>{formatTimestamp(report.timestamp)}</td>
                    <td>{report.customerName || 'N/A'}</td>
                    <td>{selectedEmployee.name}</td>
                    <td>{calculateGrandTotal(report.cartItems)}</td>
                    <td>
                      <div className="payment-options">
                        <label className="payment-checkbox">
                          <input
                            type="checkbox"
                            checked={report.paymentMethods.includes('Cash')}
                            onChange={() => handlePaymentMethodSelect('Cash', report.tripId)}
                          />
                          Cash
                        </label>
                        <label className="payment-checkbox">
                          <input
                            type="checkbox"
                            checked={report.paymentMethods.includes('Card')}
                            onChange={() => handlePaymentMethodSelect('Card', report.tripId)}
                          />
                          Card
                        </label>
                        <label className="payment-checkbox">
                          <input
                            type="checkbox"
                            checked={report.paymentMethods.includes('UPI')}
                            onChange={() => handlePaymentMethodSelect('UPI', report.tripId)}
                          />
                          UPI
                        </label>
                      </div>
                      {paymentDetails[report.tripId]?.showDetailsInput === 'Card' && (
                        <div className="payment-details-input">
                          <input
                            type="text"
                            placeholder="Enter Card Number"
                            className="form-control"
                            value={report.cardDetails || ''}
                            onChange={(e) =>
                              handlePaymentDetailsInput(report.tripId, 'cardDetails', e.target.value)
                            }
                          />
                        </div>
                      )}
                      {paymentDetails[report.tripId]?.showDetailsInput === 'UPI' && (
                        <div className="payment-details-input">
                          <input
                            type="text"
                            placeholder="Enter UPI ID"
                            className="form-control"
                            value={report.upiDetails || ''}
                            onChange={(e) =>
                              handlePaymentDetailsInput(report.tripId, 'upiDetails', e.target.value)
                            }
                          />
                        </div>
                      )}
                    </td>
                    <td>
                      <button
                        className="details-button active-orders-btn active-orders-btn-primary"
                        onClick={() => handleShowDetails(report)}
                      >
                        Details
                      </button>
                      <button
                        className="submit-action-button active-orders-btn active-orders-btn-success"
                        onClick={() => handleActionSubmit(report)}
                      >
                        Create Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {selectedEmployee && filteredReports.length === 0 && !loading && (
          <div className="no-orders">
            <p>
              No delivery orders assigned to {selectedEmployee.name} for the selected date
              {billNumber ? ` and bill number ${billNumber}` : ''}
              {customerName ? ` and customer ${customerName}` : ''}.
            </p>
          </div>
        )}

        {showPopup && selectedReport && (
          <div className="active-orders-modal-overlay">
            <div className="active-orders-modal-content">
              <h3>Order Details</h3>
              <table className="popup-table active-orders-table active-orders-table-striped active-orders-table-bordered">
                <thead>
                  <tr>
                    <th>Order No</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Delivery Person</th>
                    <th>Grand Total (₹)</th>
                    <th>Payment Method</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{selectedReport.orderNo}</td>
                    <td>{formatTimestamp(selectedReport.timestamp)}</td>
                    <td>{selectedReport.customerName || 'N/A'}</td>
                    <td>{selectedEmployee.name}</td>
                    <td>{calculateGrandTotal(selectedReport.cartItems)}</td>
                    <td>
                      {selectedReport.paymentMethods.length > 0
                        ? selectedReport.paymentMethods.join(', ')
                        : 'None'}
                      {selectedReport.cardDetails && (
                        <div>Card: {selectedReport.cardDetails}</div>
                      )}
                      {selectedReport.upiDetails && (
                        <div>UPI: {selectedReport.upiDetails}</div>
                      )}
                    </td>
                    <td>
                      <button
                        className="close-popup active-orders-btn active-orders-btn-danger"
                        onClick={handleClosePopup}
                      >
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