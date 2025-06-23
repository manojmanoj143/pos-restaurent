import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';

const AddIngredientAndNutrition = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);
  const [isMessageBoxVisible, setIsMessageBoxVisible] = useState(false);

  const { formData: passedFormData, itemId, isEditing = false, itemToEdit } = location.state || {};

  const [ingredients, setIngredients] = useState(
    passedFormData?.ingredients || [{ name: '', small: '', medium: '', large: '', weight: '', nutrition: [] }]
  );
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(itemId === "new" ? passedFormData?.item_name : '');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNewItem, setIsNewItem] = useState(itemId === "new");

  const nutritionNames = [
    'Carbohydrates', 'Calories', 'carbs', 'Proteins', 'Fats', 'Fiber', 'Vitamins', 'Minerals', 'Water', 'Sugars', 'Starch',
    'Amino Acids', 'Fatty Acids', 'Cholesterol', 'Antioxidants', 'Electrolytes', 'Glucose', 'Fructose',
    'Sucrose', 'Lactose', 'Cellulose', 'Pectin', 'Essential Amino Acids', 'Non-Essential Amino Acids',
    'Saturated Fats', 'Unsaturated Fats', 'Trans Fats', 'Omega-3 Fatty Acids', 'Omega-6 Fatty Acids',
    'Vitamin A', 'Vitamin B1', 'Vitamin B2', 'Vitamin B3', 'Vitamin B5', 'Vitamin B6', 'Vitamin B7',
    'Vitamin B9', 'Vitamin B12', 'Vitamin C', 'Vitamin D', 'Vitamin E', 'Vitamin K', 'Calcium',
    'Phosphorus', 'Magnesium', 'Sodium', 'Potassium', 'Chloride', 'Sulfur', 'Iron', 'Zinc', 'Copper',
    'Manganese', 'Iodine', 'Selenium', 'Molybdenum', 'Chromium', 'Phytochemicals', 'Flavonoids',
    'Polyphenols', 'Carotenoids', 'Glycogen', 'Beta-Glucans', 'Sterols',
  ];

  const generateOptions = () => {
    const nameMap = {};

    items.forEach((item) => {
      if (!nameMap[item.item_name]) {
        nameMap[item.item_name] = {
          label: `${item.item_name} (Item)`,
          value: item.item_name,
          type: 'item',
          instances: [{ item_id: item._id }],
        };
      } else {
        nameMap[item.item_name].instances.push({ item_id: item._id });
      }

      item.addons?.forEach((addon, index) => {
        if (!nameMap[addon.name1]) {
          nameMap[addon.name1] = {
            label: `${addon.name1} (Addon)`,
            value: addon.name1,
            type: 'addon',
            instances: [{ item_id: item._id, index }],
          };
        } else {
          nameMap[addon.name1].instances.push({ item_id: item._id, index });
        }
      });

      item.combos?.forEach((combo, index) => {
        if (!nameMap[combo.name1]) {
          nameMap[combo.name1] = {
            label: `${combo.name1} (Combo)`,
            value: combo.name1,
            type: 'combo',
            instances: [{ item_id: item._id, index }],
          };
        } else {
          nameMap[combo.name1].instances.push({ item_id: item._id, index });
        }
      });
    });

    return Object.values(nameMap).sort((a, b) => a.label.localeCompare(b.label));
  };

  const options = generateOptions();

  const filteredOptions = searchTerm.trim()
    ? options.filter((option) => option.value.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  const fetchItems = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/items');
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      } else {
        setError('Failed to fetch items');
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      setError('Error while fetching items');
    } finally {
      setLoading(false);
    }
  };

  const fetchItemData = async (selectedValue) => {
    if (!selectedValue || isNewItem) {
      setIngredients(passedFormData?.ingredients || [{ name: '', small: '', medium: '', large: '', weight: '', nutrition: [] }]);
      setHasExistingData(false);
      return;
    }

    const option = options.find((opt) => opt.value === selectedValue);
    if (!option) {
      setIngredients([{ name: '', small: '', medium: '', large: '', weight: '', nutrition: [] }]);
      setHasExistingData(false);
      return;
    }

    const { type, instances } = option;
    let ingredients = [];

    const firstInstance = instances[0];
    try {
      const response = await fetch(
        `http://localhost:5000/api/items/nutrition/${encodeURIComponent(selectedValue)}?type=${type}&item_id=${firstInstance.item_id}${
          type !== 'item' ? `&index=${firstInstance.index}` : ''
        }`
      );
      if (response.ok) {
        const data = await response.json();
        ingredients = data.ingredients || [];
      }
    } catch (error) {
      console.error('Error fetching item data:', error);
      setError('Error fetching item data');
    }

    const validIngredients =
      ingredients && Array.isArray(ingredients) && ingredients.length > 0
        ? ingredients.map((ing, ingIndex) => ({
            name: ing.name || '',
            small: ing.small?.toString() || '',
            medium: ing.medium?.toString() || '',
            large: ing.large?.toString() || '',
            weight: ing.weight?.toString() || '',
            nutrition: Array.isArray(ing.nutrition)
              ? ing.nutrition.map((nut, nutIndex) => ({
                  nutrition_name: nut.nutrition_name || '',
                  nutrition_value: nut.nutrition_value?.toString() || '',
                  id: `${ingIndex}-${nutIndex}-${Date.now()}`,
                }))
              : [],
          }))
        : [{ name: '', small: '', medium: '', large: '', weight: '', nutrition: [] }];

    setIngredients(validIngredients);
    setHasExistingData(ingredients?.length > 0);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (isNewItem) {
      setSelectedItem(passedFormData?.item_name);
      setIngredients(passedFormData?.ingredients || [{ name: '', small: '', medium: '', large: '', weight: '', nutrition: [] }]);
      setHasExistingData(false);
    } else {
      fetchItemData(selectedItem);
    }
  }, [selectedItem, items, isNewItem, passedFormData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setIngredients(newIngredients);
  };

  const handleNutritionChange = (ingredientIndex, nutritionIndex, field, value) => {
    const newIngredients = [...ingredients];
    const nutrition = [...newIngredients[ingredientIndex].nutrition];
    nutrition[nutritionIndex] = { ...nutrition[nutritionIndex], [field]: value };
    newIngredients[ingredientIndex].nutrition = nutrition;
    setIngredients(newIngredients);
  };

  const handleAddRow = () => {
    setIngredients([...ingredients, { name: '', small: '', medium: '', large: '', weight: '', nutrition: [] }]);
  };

  const handleAddNutrition = (ingredientIndex) => {
    const newIngredients = [...ingredients];
    newIngredients[ingredientIndex].nutrition = [
      ...newIngredients[ingredientIndex].nutrition,
      { nutrition_name: '', nutrition_value: '', id: `${ingredientIndex}-${newIngredients[ingredientIndex].nutrition.length}-${Date.now()}` },
    ];
    setIngredients(newIngredients);
  };

  const handleDeleteNutrition = (ingredientIndex, nutritionIndex) => {
    const newIngredients = [...ingredients];
    newIngredients[ingredientIndex].nutrition = newIngredients[ingredientIndex].nutrition.filter(
      (_, index) => index !== nutritionIndex
    );
    setIngredients(newIngredients);
  };

  const handleItemSelect = (option) => {
    setSelectedItem(option.value);
    setSearchTerm(option.label);
    setIsDropdownOpen(false);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsDropdownOpen(true);
    if (!value) {
      setSelectedItem('');
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleSave = async () => {
    if (!selectedItem) {
      setSaveMessage('Please select an item, addon, or combo');
      return;
    }

    const validIngredients = ingredients.filter((ing) => ing.name.trim());
    if (validIngredients.length === 0) {
      setSaveMessage('Please add at least one ingredient');
      return;
    }

    for (const ing of validIngredients) {
      if (!ing.weight || isNaN(parseFloat(ing.weight)) || parseFloat(ing.weight) <= 0) {
        setSaveMessage(`Please enter a valid base weight for ingredient: ${ing.name}`);
        return;
      }
      if (!ing.small || isNaN(parseFloat(ing.small)) || parseFloat(ing.small) <= 0) {
        setSaveMessage(`Please enter a valid small size weight for ingredient: ${ing.name}`);
        return;
      }
      if (!ing.medium || isNaN(parseFloat(ing.medium)) || parseFloat(ing.medium) <= 0) {
        setSaveMessage(`Please enter a valid medium size weight for ingredient: ${ing.name}`);
        return;
      }
      if (!ing.large || isNaN(parseFloat(ing.large)) || parseFloat(ing.large) <= 0) {
        setSaveMessage(`Please enter a valid large size weight for ingredient: ${ing.name}`);
        return;
      }
      for (const nut of ing.nutrition) {
        if (!nut.nutrition_name.trim()) {
          setSaveMessage(`Please select a nutrition name for ingredient: ${ing.name}`);
          return;
        }
        const nutritionValue = nut.nutrition_value?.toString() || '';
        if (!nutritionValue || isNaN(parseFloat(nutritionValue)) || parseFloat(nutritionValue) < 0) {
          setSaveMessage(`Please enter a valid nutrition value for ${nut.nutrition_name} in ingredient: ${ing.name}`);
          return;
        }
      }
    }

    const updatedIngredients = validIngredients.map((ing) => ({
      ingredients_name: ing.name,
      small: parseFloat(ing.small),
      medium: parseFloat(ing.medium),
      large: parseFloat(ing.large),
      weight: parseFloat(ing.weight),
      nutrition: ing.nutrition.map((nut) => ({
        nutrition_name: nut.nutrition_name,
        nutrition_value: parseFloat(nut.nutrition_value),
      })),
    }));

    const updatedFormData = {
      ...passedFormData,
      ingredients: updatedIngredients,
    };

    if (isNewItem) {
      navigate('/create-item', {
        state: {
          formData: updatedFormData,
          isEditing: false,
        },
      });
    } else {
      const option = options.find((opt) => opt.value === selectedItem);
      if (!option) {
        setSaveMessage('Invalid selection');
        return;
      }

      const { type, instances } = option;

      const data = {
        item_name: selectedItem,
        type,
        instances,
        ingredients: validIngredients.map((ing) => ({
          name: ing.name,
          small: parseFloat(ing.small),
          medium: parseFloat(ing.medium),
          large: parseFloat(ing.large),
          weight: parseFloat(ing.weight),
          nutrition: ing.nutrition
            .filter((nut) => nut.nutrition_name.trim() && nut.nutrition_value?.toString().trim())
            .map((nut) => ({
              nutrition_name: nut.nutrition_name,
              nutrition_value: parseFloat(nut.nutrition_value),
            })),
        })),
      };

      try {
        setSaveLoading(true);
        setSaveMessage('');
        const response = await fetch('http://localhost:5000/api/items/nutrition', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          setSaveMessage('Data saved successfully!');
          setHasExistingData(true);
          navigate('/create-item', {
            state: {
              formData: updatedFormData,
              isEditing: isEditing,
              item: itemToEdit,
            },
          });
        } else {
          const errorData = await response.json();
          setSaveMessage(`Failed to save data: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error saving data:', error);
        setSaveMessage('Error while saving data');
      } finally {
        setSaveLoading(false);
      }
    }
  };

  const handleClear = async () => {
    if (!selectedItem) {
      setSaveMessage('Please select an item, addon, or combo to clear');
      return;
    }

    if (isNewItem) {
      setIngredients([{ name: '', small: '', medium: '', large: '', weight: '', nutrition: [] }]);
      setSaveMessage('Ingredients cleared for new item');
      return;
    }

    const option = options.find((opt) => opt.value === selectedItem);
    if (!option) {
      setSaveMessage('Invalid selection');
      return;
    }

    const { type, instances } = option;

    try {
      setSaveLoading(true);
      setSaveMessage('');
      const response = await fetch(
        `http://localhost:5000/api/items/nutrition/${encodeURIComponent(selectedItem)}?type=${type}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-Instances': JSON.stringify(instances),
          },
        }
      );

      if (response.ok) {
        setSaveMessage('Data cleared successfully!');
        setIngredients([{ name: '', small: '', medium: '', large: '', weight: '', nutrition: [] }]);
        setHasExistingData(false);
        setTimeout(() => {
          navigate(-1);
        }, 1000);
      } else {
        const errorData = await response.json();
        setSaveMessage(`Failed to clear data: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error clearing data:', error);
      setSaveMessage('Error while clearing data');
    } finally {
      setSaveLoading(false);
    }
  };

  const calculateNutrition = (ingredient, sizeKey) => {
    const baseWeight = parseFloat(ingredient.weight) || 1;
    const sizeWeight = parseFloat(ingredient[sizeKey]) || 1;

    const scalingFactor = sizeWeight / baseWeight;

    return ingredient.nutrition.map((nut) => {
      const nutritionValue = parseFloat(nut.nutrition_value) || 0;
      if (nutritionValue === 0) {
        return '0.000';
      }
      const scaledValue = nutritionValue * scalingFactor;
      return scaledValue.toFixed(3);
    });
  };

  const handleCloseMessageBox = () => {
    setIsMessageBoxVisible(false);
  };

  const handleCloseWarning = () => {
    setSaveMessage('');
    setError(null);
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    backButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 20px',
      backgroundColor: '#ffffff',
      borderWidth: '0',
      borderRadius: '25px',
      color: '#2c3e50',
      fontWeight: '600',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    formContainer: {
      backgroundColor: '#ffffff',
      padding: '32px',
      borderRadius: '15px',
      boxShadow: '0 5px 15px rgba(0,0,0,0.08)',
      width: '100%',
      maxWidth: '1000px',
    },
    title: {
      color: '#2c3e50',
      fontWeight: '700',
      marginBottom: '20px',
      paddingBottom: '15px',
      borderBottomWidth: '3px',
      borderBottomStyle: 'solid',
      borderBottomColor: '#3498db',
      width: 'fit-content',
    },
    input: {
      width: '100%',
      padding: '12px',
      marginBottom: '15px',
      borderRadius: '8px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: '#ddd',
      fontSize: '14px',
      transition: 'border-color 0.3s ease',
    },
    select: {
      width: '100%',
      padding: '12px',
      marginBottom: '15px',
      borderRadius: '8px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: '#ddd',
      fontSize: '14px',
      backgroundColor: '#ffffff',
      transition: 'border-color 0.3s ease',
    },
    button: {
      padding: '10px 20px',
      borderRadius: '25px',
      borderWidth: '0',
      cursor: 'pointer',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    },
    addButton: { backgroundColor: '#3498db', color: 'white' },
    deleteButton: {
      backgroundColor: '#e74c3c',
      color: 'white',
      padding: '8px 16px',
      marginTop: '10px',
    },
    saveButton: { backgroundColor: '#2ecc71', color: 'white' },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '10px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      overflow: 'hidden',
    },
    tableHeader: {
      backgroundColor: '#f5f7fa',
      color: '#2c3e50',
      fontWeight: '600',
      padding: '10px',
      textAlign: 'left',
      borderBottom: '2px solid #ddd',
    },
    tableCell: {
      padding: '10px',
      borderBottom: '1px solid #ddd',
      color: '#2c3e50',
      verticalAlign: 'top',
    },
    dropdown: {
      position: 'absolute',
      width: '100%',
      maxHeight: '200px',
      overflowY: 'auto',
      backgroundColor: '#ffffff',
      border: '1px solid #ddd',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      zIndex: 10,
      marginTop: '4px',
    },
    dropdownItem: {
      padding: '10px',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
    },
    messageBox: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: '#ffffff',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      zIndex: 1000,
      maxWidth: '400px',
      width: '90%',
      textAlign: 'center',
      border: '1px solid #3498db',
    },
    errorMessageBox: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: '#ffffff',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      zIndex: 1000,
      maxWidth: '400px',
      width: '90%',
      textAlign: 'center',
      border: '1px solid #dc2626',
    },
    messageBoxHeader: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '10px',
    },
    errorMessageBoxHeader: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#dc2626',
      marginBottom: '10px',
    },
    messageBoxText: {
      fontSize: '14px',
      color: '#2c3e50',
      marginBottom: '20px',
    },
    messageBoxClose: {
      padding: '8px 16px',
      backgroundColor: '#3498db',
      color: '#ffffff',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      fontWeight: '600',
      transition: 'background-color 0.3s ease',
    },
    errorMessageBoxClose: {
      padding: '8px 16px',
      backgroundColor: '#dc2626',
      color: '#ffffff',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      fontWeight: '600',
      transition: 'background-color 0.3s ease',
    },
  };

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1000px', marginBottom: '20px' }}>
        <button
          style={styles.backButton}
          onClick={handleGoBack}
          onMouseEnter={(e) => (e.target.style.backgroundColor = '#3498db')}
          onMouseLeave={(e) => (e.target.style.backgroundColor = '#ffffff')}
        >
          <FaArrowLeft /> Go Back
        </button>
        <h2 style={{ ...styles.title, margin: '0 auto' }}>Add Ingredients and Nutrition</h2>
      </div>

      {loading && <div style={{ textAlign: 'center', color: '#2c3e50' }}>Loading...</div>}

      {!loading && (
        <div style={styles.formContainer}>
          {isNewItem ? (
            <div>
              <h5 style={styles.title}>Item: {passedFormData?.item_name}</h5>
            </div>
          ) : (
            <div style={{ marginBottom: '24px', position: 'relative' }} ref={dropdownRef}>
              <h5 style={styles.title}>Select Item, Addon, or Combo</h5>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Search for an item, addon, or combo (e.g., 'wa' for watermelon)"
                style={styles.input}
                className="focus:border-blue-500"
              />
              {isDropdownOpen && filteredOptions.length > 0 && (
                <div style={styles.dropdown}>
                  {filteredOptions.map((option, index) => (
                    <div
                      key={index}
                      style={styles.dropdownItem}
                      onClick={() => handleItemSelect(option)}
                      onMouseEnter={(e) => (e.target.style.backgroundColor = '#f5f7fa')}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = '#ffffff')}
                    >
                      {option.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={styles.errorMessageBox}>
              <h6 style={styles.errorMessageBoxHeader}>Error</h6>
              <p style={styles.messageBoxText}>{error}</p>
              <button
                style={styles.errorMessageBoxClose}
                onClick={handleCloseWarning}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#b91c1c')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#dc2626')}
              >
                Close
              </button>
            </div>
          )}

          {saveMessage && (
            <div style={styles.messageBox}>
              <h6 style={styles.messageBoxHeader}>
                {saveMessage.includes('successfully') ? 'Success' : 'Warning'}
              </h6>
              <p style={styles.messageBoxText}>{saveMessage}</p>
              <button
                style={styles.messageBoxClose}
                onClick={handleCloseWarning}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#2980b9')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#3498db')}
              >
                Close
              </button>
            </div>
          )}

          {(selectedItem || isNewItem) && (
            <>
              <div style={{ marginBottom: '24px' }}>
                <h5 style={styles.title}>Ingredients</h5>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.tableHeader}>Ingredient Name</th>
                      <th style={styles.tableHeader}>Small (gm)</th>
                      <th style={styles.tableHeader}>Medium (gm)</th>
                      <th style={styles.tableHeader}>Large (gm)</th>
                      <th
                        style={{ ...styles.tableHeader, position: 'relative' }}
                        onMouseEnter={() => setIsMessageBoxVisible(true)}
                        onMouseLeave={() => setIsMessageBoxVisible(false)}
                      >
                        Base Weight (gm)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredients.map((ingredient, index) => (
                      <tr key={`ingredient-${index}`}>
                        <td style={styles.tableCell}>
                          <input
                            type="text"
                            value={ingredient.name}
                            onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                            placeholder="Enter ingredient"
                            style={styles.input}
                          />
                        </td>
                        <td style={styles.tableCell}>
                          <input
                            type="text"
                            value={ingredient.small}
                            onChange={(e) => handleIngredientChange(index, 'small', e.target.value)}
                            placeholder="Small size (gm)"
                            style={styles.input}
                          />
                        </td>
                        <td style={styles.tableCell}>
                          <input
                            type="text"
                            value={ingredient.medium}
                            onChange={(e) => handleIngredientChange(index, 'medium', e.target.value)}
                            placeholder="Medium size (gm)"
                            style={styles.input}
                          />
                        </td>
                        <td style={styles.tableCell}>
                          <input
                            type="text"
                            value={ingredient.large}
                            onChange={(e) => handleIngredientChange(index, 'large', e.target.value)}
                            placeholder="Large size (gm)"
                            style={styles.input}
                          />
                        </td>
                        <td style={styles.tableCell}>
                          <input
                            type="text"
                            value={ingredient.weight}
                            onChange={(e) => handleIngredientChange(index, 'weight', e.target.value)}
                            placeholder="Base weight (gm)"
                            style={styles.input}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  onClick={handleAddRow}
                  style={{ ...styles.button, ...styles.addButton }}
                  onMouseEnter={(e) => (e.target.style.backgroundColor = '#2980b9')}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = '#3498db')}
                >
                  Add Ingredient Row
                </button>
              </div>

              {isMessageBoxVisible && (
                <div style={styles.messageBox}>
                  <h6 style={styles.messageBoxHeader}>Base Weight Information</h6>
                  <p style={styles.messageBoxText}>
                    The base weight is used as a reference to scale nutrition values for different portion sizes (small, medium, large).
                  </p>
                  <button
                    style={styles.messageBoxClose}
                    onClick={handleCloseMessageBox}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = '#2980b9')}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = '#3498db')}
                  >
                    Close
                  </button>
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <h5 style={styles.title}>Nutrition Input</h5>
                {ingredients.every((ing) => !ing.name) ? (
                  <p style={{ color: '#2c3e50' }}>No ingredients added yet. Add ingredients to enter nutrition values.</p>
                ) : (
                  ingredients.map((ingredient, ingredientIndex) =>
                    ingredient.name && (
                      <div key={`ingredient-nutrition-${ingredientIndex}`} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
                        <h6 style={{ color: '#2c3e50', fontWeight: '500', marginBottom: '10px' }}>{ingredient.name}</h6>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.tableHeader}>Nutrition Name</th>
                              <th style={styles.tableHeader}>Nutrition Value (gm)</th>
                              <th style={styles.tableHeader}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ingredient.nutrition.map((nut, nutritionIndex) => (
                              <tr key={nut.id}>
                                <td style={styles.tableCell}>
                                  <select
                                    value={nut.nutrition_name}
                                    onChange={(e) =>
                                      handleNutritionChange(ingredientIndex, nutritionIndex, 'nutrition_name', e.target.value)
                                    }
                                    style={styles.select}
                                  >
                                    <option value="">Select Nutrition</option>
                                    {nutritionNames.map((name, idx) => (
                                      <option key={`${name}-${idx}`} value={name}>
                                        {name}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="text"
                                    value={nut.nutrition_value}
                                    onChange={(e) =>
                                      handleNutritionChange(ingredientIndex, nutritionIndex, 'nutrition_value', e.target.value)
                                    }
                                    placeholder="Enter value (e.g., 1.7)"
                                    style={styles.input}
                                  />
                                </td>
                                <td style={styles.tableCell}>
                                  <button
                                    onClick={() => handleDeleteNutrition(ingredientIndex, nutritionIndex)}
                                    style={styles.deleteButton}
                                    onMouseEnter={(e) => (e.target.style.backgroundColor = '#c0392b')}
                                    onMouseLeave={(e) => (e.target.style.backgroundColor = '#e74c3c')}
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <button
                          onClick={() => handleAddNutrition(ingredientIndex)}
                          style={{ ...styles.button, ...styles.addButton }}
                          onMouseEnter={(e) => (e.target.style.backgroundColor = '#2980b9')}
                          onMouseLeave={(e) => (e.target.style.backgroundColor = '#3498db')}
                        >
                          Add Nutrition
                        </button>
                      </div>
                    )
                  )
                )}
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h5 style={styles.title}>Nutrition Calculation</h5>
                {ingredients.every((ing) => !ing.name || !ing.nutrition.length) ? (
                  <p style={{ color: '#2c3e50' }}>No ingredients or nutrition data available for calculation.</p>
                ) : (
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.tableHeader}>Ingredient Name</th>
                        <th style={styles.tableHeader}>Nutrition Name</th>
                        <th style={styles.tableHeader}>Small (gm)</th>
                        <th style={styles.tableHeader}>Medium (gm)</th>
                        <th style={styles.tableHeader}>Large (gm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingredients.map((ingredient, index) =>
                        ingredient.name && ingredient.nutrition.length > 0 && (
                          ingredient.nutrition.map((nut, nutIndex) => (
                            <tr key={`${nut.id}-${index}`}>
                              {nutIndex === 0 && (
                                <td style={{ ...styles.tableCell, verticalAlign: 'middle' }} rowSpan={ingredient.nutrition.length}>
                                  {ingredient.name}
                                </td>
                              )}
                              <td style={styles.tableCell}>{nut.nutrition_name}</td>
                              <td style={styles.tableCell}>
                                {calculateNutrition(ingredient, 'small')[nutIndex] || 'N/A'} gm
                              </td>
                              <td style={styles.tableCell}>
                                {calculateNutrition(ingredient, 'medium')[nutIndex] || 'N/A'} gm
                              </td>
                              <td style={styles.tableCell}>
                                {calculateNutrition(ingredient, 'large')[nutIndex] || 'N/A'} gm
                              </td>
                            </tr>
                          ))
                        )
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px' }}>
                <button
                  onClick={handleSave}
                  disabled={saveLoading}
                  style={{
                    ...styles.button,
                    ...styles.saveButton,
                    backgroundColor: saveLoading ? '#95a5a6' : '#2ecc71',
                  }}
                  onMouseEnter={(e) => {
                    if (!saveLoading) e.target.style.backgroundColor = '#27ae60';
                  }}
                  onMouseLeave={(e) => {
                    if (!saveLoading) e.target.style.backgroundColor = '#2ecc71';
                  }}
                >
                  {saveLoading ? 'Saving...' : isNewItem ? 'Save and Go Back' : 'Save'}
                </button>
                <button
                  onClick={handleClear}
                  disabled={saveLoading || (!isNewItem && (!selectedItem || !hasExistingData))}
                  style={{
                    ...styles.button,
                    ...styles.deleteButton,
                    backgroundColor: saveLoading || (!isNewItem && (!selectedItem || !hasExistingData)) ? '#95a5a6' : '#e74c3c',
                  }}
                  onMouseEnter={(e) => {
                    if (!saveLoading && (isNewItem || (selectedItem && hasExistingData))) e.target.style.backgroundColor = '#c0392b';
                  }}
                  onMouseLeave={(e) => {
                    if (!saveLoading && (isNewItem || (selectedItem && hasExistingData))) e.target.style.backgroundColor = '#e74c3c';
                  }}
                >
                  {saveLoading ? 'Clearing...' : 'Clear Data'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AddIngredientAndNutrition;