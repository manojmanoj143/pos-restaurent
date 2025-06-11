import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function AddTablePage() {
  const [tableNumber, setTableNumber] = useState("");
  const [numberOfChairs, setNumberOfChairs] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tables, setTables] = useState([]);
  const navigate = useNavigate();

  // Fetch tables from backend
  const fetchTables = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/tables", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      });
      const data = await response.json();
      if (response.ok) {
        setTables(data.message || []);
      } else {
        throw new Error(data.error || "Failed to fetch tables");
      }
    } catch (err) {
      console.error("Error fetching tables:", err);
      setError(err.message);
    }
  };

  // Run fetchTables on component mount
  useEffect(() => {
    fetchTables();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!tableNumber || !numberOfChairs) {
      setError("Please fill in both Table Number and Number of Chairs.");
      return;
    }

    const tableData = {
      table_number: tableNumber,
      number_of_chairs: parseInt(numberOfChairs),
    };

    try {
      const response = await fetch("http://localhost:5000/api/tables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(tableData),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (jsonError) {
        throw new Error(`Invalid JSON response: ${text}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! Status: ${response.status}`);
      }

      setSuccess(data.message);
      setTableNumber("");
      setNumberOfChairs("");
      fetchTables(); // Refresh table list
    } catch (err) {
      setError(err.message);
      console.error("Error adding table:", err);
    }
  };

  // Delete table function
  const handleDelete = async (tableNumberToDelete) => {
    try {
      const response = await fetch(`http://localhost:5000/api/tables/${tableNumberToDelete}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (jsonError) {
        throw new Error(`Invalid JSON response: ${text}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! Status: ${response.status}`);
      }

      setSuccess(data.message);
      fetchTables(); // Refresh table list after deletion
    } catch (err) {
      setError(err.message);
      console.error("Error deleting table:", err);
    }
  };

  const styles = {
    container: {
      padding: "30px",
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    },
    backButton: {
      position: "absolute",
      left: "25px",
      top: "25px",
      fontSize: "1.8rem",
      cursor: "pointer",
      color: "#2c3e50",
      transition: "color 0.3s ease",
    },
    backButtonHover: {
      color: "#3498db",
    },
    heading: {
      marginBottom: "30px",
      fontSize: "2.5rem",
      color: "#2c3e50",
      textShadow: "1px 1px 2px rgba(0,0,0,0.1)",
    },
    form: {
      maxWidth: "450px",
      width: "100%",
      backgroundColor: "#fff",
      padding: "25px",
      borderRadius: "10px",
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      display: "flex",
      flexDirection: "column",
      gap: "20px",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
    },
    label: {
      marginBottom: "8px",
      fontWeight: "600",
      color: "#34495e",
      fontSize: "1.1rem",
    },
    input: {
      padding: "12px",
      border: "1px solid #ddd",
      borderRadius: "6px",
      fontSize: "1rem",
      outline: "none",
      transition: "border-color 0.3s ease",
    },
    inputFocus: {
      borderColor: "#3498db",
      boxShadow: "0 0 5px rgba(52, 152, 219, 0.3)",
    },
    button: {
      padding: "12px",
      backgroundColor: "#2ecc71",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "1.1rem",
      fontWeight: "600",
      transition: "background-color 0.3s ease",
    },
    buttonHover: {
      backgroundColor: "#27ae60",
    },
    deleteButton: {
      padding: "6px 12px",
      backgroundColor: "#e74c3c",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "0.95rem",
      transition: "background-color 0.3s ease",
    },
    deleteButtonHover: {
      backgroundColor: "#c0392b",
    },
    error: {
      color: "#e74c3c",
      backgroundColor: "#fceaea",
      padding: "10px",
      borderRadius: "5px",
      marginTop: "15px",
      textAlign: "center",
    },
    success: {
      color: "#27ae60",
      backgroundColor: "#eafaf1",
      padding: "10px",
      borderRadius: "5px",
      marginTop: "15px",
      textAlign: "center",
    },
    tableContainer: {
      marginTop: "40px",
      maxWidth: "700px",
      width: "100%",
      backgroundColor: "#fff",
      padding: "20px",
      borderRadius: "10px",
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      border: "1px solid #ecf0f1",
    },
    th: {
      backgroundColor: "#3498db",
      color: "white",
      padding: "12px",
      border: "1px solid #2980b9",
      textAlign: "left",
      fontWeight: "600",
    },
    td: {
      padding: "12px",
      border: "1px solid #ecf0f1",
      textAlign: "left",
      color: "#2c3e50",
    },
    noTables: {
      color: "#7f8c8d",
      fontStyle: "italic",
      textAlign: "center",
      marginTop: "20px",
    },
  };

  return (
    <div style={styles.container}>
      <i
        className="fas fa-arrow-left"
        style={styles.backButton}
        onClick={() => navigate("/admin")}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => e.key === "Enter" && navigate("/admin")}
        onMouseOver={(e) => (e.target.style.color = styles.backButtonHover.color)}
        onMouseOut={(e) => (e.target.style.color = styles.backButton.color)}
      ></i>
      <h1 style={styles.heading}>Add New Table</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label htmlFor="tableNumber" style={styles.label}>
            Table Number:
          </label>
          <input
            type="text"
            id="tableNumber"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter table number"
            style={styles.input}
            onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
            onBlur={(e) => Object.assign(e.target.style, styles.input)}
            required
          />
        </div>
        <div style={styles.formGroup}>
          <label htmlFor="numberOfChairs" style={styles.label}>
            Number of Chairs:
          </label>
          <input
            type="number"
            id="numberOfChairs"
            value={numberOfChairs}
            onChange={(e) => setNumberOfChairs(e.target.value)}
            placeholder="Enter number of chairs"
            min="0"
            style={styles.input}
            onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
            onBlur={(e) => Object.assign(e.target.style, styles.input)}
            required
          />
        </div>
        <button
          type="submit"
          style={styles.button}
          onMouseOver={(e) => (e.target.style.backgroundColor = styles.buttonHover.backgroundColor)}
          onMouseOut={(e) => (e.target.style.backgroundColor = styles.button.backgroundColor)}
        >
          Add Table
        </button>
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}
      </form>

      <div style={styles.tableContainer}>
        <h2 style={{ ...styles.heading, fontSize: "1.8rem" }}>Added Tables</h2>
        {tables.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Table Number</th>
                <th style={styles.th}>Number of Chairs</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((table, index) => (
                <tr key={index}>
                  <td style={styles.td}>{table.table_number}</td>
                  <td style={styles.td}>{table.number_of_chairs}</td>
                  <td style={styles.td}>
                    <button
                      style={styles.deleteButton}
                      onClick={() => handleDelete(table.table_number)}
                      onMouseOver={(e) => (e.target.style.backgroundColor = styles.deleteButtonHover.backgroundColor)}
                      onMouseOut={(e) => (e.target.style.backgroundColor = styles.deleteButton.backgroundColor)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={styles.noTables}>No tables added yet.</p>
        )}
      </div>
    </div>
  );
}

export default AddTablePage;