import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaShoppingCart, FaTruck, FaFileInvoice, FaChartBar, FaTrash, FaUser, FaPrint } from 'react-icons/fa';

function WarningMessage({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: '#fff3cd',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid #ffeeba',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      zIndex: 1000,
      maxWidth: '400px',
      width: '90%',
      textAlign: 'center'
    }}>
      <p style={{ color: '#856404', marginBottom: '20px', fontSize: '1.1rem' }}>{message}</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
        <button
          onClick={onConfirm}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3498db',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'background-color 0.3s'
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = '#2980b9')}
          onMouseOut={(e) => (e.target.style.backgroundColor = '#3498db')}
        >
          Confirm
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '10px 20px',
            backgroundColor: '#e74c3c',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'background-color 0.3s'
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = '#c0392b')}
          onMouseOut={(e) => (e.target.style.backgroundColor = '#e74c3c')}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Purchase() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('item');
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [purchaseReceipts, setPurchaseReceipts] = useState([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [showWarning, setShowWarning] = useState(null);
  const [warningAction, setWarningAction] = useState(null);

  // Form states
  const [itemForm, setItemForm] = useState({ name: '', mainUnit: '', subUnit: '', conversionFactor: '' });
  const [supplierForm, setSupplierForm] = useState({ name: '', shopName: '', address: '', phone: '', email: '' });
  const [poForm, setPoForm] = useState({ supplierId: '', date: '', items: [{ itemId: '', quantity: '', unit: 'main' }] });
  const [prForm, setPrForm] = useState({ poId: '', date: '', items: [] });
  const [piForm, setPiForm] = useState({ poId: '', prId: '', date: '', supplier: '', items: [] });

  // Fetch data from backend with array validation
  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/purchase_items');
      if (Array.isArray(response.data)) {
        setItems(response.data);
      } else {
        setItems([]);
        setError('Invalid data format received for items');
      }
    } catch (err) {
      setError(`Failed to fetch items: ${err.response?.data?.error || err.message}`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/suppliers');
      if (Array.isArray(response.data)) {
        setSuppliers(response.data);
      } else {
        setSuppliers([]);
        setError('Invalid data format received for suppliers');
      }
    } catch (err) {
      setError(`Failed to fetch suppliers: ${err.response?.data?.error || err.message}`);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/purchase_orders');
      if (Array.isArray(response.data)) {
        setPurchaseOrders(response.data);
      } else {
        setPurchaseOrders([]);
        setError('Invalid data format received for purchase orders');
      }
    } catch (err) {
      setError(`Failed to fetch purchase orders: ${err.response?.data?.error || err.message}`);
      setPurchaseOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseReceipts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/purchase_receipts');
      if (Array.isArray(response.data)) {
        setPurchaseReceipts(response.data);
      } else {
        setPurchaseReceipts([]);
        setError('Invalid data format received for purchase receipts');
      }
    } catch (err) {
      setError(`Failed to fetch purchase receipts: ${err.response?.data?.error || err.message}`);
      setPurchaseReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseInvoices = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/purchase_invoices');
      if (Array.isArray(response.data)) {
        setPurchaseInvoices(response.data);
      } else {
        setPurchaseInvoices([]);
        setError('Invalid data format received for purchase invoices');
      }
    } catch (err) {
      setError(`Failed to fetch purchase invoices: ${err.response?.data?.error || err.message}`);
      setPurchaseInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    fetchItems();
    fetchSuppliers();
    fetchPurchaseOrders();
    fetchPurchaseReceipts();
    fetchPurchaseInvoices();
  }, []);

  // Sync form states with editing states
  useEffect(() => {
    if (editingItem) {
      setItemForm({
        name: editingItem.name,
        mainUnit: editingItem.mainUnit,
        subUnit: editingItem.subUnit,
        conversionFactor: editingItem.conversionFactor
      });
    } else {
      setItemForm({ name: '', mainUnit: '', subUnit: '', conversionFactor: '' });
    }
  }, [editingItem]);

  useEffect(() => {
    if (editingSupplier) {
      setSupplierForm({
        name: editingSupplier.name,
        shopName: editingSupplier.shopName,
        address: editingSupplier.address,
        phone: editingSupplier.phone,
        email: editingSupplier.email
      });
    } else {
      setSupplierForm({ name: '', shopName: '', address: '', phone: '', email: '' });
    }
  }, [editingSupplier]);

  // Item handlers
  const handleItemSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm(itemForm, 'item');
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      setLoading(true);
      setMessage('');
      setError(null);
      const response = await axios.post('http://localhost:5000/api/purchase_items', itemForm);
      setItems([...items, response.data.item]);
      setItemForm({ name: '', mainUnit: '', subUnit: '', conversionFactor: '' });
      setMessage(response.data.message);
    } catch (err) {
      setError(`Failed to add item: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleItemUpdate = async (e) => {
    e.preventDefault();
    const validationError = validateForm(itemForm, 'item');
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      setLoading(true);
      setMessage('');
      setError(null);
      const response = await axios.put(`http://localhost:5000/api/purchase_items/${editingItem._id}`, itemForm);
      setItems(items.map(item => item._id === editingItem._id ? { ...item, ...itemForm } : item));
      setEditingItem(null);
      setItemForm({ name: '', mainUnit: '', subUnit: '', conversionFactor: '' });
      setMessage(response.data.message);
      fetchItems();
    } catch (err) {
      setError(`Failed to update item: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id) => {
    setShowWarning('Are you sure you want to delete this item?');
    setWarningAction(() => async () => {
      try {
        setLoading(true);
        const response = await axios.delete(`http://localhost:5000/api/purchase_items/${id}`);
        fetchItems();
        setMessage(response.data.message);
        setError(null);
      } catch (err) {
        setError(`Failed to delete item: ${err.response?.data?.error || err.message}`);
      } finally {
        setLoading(false);
        setShowWarning(null);
        setWarningAction(null);
      }
    });
  };

  // Supplier handlers
  const handleSupplierSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm(supplierForm, 'supplier');
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      setLoading(true);
      setMessage('');
      setError(null);
      const response = await axios.post('http://localhost:5000/api/suppliers', supplierForm);
      setSuppliers([...suppliers, response.data.supplier]);
      setSupplierForm({ name: '', shopName: '', address: '', phone: '', email: '' });
      setMessage(response.data.message);
    } catch (err) {
      setError(`Failed to add supplier: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierUpdate = async (e) => {
    e.preventDefault();
    const validationError = validateForm(supplierForm, 'supplier');
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      setLoading(true);
      setMessage('');
      setError(null);
      const response = await axios.put(`http://localhost:5000/api/suppliers/${editingSupplier._id}`, supplierForm);
      setSuppliers(suppliers.map(s => s._id === editingSupplier._id ? { ...s, ...supplierForm } : s));
      setEditingSupplier(null);
      setSupplierForm({ name: '', shopName: '', address: '', phone: '', email: '' });
      setMessage(response.data.message);
      fetchSuppliers();
    } catch (err) {
      setError(`Failed to update supplier: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteSupplier = async (id) => {
    setShowWarning('Are you sure you want to delete this supplier?');
    setWarningAction(() => async () => {
      try {
        setLoading(true);
        const response = await axios.delete(`http://localhost:5000/api/suppliers/${id}`);
        fetchSuppliers();
        setMessage(response.data.message);
        setError(null);
      } catch (err) {
        setError(`Failed to delete supplier: ${err.response?.data?.error || err.message}`);
      } finally {
        setLoading(false);
        setShowWarning(null);
        setWarningAction(null);
      }
    });
  };

  // PO form handlers
  const handlePoFormChange = (index, field, value) => {
    const newItems = [...poForm.items];
    newItems[index][field] = value;
    setPoForm({ ...poForm, items: newItems });
  };

  const addPoItem = () => {
    setPoForm({ ...poForm, items: [...poForm.items, { itemId: '', quantity: '', unit: 'main' }] });
  };

  // PR form handlers
  const handlePrFormChange = (index, field, value) => {
    const newItems = [...prForm.items];
    newItems[index][field] = value;
    setPrForm({ ...prForm, items: newItems });
  };

  const addPrItem = () => {
    setPrForm({ ...prForm, items: [...prForm.items, { itemId: '', quantity: '', unit: 'main', status: 'Accepted' }] });
  };

  // PI form handlers
  const handlePiFormChange = (index, field, value) => {
    const newItems = [...piForm.items];
    newItems[index][field] = value;
    setPiForm({ ...piForm, items: newItems });
  };

  const addPiItem = () => {
    setPiForm({ ...piForm, items: [...piForm.items, { itemId: '', quantity: '', unit: 'main', rate: '', tax: 5 }] });
  };

  // Validation function
  const validateForm = (form, type) => {
    if (type === 'item') {
      if (!form.name) return 'Item name is required';
      if (!form.mainUnit) return 'Main unit is required';
      if (!form.subUnit) return 'Sub-unit is required';
      if (!form.conversionFactor || Number(form.conversionFactor) <= 0) return 'Conversion factor must be positive';
    } else if (type === 'supplier') {
      if (!form.name) return 'Supplier name is required';
      if (!form.shopName) return 'Shop name is required';
      if (!form.address) return 'Address is required';
      if (!form.phone) return 'Phone number is required';
      if (!form.email) return 'Email is required';
    } else if (type === 'po') {
      if (!form.supplierId) return 'Supplier is required';
      if (!form.date) return 'Date is required';
      for (const item of form.items) {
        if (!item.itemId) return 'All items must be selected';
        if (!item.quantity || Number(item.quantity) <= 0) return 'Quantity must be positive';
      }
    } else if (type === 'pr') {
      if (!form.poId) return 'Purchase Order is required';
      if (!form.date) return 'Date is required';
      for (const item of form.items) {
        if (!item.itemId) return 'All items must be selected';
        if (!item.quantity || Number(item.quantity) <= 0) return 'Quantity must be positive';
        if (!item.status) return 'Item status is required';
      }
    } else if (type === 'pi') {
      if (!form.poId) return 'Purchase Order is required';
      if (!form.date) return 'Date is required';
      if (!form.supplier) return 'Supplier name is required';
      for (const item of form.items) {
        if (!item.itemId) return 'All items must be selected';
        if (!item.quantity || Number(item.quantity) <= 0) return 'Quantity must be positive';
        if (!item.rate || Number(item.rate) <= 0) return 'Rate must be positive';
        if (item.tax === undefined || Number(item.tax) < 0) return 'Tax cannot be negative';
      }
    }
    return null;
  };

  // Submit handlers
  const handlePoSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm(poForm, 'po');
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      setLoading(true);
      setMessage('');
      setError(null);
      const response = await axios.post('http://localhost:5000/api/purchase_orders', poForm);
      setPurchaseOrders([...purchaseOrders, response.data.order]);
      setPoForm({ supplierId: '', date: '', items: [{ itemId: '', quantity: '', unit: 'main' }] });
      setMessage(response.data.message);
    } catch (err) {
      setError(`Failed to create Purchase Order: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePrSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm(prForm, 'pr');
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      setLoading(true);
      setMessage('');
      setError(null);
      const response = await axios.post('http://localhost:5000/api/purchase_receipts', prForm);
      setPurchaseReceipts([...purchaseReceipts, response.data.receipt]);
      setMessage(response.data.message);
      setPrForm({ poId: '', date: '', items: [] });
    } catch (err) {
      setError(`Failed to create Purchase Receipt: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePiSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm(piForm, 'pi');
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      setLoading(true);
      setMessage('');
      setError(null);
      const response = await axios.post('http://localhost:5000/api/purchase_invoices', piForm);
      setPurchaseInvoices([...purchaseInvoices, response.data.invoice]);
      setMessage(response.data.message);
      setPiForm({ poId: '', prId: '', date: '', supplier: '', items: [] });
    } catch (err) {
      setError(`Failed to create Purchase Invoice: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete handlers
  const deletePo = async (id) => {
    setShowWarning('Are you sure you want to delete this purchase order?');
    setWarningAction(() => async () => {
      try {
        setLoading(true);
        const response = await axios.delete(`http://localhost:5000/api/purchase_orders/${id}`);
        fetchPurchaseOrders();
        setMessage(response.data.message);
        setError(null);
      } catch (err) {
        setError(`Failed to delete Purchase Order: ${err.response?.data?.error || err.message}`);
      } finally {
        setLoading(false);
        setShowWarning(null);
        setWarningAction(null);
      }
    });
  };

  const deletePr = async (id) => {
    setShowWarning('Are you sure you want to delete this purchase receipt?');
    setWarningAction(() => async () => {
      try {
        setLoading(true);
        const response = await axios.delete(`http://localhost:5000/api/purchase_receipts/${id}`);
        fetchPurchaseReceipts();
        setMessage(response.data.message);
        setError(null);
      } catch (err) {
        setError(`Failed to delete Purchase Receipt: ${err.response?.data?.error || err.message}`);
      } finally {
        setLoading(false);
        setShowWarning(null);
        setWarningAction(null);
      }
    });
  };

  const deletePi = async (id) => {
    setShowWarning('Are you sure you want to delete this purchase invoice?');
    setWarningAction(() => async () => {
      try {
        setLoading(true);
        const response = await axios.delete(`http://localhost:5000/api/purchase_invoices/${id}`);
        fetchPurchaseInvoices();
        setMessage(response.data.message);
        setError(null);
      } catch (err) {
        setError(`Failed to delete Purchase Invoice: ${err.response?.data?.error || err.message}`);
      } finally {
        setLoading(false);
        setShowWarning(null);
        setWarningAction(null);
      }
    });
  };

  // Print handler
  const handlePrintRow = (type, data) => {
    let htmlContent;
    if (type === 'po') htmlContent = generatePoHtml(data);
    else if (type === 'pr') htmlContent = generatePrHtml(data);
    else if (type === 'pi') htmlContent = generatePiHtml(data);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const generatePoHtml = (po) => {
    const supplier = suppliers.find(s => s._id === po.supplierId) || { name: 'Unknown' };
    const itemRows = Array.isArray(po.items) ? po.items.map(item => {
      const itemData = items.find(i => i._id === item.itemId) || { name: 'Unknown', mainUnit: '', subUnit: '' };
      return `<tr><td>${itemData.name}</td><td>${item.quantity} ${item.unit === 'main' ? itemData.mainUnit : itemData.subUnit}</td></tr>`;
    }).join('') : '';
    return `
      <!DOCTYPE html>
      <html>
      <head><title>Purchase Order ${po.id}</title><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; }</style></head>
      <body>
        <h1>Purchase Order ${po.id}</h1>
        <p><strong>Supplier:</strong> ${supplier.name}</p>
        <p><strong>Date:</strong> ${new Date(po.date).toLocaleDateString()}</p>
        <table><tr><th>Item</th><th>Quantity</th></tr>${itemRows}</table>
      </body>
      </html>
    `;
  };

  const generatePrHtml = (pr) => {
    const po = purchaseOrders.find(p => p.id === pr.poId) || { supplierId: '' };
    const supplier = suppliers.find(s => s._id === po.supplierId) || { name: 'Unknown' };
    const itemRows = Array.isArray(pr.items) ? pr.items.map(item => {
      const itemData = items.find(i => i._id === item.itemId) || { name: 'Unknown', mainUnit: '', subUnit: '' };
      return `<tr><td>${itemData.name}</td><td>${item.quantity} ${item.unit === 'main' ? itemData.mainUnit : itemData.subUnit} (${item.status})</td></tr>`;
    }).join('') : '';
    return `
      <!DOCTYPE html>
      <html>
      <head><title>Purchase Receipt ${pr.id}</title><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; }</style></head>
      <body>
        <h1>Purchase Receipt ${pr.id}</h1>
        <p><strong>Supplier:</strong> ${supplier.name}</p>
        <p><strong>PO Reference:</strong> ${pr.poId}</p>
        <p><strong>Date:</strong> ${new Date(pr.date).toLocaleDateString()}</p>
        <table><tr><th>Item</th><th>Quantity (Status)</th></tr>${itemRows}</table>
      </body>
      </html>
    `;
  };

  const generatePiHtml = (pi) => {
    const itemRows = Array.isArray(pi.items) ? pi.items.map(item => {
      const itemData = items.find(i => i._id === item.itemId) || { name: 'Unknown', mainUnit: '', subUnit: '' };
      const total = Number(item.quantity) * Number(item.rate) * (1 + Number(item.tax) / 100);
      return `<tr><td>${itemData.name}</td><td>${item.quantity} ${item.unit === 'main' ? itemData.mainUnit : itemData.subUnit}</td><td>₹${Number(item.rate).toFixed(2)}</td><td>${item.tax}%</td><td>₹${total.toFixed(2)}</td></tr>`;
    }).join('') : '';
    const grandTotal = Array.isArray(pi.items) ? pi.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.rate) * (1 + Number(item.tax) / 100), 0) : 0;
    return `
      <!DOCTYPE html>
      <html>
      <head><title>Purchase Invoice ${pi.id}</title><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; }</style></head>
      <body>
        <h1>Purchase Invoice ${pi.id}</h1>
        <p><strong>Supplier:</strong> ${pi.supplier}</p>
        <p><strong>PO Reference:</strong> ${pi.poId || '-'}</p>
        <p><strong>PR Reference:</strong> ${pi.prId || '-'}</p>
        <p><strong>Date:</strong> ${new Date(pi.date).toLocaleDateString()}</p>
        <table><tr><th>Item</th><th>Quantity</th><th>Rate</th><th>Tax</th><th>Total</th></tr>${itemRows}</table>
        <p><strong>Grand Total:</strong> ₹${grandTotal.toFixed(2)}</p>
      </body>
      </html>
    `;
  };

  // Render item quantity with conversion
  const renderItemQuantity = (item) => {
    if (!Array.isArray(items)) return 'Items not loaded';
    const itemData = items.find(i => i._id === item.itemId);
    if (!itemData) return 'Unknown Item';
    const unit = item.unit === 'main' ? itemData.mainUnit : itemData.subUnit;
    const altUnit = item.unit === 'main' ? itemData.subUnit : itemData.mainUnit;
    const altQuantity = item.unit === 'main' ? (item.quantity * itemData.conversionFactor).toFixed(2) : (item.quantity / itemData.conversionFactor).toFixed(2);
    return `${itemData.name}: ${item.quantity} ${unit} (${altQuantity} ${altUnit})${item.status ? ` (${item.status})` : ''}${item.rate ? ` @ ₹${item.rate} (Tax: ${item.tax}%)` : ''}`;
  };

  // Sidebar tabs
  const tabs = [
    { key: 'item', name: 'Items', icon: <FaShoppingCart /> },
    { key: 'supplier', name: 'Suppliers', icon: <FaUser /> },
    { key: 'order', name: 'Purchase Order', icon: <FaShoppingCart /> },
    { key: 'receipt', name: 'Purchase Receipt', icon: <FaTruck /> },
    { key: 'invoice', name: 'Purchase Invoice', icon: <FaFileInvoice /> },
    { key: 'report', name: 'Reports', icon: <FaChartBar /> },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f4f6f9' }}>
      {/* Sidebar */}
      <div style={{ 
        width: '250px', 
        backgroundColor: '#2c3e50', 
        padding: '20px', 
        height: '100vh', 
        position: 'fixed', 
        left: 0, 
        top: 0, 
        boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
        overflowY: 'auto'
      }}>
        <h2 style={{ 
          color: '#ecf0f1', 
          marginBottom: '30px', 
          fontSize: '1.5rem', 
          fontWeight: 'bold', 
          textAlign: 'center' 
        }}>
          Purchase Module
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 20px',
                backgroundColor: activeTab === tab.key ? '#3498db' : '#34495e',
                color: '#ecf0f1',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '1rem',
                transition: 'background-color 0.3s',
                textAlign: 'left'
              }}
              onMouseOver={(e) => activeTab !== tab.key && (e.target.style.backgroundColor = '#3d566e')}
              onMouseOut={(e) => activeTab !== tab.key && (e.target.style.backgroundColor = '#34495e')}
            >
              {tab.icon} {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        marginLeft: '250px', 
        flex: 1, 
        padding: '20px', 
        backgroundColor: '#f4f6f9' 
      }}>
        <button
          onClick={() => navigate('/admin')}
          style={{
            position: 'absolute',
            top: '20px',
            left: '270px',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ecf0f1',
            border: '1px solid #bdc3c7',
            cursor: 'pointer',
            transition: 'background-color 0.3s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = '#3498db')}
          onMouseOut={(e) => (e.target.style.backgroundColor = '#ecf0f1')}
        >
          <FaArrowLeft style={{ fontSize: '24px', color: '#2c3e50' }} />
        </button>

        <div style={{ maxWidth: '1200px', margin: '40px auto 0' }}>
          <h2 style={{ 
            textAlign: 'center', 
            marginBottom: '40px', 
            color: '#2c3e50', 
            fontSize: '2rem', 
            fontWeight: '600' 
          }}>
            Purchase Module
          </h2>

          {loading && (
            <div style={{ textAlign: 'center', color: '#7f8c8d', fontSize: '1.2rem' }}>
              Loading...
            </div>
          )}
          {(error || message) && (
            <div style={{ 
              backgroundColor: '#fff3cd', 
              padding: '10px', 
              marginBottom: '20px', 
              color: '#856404', 
              borderRadius: '5px', 
              textAlign: 'center',
              border: '1px solid #ffeeba'
            }}>
              {error || message}
            </div>
          )}

          {showWarning && (
            <WarningMessage
              message={showWarning}
              onConfirm={warningAction}
              onCancel={() => {
                setShowWarning(null);
                setWarningAction(null);
              }}
            />
          )}

          {/* Items Tab */}
          {activeTab === 'item' && (
            <div style={{ 
              backgroundColor: '#fff', 
              padding: '20px', 
              borderRadius: '8px', 
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)' 
            }}>
              <h3 style={{ 
                margin: '0 0 20px 0', 
                color: '#2c3e50', 
                fontSize: '1.5rem', 
                fontWeight: '600' 
              }}>
                Manage Items
              </h3>
              <form onSubmit={editingItem ? handleItemUpdate : handleItemSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Item Name (e.g., Rice)"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    style={{ 
                      padding: '10px', 
                      border: '1px solid #bdc3c7', 
                      borderRadius: '5px', 
                      flex: 1,
                      minWidth: '200px',
                      fontSize: '1rem' 
                    }}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Main Unit (e.g., kg)"
                    value={itemForm.mainUnit}
                    onChange={(e) => setItemForm({ ...itemForm, mainUnit: e.target.value })}
                    style={{ 
                      padding: '10px', 
                      border: '1px solid #bdc3c7', 
                      borderRadius: '5px', 
                      flex: 1,
                      minWidth: '200px',
                      fontSize: '1rem' 
                    }}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Sub Unit (e.g., grams)"
                    value={itemForm.subUnit}
                    onChange={(e) => setItemForm({ ...itemForm, subUnit: e.target.value })}
                    style={{ 
                      padding: '10px', 
                      border: '1px solid #bdc3c7', 
                      borderRadius: '5px', 
                      flex: 1,
                      minWidth: '200px',
                      fontSize: '1rem' 
                    }}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Conversion Factor (e.g., 1000)"
                    value={itemForm.conversionFactor}
                    onChange={(e) => setItemForm({ ...itemForm, conversionFactor: e.target.value })}
                    style={{ 
                      padding: '10px', 
                      border: '1px solid #bdc3c7', 
                      borderRadius: '5px', 
                      flex: 1,
                      minWidth: '200px',
                      fontSize: '1rem' 
                    }}
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ 
                      padding: '10px 20px', 
                      backgroundColor: loading ? '#bdc3c7' : '#3498db', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: '5px', 
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '1rem',
                      transition: 'background-color 0.3s'
                    }}
                    onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#2980b9')}
                    onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#3498db')}
                  >
                    {loading ? 'Submitting...' : (editingItem ? 'Update Item' : 'Add Item')}
                  </button>
                  {editingItem && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(null);
                        setItemForm({ name: '', mainUnit: '', subUnit: '', conversionFactor: '' });
                      }}
                      style={{ 
                        padding: '10px 20px', 
                        backgroundColor: '#e74c3c', 
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: '5px', 
                        cursor: 'pointer',
                        fontSize: '1rem',
                        transition: 'background-color 0.3s'
                      }}
                      onMouseOver={(e) => (e.target.style.backgroundColor = '#c0392b')}
                      onMouseOut={(e) => (e.target.style.backgroundColor = '#e74c3c')}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
              <h3 style={{ 
                margin: '20px 0', 
                color: '#2c3e50', 
                fontSize: '1.5rem', 
                fontWeight: '600' 
              }}>
                Items List
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#ecf0f1' }}>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Name</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Main Unit</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Sub Unit</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Conversion Factor</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(items) && items.length > 0 ? items.map(item => (
                    <tr key={item._id}>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>{item.name}</td>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>{item.mainUnit}</td>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>{item.subUnit}</td>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>{item.conversionFactor}</td>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px' }}>
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setItemForm({
                              name: item.name,
                              mainUnit: item.mainUnit,
                              subUnit: item.subUnit,
                              conversionFactor: item.conversionFactor
                            });
                          }}
                          style={{ 
                            padding: '5px 10px', 
                            backgroundColor: '#3498db', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: '5px', 
                            cursor: 'pointer',
                            marginRight: '5px',
                            transition: 'background-color 0.3s'
                          }}
                          onMouseOver={(e) => (e.target.style.backgroundColor = '#2980b9')}
                          onMouseOut={(e) => (e.target.style.backgroundColor = '#3498db')}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteItem(item._id)}
                          style={{ 
                            padding: '5px 10px', 
                            backgroundColor: '#e74c3c', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: '5px', 
                            cursor: 'pointer',
                            transition: 'background-color 0.3s'
                          }}
                          onMouseOver={(e) => (e.target.style.backgroundColor = '#c0392b')}
                          onMouseOut={(e) => (e.target.style.backgroundColor = '#e74c3c')}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" style={{ border: '1px solid #bdc3c7', padding: '12px', textAlign: 'center', color: '#7f8c8d' }}>
                        No items available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Suppliers Tab */}
          {activeTab === 'supplier' && (
            <div style={{ 
              backgroundColor: '#fff', 
              padding: '20px', 
              borderRadius: '8px', 
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)' 
            }}>
              <h3 style={{ 
                margin: '0 0 20px 0', 
                color: '#2c3e50', 
                fontSize: '1.5rem', 
                fontWeight: '600' 
              }}>
                Manage Suppliers
              </h3>
              <form onSubmit={editingSupplier ? handleSupplierUpdate : handleSupplierSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Name"
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    style={{ 
                      padding: '10px', 
                      border: '1px solid #bdc3c7', 
                      borderRadius: '5px', 
                      flex: '1',
                      minWidth: '200px',
                      fontSize: '1rem' 
                    }}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Shop Name"
                    value={supplierForm.shopName}
                    onChange={(e) => setSupplierForm({ ...supplierForm, shopName: e.target.value })}
                    style={{ 
                      padding: '10px', 
                      border: '1px solid #bdc3c7', 
                      borderRadius: '5px', 
                      flex: '1',
                      minWidth: '200px',
                      fontSize: '1rem' 
                    }}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Address"
                    value={supplierForm.address}
                    onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                    style={{ 
                      padding: '10px', 
                      border: '1px solid #bdc3c7', 
                      borderRadius: '5px', 
                      flex: '1',
                      minWidth: '200px',
                      fontSize: '1rem' 
                    }}
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    style={{ 
                      padding: '10px', 
                      border: '1px solid #bdc3c7', 
                      borderRadius: '5px', 
                      flex: '1',
                      minWidth: '200px',
                      fontSize: '1rem' 
                    }}
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    style={{ 
                      padding: '10px', 
                      border: '1px solid #bdc3c7', 
                      borderRadius: '5px', 
                      flex: '1',
                      minWidth: '200px',
                      fontSize: '1rem' 
                    }}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ 
                      padding: '10px 20px', 
                      backgroundColor: loading ? '#bdc3c7' : '#3498db', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: '5px', 
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '1rem',
                      transition: 'background-color 0.3s'
                    }}
                    onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#2980b9')}
                    onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#3498db')}
                  >
                    {loading ? 'Submitting...' : (editingSupplier ? 'Update Supplier' : 'Add Supplier')}
                  </button>
                  {editingSupplier && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSupplier(null);
                        setSupplierForm({ name: '', shopName: '', address: '', phone: '', email: '' });
                      }}
                      style={{ 
                        padding: '10px 20px', 
                        backgroundColor: '#e74c3c', 
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: '5px', 
                        cursor: 'pointer',
                        fontSize: '1rem',
                        transition: 'background-color 0.3s'
                      }}
                      onMouseOver={(e) => (e.target.style.backgroundColor = '#c0392b')}
                      onMouseOut={(e) => (e.target.style.backgroundColor = '#e74c3c')}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
              <h3 style={{ 
                margin: '20px 0', 
                color: '#2c3e50', 
                fontSize: '1.5rem', 
                fontWeight: '600' 
              }}>
                Suppliers List
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#ecf0f1' }}>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Name</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Shop Name</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Address</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Phone</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Email</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(suppliers) && suppliers.length > 0 ? suppliers.map(supplier => (
                    <tr key={supplier._id}>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>{supplier.name}</td>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>{supplier.shopName}</td>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>{supplier.address}</td>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>{supplier.phone}</td>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>{supplier.email}</td>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px' }}>
                        <button
                          onClick={() => {
                            setEditingSupplier(supplier);
                            setSupplierForm({
                              name: supplier.name,
                              shopName: supplier.shopName,
                              address: supplier.address,
                              phone: supplier.phone,
                              email: supplier.email
                            });
                          }}
                          style={{ 
                            padding: '5px 10px', 
                            backgroundColor: '#3498db', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: '5px', 
                            cursor: 'pointer',
                            marginRight: '5px',
                            transition: 'background-color 0.3s'
                          }}
                          onMouseOver={(e) => (e.target.style.backgroundColor = '#2980b9')}
                          onMouseOut={(e) => (e.target.style.backgroundColor = '#3498db')}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteSupplier(supplier._id)}
                          style={{ 
                            padding: '5px 10px', 
                            backgroundColor: '#e74c3c', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: '5px', 
                            cursor: 'pointer',
                            transition: 'background-color 0.3s'
                          }}
                          onMouseOver={(e) => (e.target.style.backgroundColor = '#c0392b')}
                          onMouseOut={(e) => (e.target.style.backgroundColor = '#e74c3c')}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" style={{ border: '1px solid #bdc3c7', padding: '12px', textAlign: 'center', color: '#7f8c8d' }}>
                        No suppliers available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Purchase Order Tab */}
          {activeTab === 'order' && (
            <div style={{ 
              backgroundColor: '#fff', 
              padding: '20px', 
              borderRadius: '8px', 
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)' 
            }}>
              <h3 style={{ 
                margin: '0 0 20px 0', 
                color: '#2c3e50', 
                fontSize: '1.5rem', 
                fontWeight: '600' 
              }}>
                Create Purchase Order
              </h3>
              <form onSubmit={handlePoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <select
                    value={poForm.supplierId}
                    onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
                    style={{ 
                      padding: '10px', 
                      border: '1px solid #bdc3c7', 
                      borderRadius: '5px', 
                      flex: 1,
                      minWidth: '200px',
                      fontSize: '1rem' 
                    }}
                    required
                  >
                    <option value="">Select Supplier</option>
                    {Array.isArray(suppliers) && suppliers.map(supplier => (
                      <option key={supplier._id} value={supplier._id}>{supplier.name} - {supplier.shopName}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={poForm.date}
                    onChange={(e) => setPoForm({ ...poForm, date: e.target.value })}
                    style={{ 
                      padding: '10px', 
                      border: '1px solid #bdc3c7', 
                      borderRadius: '5px', 
                      flex: 1,
                      minWidth: '200px',
                      fontSize: '1rem' 
                    }}
                    required
                  />
                </div>
                {poForm.items.map((item, index) => (
                  <div key={index} style={{ display: 'flex', gap: '20px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <select
                      value={item.itemId}
                      onChange={(e) => handlePoFormChange(index, 'itemId', e.target.value)}
                      style={{ 
                        padding: '10px', 
                        border: '1px solid #bdc3c7', 
                        borderRadius: '5px', 
                        flex: 1,
                        minWidth: '150px',
                        fontSize: '1rem' 
                      }}
                      required
                    >
                      <option value="">Select Item</option>
                      {Array.isArray(items) && items.map(item => (
                        <option key={item._id} value={item._id}>{item.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Quantity"
                      value={item.quantity}
                      onChange={(e) => handlePoFormChange(index, 'quantity', e.target.value)}
                      style={{ 
                        padding: '10px', 
                        border: '1px solid #bdc3c7', 
                        borderRadius: '5px', 
                        flex: 1,
                        minWidth: '150px',
                        fontSize: '1rem' 
                      }}
                      min="0.01"
                      step="0.01"
                      required
                    />
                    <select
                      value={item.unit}
                      onChange={(e) => handlePoFormChange(index, 'unit', e.target.value)}
                      style={{ 
                        padding: '10px', 
                        border: '1px solid #bdc3c7', 
                        borderRadius: '5px', 
                        flex: 1,
                        minWidth: '150px',
                        fontSize: '1rem' 
                      }}
                    >
                      <option value="main">Main Unit</option>
                      <option value="sub">Sub Unit</option>
                    </select>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={addPoItem}
                    style={{ 
                      padding: '10px 20px', 
                      backgroundColor: '#3498db', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: '5px', 
                      cursor: 'pointer',
                      fontSize: '1rem',
                      transition: 'background-color 0.3s'
                    }}
                    onMouseOver={(e) => (e.target.style.backgroundColor = '#2980b9')}
                    onMouseOut={(e) => (e.target.style.backgroundColor = '#3498db')}
                  >
                    Add Item
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ 
                      padding: '10px 20px', 
                      backgroundColor: loading ? '#bdc3c7' : '#3498db', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: '5px', 
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '1rem',
                      transition: 'background-color 0.3s'
                    }}
                    onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#2980b9')}
                    onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#3498db')}
                  >
                    {loading ? 'Submitting...' : 'Create Purchase Order'}
                  </button>
                </div>
              </form>
              <h3 style={{ 
                margin: '20px 0', 
                color: '#2c3e50', 
                fontSize: '1.5rem', 
                fontWeight: '600' 
              }}>
                Purchase Orders
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#ecf0f1' }}>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>PO Number</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Date</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Supplier</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Items</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Status</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(purchaseOrders) && purchaseOrders.length > 0 ? purchaseOrders.map(po => (
                    <tr key={po._id}>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>{po.id}</td>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>{new Date(po.date).toLocaleDateString()}</td>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>{po.supplierName}</td>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>
                        {Array.isArray(po.items) && po.items.map(item => (
                          <div key={item.itemId}>{renderItemQuantity(item)}</div>
                        ))}
                      </td>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>{po.status}</td>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px' }}>
                        <button
                          onClick={() => handlePrintRow('po', po)}
                          style={{ 
                            padding: '5px 10px', 
                            backgroundColor: '#3498db', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: '5px', 
                            cursor: 'pointer',
                            marginRight: '5px',
                            transition: 'background-color 0.3s'
                          }}
                          onMouseOver={(e) => (e.target.style.backgroundColor = '#2980b9')}
                          onMouseOut={(e) => (e.target.style.backgroundColor = '#3498db')}
                        >
                          <FaPrint />
                        </button>
                        <button
                          onClick={() => deletePo(po.id)}
                          style={{ 
                            padding: '5px 10px', 
                            backgroundColor: '#e74c3c', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: '5px', 
                            cursor: 'pointer',
                            transition: 'background-color 0.3s'
                          }}
                          onMouseOver={(e) => (e.target.style.backgroundColor = '#c0392b')}
                          onMouseOut={(e) => (e.target.style.backgroundColor = '#e74c3c')}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" style={{ border: '1px solid #bdc3c7', padding: '12px', textAlign: 'center', color: '#7f8c8d' }}>
                        No purchase orders available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Purchase Receipt Tab */}
          {activeTab === 'receipt' && (
            <div style={{ 
              backgroundColor: '#fff', 
              padding: '20px', 
              borderRadius: '8px', 
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)' 
            }}>
              <h3 style={{ 
                margin: '0 0 20px 0', 
                color: '#2c3e50', 
                fontSize: '1.5rem', 
                fontWeight: '600' 
              }}>
                Create Purchase Receipt
              </h3>
              <form onSubmit={handlePrSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <select
                    value={prForm.poId}
                    onChange={(e) => {
                      const poId = e.target.value;
                      const po = purchaseOrders.find(p => p.id === poId);
                      setPrForm({ 
                        ...prForm, 
                        poId, 
                        items: po ? po.items.map(item => ({ ...item, status: 'Accepted' })) : [] 
                      });
                    }}
                    style={{ 
                      padding: '10px', 
                      border: '1px solid #bdc3c7', 
                      borderRadius: '5px', 
                      flex: 1,
                      fontSize: '1rem' 
                    }}
                    required
                  >
                    <option value="">Select PO</option>
                    {Array.isArray(purchaseOrders) && purchaseOrders.map(po => (
                      <option key={po._id} value={po.id}>{po.id}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={prForm.date}
                    onChange={(e) => setPrForm({ ...prForm, date: e.target.value })}
                    style={{ 
                      padding: '10px', 
                      border: '1px solid #bdc3c7', 
                      borderRadius: '5px', 
                      flex: 1,
                      fontSize: '1rem' 
                    }}
                    required
                  />
                </div>
                {prForm.items.map((item, index) => (
                  <div key={index} style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
                    <select
                      value={item.itemId}
                      onChange={(e) => handlePrFormChange(index, 'itemId', e.target.value)}
                      style={{ 
                        padding: '10px', 
                        border: '1px solid #bdc3c7', 
                        borderRadius: '5px', 
                        flex: 1,
                        fontSize: '1rem' 
                      }}
                      required
                    >
                      <option value="">Select Item</option>
                      {Array.isArray(items) && items.map(item => (
                        <option key={item._id} value={item._id}>{item.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Quantity"
                      value={item.quantity}
                      onChange={(e) => handlePrFormChange(index, 'quantity', e.target.value)}
                      style={{ 
                        padding: '10px', 
                        border: '1px solid #bdc3c7', 
                        borderRadius: '5px', 
                        flex: 1,
                        fontSize: '1rem' 
                      }}
                      min="0.01"
                      step="0.01"
                      required
                    />
                    <select
                      value={item.unit}
                      onChange={(e) => handlePrFormChange(index, 'unit', e.target.value)}
                      style={{ 
                        padding: '10px', 
                        border: '1px solid #bdc3c7', 
                        borderRadius: '5px', 
                        flex: 1,
                        fontSize: '1rem' 
                      }}
                    >
                      <option value="main">Main Unit</option>
                      <option value="sub">Sub Unit</option>
                    </select>
                    <select
                      value={item.status}
                      onChange={(e) => handlePrFormChange(index, 'status', e.target.value)}
                      style={{ 
                        padding: '10px', 
                        border: '1px solid #bdc3c7', 
                        borderRadius: '5px', 
                        flex: 1,
                        fontSize: '1rem' 
                      }}
                    >
                      <option value="Accepted">Accepted</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                ))}
                <button
                  type="submit"
                  disabled={loading}
                  style={{ 
                    padding: '10px 20px', 
                    backgroundColor: loading ? '#bdc3c7' : '#3498db', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: '5px', 
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    transition: 'background-color 0.3s'
                  }}
                  onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#2980b9')}
                  onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#3498db')}
                >
                  {loading ? 'Submitting...' : 'Create Purchase Receipt'}
                </button>
              </form>
              <h3 style={{ 
                margin: '20px 0', 
                color: '#2c3e50', 
                fontSize: '1.5rem', 
                fontWeight: '600' 
              }}>
                Purchase Receipts
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#ecf0f1' }}>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>PR Number</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>PO Reference</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Date</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Items</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(purchaseReceipts) && purchaseReceipts.length > 0 ? purchaseReceipts.map(pr => (
                    <tr key={pr._id}>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>{pr.id}</td>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>{pr.poId}</td>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>{new Date(pr.date).toLocaleDateString()}</td>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>
                        {Array.isArray(pr.items) && pr.items.map(item => (
                          <div key={item.itemId}>{renderItemQuantity(item)}</div>
                        ))}
                      </td>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px' }}>
                        <button
                          onClick={() => handlePrintRow('pr', pr)}
                          style={{ 
                            padding: '5px 10px', 
                            backgroundColor: '#3498db', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: '5px', 
                            cursor: 'pointer',
                            marginRight: '5px',
                            transition: 'background-color 0.3s'
                          }}
                          onMouseOver={(e) => (e.target.style.backgroundColor = '#2980b9')}
                          onMouseOut={(e) => (e.target.style.backgroundColor = '#3498db')}
                        >
                          <FaPrint />
                        </button>
                        <button
                          onClick={() => deletePr(pr.id)}
                          style={{ 
                            padding: '5px 10px', 
                            backgroundColor: '#e74c3c', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: '5px', 
                            cursor: 'pointer',
                            transition: 'background-color 0.3s'
                          }}
                          onMouseOver={(e) => (e.target.style.backgroundColor = '#c0392b')}
                          onMouseOut={(e) => (e.target.style.backgroundColor = '#e74c3c')}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" style={{ border: '1px solid #bdc3c7', padding: '12px', textAlign: 'center', color: '#7f8c8d' }}>
                        No purchase receipts available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {/* Purchase Invoice Tab */}
          {activeTab === 'invoice' && (
            <div style={{ 
              backgroundColor: '#fff', 
              padding: '20px', 
              borderRadius: '8px', 
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)' 
            }}>
              <h3 style={{ 
                margin: '0 0 20px 0', 
                color: '#2c3e50', 
                fontSize: '1.5rem', 
                fontWeight: '600' 
              }}>
                Create Purchase Invoice
              </h3>
              <form onSubmit={handlePiSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <select
                    value={piForm.poId}
                    onChange={(e) => {
                      const poId = e.target.value;
                      const po = purchaseOrders.find(p => p.id === poId);
                      setPiForm({ 
                        ...piForm, 
                        poId, 
                        items: po ? po.items.map(item => ({ ...item, rate: '', tax: 5 })) : [],
                        supplier: po ? po.supplierName : ''
                      });
                    }}
                    style={{ 
                      padding: '10px', 
                      border: '1px solid #bdc3c7', 
                      borderRadius: '5px', 
                      flex: '1',
                      minWidth: '200px',
                      fontSize: '1rem' 
                    }}
                    required
                  >
                    <option value="">Select PO</option>
                    {Array.isArray(purchaseOrders) && purchaseOrders.map(po => (
                      <option key={po.id} value={po.id}>{po.id}</option>
                    ))}
                  </select>
                  <select
                    value={piForm.prId}
                    onChange={(e) => {
                      const prId = e.target.value;
                      const pr = purchaseReceipts.find(p => p.id === prId);
                      setPiForm({ 
                        ...piForm, 
                        prId, 
                        items: pr ? pr.items.filter(item => item.status === 'Accepted').map(item => ({ ...item, rate: '', tax: 5 })) : piForm.items 
                      });
                    }}
                    style={{ 
                      padding: '10px', 
                      border: '1px solid #bdc3c7', 
                      borderRadius: '5px', 
                      flex: '1',
                      minWidth: '200px',
                      fontSize: '1rem' 
                    }}
                  >
                    <option value="">Select PR (Optional)</option>
                    {Array.isArray(purchaseReceipts) && purchaseReceipts.filter(pr => pr.poId === piForm.poId).map(pr => (
                      <option key={pr.id} value={pr.id}>{pr.id}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={piForm.date}
                    onChange={(e) => setPiForm({ ...piForm, date: e.target.value })}
                    style={{ 
                      padding: '10px', 
                      border: '1px solid #bdc3c7', 
                      borderRadius: '5px', 
                      flex: '1',
                      minWidth: '200px',
                      fontSize: '1rem' 
                    }}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Supplier Name"
                    value={piForm.supplier}
                    onChange={(e) => setPiForm({ ...piForm, supplier: e.target.value })}
                    style={{ 
                      padding: '10px', 
                      border: '1px solid #bdc3c7', 
                      borderRadius: '5px', 
                      flex: '1',
                      minWidth: '200px',
                      fontSize: '1rem' 
                    }}
                    required
                  />
                </div>
                {piForm.items.map((item, index) => (
                  <div key={index} style={{ display: 'flex', gap: '20px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <select
                      value={item.itemId}
                      onChange={(e) => handlePiFormChange(index, 'itemId', e.target.value)}
                      style={{ 
                        padding: '10px', 
                        border: '1px solid #bdc3c7', 
                        borderRadius: '5px', 
                        flex: '1',
                        minWidth: '150px',
                        fontSize: '1rem' 
                      }}
                      required
                    >
                      <option value="">Select Item</option>
                      {Array.isArray(items) && items.map(item => (
                        <option key={item._id} value={item._id}>{item.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Quantity"
                      value={item.quantity}
                      onChange={(e) => handlePiFormChange(index, 'quantity', e.target.value)}
                      style={{ 
                        padding: '10px', 
                        border: '1px solid #bdc3c7', 
                        borderRadius: '5px', 
                        flex: '1',
                        minWidth: '150px',
                        fontSize: '1rem' 
                      }}
                      min="0.01"
                      step="0.01"
                      required
                    />
                    <select
                      value={item.unit}
                      onChange={(e) => handlePiFormChange(index, 'unit', e.target.value)}
                      style={{ 
                        padding: '10px', 
                        border: '1px solid #bdc3c7', 
                        borderRadius: '5px', 
                        flex: '1',
                        minWidth: '150px',
                        fontSize: '1rem' 
                      }}
                    >
                      <option value="main">Main Unit</option>
                      <option value="sub">Sub Unit</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Rate"
                      value={item.rate}
                      onChange={(e) => handlePiFormChange(index, 'rate', e.target.value)}
                      style={{ 
                        padding: '10px', 
                        border: '1px solid #bdc3c7', 
                        borderRadius: '5px', 
                        flex: '1',
                        minWidth: '150px',
                        fontSize: '1rem' 
                      }}
                      min="0.01"
                      step="0.01"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Tax (%)"
                      value={item.tax}
                      onChange={(e) => handlePiFormChange(index, 'tax', e.target.value)}
                      style={{ 
                        padding: '10px', 
                        border: '1px solid #bdc3c7', 
                        borderRadius: '5px', 
                        flex: '1',
                        minWidth: '150px',
                        fontSize: '1rem' 
                      }}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={addPiItem}
                    style={{ 
                      padding: '10px 20px', 
                      backgroundColor: '#3498db', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: '5px', 
                      cursor: 'pointer',
                      fontSize: '1rem',
                      transition: 'background-color 0.3s'
                    }}
                    onMouseOver={(e) => (e.target.style.backgroundColor = '#2980b9')}
                    onMouseOut={(e) => (e.target.style.backgroundColor = '#3498db')}
                  >
                    Add Item
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ 
                      padding: '10px 20px', 
                      backgroundColor: loading ? '#bdc3c7' : '#3498db', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: '5px', 
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '1rem',
                      transition: 'background-color 0.3s'
                    }}
                    onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#2980b9')}
                    onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#3498db')}
                  >
                    {loading ? 'Submitting...' : 'Create Purchase Invoice'}
                  </button>
                </div>
              </form>
              <h3 style={{ 
                margin: '20px 0', 
                color: '#2c3e50', 
                fontSize: '1.5rem', 
                fontWeight: '600' 
              }}>
                Purchase Invoices
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#ecf0f1' }}>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>PI Number</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>PO Reference</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>PR Reference</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Date</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Supplier</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Items</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Total</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(purchaseInvoices) && purchaseInvoices.length > 0 ? purchaseInvoices.map(pi => {
                    const total = Array.isArray(pi.items) ? pi.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.rate) * (1 + Number(item.tax) / 100), 0) : 0;
                    return (
                      <tr key={pi.id}>
                        <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>{pi.id}</td>
                        <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>{pi.poId || '-'}</td>
                        <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>{pi.prId || '-'}</td>
                        <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>{new Date(pi.date).toLocaleDateString()}</td>
                        <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>{pi.supplier}</td>
                        <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>
                          {Array.isArray(pi.items) && pi.items.map(item => (
                            <div key={item.itemId}>{renderItemQuantity(item)}</div>
                          ))}
                        </td>
                        <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>₹{total.toFixed(2)}</td>
                        <td style={{ border: '1px solid #bdc3c7', padding: '12px' }}>
                          <button
                            onClick={() => handlePrintRow('pi', pi)}
                            style={{ 
                              padding: '5px 10px', 
                              backgroundColor: '#3498db', 
                              color: '#fff', 
                              border: 'none', 
                              borderRadius: '5px', 
                              cursor: 'pointer',
                              marginRight: '5px',
                              transition: 'background-color 0.3s'
                            }}
                            onMouseOver={(e) => (e.target.style.backgroundColor = '#2980b9')}
                            onMouseOut={(e) => (e.target.style.backgroundColor = '#3498db')}
                          >
                            <FaPrint />
                          </button>
                          <button
                            onClick={() => deletePi(pi.id)}
                            style={{ 
                              padding: '5px 10px', 
                              backgroundColor: '#e74c3c', 
                              color: '#fff', 
                              border: 'none', 
                              borderRadius: '5px', 
                              cursor: 'pointer',
                              transition: 'background-color 0.3s'
                            }}
                            onMouseOver={(e) => (e.target.style.backgroundColor = '#c0392b')}
                            onMouseOut={(e) => (e.target.style.backgroundColor = '#e74c3c')}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="8" style={{ border: '1px solid #bdc3c7', padding: '12px', textAlign: 'center', color: '#7f8c8d' }}>
                        No purchase invoices available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'report' && (
            <div style={{ 
              backgroundColor: '#fff', 
              padding: '20px', 
              borderRadius: '8px', 
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)' 
            }}>
              <h3 style={{ 
                margin: '0 0 20px 0', 
                color: '#2c3e50', 
                fontSize: '1.5rem', 
                fontWeight: '600' 
              }}>
                Purchase Summary
              </h3>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <div style={{ 
                  padding: '20px', 
                  backgroundColor: '#ecf0f1', 
                  borderRadius: '8px', 
                  textAlign: 'center', 
                  flex: '1', 
                  minWidth: '200px' 
                }}>
                  <h4 style={{ margin: '0', color: '#2c3e50', fontSize: '1.2rem' }}>Total POs</h4>
                  <p style={{ fontSize: '1.5rem', margin: '5px 0 0', color: '#34495e' }}>{Array.isArray(purchaseOrders) ? purchaseOrders.length : 0}</p>
                </div>
                <div style={{ 
                  padding: '20px', 
                  backgroundColor: '#ecf0f1', 
                  borderRadius: '8px', 
                  textAlign: 'center', 
                  flex: '1', 
                  minWidth: '200px' 
                }}>
                  <h4 style={{ margin: '0', color: '#2c3e50', fontSize: '1.2rem' }}>Total PRs</h4>
                  <p style={{ fontSize: '1.5rem', margin: '5px 0 0', color: '#34495e' }}>{Array.isArray(purchaseReceipts) ? purchaseReceipts.length : 0}</p>
                </div>
                <div style={{ 
                  padding: '20px', 
                  backgroundColor: '#ecf0f1', 
                  borderRadius: '8px', 
                  textAlign: 'center', 
                  flex: '1', 
                  minWidth: '200px' 
                }}>
                  <h4 style={{ margin: '0', color: '#2c3e50', fontSize: '1.2rem' }}>Total Spent</h4>
                  <p style={{ fontSize: '1.5rem', margin: '5px 0 0', color: '#34495e' }}>
                    ₹{Array.isArray(purchaseInvoices) ? purchaseInvoices.reduce((sum, pi) => sum + (Array.isArray(pi.items) ? pi.items.reduce((sub, item) => sub + Number(item.quantity) * Number(item.rate) * (1 + Number(item.tax) / 100), 0) : 0), 0).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>
              <h3 style={{ 
                margin: '20px 0', 
                color: '#2c3e50', 
                fontSize: '1.5rem', 
                fontWeight: '600' 
              }}>
                Top Items by Quantity Received
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#ecf0f1' }}>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Item Name</th>
                    <th style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#2c3e50', fontWeight: '600' }}>Quantity (Main Unit)</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(items) && items.length > 0 ? items.map(item => {
                    const totalQty = Array.isArray(purchaseReceipts) ? purchaseReceipts.reduce((sum, pr) => {
                      const prItem = Array.isArray(pr.items) && pr.items.find(i => i.itemId === item._id && i.status === 'Accepted');
                      if (!prItem) return sum;
                      return sum + (prItem.unit === 'main' ? Number(prItem.quantity) : Number(prItem.quantity) / item.conversionFactor);
                    }, 0) : 0;
                    return { name: item.name, qty: totalQty, unit: item.mainUnit };
                  }).sort((a, b) => b.qty - a.qty).slice(0, 5).map(item => (
                    <tr key={item.name}>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>{item.name}</td>
                      <td style={{ border: '1px solid #bdc3c7', padding: '12px', color: '#34495e' }}>{item.qty.toFixed(2)} {item.unit}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="2" style={{ border: '1px solid #bdc3c7', padding: '12px', textAlign: 'center', color: '#7f8c8d' }}>
                        No items available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Purchase;