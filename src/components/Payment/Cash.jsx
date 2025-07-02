import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Modal, Button } from "react-bootstrap";
import axios from "axios";

// Check if running in Electron environment
const isElectron = window && window.process && window.process.type;
const ipcRenderer = isElectron ? window.require("electron").ipcRenderer : null;

function Cash() {
  const location = useLocation();
  const navigate = useNavigate();

  // State variables
  const [billDetails, setBillDetails] = useState(null);
  const [cashGiven, setCashGiven] = useState("");
  const [change, setChange] = useState(0);
  const [vatRate] = useState(0.10); // 10% VAT rate
  const [showModal, setShowModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [warningMessage, setWarningMessage] = useState("");
  const [warningType, setWarningType] = useState("warning");
  const [pendingAction, setPendingAction] = useState(null);

  // CSS Styles
  const styles = `
    .cash-container {
      padding: 20px;
      background-color: #f4f7f6;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      position: relative;
    }
    .cash-back-btn {
      position: absolute;
      top: 20px;
      left: 20px;
      background-color: #6c757d;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 5px;
      cursor: pointer;
      display: flex;
      align-items: center;
    }
    .cash-back-btn:hover {
      background-color: #5a6268;
    }
    .cash-back-btn .fas {
      margin-right: 8px;
    }
    .cash-error {
      color: red;
      text-align: center;
      margin-bottom: 15px;
    }
    .cash-content {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding-top: 50px;
    }
    .cash-card {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 800px;
      overflow: hidden;
    }
    .cash-header {
      background-color: #007bff;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .cash-header h3 {
      margin: 0;
      font-size: 24px;
    }
    .cash-body {
      padding: 20px 30px;
    }
    .cash-customer-info {
      margin-bottom: 20px;
      border-bottom: 1px solid #dee2e6;
      padding-bottom: 15px;
    }
    .cash-customer-info p {
      margin: 5px 0;
    }
    .cash-items-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
      color: #333;
    }
    .cash-table-wrapper {
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid #dee2e6;
      border-radius: 5px;
    }
    .cash-table {
      width: 100%;
      margin-bottom: 0;
    }
    .cash-sub-item td {
      
      font-size: 12px;
      color: #555; 
    }
    .cash-totals {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #dee2e6;
    }
    .cash-totals p {
      display: flex;
      justify-content: space-between;
      font-size: 16px;
      margin: 8px 0;
    }
    .grand-total {
      font-size: 20px;
      font-weight: bold;
      color: #28a745;
    }
    .cash-input-section, .cash-change {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 15px;
      font-size: 18px;
    }
    .cash-input {
      width: 50%;
      padding: 8px;
      border: 1px solid #ced4da;
      border-radius: 4px;
    }
    .cash-change span {
      font-weight: bold;
    }
    .cash-confirm {
      text-align: center;
      margin-top: 30px;
    }
    .cash-confirm-btn {
      background-color: #28a745;
      color: white;
      border: none;
      padding: 12px 25px;
      font-size: 18px;
      border-radius: 5px;
      cursor: pointer;
      width: 100%;
    }
    .cash-confirm-btn:hover {
      background-color: #218838;
    }
    .cash-empty {
      text-align: center;
      padding: 40px;
    }
    .cash-return-btn {
      background-color: #007bff;
      color: white;
      padding: 10px 20px;
      border: none;
      border-radius: 5px;
    }
    .cash-modal-header {
      background-color: #007bff;
      color: white;
    }
    .cash-modal-footer {
      justify-content: space-between;
    }
  `;

  // Initialize bill details from location state
  useEffect(() => {
    if (location.state?.billDetails) {
      const formattedBillDetails = {
        ...location.state.billDetails,
        invoice_no: location.state.billDetails.invoice_no || `INV-${Date.now()}`,
        totalAmount: Number(location.state.billDetails.totalAmount) || 0,
        customerName: location.state.billDetails.customerName || "N/A",
        phoneNumber: location.state.billDetails.phoneNumber || "N/A",
        email: location.state.billDetails.email || "N/A",
        whatsappNumber: location.state.billDetails.whatsappNumber || "N/A",
        tableNumber: location.state.billDetails.tableNumber || "N/A",
        deliveryAddress: location.state.billDetails.deliveryAddress || {
          building_name: "",
          flat_villa_no: "",
          location: "",
        },
        date: location.state.billDetails.date || new Date().toISOString().split("T")[0],
        time: location.state.billDetails.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        payments: location.state.billDetails.payments || [{ mode_of_payment: "CASH" }],
        items: location.state.billDetails.items.map((item) => ({
          ...item,
          item_name: item.item_name || item.name || "Unnamed Item",
          quantity: Number(item.quantity) || 1,
          basePrice: Number(item.basePrice) || 0,
          totalPrice: Number(item.totalPrice) || Number(item.basePrice) * Number(item.quantity) || 0,
          selectedSize: item.selectedSize || null,
          icePreference: item.icePreference || "without_ice",
          icePrice: Number(item.icePrice) || 0,
          isSpicy: item.isSpicy || false,
          spicyPrice: item.isSpicy ? Number(item.spicyPrice) || 20.00 : 0,
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
          kitchen: item.kitchen || "Main Kitchen",
          ingredients: item.ingredients || [],
          selectedCustomVariants: item.selectedCustomVariants || {},
          customVariantsDetails: item.customVariantsDetails || {},
          customVariantsQuantities: item.customVariantsQuantities || {},
          addons: item.addonQuantities
            ? Object.entries(item.addonQuantities)
                .filter(([_, qty]) => Number(qty) > 0)
                .map(([name, qty]) => ({
                  addon_name: name,
                  addon_quantity: Number(qty) || 0,
                  addon_price: Number(item.addonSizePrices?.[name]) || 0,
                  addon_total_price: Number(item.addonPrices?.[name]) || 0,
                  size: item.addonVariants?.[name]?.size || "M",
                  isSpicy: item.addonVariants?.[name]?.spicy || false,
                  spicyPrice: Number(item.addonSpicyPrices?.[name]) || 0,
                  kitchen: item.addonVariants?.[name]?.kitchen || "Main Kitchen",
                  addon_image: item.addonImages?.[name] || "/static/images/default-addon-image.jpg",
                }))
            : [],
          combos: item.comboQuantities
            ? Object.entries(item.comboQuantities)
                .filter(([_, qty]) => Number(qty) > 0)
                .map(([name, qty]) => ({
                  name1: name,
                  combo_price: Number(item.comboSizePrices?.[name]) || 0,
                  combo_total_price: Number(item.comboPrices?.[name]) || 0,
                  size: item.comboVariants?.[name]?.size || "M",
                  combo_quantity: Number(qty) || 1,
                  isSpicy: item.comboVariants?.[name]?.spicy || false,
                  spicyPrice: Number(item.comboSpicyPrices?.[name]) || 0,
                  kitchen: item.comboVariants?.[name]?.kitchen || "Main Kitchen",
                  combo_image: item.comboImages?.[name] || "/static/images/default-combo-image.jpg",
                }))
            : item.selectedCombos || [],
        })),
      };
      setBillDetails(formattedBillDetails);
      setEmailAddress(formattedBillDetails.email);
    }
  }, [location]);

  // Auto-close modal and navigate after 100 seconds
  useEffect(() => {
    let timer;
    if (showModal) {
      timer = setTimeout(() => {
        setShowModal(false);
        navigate("/frontpage");
      }, 100000);
    }
    return () => clearTimeout(timer);
  }, [showModal, navigate]);

  // Calculate item prices including addons, combos, custom variants, and extras
  const calculateItemPrices = (item) => {
    const basePrice = Number(item.basePrice) || 0;
    const icePrice = item.icePreference === "with_ice" ? Number(item.icePrice) || 0 : 0;
    const spicyPrice = item.isSpicy ? Number(item.spicyPrice) || 0 : 0;
    const addonTotal =
      item.addons && item.addons.length > 0
        ? item.addons.reduce(
            (sum, addon) => sum + Number(addon.addon_total_price) * addon.addon_quantity,
            0
          )
        : 0;
    const comboTotal =
      item.combos && item.combos.length > 0
        ? item.combos.reduce(
            (sum, combo) => sum + Number(combo.combo_total_price) * combo.combo_quantity,
            0
          )
        : 0;
    const customVariantsTotal = item.customVariantsDetails
      ? Object.values(item.customVariantsDetails).reduce(
          (sum, variant) => sum + (Number(variant.price) || 0) * (item.customVariantsQuantities?.[variant.name] || 1),
          0
        ) * item.quantity
      : 0;
    const totalAmount = (basePrice + icePrice + spicyPrice) * item.quantity + addonTotal + comboTotal + customVariantsTotal;
    return { basePrice, icePrice, spicyPrice, addonTotal, comboTotal, customVariantsTotal, totalAmount };
  };

  // Get display name for items
  const getItemDisplayName = (item) => {
    const sizeDisplay = item.selectedSize ? ` (${item.selectedSize})` : "";
    return `${item.item_name}${sizeDisplay}`;
  };

  // Calculate subtotal for all items
  const calculateSubtotal = () => {
    if (!billDetails || !billDetails.items) return 0;
    return billDetails.items.reduce((sum, item) => {
      const { totalAmount } = calculateItemPrices(item);
      return sum + totalAmount;
    }, 0);
  };

  // Calculate VAT
  const calculateVAT = () => {
    return Number(calculateSubtotal() * vatRate);
  };

  // Calculate grand total
  const calculateGrandTotal = () => {
    return Number(calculateSubtotal() + calculateVAT());
  };

  // Handle cash input change
  const handleCashChange = (e) => {
    const givenAmount = e.target.value === "" ? "" : Number(e.target.value);
    setCashGiven(givenAmount);
    if (givenAmount !== "" && !isNaN(givenAmount)) {
      const grandTotal = calculateGrandTotal();
      setChange(givenAmount >= grandTotal ? Number(givenAmount - grandTotal) : 0);
    } else {
      setChange(0);
    }
  };

  // Handle warning modal OK button
  const handleWarningOk = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setWarningMessage("");
    setWarningType("warning");
  };

  // Confirm payment and validate cash given
  const handlePaymentConfirm = () => {
    const grandTotal = calculateGrandTotal();
    const cashGivenNum = cashGiven === "" ? 0 : Number(cashGiven);
    if (cashGivenNum > 0 && cashGivenNum < grandTotal) {
      setWarningMessage(`Insufficient cash amount! Please provide at least ₹${grandTotal.toFixed(2)}`);
      setWarningType("warning");
      return;
    }
    setWarningMessage("Payment confirmed!");
    setWarningType("success");
    setPendingAction(() => () => {
      setShowModal(true);
    });
  };

  // Format numbers for display
  const formatTotal = (amount) => {
    const num = Number(amount);
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
  };

  // Generate printable receipt content
  const generatePrintableContent = (isPreview = false) => {
    if (!billDetails) return "";

    const subtotal = calculateSubtotal();
    const vatAmount = calculateVAT();
    const grandTotal = calculateGrandTotal();
    const hasDeliveryAddress =
      billDetails.deliveryAddress &&
      (billDetails.deliveryAddress.building_name ||
        billDetails.deliveryAddress.flat_villa_no ||
        billDetails.deliveryAddress.location);
    const deliveryAddress = hasDeliveryAddress
      ? `${billDetails.deliveryAddress.building_name || ""}, ${billDetails.deliveryAddress.flat_villa_no || ""}, ${billDetails.deliveryAddress.location || ""}`
      : null;

    const borderStyle = isPreview ? "border: none;" : "border: 1px solid #000000;";

    const cashGivenDisplay =
      cashGiven && !isNaN(cashGiven) && Number(cashGiven) > 0
        ? `
            <tr style="margin-bottom: 5px;">
              <td style="text-align: left; padding: 2px; border: none; line-height: 1.5;">Cash Given</td>
              <td style="text-align: center; padding: 2px; border: none; line-height: 1.5;">:</td>
              <td style="text-align: right; padding: 2px; border: none; line-height: 1.5;">₹${Number(cashGiven).toFixed(2)}</td>
            </tr>
            <tr style="margin-bottom: 5px;">
              <td style="text-align: left; padding: 2px; border: none; line-height: 1.5;">Change Returned</td>
              <td style="text-align: center; padding: 2px; border: none; line-height: 1.5;">:</td>
              <td style="text-align: right; padding: 2px; border: none; line-height: 1.5;">₹${change.toFixed(2)}</td>
            </tr>
          `
        : "";

    return `
      <div style="font-family: Arial, sans-serif; width: 88mm; font-size: 12px; padding: 10px; color: #000000; ${borderStyle} box-sizing: border-box;">
        <div style="text-align: center; margin-bottom: 15px;">
          <h3 style="margin: 0; font-size: 16px; color: #000000;">My Restaurant</h3>
          <p style="margin: 2px 0;">123 Store Street, City</p>
          <p style="margin: 2px 0;">Phone: +91 123-456-7890</p>
          <p style="margin: 2px 0;">GSTIN: 12ABCDE3456F7Z8</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; border: none; margin-bottom: 10px;">
          <tbody>
            <tr style="margin-bottom: 5px;">
              <td style="width: 50%; text-align: left; padding: 2px; border: none; line-height: 1.5;">Invoice No</td>
              <td style="text-align: center; padding: 2px; border: none; line-height: 1.5;">:</td>
              <td style="width: 50%; text-align: right; padding: 2px; border: none; line-height: 1.5; white-space: nowrap;">${billDetails.invoice_no}</td>
            </tr>
            <tr style="margin-bottom: 5px;">
              <td style="text-align: left; padding: 2px; border: none; line-height: 1.5;">Customer</td>
              <td style="text-align: center; padding: 2px; border: none; line-height: 1.5;">:</td>
              <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; word-break: break-all;">${billDetails.customerName || "N/A"}</td>
            </tr>
            <tr style="margin-bottom: 5px;">
              <td style="text-align: left; padding: 2px; border: none; line-height: 1.5;">Phone</td>
              <td style="text-align: center; padding: 2px; border: none; line-height: 1.5;">:</td>
              <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; word-break: break-all;">${billDetails.phoneNumber || "N/A"}</td>
            </tr>
            <tr style="margin-bottom: 5px;">
              <td style="text-align: left; padding: 2px; border: none; line-height: 1.5;">Email</td>
              <td style="text-align: center; padding: 2px; border: none; line-height: 1.5;">:</td>
              <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; word-break: break-all;">${billDetails.email || "N/A"}</td>
            </tr>
            <tr style="margin-bottom: 5px;">
              <td style="text-align: left; padding: 2px; border: none; line-height: 1.5;">WhatsApp</td>
              <td style="text-align: center; padding: 2px; border: none; line-height: 1.5;">:</td>
              <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; word-break: break-all;">${billDetails.whatsappNumber || "N/A"}</td>
            </tr>
            ${
              billDetails.tableNumber && billDetails.tableNumber !== "N/A"
                ? `
                  <tr style="margin-bottom: 5px;">
                    <td style="text-align: left; padding: 2px; border: none; line-height: 1.5;">Table</td>
                    <td style="text-align: center; padding: 2px; border: none; line-height: 1.5;">:</td>
                    <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; word-break: break-all;">${billDetails.tableNumber}</td>
                  </tr>
                `
                : ""
            }
            ${
              hasDeliveryAddress
                ? `
                  <tr style="margin-bottom: 5px;">
                    <td style="text-align: left; padding: 2px; border: none; line-height: 1.5;">Delivery Address</td>
                    <td style="text-align: center; padding: 2px; border: none; line-height: 1.5;">:</td>
                    <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; word-break: break-all;">${deliveryAddress}</td>
                  </tr>
                `
                : ""
            }
            <tr style="margin-bottom: 5px;">
              <td style="text-align: left; padding: 2px; border: none; line-height: 1.5;">Payment Mode</td>
              <td style="text-align: center; padding: 2px; border: none; line-height: 1.5;">:</td>
              <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; word-break: break-all;">${billDetails.payments?.[0]?.mode_of_payment || "CASH"}</td>
            </tr>
            ${cashGivenDisplay}
            <tr style="margin-bottom: 5px;">
              <td style="text-align: left; padding: 2px; border: none; line-height: 1.5;">Date</td>
              <td style="text-align: center; padding: 2px; border: none; line-height: 1.5;">:</td>
              <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; white-space: nowrap;">${billDetails.date}</td>
            </tr>
            <tr style="margin-bottom: 5px;">
              <td style="text-align: left; padding: 2px; border: none; line-height: 1.5;">Time</td>
              <td style="text-align: center; padding: 2px; border: none; line-height: 1.5;">:</td>
              <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; white-space: nowrap;">${billDetails.time}</td>
            </tr>
          </tbody>
        </table>
        <table style="width: 100%; margin-bottom: 10px; border-collapse: collapse; border: 1px solid #000000; table-layout: fixed;">
          <thead>
            <tr style="border-bottom: 1px dashed #000000;">
              <th style="text-align: left; width: 40%; padding: 4px;">Item</th>
              <th style="text-align: center; width: 15%; padding: 4px;">Qty</th>
              <th style="text-align: right; width: 20%; padding: 4px;">Price</th>
              <th style="text-align: right; width: 25%; padding: 4px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${billDetails.items
              .map((item) => {
                const { basePrice, icePrice, spicyPrice } = calculateItemPrices(item);
                return `
                  <tr>
                    <td style="text-align: left; padding: 4px;">${getItemDisplayName(item)}</td>
                    <td style="text-align: center; padding: 4px;">${item.quantity}</td>
                    <td style="text-align: right; padding: 4px;">₹${formatTotal(basePrice)}</td>
                    <td style="text-align: right; padding: 4px;">₹${formatTotal(basePrice * item.quantity)}</td>
                  </tr>
                  ${
                    item.icePreference === "with_ice" && icePrice > 0
                      ? `
                        <tr>
                          <td style="text-align: left; padding-left: 10px; padding: 4px;">+ Ice</td>
                          <td style="text-align: center; padding: 4px;">${item.quantity}</td>
                          <td style="text-align: right; padding: 4px;">₹${formatTotal(icePrice)}</td>
                          <td style="text-align: right; padding: 4px;">₹${formatTotal(icePrice * item.quantity)}</td>
                        </tr>
                      `
                      : ""
                  }
                  ${
                    item.isSpicy && spicyPrice > 0
                      ? `
                        <tr>
                          <td style="text-align: left; padding-left: 10px; padding: 4px;">+ Spicy</td>
                          <td style="text-align: center; padding: 4px;">${item.quantity}</td>
                          <td style="text-align: right; padding: 4px;">₹${formatTotal(spicyPrice)}</td>
                          <td style="text-align: right; padding: 4px;">₹${formatTotal(spicyPrice * item.quantity)}</td>
                        </tr>
                      `
                      : ""
                  }
                  ${
                    item.customVariantsDetails && Object.keys(item.customVariantsDetails).length > 0
                      ? Object.entries(item.customVariantsDetails)
                          .map(([variantName, variant]) => `
                            <tr>
                              <td style="text-align: left; padding-left: 10px; padding: 4px;">+ ${variant.heading}: ${variant.name}</td>
                              <td style="text-align: center; padding: 4px;">${item.customVariantsQuantities?.[variantName] || 1}</td>
                              <td style="text-align: right; padding: 4px;">₹${formatTotal(variant.price)}</td>
                              <td style="text-align: right; padding: 4px;">₹${formatTotal(variant.price * (item.customVariantsQuantities?.[variantName] || 1))}</td>
                            </tr>
                          `)
                          .join("")
                      : ""
                  }
                  ${
                    item.addons && item.addons.length > 0
                      ? item.addons
                          .map(
                            (addon) =>
                              addon.addon_quantity > 0
                                ? `
                                  <tr>
                                    <td style="text-align: left; padding-left: 10px; padding: 4px;">+ Addon: ${addon.addon_name}${addon.size ? ` (${addon.size})` : ""}</td>
                                    <td style="text-align: center; padding: 4px;">${addon.addon_quantity}</td>
                                    <td style="text-align: right; padding: 4px;">₹${formatTotal(addon.addon_price)}</td>
                                    <td style="text-align: right; padding: 4px;">₹${formatTotal(addon.addon_price * addon.addon_quantity)}</td>
                                  </tr>
                                  ${
                                    addon.isSpicy && addon.spicyPrice > 0
                                      ? `
                                        <tr>
                                          <td style="text-align: left; padding-left: 15px; padding: 4px;">+ Spicy</td>
                                          <td style="text-align: center; padding: 4px;">${addon.addon_quantity}</td>
                                          <td style="text-align: right; padding: 4px;">₹${formatTotal(addon.spicyPrice)}</td>
                                          <td style="text-align: right; padding: 4px;">₹${formatTotal(addon.spicyPrice * addon.addon_quantity)}</td>
                                        </tr>
                                      `
                                      : ""
                                  }
                                `
                                : ""
                          )
                          .join("")
                      : ""
                  }
                  ${
                    item.combos && item.combos.length > 0
                      ? item.combos
                          .map(
                            (combo) =>
                              combo.combo_quantity > 0
                                ? `
                                  <tr>
                                    <td style="text-align: left; padding-left: 10px; padding: 4px;">+ Combo: ${combo.name1}${combo.size ? ` (${combo.size})` : ""}</td>
                                    <td style="text-align: center; padding: 4px;">${combo.combo_quantity}</td>
                                    <td style="text-align: right; padding: 4px;">₹${formatTotal(combo.combo_price)}</td>
                                    <td style="text-align: right; padding: 4px;">₹${formatTotal(combo.combo_price * combo.combo_quantity)}</td>
                                  </tr>
                                  ${
                                    combo.isSpicy && combo.spicyPrice > 0
                                      ? `
                                        <tr>
                                          <td style="text-align: left; padding-left: 15px; padding: 4px;">+ Spicy</td>
                                          <td style="text-align: center; padding: 4px;">${combo.combo_quantity}</td>
                                          <td style="text-align: right; padding: 4px;">₹${formatTotal(combo.spicyPrice)}</td>
                                          <td style="text-align: right; padding: 4px;">₹${formatTotal(combo.spicyPrice * combo.combo_quantity)}</td>
                                        </tr>
                                      `
                                      : ""
                                  }
                                `
                                : ""
                          )
                          .join("")
                      : ""
                  }
                `;
              })
              .join("")}
          </tbody>
        </table>
        <table style="width: 100%; border-collapse: collapse; border: none; margin-bottom: 10px;">
          <tbody>
            <tr>
              <td style="text-align: left; padding: 2px; border: none; line-height: 1.5; font-size: 15px;">Subtotal:</td>
              <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; font-size: 15px;">₹${subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="text-align: left; padding: 2px; border: none; line-height: 1.5; font-size: 15px;">VAT (${vatRate * 100}%):</td>
              <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; font-size: 15px;">₹${vatAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="text-align: left; padding: 2px; border: none; line-height: 1.5; font-size: 15px;">Grand Total:</td>
              <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; font-size: 15px;">₹${grandTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        <div style="text-align: center; margin-top: 15px;">
          <p style="margin: 2px 0;">Thank You! Visit Again!</p>
          <p style="margin: 2px 0;">Powered by MyRestaurant</p>
        </div>
      </div>
    `;
  };

  // Handle print functionality
  const handlePrint = async () => {
    const content = generatePrintableContent();
    setIsLoading(true);
    setError(null);

    try {
      if (isElectron && ipcRenderer) {
        ipcRenderer.send("open-print-preview", content);
        ipcRenderer.once("print-preview-response", (event, response) => {
          setIsLoading(false);
          if (response.success) {
            setShowModal(false);
            navigate("/frontpage");
          } else {
            setError("Failed to open print preview: " + response.error);
            setWarningMessage("Print preview failed: " + response.error);
            setWarningType("warning");
          }
        });
      } else {
        const win = window.open("", "_blank");
        win.document.write(`
          <html>
            <head>
              <title>Receipt - Invoice ${billDetails?.invoice_no || "N/A"}</title>
              <style>
                @media print {
                  body { margin: 0; }
                  @page { margin: 0; size: 88mm auto; }
                }
                body { margin: 0; }
              </style>
            </head>
            <body>
              ${content}
            </body>
          </html>
        `);
        win.document.close();
        win.focus();
        win.print();
        win.close();
        setIsLoading(false);
        setShowModal(false);
        navigate("/frontpage");
      }
    } catch (err) {
      setIsLoading(false);
      setError("Printing failed: " + err.message);
      setWarningMessage("Printing failed: " + err.message);
      setWarningType("warning");
    }
  };

  // Handle email functionality
  const handleEmail = async () => {
    if (!emailAddress || !emailAddress.includes("@")) {
      setWarningMessage("Please enter a valid email address!");
      setWarningType("warning");
      return;
    }

    const emailContent = {
      to: emailAddress,
      subject: `Receipt from My Restaurant - ${billDetails?.invoice_no || "N/A"}`,
      html: generatePrintableContent(),
    };

    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post("http://127.0.0.1:5000/api/send-email", emailContent, {
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      });
      setIsLoading(false);
      if (response.data.success) {
        setWarningMessage("Receipt sent successfully to " + emailAddress);
        setWarningType("success");
        setPendingAction(() => () => {
          setShowModal(false);
          navigate("/frontpage");
        });
      } else {
        setError("Failed to send email: " + response.data.message);
        setWarningMessage("Failed to send email: " + response.data.message);
        setWarningType("warning");
      }
    } catch (err) {
      setIsLoading(false);
      setError("Email sending failed: " + (err.response?.data?.message || err.message));
      setWarningMessage("Email sending failed: " + (err.response?.data?.message || err.message));
      setWarningType("warning");
    }
  };

  // Navigate back to main page
  const handleBack = () => {
    navigate("/frontpage");
  };

  // Handle modal close with navigation to frontpage
  const handleModalClose = () => {
    setShowModal(false);
    navigate("/frontpage");
  };

  // Check if delivery address is available
  const hasDeliveryAddress =
    billDetails?.deliveryAddress &&
    (billDetails.deliveryAddress.building_name ||
      billDetails.deliveryAddress.flat_villa_no ||
      billDetails.deliveryAddress.location);

  return (
    <>
      <style>{styles}</style>
      <div className="cash-container">
        {/* Warning message display */}
        {warningMessage && (
          <div className={`alert alert-${warningType} text-center alert-dismissible fade show`} role="alert">
            {warningMessage}
            <button type="button" className="btn btn-primary ms-3" onClick={handleWarningOk}>
              OK
            </button>
          </div>
        )}
        {/* Back button */}
        <button className="cash-back-btn" onClick={handleBack} disabled={isLoading}>
          <i className="fas fa-arrow-left"></i> Back to Main
        </button>

        {/* Error message display */}
        {error && <div className="cash-error">{error}</div>}

        <div className="cash-content">
          <div className="cash-card">
            <div className="cash-header">
              <h3>
                <i className="fas fa-money-bill-wave"></i> Cash Payment
              </h3>
            </div>
            <div className="cash-body">
              {billDetails ? (
                <div>
                  {/* Customer information */}
                  <div className="cash-customer-info">
                    <p>
                      <strong>Customer:</strong> {billDetails.customerName}
                    </p>
                    <p>
                      <strong>Phone:</strong> {billDetails.phoneNumber}
                    </p>
                    <p>
                      <strong>Email:</strong> {billDetails.email}
                    </p>
                    {billDetails.tableNumber && billDetails.tableNumber !== "N/A" && (
                      <p>
                        <strong>Table:</strong> {billDetails.tableNumber}
                      </p>
                    )}
                    {hasDeliveryAddress && (
                      <p>
                        <strong>Delivery Address:</strong>{" "}
                        {`${billDetails.deliveryAddress.building_name || ""}, ${billDetails.deliveryAddress.flat_villa_no || ""}, ${billDetails.deliveryAddress.location || ""}`}
                      </p>
                    )}
                  </div>
                  <h6 className="cash-items-title">Items Ordered</h6>
                  <div className="cash-table-wrapper table-responsive">
                    <table
                      className="cash-table table border text-start"
                      style={{ fontSize: "13px", color: "black", fontWeight: "bold" }}
                    >
                      <thead>
                        <tr>
                          <th style={{ width: "50px" }}>T.No.</th>
                          <th>Item Details</th>
                          <th style={{ width: "80px" }}>Qty</th>
                          <th style={{ width: "80px" }}>Price</th>
                        </tr>
                      </thead>
                      <tbody className="text-start">
                        {billDetails.items.map((item, index) => {
                          const { basePrice, icePrice, spicyPrice } = calculateItemPrices(item);
                          return (
                            <React.Fragment key={index}>
                              <tr>
                                <td>{billDetails.tableNumber}</td>
                                <td>
                                  <strong>{getItemDisplayName(item)}</strong>
                                </td>
                                <td>{item.quantity}</td>
                                <td>₹{formatTotal(basePrice)}</td>
                              </tr>
                              {item.icePreference === "with_ice" && icePrice > 0 && (
                                <tr className="cash-sub-item">
                                  <td></td>
                                  <td>
                                    <div style={{ fontSize: "12px" }}>+ Ice (₹{formatTotal(icePrice)})</div>
                                  </td>
                                  <td>{item.quantity}</td>
                                  <td>₹{formatTotal(icePrice)}</td>
                                </tr>
                              )}
                              {item.isSpicy && spicyPrice > 0 && (
                                <tr className="cash-sub-item">
                                  <td></td>
                                  <td>
                                    <div style={{ fontSize: "12px" }}>+ Spicy (₹{formatTotal(spicyPrice)})</div>
                                  </td>
                                  <td>{item.quantity}</td>
                                  <td>₹{formatTotal(spicyPrice)}</td>
                                </tr>
                              )}
                              {item.customVariantsDetails &&
                                Object.keys(item.customVariantsDetails).length > 0 &&
                                Object.entries(item.customVariantsDetails).map(([variantName, variant], idx) => (
                                  <tr className="cash-sub-item" key={`${index}-custom-${idx}`}>
                                    <td></td>
                                    <td>
                                      <div style={{ fontSize: "12px" }}>
                                        + {variant.heading}: {variant.name} (₹{formatTotal(variant.price)})
                                      </div>
                                    </td>
                                    <td>{item.customVariantsQuantities?.[variantName] || 1}</td>
                                    <td>₹{formatTotal(variant.price)}</td>
                                  </tr>
                                ))}
                              {item.addons &&
                                item.addons.map(
                                  (addon, idx) =>
                                    addon.addon_quantity > 0 && (
                                      <React.Fragment key={`${index}-addon-${idx}`}>
                                        <tr className="cash-sub-item">
                                          <td></td>
                                          <td>
                                            <div style={{ fontSize: "12px" }}>
                                              + Addon: {addon.addon_name}
                                              {addon.size ? ` (${addon.size})` : ""}
                                            </div>
                                          </td>
                                          <td>{addon.addon_quantity}</td>
                                          <td>₹{formatTotal(addon.addon_price)}</td>
                                        </tr>
                                        {addon.isSpicy && addon.spicyPrice > 0 && (
                                          <tr className="cash-sub-item">
                                            <td></td>
                                            <td>
                                              <div style={{ fontSize: "12px" }}>+ Spicy (₹{formatTotal(addon.spicyPrice)})</div>
                                            </td>
                                            <td>{addon.addon_quantity}</td>
                                            <td>₹{formatTotal(addon.spicyPrice)}</td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    )
                                )}
                              {item.combos &&
                                item.combos.map(
                                  (combo, idx) =>
                                    combo.combo_quantity > 0 && (
                                      <React.Fragment key={`${index}-combo-${idx}`}>
                                        <tr className="cash-sub-item">
                                          <td></td>
                                          <td>
                                            <div style={{ fontSize: "12px" }}>
                                              + Combo: {combo.name1}
                                              {combo.size ? ` (${combo.size})` : ""}
                                            </div>
                                          </td>
                                          <td>{combo.combo_quantity}</td>
                                          <td>₹{formatTotal(combo.combo_price)}</td>
                                        </tr>
                                        {combo.isSpicy && combo.spicyPrice > 0 && (
                                          <tr className="cash-sub-item">
                                            <td></td>
                                            <td>
                                              <div style={{ fontSize: "12px" }}>+ Spicy (₹{formatTotal(combo.spicyPrice)})</div>
                                            </td>
                                            <td>{combo.combo_quantity}</td>
                                            <td>₹{formatTotal(combo.spicyPrice)}</td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    )
                                )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Totals section */}
                  <div className="cash-totals">
                    <p>
                      <strong>Total Quantity:</strong> {billDetails.items.reduce((sum, item) => sum + item.quantity, 0)}
                    </p>
                    <p>
                      <strong>Subtotal:</strong> ₹{calculateSubtotal().toFixed(2)}
                    </p>
                    <p>
                      <strong>VAT ({vatRate * 100}%):</strong> ₹{calculateVAT().toFixed(2)}
                    </p>
                    <p>
                      <strong>Grand Total:</strong> <span className="grand-total">₹{calculateGrandTotal().toFixed(2)}</span>
                    </p>
                  </div>
                  {/* Cash input section */}
                  <div className="cash-input-section">
                    <label>Cash Given:</label>
                    <input
                      type="number"
                      className="cash-input"
                      placeholder="Enter amount"
                      value={cashGiven}
                      onChange={handleCashChange}
                      min="0"
                      step="0.01"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="cash-change">
                    <label>Change to Return:</label>
                    <span>₹{change.toFixed(2)}</span>
                  </div>
                  <div className="cash-confirm">
                    <button className="cash-confirm-btn" onClick={handlePaymentConfirm} disabled={isLoading}>
                      {isLoading ? "Processing..." : "Confirm Payment"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="cash-empty">
                  <p>No payment details available</p>
                  <button className="cash-return-btn" onClick={handleBack} disabled={isLoading}>
                    Return to Main Page
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal for bill details and actions */}
        <Modal show={showModal} onHide={handleModalClose} size="lg" centered>
          <Modal.Header closeButton className="cash-modal-header">
            <Modal.Title>Bill Details</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label">Email Receipt To:</label>
              <input
                type="email"
                className="form-control cash-modal-input"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="Enter email address"
                disabled={isLoading}
              />
            </div>
            {billDetails && (
              <div>
                <table className="table table-striped table-bordered">
                  <tbody>
                    <tr>
                      <td style={{ width: "50%", textAlign: "left" }}>
                        <strong>Invoice No:</strong>
                      </td>
                      <td style={{ width: "50%", textAlign: "right", whiteSpace: "nowrap" }}>{billDetails.invoice_no}</td>
                    </tr>
                    <tr>
                      <td style={{ textAlign: "left" }}>
                        <strong>Customer:</strong>
                      </td>
                      <td style={{ textAlign: "right" }}>{billDetails.customerName}</td>
                    </tr>
                    <tr>
                      <td style={{ textAlign: "left" }}>
                        <strong>Phone:</strong>
                      </td>
                      <td style={{ textAlign: "right" }}>{billDetails.phoneNumber}</td>
                    </tr>
                    <tr>
                      <td style={{ textAlign: "left" }}>
                        <strong>Email:</strong>
                      </td>
                      <td style={{ textAlign: "right" }}>{billDetails.email}</td>
                    </tr>
                    <tr>
                      <td style={{ textAlign: "left" }}>
                        <strong>WhatsApp:</strong>
                      </td>
                      <td style={{ textAlign: "right" }}>{billDetails.whatsappNumber}</td>
                    </tr>
                    {billDetails.tableNumber && billDetails.tableNumber !== "N/A" && (
                      <tr>
                        <td style={{ textAlign: "left" }}>
                          <strong>Table:</strong>
                        </td>
                        <td style={{ textAlign: "right" }}>{billDetails.tableNumber}</td>
                      </tr>
                    )}
                    {hasDeliveryAddress && (
                      <tr>
                        <td style={{ textAlign: "left" }}>
                          <strong>Delivery Address:</strong>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {`${billDetails.deliveryAddress.building_name || ""}, ${billDetails.deliveryAddress.flat_villa_no || ""}, ${billDetails.deliveryAddress.location || ""}`}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ textAlign: "left" }}>
                        <strong>Payment Mode:</strong>
                      </td>
                      <td style={{ textAlign: "right" }}>{billDetails.payments?.[0]?.mode_of_payment || "CASH"}</td>
                    </tr>
                    <tr>
                      <td style={{ textAlign: "left" }}>
                        <strong>Date:</strong>
                      </td>
                      <td style={{ textAlign: "right" }}>{billDetails.date}</td>
                    </tr>
                    <tr>
                      <td style={{ textAlign: "left" }}>
                        <strong>Time:</strong>
                      </td>
                      <td style={{ textAlign: "right" }}>{billDetails.time}</td>
                    </tr>
                  </tbody>
                </table>
                <h5>Items:</h5>
                <div className="table-responsive">
                  <table
                    className="table table-striped table-bordered"
                    style={{ fontSize: "13px", color: "black", fontWeight: "bold" }}
                  >
                    <thead>
                      <tr>
                        <th style={{ width: "50px" }}>T.No.</th>
                        <th>Item Details</th>
                        <th style={{ width: "80px" }}>Qty</th>
                        <th style={{ width: "80px" }}>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billDetails.items.map((item, index) => {
                        const { basePrice, icePrice, spicyPrice } = calculateItemPrices(item);
                        return (
                          <React.Fragment key={index}>
                            <tr>
                              <td>{billDetails.tableNumber}</td>
                              <td>
                                <strong>{getItemDisplayName(item)}</strong>
                              </td>
                              <td>{item.quantity}</td>
                              <td>₹{formatTotal(basePrice)}</td>
                            </tr>
                            {item.icePreference === "with_ice" && icePrice > 0 && (
                              <tr>
                                <td></td>
                                <td>
                                  <div style={{ fontSize: "12px" }}>+ Ice (₹{formatTotal(icePrice)})</div>
                                </td>
                                <td>{item.quantity}</td>
                                <td>₹{formatTotal(icePrice)}</td>
                              </tr>
                            )}
                            {item.isSpicy && spicyPrice > 0 && (
                              <tr>
                                <td></td>
                                <td>
                                  <div style={{ fontSize: "12px" }}>+ Spicy (₹{formatTotal(spicyPrice)})</div>
                                </td>
                                <td>{item.quantity}</td>
                                <td>₹{formatTotal(spicyPrice)}</td>
                              </tr>
                            )}
                            {item.customVariantsDetails &&
                              Object.keys(item.customVariantsDetails).length > 0 &&
                              Object.entries(item.customVariantsDetails).map(([variantName, variant], idx) => (
                                <tr key={`${index}-custom-${idx}`}>
                                  <td></td>
                                  <td>
                                    <div style={{ fontSize: "12px" }}>
                                      + {variant.heading}: {variant.name} (₹{formatTotal(variant.price)})
                                    </div>
                                  </td>
                                  <td>{item.customVariantsQuantities?.[variantName] || 1}</td>
                                  <td>₹{formatTotal(variant.price)}</td>
                                </tr>
                              ))}
                            {item.addons &&
                              item.addons.map(
                                (addon, idx) =>
                                  addon.addon_quantity > 0 && (
                                    <React.Fragment key={`${index}-addon-${idx}`}>
                                      <tr>
                                        <td></td>
                                        <td>
                                          <div style={{ fontSize: "12px" }}>
                                            + Addon: {addon.addon_name}
                                            {addon.size ? ` (${addon.size})` : ""}
                                          </div>
                                        </td>
                                        <td>{addon.addon_quantity}</td>
                                        <td>₹{formatTotal(addon.addon_price)}</td>
                                      </tr>
                                      {addon.isSpicy && addon.spicyPrice > 0 && (
                                        <tr>
                                          <td></td>
                                          <td>
                                            <div style={{ fontSize: "12px" }}>+ Spicy (₹{formatTotal(addon.spicyPrice)})</div>
                                          </td>
                                          <td>{addon.addon_quantity}</td>
                                          <td>₹{formatTotal(addon.spicyPrice)}</td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  )
                              )}
                            {item.combos &&
                              item.combos.map(
                                (combo, idx) =>
                                  combo.combo_quantity > 0 && (
                                    <React.Fragment key={`${index}-combo-${idx}`}>
                                      <tr>
                                        <td></td>
                                        <td>
                                          <div style={{ fontSize: "12px" }}>
                                            + Combo: {combo.name1}
                                            {combo.size ? ` (${combo.size})` : ""}
                                          </div>
                                        </td>
                                        <td>{combo.combo_quantity}</td>
                                        <td>₹{formatTotal(combo.combo_price)}</td>
                                      </tr>
                                      {combo.isSpicy && combo.spicyPrice > 0 && (
                                        <tr>
                                          <td></td>
                                          <td>
                                            <div style={{ fontSize: "12px" }}>+ Spicy (₹{formatTotal(combo.spicyPrice)})</div>
                                          </td>
                                          <td>{combo.combo_quantity}</td>
                                          <td>₹{formatTotal(combo.spicyPrice)}</td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  )
                              )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3">
                  <p>
                    <strong>Subtotal:</strong> ₹{calculateSubtotal().toFixed(2)}
                  </p>
                  <p>
                    <strong>VAT ({vatRate * 100}%):</strong> ₹{calculateVAT().toFixed(2)}
                  </p>
                  <p>
                    <strong>Grand Total:</strong> ₹{calculateGrandTotal().toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="cash-modal-footer">
            <Button variant="secondary" onClick={handleModalClose} disabled={isLoading}>
              Close
            </Button>
            <Button variant="info" onClick={handleEmail} disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Email"}
            </Button>
            <Button variant="primary" onClick={handlePrint} disabled={isLoading}>
              {isLoading ? "Processing..." : "Print Preview"}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </>
  );
}

export default Cash;
