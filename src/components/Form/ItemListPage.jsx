import React, { useState, useEffect } from "react";
import { Modal, Button, Card, Form } from "react-bootstrap";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css';

const ItemListPage = () => {
  const [itemList, setItemList] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All Items");
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [offerItem, setOfferItem] = useState(null);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerStartTime, setOfferStartTime] = useState("");
  const [offerEndTime, setOfferEndTime] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [showNutritionModal, setShowNutritionModal] = useState(false);
  const [nutritionData, setNutritionData] = useState({ ingredients: [], nutrition: {} });
  const navigate = useNavigate();

  // Fetch all items
  const handleViewItems = async () => {
    try {
      const response = await fetch('/api/items');
      if (response.ok) {
        const data = await response.json();
        setItemList(data);
      } else {
        setWarningMessage('Failed to fetch items');
      }
    } catch (error) {
      console.error('Error:', error);
      setWarningMessage('Error while fetching items');
    }
  };

  // Get unique categories from items
  const getCategories = () => {
    const categories = [...new Set(itemList.map(item => item.item_group))];
    const filteredCategories = categories.filter(category => category);
    return ["All Items", ...filteredCategories];
  };

  // Handle category selection
  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
  };

  // Normalize ingredients to always be an array
  const normalizeIngredients = (ingredients) => {
    if (Array.isArray(ingredients)) {
      return ingredients;
    }
    if (typeof ingredients === 'string' && ingredients.trim() !== '') {
      return [{ name: ingredients }];
    }
    if (typeof ingredients === 'object' && ingredients !== null && Object.keys(ingredients).length > 0) {
      return [ingredients];
    }
    return [];
  };

  // Handle item click to view details
  const handleItemClick = (item) => {
    const normalizedIngredients = normalizeIngredients(item.ingredients);
    setSelectedItem({ ...item, ingredients: normalizedIngredients });
    setNutritionData({
      ingredients: normalizedIngredients,
      nutrition: item.nutrition || {},
    });
    setShowModal(true);
  };

  // Close the item details modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

  // Close the offer modal
  const handleCloseOfferModal = () => {
    setShowOfferModal(false);
    setOfferItem(null);
    setSearchTerm("");
    setOfferPrice("");
    setOfferStartTime("");
    setOfferEndTime("");
  };

  // Close the nutrition modal
  const handleCloseNutritionModal = () => {
    setShowNutritionModal(false);
  };

  // Go back to the previous page
  const goBack = () => {
    navigate(-1);
  };

  // Delete item
  const handleDeleteItem = async () => {
    if (selectedItem) {
      try {
        const response = await fetch(`/api/items/${selectedItem._id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setItemList(itemList.filter(item => item._id !== selectedItem._id));
          handleCloseModal();
          setWarningMessage("Item deleted successfully!");
        } else {
          const errorData = await response.json();
          setWarningMessage(`Failed to delete item: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error:', error);
        setWarningMessage('Error while deleting item');
      }
    }
  };

  // Edit item
  const handleEditItem = () => {
    navigate("/create-item", {
      state: { item: { ...selectedItem, ingredients: normalizeIngredients(selectedItem.ingredients) } },
    });
  };

  // Handle offer button click
  const handleOfferClick = () => {
    setShowOfferModal(true);
  };

  // Handle selecting an item for offer
  const handleOfferItemSelect = (item) => {
    setOfferItem(item);
    setOfferPrice("");
    setOfferStartTime("");
    setOfferEndTime("");
  };

  // Submit offer
  const handleOfferSubmit = async () => {
    if (!offerItem || !offerPrice || !offerStartTime || !offerEndTime) {
      setWarningMessage("Please fill all offer details");
      return;
    }

    try {
      const startTime = new Date(offerStartTime);
      const endTime = new Date(offerEndTime);
      if (startTime >= endTime) {
        setWarningMessage("Offer start time must be before end time");
        return;
      }

      const offerData = {
        offer_price: parseFloat(offerPrice),
        offer_start_time: startTime.toISOString(),
        offer_end_time: endTime.toISOString(),
      };

      const response = await fetch(`/api/items/${offerItem._id}/offer`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(offerData),
      });

      if (response.ok) {
        await handleViewItems();
        handleCloseOfferModal();
        setWarningMessage("Offer added successfully!");
      } else {
        const errorData = await response.json();
        setWarningMessage(`Failed to add offer: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setWarningMessage('Error while adding offer');
    }
  };

  // Handle Ingredients & Nutrition button click
  const handleNutritionClick = () => {
    setShowNutritionModal(true);
  };

  // Initial fetch and refresh on popstate
  useEffect(() => {
    handleViewItems();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      handleViewItems();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Inline styles
  const sidebarStyle = {
    position: "fixed",
    top: "70px",
    left: "0",
    width: "200px",
    height: "calc(100vh - 70px)",
    backgroundColor: "#f8f9fa",
    padding: "20px",
    overflowY: "auto",
    borderRight: "1px solid #ddd",
  };

  const categoryBoxStyle = {
    padding: "10px",
    marginBottom: "10px",
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    borderRadius: "5px",
    cursor: "pointer",
    textAlign: "center",
    transition: "all 0.3s ease",
  };

  const selectedCategoryBoxStyle = {
    ...categoryBoxStyle,
    backgroundColor: "#28a745",
    color: "white",
    borderColor: "#28a745",
  };

  const cardStyle = {
    border: "1px solid #ddd",
    padding: "10px",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    borderRadius: "8px",
    transition: "all 0.3s ease",
  };

  const cardHoverStyle = {
    transform: "translateY(-5px)",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.2)",
  };

  const imgStyle = {
    width: "100%",
    height: "200px",
    objectFit: "cover",
    borderRadius: "8px",
  };

  const contentStyle = {
    marginLeft: "220px",
    padding: "20px",
  };

  const priceStyle = {
    fontSize: "1rem",
    marginTop: "5px",
  };

  const strikethroughStyle = {
    textDecoration: "line-through",
    color: "#888",
    marginRight: "10px",
  };

  const offerPriceStyle = {
    color: "#ff4500",
    fontWeight: "bold",
  };

  const warningBoxStyle = {
    backgroundColor: "#fff3cd",
    border: "1px solid #ffeeba",
    color: "#856404",
    padding: "15px",
    marginBottom: "20px",
    borderRadius: "8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "60px",
  };

  const warningTextStyle = {
    margin: 0,
    fontSize: "14px",
  };

  const closeWarningStyle = {
    background: "none",
    border: "none",
    color: "#856404",
    cursor: "pointer",
    fontSize: "16px",
  };

  const multipleImagesStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "10px",
  };

  const nutritionModalStyle = {
    padding: "20px",
  };

  const nutritionItemStyle = {
    marginBottom: "10px",
    fontSize: "1rem",
  };

  // Filter items based on selected category
  const filteredItems = selectedCategory === "All Items"
    ? itemList
    : itemList.filter(item => item.item_group === selectedCategory);

  // Filter items for offer search
  const searchedItems = itemList.filter(item =>
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if item has an active offer
  const hasActiveOffer = (item) => {
    if (item.offer_price === undefined || !item.offer_start_time || !item.offer_end_time) {
      return false;
    }
    const currentTime = new Date();
    const startTime = new Date(item.offer_start_time);
    const endTime = new Date(item.offer_end_time);
    return startTime <= currentTime && currentTime <= endTime;
  };

  // Format nutrition field names for display
  const formatNutritionLabel = (key) => {
    return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
  };

  // Render ingredients based on their type
  const renderIngredients = (ingredients) => {
    if (!ingredients) {
      return null;
    }

    if (Array.isArray(ingredients) && ingredients.length > 0) {
      return (
        <ul>
          {ingredients.map((ingredient, index) => (
            <li key={index}>
              {ingredient.name || 'Unnamed ingredient'}
              {ingredient.quantity && ingredient.unit
                ? ` (${ingredient.quantity} ${ingredient.unit})`
                : ''}
              {ingredient.optional ? ' (Optional)' : ''}
            </li>
          ))}
        </ul>
      );
    }

    if (typeof ingredients === 'string' && ingredients.trim() !== '') {
      return <p>{ingredients}</p>;
    }

    if (typeof ingredients === 'object' && ingredients !== null && Object.keys(ingredients).length > 0) {
      return (
        <ul>
          <li>
            {ingredients.name || 'Unnamed ingredient'}
            {ingredients.quantity && ingredients.unit
              ? ` (${ingredients.quantity} ${ingredients.unit})`
              : ''}
            {ingredients.optional ? ' (Optional)' : ''}
          </li>
        </ul>
      );
    }

    return null;
  };

  // Check if there's valid data to display
  const hasValidData = () => {
    const hasIngredients =
      (Array.isArray(nutritionData.ingredients) && nutritionData.ingredients.length > 0) ||
      (typeof nutritionData.ingredients === 'string' && nutritionData.ingredients.trim() !== '') ||
      (typeof nutritionData.ingredients === 'object' && nutritionData.ingredients !== null && Object.keys(nutritionData.ingredients).length > 0);
    const hasNutrition =
      nutritionData.nutrition &&
      Object.keys(nutritionData.nutrition).length > 0 &&
      Object.entries(nutritionData.nutrition).some(([_, value]) => value !== '' && value !== null && value !== undefined);
    return hasIngredients || hasNutrition;
  };

  return (
    <div className="container-fluid mt-5">
      <button
        onClick={goBack}
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          backgroundColor: "#f0f0f0",
          border: "1px solid #ccc",
          color: "#333",
          borderRadius: "5px",
          padding: "10px",
          cursor: "pointer",
        }}
      >
        <FaArrowLeft style={{ fontSize: "24px" }} />
      </button>

      <button
        onClick={handleOfferClick}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          backgroundColor: "#ff4500",
          border: "none",
          color: "white",
          borderRadius: "5px",
          padding: "10px 20px",
          cursor: "pointer",
          fontSize: "16px",
          fontWeight: "bold",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#ff6347";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#ff4500";
        }}
      >
        Offer
      </button>

      {warningMessage && (
        <div style={warningBoxStyle}>
          <p style={warningTextStyle}>{warningMessage}</p>
          <button
            style={closeWarningStyle}
            onClick={() => setWarningMessage("")}
          >
            ×
          </button>
        </div>
      )}

      <div style={sidebarStyle}>
        <h4>Categories</h4>
        {getCategories().map((category) => (
          <div
            key={category}
            style={category === selectedCategory ? selectedCategoryBoxStyle : categoryBoxStyle}
            onClick={() => handleCategoryClick(category)}
            onMouseEnter={(e) => {
              if (category !== selectedCategory) {
                e.currentTarget.style.backgroundColor = "#e9ecef";
              }
            }}
            onMouseLeave={(e) => {
              if (category !== selectedCategory) {
                e.currentTarget.style.backgroundColor = "#fff";
              }
            }}
          >
            {category}
          </div>
        ))}
      </div>

      <div style={contentStyle}>
        <h2>{selectedCategory ? `${selectedCategory} Items` : "Select a Category"}</h2>
        <div className="row">
          {itemList.length === 0 ? (
            <p>No items to display.</p>
          ) : !selectedCategory ? (
            <p>Please select a category from the sidebar.</p>
          ) : (
            filteredItems.map((item) => (
              <div key={item._id} className="col-md-2 mb-4">
                <Card
                  style={cardStyle}
                  onMouseEnter={(e) => (e.currentTarget.style = { ...cardStyle, ...cardHoverStyle })}
                  onMouseLeave={(e) => (e.currentTarget.style = cardStyle)}
                >
                  <Card.Img
                    variant="top"
                    src={item.image ? `http://localhost:5000${item.image}` : "https://via.placeholder.com/200x200?text=No+Image+Available"}
                    alt={item.item_name}
                    style={imgStyle}
                  />
                  <Card.Body style={{ textAlign: "center" }}>
                    <Button
                      variant="success"
                      onClick={() => handleItemClick(item)}
                      style={{ marginBottom: "10px", backgroundColor: "#28a745", borderColor: "#28a745" }}
                    >
                      View
                    </Button>
                    <Card.Title style={{ fontSize: "1.2rem", color: "black" }}>
                      {item.item_name}
                    </Card.Title>
                    <div style={priceStyle}>
                      {hasActiveOffer(item) ? (
                        <>
                          <span style={strikethroughStyle}>₹{item.price_list_rate}</span>
                          <span style={offerPriceStyle}>₹{item.offer_price}</span>
                        </>
                      ) : (
                        <span>₹{item.price_list_rate}</span>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedItem && (
        <Modal show={showModal} onHide={handleCloseModal}>
          <Modal.Header closeButton>
            <Modal.Title>{selectedItem.item_name}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="container">
              <h5>Item Code: {selectedItem.item_code}</h5>
              <h5>Item Group: {selectedItem.item_group}</h5>
              <h5>Kitchen: {selectedItem.kitchen || "Not specified"}</h5>
              <h5>
                Price:{" "}
                {hasActiveOffer(selectedItem) ? (
                  <>
                    <span style={strikethroughStyle}>₹{selectedItem.price_list_rate}</span>{" "}
                    <span style={offerPriceStyle}>₹{selectedItem.offer_price}</span>
                  </>
                ) : (
                  `₹${selectedItem.price_list_rate}`
                )}
              </h5>
              {hasActiveOffer(selectedItem) && (
                <>
                  <h5>Offer Starts: {new Date(selectedItem.offer_start_time).toLocaleString()}</h5>
                  <h5>Offer Ends: {new Date(selectedItem.offer_end_time).toLocaleString()}</h5>
                </>
              )}
              <div>
                <h6>Image:</h6>
                <img
                  src={selectedItem.image ? `http://localhost:5000${selectedItem.image}` : "https://via.placeholder.com/200x200?text=No+Image+Available"}
                  alt={selectedItem.item_name}
                  className="img-fluid"
                  style={imgStyle}
                />
              </div>
              {selectedItem.images && selectedItem.images.length > 0 && (
                <div>
                  <h6>Additional Images:</h6>
                  <div style={multipleImagesStyle}>
                    {selectedItem.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={`http://localhost:5000/static/uploads/${img}`}
                        alt={`${selectedItem.item_name} additional ${idx + 1}`}
                        style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "8px" }}
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/100x100?text=Image+Not+Found";
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              {selectedItem.addons && selectedItem.addons.length > 0 && (
                <div>
                  <h6>Addons:</h6>
                  <ul>
                    {selectedItem.addons
                      .filter(addon => addon.name1 || addon.addon_price > 0 || addon.addon_image)
                      .map((addon, idx) => (
                        <li key={idx}>
                          {addon.name1 && <p>Name: {addon.name1}</p>}
                          {addon.addon_price > 0 && <p>Price: ₹{addon.addon_price}</p>}
                          {addon.addon_image && (
                            <img
                              src={`http://localhost:5000${addon.addon_image}`}
                              alt={addon.name1}
                              style={{ width: "100px", height: "100px", objectFit: "cover" }}
                            />
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {selectedItem.combos && selectedItem.combos.length > 0 && (
                <div>
                  <h6>Combos:</h6>
                  <ul>
                    {selectedItem.combos
                      .filter(combo => combo.name1 || combo.combo_price > 0 || combo.combo_image)
                      .map((combo, idx) => (
                        <li key={idx}>
                          {combo.name1 && <p>Name: {combo.name1}</p>}
                          {combo.combo_price > 0 && <p>Price: ₹{combo.combo_price}</p>}
                          {combo.combo_image && (
                            <img
                              src={`http://localhost:5000${combo.combo_image}`}
                              alt={combo.name1}
                              style={{ width: "100px", height: "100px", objectFit: "cover" }}
                            />
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {selectedItem.variants && selectedItem.variants.length > 0 && (
                <div>
                  <h6>Variants:</h6>
                  <ul>
                    {selectedItem.variants
                      .filter(variant => variant.type_of_variants || variant.variant_image)
                      .map((variant, idx) => (
                        <li key={idx}>
                          {variant.type_of_variants && <p>Type: {variant.type_of_variants}</p>}
                          {variant.variant_image && (
                            <img
                              src={`http://localhost:5000${variant.variant_image}`}
                              alt={variant.type_of_variants}
                              style={{ width: "100px", height: "100px", objectFit: "cover" }}
                            />
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {selectedItem.custom_fields && selectedItem.custom_fields.length > 0 && (
                <div>
                  <h6>Custom Fields:</h6>
                  <ul>
                    {selectedItem.custom_fields.map((field, idx) => (
                      <li key={idx}>
                        <p>
                          {field.name}:{" "}
                          {field.type === "image" ? (
                            <img
                              src={field.value ? `http://localhost:5000/static/uploads/${field.value}` : "https://via.placeholder.com/100x100?text=No+Image+Available"}
                              alt={field.name}
                              style={{ width: "100px", height: "100px", objectFit: "cover" }}
                            />
                          ) : field.type === "checkbox" ? (
                            field.value ? "Yes" : "No"
                          ) : (
                            field.value
                          )}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>Close</Button>
            <Button variant="danger" onClick={handleDeleteItem}>Delete</Button>
            <Button variant="success" onClick={handleEditItem}>Edit</Button>
            <Button variant="primary" onClick={handleNutritionClick}>Ingredients & Nutrition</Button>
          </Modal.Footer>
        </Modal>
      )}

      {selectedItem && (
        <Modal show={showNutritionModal} onHide={handleCloseNutritionModal}>
          <Modal.Header closeButton>
            <Modal.Title>{selectedItem.item_name} - Ingredients & Nutrition</Modal.Title>
          </Modal.Header>
          <Modal.Body style={nutritionModalStyle}>
            {hasValidData() ? (
              <div>
                {(nutritionData.ingredients || Array.isArray(nutritionData.ingredients)) && (
                  <div style={nutritionItemStyle}>
                    <h6>Ingredients:</h6>
                    {renderIngredients(nutritionData.ingredients)}
                  </div>
                )}
                {nutritionData.nutrition && Object.keys(nutritionData.nutrition).length > 0 && (
                  <div style={nutritionItemStyle}>
                    <h6>Nutrition Information:</h6>
                    <ul>
                      {Object.entries(nutritionData.nutrition)
                        .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
                        .map(([key, value]) => (
                          <li key={key}>
                            <strong>{formatNutritionLabel(key)}:</strong> {value}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p>No ingredients or nutrition data available for this item.</p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseNutritionModal}>Close</Button>
          </Modal.Footer>
        </Modal>
      )}

      {showOfferModal && (
        <Modal show={showOfferModal} onHide={handleCloseOfferModal}>
          <Modal.Header closeButton>
            <Modal.Title>Create Offer</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Search Items</Form.Label>
                <Form.Control
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search for items..."
                />
              </Form.Group>
              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                {searchedItems.length === 0 && searchTerm && (
                  <p>No items found.</p>
                )}
                {searchedItems.map((item) => (
                  <Card
                    key={item._id}
                    style={{
                      marginBottom: "10px",
                      cursor: "pointer",
                      backgroundColor: offerItem?._id === item._id ? "#e9ecef" : "white",
                    }}
                    onClick={() => handleOfferItemSelect(item)}
                  >
                    <Card.Body>
                      <Card.Title>{item.item_name}</Card.Title>
                      <Card.Text>Price: ₹{item.price_list_rate}</Card.Text>
                    </Card.Body>
                  </Card>
                ))}
              </div>
              {offerItem && (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label>Selected Item: {offerItem.item_name}</Form.Label>
                    <Form.Text className="d-block">Current Price: ₹{offerItem.price_list_rate}</Form.Text>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Offer Price</Form.Label>
                    <Form.Control
                      type="number"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      placeholder="Enter offer price"
                      min="0"
                      step="0.01"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Offer Start Time</Form.Label>
                    <Form.Control
                      type="datetime-local"
                      value={offerStartTime}
                      onChange={(e) => setOfferStartTime(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Offer End Time</Form.Label>
                    <Form.Control
                      type="datetime-local"
                      value={offerEndTime}
                      onChange={(e) => setOfferEndTime(e.target.value)}
                      min={offerStartTime || new Date().toISOString().slice(0, 16)}
                    />
                  </Form.Group>
                </>
              )}
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseOfferModal}>Close</Button>
            <Button variant="primary" onClick={handleOfferSubmit} disabled={!offerItem}>
              Create Offer
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
};

export default ItemListPage;