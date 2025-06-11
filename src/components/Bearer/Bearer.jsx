import React, { useState, useEffect, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import UserContext from "../../Context/UserContext";

function Bearer() {
    const navigate = useNavigate();
    const location = useLocation();
    const { customerTableData = [], preparedOrders = [] } = location.state || {};
    const { markItemAsPickedUp } = useContext(UserContext);

    // Store orders locally
    const [orders, setOrders] = useState(preparedOrders);
    const [warningMessage, setWarningMessage] = useState(""); // For success messages
    const [warningType, setWarningType] = useState("success"); // "warning" or "success"
    const [allPickedUp, setAllPickedUp] = useState(false);

    useEffect(() => {
        // Check if all items are picked up
        const allPicked = orders.every(item => item.isPickedUp);
        setAllPickedUp(allPicked);
    }, [orders]);

    // Handle OK button click for warning messages
    const handleWarningOk = () => {
        setWarningMessage("");
        setWarningType("success");
    };

    const handlePickUp = (id) => {
        setOrders(prevOrders =>
            prevOrders.map(item =>
                item.id === id ? { ...item, isPickedUp: true } : item
            )
        );

        setWarningMessage("Item has been marked as picked up!");
        setWarningType("success");
    };

    return (
        <div className="container mt-4">
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

            <h3 className="text-center">Bearer Page</h3>

            {/* Show customer & table details */}
            {customerTableData.length > 0 && (
                <div className="text-center mb-4">
                    <h5>Orders from:</h5>
                    {customerTableData.map((data, index) => (
                        <p key={index}>
                            <strong>{data.customerName}</strong> - Table {data.tableNumber}
                        </p>
                    ))}
                </div>
            )}

            {/* Show prepared orders */}
            {orders.length === 0 ? (
                <p className="text-center">No prepared items to display.</p>
            ) : (
                orders.map(item => (
                    <div key={item.id} className="card p-3 mb-3">
                        <h6><strong>Item:</strong> {item.name}</h6>
                        <p><strong>Size:</strong> {item.selectedSize}</p>
                        <p><strong>Customer:</strong> {item.customerName}</p>
                        <p><strong>Table Number:</strong> {item.tableNumber}</p>

                        <button
                            className="btn btn-success mt-2"
                            onClick={() => handlePickUp(item.id)}
                            disabled={item.isPickedUp}
                        >
                            {item.isPickedUp ? "Picked Up ✅" : "Mark as Picked Up"}
                        </button>
                    </div>
                ))
            )}

            {allPickedUp && (
                <div className="text-center mt-4">
                    <button className="btn btn-primary" onClick={() => navigate("/frontpage")}>
                        Home
                    </button>
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

export default Bearer;