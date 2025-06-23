import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

const CustomerListPage = () => {
  const [customerList, setCustomerList] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const navigate = useNavigate();

  // Fetch all customers from the backend
  const handleViewCustomers = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/customers");
      if (!response.ok) {
        throw new Error("Failed to fetch customers");
      }
      const data = await response.json();
      setCustomerList(data);
      setFilteredCustomers(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleViewCustomers();
  }, []);

  // Search functionality
  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term.trim() === "") {
      setFilteredCustomers(customerList);
    } else {
      const filtered = customerList.filter((customer) =>
        customer.phone_number.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  };

  const goToAdminPage = () => navigate("/admin");

  // Delete customer function with validation
  const handleDeleteCustomer = (customerId) => {
    if (!customerId || customerId === "undefined") {
      setWarningMessage("Invalid customer ID. Please try again.");
      return;
    }
    setCustomerToDelete(customerId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/customers/${customerToDelete}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete customer");
      }
      setCustomerList((prev) => prev.filter((customer) => customer._id !== customerToDelete));
      setFilteredCustomers((prev) => prev.filter((customer) => customer._id !== customerToDelete));
      setWarningMessage("Customer deleted successfully!");
    } catch (error) {
      setWarningMessage(`Error: ${error.message}`);
    } finally {
      setShowDeleteConfirm(false);
      setCustomerToDelete(null);
    }
  };

  // Edit customer functions
  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSelectedCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveCustomer = async () => {
    if (!selectedCustomer._id) {
      setWarningMessage("Invalid customer ID. Cannot save changes.");
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/customers/${selectedCustomer._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(selectedCustomer),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update customer");
      }
      setCustomerList((prev) =>
        prev.map((customer) =>
          customer._id === selectedCustomer._id ? selectedCustomer : customer
        )
      );
      setFilteredCustomers((prev) =>
        prev.map((customer) =>
          customer._id === selectedCustomer._id ? selectedCustomer : customer
        )
      );
      setShowModal(false);
      setWarningMessage("Customer updated successfully!");
    } catch (error) {
      setWarningMessage(`Error: ${error.message}`);
    }
  };

  return (
    <div className="min-vh-100 py-5" style={{ background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" }}>
      <div className="container" style={{ maxWidth: "1300px" }}>
        <button
          className="btn btn-light mb-4 d-flex align-items-center gap-2 shadow-sm"
          onClick={goToAdminPage}
        >
          <FaArrowLeft /> Back to Admin
        </button>

        <h2 className="mb-4 text-dark fw-bold border-bottom border-primary pb-3" style={{ width: "fit-content" }}>
          Customer Management
        </h2>

        {/* Warning Message Display */}
        {warningMessage && (
          <div className="alert alert-warning d-flex align-items-center justify-content-center mx-auto mb-4 shadow" style={{ maxWidth: "600px" }}>
            <span>{warningMessage}</span>
            <button
              type="button"
              className="btn-close ms-3"
              aria-label="Close"
              onClick={() => setWarningMessage("")}
            ></button>
          </div>
        )}

        <div className="mb-4 d-flex align-items-center gap-2">
          <input
            type="text"
            className="form-control rounded-pill shadow-sm"
            placeholder="Search by phone number..."
            value={searchTerm}
            onChange={handleSearch}
            style={{ maxWidth: "300px" }}
          />
        </div>

        {loading && (
          <div className="text-center text-muted">
            <p>Loading customers...</p>
          </div>
        )}
        {error && (
          <div className="alert alert-danger d-flex align-items-center justify-content-center mx-auto mb-4 shadow" style={{ maxWidth: "600px" }}>
            <span>{error}</span>
            <button
              type="button"
              className="btn-close ms-3"
              aria-label="Close"
              onClick={() => setError("")}
            ></button>
          </div>
        )}
        {!loading && !error && filteredCustomers.length === 0 && (
          <div className="bg-white p-4 rounded-3 text-center text-muted shadow mx-auto" style={{ maxWidth: "600px" }}>
            No customers found
          </div>
        )}

        {!loading && !error && filteredCustomers.length > 0 && (
          <div className="card shadow rounded-3 overflow-auto">
            <div className="card-body p-0">
              <table className="table table-hover mb-0">
                <thead className="bg-primary text-white">
                  <tr>
                    <th scope="col" className="p-3">ID</th>
                    <th scope="col" className="p-3">Name</th>
                    <th scope="col" className="p-3">Phone</th>
                    <th scope="col" className="p-3">Building</th>
                    <th scope="col" className="p-3">Flat/Villa</th>
                    <th scope="col" className="p-3">Location</th>
                    <th scope="col" className="p-3">WhatsApp</th>
                    <th scope="col" className="p-3">Email</th>
                    <th scope="col" className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer._id}>
                      <td className="p-3">{customer._id}</td>
                      <td className="p-3">{customer.customer_name}</td>
                      <td className="p-3">{customer.phone_number}</td>
                      <td className="p-3">{customer.building_name || "N/A"}</td>
                      <td className="p-3">{customer.flat_villa_no || "N/A"}</td>
                      <td className="p-3">{customer.location || "N/A"}</td>
                      <td className="p-3">{customer.whatsapp_number || "N/A"}</td>
                      <td className="p-3">{customer.email || "N/A"}</td>
                      <td className="p-3">
                        <button
                          className="btn btn-success btn-sm me-2 rounded-pill"
                          onClick={() => handleEditCustomer(customer)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm rounded-pill"
                          onClick={() => handleDeleteCustomer(customer._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Customer Modal */}
        {showModal && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "500px" }}>
              <div className="modal-content rounded-3 shadow">
                <div className="modal-header border-bottom">
                  <h5 className="modal-title text-dark fw-bold">Edit Customer</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body">
                  {[
                    { label: "Name", name: "customer_name" },
                    { label: "Phone", name: "phone_number" },
                    { label: "Building", name: "building_name" },
                    { label: "Flat/Villa No", name: "flat_villa_no" },
                    { label: "Location", name: "location" },
                    { label: "WhatsApp", name: "whatsapp_number" },
                    { label: "Email", name: "email", type: "email" },
                  ].map((field) => (
                    <div key={field.name} className="mb-3">
                      <label className="form-label fw-medium text-dark">{field.label}</label>
                      <input
                        type={field.type || "text"}
                        name={field.name}
                        className="form-control rounded"
                        value={selectedCustomer[field.name] || ""}
                        onChange={handleInputChange}
                      />
                    </div>
                  ))}
                </div>
                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="btn btn-success rounded-pill"
                    onClick={handleSaveCustomer}
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary rounded-pill"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "400px" }}>
              <div className="modal-content rounded-3 shadow">
                <div className="modal-body text-center">
                  <p className="text-dark mb-4">Are you sure you want to delete this customer?</p>
                  <div className="d-flex gap-3">
                    <button
                      className="btn btn-danger rounded-pill flex-fill"
                      onClick={confirmDelete}
                    >
                      Yes, Delete
                    </button>
                    <button
                      className="btn btn-secondary rounded-pill flex-fill"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      No, Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerListPage;