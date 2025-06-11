import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function SavedOrder({ savedOrders: propSavedOrders, setSavedOrders }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState(propSavedOrders || []);
  const [warningMessage, setWarningMessage] = useState(""); // For warning and confirmation messages
  const [warningType, setWarningType] = useState("warning"); // "warning" or "success"
  const [pendingAction, setPendingAction] = useState(null); // Store the action to perform after confirmation
  const [isConfirmation, setIsConfirmation] = useState(false); // Flag to determine if the alert is a confirmation dialog

  useEffect(() => {
    setOrders(propSavedOrders);
  }, [propSavedOrders]);

  // Handle OK button click for simple messages
  const handleWarningOk = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setWarningMessage("");
    setWarningType("warning");
    setIsConfirmation(false);
  };

  // Handle Yes button click for confirmation dialogs
  const handleConfirmYes = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setWarningMessage("");
    setWarningType("warning");
    setIsConfirmation(false);
  };

  // Handle No button click for confirmation dialogs
  const handleConfirmNo = () => {
    setWarningMessage("");
    setWarningType("warning");
    setPendingAction(null);
    setIsConfirmation(false);
  };

  const handleDeleteOrder = (index) => {
    setWarningMessage("Are you sure you want to delete this order?");
    setWarningType("warning");
    setIsConfirmation(true);
    setPendingAction(() => () => {
      const updatedOrders = orders.filter((_, i) => i !== index);
      const deletedTableNumber = orders[index].tableNumber;

      const bookedTables = JSON.parse(localStorage.getItem("bookedTables")) || [];
      const updatedBookedTables = bookedTables.filter(
        (tableNum) => tableNum !== deletedTableNumber
      );
      localStorage.setItem("bookedTables", JSON.stringify(updatedBookedTables));

      setOrders(updatedOrders);
      localStorage.setItem("savedOrders", JSON.stringify(updatedOrders));
      setSavedOrders(updatedOrders);
    });
  };

  const handleSelectOrder = (order) => {
    setWarningMessage(`You selected Table ${order.tableNumber}`);
    setWarningType("success");
    setIsConfirmation(false);
    setPendingAction(() => () => {
      navigate("/frontpage", {
        state: {
          tableNumber: order.tableNumber,
          phoneNumber: order.phoneNumber,
          customerName: order.customerName,
          existingOrder: order,
          cartItems: order.cartItems,
          deliveryAddress: order.deliveryAddress,
          whatsappNumber: order.whatsappNumber,
          email: order.email,
        },
      });
    });
  };

  return (
    <div className="container mt-2">
      {/* Warning/Success/Confirmation Alert */}
      {warningMessage && (
        <div className={`alert alert-${warningType} text-center alert-dismissible fade show`} role="alert">
          {warningMessage}
          {isConfirmation ? (
            <>
              <button
                type="button"
                className="btn btn-success ms-3"
                onClick={handleConfirmYes}
              >
                Yes
              </button>
              <button
                type="button"
                className="btn btn-danger ms-2"
                onClick={handleConfirmNo}
              >
                No
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-primary ms-3"
              onClick={handleWarningOk}
            >
              OK
            </button>
          )}
        </div>
      )}

      <h2 className="text-center">Active Orders</h2>
      {orders.length === 0 ? (
        <p className="text-center text-muted">No active orders yet.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-striped">
            <thead className="thead-dark">
              <tr>
                <th>#</th>
                <th>Customer Name</th>
                <th>Table Number</th>
                <th>Phone Number</th>
                <th>Items</th>
                <th>Timestamp</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{order.customerName || "Unknown"}</td>
                  <td>{order.tableNumber || "N/A"}</td>
                  <td>{order.phoneNumber || "N/A"}</td>
                  <td>
                    {order.cartItems.map((item, i) => (
                      <div key={i}>
                        {item.name} - Qty: {item.quantity}
                        {item.addonQuantities && Object.keys(item.addonQuantities).length > 0 && (
                          <ul style={{ listStyleType: "none", padding: 0, marginTop: "5px", fontSize: "12px", color: "#0066cc" }}>
                            {Object.entries(item.addonQuantities).map(([addonName, qty]) => (
                              qty > 0 && (
                                <li key={addonName}>
                                  + {addonName} x{qty} (${(item.addonCounts[addonName] * qty).toFixed(2)})
                                </li>
                              )
                            ))}
                          </ul>
                        )}
                        {item.selectedCombos && item.selectedCombos.length > 0 && (
                          <ul style={{ listStyleType: "none", padding: 0, marginTop: "5px", fontSize: "12px", color: "#cc6600" }}>
                            {item.selectedCombos.map((combo, idx) => (
                              item.comboQuantities && item.comboQuantities[combo.name1] > 0 && (
                                <li key={idx}>
                                  + {combo.name1} x{item.comboQuantities[combo.name1]} (${(combo.price * item.comboQuantities[combo.name1]).toFixed(2)})
                                </li>
                              )
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </td>
                  <td>{new Date(order.timestamp).toLocaleString()}</td>
                  <td>
                    <button
                      className="btn btn-primary btn-sm me-2"
                      onClick={() => handleSelectOrder(order)}
                    >
                      Select
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteOrder(index)}
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
}

export default SavedOrder;