// src/components/Bearer/OpeningEntryWithNavbar.jsx
import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { UserContext } from '../../Context/UserContext';

// Import SVG icons (adjust paths as needed for your project)
import ClosingEntryIcon from '/menuIcons/closingentry.svg';
import HomeIcon from '/menuIcons/home.svg';
import KitchenIcon from '/menuIcons/kitchen.svg';
import PowerOffIcon from '/menuIcons/poweroff.svg';
import TableIcon from '/menuIcons/table1.svg';
import SaveIcon from '/menuIcons/save.svg';

// Import Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';

function OpeningEntryWithNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useContext(UserContext);
  const reduxUser = useSelector((state) => state.user.user);
  const posProfile = useSelector((state) => state.user.pos_profile);

  // Get user from Redux or fallback to localStorage
  const storedUser = JSON.parse(localStorage.getItem('user')) || { email: "bearer@gmail.com" };
  const currentUser = user || reduxUser || storedUser;

  // Date and Time state for Navbar
  const [currentTime, setCurrentTime] = useState(new Date());

  // Warning message states
  const [warningMessage, setWarningMessage] = useState(""); // For logout and error messages
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

  // Navbar-specific functions
  const handleLogout = () => {
    setWarningMessage("Logout Successful!");
    setWarningType("success");
    setPendingAction(() => () => {
      setUser(null);
      localStorage.removeItem('user');
      navigate('/', { replace: true });
    });
  };

  const handleOpeningEntryNavigation = () => {
    navigate('/opening-entry');
  };

  const handleClosingEntryNavigation = () => {
    const posOpeningEntry = localStorage.getItem('posOpeningEntry') || '';
    console.log('Navigating to Closing Entry with posOpeningEntry:', posOpeningEntry);
    navigate('/closing-entry', { state: { posOpeningEntry } });
  };

  const handleBack = () => {
    navigate(-1);
  };

  // OpeningEntry-specific state and logic
  const [periodStartDate, setPeriodStartDate] = useState('');
  const [postingDate, setPostingDate] = useState(new Date().toISOString().split('T')[0]);
  const [company, setCompany] = useState('');
  const [username, setUsername] = useState('');
  const [balanceDetails, setBalanceDetails] = useState([{ mode_of_payment: '', opening_amount: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [successMessage, setSuccessMessage] = useState(''); // New state for success message

  useEffect(() => {
    console.log("OpeningEntryWithNavbar mounted");
    const handleGlobalClick = (e) => {
      console.log("Global click in OpeningEntryWithNavbar:", e.target);
    };
    document.addEventListener("click", handleGlobalClick);

    const storedUser = JSON.parse(localStorage.getItem('user'));
    const currentUser = user || reduxUser || storedUser;
    if (currentUser) {
      setUsername(currentUser.username || currentUser.email?.split('@')[0] || 'Guest');
      setCompany(currentUser.company || 'MyCompany');
    }

    return () => {
      console.log("OpeningEntryWithNavbar unmounted");
      document.removeEventListener("click", handleGlobalClick);
    };
  }, [user, reduxUser]);

  const validateForm = () => {
    const missingFields = [];
    if (!periodStartDate) missingFields.push('Period Start Date');
    if (!postingDate) missingFields.push('Posting Date');
    if (!company) missingFields.push('Company');
    if (!username) missingFields.push('User');
    if (balanceDetails.length === 0 || balanceDetails.some((d) => !d.mode_of_payment || !d.opening_amount)) {
      missingFields.push('Balance Details (complete all rows)');
    }

    if (missingFields.length > 0) {
      setWarning(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return false;
    }
    setWarning('');
    return true;
  };

  const handleAddBalanceDetail = () => {
    setBalanceDetails((prev) => [...prev, { mode_of_payment: '', opening_amount: '' }]);
  };

  const handleBalanceDetailChange = (index, field, value) => {
    setBalanceDetails((prev) =>
      prev.map((detail, i) => (i === index ? { ...detail, [field]: value } : detail))
    );
    validateForm();
  };

  const handleRemoveBalanceDetail = (index) => {
    setBalanceDetails((prev) => prev.filter((_, i) => i !== index));
    validateForm();
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccessMessage(''); // Clear any previous success message
    const payload = {
      period_start_date: periodStartDate,
      posting_date: postingDate,
      company,
      user: username,
      balance_details: balanceDetails,
      status: 'Draft',
      docstatus: 0,
    };
    console.log('OpeningEntry - Payload:', payload);

    try {
      const response = await fetch('http://localhost:5000/api/create_opening_entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse JSON:', jsonError);
        throw new Error('Server returned invalid JSON');
      }

      console.log('OpeningEntry API Response:', { status: response.status, result });

      if (response.ok && result.message.status === 'success') {
        const openingEntryName = result.message.name;
        localStorage.setItem('openingEntryName', openingEntryName);
        localStorage.setItem('posOpeningEntry', openingEntryName); // Store for closing entry navigation
        setSuccessMessage(`Opening Entry created successfully: ${openingEntryName}`);
      } else {
        const errorMessage = typeof result.message === 'string' ? result.message : `Server error: ${response.status}`;
        setError(errorMessage);
        setWarningMessage(`Failed: ${errorMessage}`);
        setWarningType("warning");
      }
    } catch (error) {
      console.error('OpeningEntry Network Error:', error);
      const errorMsg = error.message || 'Network error occurred.';
      setError(errorMsg);
      setWarningMessage(`Error: ${errorMsg}`);
      setWarningType("warning");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessOk = () => {
    setSuccessMessage(''); // Clear the success message
    navigate('/home'); // Navigate to the home page
  };

  return (
    <>
      {/* Warning Alert for Logout and Errors */}
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

      {/* OpeningEntry Component */}
      <div className="container-fluid opening-entry-container mt-4">
        <h2 className="text-center my-4">Create Opening Entry</h2>
        {error && <div className="alert alert-danger text-center">{error}</div>}
        {warning && (
          <div className="alert alert-warning text-center alert-dismissible fade show" role="alert">
            {warning}
            <button
              type="button"
              className="btn-close"
              onClick={() => setWarning('')}
              aria-label="Close"
            ></button>
          </div>
        )}
        {successMessage && (
          <div className="alert alert-success text-center alert-dismissible fade show" role="alert">
            {successMessage}
            <button
              type="button"
              className="btn btn-primary ms-3"
              onClick={handleSuccessOk}
            >
              OK
            </button>
          </div>
        )}
        <div className="row">
          <div className="col-lg-12">
            <div className="row mb-3">
              <div className="col-md-4">
                <label htmlFor="periodStartDate" className="form-label">Period Start Date</label>
                <input
                  type="date"
                  id="periodStartDate"
                  className="form-control"
                  value={periodStartDate}
                  onChange={(e) => {
                    setPeriodStartDate(e.target.value);
                    validateForm();
                  }}
                />
              </div>
              <div className="col-md-4">
                <label htmlFor="postingDate" className="form-label">Posting Date</label>
                <input
                  type="date"
                  id="postingDate"
                  className="form-control"
                  value={postingDate}
                  onChange={(e) => {
                    setPostingDate(e.target.value);
                    validateForm();
                  }}
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
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <label htmlFor="user" className="form-label">User</label>
                <input
                  type="text"
                  id="user"
                  className="form-control"
                  value={username}
                  disabled
                />
              </div>
            </div>

            <div className="table-responsive mb-3">
              <table className="table border text-start">
                <thead>
                  <tr>
                    <th>Mode of Payment</th>
                    <th>Opening Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {balanceDetails.map((detail, index) => (
                    <tr key={index}>
                      <td>
                        <select
                          className="form-control"
                          value={detail.mode_of_payment}
                          onChange={(e) => handleBalanceDetailChange(index, 'mode_of_payment', e.target.value)}
                        >
                          <option value="">-- Select --</option>
                          <option value="Cash">Cash</option>
                          <option value="Credit Card">Credit Card</option>
                          <option value="UPI">UPI</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          value={detail.opening_amount}
                          onChange={(e) => handleBalanceDetailChange(index, 'opening_amount', e.target.value)}
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRemoveBalanceDetail(index)}
                          disabled={balanceDetails.length === 1}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn btn-primary" onClick={handleAddBalanceDetail}>
                Add Payment Mode
              </button>
            </div>

            <div className="row">
              <div className="col-md-6">
                <div className="grand-tot-div">
                  <span>Total Opening Amount:</span>
                  <span>
                    $
                    {balanceDetails
                      .reduce((sum, detail) => sum + (parseFloat(detail.opening_amount) || 0), 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="col-md-6 text-end">
                <button className="btn btn-success" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Opening Entry'}
                </button>
                <button className="btn btn-secondary ms-2" onClick={() => navigate('/')}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inline CSS (assumed from OpeningEntryWithNavbar.css) */}
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
        .opening-entry-container {
          padding: 20px;
          background-color: #f8f9fa;
          min-height: calc(100vh - 70px);
        }
        .grand-tot-div {
          background-color: #e9ecef;
          padding: 10px;
          border-radius: 5px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: bold;
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
          .grand-tot-div {
            flex-direction: column;
            text-align: center;
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
          .opening-entry-container {
            padding: 10px;
          }
          .grand-tot-div {
            padding: 8px;
            font-size: 0.9rem;
          }
          .btn {
            font-size: 0.8rem;
            padding: 6px 12px;
          }
        }
      `}</style>
    </>
  );
}

export default OpeningEntryWithNavbar;