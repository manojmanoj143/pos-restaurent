import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { FaArrowLeft, FaSyncAlt } from "react-icons/fa";
import "./ActiveOrders.css";

function ActiveOrders() {
  const [savedOrders, setSavedOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [warningMessage, setWarningMessage] = useState("");
  const [warningType, setWarningType] = useState("warning");
  const [pendingAction, setPendingAction] = useState(null);
  const [isConfirmation, setIsConfirmation] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const [showDeliveryPopup, setShowDeliveryPopup] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedDeliveryPersonId, setSelectedDeliveryPersonId] = useState(null);
  const [filterType, setFilterType] = useState("Dine In");
  const navigate = useNavigate();
  const vatRate = 0.10; // VAT rate as per FrontPage.jsx

  const fetchData = async () => {
    try {
      const ordersResponse = await axios.get("http://localhost:5000/api/activeorders");
      const orders = Array.isArray(ordersResponse.data) ? ordersResponse.data : [];
      const sanitizedOrders = orders.map((order) => ({
        ...order,
        chairsBooked: Array.isArray(order.chairsBooked) ? order.chairsBooked : [],
        cartItems: Array.isArray(order.cartItems) ? order.cartItems : [],
        pickedUpTime: order.pickedUpTime || null,
      }));
      setSavedOrders(sanitizedOrders);
      localStorage.setItem("savedOrders", JSON.stringify(sanitizedOrders));

      const employeesResponse = await axios.get("http://localhost:5000/api/employees");
      const employeesData = Array.isArray(employeesResponse.data) ? employeesResponse.data : [];
      setEmployees(employeesData);
    } catch (err) {
      setWarningMessage(`Failed to fetch data: ${err.message}`);
      setWarningType("warning");
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchData();
    setWarningMessage("Orders refreshed!");
    setWarningType("success");
  };

  const handleWarningOk = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setWarningMessage("");
    setWarningType("warning");
    setIsConfirmation(false);
  };

  const handleConfirmYes = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setWarningMessage("");
    setWarningType("warning");
    setIsConfirmation(false);
  };

  const handleConfirmNo = () => {
    setWarningMessage("");
    setWarningType("warning");
    setPendingAction(null);
    setIsConfirmation(false);
  };

  const handleDeleteOrder = (orderId, tableNumber) => {
    setWarningMessage("Are you sure you want to delete this order?");
    setWarningType("warning");
    setIsConfirmation(true);
    setPendingAction(() => async () => {
      try {
        await axios.delete(`http://localhost:5000/api/activeorders/${orderId}`);

        let bookedTables = JSON.parse(localStorage.getItem("bookedTables")) || [];
        const updatedBookedTables = bookedTables.filter((tableNum) => tableNum !== tableNumber);
        localStorage.setItem("bookedTables", JSON.stringify(updatedBookedTables));

        let bookedChairs = JSON.parse(localStorage.getItem("bookedChairs")) || {};
        delete bookedChairs[tableNumber];
        localStorage.setItem("bookedChairs", JSON.stringify(bookedChairs));

        const updatedOrders = savedOrders.filter((order) => order.orderId !== orderId);
        setSavedOrders(updatedOrders);
        localStorage.setItem("savedOrders", JSON.stringify(updatedOrders));
        setWarningMessage(`Order for Table ${tableNumber || "N/A"} deleted successfully!`);
        setWarningType("success");
      } catch (err) {
        setWarningMessage(`Failed to delete order: ${err.message}`);
        setWarningType("warning");
      }
    });
  };

  const handleAssignDeliveryPerson = (orderId, deliveryPersonId) => {
    setSelectedOrderId(orderId);
    setSelectedDeliveryPersonId(deliveryPersonId);
    setShowDeliveryPopup(true);
  };

  const confirmDeliveryAssignment = async () => {
    try {
      const response = await axios.put(`http://localhost:5000/api/activeorders/${selectedOrderId}`, {
        deliveryPersonId: selectedDeliveryPersonId,
      });
      const updatedOrder = response.data.order;
      const updatedOrders = savedOrders.map((order) =>
        order.orderId === selectedOrderId ? { ...order, ...updatedOrder } : order
      );
      setSavedOrders(updatedOrders);
      localStorage.setItem("savedOrders", JSON.stringify(updatedOrders));
      setWarningMessage("Delivery person assigned successfully!");
      setWarningType("success");
      setShowDeliveryPopup(false);
      setSelectedOrderId(null);
      setSelectedDeliveryPersonId(null);
    } catch (err) {
      setWarningMessage(`Failed to assign delivery person: ${err.message}`);
      setWarningType("warning");
      setShowDeliveryPopup(false);
    }
  };

  const cancelDeliveryPopup = () => {
    setShowDeliveryPopup(false);
    setSelectedOrderId(null);
    setSelectedDeliveryPersonId(null);
  };

  const updateOrder = async (orderId, updatedOrder) => {
    try {
      const response = await axios.put(`http://localhost:5000/api/activeorders/${orderId}`, updatedOrder);
      const updatedOrders = savedOrders.map((order) =>
        order.orderId === orderId ? { ...order, ...response.data.order } : order
      );
      setSavedOrders(updatedOrders);
      localStorage.setItem("savedOrders", JSON.stringify(updatedOrders));
      setWarningMessage("Order updated successfully!");
      setWarningType("success");
    } catch (err) {
      setWarningMessage(`Failed to update order: ${err.message}`);
      setWarningType("warning");
    }
  };

  const inferOrderType = (order) => {
    if (order.tableNumber && order.tableNumber !== "N/A") return "Dine In";
    else if (
      order.deliveryAddress &&
      (order.deliveryAddress.building_name || order.deliveryAddress.flat_villa_no || order.deliveryAddress.location)
    )
      return "Online Delivery";
    else return "Take Away";
  };

  const handleSelectOrder = (order) => {
    if (!order.cartItems || order.cartItems.length === 0) {
      setWarningMessage("This order has no items. Please select a valid order.");
      setWarningType("warning");
      setIsConfirmation(false);
      return;
    }

    const formattedCartItems = order.cartItems.map((item) => ({
      ...item,
      id: item.id || uuidv4(),
      item_name: item.item_name || item.name,
      name: item.name || item.item_name,
      quantity: Number(item.quantity) || 1,
      basePrice: Number(item.basePrice) || (Number(item.totalPrice) / (Number(item.quantity) || 1)) || 0,
      totalPrice: Number(item.totalPrice) || (Number(item.basePrice) * (Number(item.quantity) || 1)) || 0,
      selectedSize: item.selectedSize || "M",
      icePreference: item.icePreference || "without_ice",
      icePrice: Number(item.icePrice) || 0,
      isSpicy: item.isSpicy || false,
      spicyPrice: Number(item.spicyPrice) || 0,
      kitchen: item.kitchen || "Main Kitchen",
      addonQuantities: item.addonQuantities || {},
      addonVariants: item.addonVariants || {},
      addonPrices: item.addonPrices || {},
      comboQuantities: item.comboQuantities || {},
      comboVariants: item.comboVariants || {},
      comboPrices: item.comboPrices || {},
      selectedCombos: item.selectedCombos || [],
      ingredients: item.ingredients || [],
      kitchenStatuses: item.kitchenStatuses || { [item.kitchen || "Main Kitchen"]: "Pending" },
    }));

    const orderType = order.orderType || inferOrderType(order);
    const phoneNumber = order.phoneNumber?.replace(/^\+\d+/, "") || "";

    setWarningMessage(`You selected ${orderType === "Online Delivery" ? "Order for " + order.customerName : "Table " + (order.tableNumber || "N/A")}`);
    setWarningType("success");
    setPendingAction(() => () => {
      navigate("/frontpage", {
        state: {
          tableNumber: order.tableNumber || "N/A",
          phoneNumber: phoneNumber,
          customerName: order.customerName || "",
          existingOrder: { ...order, cartItems: formattedCartItems },
          cartItems: formattedCartItems,
          deliveryAddress: order.deliveryAddress || { building_name: "", flat_villa_no: "", location: "" },
          whatsappNumber: order.whatsappNumber || "",
          email: order.email || "",
          orderType: orderType,
          bookedChairs: Array.isArray(order.chairsBooked) ? order.chairsBooked : [],
          deliveryPersonId: order.deliveryPersonId || "",
          pickedUpTime: order.pickedUpTime || null,
        },
      });
    });
  };

  const handleBack = () => {
    navigate("/frontpage");
  };

  const toggleItems = (index) => {
    setExpandedItems((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const renderIngredients = (ingredients) => {
    if (!ingredients || ingredients.length === 0) return "No ingredients";
    return (
      <ul className="active-orders-ingredients-list">
        {ingredients.map((ing, idx) => (
          <li key={idx}>
            {ing.name}: {ing.custom_weight || ing.weight || "N/A"}g (₹{ing.calculated_price || ing.base_price || 0})
          </li>
        ))}
      </ul>
    );
  };

  const renderAddons = (addonQuantities, addonVariants) => {
    if (!addonQuantities || Object.keys(addonQuantities).length === 0) return null;
    return (
      <ul className="active-orders-addons-list">
        {Object.entries(addonQuantities)
          .filter(([_, qty]) => qty > 0)
          .map(([addonName, qty], idx) => {
            const addon = addonVariants?.[addonName] || {};
            return (
              <li key={idx}>
                + Addon: {addonName} x{qty} (Kitchen: {addon.kitchen || "Unknown"})
              </li>
            );
          })}
      </ul>
    );
  };

  const renderCombos = (comboQuantities, comboVariants) => {
    if (!comboQuantities || Object.keys(comboQuantities).length === 0) return null;
    return (
      <ul className="active-orders-combos-list">
        {Object.entries(comboQuantities)
          .filter(([_, qty]) => qty > 0)
          .map(([comboName, qty], idx) => {
            const combo = comboVariants?.[comboName] || {};
            return (
              <li key={idx}>
                + Combo: {comboName} ({combo.size || "M"}) x{qty} {combo.spicy && " (Spicy)"} (Kitchen: {combo.kitchen || "Unknown"})
              </li>
            );
          })}
      </ul>
    );
  };

  const calculateOrderTotal = (cartItems) => {
    if (!Array.isArray(cartItems)) return "0.00";
    return cartItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0).toFixed(2);
  };

  const calculateGrandTotal = (cartItems) => {
    if (!Array.isArray(cartItems)) return "0.00";
    const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
    const vat = subtotal * vatRate;
    return (subtotal + vat).toFixed(2);
  };

  const getItemStatus = (item) => {
    if (!item.kitchenStatuses) return item.status || "Pending";
    const statuses = Object.values(item.kitchenStatuses);
    if (statuses.every((status) => status === "PickedUp")) return "PickedUp";
    else if (statuses.every((status) => status === "Prepared" || status === "PickedUp")) return "Prepared";
    else if (statuses.includes("Preparing")) return "Preparing";
    else return "Pending";
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Pending":
        return { backgroundColor: "#fff1f0", color: "#721c24" };
      case "Preparing":
        return { backgroundColor: "#fff3cd", color: "#856404" };
      case "Prepared":
        return { backgroundColor: "#d4edda", color: "#155724" };
      case "PickedUp":
        return { backgroundColor: "#e7f3ff", color: "#004085" };
      default:
        return {};
    }
  };

  const formatDeliveryAddress = (deliveryAddress) => {
    if (!deliveryAddress) return "Not provided";
    const { building_name, flat_villa_no, location } = deliveryAddress;
    const parts = [flat_villa_no, building_name, location].filter((part) => part && part.trim() !== "");
    return parts.length > 0 ? parts.join(", ") : "Not provided";
  };

  const formatChairsBooked = (chairsBooked) => {
    if (!Array.isArray(chairsBooked) || chairsBooked.length === 0) return "None";
    return chairsBooked.join(", ");
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString();
  };

  const getDeliveryPersonName = (deliveryPersonId) => {
    const employee = employees.find((emp) => emp.employeeId === deliveryPersonId);
    return employee ? `${employee.name} (ID: ${employee.employeeId})` : "Not assigned";
  };

  const orderCounts = {
    "Dine In": savedOrders.filter((order) => (order.orderType || inferOrderType(order)) === "Dine In").length,
    "Take Away": savedOrders.filter((order) => (order.orderType || inferOrderType(order)) === "Take Away").length,
    "Online Delivery": savedOrders.filter((order) => (order.orderType || inferOrderType(order)) === "Online Delivery").length,
  };

  const filteredOrders = savedOrders.filter((order) => {
    const orderType = order.orderType || inferOrderType(order);
    return orderType === filterType;
  });

  const renderOrderTable = (orders, tableTitle) => (
    <div className="active-orders-table-wrapper">
      <h2>{tableTitle}</h2>
      {orders.length > 0 ? (
        <div className="active-orders-table-responsive">
          <table className="active-orders-table active-orders-table-striped active-orders-table-bordered">
            <thead>
              <tr>
                {filterType === "Online Delivery" ? (
                  <>
                    <th>Customer</th>
                    <th>Order Type</th>
                    <th>Phone</th>
                    <th>Delivery Address</th>
                    <th>Timestamp</th>
                    <th>Total (₹)</th>
                    <th>Grand Total (₹)</th>
                    <th>Delivery Person</th>
                    <th>Picked Up Time</th>
                    <th>Items</th>
                    <th>Actions</th>
                  </>
                ) : (
                  <>
                    <th>Table</th>
                    <th>Customer</th>
                    <th>Order Type</th>
                    <th>Phone</th>
                    <th>Chairs</th>
                    <th>Timestamp</th>
                    <th>Total (₹)</th>
                    <th>Grand Total (₹)</th>
                    <th>Items</th>
                    <th>Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {orders.map((order, index) => (
                <tr key={order.orderId}>
                  {filterType === "Online Delivery" ? (
                    <>
                      <td>{order.customerName || "Guest"}</td>
                      <td>{order.orderType || inferOrderType(order)}</td>
                      <td>{order.phoneNumber || "Not provided"}</td>
                      <td>{formatDeliveryAddress(order.deliveryAddress)}</td>
                      <td>{formatTimestamp(order.timestamp)}</td>
                      <td>{calculateOrderTotal(order.cartItems)}</td>
                      <td>{calculateGrandTotal(order.cartItems)}</td>
                      <td>
                        {order.deliveryPersonId ? (
                          <span>{getDeliveryPersonName(order.deliveryPersonId)}</span>
                        ) : (
                          <select
                            className="active-orders-select"
                            value={order.deliveryPersonId || ""}
                            onChange={(e) => handleAssignDeliveryPerson(order.orderId, e.target.value)}
                          >
                            <option value="">Select Delivery Person</option>
                            {employees
                              .filter((emp) => emp.role.toLowerCase() === "delivery boy")
                              .map((employee) => (
                                <option key={employee.employeeId} value={employee.employeeId}>
                                  {employee.name} (ID: {employee.employeeId})
                                </option>
                              ))}
                          </select>
                        )}
                      </td>
                      <td>{formatTimestamp(order.pickedUpTime)}</td>
                    </>
                  ) : (
                    <>
                      <td>{order.tableNumber || "N/A"}</td>
                      <td>{order.customerName || "Guest"}</td>
                      <td>{order.orderType || inferOrderType(order)}</td>
                      <td>{order.phoneNumber || "Not provided"}</td>
                      <td>{formatChairsBooked(order.chairsBooked)}</td>
                      <td>{formatTimestamp(order.timestamp)}</td>
                      <td>{calculateOrderTotal(order.cartItems)}</td>
                      <td>{calculateGrandTotal(order.cartItems)}</td>
                    </>
                  )}
                  <td>
                    {order.cartItems && order.cartItems.length > 0 ? (
                      <div>
                        <div
                          className="active-orders-item-header"
                          onClick={() => toggleItems(`${filterType}-${index}`)}
                        >
                          <strong>{order.cartItems[0].name || order.cartItems[0].item_name}</strong>
                          <span>{expandedItems[`${filterType}-${index}`] ? "▼" : "▶"}</span>
                        </div>
                        {expandedItems[`${filterType}-${index}`] && (
                          <ul className="active-orders-list-group">
                            {order.cartItems.map((item, itemIndex) => {
                              const itemStatus = getItemStatus(item);
                              return (
                                <li
                                  key={itemIndex}
                                  className={`active-orders-list-group-item status-${itemStatus.toLowerCase()}`}
                                >
                                  <strong>{item.name || item.item_name}</strong> x{item.quantity}
                                  <div>Price: ₹{item.totalPrice.toFixed(2)}</div>
                                  <div>Size: {item.selectedSize || "M"}</div>
                                  <div>Ice: {item.icePreference || "without_ice"}</div>
                                  <div>Spicy: {item.isSpicy ? "Yes" : "No"}</div>
                                  <div>Kitchen: {item.kitchen || "Main Kitchen"}</div>
                                  <div>Status: {itemStatus}{itemStatus === "PickedUp" ? " (All Done)" : ""}</div>
                                  {renderAddons(item.addonQuantities, item.addonVariants)}
                                  {renderCombos(item.comboQuantities, item.comboVariants)}
                                  <div>
                                    <strong>Ingredients:</strong> {renderIngredients(item.ingredients)}
                                  </div>
                                  {item.kitchenStatuses && (
                                    <div>
                                      <strong>Kitchen Statuses:</strong>
                                      <ul className="active-orders-kitchen-statuses">
                                        {Object.entries(item.kitchenStatuses).map(([kitchen, status], idx) => (
                                          <li key={idx}>
                                            {kitchen}: {status}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <div>No items</div>
                    )}
                  </td>
                  <td>
                    <button
                      className="active-orders-btn active-orders-btn-primary active-orders-btn-sm"
                      onClick={() => handleSelectOrder(order)}
                    >
                      Select
                    </button>
                    <button
                      className="active-orders-btn active-orders-btn-danger active-orders-btn-sm"
                      onClick={() => handleDeleteOrder(order.orderId, order.tableNumber)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="active-orders-text-center">
          <p>No {tableTitle.toLowerCase()} orders found.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="active-orders-container">
      {warningMessage && (
        <div
          className={`active-orders-alert active-orders-alert-${
            warningType === "success" ? "success" : "warning"
          }`}
        >
          {warningMessage}
          {isConfirmation ? (
            <div className="active-orders-alert-buttons">
              <button
                className="active-orders-btn active-orders-btn-success"
                onClick={handleConfirmYes}
              >
                Yes
              </button>
              <button
                className="active-orders-btn active-orders-btn-danger"
                onClick={handleConfirmNo}
              >
                No
              </button>
            </div>
          ) : (
            <button
              className="active-orders-btn active-orders-btn-primary"
              onClick={handleWarningOk}
            >
              OK
            </button>
          )}
        </div>
      )}
      {showDeliveryPopup && (
        <div className="active-orders-modal-overlay">
          <div className="active-orders-modal-content">
            <p>
              Assign {getDeliveryPersonName(selectedDeliveryPersonId)} to the order?
            </p>
            <div>
              <button
                className="active-orders-btn active-orders-btn-success"
                onClick={confirmDeliveryAssignment}
              >
                Confirm
              </button>
              <button
                className="active-orders-btn active-orders-btn-danger"
                onClick={cancelDeliveryPopup}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="active-orders-header">
        <FaArrowLeft
          className="active-orders-back-button"
          onClick={handleBack}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === "Enter" && handleBack()}
        />
        <h1>Active Orders</h1>
        <button
          className="active-orders-btn active-orders-btn-primary active-orders-refresh-btn"
          onClick={handleRefresh}
        >
          <FaSyncAlt style={{ marginRight: "5px" }} />
          Refresh
        </button>
      </div>
      <div className="active-orders-filter-buttons">
        <button
          className={`active-orders-btn ${
            filterType === "Dine In" ? "active-orders-btn-success" : "active-orders-btn-primary"
          }`}
          onClick={() => setFilterType("Dine In")}
        >
          Dine In ({orderCounts["Dine In"]})
        </button>
        <button
          className={`active-orders-btn ${
            filterType === "Take Away" ? "active-orders-btn-success" : "active-orders-btn-primary"
          }`}
          onClick={() => setFilterType("Take Away")}
        >
          Take Away ({orderCounts["Take Away"]})
        </button>
        <button
          className={`active-orders-btn ${
            filterType === "Online Delivery" ? "active-orders-btn-success" : "active-orders-btn-primary"
          }`}
          onClick={() => setFilterType("Online Delivery")}
        >
          Online Delivery ({orderCounts["Online Delivery"]})
        </button>
      </div>
      {renderOrderTable(filteredOrders, filterType)}
    </div>
  );
}

export default ActiveOrders;