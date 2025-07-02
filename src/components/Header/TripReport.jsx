import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { FaArrowLeft } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';
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
        email: report.email || 'N/A',
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

  // Filter reports by date, bill number, and customer name
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
    // Validate payment methods
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
    // Validate selectedEmployee and email
    if (!selectedEmployee || !selectedEmployee.email) {
      const errorMsg = 'Selected employee or employee email is missing.';
      setWarningMessage(errorMsg);
      setWarningType('warning');
      return { success: false, invoice_no: null, error: errorMsg };
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
        userId: selectedEmployee.email,
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
          className={`trip-main-alert alert-${warningType === 'success' ? 'success' : 'warning'} position-fixed top-50 start-50 translate-middle shadow z-3 p-4 rounded-3 text-center`}
          style={{ minWidth: '400px', maxWidth: '600px' }}
        >
          {warningMessage}
          <div className="d-flex justify-content-center gap-2 mt-3">
            <button
              className="btn btn-success"
              onClick={handleWarningOk}
            >
              OK
            </button>
            <button
              className="btn btn-danger"
              onClick={handleWarningCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {loading && (
        <div className="trip-main-loading text-center text-muted fs-5 my-3">
          Loading...
        </div>
      )}
      {error && (
        <div className="trip-main-error alert alert-danger my-3 text-center">
          {error}
        </div>
      )}
      <div className="trip-main-header d-flex align-items-center mb-4">
        <FaArrowLeft
          className="trip-main-back-button fs-3 me-3"
          onClick={handleBack}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === 'Enter' && handleBack()}
        />
        <h1 className="trip-main-title h3 mb-0">Delivery Person Trip Report</h1>
      </div>
      <div className="trip-main-content-wrapper">
        <div className="trip-main-card p-4 mb-4 shadow-sm">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label htmlFor="deliveryPerson" className="trip-main-form-label fw-bold">
                  Delivery Person
                </label>
                <div className="position-relative" ref={dropdownRef}>
                  <input
                    type="text"
                    className="trip-main-form-control"
                    id="deliveryPerson"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Type to search delivery person"
                    required
                  />
                  {showDropdown && filteredEmployees.length > 0 && (
                    <ul className="trip-main-dropdown-menu show w-100 mt-1">
                      {filteredEmployees.map((employee) => (
                        <li
                          key={employee.employeeId}
                          className="trip-main-dropdown-item"
                          onClick={() => handleSelectEmployee(employee)}
                        >
                          {employee.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="col-md-6">
                <label htmlFor="dateFilter" className="trip-main-form-label fw-bold">
                  Filter by Date
                </label>
                <input
                  type="date"
                  className="trip-main-form-control"
                  id="dateFilter"
                  value={selectedDate}
                  onChange={handleDateChange}
                  required
                />
              </div>
            </div>
            <div className="row g-3 mt-2">
              <div className="col-md-6">
                <label htmlFor="billNumber" className="trip-main-form-label fw-bold">
                  Bill Number
                </label>
                <input
                  type="text"
                  className="trip-main-form-control"
                  id="billNumber"
                  value={billNumber}
                  onChange={handleBillNumberChange}
                  placeholder="Enter bill number"
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="customerName" className="trip-main-form-label fw-bold">
                  Customer Name
                </label>
                <input
                  type="text"
                  className="trip-main-form-control"
                  id="customerName"
                  value={customerName}
                  onChange={handleCustomerNameChange}
                  placeholder="Enter customer name"
                />
              </div>
            </div>
            <button type="submit" className="trip-main-btn-primary w-100 mt-4">
              Submit
            </button>
          </form>
        </div>

        {selectedEmployee && (
          <div className="trip-main-card p-4 mb-4 shadow-sm">
            <h3 className="h5">Selected Delivery Person</h3>
            <p><strong>Name:</strong> {selectedEmployee.name}</p>
            {filteredReports.length > 0 && (
              <button
                className="trip-main-btn-success"
                onClick={createAllSalesInvoices}
              >
                Submit All
              </button>
            )}
          </div>
        )}

        {selectedEmployee && filteredReports.length > 0 && (
          <div className="trip-main-card p-4 shadow-sm">
            <h2 className="h4 mb-3">Assigned Delivery Orders</h2>
            <div className="table-responsive">
              <table className="trip-main-table table table-striped table-bordered">
                <thead className="trip-main-table-primary">
                  <tr>
                    <th>Order No</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Email</th>
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
                      <td>{report.email || 'N/A'}</td>
                      <td>{selectedEmployee.name}</td>
                      <td>{calculateGrandTotal(report.cartItems)}</td>
                      <td>
                        <div className="d-flex flex-column gap-2">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={report.paymentMethods.includes('Cash')}
                              onChange={() => handlePaymentMethodSelect('Cash', report.tripId)}
                              id={`cash-${report.tripId}`}
                            />
                            <label className="form-check-label" htmlFor={`cash-${report.tripId}`}>
                              Cash
                            </label>
                          </div>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={report.paymentMethods.includes('Card')}
                              onChange={() => handlePaymentMethodSelect('Card', report.tripId)}
                              id={`card-${report.tripId}`}
                            />
                            <label className="form-check-label" htmlFor={`card-${report.tripId}`}>
                              Card
                            </label>
                          </div>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={report.paymentMethods.includes('UPI')}
                              onChange={() => handlePaymentMethodSelect('UPI', report.tripId)}
                              id={`upi-${report.tripId}`}
                            />
                            <label className="form-check-label" htmlFor={`upi-${report.tripId}`}>
                              UPI
                            </label>
                          </div>
                        </div>
                        {paymentDetails[report.tripId]?.showDetailsInput === 'Card' && (
                          <div className="mt-2">
                            <input
                              type="text"
                              className="trip-main-form-control"
                              placeholder="Enter Card Number"
                              value={report.cardDetails || ''}
                              onChange={(e) =>
                                handlePaymentDetailsInput(report.tripId, 'cardDetails', e.target.value)
                              }
                            />
                          </div>
                        )}
                        {paymentDetails[report.tripId]?.showDetailsInput === 'UPI' && (
                          <div className="mt-2">
                            <input
                              type="text"
                              className="trip-main-form-control"
                              placeholder="Enter UPI ID"
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
                          className="trip-main-btn-action-details btn-sm me-2"
                          onClick={() => handleShowDetails(report)}
                        >
                          Details
                        </button>
                        <button
                          className="trip-main-btn-action-invoice btn-sm"
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
          </div>
        )}
        {selectedEmployee && filteredReports.length === 0 && !loading && (
          <div className="trip-main-no-orders text-center my-4 text-muted">
            <p>
              No delivery orders assigned to {selectedEmployee.name} for the selected date
              {billNumber ? ` and bill number ${billNumber}` : ''}
              {customerName ? ` and customer ${customerName}` : ''}.
            </p>
          </div>
        )}

        {showPopup && selectedReport && (
          <div className="trip-main-modal modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="trip-main-modal-content modal-content">
                <div className="trip-main-modal-header modal-header">
                  <h5 className="modal-title">Order Details</h5>
                </div>
                <div className="trip-main-modal-body modal-body">
                  <div className="table-responsive">
                    <table className="trip-main-table table table-striped table-bordered">
                      <thead className="trip-main-table-primary">
                        <tr>
                          <th>Order No</th>
                          <th>Date</th>
                          <th>Customer</th>
                          <th>Email</th>
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
                          <td>{selectedReport.email || 'N/A'}</td>
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
                              className="trip-main-btn-danger"
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TripReport;