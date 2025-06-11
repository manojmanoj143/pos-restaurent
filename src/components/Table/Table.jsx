import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./table.css";
import UserContext from "../../Context/UserContext";
import { v4 as uuidv4 } from "uuid";

// Error Boundary Component
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught in ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center mt-5 text-danger">
          <h2>Something went wrong.</h2>
          <p>{this.state.error?.message || "Unknown error occurred."}</p>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Table() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warningMessage, setWarningMessage] = useState("");
  const { setCartItems } = useContext(UserContext);
  const navigate = useNavigate();
  const vatRate = 0.10; // Consistent with FrontPage.jsx

  const [bookedTables, setBookedTables] = useState(() => {
    const saved = localStorage.getItem("bookedTables");
    return saved ? JSON.parse(saved) : [];
  });
  const [bookedChairs, setBookedChairs] = useState(() => {
    const saved = localStorage.getItem("bookedChairs");
    return saved ? JSON.parse(saved) : {};
  });
  const [reservations, setReservations] = useState(() => {
    const saved = localStorage.getItem("reservations");
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      const validReservations = parsed.filter((res) => {
        const isValid =
          res &&
          res.tableNumber &&
          res.customerName &&
          res.phoneNumber &&
          res.email &&
          res.date &&
          res.startTime &&
          res.endTime &&
          Array.isArray(res.chairs) &&
          typeof res.startTime === "string" &&
          typeof res.endTime === "string" &&
          res.startTime.match(/^\d{2}:\d{2}$/) &&
          res.endTime.match(/^\d{2}:\d{2}$/);
        if (!isValid) {
          console.warn("Invalid reservation filtered out:", res);
        }
        return isValid;
      });
      return validReservations;
    } catch (e) {
      console.error("Error parsing reservations from localStorage:", e);
      return [];
    }
  });
  const [verifiedReservations, setVerifiedReservations] = useState(() => {
    const saved = localStorage.getItem("verifiedReservations");
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedChairs, setSelectedChairs] = useState({});

  // Verification states
  const [showVerifyPopup, setShowVerifyPopup] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [verifyPhoneNumber, setVerifyPhoneNumber] = useState("");

  useEffect(() => {
    const savedOrders = JSON.parse(localStorage.getItem("savedOrders")) || [];
    const orderTableNumbers = [
      ...new Set(savedOrders.map((order) => order.tableNumber).filter(Boolean)),
    ];
    const currentBookedTables =
      JSON.parse(localStorage.getItem("bookedTables")) || [];

    const updatedBookedTables = currentBookedTables.filter((tableNum) =>
      orderTableNumbers.includes(tableNum)
    );
    setBookedTables(updatedBookedTables);
    localStorage.setItem("bookedTables", JSON.stringify(updatedBookedTables));

    const updatedBookedChairs = {};
    savedOrders.forEach((order) => {
      const tableNum = order.tableNumber;
      const chairs = Array.isArray(order.chairsBooked) ? order.chairsBooked : [];
      if (tableNum) {
        if (!updatedBookedChairs[tableNum]) {
          updatedBookedChairs[tableNum] = [];
        }
        updatedBookedChairs[tableNum] = [
          ...new Set([...(updatedBookedChairs[tableNum] || []), ...chairs]),
        ];
      }
    });
    setBookedChairs(updatedBookedChairs);
    localStorage.setItem("bookedChairs", JSON.stringify(updatedBookedChairs));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const fetchTables = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/tables", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        const sortedTables = (data.message || []).sort(
          (a, b) => parseInt(a.table_number) - parseInt(b.table_number)
        );
        setTables(sortedTables);
        setLoading(false);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
          setLoading(false);
        }
      }
    };
    fetchTables();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentDate = now.toISOString().split("T")[0];
      const currentTime = now.getHours() * 60 + now.getMinutes();

      const activeReservations = reservations.filter((res) => {
        if (!res.startTime || !res.endTime) {
          console.warn("Skipping invalid reservation in cleanup:", res);
          return false;
        }
        const [startHour, startMinute] = res.startTime.split(":").map(Number);
        const [endHour, endMinute] = res.endTime.split(":").map(Number);
        const startTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;
        return res.date > currentDate || (res.date === currentDate && currentTime <= endTime);
      });

      const activeVerifiedReservations = verifiedReservations.filter((vr) => {
        const res = activeReservations.find((r) => r.id === vr.reservationId);
        return !!res;
      });

      setReservations(activeReservations);
      setVerifiedReservations(activeVerifiedReservations);
      localStorage.setItem("reservations", JSON.stringify(activeReservations));
      localStorage.setItem("verifiedReservations", JSON.stringify(activeVerifiedReservations));
    }, 60000);
    return () => clearInterval(interval);
  }, [reservations, verifiedReservations]);

  const getActiveReservations = (tableNumber, date) => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    return reservations.filter((res) => {
      if (!res.startTime || !res.endTime) {
        console.warn("Invalid reservation data in getActiveReservations:", res);
        return false;
      }
      try {
        const [startHour, startMinute] = res.startTime.split(":").map(Number);
        const [endHour, endMinute] = res.endTime.split(":").map(Number);
        const startTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;
        const preReservationTime = startTime - 60;
        return (
          String(res.tableNumber) === String(tableNumber) &&
          res.date === date &&
          (date > now.toISOString().split("T")[0] ||
            (date === now.toISOString().split("T")[0] &&
              currentTime >= preReservationTime &&
              currentTime <= endTime))
        );
      } catch (e) {
        console.warn("Error processing reservation:", res, e);
        return false;
      }
    });
  };

  const getReservedChairNumbers = (tableNumber, date) => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    let reservedChairs = [];
    reservations.forEach((res) => {
      if (!res.startTime || !res.endTime) {
        console.warn("Skipping invalid reservation in getReservedChairNumbers:", res);
        return;
      }
      try {
        const [startHour, startMinute] = res.startTime.split(":").map(Number);
        const [endHour, endMinute] = res.endTime.split(":").map(Number);
        const startTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;
        const preReservationTime = startTime - 60;
        if (
          String(res.tableNumber) === String(tableNumber) &&
          res.date === date &&
          (date > now.toISOString().split("T")[0] ||
            (date === now.toISOString().split("T")[0] &&
              currentTime >= preReservationTime &&
              currentTime <= endTime))
        ) {
          reservedChairs.push(...(Array.isArray(res.chairs) ? res.chairs : []));
        }
      } catch (e) {
        console.warn("Error processing reservation:", res, e);
      }
    });
    return reservedChairs;
  };

  const getAvailableChairNumbers = (tableNumber, totalChairs, date) => {
    const now = new Date();
    const currentDate = now.toISOString().split("T")[0];
    const bookedChairsNumbers = Array.isArray(bookedChairs[tableNumber]) ? bookedChairs[tableNumber] : [];
    const reservedChairNumbers = getReservedChairNumbers(tableNumber, date);
    const occupiedChairs = [...new Set([...bookedChairsNumbers, ...reservedChairNumbers])];
    const availableChairs = [];
    for (let i = 1; i <= totalChairs; i++) {
      if (!occupiedChairs.includes(i)) {
        availableChairs.push(i);
      }
    }
    return availableChairs;
  };

  const getChairStatus = (table, chairNumber, date) => {
    const tableNumber = parseInt(table.table_number);
    const now = new Date();
    const currentDate = now.toISOString().split("T")[0];
    const booked = date === currentDate && Array.isArray(bookedChairs[tableNumber]) && bookedChairs[tableNumber].includes(chairNumber);
    const reserved = getReservedChairNumbers(tableNumber, date).includes(chairNumber);
    const available = getAvailableChairNumbers(tableNumber, table.number_of_chairs, date).includes(chairNumber);
    if (booked) return "booked";
    if (reserved) return "reserved";
    if (available) return "available";
    return "unknown";
  };

  const getTableColor = (tableNumber) => {
    const type = tableNumber % 3;
    switch (type) {
      case 0:
        return { backgroundColor: "#8B4513" }; // Plastic Table
      case 1:
        return { backgroundColor: "#8B4513" }; // Glass Table
      case 2:
        return { backgroundColor: "#8B4513" }; // Wooden Table
      default:
        return { backgroundColor: "#8B4513" };
    }
  };

  const handleChairClick = (tableNumber, chairNumber, status) => {
    if (status === "reserved") {
      const reservation = reservations.find(
        (res) =>
          String(res.tableNumber) === String(tableNumber) &&
          Array.isArray(res.chairs) &&
          res.chairs.includes(chairNumber) &&
          res.date === new Date().toISOString().split("T")[0]
      );
      if (reservation) handleReservedChairClick(reservation);
    } else if (status === "booked") {
      const savedOrders = JSON.parse(localStorage.getItem("savedOrders")) || [];
      const order = savedOrders.find(
        (order) =>
          String(order.tableNumber) === String(tableNumber) &&
          Array.isArray(order.chairsBooked) &&
          order.chairsBooked.includes(chairNumber)
      );
      if (order) handleViewOrder(tableNumber, order.chairsBooked);
    } else if (status === "available") {
      setSelectedChairs((prev) => {
        const updated = { ...prev };
        if (!updated[tableNumber]) {
          updated[tableNumber] = [];
        }
        if (updated[tableNumber].includes(chairNumber)) {
          updated[tableNumber] = updated[tableNumber].filter((c) => c !== chairNumber);
          if (updated[tableNumber].length === 0) {
            delete updated[tableNumber];
          }
        } else {
          updated[tableNumber] = [...new Set([...updated[tableNumber], chairNumber])];
        }
        return updated;
      });
    }
  };

  const renderChairs = (table, date) => {
    const totalChairs = table.number_of_chairs;
    const chairs = [];
    const radius = 60;
    for (let i = 0; i < totalChairs; i++) {
      const chairNumber = i + 1;
      const angle = (360 / totalChairs) * i;
      const x = radius * Math.cos((angle * Math.PI) / 180);
      const y = radius * Math.sin((angle * Math.PI) / 180);
      const style = {
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        transform: "translate(-50%, -50%)",
      };
      const status = getChairStatus(table, chairNumber, date);
      const isSelected = selectedChairs[table.table_number]?.includes(chairNumber);
      chairs.push(
        <i
          key={i}
          className={`fas fa-chair chair ${status} ${isSelected ? "selected" : ""}`}
          style={style}
          onClick={(e) => {
            e.stopPropagation();
            handleChairClick(table.table_number, chairNumber, status);
          }}
        ></i>
      );
    }
    return chairs;
  };

  const calculateOrderSubtotal = (items) => {
    if (!Array.isArray(items)) {
      console.warn("Invalid cartItems in calculateOrderSubtotal:", items);
      return 0;
    }
    return items.reduce((sum, item) => {
      const mainItemPrice = (Number(item.basePrice) || 0) + (Number(item.icePrice) || 0) + (Number(item.spicyPrice) || 0);
      const customVariantsTotal = item.customVariantsDetails
        ? Object.entries(item.customVariantsDetails).reduce((sum, [variantName, variant]) => {
            const qty = item.customVariantsQuantities?.[variantName] || 1;
            return sum + (Number(variant.price) || 0) * qty;
          }, 0)
        : 0;
      const mainItemTotal = (mainItemPrice + customVariantsTotal) * (Number(item.quantity) || 1);
      const addonsTotal = item.addonQuantities
        ? Object.entries(item.addonQuantities).reduce((sum, [addonName, qty]) => {
            const price = Number(item.addonPrices?.[addonName]) || 0;
            return sum + price * qty;
          }, 0)
        : 0;
      const combosTotal = item.comboQuantities
        ? Object.entries(item.comboQuantities).reduce((sum, [comboName, qty]) => {
            const price = Number(item.comboPrices?.[comboName]) || 0;
            return sum + price * qty;
          }, 0)
        : 0;
      return sum + mainItemTotal + addonsTotal + combosTotal;
    }, 0);
  };

  const handleViewOrder = (tableNumber, chairsBooked) => {
    const savedOrders = JSON.parse(localStorage.getItem("savedOrders")) || [];
    const existingOrder = savedOrders.find(
      (order) =>
        String(order.tableNumber) === String(tableNumber) &&
        Array.isArray(order.chairsBooked) &&
        order.chairsBooked.some((chair) => chairsBooked.includes(chair))
    );

    if (!existingOrder) {
      setWarningMessage("No existing order found for this table and chairs.");
      return;
    }

    const formattedCartItems = existingOrder.cartItems.map((item) => ({
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
      addonSizePrices: item.addonSizePrices || {},
      addonSpicyPrices: item.addonSpicyPrices || {},
      addonImages: item.addonImages || {},
      comboQuantities: item.comboQuantities || {},
      comboVariants: item.comboVariants || {},
      comboPrices: item.comboPrices || {},
      comboSizePrices: item.comboSizePrices || {},
      comboSpicyPrices: item.comboSpicyPrices || {},
      comboImages: item.comboImages || {},
      selectedCombos: item.selectedCombos || [],
      ingredients: item.ingredients || [],
      selectedCustomVariants: item.selectedCustomVariants || {},
      customVariantsDetails: item.customVariantsDetails || {},
      customVariantsQuantities: item.customVariantsQuantities || {},
      image: item.image || "/static/images/default-item.jpg",
    }));

    setCartItems(formattedCartItems);

    navigate(`/frontpage`, {
      state: {
        tableNumber: existingOrder.tableNumber,
        chairsBooked: existingOrder.chairsBooked,
        existingOrder: {
          ...existingOrder,
          cartItems: formattedCartItems,
          orderId: existingOrder.orderId || uuidv4(),
        },
        orderType: "Dine In",
        cartItems: formattedCartItems,
        phoneNumber: existingOrder.phoneNumber || "",
        customerName: existingOrder.customerName || "",
        deliveryAddress: existingOrder.deliveryAddress || { building_name: "", flat_villa_no: "", location: "" },
        whatsappNumber: existingOrder.whatsappNumber || "",
        email: existingOrder.email || "",
      },
    });
  };

  const handleBookTable = (tableNumber, chairsBooked) => {
    const updatedBookedChairs = { ...bookedChairs };
    if (!updatedBookedChairs[tableNumber]) {
      updatedBookedChairs[tableNumber] = [];
    }
    updatedBookedChairs[tableNumber] = [
      ...new Set([...updatedBookedChairs[tableNumber], ...chairsBooked]),
    ];
    setBookedChairs(updatedBookedChairs);
    localStorage.setItem("bookedChairs", JSON.stringify(updatedBookedChairs));

    const updatedBookedTables = [...new Set([...bookedTables, tableNumber])];
    setBookedTables(updatedBookedTables);
    localStorage.setItem("bookedTables", JSON.stringify(updatedBookedTables));

    const savedOrders = JSON.parse(localStorage.getItem("savedOrders")) || [];
    const newOrder = {
      tableNumber,
      chairsBooked: Array.isArray(chairsBooked) ? chairsBooked : [],
      cartItems: [],
      timestamp: new Date().toISOString(),
      orderType: "Dine In",
      customerName: "",
      phoneNumber: "",
      email: "",
      whatsappNumber: "",
      deliveryAddress: { building_name: "", flat_villa_no: "", location: "" },
      orderId: uuidv4(),
    };
    savedOrders.push(newOrder);
    localStorage.setItem("savedOrders", JSON.stringify(savedOrders));

    setCartItems([]);
    setSelectedChairs({});
    navigate(`/frontpage`, {
      state: {
        tableNumber,
        chairsBooked,
        orderType: "Dine In",
        cartItems: [],
      },
    });
  };

  const handleReservedChairClick = (reservation) => {
    const savedOrders = JSON.parse(localStorage.getItem("savedOrders")) || [];
    const reservationOrders = savedOrders.filter(
      (order) =>
        String(order.tableNumber) === String(reservation.tableNumber) &&
        Array.isArray(order.chairsBooked) &&
        order.chairsBooked.some((chair) => reservation.chairs.includes(chair))
    );

    if (reservationOrders.length > 0) {
      handleViewOrder(reservation.tableNumber, reservationOrders[0].chairsBooked);
    } else {
      const isVerified = verifiedReservations.some(
        (vr) => vr.reservationId === reservation.id
      );
      if (isVerified) {
        setCartItems([]);
        navigate(`/frontpage`, {
          state: {
            tableNumber: reservation.tableNumber,
            chairsBooked: Array.isArray(reservation.chairs) ? reservation.chairs : [],
            orderType: "Dine In",
            cartItems: [],
            customerName: reservation.customerName,
            phoneNumber: reservation.phoneNumber,
            email: reservation.email,
          },
        });
      } else {
        setSelectedReservation(reservation);
        setShowVerifyPopup(true);
        setSelectedCustomer("");
        setVerifyPhoneNumber("");
      }
    }
  };

  const handleVerifyCustomer = () => {
    if (!selectedReservation) return;

    if (
      selectedCustomer.trim() === selectedReservation.customerName &&
      verifyPhoneNumber === selectedReservation.phoneNumber
    ) {
      const updatedVerifiedReservations = [
        ...verifiedReservations,
        { reservationId: selectedReservation.id },
      ];
      setVerifiedReservations(updatedVerifiedReservations);
      localStorage.setItem(
        "verifiedReservations",
        JSON.stringify(updatedVerifiedReservations)
      );

      setShowVerifyPopup(false);
      setSelectedReservation(null);

      setCartItems([]);
      navigate(`/frontpage`, {
        state: {
          tableNumber: selectedReservation.tableNumber,
          chairsBooked: Array.isArray(selectedReservation.chairs) ? selectedReservation.chairs : [],
          orderType: "Dine In",
          cartItems: [],
          customerName: selectedReservation.customerName,
          phoneNumber: selectedReservation.phoneNumber,
          email: selectedReservation.email,
        },
      });
    } else {
      setWarningMessage("Verification failed. Please check the customer name and phone number.");
    }
  };

  const handleGoToOrder = () => {
    const tableNumbers = Object.keys(selectedChairs);
    if (tableNumbers.length !== 1) {
      setWarningMessage("Please select chairs from exactly one table.");
      return;
    }
    const tableNumber = tableNumbers[0];
    const chairsBooked = selectedChairs[tableNumber];
    handleBookTable(tableNumber, chairsBooked);
  };

  const totalSelectedChairs = Object.values(selectedChairs).reduce(
    (sum, chairs) => sum + (Array.isArray(chairs) ? chairs.length : 0),
    0
  );

  if (loading) return <div className="text-center mt-5">Loading tables...</div>;
  if (error)
    return <div className="text-center mt-5 text-danger">Error: {error}</div>;

  return (
    <ErrorBoundary>
      <div className="d-flex flex-column min-vh-100 bg-light">
        <header className="p-3 bg-white border-bottom">
          <div className="d-flex justify-content-between align-items-center">
            <i
              className="fas fa-arrow-left back-arrow"
              onClick={() => navigate(-1)}
            ></i>
            {totalSelectedChairs > 0 && (
              <button
                className="btn btn-primary go-to-order-btn"
                onClick={handleGoToOrder}
              >
                Go to Order ({totalSelectedChairs} Chair{totalSelectedChairs > 1 ? "s" : ""})
              </button>
            )}
          </div>
        </header>

        {warningMessage && (
          <div className="alert alert-warning alert-dismissible fade show mx-3 mt-3" role="alert">
            {warningMessage}
            <button
              type="button"
              className="btn-close"
              onClick={() => setWarningMessage("")}
              aria-label="Close"
            ></button>
          </div>
        )}

        <main className="flex-grow-1 py-4" style={{ background: "linear-gradient(135deg, #ffffff 0%, #3498db 100%)" }}>
          <div className="container">
            <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4">
              {tables.map((table) => {
                const tableNumber = table.table_number;
                const totalChairs = table.number_of_chairs || 0;
                const currentDate = new Date().toISOString().split("T")[0];
                const bookedChairNumbers = Array.isArray(bookedChairs[tableNumber]) ? bookedChairs[tableNumber] : [];
                const reservedChairNumbers = getReservedChairNumbers(tableNumber, currentDate);
                const availableChairNumbers = getAvailableChairNumbers(tableNumber, totalChairs, currentDate);
                const savedOrders = JSON.parse(localStorage.getItem("savedOrders")) || [];
                const tableOrders = savedOrders.filter(
                  (order) => String(order.tableNumber) === String(tableNumber)
                );
                const activeReservations = getActiveReservations(tableNumber, currentDate);
                const { backgroundColor } = getTableColor(tableNumber);

                return (
                  <div key={tableNumber} className="col">
                    <div className="card shadow-sm border-0 p-3 h-100">
                      <div className="text-center">
                        <div className="table-box">
                          <div
                            className="table-container position-relative d-inline-block"
                            style={{ width: "150px", height: "150px" }}
                          >
                            <div
                              className="table-shape position-absolute top-50 start-50 translate-middle"
                              style={{
                                width: "80px",
                                height: "80px",
                                backgroundColor,
                                border: "2px solid #333",
                                borderRadius: "50%",
                                boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                              }}
                            ></div>
                            {renderChairs(table, currentDate)}
                          </div>
                        </div>
                        <div className="mt-2">
                          <h5 className="fw-bold">Table {tableNumber}</h5>
                          {activeReservations.length > 0 && (
                            <div className="text-muted small">
                              {activeReservations.map((res, index) => (
                                <div key={index} className="mb-1">
                                  <p className="mb-1">
                                    Reserved for: {res.customerName} (Chairs: {(Array.isArray(res.chairs) ? res.chairs : []).join(", ")})
                                  </p>
                                  <p className="mb-0">
                                    {res.startTime} - {res.endTime}, {res.date}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                          {tableOrders.length > 0 && (
                            <div className="mt-2">
                              <h6 className="fw-bold">Existing Orders:</h6>
                              {tableOrders.map((order, index) => {
                                const subtotal = calculateOrderSubtotal(order.cartItems || []);
                                const vat = subtotal * vatRate;
                                const grandTotal = subtotal + vat;
                                return (
                                  <div key={index} className="mb-2">
                                    <p className="small mb-1">
                                      Chairs: {(Array.isArray(order.chairsBooked) ? order.chairsBooked : []).join(", ")} | 
                                      Items: {(order.cartItems || [])?.length} | 
                                      Grand Total: ₹{grandTotal.toFixed(2)}
                                    </p>
                                    <button
                                      className="btn btn-sm btn-primary"
                                      onClick={() =>
                                        handleViewOrder(tableNumber, order.chairsBooked)
                                      }
                                    >
                                      View Order
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="position-fixed bottom-0 start-0 p-3">
            <div className="card shadow-sm p-2">
              <h6 className="fw-bold mb-2">Chair Status</h6>
              <div className="d-flex align-items-center mb-1">
                <div className="color-box booked me-2"></div>
                <span className="small">Booked</span>
              </div>
              <div className="d-flex align-items-center mb-1">
                <div className="color-box reserved me-2"></div>
                <span className="small">Reserved</span>
              </div>
              <div className="d-flex align-items-center mb-1">
                <div className="color-box available me-2"></div>
                <span className="small">Available</span>
              </div>
              <div className="d-flex align-items-center">
                <div className="color-box selected me-2"></div>
                <span className="small">Selected</span>
              </div>
            </div>
          </div>

          {showVerifyPopup && selectedReservation && (
            <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Verify Customer for Table {selectedReservation.tableNumber}</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowVerifyPopup(false)}
                      aria-label="Close"
                    ></button>
                  </div>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label htmlFor="customerName" className="form-label fw-bold">
                        Customer Name:
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="customerName"
                        value={selectedCustomer}
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                        placeholder="Enter customer name"
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="phoneNumber" className="form-label fw-bold">
                        Phone Number:
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="phoneNumber"
                        value={verifyPhoneNumber}
                        onChange={(e) => setVerifyPhoneNumber(e.target.value)}
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowVerifyPopup(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleVerifyCustomer}
                    >
                      Verify
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default Table;