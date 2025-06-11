import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { UserContext } from '../../Context/UserContext'; // Adjust path as per your project structure

// Import SVG icons (adjust paths as needed for your project)
import ClosingEntryIcon from '/menuIcons/closingentry.svg';
import HomeIcon from '/menuIcons/home.svg';
import KitchenIcon from '/menuIcons/kitchen.svg';
import PowerOffIcon from '/menuIcons/poweroff.svg';
import TableIcon from '/menuIcons/table1.svg';
import SaveIcon from '/menuIcons/save.svg';

// Import Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';

function ClosingEntryWithNavbar() {
  const { setCartItems } = useContext(UserContext);
  const navigate = useNavigate();
  const { state } = useLocation();
  const userData = useSelector((state) => state.user);

  const storedUser = JSON.parse(localStorage.getItem('user')) || { email: "Guest" };
  const currentUser = userData?.user || storedUser;

  const [currentTime, setCurrentTime] = useState(new Date());
  const [warningMessage, setWarningMessage] = useState(""); // For warning and success messages
  const [warningType, setWarningType] = useState("warning"); // "warning" or "success"
  const [pendingAction, setPendingAction] = useState(null); // Store the action to perform after OK

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Dynamic date and time formatting
  const formattedDate = currentTime.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }); // e.g., "April 7, 2025"
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }); // e.g., "09:14:18 AM"

  // Handle OK button click for warning messages
  const handleWarningOk = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setWarningMessage("");
    setWarningType("warning");
  };

  const handleLogout = () => {
    setWarningMessage("Logout Successful!");
    setWarningType("success");
    setPendingAction(() => () => {
      localStorage.removeItem('user');
      navigate('/', { replace: true });
    });
  };

  const handleOpeningEntryNavigation = () => {
    navigate('/opening-entry');
  };

  const handleClosingEntryNavigation = () => {
    const posOpeningEntry = localStorage.getItem('posOpeningEntry') || '';
    navigate('/closing-entry', { state: { posOpeningEntry } });
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Closing Entry-specific state
  const [posOpeningEntry, setPosOpeningEntry] = useState(state?.posOpeningEntry || localStorage.getItem('posOpeningEntry') || '');
  const [periodStartDate, setPeriodStartDate] = useState('');
  const [postingDate, setPostingDate] = useState(new Date().toISOString().split('T')[0]);
  const [periodEndDate, setPeriodEndDate] = useState(new Date().toISOString().slice(0, 16));
  const [company, setCompany] = useState('');
  const [user, setUser] = useState('');
  const [posProfile, setPosProfile] = useState('');
  const [posTransactions, setPosTransactions] = useState([{ pos_invoice: '', grand_total: '', posting_date: '', customer: '' }]);
  const [paymentReconciliation, setPaymentReconciliation] = useState([]);
  const [taxes, setTaxes] = useState([{ account_head: '', rate: '', amount: '' }]);
  const [grandTotal, setGrandTotal] = useState('');
  const [netTotal, setNetTotal] = useState('');
  const [totalQuantity, setTotalQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [openingEntries, setOpeningEntries] = useState([]);

  // Set initial user data
  useEffect(() => {
    const reduxPosProfile = userData?.pos_profile || localStorage.getItem('pos_profile') || 'POS-001';
    const reduxUserEmail = currentUser.email || 'bearer@gmail.com';
    const reduxCompany = userData?.company || localStorage.getItem('company') || 'MyCompany';
    setPosProfile(reduxPosProfile);
    setUser(reduxUserEmail);
    setCompany(reduxCompany);
  }, [userData, currentUser]);

  // Fetch POS Opening Entries
  useEffect(() => {
    const fetchOpeningEntries = async () => {
      if (!posProfile) return;
      try {
        const response = await fetch('http://localhost:5000/api/get_pos_opening_entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pos_profile: posProfile }),
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const result = await response.json();
        if (result.status === 'success' && Array.isArray(result.message)) {
          setOpeningEntries(result.message);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Error fetching POS Opening Entries:', error);
        setOpeningEntries([]);
      }
    };
    if (posProfile) fetchOpeningEntries();
  }, [posProfile]);

  // Fetch POS Details when posOpeningEntry changes
  useEffect(() => {
    const fetchPosDetails = async () => {
      if (!posOpeningEntry || !openingEntries.length) return;

      const selectedEntry = openingEntries.find(entry => entry.name === posOpeningEntry);
      if (!selectedEntry) return;

      setPeriodStartDate(selectedEntry.period_start_date.split(' ')[0] || '');
      setPostingDate(selectedEntry.posting_date || new Date().toISOString().split('T')[0]);
      setCompany(selectedEntry.company || '');
      setUser(selectedEntry.user || currentUser.email || 'bearer@gmail.com');
      setPosProfile(selectedEntry.pos_profile || '');

      const balanceDetails = selectedEntry.balance_details || [];
      if (balanceDetails.length > 0) {
        setPaymentReconciliation(balanceDetails.map(detail => ({
          mode_of_payment: detail.mode_of_payment || '',
          opening_amount: detail.opening_amount ? detail.opening_amount.toString() : '0',
          expected_amount: detail.opening_amount ? detail.opening_amount.toString() : '0',
          closing_amount: ''
        })));
      } else {
        setPaymentReconciliation([{ mode_of_payment: '', opening_amount: '0', expected_amount: '0', closing_amount: '' }]);
      }

      try {
        const response = await fetch('http://localhost:5000/api/get_pos_invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pos_opening_entry: posOpeningEntry }),
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const result = await response.json();

        if (result.message && result.message.status === 'success') {
          const invoices = result.message.invoices || [];
          setPosTransactions(invoices.length > 0 ? invoices.map(inv => ({
            pos_invoice: inv.pos_invoice || '',
            grand_total: inv.grand_total || '',
            posting_date: inv.posting_date || '',
            customer: inv.customer || ''
          })) : [{ pos_invoice: '', grand_total: '', posting_date: '', customer: '' }]);

          setTaxes(result.message.taxes?.length ? result.message.taxes.map(tax => ({
            account_head: tax.account_head || '',
            rate: tax.rate || '',
            amount: tax.amount || ''
          })) : [{ account_head: '', rate: '', amount: '' }]);

          setGrandTotal(result.message.grand_total || '');
          setNetTotal(result.message.net_total || '');
          setTotalQuantity(result.message.total_quantity || '');

          const cashTransactions = invoices.filter(inv => true); // Add cash filter logic if available
          const cashTotal = cashTransactions.reduce((sum, inv) => sum + parseFloat(inv.grand_total || 0), 0);
          setPaymentReconciliation(prev => prev.map(pr => ({
            ...pr,
            expected_amount: pr.mode_of_payment.toLowerCase().includes('cash')
              ? (parseFloat(pr.opening_amount || 0) + cashTotal).toFixed(2)
              : pr.expected_amount
          })));
        }
      } catch (error) {
        console.error('Error fetching POS Invoices:', error);
      }
    };
    fetchPosDetails();
  }, [posOpeningEntry, openingEntries, currentUser.email]);

  // Handlers for POS Transactions
  const handleAddPosTransaction = () => {
    setPosTransactions(prev => [...prev, { pos_invoice: '', grand_total: '', posting_date: '', customer: '' }]);
  };

  const handlePosTransactionChange = (index, field, value) => {
    setPosTransactions(prev => prev.map((tx, i) => (i === index ? { ...tx, [field]: value } : tx)));
  };

  const handleRemovePosTransaction = (index) => {
    setPosTransactions(prev => prev.filter((_, i) => i !== index));
  };

  // Handlers for Payment Reconciliation
  const handleAddPaymentReconciliation = () => {
    setPaymentReconciliation(prev => [...prev, { mode_of_payment: '', opening_amount: '0', expected_amount: '0', closing_amount: '' }]);
  };

  const handlePaymentReconciliationChange = (index, field, value) => {
    setPaymentReconciliation(prev => {
      const updated = prev.map((pr, i) => (i === index ? { ...pr, [field]: value } : pr));
      if (field === 'opening_amount' || field === 'mode_of_payment') {
        const cashTotal = posTransactions.reduce((sum, tx) => sum + parseFloat(tx.grand_total || 0), 0);
        return updated.map((pr, i) => ({
          ...pr,
          expected_amount: i === index && pr.mode_of_payment.toLowerCase().includes('cash')
            ? (parseFloat(pr.opening_amount || 0) + cashTotal).toFixed(2)
            : pr.expected_amount
        }));
      }
      return updated;
    });
  };

  const handleRemovePaymentReconciliation = (index) => {
    setPaymentReconciliation(prev => prev.filter((_, i) => i !== index));
  };

  // Handlers for Taxes
  const handleAddTax = () => {
    setTaxes(prev => [...prev, { account_head: '', rate: '', amount: '' }]);
  };

  const handleTaxChange = (index, field, value) => {
    setTaxes(prev => prev.map((tax, i) => (i === index ? { ...tax, [field]: value } : tax)));
  };

  const handleRemoveTax = (index) => {
    setTaxes(prev => prev.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = async () => {
    const missingFields = [];
    if (!posOpeningEntry) missingFields.push('POS Opening Entry');
    if (!postingDate) missingFields.push('Posting Date');
    if (!periodEndDate) missingFields.push('Period End Date');
    if (!grandTotal) missingFields.push('Grand Total');
    if (!netTotal) missingFields.push('Net Total');
    if (!totalQuantity) missingFields.push('Total Quantity');
    if (posTransactions.some(tx => !tx.pos_invoice || !tx.grand_total || !tx.posting_date || !tx.customer)) {
      missingFields.push('POS Transactions (complete all rows)');
    }
    if (paymentReconciliation.some(pr => !pr.mode_of_payment || !pr.opening_amount || !pr.expected_amount || !pr.closing_amount)) {
      missingFields.push('Payment Reconciliation (complete all rows)');
    }
    if (taxes.some(tax => !tax.account_head || !tax.rate || !tax.amount)) {
      missingFields.push('Taxes (complete all rows)');
    }

    if (missingFields.length > 0) {
      setWarningMessage(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      setWarningType("warning");
      return;
    }

    setLoading(true);
    const payload = {
      pos_opening_entry: posOpeningEntry,
      posting_date: postingDate,
      period_end_date: periodEndDate,
      pos_transactions: posTransactions,
      payment_reconciliation: paymentReconciliation,
      taxes: taxes,
      grand_total: grandTotal,
      net_total: netTotal,
      total_quantity: totalQuantity,
    };

    try {
      const response = await fetch('http://localhost:5000/api/create_closing_entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (response.ok && result.message.status === 'success') {
        setWarningMessage(result.message.message || 'POS Closing Entry created successfully!');
        setWarningType("success");
        setPendingAction(() => () => navigate('/home')); // Navigate to home after success
      } else {
        setWarningMessage(`Failed: ${result.message || 'Unknown error occurred'}`);
        setWarningType("warning");
      }
    } catch (error) {
      console.error('ClosingEntry Network Error:', error);
      setWarningMessage('Network error occurred.');
      setWarningType("warning");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Warning Alert for Messages */}
      {warningMessage && (
        <div className={`alert alert-${warningType} text-center alert-dismissible fade show`} role="alert">
          {warningMessage}
          <button
            type="button"
            className="btn btn-primary ms-3"
            onClick={handleWarningOk}
          >
            OK
          </button>
        </div>
      )}
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
        <div className="container-fluid">
          {/* Back Arrow on the Left */}
          <div className="navbar-brand">
            <a
              className="nav-link text-primary cursor-pointer"
              onClick={handleBack}
              title="Back"
              style={{ marginLeft: '10px' }}
            >
              <i className="bi bi-arrow-left fs-2"></i>
            </a>
          </div>

          <button
            className="navbar-toggler bg-light"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarSupportedContent"
            aria-controls="navbarSupportedContent"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarSupportedContent">
            {/* Centered Navigation Items */}
            <ul className="navbar-nav mx-auto mb-2 mb-lg-0 d-flex justify-content-center">
              <li className="nav-item">
                <a
                  className={`nav-link ${location.pathname === '/frontpage' ? 'active text-primary' : 'text-black'} cursor-pointer`}
                  onClick={() => navigate('/frontpage')}
                  title="Home"
                >
                  <img src={HomeIcon} alt="Home" className="icon-size" />
                </a>
              </li>
              <li className="nav-item">
                <a
                  className={`nav-link ${location.pathname === '/home' ? 'active text-primary' : 'text-black'} cursor-pointer`}
                  onClick={() => navigate('/home')}
                  title="Type Of Delivery"
                >
                  <img src={DeliveryIcon} alt="Delivery" className="icon-size" />
                </a>
              </li>
              <li className="nav-item">
                <a
                  className={`nav-link ${location.pathname === '/table' ? 'active text-primary' : 'text-black'} cursor-pointer`}
                  onClick={() => navigate('/table')}
                  title="Table"
                >
                  <img src={TableIcon} alt="Table" className="icon-size" />
                </a>
              </li>
              <li className="nav-item">
                <a
                  className={`nav-link ${location.pathname === '/kitchen' ? 'active text-primary' : 'text-black'} cursor-pointer`}
                  onClick={() => navigate('/kitchen')}
                  title="Kitchen"
                >
                  <img src={KitchenIcon} alt="Kitchen" className="icon-size" />
                </a>
              </li>
              <li className="nav-item">
                <a
                  className={`nav-link ${location.pathname === '/salespage' ? 'active text-primary' : 'text-black'} cursor-pointer`}
                  onClick={() => navigate('/salespage')}
                  title="Sales Invoice"
                >
                  <img src={SaveIcon} alt="Save" className="icon-size" />
                </a>
              </li>
              {/* <li className="nav-item">
                <a
                  className={`nav-link ${location.pathname === '/opening-entry' ? 'active text-primary' : 'text-black'} cursor-pointer`}
                  onClick={handleOpeningEntryNavigation}
                  title="Opening Entry"
                >
                  <img src={ClosingEntryIcon} alt="Opening Entry" className="icon-size" />
                </a>
              </li> */}
              <li className="nav-item">
                <a
                  className={`nav-link ${location.pathname === '/closing-entry' ? 'active text-primary' : 'text-black'} cursor-pointer`}
                  onClick={handleClosingEntryNavigation}
                  title="Closing Entry"
                >
                  <img src={ClosingEntryIcon} alt="Closing Entry" className="icon-size" />
                </a>
              </li>
            </ul>

            {/* Right Side: User Info and Logout */}
            <div className="d-flex align-items-center ms-auto pe-3">
              <div className="user-info text-end me-3">
                <div className="d-flex align-items-center justify-content-end">
                  <i className="bi bi-person-circle fs-4 me-2"></i>
                  <span className="fw-bold text-black mb-0">{currentUser.email}</span>
                </div>
                <small className="d-block text-muted">{formattedDate}</small>
                <small className="d-block text-muted">{formattedTime}</small>
              </div>
              <a
                className={`nav-link ${location.pathname === '/logout' ? 'active text-primary' : 'text-black'} cursor-pointer`}
                onClick={handleLogout}
                title="Logout"
              >
                <img src={PowerOffIcon} alt="Logout" className="icon-size" />
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* ClosingEntry Component */}
      <div className="container-fluid closing-entry-container mt-4">
        <h2 className="text-center my-4">Create POS Closing Entry</h2>
        <div className="row">
          <div className="col-lg-12">
            <div className="row mb-3">
              <div className="col-md-4">
                <label htmlFor="posOpeningEntry" className="form-label">POS Opening Entry</label>
                <select
                  id="posOpeningEntry"
                  className="form-control"
                  value={posOpeningEntry}
                  onChange={(e) => setPosOpeningEntry(e.target.value)}
                >
                  <option value="">-- Select --</option>
                  {openingEntries.length > 0 ? (
                    openingEntries.map((entry) => (
                      <option key={entry._id} value={entry.name}>
                        {entry.name}
                      </option>
                    ))
                  ) : (
                    <option value="">No Opening Entries Available</option>
                  )}
                </select>
              </div>
              <div className="col-md-4">
                <label htmlFor="periodStartDate" className="form-label">Period Start Date</label>
                <input
                  type="date"
                  id="periodStartDate"
                  className="form-control"
                  value={periodStartDate}
                  disabled
                />
              </div>
              <div className="col-md-4">
                <label htmlFor="postingDate" className="form-label">Posting Date</label>
                <input
                  type="date"
                  id="postingDate"
                  className="form-control"
                  value={postingDate}
                  onChange={(e) => setPostingDate(e.target.value)}
                />
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-4">
                <label htmlFor="periodEndDate" className="form-label">Period End Date & Time</label>
                <input
                  type="datetime-local"
                  id="periodEndDate"
                  className="form-control"
                  value={periodEndDate}
                  onChange={(e) => setPeriodEndDate(e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <label htmlFor="company" className="form-label">Company</label>
                <input
                  type="text"
                  id="company"
                  className="form-control"
                  value={company}
                  disabled
                />
              </div>
              <div className="col-md-4">
                <label htmlFor="user" className="form-label">User</label>
                <input
                  type="text"
                  id="user"
                  className="form-control"
                  value={user}
                  disabled
                />
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <label htmlFor="posProfile" className="form-label">POS Profile</label>
                <input
                  type="text"
                  id="posProfile"
                  className="form-control"
                  value={posProfile}
                  disabled
                />
              </div>
            </div>

            <h5>POS Transactions</h5>
            <div className="table-responsive mb-3">
              <table className="table border text-start">
                <thead>
                  <tr>
                    <th>POS Invoice</th>
                    <th>Grand Total</th>
                    <th>Posting Date</th>
                    <th>Customer</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {posTransactions.map((tx, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          value={tx.pos_invoice}
                          onChange={(e) => handlePosTransactionChange(index, 'pos_invoice', e.target.value)}
                          disabled
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          value={tx.grand_total}
                          onChange={(e) => handlePosTransactionChange(index, 'grand_total', e.target.value)}
                          min="0"
                          step="0.01"
                          disabled
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          className="form-control"
                          value={tx.posting_date}
                          onChange={(e) => handlePosTransactionChange(index, 'posting_date', e.target.value)}
                          disabled
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          value={tx.customer}
                          onChange={(e) => handlePosTransactionChange(index, 'customer', e.target.value)}
                          disabled
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRemovePosTransaction(index)}
                          disabled={posTransactions.length === 1}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn btn-primary" onClick={handleAddPosTransaction}>
                Add Transaction
              </button>
            </div>

            <h5>Payment Reconciliation</h5>
            <div className="table-responsive mb-3">
              <table className="table border text-start">
                <thead>
                  <tr>
                    <th>Mode of Payment</th>
                    <th>Opening Amount</th>
                    <th>Expected Amount</th>
                    <th>Closing Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentReconciliation.map((pr, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          value={pr.mode_of_payment}
                          onChange={(e) => handlePaymentReconciliationChange(index, 'mode_of_payment', e.target.value)}
                          disabled
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          value={pr.opening_amount}
                          onChange={(e) => handlePaymentReconciliationChange(index, 'opening_amount', e.target.value)}
                          min="0"
                          step="0.01"
                          disabled
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          value={pr.expected_amount}
                          disabled
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          value={pr.closing_amount}
                          onChange={(e) => handlePaymentReconciliationChange(index, 'closing_amount', e.target.value)}
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRemovePaymentReconciliation(index)}
                          disabled={paymentReconciliation.length === 1}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn btn-primary" onClick={handleAddPaymentReconciliation}>
                Add Payment
              </button>
            </div>

            <h5>Taxes</h5>
            <div className="table-responsive mb-3">
              <table className="table border text-start">
                <thead>
                  <tr>
                    <th>Account Head</th>
                    <th>Rate (%)</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {taxes.map((tax, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          value={tax.account_head}
                          onChange={(e) => handleTaxChange(index, 'account_head', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          value={tax.rate}
                          onChange={(e) => handleTaxChange(index, 'rate', e.target.value)}
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          value={tax.amount}
                          onChange={(e) => handleTaxChange(index, 'amount', e.target.value)}
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRemoveTax(index)}
                          disabled={taxes.length === 1}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn btn-primary" onClick={handleAddTax}>
                Add Tax
              </button>
            </div>

            <div className="row mb-3">
              <div className="col-md-4">
                <label htmlFor="grandTotal" className="form-label">Grand Total</label>
                <input
                  type="number"
                  id="grandTotal"
                  className="form-control"
                  value={grandTotal}
                  onChange={(e) => setGrandTotal(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="col-md-4">
                <label htmlFor="netTotal" className="form-label">Net Total</label>
                <input
                  type="number"
                  id="netTotal"
                  className="form-control"
                  value={netTotal}
                  onChange={(e) => setNetTotal(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="col-md-4">
                <label htmlFor="totalQuantity" className="form-label">Total Quantity</label>
                <input
                  type="number"
                  id="totalQuantity"
                  className="form-control"
                  value={totalQuantity}
                  onChange={(e) => setTotalQuantity(e.target.value)}
                  min="0"
                />
              </div>
            </div>

            <div className="row">
              <div className="col-md-12 text-end">
                <button className="btn btn-success" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Closing Entry'}
                </button>
                <button className="btn btn-secondary ms-2" onClick={() => navigate('/')}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inline CSS */}
      <style jsx>{`
        .icon-size {
          width: 36px;
          height: 36px;
          vertical-align: middle;
        }
        .nav-link {
          padding: 0.75rem 1.5rem;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .cursor-pointer {
          cursor: pointer;
        }
        .navbar-nav {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
        }
        .nav-item {
          margin: 0 10px;
        }
        .alert {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1050;
          min-width: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 15px;
          font-size: 1rem;
        }
        .alert .btn {
          margin-left: 15px;
          padding: 5px 20px;
          font-size: 0.9rem;
        }
        .closing-entry-container {
          padding: 20px;
          background-color: #f8f9fa;
          min-height: calc(100vh - 70px);
        }
        .table-responsive {
          margin-bottom: 20px;
        }
        .table th, .table td {
          vertical-align: middle;
        }
        .btn-danger:disabled {
          opacity: 0.6;
        }
        h5 {
          margin-top: 20px;
          margin-bottom: 10px;
          font-weight: bold;
        }
        /* Responsive Adjustments */
        @media (max-width: 991px) {
          .navbar-nav {
            flex-direction: column;
            align-items: flex-start;
          }
          .nav-item {
            margin: 5px 0;
          }
          .alert {
            min-width: 80%;
          }
        }
        @media (max-width: 576px) {
          .icon-size {
            width: 28px;
            height: 28px;
          }
          .nav-link {
            padding: 0.5rem 1rem;
          }
          .alert {
            min-width: 90%;
            font-size: 0.9rem;
          }
          .alert .btn {
            padding: 4px 15px;
            font-size: 0.8rem;
          }
          .user-info {
            font-size: 0.9rem;
          }
          .bi-person-circle {
            font-size: 1.5rem !important;
          }
          .closing-entry-container {
            padding: 10px;
          }
          .btn {
            font-size: 0.8rem;
            padding: 6px 12px;
          }
          h5 {
            font-size: 1.1rem;
          }
        }
      `}</style>
    </>
  );
}

export default ClosingEntryWithNavbar;