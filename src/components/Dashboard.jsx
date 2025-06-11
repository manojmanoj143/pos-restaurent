import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./dashboard.css"; // Ensure this CSS file exists in src/components/

function Dashboard() {
  const [savedOrders, setSavedOrders] = useState([]);
  const [bookedTables, setBookedTables] = useState([]);
  const [pickedUpItems, setPickedUpItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState("active"); // Default to Active Orders
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch saved orders from localStorage
        const orders = JSON.parse(localStorage.getItem("savedOrders")) || [];
        console.log("Saved Orders:", orders);
        setSavedOrders(orders);

        // Fetch booked tables from localStorage
        const tables = JSON.parse(localStorage.getItem("bookedTables")) || [];
        console.log("Booked Tables:", tables);
        setBookedTables(tables);

        // Fetch picked-up items from backend
        const response = await axios.get("http://localhost:5000/api/picked-up-items");
        console.log("Picked Up Items:", response.data);
        if (response.data.success && Array.isArray(response.data.pickedUpItems)) {
          setPickedUpItems(response.data.pickedUpItems);
        } else {
          setPickedUpItems([]);
          console.warn("No valid picked-up items found in API response");
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError("Failed to load dashboard data. Check the server or localStorage.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate order totals and details
  const calculateOrderTotals = () => {
    const activeOrders = savedOrders.filter((order) =>
      order.cartItems.some((item) => !item.status || item.status !== "PickedUp")
    );
    const pendingOrders = savedOrders.filter((order) =>
      order.cartItems.some((item) => !item.status || item.status === "Pending")
    );
    const completedOrders = pickedUpItems.map((entry) => ({
      customerName: entry.customerName || "Unknown",
      phoneNumber: entry.phoneNumber || "N/A",
      tableNumber: entry.tableNumber || "N/A",
      deliveryAddress: entry.deliveryAddress || {},
      whatsappNumber: entry.whatsappNumber || "N/A",
      email: entry.email || "N/A",
      cartItems: Array.isArray(entry.items)
        ? entry.items.map((item) => ({
            id: item._id || "N/A",
            name: item.itemName || "Unnamed Item",
            quantity: item.quantity || 1,
            totalPrice: item.totalPrice || 0,
            addonCounts: item.addonCounts || {},
            addonQuantities: item.addonQuantities || {},
            addonSizes: item.addonSizes || {},
            selectedCombos: item.selectedCombos || [],
            comboQuantities: item.comboQuantities || {},
            comboSizes: item.comboSizes || {},
            kitchen: item.kitchen || "Main Kitchen",
            category: item.category || "Uncategorized",
            selectedSize: item.selectedSize || "M",
            icePreference: item.icePreference || "without_ice",
            icePrice: item.icePrice || 0,
            status: "PickedUp",
          }))
        : [
            {
              id: entry._id || "N/A",
              name: entry.itemName || "Unnamed Item",
              quantity: entry.quantity || 1,
              totalPrice: entry.totalPrice || 0,
              addonCounts: entry.addonCounts || {},
              addonQuantities: entry.addonQuantities || {},
              addonSizes: entry.addonSizes || {},
              selectedCombos: entry.selectedCombos || [],
              comboQuantities: entry.comboQuantities || {},
              comboSizes: entry.comboSizes || {},
              kitchen: entry.kitchen || "Main Kitchen",
              category: entry.category || "Uncategorized",
              selectedSize: entry.selectedSize || "M",
              icePreference: entry.icePreference || "without_ice",
              icePrice: entry.icePrice || 0,
              status: "PickedUp",
            },
          ],
      timestamp: entry.pickupTime || new Date().toISOString(),
    }));

    return { activeOrders, pendingOrders, completedOrders };
  };

  const { activeOrders, pendingOrders, completedOrders } = calculateOrderTotals();

  // Table engagement details
  const tableEngagementDetails = bookedTables.map((tableNumber) => {
    const order = savedOrders.find((o) => o.tableNumber === tableNumber);
    return {
      tableNumber,
      bookedTime: order ? new Date(order.timestamp).toLocaleString() : "N/A",
      status: order ? "Engaged" : "Booked",
      customerName: order?.customerName || "N/A",
      itemsCount: order ? order.cartItems.length : 0,
    };
  });

  const handleViewClick = (view) => {
    setActiveView(view);
  };

  const handleBackToTables = () => {
    navigate("/table");
  };

  // Render only the item name for the "Item Name" column
  const renderItemName = (item) => <strong>{item.name || "Unnamed Item"}</strong>;

  if (loading) {
    return <div className="dashboard-text-center">Loading Dashboard...</div>;
  }

  if (error) {
    return <div className="dashboard-text-center dashboard-text-danger">{error}</div>;
  }

  return (
    <div className="dashboard-wrapper">
      {/* Sidebar Navbar */}
      <div className="dashboard-sidebar">
        <div className="dashboard-sidebar-header">
          <h3>Dashboard</h3>
        </div>
        <nav className="dashboard-nav">
          <button
            className={`dashboard-nav-btn ${activeView === "active" ? "active" : ""}`}
            onClick={() => handleViewClick("active")}
          >
            <span className="dashboard-nav-icon">📋</span> Active Orders ({activeOrders.length})
          </button>
          <button
            className={`dashboard-nav-btn ${activeView === "pending" ? "active" : ""}`}
            onClick={() => handleViewClick("pending")}
          >
            <span className="dashboard-nav-icon">⏳</span> Pending Orders ({pendingOrders.length})
          </button>
          <button
            className={`dashboard-nav-btn ${activeView === "completed" ? "active" : ""}`}
            onClick={() => handleViewClick("completed")}
          >
            <span className="dashboard-nav-icon">✅</span> Completed Orders ({completedOrders.length})
          </button>
          <button
            className={`dashboard-nav-btn ${activeView === "tables" ? "active" : ""}`}
            onClick={() => handleViewClick("tables")}
          >
            <span className="dashboard-nav-icon">🍽️</span> Table Engagement
          </button>
          <button className="dashboard-nav-btn" onClick={handleBackToTables}>
            <span className="dashboard-nav-icon">⬅️</span> Back to Tables
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="dashboard-main">
        <div className="dashboard-content">
          {activeView === "active" && (
            <div className="dashboard-section">
              <h4>Active Orders</h4>
              {activeOrders.length === 0 ? (
                <p className="dashboard-text-muted">No active orders at the moment.</p>
              ) : (
                <div className="dashboard-table-responsive">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Customer Name</th>
                        <th>Table Number</th>
                        <th>Item Name</th>
                        <th>Quantity</th>
                        <th>Kitchen</th>
                        <th>Status</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeOrders.map((order, index) =>
                        order.cartItems
                          .filter((item) => item.status !== "PickedUp")
                          .map((item, i) => (
                            <tr key={`${index}-${i}`}>
                              <td>{index + 1}</td>
                              <td>{order.customerName || "Unknown"}</td>
                              <td>{order.tableNumber || "N/A"}</td>
                              <td>{renderItemName(item)}</td>
                              <td>{item.quantity}</td>
                              <td>{item.kitchen || "Main Kitchen"}</td>
                              <td>
                                <span
                                  className={`dashboard-badge ${
                                    item.status === "Pending" ? "dashboard-bg-warning" : "dashboard-bg-success"
                                  }`}
                                >
                                  {item.status || "Pending"}
                                </span>
                              </td>
                              <td>{new Date(order.timestamp).toLocaleString()}</td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeView === "pending" && (
            <div className="dashboard-section">
              <h4>Pending Orders</h4>
              {pendingOrders.length === 0 ? (
                <p className="dashboard-text-muted">No pending orders at the moment.</p>
              ) : (
                <div className="dashboard-table-responsive">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Customer Name</th>
                        <th>Table Number</th>
                        <th>Item Name</th>
                        <th>Quantity</th>
                        <th>Kitchen</th>
                        <th>Status</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingOrders.map((order, index) =>
                        order.cartItems
                          .filter((item) => !item.status || item.status === "Pending")
                          .map((item, i) => (
                            <tr key={`${index}-${i}`}>
                              <td>{index + 1}</td>
                              <td>{order.customerName || "Unknown"}</td>
                              <td>{order.tableNumber || "N/A"}</td>
                              <td>{renderItemName(item)}</td>
                              <td>{item.quantity}</td>
                              <td>{item.kitchen || "Main Kitchen"}</td>
                              <td>
                                <span className="dashboard-badge dashboard-bg-warning">
                                  {item.status || "Pending"}
                                </span>
                              </td>
                              <td>{new Date(order.timestamp).toLocaleString()}</td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeView === "completed" && (
            <div className="dashboard-section">
              <h4>Completed Orders</h4>
              {completedOrders.length === 0 ? (
                <p className="dashboard-text-muted">No completed orders at the moment.</p>
              ) : (
                <div className="dashboard-table-responsive">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Customer Name</th>
                        <th>Table Number</th>
                        <th>Item Name</th>
                        <th>Quantity</th>
                        <th>Kitchen</th>
                        <th>Pickup Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedOrders.map((order, index) => (
                        order.cartItems.map((item, i) => (
                          <tr key={`${index}-${i}`}>
                            {i === 0 ? (
                              <>
                                <td>{index + 1}</td>
                                <td>{order.customerName || "Unknown"}</td>
                                <td>{order.tableNumber || "N/A"}</td>
                              </>
                            ) : (
                              <>
                                <td></td>
                                <td></td>
                                <td></td>
                              </>
                            )}
                            <td>{renderItemName(item)}</td>
                            <td>{item.quantity}</td>
                            <td>{item.kitchen || "Main Kitchen"}</td>
                            <td>{new Date(order.timestamp).toLocaleString()}</td>
                          </tr>
                        ))
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeView === "tables" && (
            <div className="dashboard-section">
              <h4>Table Engagement Details</h4>
              {tableEngagementDetails.length === 0 ? (
                <p className="dashboard-text-muted">No tables currently engaged or booked.</p>
              ) : (
                <div className="dashboard-table-responsive">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Table Number</th>
                        <th>Customer Name</th>
                        <th>Items Count</th>
                        <th>Booked/Engaged Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableEngagementDetails.map((table, index) => (
                        <tr key={index}>
                          <td>{table.tableNumber}</td>
                          <td>{table.customerName}</td>
                          <td>{table.itemsCount}</td>
                          <td>{table.bookedTime}</td>
                          <td>
                            <span
                              className={`dashboard-badge ${
                                table.status === "Engaged" ? "dashboard-bg-warning" : "dashboard-bg-info"
                              }`}
                            >
                              {table.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;