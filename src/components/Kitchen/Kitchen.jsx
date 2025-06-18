import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", color: "red", textAlign: "center" }}>
          <h3>Something went wrong.</h3>
          <p>{this.state.error?.message || "Unknown error"}</p>
          <button
            style={{
              padding: "6px 12px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Kitchen() {
  const navigate = useNavigate();
  const [savedOrders, setSavedOrders] = useState([]);
  const [selectedKitchen, setSelectedKitchen] = useState(null);
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [showAllStatusPopup, setShowAllStatusPopup] = useState(false);
  const [pickedUpItems, setPickedUpItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastHourSearchDate, setLastHourSearchDate] = useState("");
  const [allStatusSearchDate, setAllStatusSearchDate] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [itemDetailsCache, setItemDetailsCache] = useState({});

  const BASE_URL = "http://127.0.0.1:5000";
  const currentYear = new Date().getFullYear().toString();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${BASE_URL}/api/activeorders`);
        if (Array.isArray(response.data)) {
          const ordersWithStatuses = response.data.map((order) => ({
            ...order,
            cartItems: Array.isArray(order.cartItems)
              ? order.cartItems.map((item) => ({
                  ...item,
                  kitchenStatuses: item.kitchenStatuses || {},
                }))
              : [],
          }));
          setSavedOrders(ordersWithStatuses);
        } else {
          setSavedOrders([]);
          setErrorMessage("Invalid response from server");
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        setSavedOrders([]);
        setErrorMessage("Failed to fetch orders: " + error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPickedUpItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/picked-up-items`);
      if (response.data.success && Array.isArray(response.data.pickedUpItems)) {
        setPickedUpItems(response.data.pickedUpItems);
      } else {
        setPickedUpItems([]);
        setErrorMessage("Invalid picked-up items response");
      }
    } catch (error) {
      console.error("Error fetching picked-up items:", error);
      setPickedUpItems([]);
      setErrorMessage("Failed to fetch picked-up items: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPickedUpItems();
  }, []);

  useEffect(() => {
    const fetchItemDetails = async () => {
      const itemsToFetch = savedOrders
        .filter((order) => Array.isArray(order.cartItems))
        .flatMap((order) => order.cartItems)
        .filter((item) => !itemDetailsCache[item.name]);

      for (const item of itemsToFetch) {
        try {
          const itemName = encodeURIComponent(item.name);
          const response = await axios.get(`${BASE_URL}/api/items/${itemName}`);
          if (response.data.success) {
            const fetchedData = {
              image: response.data.image || item.image || "/static/uploads/placeholder.png",
              addons: Array.isArray(response.data.addons)
                ? response.data.addons.map((addon) => ({
                    name: addon.name || "Unknown",
                    addon_image: addon.addon_image || "/static/uploads/placeholder.png",
                    kitchen: addon.kitchen || "Unknown",
                  }))
                : [],
              combos: Array.isArray(response.data.combos)
                ? response.data.combos.map((combo) => ({
                    name: combo.name || "Unknown",
                    combo_image: combo.combo_image || "/static/uploads/placeholder.png",
                    kitchen: combo.kitchen || "Unknown",
                    size: combo.size || "M",
                    spicy: combo.spicy || false,
                  }))
                : [],
            };
            setItemDetailsCache((prev) => ({
              ...prev,
              [item.name]: fetchedData,
            }));
          }
        } catch (error) {
          console.error(`Error fetching details for item ${item.name}:`, error);
          setItemDetailsCache((prev) => ({
            ...prev,
            [item.name]: {
              image: item.image || "/static/uploads/placeholder.png",
              addons: [],
              combos: [],
            },
          }));
        }
      }
    };

    if (savedOrders.length > 0) {
      fetchItemDetails();
    }
  }, [savedOrders]);

  const kitchens = [
    ...new Set(
      savedOrders
        .filter((order) => Array.isArray(order.cartItems))
        .flatMap((order) =>
          order.cartItems.reduce((acc, item) => {
            if (item.kitchen) acc.push(item.kitchen);
            if (item.addonVariants) {
              Object.values(item.addonVariants).forEach((addon) => {
                if (addon.kitchen) acc.push(addon.kitchen);
              });
            }
            if (item.comboVariants) {
              Object.values(item.comboVariants).forEach((combo) => {
                if (combo.kitchen) acc.push(combo.kitchen);
              });
            }
            return acc;
          }, [])
        )
        .filter((kitchen) => kitchen && typeof kitchen === "string")
    ),
  ];

  useEffect(() => {
    if (kitchens.length > 0 && (!selectedKitchen || !kitchens.includes(selectedKitchen))) {
      setSelectedKitchen(kitchens[0]);
    } else if (kitchens.length === 0) {
      setSelectedKitchen(null);
    }
  }, [kitchens, selectedKitchen]);

  const filteredOrders = savedOrders
    .map((order) => {
      const relevantItems = Array.isArray(order.cartItems)
        ? order.cartItems
            .map((item) => {
              const filteredAddons = {};
              const filteredAddonVariants = {};
              if (item.addonQuantities && item.addonVariants) {
                Object.entries(item.addonQuantities).forEach(([addonName, qty]) => {
                  if (
                    qty > 0 &&
                    item.addonVariants[addonName]?.kitchen === selectedKitchen
                  ) {
                    filteredAddons[addonName] = qty;
                    filteredAddonVariants[addonName] = item.addonVariants[addonName];
                  }
                });
              }
              const filteredCombos = {};
              const filteredComboVariants = {};
              if (item.comboQuantities && item.comboVariants) {
                Object.entries(item.comboQuantities).forEach(([comboName, qty]) => {
                  if (
                    qty > 0 &&
                    item.comboVariants[comboName]?.kitchen === selectedKitchen
                  ) {
                    filteredCombos[comboName] = qty;
                    filteredComboVariants[comboName] = item.comboVariants[comboName];
                  }
                });
              }
              return {
                ...item,
                addonQuantities: filteredAddons,
                addonVariants: filteredAddonVariants,
                comboQuantities: filteredCombos,
                comboVariants: filteredComboVariants,
                displayInKitchen:
                  item.kitchen === selectedKitchen ||
                  Object.keys(filteredAddons).length > 0 ||
                  Object.keys(filteredCombos).length > 0,
              };
            })
            .filter((item) => item.displayInKitchen)
        : [];
      return {
        ...order,
        cartItems: relevantItems,
      };
    })
    .filter((order) => order.cartItems.length > 0);

  const getLastHourItems = () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let filteredItems = (pickedUpItems || []).filter((entry) => {
      const pickupTime = new Date(entry.pickupTime);
      return pickupTime >= oneHourAgo;
    });

    if (lastHourSearchDate) {
      const fullSearchDate = `${currentYear}-${lastHourSearchDate}`;
      const matchingItems = filteredItems.filter((entry) =>
        entry.pickupTime.startsWith(fullSearchDate)
      );
      const nonMatchingItems = filteredItems.filter(
        (entry) => !entry.pickupTime.startsWith(fullSearchDate)
      );
      return [
        ...matchingItems.sort((a, b) => new Date(b.pickupTime) - new Date(a.pickupTime)),
        ...nonMatchingItems.sort((a, b) => new Date(b.pickupTime) - new Date(a.pickupTime)),
      ];
    }
    return filteredItems.sort((a, b) => new Date(b.pickupTime) - new Date(a.pickupTime));
  };

  const getAllPickedUpItems = () => {
    let sortedItems = (pickedUpItems || []).slice();
    if (allStatusSearchDate) {
      const fullSearchDate = `${currentYear}-${allStatusSearchDate}`;
      const matchingItems = sortedItems.filter((entry) =>
        entry.pickupTime.startsWith(fullSearchDate)
      );
      const nonMatchingItems = sortedItems.filter(
        (entry) => !entry.pickupTime.startsWith(fullSearchDate)
      );
      return [
        ...matchingItems.sort((a, b) => new Date(b.pickupTime) - new Date(a.pickupTime)),
        ...nonMatchingItems.sort((a, b) => new Date(b.pickupTime) - new Date(a.pickupTime)),
      ];
    }
    return sortedItems.sort((a, b) => new Date(b.pickupTime) - new Date(a.pickupTime));
  };

  const handleMarkPrepared = async (orderId, itemId, kitchen) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/api/activeorders/${orderId}/items/${itemId}/mark-prepared`,
        { kitchen },
        { headers: { "Content-Type": "application/json" } }
      );
      if (response.data.success) {
        setSavedOrders((prev) =>
          prev.map((order) =>
            order.orderId === orderId
              ? {
                  ...order,
                  cartItems: order.cartItems.map((item) =>
                    item.id === itemId
                      ? {
                          ...item,
                          kitchenStatuses: {
                            ...item.kitchenStatuses,
                            [kitchen]: response.data.status,
                          },
                        }
                      : item
                  ),
                }
              : order
          )
        );
      }
    } catch (error) {
      console.error("Error marking as prepared:", error);
      setErrorMessage("Failed to mark as prepared: " + error.message);
    }
  };

  const handlePickUp = async (orderId, itemId) => {
    try {
      setLoading(true);
      const order = savedOrders.find((o) => o.orderId === orderId);
      const pickedItem = order?.cartItems.find((item) => item.id === itemId);
      if (pickedItem && pickedItem.kitchenStatuses?.[selectedKitchen] === "Prepared") {
        const response = await axios.post(
          `${BASE_URL}/api/activeorders/${orderId}/items/${itemId}/mark-pickedup`,
          { kitchen: selectedKitchen },
          { headers: { "Content-Type": "application/json" } }
        );
        if (response.data.success) {
          setSavedOrders((prev) =>
            prev.map((order) =>
              order.orderId === orderId
                ? {
                    ...order,
                    cartItems: order.cartItems.map((item) =>
                      item.id === itemId
                        ? {
                            ...item,
                            kitchenStatuses: {
                              ...item.kitchenStatuses,
                              [selectedKitchen]: "PickedUp",
                            },
                          }
                        : item
                    ),
                  }
                : order
            )
          );
          await fetchPickedUpItems();
        }
      }
    } catch (error) {
      console.error("Error marking as picked up:", error);
      setErrorMessage("Failed to mark item as picked up: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPickUp = async () => {
    try {
      setLoading(true);
      for (const orderId of selectedCustomers) {
        const order = savedOrders.find((o) => o.orderId === orderId);
        if (!order) continue;

        const itemsToPickUp = order.cartItems.filter(
          (item) =>
            item.kitchen === selectedKitchen ||
            Object.values(item.addonVariants || {}).some(
              (addon) => addon.kitchen === selectedKitchen && item.addonQuantities?.[addon.name]
            ) ||
            Object.values(item.comboVariants || {}).some(
              (combo) => combo.kitchen === selectedKitchen && item.comboQuantities?.[combo.name]
            )
        );

        for (const item of itemsToPickUp) {
          if (item.kitchenStatuses?.[selectedKitchen] === "Prepared") {
            await handlePickUp(orderId, item.id);
          }
        }
      }
      setSelectedCustomers([]);
    } catch (error) {
      console.error("Error during bulk pickup:", error);
      setErrorMessage("Failed to mark items as picked up: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerCheckboxChange = (orderId) => {
    setSelectedCustomers((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const getRowStyle = (status) => {
    switch (status || "Pending") {
      case "Pending":
        return { backgroundColor: "#ffcccc", color: "#333" };
      case "Preparing":
        return { backgroundColor: "#fff3cd", color: "#333" };
      case "Prepared":
        return { backgroundColor: "#d4edda", color: "#333" };
      case "PickedUp":
        return { backgroundColor: "#add8e6", color: "#333" };
      default:
        return {};
    }
  };

  const getHighlightStyle = (pickupTime, searchDate) => {
    if (searchDate) {
      const fullSearchDate = `${currentYear}-${searchDate}`;
      if (pickupTime?.startsWith(fullSearchDate)) {
        return { backgroundColor: "#87CEEB" };
      }
    }
    return {};
  };

  const handleBack = () => navigate(-1);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return `${BASE_URL}/static/uploads/placeholder.png`;
    const normalizedPath = imagePath.replace(/^\/+/, "");
    if (normalizedPath.startsWith("static/uploads/")) {
      return `${BASE_URL}/${normalizedPath}`;
    }
    return `${BASE_URL}/static/uploads/${normalizedPath}`;
  };

  const getAddonComboImages = (item) => {
    const images = [];
    const itemDetails = itemDetailsCache[item.name] || {
      image: item.image || "/static/uploads/placeholder.png",
      addons: [],
      combos: [],
    };

    if (item.kitchen === selectedKitchen) {
      images.push({
        src: getImageUrl(item.image || itemDetails.image),
        label: item.name || "Item",
        type: "item",
      });
    }

    Object.entries(item.addonQuantities || {})
      .filter(
        ([addonName, qty]) =>
          qty > 0 && item.addonVariants?.[addonName]?.kitchen === selectedKitchen
      )
      .forEach(([addonName]) => {
        const addon = itemDetails.addons.find((a) => a.name === addonName) || {};
        const addonImage =
          item.addonImages?.[addonName] ||
          addon.addon_image ||
          "/static/uploads/placeholder.png";
        images.push({
          src: getImageUrl(addonImage),
          label: addonName || "Addon",
          type: "addon",
        });
      });

    Object.entries(item.comboQuantities || {})
      .filter(
        ([comboName, qty]) =>
          qty > 0 && item.comboVariants?.[comboName]?.kitchen === selectedKitchen
      )
      .forEach(([comboName]) => {
        const combo = itemDetails.combos.find((c) => c.name === comboName) || {};
        const comboImage =
          item.comboImages?.[comboName] ||
          combo.combo_image ||
          "/static/uploads/placeholder.png";
        images.push({
          src: getImageUrl(comboImage),
          label: comboName || "Combo",
          type: "combo",
        });
      });

    return images;
  };

  return (
    <ErrorBoundary>
      <div style={{ marginTop: "24px", padding: "0 15px", position: "relative" }}>
        {loading && <div style={{ textAlign: "center", fontSize: "18px" }}>Loading...</div>}
        {errorMessage && (
          <div
            style={{
              backgroundColor: "#f8d7da",
              color: "#721c24",
              padding: "10px",
              marginBottom: "16px",
              borderRadius: "4px",
              textAlign: "center",
            }}
          >
            {errorMessage}
            <button
              style={{
                marginLeft: "10px",
                padding: "4px 8px",
                backgroundColor: "#721c24",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              onClick={() => setErrorMessage("")}
            >
              Dismiss
            </button>
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <button
            style={{
              padding: "6px 12px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            onClick={handleBack}
          >
            Back
          </button>
          <h3 style={{ textAlign: "center", flex: "1", margin: "0" }}>Kitchen Services</h3>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              style={{
                padding: "6px 12px",
                backgroundColor: "#17a2b8",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              onClick={() => setShowStatusPopup(true)}
            >
              Status (Last 1 Hour)
            </button>
            <button
              style={{
                padding: "6px 12px",
                backgroundColor: "#ffc107",
                color: "black",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              onClick={() => setShowAllStatusPopup(true)}
            >
              All Status
            </button>
          </div>
        </div>

        <div style={{ display: "flex", marginBottom: "16px", gap: "12px" }}>
          {kitchens.length > 0 ? (
            kitchens.map((kitchen) => (
              <button
                key={kitchen}
                style={{
                  padding: "4px 8px",
                  backgroundColor: selectedKitchen === kitchen ? "#007bff" : "transparent",
                  color: selectedKitchen === kitchen ? "white" : "#007bff",
                  border: "1px solid #007bff",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
                onClick={() => setSelectedKitchen(kitchen)}
              >
                {kitchen}
              </button>
            ))
          ) : (
            <p style={{ fontSize: "16px" }}>No active kitchens</p>
          )}
        </div>

        <h5 style={{ marginBottom: "16px" }}>
          Current Orders - {selectedKitchen || "Select a Kitchen"}
        </h5>
        {filteredOrders.length === 0 ? (
          <p style={{ fontSize: "16px" }}>
            {selectedKitchen ? "No orders for this kitchen." : "Please select a kitchen."}
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div style={{ marginBottom: "16px", textAlign: "right" }}>
              <button
                style={{
                  padding: "6px 12px",
                  backgroundColor: selectedCustomers.length > 0 ? "#28a745" : "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: selectedCustomers.length > 0 ? "pointer" : "not-allowed",
                }}
                onClick={handleBulkPickUp}
                disabled={selectedCustomers.length === 0}
              >
                Mark Selected as Picked Up
              </button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Customer</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Order No</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Order Type</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Table</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Item & Addons</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Combos</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Images</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Quantity</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Category</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Status</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, orderIndex) =>
                  order.cartItems.map((item, itemIndex) => (
                    <tr
                      key={`${order.orderId}-${item.id}`}
                      style={getRowStyle(item.kitchenStatuses?.[selectedKitchen])}
                    >
                      {itemIndex === 0 && (
                        <>
                          <td
                            rowSpan={order.cartItems.length}
                            style={{ border: "1px solid #ddd", padding: "8px" }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedCustomers.includes(order.orderId)}
                              onChange={() => handleCustomerCheckboxChange(order.orderId)}
                              style={{ marginRight: "8px" }}
                            />
                            {order.customerName || "Unknown"}
                          </td>
                          <td
                            rowSpan={order.cartItems.length}
                            style={{ border: "1px solid #ddd", padding: "8px" }}
                          >
                            {order.orderNo || "N/A"}
                          </td>
                          <td
                            rowSpan={order.cartItems.length}
                            style={{ border: "1px solid #ddd", padding: "8px" }}
                          >
                            {order.orderType || "N/A"}
                          </td>
                          <td
                            rowSpan={order.cartItems.length}
                            style={{ border: "1px solid #ddd", padding: "8px" }}
                          >
                            {order.orderType === "Dine In" ? order.tableNumber || "N/A" : "-"}
                          </td>
                        </>
                      )}
                      <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                        {item.kitchen === selectedKitchen && (
                          <span style={{ color: "black" }}>{item.name}</span>
                        )}
                        {item.addonQuantities && Object.keys(item.addonQuantities).length > 0 && (
                          <ul
                            style={{
                              listStyleType: "none",
                              padding: 0,
                              marginTop: "5px",
                              fontSize: "12px",
                              color: "black",
                            }}
                          >
                            {Object.entries(item.addonQuantities)
                              .filter(
                                ([addonName, qty]) =>
                                  qty > 0 &&
                                  item.addonVariants?.[addonName]?.kitchen === selectedKitchen
                              )
                              .map(([addonName, qty]) => (
                                <li key={addonName}>+ Addon: {addonName} x{qty}</li>
                              ))}
                          </ul>
                        )}
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                        {item.comboQuantities && Object.keys(item.comboQuantities).length > 0 && (
                          <ul
                            style={{
                              listStyleType: "none",
                              padding: 0,
                              marginTop: "5px",
                              fontSize: "12px",
                              color: "black",
                            }}
                          >
                            {Object.entries(item.comboQuantities)
                              .filter(
                                ([comboName, qty]) =>
                                  qty > 0 &&
                                  item.comboVariants?.[comboName]?.kitchen === selectedKitchen
                              )
                              .map(([comboName, qty]) => (
                                <li key={comboName}>
                                  + Combo: {comboName} ({item.comboVariants?.[comboName]?.size || "M"}) x{qty}
                                  {item.comboVariants?.[comboName]?.spicy && " (Spicy)"}
                                </li>
                              ))}
                          </ul>
                        )}
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                          {getAddonComboImages(item).map((image, idx) => (
                            <div key={idx} style={{ position: "relative" }}>
                              <img
                                src={image.src}
                                style={{
                                  width: image.type === "item" ? "70px" : "50px",
                                  height: "50px",
                                  objectFit: "cover",
                                  border: "1px solid #ddd",
                                  borderRadius: "4px",
                                }}
                                alt={image.label}
                                onError={(e) =>
                                  (e.target.src = `${BASE_URL}/static/uploads/placeholder.png`)
                                }
                              />
                              <span
                                style={{
                                  position: "absolute",
                                  top: "-10px",
                                  left: "0",
                                  backgroundColor: "rgba(0,0,0,0.7)",
                                  color: "white",
                                  fontSize: "10px",
                                  padding: "2px 4px",
                                  borderRadius: "2px",
                                }}
                              >
                                {image.type}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: "8px" }}>{item.quantity}</td>
                      <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                        {item.category || "N/A"}
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                        {item.kitchenStatuses?.[selectedKitchen] || "Pending"}
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                        {item.displayInKitchen &&
                          item.kitchenStatuses?.[selectedKitchen] !== "Prepared" &&
                          item.kitchenStatuses?.[selectedKitchen] !== "PickedUp" && (
                            <button
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "#007bff",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                              onClick={() => handleMarkPrepared(order.orderId, item.id, selectedKitchen)}
                            >
                              Mark as Prepared
                            </button>
                          )}
                        {item.kitchenStatuses?.[selectedKitchen] === "Prepared" && (
                          <button
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#28a745",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              marginLeft: "8px",
                            }}
                            onClick={() => handlePickUp(order.orderId, item.id)}
                          >
                            Mark as Picked Up
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {showStatusPopup && (
          <div
            style={{
              display: "block",
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0,0,0,0.5)",
              zIndex: 1050,
            }}
          >
            <div
              style={{
                maxWidth: "800px",
                width: "90%",
                margin: "50px auto",
                backgroundColor: "white",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px",
                  borderBottom: "1px solid #dee2e6",
                }}
              >
                <h5 style={{ margin: 0, fontSize: "20px" }}>Picked Up Items (Last 1 Hour)</h5>
                <button
                  style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}
                  onClick={() => setShowStatusPopup(false)}
                >
                  ×
                </button>
              </div>
              <div style={{ padding: "16px" }}>
                <input
                  type="text"
                  placeholder="Search by month-day (e.g., 06-09)"
                  value={lastHourSearchDate}
                  onChange={(e) => setLastHourSearchDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    marginBottom: "10px",
                    borderRadius: "4px",
                    border: "1px solid #ced4da",
                  }}
                />
                {getLastHourItems().length === 0 ? (
                  <p style={{ fontSize: "16px" }}>No items picked up in the last hour.</p>
                ) : (
                  <div
                    style={{
                      overflowX: "auto",
                      maxHeight: "60vh",
                      overflowY: "auto",
                    }}
                  >
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Customer</th>
                          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Order Type</th>
                          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Table</th>
                          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Item</th>
                          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Quantity</th>
                          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Category</th>
                          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Kitchen</th>
                          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Pickup Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getLastHourItems().map((entry, entryIndex) =>
                          (entry.items || [entry]).map((item, itemIndex) => (
                            <tr
                              key={`${entryIndex}-${itemIndex}`}
                              style={getHighlightStyle(entry.pickupTime, lastHourSearchDate)}
                            >
                              {itemIndex === 0 && (
                                <>
                                  <td
                                    rowSpan={(entry.items || [entry]).length}
                                    style={{ border: "1px solid #ddd", padding: "8px" }}
                                  >
                                    {entry.customerName || "Unknown"}
                                  </td>
                                  <td
                                    rowSpan={(entry.items || [entry]).length}
                                    style={{ border: "1px solid #ddd", padding: "8px" }}
                                  >
                                    {entry.orderType || "N/A"}
                                  </td>
                                  <td
                                    rowSpan={(entry.items || [entry]).length}
                                    style={{ border: "1px solid #ddd", padding: "8px" }}
                                  >
                                    {entry.orderType === "Dine In" ? entry.tableNumber || "N/A" : "-"}
                                  </td>
                                </>
                              )}
                              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                                <span style={{ color: "black" }}>{item.itemName || "N/A"}</span>
                                {item.addonCounts && item.addonCounts.length > 0 && (
                                  <ul
                                    style={{
                                      listStyleType: "none",
                                      padding: 0,
                                      marginTop: "5px",
                                      fontSize: "12px",
                                      color: "black",
                                    }}
                                  >
                                    {item.addonCounts.map((addon, idx) => (
                                      <li key={idx}>+ Addon: {addon.name} x{addon.quantity}</li>
                                    ))}
                                  </ul>
                                )}
                                {item.selectedCombos && item.selectedCombos.length > 0 && (
                                  <ul
                                    style={{
                                      listStyleType: "none",
                                      padding: 0,
                                      marginTop: "5px",
                                      fontSize: "12px",
                                      color: "black",
                                    }}
                                  >
                                    {item.selectedCombos.map((combo, idx) => (
                                      <li key={idx}>
                                        + Combo: {combo.name} ({combo.size}) x{combo.quantity || 1}
                                        {combo.isSpicy && " (Spicy)"}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </td>
                              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                                {item.quantity || "N/A"}
                              </td>
                              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                                {item.category || "N/A"}
                              </td>
                              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                                {item.kitchen || "N/A"}
                              </td>
                              {itemIndex === 0 && (
                                <td
                                  rowSpan={(entry.items || [entry]).length}
                                  style={{ border: "1px solid #ddd", padding: "8px" }}
                                >
                                  {entry.pickupTime || "N/A"}
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div style={{ padding: "16px", borderTop: "1px solid #dee2e6", textAlign: "right" }}>
                <button
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                  onClick={() => setShowStatusPopup(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showAllStatusPopup && (
          <div
            style={{
              display: "block",
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0,0,0,0.5)",
              zIndex: 1050,
            }}
          >
            <div
              style={{
                maxWidth: "800px",
                width: "90%",
                margin: "50px auto",
                backgroundColor: "white",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px",
                  borderBottom: "1px solid #dee2e6",
                }}
              >
                <h5 style={{ margin: 0, fontSize: "20px" }}>All Picked Up Items</h5>
                <button
                  style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}
                  onClick={() => setShowAllStatusPopup(false)}
                >
                  ×
                </button>
              </div>
              <div style={{ padding: "16px" }}>
                <input
                  type="text"
                  placeholder="Search by month-day (e.g., 06-09)"
                  value={allStatusSearchDate}
                  onChange={(e) => setAllStatusSearchDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    marginBottom: "10px",
                    borderRadius: "4px",
                    border: "1px solid #ced4da",
                  }}
                />
                {getAllPickedUpItems().length === 0 ? (
                  <p style={{ fontSize: "16px" }}>No items have been picked up yet.</p>
                ) : (
                  <div
                    style={{
                      overflowX: "auto",
                      maxHeight: "60vh",
                      overflowY: "auto",
                    }}
                  >
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Customer</th>
                          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Order Type</th>
                          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Table</th>
                          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Item</th>
                          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Quantity</th>
                          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Category</th>
                          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Kitchen</th>
                          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Pickup Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getAllPickedUpItems().map((entry, entryIndex) =>
                          (entry.items || [entry]).map((item, itemIndex) => (
                            <tr
                              key={`${entryIndex}-${itemIndex}`}
                              style={getHighlightStyle(entry.pickupTime, allStatusSearchDate)}
                            >
                              {itemIndex === 0 && (
                                <>
                                  <td
                                    rowSpan={(entry.items || [entry]).length}
                                    style={{ border: "1px solid #ddd", padding: "8px" }}
                                  >
                                    {entry.customerName || "Unknown"}
                                  </td>
                                  <td
                                    rowSpan={(entry.items || [entry]).length}
                                    style={{ border: "1px solid #ddd", padding: "8px" }}
                                  >
                                    {entry.orderType || "N/A"}
                                  </td>
                                  <td
                                    rowSpan={(entry.items || [entry]).length}
                                    style={{ border: "1px solid #ddd", padding: "8px" }}
                                  >
                                    {entry.orderType === "Dine In" ? entry.tableNumber || "N/A" : "-"}
                                  </td>
                                </>
                              )}
                              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                                <span style={{ color: "black" }}>{item.itemName || "N/A"}</span>
                                {item.addonCounts && item.addonCounts.length > 0 && (
                                  <ul
                                    style={{
                                      listStyleType: "none",
                                      padding: 0,
                                      marginTop: "5px",
                                      fontSize: "12px",
                                      color: "black",
                                    }}
                                  >
                                    {item.addonCounts.map((addon, idx) => (
                                      <li key={idx}>+ Addon: {addon.name} x{addon.quantity}</li>
                                    ))}
                                  </ul>
                                )}
                                {item.selectedCombos && item.selectedCombos.length > 0 && (
                                  <ul
                                    style={{
                                      listStyleType: "none",
                                      padding: 0,
                                      marginTop: "5px",
                                      fontSize: "12px",
                                      color: "black",
                                    }}
                                  >
                                    {item.selectedCombos.map((combo, idx) => (
                                      <li key={idx}>
                                        + Combo: {combo.name} ({combo.size}) x{combo.quantity || 1}
                                        {combo.isSpicy && " (Spicy)"}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </td>
                              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                                {item.quantity || "N/A"}
                              </td>
                              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                                {item.category || "N/A"}
                              </td>
                              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                                {item.kitchen || "N/A"}
                              </td>
                              {itemIndex === 0 && (
                                <td
                                  rowSpan={(entry.items || [entry]).length}
                                  style={{ border: "1px solid #ddd", padding: "8px" }}
                                >
                                  {entry.pickupTime || "N/A"}
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div style={{ padding: "16px", borderTop: "1px solid #dee2e6", textAlign: "right" }}>
                <button
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                  onClick={() => setShowAllStatusPopup(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default Kitchen;