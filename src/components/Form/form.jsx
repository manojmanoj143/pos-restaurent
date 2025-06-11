import React, { useState, useEffect } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';

const FormPage = () => {
  // State for customer form
  const [customerName, setCustomerName] = useState('');
  const [customerList, setCustomerList] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // State for item form
  const [formData, setFormData] = useState({
    item_code: "",
    item_name: "",
    item_group: "",
    image: "",
    price_list_rate: 0, // Ensure this is an integer
    kitchen: "",
    custom_addon_applicable: 0,
    custom_combo_applicable: 0,
    custom_total_calories: 0,
    custom_total_protein: 0,
    custom_total_fats: 0,
    custom_total_carbs: 0,
    addons: [{ name1: "", addon_price: 0, addon_image: "" }],
    combos: [{ name1: "", combo_price: 0, combo_image: "" }],
    ingredients: [{ ingredients_name: "", calories: 0, protein: 0 }],
    ratings: { average_rating: 0.0, total_reviews: 0 },
    discounts: [{ discount_type: "", discount_value: 0, valid_until: "" }],
  });

  const [itemList, setItemList] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  // Handle customer form submission
  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    const customerData = { customer_name: customerName };

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });

      if (response.ok) {
        const data = await response.json();
        alert('Customer created successfully!');
        setCustomerList([...customerList, data]);
        setCustomerName('');
      } else {
        alert('Failed to create customer');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error while creating customer');
    }
  };

  // Fetch all customers
  const handleViewCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomerList(data);
      } else {
        alert('Failed to fetch customers');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error while fetching customers');
    }
  };

  // Fetch all items
  const handleViewItems = async () => {
    try {
      const response = await fetch('/api/items');
      if (response.ok) {
        const data = await response.json();
        setItemList(data);
      } else {
        alert('Failed to fetch items');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error while fetching items');
    }
  };

  // Handle item form submission
  const handleItemSubmit = async (e) => {
    e.preventDefault();

    // Ensure price_list_rate is an integer
    const updatedFormData = {
      ...formData,
      price_list_rate: parseInt(formData.price_list_rate, 10),
    };

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFormData),
      });

      if (response.ok) {
        const data = await response.json();
        alert('Item created successfully!');
        setItemList([...itemList, data]);
        setFormData({
          item_code: "",
          item_name: "",
          item_group: "",
          image: "",
          price_list_rate: 0,
          kitchen: "",
          custom_addon_applicable: 0,
          custom_combo_applicable: 0,
          custom_total_calories: 0,
          custom_total_protein: 0,
          custom_total_fats: 0,
          custom_total_carbs: 0,
          addons: [{ name1: "", addon_price: 0, addon_image: "" }],
          combos: [{ name1: "", combo_price: 0, combo_image: "" }],
          ingredients: [{ ingredients_name: "", calories: 0, protein: 0 }],
          ratings: { average_rating: 0.0, total_reviews: 0 },
          discounts: [{ discount_type: "", discount_value: 0, valid_until: "" }],
        });
      } else {
        alert('Failed to create item');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error while creating item');
    }
  };

  // Handle input changes for top-level fields
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
    }));
  };

  // Handle changes for nested fields (addons, combos, ingredients, discounts)
  const handleNestedChange = (field, index, key, value) => {
    setFormData((prevState) => {
      const updatedField = [...prevState[field]];
      updatedField[index][key] = value;
      return { ...prevState, [field]: updatedField };
    });
  };

  // Handle changes for ratings
  const handleRatingsChange = (key, value) => {
    setFormData((prevState) => ({
      ...prevState,
      ratings: { ...prevState.ratings, [key]: value },
    }));
  };

  // Add a new addon
  const handleAddAddon = () => {
    setFormData((prevState) => ({
      ...prevState,
      addons: [...prevState.addons, { name1: "", addon_price: 0, addon_image: "" }],
    }));
  };

  // Add a new combo
  const handleAddCombo = () => {
    setFormData((prevState) => ({
      ...prevState,
      combos: [...prevState.combos, { name1: "", combo_price: 0, combo_image: "" }],
    }));
  };

  // Add a new ingredient
  const handleAddIngredient = () => {
    setFormData((prevState) => ({
      ...prevState,
      ingredients: [...prevState.ingredients, { ingredients_name: "", calories: 0, protein: 0 }],
    }));
  };

  // Add a new discount
  const handleAddDiscount = () => {
    setFormData((prevState) => ({
      ...prevState,
      discounts: [...prevState.discounts, { discount_type: "", discount_value: 0, valid_until: "" }],
    }));
  };

  // Handle item click to show details in a popup
  const handleItemClick = (item) => {
    setSelectedItem(item);
  };

  // Handle customer click to show details in a popup
  const handleCustomerClick = (customer) => {
    setSelectedCustomer(customer);
  };

  // Close the popup
  const handleClosePopup = () => {
    setSelectedItem(null);
    setSelectedCustomer(null);
  };

  return (
    <div className="container mt-5">
      <div className="row">
        {/* Left Column - Create Customer */}
        <div className="col-md-6">
          <div className="card p-4">
            <h1>Create a New Customer</h1>
            <form onSubmit={handleCustomerSubmit}>
              <div className="form-group">
                <label htmlFor="customer_name">Customer Name:</label>
                <input
                  type="text"
                  id="customer_name"
                  className="form-control"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary mt-3">
                Submit Customer
              </button>
            </form>
          </div>
        </div>

        {/* Right Column - Create Item */}
        <div className="col-md-6">
          <div className="card p-4">
            <h1>Create a New Item</h1>
            <form onSubmit={handleItemSubmit}>
              {/* Basic Item Details */}
              <div className="form-group">
                <label htmlFor="item_code">Item Code:</label>
                <input
                  type="text"
                  id="item_code"
                  className="form-control"
                  name="item_code"
                  value={formData.item_code}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="item_name">Item Name:</label>
                <input
                  type="text"
                  id="item_name"
                  className="form-control"
                  name="item_name"
                  value={formData.item_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="item_group">Item Group:</label>
                <input
                  type="text"
                  id="item_group"
                  className="form-control"
                  name="item_group"
                  value={formData.item_group}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="image">Image URL:</label>
                <input
                  type="text"
                  id="image"
                  className="form-control"
                  name="image"
                  value={formData.image}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="price_list_rate">Price List Rate:</label>
                <input
                  type="number"
                  id="price_list_rate"
                  className="form-control"
                  name="price_list_rate"
                  value={formData.price_list_rate}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="kitchen">Kitchen:</label>
                <input
                  type="text"
                  id="kitchen"
                  className="form-control"
                  name="kitchen"
                  value={formData.kitchen}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="custom_addon_applicable">Custom Addon Applicable:</label>
                <input
                  type="checkbox"
                  id="custom_addon_applicable"
                  name="custom_addon_applicable"
                  checked={formData.custom_addon_applicable === 1}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      custom_addon_applicable: e.target.checked ? 1 : 0,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="custom_combo_applicable">Custom Combo Applicable:</label>
                <input
                  type="checkbox"
                  id="custom_combo_applicable"
                  name="custom_combo_applicable"
                  checked={formData.custom_combo_applicable === 1}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      custom_combo_applicable: e.target.checked ? 1 : 0,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="custom_total_calories">Custom Total Calories:</label>
                <input
                  type="number"
                  id="custom_total_calories"
                  className="form-control"
                  name="custom_total_calories"
                  value={formData.custom_total_calories}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="custom_total_protein">Custom Total Protein:</label>
                <input
                  type="number"
                  id="custom_total_protein"
                  className="form-control"
                  name="custom_total_protein"
                  value={formData.custom_total_protein}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="custom_total_fats">Custom Total Fats:</label>
                <input
                  type="number"
                  id="custom_total_fats"
                  className="form-control"
                  name="custom_total_fats"
                  value={formData.custom_total_fats}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="custom_total_carbs">Custom Total Carbs:</label>
                <input
                  type="number"
                  id="custom_total_carbs"
                  className="form-control"
                  name="custom_total_carbs"
                  value={formData.custom_total_carbs}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Addons Section */}
              <h2>Addons</h2>
              {formData.addons.map((addon, index) => (
                <div key={index} className="form-group">
                  <label>Addon Name:</label>
                  <input
                    type="text"
                    className="form-control"
                    value={addon.name1}
                    onChange={(e) =>
                      handleNestedChange("addons", index, "name1", e.target.value)
                    }
                  />
                  <label>Addon Price:</label>
                  <input
                    type="number"
                    className="form-control"
                    value={addon.addon_price}
                    onChange={(e) =>
                      handleNestedChange("addons", index, "addon_price", parseFloat(e.target.value))
                    }
                  />
                  <label>Addon Image:</label>
                  <input
                    type="text"
                    className="form-control"
                    value={addon.addon_image}
                    onChange={(e) =>
                      handleNestedChange("addons", index, "addon_image", e.target.value)
                    }
                  />
                </div>
              ))}
              <button type="button" className="btn btn-secondary" onClick={handleAddAddon}>
                Add More Addons
              </button>

              {/* Combos Section */}
              <h2>Combos</h2>
              {formData.combos.map((combo, index) => (
                <div key={index} className="form-group">
                  <label>Combo Name:</label>
                  <input
                    type="text"
                    className="form-control"
                    value={combo.name1}
                    onChange={(e) =>
                      handleNestedChange("combos", index, "name1", e.target.value)
                    }
                  />
                  <label>Combo Price:</label>
                  <input
                    type="number"
                    className="form-control"
                    value={combo.combo_price}
                    onChange={(e) =>
                      handleNestedChange("combos", index, "combo_price", parseFloat(e.target.value))
                    }
                  />
                  <label>Combo Image:</label>
                  <input
                    type="text"
                    className="form-control"
                    value={combo.combo_image}
                    onChange={(e) =>
                      handleNestedChange("combos", index, "combo_image", e.target.value)
                    }
                  />
                </div>
              ))}
              <button type="button" className="btn btn-secondary" onClick={handleAddCombo}>
                Add More Combos
              </button>

              {/* Ingredients Section */}
              <h2>Ingredients</h2>
              {formData.ingredients.map((ingredient, index) => (
                <div key={index} className="form-group">
                  <label>Ingredient Name:</label>
                  <input
                    type="text"
                    className="form-control"
                    value={ingredient.ingredients_name}
                    onChange={(e) =>
                      handleNestedChange("ingredients", index, "ingredients_name", e.target.value)
                    }
                  />
                  <label>Calories:</label>
                  <input
                    type="number"
                    className="form-control"
                    value={ingredient.calories}
                    onChange={(e) =>
                      handleNestedChange("ingredients", index, "calories", parseFloat(e.target.value))
                    }
                  />
                  <label>Protein:</label>
                  <input
                    type="number"
                    className="form-control"
                    value={ingredient.protein}
                    onChange={(e) =>
                      handleNestedChange("ingredients", index, "protein", parseFloat(e.target.value))
                    }
                  />
                </div>
              ))}
              <button type="button" className="btn btn-secondary" onClick={handleAddIngredient}>
                Add More Ingredients
              </button>

              {/* Ratings Section */}
              <h2>Ratings</h2>
              <div className="form-group">
                <label>Average Rating:</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.ratings.average_rating}
                  onChange={(e) =>
                    handleRatingsChange("average_rating", parseFloat(e.target.value))
                  }
                />
              </div>
              <div className="form-group">
                <label>Total Reviews:</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.ratings.total_reviews}
                  onChange={(e) =>
                    handleRatingsChange("total_reviews", parseInt(e.target.value))
                  }
                />
              </div>

              {/* Discounts Section */}
              <h2>Discounts</h2>
              {formData.discounts.map((discount, index) => (
                <div key={index} className="form-group">
                  <label>Discount Type:</label>
                  <input
                    type="text"
                    className="form-control"
                    value={discount.discount_type}
                    onChange={(e) =>
                      handleNestedChange("discounts", index, "discount_type", e.target.value)
                    }
                  />
                  <label>Discount Value:</label>
                  <input
                    type="number"
                    className="form-control"
                    value={discount.discount_value}
                    onChange={(e) =>
                      handleNestedChange("discounts", index, "discount_value", parseFloat(e.target.value))
                    }
                  />
                  <label>Valid Until:</label>
                  <input
                    type="date"
                    className="form-control"
                    value={discount.valid_until}
                    onChange={(e) =>
                      handleNestedChange("discounts", index, "valid_until", e.target.value)
                    }
                  />
                </div>
              ))}
              <button type="button" className="btn btn-secondary" onClick={handleAddDiscount}>
                Add More Discounts
              </button>

              {/* Submit Button */}
              <button type="submit" className="btn btn-primary mt-3">
                Submit Item
              </button>
            </form>
          </div>
        </div>

        {/* Right Column - View Customers */}
        <div className="col-md-6">
          <div className="card mt-5 p-4">
            <h2>Customers</h2>
            <button className="btn btn-info" onClick={handleViewCustomers}>
              View All Customers
            </button>
            {customerList.length === 0 ? (
              <p>No customers to display.</p>
            ) : (
              <ul>
                {customerList.map((customer, index) => (
                  <li key={index}>
                    <strong
                      className="text-primary"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleCustomerClick(customer)}
                    >
                      {customer.customer_name}
                    </strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column - View Items */}
        <div className="col-md-6">
          <div className="card mt-5 p-4">
            <h2>Items</h2>
            <button className="btn btn-info" onClick={handleViewItems}>
              View All Items
            </button>
            {itemList.length === 0 ? (
              <p>No items to display.</p>
            ) : (
              <ul>
                {itemList.map((item, index) => (
                  <li key={index}>
                    <strong
                      className="text-primary"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleItemClick(item)}
                    >
                      {item.item_name}
                    </strong>
                    <p>Item Code: {item.item_code}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

{/* Popup for Full Item Details */}
{selectedItem && (
  <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
    <div className="modal-dialog modal-lg">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Full Item Details</h5>
          <button type="button" className="close" onClick={handleClosePopup}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div className="row">
            <div className="col-md-4">
              <img 
                src={selectedItem.image} 
                alt={selectedItem.item_name} 
                className="img-fluid mb-3"
                style={{ maxHeight: '200px', objectFit: 'cover' }}
              />
            </div>
            <div className="col-md-8">
              <h3>{selectedItem.item_name}</h3>
              <p className="text-muted">Code: {selectedItem.item_code}</p>
              <div className="row">
                <div className="col-md-6">
                  <p><strong>Group:</strong> {selectedItem.item_group}</p>
                  <p><strong>Price:</strong> ₹{selectedItem.price_list_rate}</p>
                  <p><strong>Kitchen:</strong> {selectedItem.kitchen}</p>
                </div>
                <div className="col-md-6">
                  <h5>Nutrition Info</h5>
                  <ul className="list-unstyled">
                    <li>Calories: {selectedItem.custom_total_calories}g</li>
                    <li>Protein: {selectedItem.custom_total_protein}g</li>
                    <li>Fats: {selectedItem.custom_total_fats}g</li>
                    <li>Carbs: {selectedItem.custom_total_carbs}g</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h4>Addons</h4>
            <div className="row">
              {selectedItem.addons.map((addon, index) => (
                <div key={index} className="col-md-4 mb-3">
                  <div className="card">
                    <img
                      src={addon.addon_image}
                      className="card-img-top"
                      alt={addon.name1}
                      style={{ height: '100px', objectFit: 'cover' }}
                    />
                    <div className="card-body">
                      <h5 className="card-title">{addon.name1}</h5>
                      <p className="card-text">₹{addon.addon_price}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <h4>Combos</h4>
            <div className="row">
              {selectedItem.combos.map((combo, index) => (
                <div key={index} className="col-md-4 mb-3">
                  <div className="card">
                    <img
                      src={combo.combo_image}
                      className="card-img-top"
                      alt={combo.name1}
                      style={{ height: '100px', objectFit: 'cover' }}
                    />
                    <div className="card-body">
                      <h5 className="card-title">{combo.name1}</h5>
                      <p className="card-text">₹{combo.combo_price}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <h4>Ingredients</h4>
            <ul className="list-group">
              {selectedItem.ingredients.map((ingredient, index) => (
                <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                  {ingredient.ingredients_name}
                  <span>
                    <span className="badge badge-primary mr-2">Calories: {ingredient.calories}g</span>
                    <span className="badge badge-success">Protein: {ingredient.protein}g</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4">
            <h4>Ratings</h4>
            <div className="row">
              <div className="col-md-6">
                <div className="alert alert-info">
                  Average Rating: {selectedItem.ratings.average_rating}/5
                </div>
              </div>
              <div className="col-md-6">
                <div className="alert alert-secondary">
                  Total Reviews: {selectedItem.ratings.total_reviews}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h4>Discounts</h4>
            <div className="row">
              {selectedItem.discounts.map((discount, index) => (
                <div key={index} className="col-md-4 mb-3">
                  <div className="card">
                    <div className="card-body">
                      <h5 className="card-title">{discount.discount_type}</h5>
                      <p className="card-text">
                        Value: {discount.discount_value}%<br />
                        Valid until: {new Date(discount.valid_until).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={handleClosePopup}>
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
)}

      {/* Popup for Full Customer Details */}
      {selectedCustomer && (
        <div className="modal show" style={{ display: 'block' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Customer Details</h5>
                <button type="button" className="close" onClick={handleClosePopup}>
                  &times;
                </button>
              </div>
              <div className="modal-body">
                <p><strong>Customer Name:</strong> {selectedCustomer.customer_name}</p>
                {/* More customer details */}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormPage;








<div className="col-md-6">
            {/* Ingredients */}
            <div className="form-group">
              {formData.ingredients.map((ingredient, index) => (
                <div key={index} className="mb-3">
                  <label htmlFor={`ingredients[${index}].ingredients_name`}>Ingredient Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name={`ingredients[${index}].ingredients_name`}
                    value={ingredient.ingredients_name}
                    onChange={(e) => handleNestedChange("ingredients", index, "ingredients_name", e.target.value)}
                  />
                  <label htmlFor={`ingredients[${index}].calories`}>Calories</label>
                  <input
                    type="number"
                    className="form-control"
                    name={`ingredients[${index}].calories`}
                    value={ingredient.calories}
                    onChange={(e) => handleNestedChange("ingredients", index, "calories", e.target.value)}
                  />
                  <label htmlFor={`ingredients[${index}].protein`}>Protein</label>
                  <input
                    type="number"
                    className="form-control"
                    name={`ingredients[${index}].protein`}
                    value={ingredient.protein}
                    onChange={(e) => handleNestedChange("ingredients", index, "protein", e.target.value)}
                  />
                </div>
              ))}
              <div className="text-center">
                <button type="button" className="btn btn-success mt-2" onClick={handleAddIngredient}>
                  Add Another Ingredient
                </button>
              </div>
            </div>

            {/* Discounts */}
            <div className="form-group">
              {formData.discounts.map((discount, index) => (
                <div key={index} className="mb-3">
                  <label htmlFor={`discounts[${index}].discount_type`}>Discount Type</label>
                  <input
                    type="text"
                    className="form-control"
                    name={`discounts[${index}].discount_type`}
                    value={discount.discount_type}
                    onChange={(e) => handleNestedChange("discounts", index, "discount_type", e.target.value)}
                  />
                  <label htmlFor={`discounts[${index}].discount_value`}>Discount Value (%)</label>
                  <input
                    type="number"
                    className="form-control"
                    name={`discounts[${index}].discount_value`}
                    value={discount.discount_value}
                    onChange={(e) => handleNestedChange("discounts", index, "discount_value", e.target.value)}
                  />
                  <label htmlFor={`discounts[${index}].valid_until`}>Valid Until</label>
                  <input
                    type="date"
                    className="form-control"
                    name={`discounts[${index}].valid_until`}
                    value={discount.valid_until}
                    onChange={(e) => handleNestedChange("discounts", index, "valid_until", e.target.value)}
                  />
                </div>
              ))}
              <div className="text-center">
                <button type="button" className="btn btn-success mt-2" onClick={handleAddDiscount}>
                  Add Another Discount
                </button>
              </div>
            </div>
          </div>
 
 
 