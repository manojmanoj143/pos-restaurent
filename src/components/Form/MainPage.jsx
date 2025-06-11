import React from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

const MainPage = () => {
  const navigate = useNavigate();

  // Function to navigate to the Admin Page
  const goBack = () => {
    navigate("/admin"); // Navigate to the /admin page
  };

  return (
    <div className="container mt-5">
      <div className="row">
        <div className="col-md-12 text-center">
          <h1>Welcome to the Dashboard</h1>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <button
              style={{
                fontSize: "20px",
                padding: "15px 30px",
                backgroundColor: "black",
                border: "none",
                color: "white",
                borderRadius: "5px",
              }}
              onClick={() => navigate("/customers")}
              aria-label="View All Customers"
            >
              View All Customers
            </button>
            <button
              style={{
                fontSize: "20px",
                padding: "15px 30px",
                backgroundColor: "black",
                border: "none",
                color: "white",
                borderRadius: "5px",
              }}
              onClick={() => navigate("/items")}
              aria-label="View All Items"
            >
              View All Items
            </button>
            <button
              style={{
                fontSize: "20px",
                padding: "15px 30px",
                backgroundColor: "green",
                border: "none",
                color: "white",
                borderRadius: "5px",
              }}
              onClick={() => navigate("/create-item")}
              aria-label="Add New Item"
            >
              Add New Item
            </button>
            <button
              style={{
                fontSize: "20px",
                padding: "15px 30px",
                backgroundColor: "green",
                border: "none",
                color: "white",
                borderRadius: "5px",
              }}
              onClick={() => navigate("/add-table")}
              aria-label="Add New Table"
            >
              Add New Table
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={goBack}
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          backgroundColor: "#f0f0f0",
          border: "1px solid #ccc",
          color: "#333",
          borderRadius: "5px",
          padding: "10px",
          cursor: "pointer",
        }}
        aria-label="Go Back"
      >
        <FaArrowLeft style={{ fontSize: "24px" }} />
      </button>
    </div>
  );
};

export default MainPage;
