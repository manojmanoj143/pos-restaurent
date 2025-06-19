import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Container,
  Table,
  Card,
  Row,
  Col,
  Spinner,
  Button,
  Modal,
  Form,
} from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "./salespage.css";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaPrint, FaEnvelope, FaArrowLeft } from "react-icons/fa";

const isElectron = window && window.process && window.process.type;
const ipcRenderer = isElectron ? window.require("electron").ipcRenderer : null;

const SalesPage = () => {
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [filterStartTime, setFilterStartTime] = useState("");
  const [filterEndTime, setFilterEndTime] = useState("");
  const [filterInvoiceNo, setFilterInvoiceNo] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterPhone, setFilterPhone] = useState("");
  const [filterItem, setFilterItem] = useState("");
  const [itemOptions, setItemOptions] = useState([]);
  const [itemSearch, setItemSearch] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [filterOrderType, setFilterOrderType] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [warningType, setWarningType] = useState("warning");
  const [pendingAction, setPendingAction] = useState(null);
  const navigate = useNavigate();

  const [columnOrder, setColumnOrder] = useState([
    { key: "invoice_no", label: "Invoice No", align: "left" },
    { key: "customer", label: "Customer", align: "left" },
    { key: "date", label: "Date", align: "center" },
    { key: "time", label: "Time", align: "center" },
    { key: "phoneNumber", label: "Phone Number", align: "center" },
    { key: "orderType", label: "Order Type", align: "center" },
    { key: "total", label: "Total", align: "right" },
    { key: "vat", label: "VAT Amount", align: "right" },
    { key: "grand_total", label: "Grand Total", align: "right" },
    { key: "actions", label: "Actions", align: "center" },
  ]);

  useEffect(() => {
    fetchSalesData();
    fetchItemOptions();
  }, []);

  const fetchSalesData = () => {
    axios
      .get("http://localhost:5000/api/sales")
      .then((response) => {
        const cleanedData = cleanData(response.data);
        setSalesData(cleanedData);
        console.log(
          "Order Types in Sales Data:",
          [...new Set(cleanedData.map((sale) => sale.orderType || "N/A"))]
        );
      })
      .catch((err) => {
        setError("Error fetching sales data: " + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const fetchItemOptions = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/items");
      if (response.data && Array.isArray(response.data)) {
        const items = response.data.map((item) => ({
          name: item.item_name,
          type: "Item",
        }));
        const addons = response.data
          .flatMap((item) => item.addons || [])
          .map((addon) => ({
            name: addon.name1,
            type: "Addon",
          }));
        const combos = response.data
          .flatMap((item) => item.combos || [])
          .map((combo) => ({
            name: combo.name1,
            type: "Combo",
          }));
        const allOptions = [...items, ...addons, ...combos];
        const uniqueOptions = Array.from(
          new Map(allOptions.map((option) => [option.name, option])).values()
        );
        setItemOptions(uniqueOptions);
      }
    } catch (error) {
      console.error("Error fetching item options:", error);
    }
  };

  const cleanData = (data) => {
    if (!Array.isArray(data)) return [];
    const validOrderTypes = ["Dine In", "Takeaway", "Online Delivery"];
    const cleaned = data
      .filter((sale) => {
        const isValid =
          sale.items &&
          sale.items.length > 0 &&
          !isNaN(sale.grand_total) &&
          sale.grand_total !== null &&
          !isNaN(sale.total) &&
          sale.total !== null &&
          sale.invoice_no;
        if (isValid && sale.orderType && !validOrderTypes.includes(sale.orderType)) {
          console.warn(
            `Invalid orderType found: ${sale.orderType} for invoice ${sale.invoice_no}`
          );
        }
        return isValid;
      })
      .map((sale) => ({
        ...sale,
        orderType: sale.orderType || "N/A",
      }));

    const invoiceNos = cleaned.map((sale) => sale.invoice_no);
    const duplicates = invoiceNos.filter(
      (no, index) => invoiceNos.indexOf(no) !== index
    );
    if (duplicates.length > 0) {
      console.warn("Duplicate invoice numbers found:", [...new Set(duplicates)]);
    }
    return cleaned;
  };

  const handleInvoiceClick = (invoiceId, sale) => {
    if (selectedInvoice === invoiceId) {
      setSelectedInvoice(null);
      setShowModal(false);
    } else {
      setSelectedInvoice(invoiceId);
      setInvoiceDetails(sale);
      setShowModal(true);
    }
  };

  const calculateItemPrices = (item) => {
    const baseAmount = parseFloat(item.amount) || parseFloat(item.basePrice) || 0;
    const addonTotal =
      item.addons && item.addons.length > 0
        ? item.addons.reduce(
            (sum, addon) =>
              sum +
              (parseFloat(addon.addon_price) || 0) * (addon.addon_quantity || 1),
            0
          )
        : 0;
    const comboTotal =
      item.selectedCombos && item.selectedCombos.length > 0
        ? item.selectedCombos.reduce(
            (sum, combo) =>
              sum +
              (parseFloat(combo.combo_price) || 0) * (combo.combo_quantity || 1),
            0
          )
        : 0;
    const totalAmount = baseAmount * (item.quantity || 1) + addonTotal + comboTotal;
    return { baseAmount, addonTotal, comboTotal, totalAmount };
  };

  const getItemDisplayName = (item) => {
    return `${item.item_name}${item.selectedSize ? ` (${item.selectedSize})` : ""}`;
  };

  const formatTotal = (value) => {
    return Number(value).toFixed(2);
  };

  const calculateSubtotal = (sale) => {
    return parseFloat(sale.total) || 0;
  };

  const calculateVAT = (sale) => {
    return parseFloat(sale.vat_amount) || 0;
  };

  const calculateGrandTotal = (sale) => {
    return parseFloat(sale.grand_total) || 0;
  };

  const generatePrintableContent = (sale, isPreview = false) => {
    if (!sale) return "";

    const subtotal = calculateSubtotal(sale);
    const vatAmount = calculateVAT(sale);
    const grandTotal = calculateGrandTotal(sale);

    const hasDeliveryAddress =
      sale.deliveryAddress &&
      sale.deliveryAddress.building_name &&
      sale.deliveryAddress.flat_villa_no &&
      sale.deliveryAddress.location;
    const deliveryAddress = hasDeliveryAddress
      ? `${sale.deliveryAddress.building_name}, ${sale.deliveryAddress.flat_villa_no}, ${sale.deliveryAddress.location}`
      : "";

    const cashGivenDisplay =
      sale.payments?.[0]?.mode_of_payment === "CASH" && sale.payments?.[0]?.amount
        ? `
            <tr style="margin-bottom: 5px;">
                <td style="text-align: left; padding: 2px; border: none; line-height: 1.5; color: #000000;">Cash Given:</td>
                <td style="text-align: center; padding: 2px; border: none; line-height: 1.5; color: #000000;">:</td>
                <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; word-break: break-all; color: #000000;">₹${Number(
                  sale.payments[0].amount
                ).toFixed(2)}</td>
            </tr>
            <tr style="margin-bottom: 5px;">
                <td style="text-align: left; padding: 2px; border: none; line-height: 1.5; color: #000000;">Change Returned:</td>
                <td style="text-align: center; padding: 2px; border: none; line-height: 1.5; color: #000000;">:</td>
                <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; word-break: break-all; color: #000000;">₹${Number(
                  sale.payments[0].amount - grandTotal
                ).toFixed(2)}</td>
            </tr>
        `
        : "";

    return `
        <div class="print-preview-content" style="font-family: Arial, sans-serif; width: 88mm; font-size: 12px; padding: 10px; color: #000000; box-sizing: border-box;">
            <div style="text-align: center; margin-bottom: 15px;">
                <h3 style="margin: 0; font-size: 16px; color: #000000;">My Restaurant</h3>
                <p style="margin: 2px 0; color: #000000;">123 Store Street, City</p>
                <p style="margin: 2px 0; color: #000000;">Phone: +91 123-456-7890</p>
                <p style="margin: 2px 0; color: #000000;">GSTIN: 12ABCDE3456F7Z8</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; border: none; margin-bottom: 10px;">
                <tbody>
                    <tr style="margin-bottom: 5px;">
                        <td style="width: 50%; text-align: left; padding: 2px; border: none; line-height: 1.5; color: #000000;">Invoice No</td>
                        <td style="text-align: center; padding: 2px; border: none; line-height: 1.5; color: #000000;">:</td>
                        <td style="width: 50%; text-align: right; padding: 2px; border: none; line-height: 1.5; white-space: nowrap; color: #000000;">${
                          sale.invoice_no
                        }</td>
                    </tr>
                    <tr style="margin-bottom: 5px;">
                        <td style="text-align: left; padding: 2px; border: none; line-height: 1.5; color: #000000;">Customer</td>
                        <td style="text-align: center; padding: 2px; border: none; line-height: 1.5; color: #000000;">:</td>
                        <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; word-break: break-all; color: #000000;">${
                          sale.customer || "N/A"
                        }</td>
                    </tr>
                    <tr style="margin-bottom: 5px;">
                        <td style="text-align: left; padding: 2px; border: none; line-height: 1.5; color: #000000;">Phone</td>
                        <td style="text-align: center; padding: 2px; border: none; line-height: 1.5; color: #000000;">:</td>
                        <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; word-break: break-all; color: #000000;">${
                          sale.phoneNumber || "N/A"
                        }</td>
                    </tr>
                    <tr style="margin-bottom: 5px;">
                        <td style="text-align: left; padding: 2px; border: none; line-height: 1.5; color: #000000;">Email</td>
                        <td style="text-align: center; padding: 2px; border: none; line-height: 1.5; color: #000000;">:</td>
                        <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; word-break: break-all; color: #000000;">${
                          sale.email || "N/A"
                        }</td>
                    </tr>
                    <tr style="margin-bottom: 5px;">
                        <td style="text-align: left; padding: 2px; border: none; line-height: 1.5; color: #000000;">WhatsApp</td>
                        <td style="text-align: center; padding: 2px; border: none; line-height: 1.5; color: #000000;">:</td>
                        <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; word-break: break-all; color: #000000;">${
                          sale.whatsappNumber || "N/A"
                        }</td>
                    </tr>
                    <tr style="margin-bottom: 5px;">
                        <td style="text-align: left; padding: 2px; border: none; line-height: 1.5; color: #000000;">Order Type</td>
                        <td style="text-align: center; padding: 2px; border: none; line-height: 1.5; color: #000000;">:</td>
                        <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; word-break: break-all; color: #000000;">${
                          sale.orderType || "N/A"
                        }</td>
                    </tr>
                    ${
                      sale.tableNumber && sale.tableNumber !== "N/A"
                        ? `
                            <tr style="margin-bottom: 5px;">
                                <td style="text-align: left; padding: 2px; border: none; line-height: 1.5; color: #000000;">Table</td>
                                <td style="text-align: center; padding: 2px; border: none; line-height: 1.5; color: #000000;">:</td>
                                <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; word-break: break-all; color: #000000;">${sale.tableNumber}</td>
                            </tr>
                        `
                        : ""
                    }
                    ${
                      hasDeliveryAddress
                        ? `
                            <tr style="margin-bottom: 5px;">
                                <td style="text-align: left; padding: 2px; border: none; line-height: 1.5; color: #000000;">Delivery Address</td>
                                <td style="text-align: center; padding: 2px; border: none; line-height: 1.5; color: #000000;">:</td>
                                <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; word-break: break-all; color: #000000;">${deliveryAddress}</td>
                            </tr>
                        `
                        : ""
                    }
                    <tr style="margin-bottom: 5px;">
                        <td style="text-align: left; padding: 2px; border: none; line-height: 1.5; color: #000000;">Payment Mode</td>
                        <td style="text-align: center; padding: 2px; border: none; line-height: 1.5; color: #000000;">:</td>
                        <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; word-break: break-all; color: #000000;">${
                          sale.payments?.[0]?.mode_of_payment || "CASH"
                        }</td>
                    </tr>
                    ${cashGivenDisplay}
                    <tr style="margin-bottom: 5px;">
                        <td style="text-align: left; padding: 2px; border: none; line-height: 1.5; color: #000000;">Date</td>
                        <td style="text-align: center; padding: 2px; border: none; line-height: 1.5; color: #000000;">:</td>
                        <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; white-space: nowrap; color: #000000;">${
                          sale.date
                        }</td>
                    </tr>
                    <tr style="margin-bottom: 5px;">
                        <td style="text-align: left; padding: 2px; border: none; line-height: 1.5; color: #000000;">Time</td>
                        <td style="text-align: center; padding: 2px; border: none; line-height: 1.5; color: #000000;">:</td>
                        <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; white-space: nowrap; color: #000000;">${
                          sale.time
                        }</td>
                    </tr>
                </tbody>
            </table>
            <table style="width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #000000;">
                <thead>
                    <tr style="border: 1px solid #000000;">
                        <th style="text-align: left; width: 40%; padding: 4px; border: 1px solid #000000; color: #000000;">Item</th>
                        <th style="text-align: center; width: 15%; padding: 4px; border: 1px solid #000000; color: #000000;">Qty</th>
                        <th style="text-align: right; width: 20%; padding: 4px; border: 1px solid #000000; color: #000000;">Price</th>
                        <th style="text-align: right; width: 25%; padding: 4px; border: 1px solid #000000; color: #000000;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${sale.items
                      .map((item) => {
                        const { baseAmount, addonTotal, comboTotal, totalAmount } =
                          calculateItemPrices(item);
                        return `
                            <tr style="border: 1px solid #000000;">
                                <td style="text-align: left; padding: 4px; border: 1px solid #000000; color: #000000;">${getItemDisplayName(
                                  item
                                )}</td>
                                <td style="text-align: center; padding: 4px; border: 1px solid #000000; color: #000000;">${
                                  item.quantity
                                }</td>
                                <td style="text-align: right; padding: 4px; border: 1px solid #000000; color: #000000;">₹${formatTotal(
                                  baseAmount
                                )}</td>
                                <td style="text-align: right; padding: 4px; border: 1px solid #000000; color: #000000;">₹${formatTotal(
                                  baseAmount * item.quantity
                                )}</td>
                            </tr>
                            ${
                              item.addons && item.addons.length > 0
                                ? item.addons
                                    .map(
                                      (addon) =>
                                        addon.addon_quantity > 0
                                          ? `
                                            <tr style="border: 1px solid #000000;">
                                                <td style="text-align: left; padding-left: 10px; padding: 4px; border: 1px solid #000000; color: #000000;">+ Addon: ${
                                                  addon.addon_name
                                                }${
                                                  addon.size ? ` (${addon.size})` : ""
                                                }</td>
                                                <td style="text-align: center; padding: 4px; border: 1px solid #000000; color: #000000;">${
                                                  addon.addon_quantity
                                                }</td>
                                                <td style="text-align: right; padding: 4px; border: 1px solid #000000; color: #000000;">₹${formatTotal(
                                                  addon.addon_price
                                                )}</td>
                                                <td style="text-align: right; padding: 4px; border: 1px solid #000000; color: #000000;">₹${formatTotal(
                                                  addon.addon_price * addon.addon_quantity
                                                )}</td>
                                            </tr>
                                        `
                                          : ""
                                    )
                                    .join("")
                                : ""
                            }
                            ${
                              item.selectedCombos && item.selectedCombos.length > 0
                                ? item.selectedCombos
                                    .map(
                                      (combo) =>
                                        combo.combo_quantity > 0
                                          ? `
                                            <tr style="border: 1px solid #000000;">
                                                <td style="text-align: left; padding-left: 10px; padding: 4px; border: 1px solid #000000; color: #000000;">+ Combo: ${
                                                  combo.name1
                                                }${
                                                  combo.size ? ` (${combo.size})` : ""
                                                }</td>
                                                <td style="text-align: center; padding: 4px; border: 1px solid #000000; color: #000000;">${
                                                  combo.combo_quantity
                                                }</td>
                                                <td style="text-align: right; padding: 4px; border: 1px solid #000000; color: #000000;">₹${formatTotal(
                                                  combo.combo_price
                                                )}</td>
                                                <td style="text-align: right; padding: 4px; border: 1px solid #000000; color: #000000;">₹${formatTotal(
                                                  combo.combo_price * combo.combo_quantity
                                                )}</td>
                                            </tr>
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
                        <td style="text-align: left; padding: 2px; border: none; line-height: 1.5; font-size: 15px; color: #000000;">Subtotal:</td>
                        <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; font-size: 15px; color: #000000;">₹${subtotal.toFixed(
                          2
                        )}</td>
                    </tr>
                    <tr>
                        <td style="text-align: left; padding: 2px; border: none; line-height: 1.5; font-size: 15px; color: #000000;">VAT (10%):</td>
                        <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; font-size: 15px; color: #000000;">₹${vatAmount.toFixed(
                          2
                        )}</td>
                    </tr>
                    <tr>
                        <td style="text-align: left; padding: 2px; border: none; line-height: 1.5; font-size: 15px; color: #000000;">Grand Total:</td>
                        <td style="text-align: right; padding: 2px; border: none; line-height: 1.5; font-size: 15px; color: #000000;">₹${grandTotal.toFixed(
                          2
                        )}</td>
                    </tr>
                </tbody>
            </table>
            <div style="text-align: center; margin-top: 15px;">
                <p style="margin: 2px 0; color: #000000;">Thank You! Visit Again!</p>
                <p style="margin: 2px 0; color: #000000;">Powered by MyRestaurant</p>
            </div>
        </div>
    `;
  };

  const handleWarningOk = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setWarningMessage("");
    setWarningType("warning");
  };

  const handlePrint = (sale) => {
    const content = generatePrintableContent(sale);

    if (isElectron && ipcRenderer) {
      ipcRenderer.send("open-print-preview", content);
      ipcRenderer.once("print-preview-response", (event, response) => {
        if (!response.success) {
          setWarningMessage("Print preview failed: " + response.error);
          setWarningType("warning");
        }
      });
    } else {
      const win = window.open("", "_blank");
      win.document.write(`
                <html>
                    <head>
                        <title>Receipt - Invoice ${sale.invoice_no}</title>
                        <style>
                            @media print {
                                body { margin: 0; }
                                @page { margin: 0; size: 88mm auto; }
                            }
                            body { margin: 0; font-family: Arial, sans-serif; }
                            .print-preview-content {
                                width: 88mm;
                                font-size: 12px;
                                padding: 10px;
                                color: #000000;
                                box-sizing: border-box;
                            }
                            .print-preview-content table {
                                width: 100%;
                                border-collapse: collapse;
                            }
                            .print-preview-content th,
                            .print-preview-content td {
                                padding: 4px;
                                border: 1px solid #000000;
                            }
                            .print-preview-content th {
                                background: #f8f9fa;
                            }
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
    }
  };

  const handleEmail = async (sale) => {
    const htmlContent = generatePrintableContent(sale);
    const emailData = {
      to: sale.email || "manojmanoj.k@gmail.com",
      subject: `Invoice ${sale.invoice_no} - My Restaurant`,
      html: htmlContent,
    };

    try {
      const response = await axios.post(
        "http://localhost:5000/api/send-email",
        emailData,
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      if (response.data.success) {
        setWarningMessage("Invoice emailed successfully!");
        setWarningType("success");
      } else {
        setWarningMessage("Failed to send email: " + response.data.message);
        setWarningType("warning");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      setWarningMessage(
        "Error sending email: " +
          (error.response?.data?.message || error.message)
      );
      setWarningType("warning");
    }
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split("-");
    return parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : null;
  };

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + (minutes || 0);
  };

  const isTimeInRange = (saleTime, startTime, endTime) => {
    if (!startTime && !endTime) return true;
    const saleMinutes = timeToMinutes(saleTime);
    const startMinutes = startTime ? timeToMinutes(startTime) : -Infinity;
    const endMinutes = endTime ? timeToMinutes(endTime) + 59 : Infinity;
    return saleMinutes >= startMinutes && saleMinutes <= endMinutes;
  };

  const normalizeOrderType = (orderType) => {
    if (!orderType) return "";
    const normalized = orderType.trim().toLowerCase();
    const orderTypeMap = {
      "dine in": "Dine In",
      "dine-in": "Dine In",
      takeaway: "Takeaway",
      "take away": "Takeaway",
      "online delivery": "Online Delivery",
      delivery: "Online Delivery",
    };
    return orderTypeMap[normalized] || orderType;
  };

  const hourlyTimes = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, "0");
    return `${hour}:00`;
  });

  const handleItemSearch = (e) => {
    setItemSearch(e.target.value);
    setShowItemDropdown(true);
  };

  const handleItemSelect = (name) => {
    setFilterItem(name);
    setItemSearch(name);
    setShowItemDropdown(false);
  };

  const handleItemInputBlur = () => {
    setTimeout(() => setShowItemDropdown(false), 200);
  };

  const filteredItemOptions = itemOptions.filter((option) =>
    option.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const filteredSales = salesData.filter((sale) => {
    const saleDate = parseDate(sale.date);
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    const dateMatch =
      (!from && !to) ||
      (from && !to && saleDate && saleDate >= from) ||
      (from && to && saleDate && saleDate >= from && saleDate <= to);

    const timeMatch = isTimeInRange(sale.time, filterStartTime, filterEndTime);

    const invoiceMatch = filterInvoiceNo
      ? sale.invoice_no.toLowerCase().includes(filterInvoiceNo.toLowerCase())
      : true;

    const customerMatch = filterCustomer
      ? sale.customer?.toLowerCase().includes(filterCustomer.toLowerCase())
      : true;

    const phoneMatch = filterPhone
      ? sale.phoneNumber?.toLowerCase().includes(filterPhone.toLowerCase())
      : true;

    const itemMatch = filterItem
      ? sale.items.some((item) => {
          const itemNameMatch = item.item_name
            .toLowerCase()
            .includes(filterItem.toLowerCase());
          const addonMatch =
            item.addons &&
            item.addons.some((addon) =>
              addon.addon_name.toLowerCase().includes(filterItem.toLowerCase())
            );
          const comboMatch =
            item.selectedCombos &&
            item.selectedCombos.some((combo) =>
              combo.name1.toLowerCase().includes(filterItem.toLowerCase())
            );
          return itemNameMatch || addonMatch || comboMatch;
        })
      : true;

    const orderTypeMatch = filterOrderType
      ? normalizeOrderType(sale.orderType).toLowerCase() ===
        normalizeOrderType(filterOrderType).toLowerCase()
      : true;

    return (
      dateMatch &&
      timeMatch &&
      invoiceMatch &&
      customerMatch &&
      phoneMatch &&
      itemMatch &&
      orderTypeMatch
    );
  });

  const handleBack = () => {
    navigate("/frontpage");
  };

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData("text/plain", index);
    e.target.classList.add("dragging");
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.target.classList.add("drag-over");
  };

  const handleDragLeave = (e) => {
    e.target.classList.remove("drag-over");
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    const newOrder = [...columnOrder];
    const [draggedColumn] = newOrder.splice(sourceIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);
    setColumnOrder(newOrder);
    e.target.classList.remove("drag-over");
    document.querySelectorAll(".table-header th").forEach((th) => {
      th.classList.remove("dragging");
    });
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove("dragging");
    document.querySelectorAll(".table-header th").forEach((th) => {
      th.classList.remove("drag-over");
    });
  };

  if (loading)
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" style={{ color: "#3498db" }} />
      </Container>
    );
  if (error) return <div className="alert alert-danger m-4">{error}</div>;
  if (salesData.length === 0)
    return (
      <div className="text-center mt-5" style={{ color: "#000000" }}>
        No sales data available.
      </div>
    );

  return (
    <Container className="mt-4 sales-page-container">
      {warningMessage && (
        <div
          className={`alert alert-${warningType} text-center alert-dismissible fade show`}
          role="alert"
        >
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
      <div className="mb-4">
        <Button variant="outline-primary" onClick={handleBack} className="back-btn">
          <FaArrowLeft /> Back
        </Button>
      </div>

      <Form.Group className="mb-4 filter-group d-flex flex-wrap gap-3">
        <div className="filter-item">
          <Form.Label className="fw-bold">From Date:</Form.Label>
          <DatePicker
            selected={fromDate}
            onChange={(date) => setFromDate(date)}
            dateFormat="yyyy-MM-dd"
            className="form-control shadow-sm"
          />
        </div>
        <div className="filter-item">
          <Form.Label className="fw-bold">To Date:</Form.Label>
          <DatePicker
            selected={toDate}
            onChange={(date) => setToDate(date)}
            dateFormat="yyyy-MM-dd"
            className="form-control shadow-sm"
            minDate={fromDate}
          />
        </div>
        <div className="filter-item">
          <Form.Label className="fw-bold">Start Time:</Form.Label>
          <Form.Select
            value={filterStartTime}
            onChange={(e) => setFilterStartTime(e.target.value)}
            className="form-control shadow-sm time-dropdown"
          >
            <option value="">Select Start Time</option>
            {hourlyTimes.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </Form.Select>
        </div>
        <div className="filter-item">
          <Form.Label className="fw-bold">End Time:</Form.Label>
          <Form.Select
            value={filterEndTime}
            onChange={(e) => setFilterEndTime(e.target.value)}
            className="form-control shadow-sm time-dropdown"
          >
            <option value="">Select End Time</option>
            {hourlyTimes.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </Form.Select>
        </div>
        <div className="filter-item">
          <Form.Label className="fw-bold">Invoice No:</Form.Label>
          <Form.Control
            type="text"
            value={filterInvoiceNo}
            onChange={(e) => setFilterInvoiceNo(e.target.value)}
            placeholder="Filter by invoice no"
            className="shadow-sm"
          />
        </div>
        <div className="filter-item">
          <Form.Label className="fw-bold">Customer Name:</Form.Label>
          <Form.Control
            type="text"
            value={filterCustomer}
            onChange={(e) => setFilterCustomer(e.target.value)}
            placeholder="Filter by customer"
            className="shadow-sm"
          />
        </div>
        <div className="filter-item">
          <Form.Label className="fw-bold">Phone Number:</Form.Label>
          <Form.Control
            type="text"
            value={filterPhone}
            onChange={(e) => setFilterPhone(e.target.value)}
            placeholder="Filter by phone"
            className="shadow-sm"
          />
        </div>
        <div className="filter-item position-relative">
          <Form.Label className="fw-bold">Item Name:</Form.Label>
          <Form.Control
            type="text"
            value={itemSearch}
            onChange={handleItemSearch}
            onFocus={() => setShowItemDropdown(true)}
            onBlur={handleItemInputBlur}
            placeholder="Filter by item name"
            className="shadow-sm"
          />
          {showItemDropdown && (
            <div className="item-dropdown">
              {filteredItemOptions.length > 0 ? (
                filteredItemOptions.map((option, index) => (
                  <div
                    key={index}
                    className="item-option"
                    onMouseDown={() => handleItemSelect(option.name)}
                  >
                    {option.name} ({option.type})
                  </div>
                ))
              ) : (
                <div className="item-option">No items found</div>
              )}
            </div>
          )}
        </div>
        <div className="filter-item">
          <Form.Label className="fw-bold">Order Type:</Form.Label>
          <Form.Select
            value={filterOrderType}
            onChange={(e) => setFilterOrderType(e.target.value)}
            className="form-control shadow-sm"
          >
            <option value="">All Order Types</option>
            <option value="Dine In">Dine In</option>
            <option value="Takeaway">Takeaway</option>
            <option value="Online Delivery">Online Delivery</option>
          </Form.Select>
        </div>
      </Form.Group>

      <Row>
        <Col>
          <Card className="shadow-lg sales-card">
            <Card.Body>
              <Card.Title className="text-primary fw-bold mb-4">
                {fromDate ||
                toDate ||
                filterStartTime ||
                filterEndTime ||
                filterInvoiceNo ||
                filterCustomer ||
                filterPhone ||
                filterItem ||
                filterOrderType
                  ? "Filtered Sales Data"
                  : "All Sales Data"}
              </Card.Title>
              {filteredSales.length === 0 ? (
                <div className="text-center" style={{ color: "#000000" }}>
                  No sales match the selected filters.
                </div>
              ) : (
                <Table responsive bordered striped hover className="sales-table">
                  <thead className="table-header">
                    <tr>
                      {columnOrder.map((col, index) => (
                        <th
                          key={col.key}
                          style={{ textAlign: col.align }}
                          draggable={col.key !== "actions"}
                          onDragStart={(e) =>
                            col.key !== "actions" && handleDragStart(e, index)
                          }
                          onDragOver={(e) => col.key !== "actions" && handleDragOver(e)}
                          onDragLeave={(e) => col.key !== "actions" && handleDragLeave(e)}
                          onDrop={(e) => col.key !== "actions" && handleDrop(e, index)}
                          onDragEnd={(e) => col.key !== "actions" && handleDragEnd(e)}
                          className={col.key !== "actions" ? "draggable-header" : ""}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((sale) => (
                      <tr
                        key={sale._id}
                        onClick={() => handleInvoiceClick(sale._id, sale)}
                        className="table-row"
                      >
                        {columnOrder.map((col) => (
                          <td key={col.key} style={{ textAlign: col.align }}>
                            {col.key === "invoice_no" && sale.invoice_no}
                            {col.key === "customer" && sale.customer}
                            {col.key === "date" && sale.date}
                            {col.key === "time" && sale.time}
                            {col.key === "phoneNumber" && (sale.phoneNumber || "N/A")}
                            {col.key === "orderType" && (sale.orderType || "N/A")}
                            {col.key === "total" && `₹${calculateSubtotal(sale).toFixed(2)}`}
                            {col.key === "vat" && `₹${calculateVAT(sale).toFixed(2)}`}
                            {col.key === "grand_total" &&
                              `₹${calculateGrandTotal(sale).toFixed(2)}`}
                            {col.key === "actions" && (
                              <>
                                <Button
                                  size="sm"
                                  className="me-2 action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrint(sale);
                                  }}
                                >
                                  <FaPrint /> Print
                                </Button>
                                <Button
                                  size="sm"
                                  className="action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEmail(sale);
                                  }}
                                >
                                  <FaEnvelope /> Email
                                </Button>
                              </>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        size="lg"
        className="sales-modal"
      >
        <Modal.Header closeButton className="modal-header">
          <Modal.Title style={{ color: "#000000" }}>Invoice Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {invoiceDetails && (
            <div
              className="print-preview"
              dangerouslySetInnerHTML={{
                __html: generatePrintableContent(invoiceDetails, true),
              }}
            />
          )}
        </Modal.Body>
        <Modal.Footer />
      </Modal>
    </Container>
  );
};

export default SalesPage;