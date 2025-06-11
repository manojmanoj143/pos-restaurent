import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserContext from '../../Context/UserContext';

function MediterraneanKitchen() {
    const { savedOrders, updateOrderStatus, informBearer, preparedItems } = useContext(UserContext);
    const navigate = useNavigate();
    const [warningMessage, setWarningMessage] = useState(""); // For success messages
    const [warningType, setWarningType] = useState("success"); // "warning" or "success"
    const [pendingAction, setPendingAction] = useState(null); // Store the action to perform after OK

    const mediterraneanKitchenOrders = savedOrders.filter(order =>
        order.cartItems.some(item => item.kitchenType === "Mediterranean Kitchen")
    );

    const groupedOrders = mediterraneanKitchenOrders.reduce((groups, order) => {
        const customer = order.customerName || "Unknown Customer";
        if (!groups[customer]) groups[customer] = [];
        groups[customer].push(order);
        return groups;
    }, {});

    // Handle OK button click for warning messages
    const handleWarningOk = () => {
        if (pendingAction) {
            pendingAction();
            setPendingAction(null);
        }
        setWarningMessage("");
        setWarningType("success");
    };

    const handleStatusChange = (id, newStatus) => {
        updateOrderStatus(id, newStatus);
    };

    const handleInformBearer = () => {
        const preparedOrders = mediterraneanKitchenOrders.map(order => ({
            ...order,
            cartItems: order.cartItems.filter(item => preparedItems.includes(item.id)),
        })).filter(order => order.cartItems.length > 0);

        if (preparedOrders.length === 0) {
            console.warn("No prepared items to inform the bearer about.");
            return;
        }

        preparedOrders.forEach(order => {
            order.cartItems.forEach(item => informBearer(item));
        });

        setWarningMessage("Items have been marked as Prepared. The bearer has been informed!");
        setWarningType("success");
        setPendingAction(() => () => {
            navigate("/bearer", { state: { preparedOrders } });
        });
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

            <h3 className="text-center">Mediterranean Kitchen Orders</h3>
            {Object.keys(groupedOrders).length === 0 ? (
                <p>No orders for Mediterranean Kitchen.</p>
            ) : (
                <div className="table-responsive">
                    <table className="table table-bordered">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Table</th>
                                <th>Item</th>
                                <th>Image</th>
                                <th>Quantity</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(groupedOrders).map(([customer, orders]) =>
                                orders.map((order, orderIndex) =>
                                    order.cartItems
                                        .filter(item => item.kitchenType === "Mediterranean Kitchen")
                                        .map((item, itemIndex) => (
                                            <tr key={`${orderIndex}-${itemIndex}`}>
                                                {itemIndex === 0 && (
                                                    <>
                                                        <td rowSpan={order.cartItems.length}>{customer}</td>
                                                        <td rowSpan={order.cartItems.length}>{order.tableNumber}</td>
                                                    </>
                                                )}
                                                <td>{item.name}</td>
                                                <td>
                                                    <img 
                                                        src={item.image} 
                                                        className="rounded" 
                                                        style={{ width: "70px", height: "50px", objectFit: "cover", border: "1px solid #ddd" }} 
                                                    />
                                                </td>
                                                <td>{item.quantity}</td>
                                                <td>
                                                    <select
                                                        value={item.status || "Pending"}
                                                        onChange={(e) => handleStatusChange(item.id, e.target.value)}
                                                        className="form-select"
                                                    >
                                                        <option value="Pending">Pending</option>
                                                        <option value="Preparing">Preparing</option>
                                                        <option value="Prepared">Prepared</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            {preparedItems.length > 0 && (
                <div className="text-center mt-4">
                    <button className="btn btn-primary" onClick={handleInformBearer}>
                        Inform Bearer
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

export default MediterraneanKitchen;