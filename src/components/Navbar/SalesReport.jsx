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
  Form,
} from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "./salesreport.css";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaArrowLeft, FaPrint, FaFilePdf, FaFileExcel } from "react-icons/fa";

const SalesReport = () => {
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [filterStartTime, setFilterStartTime] = useState("");
  const [filterEndTime, setFilterEndTime] = useState("");
  const [filterInvoiceNo, setFilterInvoiceNo] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterPhone, setFilterPhone] = useState("");
  const [filterItem, setFilterItem] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [warningType, setWarningType] = useState("warning");
  const [pendingAction, setPendingAction] = useState(null);
  const [selectedFilterType, setSelectedFilterType] = useState("date");
  const navigate = useNavigate();

  // Fetch sales data on component mount
  useEffect(() => {
    fetchSalesData();
  }, []);

  const fetchSalesData = () => {
    axios
      .get("http://localhost:5000/api/sales")
      .then((response) => {
        const cleanedData = cleanData(response.data);
        setSalesData(cleanedData);
      })
      .catch((err) => {
        setError("Error fetching sales data: " + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Clean and validate sales data
  const cleanData = (data) => {
    return Array.isArray(data)
      ? data.filter(
          (sale) =>
            sale.items &&
            sale.items.length > 0 &&
            !isNaN(sale.grand_total) &&
            sale.grand_total !== null &&
            !isNaN(sale.total) &&
            sale.total !== null
        )
      : [];
  };

  // Calculate prices for an item, using backend's amount field
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

  // Format numbers to two decimal places
  const formatTotal = (value) => {
    return Number(value).toFixed(2);
  };

  // Use backend's total for subtotal
  const calculateSubtotal = (sale) => {
    return parseFloat(sale.total) || 0;
  };

  // Use backend's vat_amount for VAT
  const calculateVAT = (sale) => {
    return parseFloat(sale.vat_amount) || 0;
  };

  // Use backend's grand_total for grand total
  const calculateGrandTotal = (sale) => {
    return parseFloat(sale.grand_total) || 0;
  };

  // Parse date string to Date object
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split("-");
    return parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : null;
  };

  // Convert time string to minutes for comparison
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + (minutes || 0);
  };

  // Check if sale time is within the selected range
  const isTimeInRange = (saleTime, startTime, endTime) => {
    if (!startTime && !endTime) return true;
    const saleMinutes = timeToMinutes(saleTime);
    const startMinutes = startTime ? timeToMinutes(startTime) : -Infinity;
    const endMinutes = endTime ? timeToMinutes(endTime) + 59 : Infinity;
    return saleMinutes >= startMinutes && saleMinutes <= endMinutes;
  };

  // Generate hourly time slots for dropdowns
  const hourlyTimes = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, "0");
    return `${hour}:00`;
  });

  // Get unique customers for dropdown
  const uniqueCustomers = [
    ...new Set(salesData.map((sale) => sale.customer).filter(Boolean)),
  ];

  // Months for dropdown
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Validate year input
  const validateYear = (year) => {
    const yearNum = parseInt(year);
    return (
      year.length === 4 &&
      !isNaN(yearNum) &&
      yearNum >= 1900 &&
      yearNum <= new Date().getFullYear()
    );
  };

  // Filter sales data based on user inputs
  const filteredSales = salesData.filter((sale) => {
    const saleDate = parseDate(sale.date);

    const dateMatch =
      selectedFilterType === "date"
        ? (!fromDate && !toDate) ||
          (fromDate && !toDate && saleDate && saleDate >= fromDate) ||
          (fromDate &&
            toDate &&
            saleDate &&
            saleDate >= fromDate &&
            saleDate <= toDate)
        : true;

    const monthMatch =
      selectedFilterType === "month" &&
      filterMonth &&
      filterYear &&
      validateYear(filterYear)
        ? saleDate &&
          saleDate.getMonth() === months.indexOf(filterMonth) &&
          saleDate.getFullYear() === parseInt(filterYear)
        : true;

    const yearMatch =
      selectedFilterType === "year" && filterYear && validateYear(filterYear)
        ? saleDate && saleDate.getFullYear() === parseInt(filterYear)
        : true;

    const customerMatch =
      selectedFilterType === "customer" && filterCustomer
        ? sale.customer?.toLowerCase() === filterCustomer.toLowerCase()
        : true;

    const timeMatch = isTimeInRange(sale.time, filterStartTime, filterEndTime);

    const invoiceMatch = filterInvoiceNo
      ? sale.invoice_no.toLowerCase().includes(filterInvoiceNo.toLowerCase())
      : true;

    const phoneMatch = filterPhone
      ? sale.phoneNumber?.toLowerCase().includes(filterPhone.toLowerCase())
      : true;

    const itemMatch = filterItem
      ? sale.items.some((item) =>
          item.item_name.toLowerCase().includes(filterItem.toLowerCase())
        )
      : true;

    return (
      dateMatch &&
      monthMatch &&
      yearMatch &&
      customerMatch &&
      timeMatch &&
      invoiceMatch &&
      phoneMatch &&
      itemMatch
    );
  });

  // Calculate total grand total for filtered sales
  const totalGrandTotal = filteredSales.reduce(
    (sum, sale) => sum + calculateGrandTotal(sale),
    0
  );

  // Handle warning message dismissal
  const handleWarningOk = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setWarningMessage("");
    setWarningType("warning");
  };

  // Navigate back to front page
  const handleBack = () => {
    navigate("/frontpage");
  };

  // Generate HTML content for printing or PDF export
  const generatePrintableContent = (sales, filterType) => {
    const filterDescription =
      filterType === "customer"
        ? `Customer: ${filterCustomer || "All"}`
        : filterType === "date"
        ? `Date Range: ${fromDate ? fromDate.toLocaleDateString() : "Any"} to ${
            toDate ? toDate.toLocaleDateString() : "Any"
          }${
            filterStartTime || filterEndTime
              ? `, Time: ${filterStartTime || "Start"} to ${
                  filterEndTime || "End"
                }`
              : ""
          }`
        : filterType === "month"
        ? `Month: ${filterMonth} ${filterYear}`
        : filterType === "year"
        ? `Year: ${filterYear}`
        : "All Sales";

    return `
      <div style="font-family: Arial, sans-serif; width: 210mm; font-size: 12px; padding: 20px; color: #000000; box-sizing: border-box;">
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000000; padding-bottom: 10px;">
          <h3 style="margin: 0; font-size: 18px; color: #000000;">My Restaurant</h3>
          <p style="margin: 4px 0; font-size: 12px;">123 Store Street, City</p>
          <p style="margin: 4px 0; font-size: 12px;">Phone: +91 123-456-7890</p>
          <p style="margin: 4px 0; font-size: 12px;">GSTIN: 12ABCDE3456F7Z8</p>
        </div>
        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0; font-size: 14px; text-align: center;">Sales Report - ${filterDescription}</h4>
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #000000; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f0f0f0; border-bottom: 2px solid #000000;">
              <th style="text-align: left; padding: 8px; font-size: 12px; border-right: 1px solid #000000;">Invoice No</th>
              <th style="text-align: left; padding: 8px; font-size: 12px; border-right: 1px solid #000000;">Customer</th>
              <th style="text-align: center; padding: 8px; font-size: 12px; border-right: 1px solid #000000;">Date</th>
              <th style="text-align: center; padding: 8px; font-size: 12px; border-right: 1px solid #000000;">Time</th>
              <th style="text-align: center; padding: 8px; font-size: 12px; border-right: 1px solid #000000;">Phone Number</th>
              <th style="text-align: right; padding: 8px; font-size: 12px; border-right: 1px solid #000000;">Total</th>
              <th style="text-align: right; padding: 8px; font-size: 12px; border-right: 1px solid #000000;">VAT (10%)</th>
              <th style="text-align: right; padding: 8px; font-size: 12px;">Grand Total</th>
            </tr>
          </thead>
          <tbody>
            ${sales
              .map(
                (sale) => `
                  <tr style="border-bottom: 1px solid #d3d3d3;">
                    <td style="text-align: left; padding: 8px; font-size: 12px; border-right: 1px solid #d3d3d3;">${sale.invoice_no}</td>
                    <td style="text-align: left; padding: 8px; font-size: 12px; border-right: 1px solid #d3d3d3;">${sale.customer || "N/A"}</td>
                    <td style="text-align: center; padding: 8px; font-size: 12px; border-right: 1px solid #d3d3d3;">${sale.date}</td>
                    <td style="text-align: center; padding: 8px; font-size: 12px; border-right: 1px solid #d3d3d3;">${sale.time}</td>
                    <td style="text-align: center; padding: 8px; font-size: 12px; border-right: 1px solid #d3d3d3;">${sale.phoneNumber || "N/A"}</td>
                    <td style="text-align: right; padding: 8px; font-size: 12px; border-right: 1px solid #d3d3d3;">₹${formatTotal(
                      calculateSubtotal(sale)
                    )}</td>
                    <td style="text-align: right; padding: 8px; font-size: 12px; border-right: 1px solid #d3d3d3;">₹${formatTotal(
                      calculateVAT(sale)
                    )}</td>
                    <td style="text-align: right; padding: 8px; font-size: 12px;">₹${formatTotal(
                      calculateGrandTotal(sale)
                    )}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
          <tfoot>
            <tr style="border-top: 2px solid #000000;">
              <td colspan="7" style="text-align: right; padding: 8px; font-size: 12px; font-weight: bold;">Total Grand Total:</td>
              <td style="text-align: right; padding: 8px; font-size: 12px; font-weight: bold;">₹${formatTotal(
                totalGrandTotal
              )}</td>
            </tr>
          </tfoot>
        </table>
        <div style="text-align: center; margin-top: 20px; border-top: 2px solid #000000; padding-top: 10px;">
          <p style="margin: 4px 0; font-size: 12px;">Thank You! Visit Again!</p>
          <p style="margin: 4px 0; font-size: 12px;">Powered by MyRestaurant</p>
        </div>
      </div>
    `;
  };

  // Handle print action
  const handlePrint = () => {
    const content = generatePrintableContent(filteredSales, selectedFilterType);

    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <title>Sales Report</title>
          <style>
            @media print {
              body { margin: 0; }
              @page { margin: 10mm; size: A4; }
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
  };

  // Handle PDF export (triggers print dialog for PDF saving)
  const handleExportPDF = () => {
    const content = generatePrintableContent(filteredSales, selectedFilterType);

    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <title>Sales Report</title>
          <style>
            @media print {
              body { margin: 0; }
              @page { margin: 10mm; size: A4; }
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
    win.print(); // User can save as PDF from the print dialog
    win.close();
  };

  // Handle Excel export using SheetJS
  const handleExportExcel = () => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.async = true;
    script.onload = () => {
      const tableData = filteredSales.map((sale) => ({
        "Invoice No": sale.invoice_no,
        Customer: sale.customer || "N/A",
        Date: sale.date,
        Time: sale.time,
        "Phone Number": sale.phoneNumber || "N/A",
        Total: `₹${formatTotal(calculateSubtotal(sale))}`,
        "VAT (10%)": `₹${formatTotal(calculateVAT(sale))}`,
        "Grand Total": `₹${formatTotal(calculateGrandTotal(sale))}`,
      }));

      // Add Total Grand Total as a separate row
      tableData.push({
        "Invoice No": "",
        Customer: "",
        Date: "",
        Time: "",
        "Phone Number": "",
        Total: "",
        "VAT (10%)": "Total Grand Total:",
        "Grand Total": `₹${formatTotal(totalGrandTotal)}`,
      });

      const ws = XLSX.utils.json_to_sheet(tableData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
      XLSX.writeFile(wb, "sales_report.xlsx");
    };
    script.onerror = () => {
      setWarningMessage("Failed to load Excel export library. Please try again.");
      setWarningType("danger");
    };
    document.body.appendChild(script);
  };

  // Render loading, error, or empty states
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
    <Container
      fluid
      className="mt-4 sales-page-container"
      style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}
    >
      {warningMessage && (
        <div
          className={`alert alert-${warningType} text-center alert-dismissible fade show`}
          role="alert"
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1050,
            minWidth: "300px",
          }}
        >
          {warningMessage}
          <button
            type="button"
            className="btn btn-primary ms-3"
            onClick={handleWarningOk}
            aria-label="Close warning"
          >
            OK
          </button>
        </div>
      )}
      <Row>
        {/* Sidebar for Filters */}
        <Col
          md={3}
          className="sidebar"
          style={{
            position: "sticky",
            top: "20px",
            height: "calc(100vh - 40px)",
            overflowY: "auto",
            backgroundColor: "#ffffff",
            borderRight: "1px solid #dee2e6",
            padding: "20px",
          }}
        >
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Card.Title
                className="text-primary fw-bold mb-4"
                style={{ fontSize: "1.5rem" }}
              >
                Filters
              </Card.Title>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Filter Type</Form.Label>
                <Form.Select
                  value={selectedFilterType}
                  onChange={(e) => {
                    setSelectedFilterType(e.target.value);
                    setFromDate(null);
                    setToDate(null);
                    setFilterMonth("");
                    setFilterYear("");
                    setFilterCustomer("");
                  }}
                  className="shadow-sm"
                  aria-label="Select filter type"
                >
                  <option value="default">Select Filter</option>
                  <option value="date">Date-wise</option>
                  <option value="month">Month-wise</option>
                  <option value="year">Year-wise</option>
                  <option value="customer">Customer-wise</option>
                </Form.Select>
              </Form.Group>

              {selectedFilterType === "date" && (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">From Date:</Form.Label>
                    <DatePicker
                      selected={fromDate}
                      onChange={(date) => setFromDate(date)}
                      dateFormat="yyyy-MM-dd"
                      className="form-control shadow-sm"
                      placeholderText="Select start date"
                      aria-label="Select start date"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">To Date:</Form.Label>
                    <DatePicker
                      selected={toDate}
                      onChange={(date) => setToDate(date)}
                      dateFormat="yyyy-MM-dd"
                      className="form-control shadow-sm"
                      minDate={fromDate}
                      placeholderText="Select end date"
                      aria-label="Select end date"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">From Time:</Form.Label>
                    <Form.Select
                      value={filterStartTime}
                      onChange={(e) => setFilterStartTime(e.target.value)}
                      className="form-control shadow-sm time-dropdown"
                      aria-label="Select start time"
                    >
                      <option value="">Select Start Time</option>
                      {hourlyTimes.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">To Time:</Form.Label>
                    <Form.Select
                      value={filterEndTime}
                      onChange={(e) => setFilterEndTime(e.target.value)}
                      className="form-control shadow-sm time-dropdown"
                      aria-label="Select end time"
                    >
                      <option value="">Select End Time</option>
                      {hourlyTimes.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </>
              )}

              {selectedFilterType === "month" && (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Month</Form.Label>
                    <Form.Select
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="shadow-sm"
                      aria-label="Select month"
                    >
                      <option value="">Select Month</option>
                      {months.map((month) => (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Year</Form.Label>
                    <Form.Control
                      type="text"
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                      placeholder="Enter year (e.g., 2025)"
                      className="shadow-sm"
                      aria-label="Yearly"
                      maxLength="4"
                      pattern="\d{4}"
                    />
                  </Form.Group>
                </>
              )}

              {selectedFilterType === "year" && (
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Year</Form.Label>
                  <Form.Control
                    type="text"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    placeholder="Enter year (e.g., 2025)"
                    className="shadow-sm"
                    aria-label="Yearly"
                    maxLength="4"
                    pattern="\d{4}"
                  />
                </Form.Group>
              )}

              {selectedFilterType === "customer" && (
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Customer</Form.Label>
                  <Form.Select
                    value={filterCustomer}
                    onChange={(e) => setFilterCustomer(e.target.value)}
                    className="shadow-sm"
                    aria-label="Select customer"
                  >
                    <option value="">Select Customer</option>
                    {uniqueCustomers.map((customer) => (
                      <option key={customer} value={customer}>
                        {customer}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              )}

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Invoice No:</Form.Label>
                <Form.Control
                  type="text"
                  value={filterInvoiceNo}
                  onChange={(e) => setFilterInvoiceNo(e.target.value)}
                  placeholder="Filter by invoice no"
                  className="shadow-sm"
                  aria-label="Filter by invoice number"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Phone Number:</Form.Label>
                <Form.Control
                  type="text"
                  value={filterPhone}
                  onChange={(e) => setFilterPhone(e.target.value)}
                  placeholder="Filter by phone"
                  className="shadow-sm"
                  aria-label="Filter by phone number"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Item Name:</Form.Label>
                <Form.Control
                  type="text"
                  value={filterItem}
                  onChange={(e) => setFilterItem(e.target.value)}
                  placeholder="Filter by item name"
                  className="shadow-sm"
                  aria-label="Filter by item name"
                />
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>

        {/* Main Content */}
        <Col md={9} style={{ padding: "20px" }}>
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <Button
              variant="outline-primary"
              onClick={handleBack}
              className="back-btn"
              aria-label="Previous page"
              style={{ borderRadius: "8px", padding: "10px 20px" }}
            >
              <FaArrowLeft /> Back
            </Button>
            <div className="d-flex gap-2 flex-wrap">
              <Button
                variant="primary"
                onClick={handlePrint}
                className="print-btn"
                aria-label="Print"
                style={{ borderRadius: "8px", padding: "10px 20px" }}
              >
                <FaPrint /> Print Report
              </Button>
              <Button
                variant="success"
                onClick={handleExportExcel}
                className="export-excel-btn"
                aria-label="Export to Excel"
                style={{ borderRadius: "8px", padding: "10px 20px" }}
              >
                <FaFileExcel /> Export Excel
              </Button>
              <Button
                variant="danger"
                onClick={handleExportPDF}
                className="export-pdf-btn"
                aria-label="Export to PDF"
                style={{ borderRadius: "8px", padding: "10px 20px" }}
              >
                <FaFilePdf /> Export PDF
              </Button>
            </div>
          </div>
          <Card
            className="shadow-lg sales-card border-0"
            style={{ borderRadius: "12px" }}
          >
            <Card.Body>
              <Card.Title
                className="text-primary fw-bold mb-4"
                style={{ fontSize: "1.75rem" }}
              >
                {selectedFilterType === "customer" && filterCustomer
                  ? `Customer-wise Sales Report: ${filterCustomer}`
                  : selectedFilterType === "date"
                  ? `Date-wise Sales Report`
                  : selectedFilterType === "month" && filterMonth && filterYear
                  ? `Month-wise Sales Report: ${filterMonth} ${filterYear}`
                  : selectedFilterType === "year" && filterYear
                  ? `Year-wise Sales Report: ${filterYear}`
                  : "All Sales Report"}
              </Card.Title>
              <Table
                responsive
                striped
                hover
                className="sales-table"
                style={{ borderRadius: "8px", overflow: "hidden" }}
              >
                <thead
                  className="table-header"
                  style={{ backgroundColor: "#3498db", color: "#ffffff" }}
                >
                  <tr>
                    <th style={{ textAlign: "left", padding: "12px" }}>
                      Invoice No
                    </th>
                    <th style={{ textAlign: "left", padding: "12px" }}>
                      Customer
                    </th>
                    <th style={{ textAlign: "center", padding: "12px" }}>Date</th>
                    <th style={{ textAlign: "center", padding: "12px" }}>Time</th>
                    <th style={{ textAlign: "center", padding: "12px" }}>
                      Phone Number
                    </th>
                    <th style={{ textAlign: "right", padding: "12px" }}>
                      Total
                    </th>
                    <th style={{ textAlign: "right", padding: "12px" }}>
                      VAT (10%)
                    </th>
                    <th style={{ textAlign: "right", padding: "12px" }}>
                      Grand Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale) => (
                    <tr
                      key={sale.invoice_no}
                      className="table-row"
                      style={{ transition: "background-color 0.2s" }}
                    >
                      <td style={{ textAlign: "left", padding: "12px" }}>
                        {sale.invoice_no}
                      </td>
                      <td style={{ textAlign: "left", padding: "12px" }}>
                        {sale.customer || "N/A"}
                      </td>
                      <td style={{ textAlign: "center", padding: "12px" }}>
                        {sale.date}
                      </td>
                      <td style={{ textAlign: "center", padding: "12px" }}>
                        {sale.time}
                      </td>
                      <td style={{ textAlign: "center", padding: "12px" }}>
                        {sale.phoneNumber || "N/A"}
                      </td>
                      <td style={{ textAlign: "right", padding: "12px" }}>
                        ₹{formatTotal(calculateSubtotal(sale))}
                      </td>
                      <td style={{ textAlign: "right", padding: "12px" }}>
                        ₹{formatTotal(calculateVAT(sale))}
                      </td>
                      <td style={{ textAlign: "right", padding: "12px" }}>
                        ₹{formatTotal(calculateGrandTotal(sale))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colSpan="7"
                      style={{
                        textAlign: "right",
                        padding: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      Total Grand Total:
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        padding: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      ₹{formatTotal(totalGrandTotal)}
                    </td>
                  </tr>
                </tfoot>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SalesReport;