import React, { useState } from "react";

const CreateCustomerPage = () => {
  const [customerName, setCustomerName] = useState("");
  const [warningMessage, setWarningMessage] = useState(""); // For warning and success messages
  const [warningType, setWarningType] = useState("warning"); // "warning" or "success"
  const [pendingAction, setPendingAction] = useState(null); // Store the action to perform after OK

  // Handle OK button click for warning messages
  const handleWarningOk = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setWarningMessage("");
    setWarningType("warning");
  };

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    const customerData = { customer_name: customerName };

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });

      if (response.ok) {
        setWarningMessage('Customer created successfully!');
        setWarningType("success");
        setPendingAction(() => () => setCustomerName(""));
      } else {
        setWarningMessage('Failed to create customer');
        setWarningType("warning");
      }
    } catch (error) {
      console.error('Error:', error);
      setWarningMessage('Error while creating customer');
      setWarningType("warning");
    }
  };

  return (
    <div className="container mt-5">
      {/* Warning/Success Alert */}
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

      <div className="row">
        <div className="col-md-12">
          <h1>Create a New Customer</h1>
          <form onSubmit={handleCustomerSubmit}>
            <div className="form-group">
              <label htmlFor="customer_name">Customer Name:</label>
              <input
                type="text"
                id="customer_name"
                className="form-control"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Submit Customer
            </button>
          </form>
        </div>
      </div>

      {/* Add CSS styling */}
      <style jsx>{`
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
        /* Responsive Adjustments */
        @media (max-width: 991px) {
          .alert {
            min-width: 80%;
          }
        }
        @media (max-width: 576px) {
          .alert {
            min-width: 90%;
            font-size: 0.9rem;
          }
          .alert .btn {
            padding: 4px 15px;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
};

export default CreateCustomerPage;