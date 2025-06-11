import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for navigation
import axios from 'axios';
import './CreateVariant.css';

const CreateVariant = () => {
  const [variantName, setVariantName] = useState('');
  const [types, setTypes] = useState([]);
  const [newType, setNewType] = useState('');
  const [prices, setPrices] = useState({});
  const [images, setImages] = useState({});
  const [activeSection, setActiveSection] = useState(null);
  const [variants, setVariants] = useState([]);
  const [editingVariantId, setEditingVariantId] = useState(null);
  const [showList, setShowList] = useState(false);
  const [warning, setWarning] = useState(null);

  const navigate = useNavigate(); // Initialize useNavigate hook

  // Clear warning after 3 seconds
  useEffect(() => {
    if (warning) {
      const timer = setTimeout(() => setWarning(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [warning]);

  // Fetch all variants for the list
  const fetchVariants = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/variants');
      setVariants(response.data);
    } catch (error) {
      setWarning({ type: 'error', message: 'Failed to fetch variants' });
      console.error('Error fetching variants:', error);
    }
  };

  // Fetch a specific variant for editing
  const fetchVariant = async (id) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/variants/${id}`);
      const variant = response.data;
      setVariantName(variant.heading);
      setTypes(variant.subheadings.map((sub) => sub.name));
      setPrices(
        variant.subheadings.reduce((acc, sub) => ({
          ...acc,
          [sub.name]: sub.price || '',
        }), {})
      );
      setImages(
        variant.subheadings.reduce((acc, sub) => ({
          ...acc,
          [sub.name]: sub.image || '',
        }), {})
      );
      setActiveSection(variant.activeSection || 'price');
      setEditingVariantId(id);
      setShowList(false);
    } catch (error) {
      setWarning({ type: 'error', message: 'Failed to fetch variant' });
      console.error('Error fetching variant:', error);
    }
  };

  // Handle adding a new type
  const handleAddType = () => {
    if (newType.trim() && !types.includes(newType.trim())) {
      setTypes([...types, newType.trim()]);
      setNewType('');
    }
  };

  // Handle price input for a specific type
  const handlePriceChange = (type, value) => {
    setPrices({ ...prices, [type]: value });
  };

  // Handle image upload for a specific type
  const handleImageUpload = (type, event) => {
    const file = event.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setImages({ ...images, [type]: imageUrl });
    }
  };

  // Handle saving variant
  const handleSave = async () => {
    try {
      if (!variantName.trim()) {
        setWarning({ type: 'error', message: 'Variant name is required' });
        return;
      }
      if (types.length === 0) {
        setWarning({ type: 'error', message: 'At least one type is required' });
        return;
      }

      const variantData = {
        heading: variantName,
        subheadings: types.map((type) => {
          const subheading = { name: type };
          if (activeSection === 'price' || activeSection === 'priceAndImage') {
            subheading.price = prices[type] ? parseFloat(prices[type]) : null;
          }
          if (activeSection === 'priceAndImage') {
            subheading.image = images[type] || null;
          }
          if (activeSection === 'dropdown') {
            subheading.dropdown = true;
          }
          return subheading;
        }),
        activeSection,
      };

      if (editingVariantId) {
        await axios.put(`http://localhost:5000/api/variants/${editingVariantId}`, variantData);
        setWarning({ type: 'success', message: 'Variant updated successfully' });
      } else {
        await axios.delete(`http://localhost:5000/api/variants/heading/${variantName}`);
        await axios.post('http://localhost:5000/api/variants', variantData);
        setWarning({ type: 'success', message: 'Variant saved successfully' });
      }

      setVariantName('');
      setTypes([]);
      setNewType('');
      setPrices({});
      setImages({});
      setActiveSection(null);
      setEditingVariantId(null);
      fetchVariants();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to save variant';
      setWarning({ type: 'error', message: errorMsg });
      console.error('Error saving variant:', error);
    }
  };

  // Render price fields
  const renderPriceFields = () => {
    return types.map((type) => (
      <div key={type} className="field-container">
        <label className="field-label">{`${type} Price`}</label>
        <input
          type="number"
          value={prices[type] || ''}
          onChange={(e) => handlePriceChange(type, e.target.value)}
          className="field-input"
          placeholder="Enter price"
        />
      </div>
    ));
  };

  // Render price and image fields together
  const renderPriceAndImageFields = () => {
    return types.map((type) => (
      <div key={type} className="field-container">
        <label className="field-label">{`${type} Price`}</label>
        <input
          type="number"
          value={prices[type] || ''}
          onChange={(e) => handlePriceChange(type, e.target.value)}
          className="field-input"
          placeholder="Enter price"
        />
        <label className="field-label">{`${type} Image`}</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleImageUpload(type, e)}
          className="field-input"
        />
        {images[type] && (
          <img src={images[type]} alt={`${type} preview`} className="image-preview" />
        )}
      </div>
    ));
  };

  // Render dropdown
  const renderDropdown = () => {
    return (
      <div className="field-container">
        <label className="field-label">Select Type</label>
        <select className="field-input">
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
    );
  };

  // Handle button clicks to toggle sections
  const handleShowSection = (section) => {
    setActiveSection(section);
  };

  // Toggle variant list visibility
  const handleShowList = () => {
    setShowList(!showList);
    if (!showList) fetchVariants();
  };

  // Handle back navigation
  const handleBack = () => {
    navigate('/admin'); // Adjust the path as needed (e.g., '/dashboard')
  };

  return (
    <div className="variant-container">
      {/* Back Button */}
      <div className="back-button-container">
        <button onClick={handleBack} className="action-button back-button">
          ← Back
        </button>
      </div>

      <h2 className="title">Create Variant</h2>

      {/* Warning Message */}
      {warning && (
        <div className={`warning ${warning.type === 'success' ? 'warning-success' : 'warning-error'}`}>
          {warning.message}
        </div>
      )}

      {/* Variant Name Input */}
      <div className="field-container">
        <label className="field-label">Variant Name</label>
        <input
          type="text"
          value={variantName}
          onChange={(e) => setVariantName(e.target.value)}
          className="field-input"
          placeholder="e.g., Size"
        />
      </div>

      {/* Type Input */}
      <div className="field-container">
        <label className="field-label">Add Type</label>
        <div className="input-button-group">
          <input
            type="text"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="field-input"
            placeholder="e.g., Small, Medium, Large"
          />
          <button
            onClick={handleAddType}
            className="action-button add-type-button"
          >
            Add Type
          </button>
        </div>
      </div>

      {/* Display Added Types */}
      {types.length > 0 && (
        <div className="field-container">
          <h3 className="subtitle">Added Types:</h3>
          <ul className="type-list">
            {types.map((type) => (
              <li key={type}>{type}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="button-group">
        <button
          onClick={() => handleShowSection('price')}
          className="action-button price-button"
        >
          Add Price
        </button>
        <button
          onClick={() => handleShowSection('priceAndImage')}
          className="action-button image-button"
        >
          Add Image
        </button>
        <button
          onClick={() => handleShowSection('dropdown')}
          className="action-button dropdown-button"
        >
          Add Dropdown
        </button>
        <button
          onClick={handleSave}
          className="action-button save-button"
        >
          Save ✓
        </button>
        <button
          onClick={handleShowList}
          className="action-button list-button"
        >
          {showList ? 'Hide List' : 'List'}
        </button>
      </div>

      {/* Conditionally Render Sections */}
      {types.length > 0 && activeSection === 'price' && renderPriceFields()}
      {types.length > 0 && activeSection === 'priceAndImage' && renderPriceAndImageFields()}
      {types.length > 0 && activeSection === 'dropdown' && renderDropdown()}

      {/* Variant List */}
      {showList && (
        <div className="variant-list">
          <h3 className="subtitle">Variants:</h3>
          <ul className="type-list">
            {variants.map((variant) => (
              <li
                key={variant._id}
                onClick={() => fetchVariant(variant._id)}
                className="variant-item"
              >
                {variant.heading}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CreateVariant;