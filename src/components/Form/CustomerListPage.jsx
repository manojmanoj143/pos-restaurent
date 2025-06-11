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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // New state for delete confirmation
  const [customerToDelete, setCustomerToDelete] = useState(null); // Store customer to delete
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
    // Show confirmation modal instead of window.confirm
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

  // Styles (updated with confirmation modal styles)
  const styles = {
    container: {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
      padding: "40px 20px",
      maxWidth: "1300px",
      margin: "0 auto",
    },
    warningBox: {
      backgroundColor: "#fff3cd",
      border: "1px solid #ffeeba",
      color: "#856404",
      padding: "15px",
      marginBottom: "20px",
      borderRadius: "8px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    warningText: {
      margin: 0,
      fontSize: "14px",
    },
    closeWarning: {
      background: "none",
      border: "none",
      color: "#856404",
      cursor: "pointer",
      fontSize: "16px",
    },
    backButton: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px 20px",
      backgroundColor: "#ffffff",
      border: "none",
      borderRadius: "25px",
      color: "#2c3e50",
      fontWeight: "600",
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      cursor: "pointer",
      transition: "all 0.3s ease",
      marginBottom: "30px",
    },
    title: {
      color: "#2c3e50",
      fontWeight: "700",
      marginBottom: "20px",
      paddingBottom: "15px",
      borderBottom: "3px solid #3498db",
      width: "fit-content",
    },
    searchContainer: {
      marginBottom: "20px",
      display: "flex",
      gap: "10px",
      alignItems: "center",
    },
    searchInput: {
      width: "300px",
      padding: "12px",
      borderRadius: "25px",
      border: "1px solid #ddd",
      boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
      fontSize: "14px",
    },
    tableContainer: {
      backgroundColor: "#ffffff",
      borderRadius: "15px",
      boxShadow: "0 5px 15px rgba(0,0,0,0.08)",
      overflowX: "auto",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    th: {
      backgroundColor: "#3498db",
      color: "white",
      padding: "15px",
      textAlign: "left",
      fontWeight: "600",
    },
    td: {
      padding: "15px",
      borderBottom: "1px solid #eee",
      color: "#34495e",
    },
    actionButton: {
      width: "80px",
      padding: "8px 15px",
      borderRadius: "20px",
      border: "2px solid transparent",
      cursor: "pointer",
      fontWeight: "600",
      transition: "all 0.3s ease",
      margin: "0 5px",
      textAlign: "center",
    },
    editButton: {
      backgroundColor: "#2ecc71",
      color: "white",
    },
    deleteButton: {
      backgroundColor: "#e74c3c",
      color: "white",
    },
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.7)",
      zIndex: 1000,
    },
    modal: {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      backgroundColor: "#ffffff",
      padding: "30px",
      borderRadius: "15px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
      zIndex: 1001,
      width: "100%",
      maxWidth: "500px",
      maxHeight: "90vh",
      overflowY: "auto",
    },
    confirmModal: {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      backgroundColor: "#ffffff",
      padding: "20px",
      borderRadius: "15px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
      zIndex: 1001,
      width: "100%",
      maxWidth: "400px",
      textAlign: "center",
    },
    confirmText: {
      color: "#2c3e50",
      marginBottom: "20px",
      fontSize: "16px",
    },
    modalButtonGroup: {
      display: "flex",
      gap: "15px",
      marginTop: "25px",
    },
    input: {
      width: "100%",
      padding: "12px",
      marginBottom: "15px",
      borderRadius: "8px",
      border: "1px solid #ddd",
      fontSize: "14px",
    },
  };

  return (
    <div style={styles.container}>
      <button
        style={styles.backButton}
        onClick={goToAdminPage}
        onMouseEnter={(e) => (e.target.style.backgroundColor = "#3498db")}
        onMouseLeave={(e) => (e.target.style.backgroundColor = "#ffffff")}
      >
        <FaArrowLeft /> Back to Admin
      </button>

      <h2 style={styles.title}>Customer Management</h2>

      {/* Warning Message Display */}
      {warningMessage && (
        <div style={styles.warningBox}>
          <p style={styles.warningText}>{warningMessage}</p>
          <button
            style={styles.closeWarning}
            onClick={() => setWarningMessage("")}
          >
            ×
          </button>
        </div>
      )}

      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search by phone number..."
          value={searchTerm}
          onChange={handleSearch}
          style={styles.searchInput}
        />
      </div>

      {loading && (
        <div style={{ textAlign: "center", color: "#7f8c8d" }}>
          <p>Loading customers...</p>
        </div>
      )}
      {error && (
        <div
          style={{
            backgroundColor: "#ffebee",
            padding: "15px",
            borderRadius: "8px",
            color: "#c0392b",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      )}
      {!loading && !error && filteredCustomers.length === 0 && (
        <div
          style={{
            backgroundColor: "#fff",
            padding: "30px",
            borderRadius: "15px",
            textAlign: "center",
            color: "#7f8c8d",
            boxShadow: "0 5px 15px rgba(0,0,0,0.08)",
          }}
        >
          No customers found
        </div>
      )}

      {!loading && !error && filteredCustomers.length > 0 && (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Phone</th>
                <th style={styles.th}>Building</th>
                <th style={styles.th}>Flat/Villa</th>
                <th style={styles.th}>Location</th>
                <th style={styles.th}>WhatsApp</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer._id}>
                  <td style={styles.td}>{customer._id}</td>
                  <td style={styles.td}>{customer.customer_name}</td>
                  <td style={styles.td}>{customer.phone_number}</td>
                  <td style={styles.td}>{customer.building_name || "N/A"}</td>
                  <td style={styles.td}>{customer.flat_villa_no || "N/A"}</td>
                  <td style={styles.td}>{customer.location || "N/A"}</td>
                  <td style={styles.td}>{customer.whatsapp_number || "N/A"}</td>
                  <td style={styles.td}>{customer.email || "N/A"}</td>
                  <td style={styles.td}>
                    <button
                      style={{ ...styles.actionButton, ...styles.editButton }}
                      onClick={() => handleEditCustomer(customer)}
                      onMouseEnter={(e) => (e.target.style.backgroundColor = "#27ae60")}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = "#2ecc71")}
                    >
                      Edit
                    </button>
                    <button
                      style={{ ...styles.actionButton, ...styles.deleteButton }}
                      onClick={() => handleDeleteCustomer(customer._id)}
                      onMouseEnter={(e) => (e.target.style.backgroundColor = "#c0392b")}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = "#e74c3c")}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showModal && (
        <>
          <div style={styles.modalOverlay} onClick={() => setShowModal(false)} />
          <div style={styles.modal}>
            <h3 style={{ ...styles.title, marginBottom: "25px" }}>Edit Customer</h3>
            <form>
              {[
                { label: "Name", name: "customer_name" },
                { label: "Phone", name: "phone_number" },
                { label: "Building", name: "building_name" },
                { label: "Flat/Villa No", name: "flat_villa_no" },
                { label: "Location", name: "location" },
                { label: "WhatsApp", name: "whatsapp_number" },
                { label: "Email", name: "email", type: "email" },
              ].map((field) => (
                <div key={field.name}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "5px",
                      color: "#2c3e50",
                      fontWeight: "500",
                    }}
                  >
                    {field.label}
                  </label>
                  <input
                    type={field.type || "text"}
                    name={field.name}
                    value={selectedCustomer[field.name] || ""}
                    onChange={handleInputChange}
                    style={styles.input}
                  />
                </div>
              ))}
              <div style={styles.modalButtonGroup}>
                <button
                  type="button"
                  style={{ ...styles.actionButton, ...styles.editButton, flex: 1 }}
                  onClick={handleSaveCustomer}
                  onMouseEnter={(e) => (e.target.style.backgroundColor = "#27ae60")}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = "#2ecc71")}
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.actionButton,
                    backgroundColor: "#95a5a6",
                    color: "white",
                    flex: 1,
                  }}
                  onClick={() => setShowModal(false)}
                  onMouseEnter={(e) => (e.target.style.backgroundColor = "#7f8c8d")}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = "#95a5a6")}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div style={styles.modalOverlay} onClick={() => setShowDeleteConfirm(false)} />
          <div style={styles.confirmModal}>
            <p style={styles.confirmText}>Are you sure you want to delete this customer?</p>
            <div style={styles.modalButtonGroup}>
              <button
                style={{ ...styles.actionButton, ...styles.deleteButton, flex: 1 }}
                onClick={confirmDelete}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#c0392b")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#e74c3c")}
              >
                Yes, Delete
              </button>
              <button
                style={{
                  ...styles.actionButton,
                  backgroundColor: "#95a5a6",
                  color: "white",
                  flex: 1,
                }}
                onClick={() => setShowDeleteConfirm(false)}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#7f8c8d")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#95a5a6")}
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

export default CustomerListPage;