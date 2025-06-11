import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaArrowLeft } from "react-icons/fa";
import "./createitempage.css";

const Modal = ({ isOpen, onClose, children, title, className }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className={`modal ${className}`}>
        <div className="modal-header">
          <h5 className="modal-title">{title}</h5>
          <button className="close-button" onClick={onClose}>
            X
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const extractImageName = (imageUrl) => {
  if (!imageUrl) return "";
  const parts = imageUrl.split("/");
  return parts[parts.length - 1];
};

const initialFormState = {
  item_code: "",
  item_name: "",
  item_group: "",
  price_list_rate: 0,
  offer_price: "",
  offer_start_time: "",
  offer_end_time: "",
  image: "",
  images: [],
  custom_addon_applicable: false,
  custom_combo_applicable: false,
  custom_total_calories: 0,
  custom_total_protein: 0,
  kitchen: "",
  selectedVariant: "",
  variants: {
    size: { enabled: false, small_price: 0, medium_price: 0, large_price: 0 },
    cold: { enabled: false, ice_preference: "without_ice", ice_price: 0 },
    spicy: {
      enabled: false,
      is_spicy: false,
      spicy_price: 0,
      spicy_image: "",
      non_spicy_price: 0,
      non_spicy_image: "",
    },
    sugar: { enabled: false, level: "medium" },
  },
  custom_variants: [],
  addons: [],
  combos: [],
  ingredients: [
    { ingredients_name: "", small: 0, medium: 0, large: 0, weight: 0, nutrition: [] },
  ],
};

const CreateItemPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState(initialFormState);
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: "",
    addonType: "existing",
    selectedVariant: "",
    modalCustomSelectedVariantId: "",
    modalCustomSelectedVariantDetails: null,
    data: {
      selectedId: "",
      name1: "",
      newName: "",
      price: 0,
      image: "",
      imagePreview: "",
      kitchen: "",
      variants: {
        size: { enabled: false, small_price: 0, medium_price: 0, large_price: 0 },
        cold: { enabled: false, ice_preference: "without_ice", ice_price: 0 },
        spicy: {
          enabled: false,
          spicy_price: 0,
          spicy_image: "",
          non_spicy_price: 0,
          non_spicy_image: "",
        },
        sugar: { enabled: false, level: "medium" },
      },
      custom_variants: [],
      ingredients: [
        { ingredients_name: "", small: 0, medium: 0, large: 0, weight: 0, nutrition: [] },
      ],
    },
    index: null,
  });
  const [addonListModalOpen, setAddonListModalOpen] = useState(false);
  const [comboListModalOpen, setComboListModalOpen] = useState(false);
  const [imagePreviews, setImagePreviews] = useState({
    item: "",
    spicy: "",
    non_spicy: "",
    multiple: [],
    custom_variant_images: {},
  });
  const [allItems, setAllItems] = useState([]);
  const [kitchens, setKitchens] = useState([]);
  const [itemGroups, setItemGroups] = useState([]);
  const [customVariants, setCustomVariants] = useState([]);
  const [selectedCustomVariantId, setSelectedCustomVariantId] = useState("");
  const [selectedCustomVariantDetails, setSelectedCustomVariantDetails] = useState(null);
  const [warningMessage, setWarningMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const itemToEdit = location.state?.item;
  const isEditing = Boolean(itemToEdit);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const kitchensResponse = await axios.get("http://localhost:5000/api/kitchens");
        setKitchens(kitchensResponse.data);

        const groupsResponse = await axios.get("http://localhost:5000/api/item-groups");
        setItemGroups(groupsResponse.data);

        const itemsResponse = await axios.get("http://localhost:5000/api/items");
        setAllItems(itemsResponse.data);

        const variantsResponse = await axios.get("http://localhost:5000/api/variants");
        setCustomVariants(variantsResponse.data);
      } catch (error) {
        setWarningMessage(`Error fetching data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchItemData = async () => {
      if (isEditing && itemToEdit) {
        try {
          const nutritionResponse = await axios.get(
            `http://localhost:5000/api/items/nutrition/${encodeURIComponent(itemToEdit.item_name)}?type=item&item_id=${itemToEdit._id}`
          );
          const fetchedIngredients = nutritionResponse.data?.ingredients || [];

          const formattedIngredients =
            fetchedIngredients.length > 0
              ? fetchedIngredients.map((ing) => ({
                  ingredients_name: ing.name || "",
                  small: ing.small || 0,
                  medium: ing.medium || 0,
                  large: ing.large || 0,
                  weight: ing.weight || 0,
                  nutrition: Array.isArray(ing.nutrition)
                    ? ing.nutrition.map((nut) => ({
                        nutrition_name: nut.nutrition_name || "",
                        nutrition_value: nut.nutrition_value || 0,
                      }))
                    : [],
                }))
              : initialFormState.ingredients;

          const updatedAddons = await Promise.all(
            (itemToEdit.addons || []).map(async (addon, index) => {
              try {
                const addonNutritionResponse = await axios.get(
                  `http://localhost:5000/api/items/nutrition/${encodeURIComponent(addon.name1)}?type=addon&item_id=${itemToEdit._id}&index=${index}`
                );
                const addonIngredients = addonNutritionResponse.data?.ingredients || [];
                return {
                  ...addon,
                  kitchen: addon.kitchen || itemToEdit.kitchen,
                  custom_variants: addon.custom_variants || [],
                  ingredients:
                    addonIngredients.length > 0
                      ? addonIngredients.map((ing) => ({
                          ingredients_name: ing.name || "",
                          small: ing.small || 0,
                          medium: ing.medium || 0,
                          large: ing.large || 0,
                          weight: ing.weight || 0,
                          nutrition: Array.isArray(ing.nutrition)
                            ? ing.nutrition.map((nut) => ({
                                nutrition_name: nut.nutrition_name || "",
                                nutrition_value: nut.nutrition_value || 0,
                              }))
                            : [],
                        }))
                      : addon.ingredients || [
                          { ingredients_name: "", small: 0, medium: 0, large: 0, weight: 0, nutrition: [] },
                        ],
                };
              } catch (error) {
                return {
                  ...addon,
                  kitchen: addon.kitchen || itemToEdit.kitchen,
                  custom_variants: addon.custom_variants || [],
                  ingredients: addon.ingredients || [
                    { ingredients_name: "", small: 0, medium: 0, large: 0, weight: 0, nutrition: [] },
                  ],
                };
              }
            })
          );

          const updatedCombos = await Promise.all(
            (itemToEdit.combos || []).map(async (combo, index) => {
              try {
                const comboNutritionResponse = await axios.get(
                  `http://localhost:5000/api/items/nutrition/${encodeURIComponent(combo.name1)}?type=combo&item_id=${itemToEdit._id}&index=${index}`
                );
                const comboIngredients = comboNutritionResponse.data?.ingredients || [];
                return {
                  ...combo,
                  kitchen: combo.kitchen || itemToEdit.kitchen,
                  custom_variants: combo.custom_variants || [],
                  ingredients:
                    comboIngredients.length > 0
                      ? comboIngredients.map((ing) => ({
                          ingredients_name: ing.name || "",
                          small: ing.small || 0,
                          medium: ing.medium || 0,
                          large: ing.large || 0,
                          weight: ing.weight || 0,
                          nutrition: Array.isArray(ing.nutrition)
                            ? ing.nutrition.map((nut) => ({
                                nutrition_name: nut.nutrition_name || "",
                                nutrition_value: nut.nutrition_value || 0,
                              }))
                            : [],
                        }))
                      : combo.ingredients || [
                          { ingredients_name: "", small: 0, medium: 0, large: 0, weight: 0, nutrition: [] },
                        ],
                };
              } catch (error) {
                return {
                  ...combo,
                  kitchen: combo.kitchen || itemToEdit.kitchen,
                  custom_variants: combo.custom_variants || [],
                  ingredients: combo.ingredients || [
                    { ingredients_name: "", small: 0, medium: 0, large: 0, weight: 0, nutrition: [] },
                  ],
                };
              }
            })
          );

          const updatedFormData = {
            ...initialFormState,
            ...itemToEdit,
            image: extractImageName(itemToEdit.image) || "",
            images: itemToEdit.images || [],
            offer_price: itemToEdit.offer_price || "",
            offer_start_time: itemToEdit.offer_start_time ? itemToEdit.offer_start_time.slice(0, 16) : "",
            offer_end_time: itemToEdit.offer_end_time ? itemToEdit.offer_end_time.slice(0, 16) : "",
            selectedVariant: "",
            variants: {
              size: itemToEdit.size || { enabled: false, small_price: 0, medium_price: 0, large_price: 0 },
              cold: itemToEdit.cold || { enabled: false, ice_preference: "without_ice", ice_price: 0 },
              spicy: itemToEdit.spicy || {
                enabled: false,
                is_spicy: false,
                spicy_price: 0,
                spicy_image: "",
                non_spicy_price: 0,
                non_spicy_image: "",
              },
              sugar: itemToEdit.sugar || { enabled: false, level: "medium" },
            },
            custom_variants: itemToEdit.custom_variants || [],
            addons: updatedAddons,
            combos: updatedCombos,
            ingredients: formattedIngredients,
          };
          setFormData(updatedFormData);
          setImagePreviews({
            item: itemToEdit.image ? `/static/uploads/${extractImageName(itemToEdit.image)}` : "",
            spicy: itemToEdit.spicy?.spicy_image
              ? `/static/uploads/${extractImageName(itemToEdit.spicy.spicy_image)}`
              : "",
            non_spicy: itemToEdit.spicy?.non_spicy_image
              ? `/static/uploads/${extractImageName(itemToEdit.spicy.non_spicy_image)}`
              : "",
            multiple: itemToEdit.images ? itemToEdit.images.map((img) => `/static/uploads/${extractImageName(img)}`) : [],
            custom_variant_images: itemToEdit.custom_variants?.reduce(
              (acc, variant) => ({
                ...acc,
                ...variant.subheadings.reduce(
                  (subAcc, sub) => ({
                    ...subAcc,
                    [`${variant._id}_${sub.name}_image`]: sub.image ? `/static/uploads/${extractImageName(sub.image)}` : "",
                  }),
                  {}
                ),
              }),
              {}
            ) || {},
          });
        } catch (error) {
          setWarningMessage(`Error fetching nutrition data: ${error.message}`);
          setFormData({
            ...initialFormState,
            ...itemToEdit,
            image: extractImageName(itemToEdit.image) || "",
            images: itemToEdit.images || [],
            offer_price: itemToEdit.offer_price || "",
            offer_start_time: itemToEdit.offer_start_time ? itemToEdit.offer_start_time.slice(0, 16) : "",
            offer_end_time: itemToEdit.offer_end_time ? itemToEdit.offer_end_time.slice(0, 16) : "",
            selectedVariant: "",
            variants: {
              size: itemToEdit.size || { enabled: false, small_price: 0, medium_price: 0, large_price: 0 },
              cold: itemToEdit.cold || { enabled: false, ice_preference: "without_ice", ice_price: 0 },
              spicy: itemToEdit.spicy || {
                enabled: false,
                is_spicy: false,
                spicy_price: 0,
                spicy_image: "",
                non_spicy_price: 0,
                non_spicy_image: "",
              },
              sugar: itemToEdit.sugar || { enabled: false, level: "medium" },
            },
            custom_variants: itemToEdit.custom_variants || [],
            addons: itemToEdit.addons?.map((addon) => ({
              ...addon,
              kitchen: addon.kitchen || itemToEdit.kitchen,
              custom_variants: addon.custom_variants || [],
              ingredients: addon.ingredients || [
                { ingredients_name: "", small: 0, medium: 0, large: 0, weight: 0, nutrition: [] },
              ],
            })) || [],
            combos: itemToEdit.combos?.map((combo) => ({
              ...combo,
              kitchen: combo.kitchen || itemToEdit.kitchen,
              custom_variants: combo.custom_variants || [],
              ingredients: combo.ingredients || [
                { ingredients_name: "", small: 0, medium: 0, large: 0, weight: 0, nutrition: [] },
              ],
            })) || [],
            ingredients: initialFormState.ingredients,
          });
          setImagePreviews({
            item: itemToEdit.image ? `/static/uploads/${extractImageName(itemToEdit.image)}` : "",
            spicy: itemToEdit.spicy?.spicy_image
              ? `/static/uploads/${extractImageName(itemToEdit.spicy.spicy_image)}`
              : "",
            non_spicy: itemToEdit.spicy?.non_spicy_image
              ? `/static/uploads/${extractImageName(itemToEdit.spicy.non_spicy_image)}`
              : "",
            multiple: itemToEdit.images ? itemToEdit.images.map((img) => `/static/uploads/${extractImageName(img)}`) : [],
            custom_variant_images: itemToEdit.custom_variants?.reduce(
              (acc, variant) => ({
                ...acc,
                ...variant.subheadings.reduce(
                  (subAcc, sub) => ({
                    ...subAcc,
                    [`${variant._id}_${sub.name}_image`]: sub.image ? `/static/uploads/${extractImageName(sub.image)}` : "",
                  }),
                  {}
                ),
              }),
              {}
            ) || {},
          });
        }
      } else {
        setFormData(initialFormState);
        setImagePreviews({
          item: "",
          spicy: "",
          non_spicy: "",
          multiple: [],
          custom_variant_images: {},
        });
      }
    };
    fetchItemData();
  }, [location, isEditing, itemToEdit]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleNumericInputFocus = (e, defaultValue = 0) => {
    if (e.target.value === String(defaultValue)) {
      e.target.value = "";
    }
  };

  const handleNumericInputBlur = (e, name, defaultValue = 0) => {
    const value = e.target.value;
    if (value === "" || isNaN(value)) {
      setFormData((prev) => ({ ...prev, [name]: defaultValue }));
      e.target.value = String(defaultValue);
    } else {
      setFormData((prev) => ({ ...prev, [name]: Number(value) }));
    }
  };

  const handleVariantFieldChange = (variant, field, value) => {
    setFormData((prev) => ({
      ...prev,
      variants: {
        ...prev.variants,
        [variant]: { ...prev.variants[variant], [field]: Number(value) || value },
      },
    }));
  };

  const handleVariantNumericFieldFocus = (e, variant, field) => {
    if (e.target.value === "0") {
      e.target.value = "";
    }
  };

  const handleVariantNumericFieldBlur = (e, variant, field) => {
    const value = e.target.value;
    if (value === "" || isNaN(value)) {
      setFormData((prev) => ({
        ...prev,
        variants: {
          ...prev.variants,
          [variant]: { ...prev.variants[variant], [field]: 0 },
        },
      }));
      e.target.value = "0";
    } else {
      handleVariantFieldChange(variant, field, value);
    }
  };

  const handleNestedChange = (field, index, key, value) => {
    setFormData((prev) => {
      const updated = [...prev[field]];
      updated[index][key] =
        key.includes("price") || key.includes("calories") || key.includes("protein") ? Number(value) : value;
      return { ...prev, [field]: updated };
    });
  };

  const handleNestedNumericFocus = (e, field, index, key) => {
    if (e.target.value === "0") {
      e.target.value = "";
    }
  };

  const handleNestedNumericBlur = (e, field, index, key) => {
    const value = e.target.value;
    if (value === "" || isNaN(value)) {
      setFormData((prev) => {
        const updated = [...prev[field]];
        updated[index][key] = 0;
        return { ...prev, [field]: updated };
      });
      e.target.value = "0";
    } else {
      handleNestedChange(field, index, key, value);
    }
  };

  const addNewEntry = (field, template) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], template],
    }));
  };

  const handleImageUpload = async (e, field, subField = null, variantId = null, subheading = null) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append("files", file);

    try {
      const response = await axios.post("http://localhost:5000/api/upload-image", formDataUpload);
      const filename = response.data.urls[0];

      if (subField === "customVariantImage") {
        setFormData((prev) => ({
          ...prev,
          custom_variants: prev.custom_variants.map((variant) =>
            variant._id === variantId
              ? {
                  ...variant,
                  subheadings: variant.subheadings.map((sub) =>
                    sub.name === subheading ? { ...sub, image: filename } : sub
                  ),
                }
              : variant
          ),
        }));
        setImagePreviews((prev) => ({
          ...prev,
          custom_variant_images: {
            ...prev.custom_variant_images,
            [`${variantId}_${subheading}_image`]: `/static/uploads/${extractImageName(filename)}`,
          },
        }));
      } else if (subField) {
        setFormData((prev) => ({
          ...prev,
          variants: {
            ...prev.variants,
            [field]: { ...prev.variants[field], [subField]: filename },
          },
        }));
        setImagePreviews((prev) => ({
          ...prev,
          [subField === "spicy_image" ? "spicy" : "non_spicy"]: `/static/uploads/${extractImageName(filename)}`,
        }));
      } else if (field === "images") {
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, filename],
        }));
        setImagePreviews((prev) => ({
          ...prev,
          multiple: [...prev.multiple, `/static/uploads/${extractImageName(filename)}`],
        }));
      } else {
        setFormData((prev) => ({ ...prev, [field]: filename }));
        setImagePreviews((prev) => ({ ...prev, [field]: `/static/uploads/${extractImageName(filename)}` }));
      }
      setWarningMessage("Image uploaded successfully!");
    } catch (error) {
      setWarningMessage(`Failed to upload image: ${error.message}`);
    }
  };

  const handleImageDelete = async (field, subField = null, index = null, variantId = null, subheading = null) => {
    let filename;
    if (subField === "customVariantImage") {
      const variant = formData.custom_variants.find((v) => v._id === variantId);
      filename = variant?.subheadings.find((sub) => sub.name === subheading)?.image;
      if (!filename) return;
      try {
        await axios.delete(`http://localhost:5000/api/delete-image/${extractImageName(filename)}?field=customVariantImage`);
        setFormData((prev) => ({
          ...prev,
          custom_variants: prev.custom_variants.map((variant) =>
            variant._id === variantId
              ? {
                  ...variant,
                  subheadings: variant.subheadings.map((sub) =>
                    sub.name === subheading ? { ...sub, image: null } : sub
                  ),
                }
              : variant
          ),
        }));
        setImagePreviews((prev) => ({
          ...prev,
          custom_variant_images: {
            ...prev.custom_variant_images,
            [`${variantId}_${subheading}_image`]: "",
          },
        }));
        setWarningMessage(`${subheading} image deleted successfully!`);
      } catch (error) {
        setWarningMessage(`Failed to delete ${subheading} image: ${error.message}`);
      }
    } else if (subField) {
      filename = formData.variants[field][subField];
      if (!filename) return;
      try {
        await axios.delete(`http://localhost:5000/api/delete-image/${extractImageName(filename)}?field=${subField}`);
        setFormData((prev) => ({
          ...prev,
          variants: {
            ...prev.variants,
            [field]: { ...prev.variants[field], [subField]: "" },
          },
        }));
        setImagePreviews((prev) => ({
          ...prev,
          [subField === "spicy_image" ? "spicy" : "non_spicy"]: "",
        }));
        setWarningMessage(`${subField.replace("_", " ")} deleted successfully!`);
      } catch (error) {
        setWarningMessage(`Failed to delete ${subField.replace("_", " ")}: ${error.message}`);
      }
    } else if (field === "images" && index !== null) {
      filename = formData.images[index];
      if (!filename) return;
      try {
        if (isEditing && itemToEdit?._id) {
          await axios.delete(
            `http://localhost:5000/api/delete-image/${extractImageName(filename)}?field=images&item_id=${itemToEdit._id}`
          );
        }
        setFormData((prev) => ({
          ...prev,
          images: prev.images.filter((_, i) => i !== index),
        }));
        setImagePreviews((prev) => ({
          ...prev,
          multiple: prev.multiple.filter((_, i) => i !== index),
        }));
        setWarningMessage("Multiple image deleted successfully!");
      } catch (error) {
        setWarningMessage(`Failed to delete multiple image: ${error.message}`);
      }
    } else {
      filename = formData[field];
      if (!filename) return;
      try {
        if (isEditing && itemToEdit?._id) {
          await axios.delete(
            `http://localhost:5000/api/delete-image/${extractImageName(filename)}?field=image&item_id=${itemToEdit._id}`
          );
        }
        setFormData((prev) => ({ ...prev, [field]: "" }));
        setImagePreviews((prev) => ({ ...prev, [field]: "" }));
        setWarningMessage("Item image deleted successfully!");
      } catch (error) {
        setWarningMessage(`Failed to delete image: ${error.message}`);
      }
    }
  };

  const handleVariantSave = (variant) => {
    setWarningMessage("Saved");
    setFormData((prev) => ({
      ...prev,
      selectedVariant: "",
    }));
  };

  const handleCustomVariantSelection = async (variantId) => {
    if (!variantId) {
      setSelectedCustomVariantDetails(null);
      setSelectedCustomVariantId("");
      return;
    }
    try {
      const response = await axios.get(`http://localhost:5000/api/variants/${variantId}`);
      const variantData = response.data;
      setSelectedCustomVariantDetails(variantData);
      setSelectedCustomVariantId(variantId);

      const existingVariant = formData.custom_variants.find((v) => v._id === variantId);
      if (!existingVariant) {
        setFormData((prev) => ({
          ...prev,
          custom_variants: [
            ...prev.custom_variants,
            {
              _id: variantId,
              heading: variantData.heading,
              subheadings: variantData.subheadings.map((sub) => ({
                name: sub.name,
                price: sub.price || null,
                image: sub.image || null,
                dropdown: sub.dropdown || false,
              })),
              activeSection: variantData.activeSection,
              enabled: false,
            },
          ],
        }));
      }
    } catch (error) {
      setWarningMessage("Failed to fetch variant details");
    }
  };

  const handleCustomVariantFieldChange = (variantId, subheading, field, value) => {
    setFormData((prev) => ({
      ...prev,
      custom_variants: prev.custom_variants.map((variant) =>
        variant._id === variantId
          ? {
              ...variant,
              subheadings: variant.subheadings.map((sub) =>
                sub.name === subheading
                  ? { ...sub, [field]: field === "price" ? Number(value) || null : value }
                  : sub
              ),
            }
          : variant
      ),
    }));
  };

  const handleCustomVariantSave = (variantId) => {
    setWarningMessage("Custom variant saved");
    setSelectedCustomVariantId("");
    setSelectedCustomVariantDetails(null);
  };

  const renderVariantFields = (variant) => {
    if (!variant || !variant.subheadings) return null;

    const activeSection = variant.activeSection;

    if (activeSection === "dropdown") {
      return (
        <div className="field-container">
          <label className="field-label">Select {variant.heading}</label>
          <select className="field-input">
            {variant.subheadings.map((sub) => (
              <option key={sub.name} value={sub.name}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>
      );
    } else if (activeSection === "price") {
      return variant.subheadings.map((sub) => (
        <div key={sub.name} className="field-container">
          <label className="field-label">{`${sub.name} Price`}</label>
          <input
            type="number"
            value={sub.price || ""}
            onChange={(e) => handleCustomVariantFieldChange(variant._id, sub.name, "price", e.target.value)}
            className="field-input"
            placeholder="Enter price"
            min="0"
            step="0.01"
          />
        </div>
      ));
    } else if (activeSection === "priceAndImage") {
      return variant.subheadings.map((sub) => (
        <div key={sub.name} className="field-container">
          <label className="field-label">{`${sub.name} Price`}</label>
          <input
            type="number"
            value={sub.price || ""}
            onChange={(e) => handleCustomVariantFieldChange(variant._id, sub.name, "price", e.target.value)}
            className="field-input"
            placeholder="Enter price"
            min="0"
            step="0.01"
          />
          <label className="field-label">{`${sub.name} Image`}</label>
          <input
            type="file"
            accept="image/*"
            name={sub.name}
            onChange={(e) => handleImageUpload(e, "customVariant", "customVariantImage", variant._id, sub.name)}
            className="field-input"
          />
          {imagePreviews.custom_variant_images[`${variant._id}_${sub.name}_image`] && (
            <div className="image-container">
              <img
                src={`http://localhost:5000${imagePreviews.custom_variant_images[`${variant._id}_${sub.name}_image`]}`}
                alt={`${sub.name} Preview`}
                className="image-preview"
              />
              <button
                type="button"
                className="delete-button"
                onClick={() => handleImageDelete("customVariant", "customVariantImage", null, variant._id, sub.name)}
              >
                Delete {sub.name} Image
              </button>
            </div>
          )}
        </div>
      ));
    }
    return null;
  };

  // Modal custom variant handlers
  const handleModalCustomVariantSelection = async (variantId) => {
    if (!variantId) {
      setModalState(prev => ({
        ...prev,
        modalCustomSelectedVariantId: "",
        modalCustomSelectedVariantDetails: null
      }));
      return;
    }
    try {
      const response = await axios.get(`http://localhost:5000/api/variants/${variantId}`);
      const variantData = response.data;
      
      setModalState(prev => ({
        ...prev,
        modalCustomSelectedVariantId: variantId,
        modalCustomSelectedVariantDetails: variantData
      }));

      const existingVariant = modalState.data.custom_variants.find(v => v._id === variantId);
      if (!existingVariant) {
        setModalState(prev => ({
          ...prev,
          data: {
            ...prev.data,
            custom_variants: [
              ...prev.data.custom_variants,
              {
                _id: variantId,
                heading: variantData.heading,
                subheadings: variantData.subheadings.map(sub => ({
                  name: sub.name,
                  price: sub.price || null,
                  image: sub.image || null,
                  dropdown: sub.dropdown || false
                })),
                activeSection: variantData.activeSection,
                enabled: false
              }
            ]
          }
        }));
      }
    } catch (error) {
      setWarningMessage("Failed to fetch variant details");
    }
  };

  const handleModalCustomVariantFieldChange = (variantId, subheading, field, value) => {
    setModalState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        custom_variants: prev.data.custom_variants.map(variant => 
          variant._id === variantId ? {
            ...variant,
            subheadings: variant.subheadings.map(sub => 
              sub.name === subheading ? { 
                ...sub, 
                [field]: field === "price" ? Number(value) || null : value 
              } : sub
            )
          } : variant
        )
      }
    }));
  };

  const handleModalCustomVariantSave = () => {
    setWarningMessage("Custom variant saved");
    setModalState(prev => ({
      ...prev,
      modalCustomSelectedVariantId: "",
      modalCustomSelectedVariantDetails: null
    }));
  };

  const handleModalCustomVariantImageUpload = async (e, variantId, subheading) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append("files", file);

    try {
      const response = await axios.post("http://localhost:5000/api/upload-image", formDataUpload);
      const filename = response.data.urls[0];

      setModalState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          custom_variants: prev.data.custom_variants.map(variant => 
            variant._id === variantId ? {
              ...variant,
              subheadings: variant.subheadings.map(sub => 
                sub.name === subheading ? { ...sub, image: filename } : sub
              )
            } : variant
          )
        }
      }));
    } catch (error) {
      setWarningMessage(`Failed to upload image: ${error.message}`);
    }
  };

  const handleModalCustomVariantImageDelete = async (variantId, subheading) => {
    const variant = modalState.data.custom_variants.find(v => v._id === variantId);
    const sub = variant?.subheadings.find(s => s.name === subheading);
    if (!sub || !sub.image) return;

    try {
      await axios.delete(`http://localhost:5000/api/delete-image/${extractImageName(sub.image)}`);
      setModalState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          custom_variants: prev.data.custom_variants.map(v => 
            v._id === variantId ? {
              ...v,
              subheadings: v.subheadings.map(s => 
                s.name === subheading ? { ...s, image: null } : s
              )
            } : v
          )
        }
      }));
    } catch (error) {
      setWarningMessage(`Failed to delete image: ${error.message}`);
    }
  };

  const renderModalCustomVariantFields = (variant) => {
    if (!variant) return null;
    
    return (
      <div className="variant-section">
        <div className="variant-toggle">
          <label>Enable {variant.heading} Variant</label>
          <input
            type="checkbox"
            checked={variant.enabled}
            onChange={e => {
              setModalState(prev => ({
                ...prev,
                data: {
                  ...prev.data,
                  custom_variants: prev.data.custom_variants.map(v => 
                    v._id === variant._id ? { ...v, enabled: e.target.checked } : v
                  )
                }
              }));
            }}
          />
        </div>
        
        {variant.enabled && (
          <>
            <h6>{variant.heading} Options</h6>
            {variant.subheadings.map(sub => (
              <div key={sub.name} className="field-container">
                <label className="field-label">{`${sub.name} Price`}</label>
                <input
                  type="number"
                  value={sub.price || ""}
                  onChange={e => handleModalCustomVariantFieldChange(variant._id, sub.name, "price", e.target.value)}
                  className="field-input"
                  placeholder="Enter price"
                  min="0"
                  step="0.01"
                />
                
                <label className="field-label">{`${sub.name} Image`}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleModalCustomVariantImageUpload(e, variant._id, sub.name)}
                  className="field-input"
                />
                
                {sub.image && (
                  <div className="image-container">
                    <img
                      src={`http://localhost:5000/static/uploads/${extractImageName(sub.image)}`}
                      alt={`${sub.name} Preview`}
                      className="image-preview"
                    />
                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => handleModalCustomVariantImageDelete(variant._id, sub.name)}
                    >
                      Delete Image
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              className="save-button"
              onClick={() => handleModalCustomVariantSave()}
            >
              Save Custom Variant
            </button>
          </>
        )}
      </div>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const filteredIngredients = formData.ingredients
      .filter((ingredient) => ingredient.ingredients_name || ingredient.nutrition.length > 0)
      .map((ingredient) => ({
        name: ingredient.ingredients_name || "",
        small: Number(ingredient.small) || 0,
        medium: Number(ingredient.medium) || 0,
        large: Number(ingredient.large) || 0,
        weight: Number(ingredient.weight) || 0,
        nutrition: ingredient.nutrition.map((nut) => ({
          nutrition_name: nut.nutrition_name,
          nutrition_value: Number(nut.nutrition_value) || 0,
        })),
      }));

    const filteredAddons = formData.addons.map((addon) => ({
      ...addon,
      custom_variants: addon.custom_variants.map((variant) => ({
        _id: variant._id,
        heading: variant.heading,
        subheadings: variant.subheadings.map((sub) => ({
          name: sub.name,
          price: sub.price,
          image: extractImageName(sub.image),
          dropdown: sub.dropdown,
        })),
        activeSection: variant.activeSection,
        enabled: variant.enabled,
      })),
      ingredients: addon.ingredients
        .filter((ing) => ing.ingredients_name || ing.nutrition.length > 0)
        .map((ing) => ({
          name: ing.ingredients_name || "",
          small: Number(ing.small) || 0,
          medium: Number(ing.medium) || 0,
          large: Number(ing.large) || 0,
          weight: Number(ing.weight) || 0,
          nutrition: ing.nutrition.map((nut) => ({
            nutrition_name: nut.nutrition_name,
            nutrition_value: Number(nut.nutrition_value) || 0,
          })),
        })),
    }));

    const filteredCombos = formData.combos.map((combo) => ({
      ...combo,
      custom_variants: combo.custom_variants.map((variant) => ({
        _id: variant._id,
        heading: variant.heading,
        subheadings: variant.subheadings.map((sub) => ({
          name: sub.name,
          price: sub.price,
          image: extractImageName(sub.image),
          dropdown: sub.dropdown,
        })),
        activeSection: variant.activeSection,
        enabled: variant.enabled,
      })),
      ingredients: combo.ingredients
        .filter((ing) => ing.ingredients_name || ing.nutrition.length > 0)
        .map((ing) => ({
          name: ing.ingredients_name || "",
          small: Number(ing.small) || 0,
          medium: Number(ing.medium) || 0,
          large: Number(ing.large) || 0,
          weight: Number(ing.weight) || 0,
          nutrition: ing.nutrition.map((nut) => ({
            nutrition_name: nut.nutrition_name,
            nutrition_value: Number(nut.nutrition_value) || 0,
          })),
        })),
    }));

    const updatedData = {
      item_code: formData.item_code,
      item_name: formData.item_name,
      item_group: formData.item_group,
      price_list_rate: Number(formData.price_list_rate),
      offer_price: formData.offer_price ? Number(formData.offer_price) : null,
      offer_start_time: formData.offer_start_time ? new Date(formData.offer_start_time).toISOString() : null,
      offer_end_time: formData.offer_end_time ? new Date(formData.offer_end_time).toISOString() : null,
      image: extractImageName(formData.image),
      images: formData.images.map(extractImageName),
      custom_addon_applicable: formData.custom_addon_applicable,
      custom_combo_applicable: formData.custom_combo_applicable,
      custom_total_calories: Number(formData.custom_total_calories),
      custom_total_protein: Number(formData.custom_total_protein),
      kitchen: formData.kitchen,
      size: formData.variants.size,
      cold: formData.variants.cold,
      spicy: {
        ...formData.variants.spicy,
        spicy_image: extractImageName(formData.variants.spicy.spicy_image),
        non_spicy_image: extractImageName(formData.variants.spicy.non_spicy_image),
      },
      sugar: formData.variants.sugar,
      custom_variants: formData.custom_variants.map((variant) => ({
        _id: variant._id,
        heading: variant.heading,
        subheadings: variant.subheadings.map((sub) => ({
          name: sub.name,
          price: sub.price,
          image: extractImageName(sub.image),
          dropdown: sub.dropdown,
        })),
        activeSection: variant.activeSection,
        enabled: variant.enabled,
      })),
      addons: filteredAddons,
      combos: filteredCombos,
      ingredients: filteredIngredients,
    };

    try {
      const url = isEditing ? `http://localhost:5000/api/items/${itemToEdit._id}` : "http://localhost:5000/api/items";
      const method = isEditing ? "put" : "post";
      await axios[method](url, updatedData);

      setWarningMessage(`Item ${isEditing ? "updated" : "created"} successfully!`);
      navigate("/admin", { replace: true });
    } catch (error) {
      setWarningMessage(`Operation failed: ${error.response?.data?.error || error.message}`);
    }
  };

  const openModal = (type, index = null) => {
    if (index !== null) {
      const entry = formData[type][index];
      const fetchNutritionData = async () => {
        try {
          const response = await axios.get(
            `http://localhost:5000/api/items/nutrition/${encodeURIComponent(entry.name1)}?type=${type.slice(0, -1)}&item_id=${itemToEdit?._id}&index=${index}`
          );
          const fetchedIngredients = response.data?.ingredients || [];
          const formattedIngredients = fetchedIngredients.map((ing) => ({
            ingredients_name: ing.name || "",
            small: ing.small || 0,
            medium: ing.medium || 0,
            large: ing.large || 0,
            weight: ing.weight || 0,
            nutrition: Array.isArray(ing.nutrition)
              ? ing.nutrition.map((nut) => ({
                  nutrition_name: nut.nutrition_name || "",
                  nutrition_value: nut.nutrition_value || 0,
                }))
              : [],
          }));
          setModalState({
            isOpen: true,
            type,
            addonType: "existing",
            selectedVariant: "",
            modalCustomSelectedVariantId: "",
            modalCustomSelectedVariantDetails: null,
            data: {
              selectedId: "",
              name1: entry.name1 || "",
              newName: "",
              price: entry[type === "addons" ? "addon_price" : "combo_price"] || 0,
              image: entry[type === "addons" ? "addon_image" : "combo_image"] || "",
              imagePreview: entry[type === "addons" ? "addon_image" : "combo_image"]
                ? `http://localhost:5000/static/uploads/${extractImageName(entry[type === "addons" ? "addon_image" : "combo_image"])}`
                : "",
              kitchen: entry.kitchen || formData.kitchen,
              variants: {
                size: entry.size || { enabled: false, small_price: 0, medium_price: 0, large_price: 0 },
                cold: entry.cold || { enabled: false, ice_preference: "without_ice", ice_price: 0 },
                spicy: entry.spicy || {
                  enabled: false,
                  spicy_price: 0,
                  spicy_image: "",
                  non_spicy_price: 0,
                  non_spicy_image: "",
                },
                sugar: entry.sugar || { enabled: false, level: "medium" },
              },
              custom_variants: entry.custom_variants || [],
              ingredients: formattedIngredients.length > 0 ? formattedIngredients : entry.ingredients,
            },
            index,
          });
        } catch (error) {
          setWarningMessage(`Error fetching nutrition for ${type.slice(0, -1)}: ${error.message}`);
          setModalState({
            isOpen: true,
            type,
            addonType: "existing",
            selectedVariant: "",
            modalCustomSelectedVariantId: "",
            modalCustomSelectedVariantDetails: null,
            data: {
              selectedId: "",
              name1: entry.name1 || "",
              newName: "",
              price: entry[type === "addons" ? "addon_price" : "combo_price"] || 0,
              image: entry[type === "addons" ? "addon_image" : "combo_image"] || "",
              imagePreview: entry[type === "addons" ? "addon_image" : "combo_image"]
                ? `http://localhost:5000/static/uploads/${extractImageName(entry[type === "addons" ? "addon_image" : "combo_image"])}`
                : "",
              kitchen: entry.kitchen || formData.kitchen,
              variants: {
                size: entry.size || { enabled: false, small_price: 0, medium_price: 0, large_price: 0 },
                cold: entry.cold || { enabled: false, ice_preference: "without_ice", ice_price: 0 },
                spicy: entry.spicy || {
                  enabled: false,
                  spicy_price: 0,
                  spicy_image: "",
                  non_spicy_price: 0,
                  non_spicy_image: "",
                },
                sugar: entry.sugar || { enabled: false, level: "medium" },
              },
              custom_variants: entry.custom_variants || [],
              ingredients: entry.ingredients || [
                { ingredients_name: "", small: 0, medium: 0, large: 0, weight: 0, nutrition: [] },
              ],
            },
            index,
          });
        }
      };
      fetchNutritionData();
    } else {
      setModalState({
        isOpen: true,
        type,
        addonType: "new",
        selectedVariant: "",
        modalCustomSelectedVariantId: "",
        modalCustomSelectedVariantDetails: null,
        data: {
          selectedId: "",
          name1: "",
          newName: "",
          price: 0,
          image: "",
          imagePreview: "",
          kitchen: formData.kitchen,
          variants: {
            size: { enabled: false, small_price: 0, medium_price: 0, large_price: 0 },
            cold: { enabled: false, ice_preference: "without_ice", ice_price: 0 },
            spicy: {
              enabled: false,
              spicy_price: 0,
              spicy_image: "",
              non_spicy_price: 0,
              non_spicy_image: "",
            },
            sugar: { enabled: false, level: "medium" },
          },
          custom_variants: [],
          ingredients: [{ ingredients_name: "", small: 0, medium: 0, large: 0, weight: 0, nutrition: [] }],
        },
        index: formData[type].length,
      });
    }
  };

  const handleModalInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "addonType") {
      setModalState((prev) => ({ ...prev, addonType: value }));
    } else if (name === "selectedId" && modalState.addonType === "existing") {
      let selectedData = {};
      if (value.includes("_addon_")) {
        const [itemId, _, index] = value.split("_");
        const parentItem = allItems.find((item) => item._id === itemId);
        if (parentItem) {
          const addon = parentItem.addons[parseInt(index)];
          if (addon) {
            selectedData = {
              name1: addon.name1,
              price: addon.addon_price,
              image: addon.addon_image || "",
              imagePreview: addon.addon_image
                ? `http://localhost:5000/static/uploads/${extractImageName(addon.addon_image)}`
                : "",
              kitchen: addon.kitchen || formData.kitchen,
              variants: {
                size: addon.size || { enabled: false, small_price: 0, medium_price: 0, large_price: 0 },
                cold: addon.cold || { enabled: false, ice_preference: "without_ice", ice_price: 0 },
                spicy: addon.spicy || {
                  enabled: false,
                  spicy_price: 0,
                  spicy_image: addon.spicy?.spicy_image || "",
                  non_spicy_price: 0,
                  non_spicy_image: addon.spicy?.non_spicy_image || "",
                },
                sugar: addon.sugar || { enabled: false, level: "medium" },
              },
              custom_variants: addon.custom_variants || [],
              ingredients: addon.ingredients || [
                { ingredients_name: "", small: 0, medium: 0, large: 0, weight: 0, nutrition: [] },
              ],
            };
          }
        }
      } else if (value.includes("_combo_")) {
        const [itemId, _, index] = value.split("_");
        const parentItem = allItems.find((item) => item._id === itemId);
        if (parentItem) {
          const combo = parentItem.combos[parseInt(index)];
          if (combo) {
            selectedData = {
              name1: combo.name1,
              price: combo.combo_price,
              image: combo.combo_image || "",
              imagePreview: combo.combo_image
                ? `http://localhost:5000/static/uploads/${extractImageName(combo.combo_image)}`
                : "",
              kitchen: combo.kitchen || formData.kitchen,
              variants: {
                size: combo.size || { enabled: false, small_price: 0, medium_price: 0, large_price: 0 },
                cold: combo.cold || { enabled: false, ice_preference: "without_ice", ice_price: 0 },
                spicy: combo.spicy || {
                  enabled: false,
                  spicy_price: 0,
                  spicy_image: combo.spicy?.spicy_image || "",
                  non_spicy_price: 0,
                  non_spicy_image: combo.spicy?.non_spicy_image || "",
                },
                sugar: combo.sugar || { enabled: false, level: "medium" },
              },
              custom_variants: combo.custom_variants || [],
              ingredients: combo.ingredients || [
                { ingredients_name: "", small: 0, medium: 0, large: 0, weight: 0, nutrition: [] },
              ],
            };
          }
        }
      } else {
        const selectedItem = allItems.find((item) => item._id === value);
        if (selectedItem) {
          selectedData = {
            name1: selectedItem.item_name,
            price: selectedItem.price_list_rate,
            image: selectedItem.image || "",
            imagePreview: selectedItem.image
              ? `http://localhost:5000/static/uploads/${extractImageName(selectedItem.image)}`
              : "",
            kitchen: selectedItem.kitchen || formData.kitchen,
            variants: {
              size: selectedItem.size || { enabled: false, small_price: 0, medium_price: 0, large_price: 0 },
              cold: selectedItem.cold || { enabled: false, ice_preference: "without_ice", ice_price: 0 },
              spicy: selectedItem.spicy || {
                enabled: false,
                spicy_price: 0,
                spicy_image: selectedItem.spicy?.spicy_image || "",
                non_spicy_price: 0,
                non_spicy_image: selectedItem.spicy?.non_spicy_image || "",
              },
              sugar: selectedItem.sugar || { enabled: false, level: "medium" },
            },
            custom_variants: selectedItem.custom_variants || [],
            ingredients: selectedItem.ingredients || [
              { ingredients_name: "", small: 0, medium: 0, large: 0, weight: 0, nutrition: [] },
            ],
          };
        }
      }
      setModalState((prev) => ({
        ...prev,
        data: {
          ...prev.data,
          selectedId: value,
          ...selectedData,
          image: prev.data.image || selectedData.image || "",
          imagePreview: prev.data.imagePreview || selectedData.imagePreview || "",
        },
      }));
    } else if (name === "newName" && modalState.addonType === "new") {
      setModalState((prev) => ({
        ...prev,
        data: { ...prev.data, newName: value },
      }));
    } else if (name === "price") {
      setModalState((prev) => ({
        ...prev,
        data: { ...prev.data, price: Number(value) },
      }));
    } else if (name === "kitchen") {
      setModalState((prev) => ({
        ...prev,
        data: { ...prev.data, kitchen: value },
      }));
    } else if (name.includes("variants.")) {
      const [_, variant, field] = name.split(".");
      setModalState((prev) => ({
        ...prev,
        data: {
          ...prev.data,
          variants: {
            ...prev.data.variants,
            [variant]: {
              ...prev.data.variants[variant],
              [field]: type === "checkbox" ? checked : Number(value) || value,
            },
          },
        },
      }));
    } else if (name === "selectedVariant") {
      setModalState((prev) => ({ ...prev, selectedVariant: value }));
    }
  };

  const handleModalNumericFocus = (e) => {
    if (e.target.value === "0") {
      e.target.value = "";
    }
  };

  const handleModalNumericBlur = (e, name) => {
    const value = e.target.value;
    if (value === "" || isNaN(value)) {
      setModalState((prev) => ({
        ...prev,
        data: { ...prev.data, [name]: 0 },
      }));
      e.target.value = "0";
    } else {
      setModalState((prev) => ({
        ...prev,
        data: { ...prev.data, [name]: Number(value) },
      }));
    }
  };

  const handleModalVariantNumericFocus = (e, variant, field) => {
    if (e.target.value === "0") {
      e.target.value = "";
    }
  };

  const handleModalVariantNumericBlur = (e, variant, field) => {
    const value = e.target.value;
    if (value === "" || isNaN(value)) {
      setModalState((prev) => ({
        ...prev,
        data: {
          ...prev.data,
          variants: {
            ...prev.data.variants,
            [variant]: { ...prev.data.variants[variant], [field]: 0 },
          },
        },
      }));
      e.target.value = "0";
    } else {
      setModalState((prev) => ({
        ...prev,
        data: {
          ...prev.data,
          variants: {
            ...prev.data.variants,
            [variant]: { ...prev.data.variants[variant], [field]: Number(value) },
          },
        },
      }));
    }
  };

  const handleModalImageUpload = async (e, variant, subField = null) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append("files", file);

    try {
      const response = await axios.post("http://localhost:5000/api/upload-image", formDataUpload);
      const filename = response.data.urls[0];

      if (subField) {
        setModalState((prev) => ({
          ...prev,
          data: {
            ...prev.data,
            variants: {
              ...prev.data.variants,
              [variant]: {
                ...prev.data.variants[variant],
                [subField]: filename,
              },
            },
          },
        }));
      } else {
        setModalState((prev) => ({
          ...prev,
          data: {
            ...prev.data,
            image: filename,
            imagePreview: `http://localhost:5000/static/uploads/${extractImageName(filename)}`,
          },
        }));
      }
    } catch (error) {
      setWarningMessage(`Failed to upload image in modal: ${error.message}`);
    }
  };

  const handleModalImageDelete = async (variant, subField = null) => {
    const filename = subField ? modalState.data.variants[variant][subField] : modalState.data.image;
    if (!filename) return;

    try {
      await axios.delete(`http://localhost:5000/api/delete-image/${extractImageName(filename)}`);
      if (subField) {
        setModalState((prev) => ({
          ...prev,
          data: {
            ...prev.data,
            variants: {
              ...prev.data.variants,
              [variant]: {
                ...prev.data.variants[variant],
                [subField]: "",
              },
            },
          },
        }));
      } else {
        setModalState((prev) => ({
          ...prev,
          data: {
            ...prev.data,
            image: "",
            imagePreview: "",
          },
        }));
      }
      setWarningMessage("Modal image deleted successfully!");
    } catch (error) {
      setWarningMessage(`Failed to delete modal image: ${error.message}`);
    }
  };

  const handleModalSave = () => {
    let newEntry;
    if (modalState.addonType === "existing") {
      newEntry = {
        name1: modalState.data.name1,
        [modalState.type === "addons" ? "addon_price" : "combo_price"]: modalState.data.price,
        [modalState.type === "addons" ? "addon_image" : "combo_image"]: extractImageName(modalState.data.image),
        kitchen: modalState.data.kitchen,
        size: modalState.data.variants.size.enabled ? modalState.data.variants.size : undefined,
        cold: modalState.data.variants.cold.enabled ? modalState.data.variants.cold : undefined,
        spicy: modalState.data.variants.spicy.enabled
          ? {
              ...modalState.data.variants.spicy,
              spicy_image: extractImageName(modalState.data.variants.spicy.spicy_image),
              non_spicy_image: extractImageName(modalState.data.variants.spicy.non_spicy_image),
            }
          : undefined,
        sugar: modalState.data.variants.sugar.enabled ? modalState.data.variants.sugar : undefined,
        custom_variants: modalState.data.custom_variants.map(variant => ({
          _id: variant._id,
          heading: variant.heading,
          subheadings: variant.subheadings.map(sub => ({
            name: sub.name,
            price: sub.price,
            image: extractImageName(sub.image),
            dropdown: sub.dropdown,
          })),
          activeSection: variant.activeSection,
          enabled: variant.enabled,
        })),
        ingredients: modalState.data.ingredients,
      };
    } else if (modalState.addonType === "new") {
      newEntry = {
        name1: modalState.data.newName,
        [modalState.type === "addons" ? "addon_price" : "combo_price"]: modalState.data.price,
        [modalState.type === "addons" ? "addon_image" : "combo_image"]: extractImageName(modalState.data.image),
        kitchen: modalState.data.kitchen,
        size: modalState.data.variants.size.enabled ? modalState.data.variants.size : undefined,
        cold: modalState.data.variants.cold.enabled ? modalState.data.variants.cold : undefined,
        spicy: modalState.data.variants.spicy.enabled
          ? {
              ...modalState.data.variants.spicy,
              spicy_image: extractImageName(modalState.data.variants.spicy.spicy_image),
              non_spicy_image: extractImageName(modalState.data.variants.spicy.non_spicy_image),
            }
          : undefined,
        sugar: modalState.data.variants.sugar.enabled ? modalState.data.variants.sugar : undefined,
        custom_variants: modalState.data.custom_variants.map(variant => ({
          _id: variant._id,
          heading: variant.heading,
          subheadings: variant.subheadings.map(sub => ({
            name: sub.name,
            price: sub.price,
            image: extractImageName(sub.image),
            dropdown: sub.dropdown,
          })),
          activeSection: variant.activeSection,
          enabled: variant.enabled,
        })),
        ingredients: modalState.data.ingredients,
      };
    }

    setFormData((prev) => {
      const updatedField = [...prev[modalState.type]];
      if (modalState.index !== null && modalState.index < updatedField.length) {
        updatedField[modalState.index] = newEntry;
      } else {
        updatedField.push(newEntry);
      }
      return { ...prev, [modalState.type]: updatedField };
    });

    setModalState({
      isOpen: false,
      type: "",
      addonType: "existing",
      selectedVariant: "",
      modalCustomSelectedVariantId: "",
      modalCustomSelectedVariantDetails: null,
      data: {
        selectedId: "",
        name1: "",
        newName: "",
        price: 0,
        image: "",
        imagePreview: "",
        kitchen: "",
        variants: {
          size: { enabled: false, small_price: 0, medium_price: 0, large_price: 0 },
          cold: { enabled: false, ice_preference: "without_ice", ice_price: 0 },
          spicy: {
            enabled: false,
            spicy_price: 0,
            spicy_image: "",
            non_spicy_price: 0,
            non_spicy_image: "",
          },
          sugar: { enabled: false, level: "medium" },
        },
        custom_variants: [],
        ingredients: [{ ingredients_name: "", small: 0, medium: 0, large: 0, weight: 0, nutrition: [] }],
      },
      index: null,
    });
  };

  const handleDeleteEntry = () => {
    if (modalState.index === null) return;

    setFormData((prev) => {
      const updatedField = [...prev[modalState.type]];
      updatedField.splice(modalState.index, 1);
      return { ...prev, [modalState.type]: updatedField };
    });

    setModalState({
      isOpen: false,
      type: "",
      addonType: "existing",
      selectedVariant: "",
      modalCustomSelectedVariantId: "",
      modalCustomSelectedVariantDetails: null,
      data: {
        selectedId: "",
        name1: "",
        newName: "",
        price: 0,
        image: "",
        imagePreview: "",
        kitchen: "",
        variants: {
          size: { enabled: false, small_price: 0, medium_price: 0, large_price: 0 },
          cold: { enabled: false, ice_preference: "without_ice", ice_price: 0 },
          spicy: {
            enabled: false,
            spicy_price: 0,
            spicy_image: "",
            non_spicy_price: 0,
            non_spicy_image: "",
          },
          sugar: { enabled: false, level: "medium" },
        },
        custom_variants: [],
        ingredients: [{ ingredients_name: "", small: 0, medium: 0, large: 0, weight: 0, nutrition: [] }],
      },
      index: null,
    });
    setWarningMessage(`${modalState.type === "addons" ? "Addon" : "Combo"} deleted successfully!`);
  };

  const getVariantSummary = (item) => {
    const summaries = [];
    if (item.size?.enabled) {
      summaries.push(
        `Size: Small ₹${item.size.small_price}, Medium ₹${item.size.medium_price}, Large ₹${item.size.large_price}`
      );
    }
    if (item.cold?.enabled) {
      summaries.push(`Cold: ${item.cold.ice_preference}${item.cold.ice_price ? ` (₹${item.cold.ice_price})` : ""}`);
    }
    if (item.spicy?.enabled) {
      summaries.push(`Spicy: ₹${item.spicy.spicy_price}, Non-Spicy: ₹${item.spicy.non_spicy_price}`);
    }
    if (item.sugar?.enabled) {
      summaries.push(`Sugar: ${item.sugar.level}`);
    }
    if (item.custom_variants?.length > 0) {
      item.custom_variants.forEach(variant => {
        if (variant.enabled) {
          summaries.push(`${variant.heading}: ${variant.subheadings.map(sub => sub.name).join(', ')}`);
        }
      });
    }
    return summaries.join("; ") || "No variants";
  };

  const options = allItems.flatMap((item) => [
    { label: `${item.item_name} (Item)`, value: item._id, type: "item" },
    ...item.addons.map((addon, index) => ({
      label: `${item.item_name} - Addon: ${addon.name1}`,
      value: `${item._id}_addon_${index}`,
      type: "addon",
    })),
    ...item.combos.map((combo, index) => ({
      label: `${item.item_name} - Combo: ${combo.name1}`,
      value: `${item._id}_combo_${index}`,
      type: "combo",
    })),
  ]).sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));

  const handleListButtonClick = () => {
    setAddonListModalOpen(true);
    setComboListModalOpen(true);
  };

  return (
    <div className="create-item-page">
      <div className="header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Go Back
        </button>
        <h2 className="page-title">{isEditing ? "Edit Item" : "Create New Item"}</h2>
      </div>

      {warningMessage && (
        <div className="warning-box">
          <p className="warning-text">{warningMessage}</p>
          <button className="close-warning" onClick={() => setWarningMessage("")}>
            ×
          </button>
        </div>
      )}

      {loading && <div className="loading">Loading...</div>}

      <div className="form-container">
        <div className="top-section">
          <div className="top-button-container">
            <button type="button" className="add-button" onClick={handleListButtonClick}>
              List
            </button>
            <button type="button" className="add-button" onClick={() => openModal("addons")}>
              Add Addon
            </button>
            <button type="button" className="add-button" onClick={() => openModal("combos")}>
              Add Combo
            </button>
          </div>
        </div>

        <div className="row">
          <div className="column">
            <h5 className="section-title">Item Details</h5>
            {[
              { label: "Item Code", name: "item_code", required: true },
              { label: "Item Name", name: "item_name", required: true },
              {
                label: "Item Group",
                name: "item_group",
                required: true,
                type: "select",
                options: itemGroups.map((group) => group.group_name),
              },
              {
                label: "Price (₹)",
                name: "price_list_rate",
                type: "number",
                min: "0",
                step: "0.01",
                required: true,
              },
              { label: "Promotional Price (₹)", name: "offer_price", type: "number", min: "0", step: "0.01" },
              { label: "Offer Start Time", name: "offer_start_time", type: "datetime-local" },
              { label: "Offer End Time", name: "offer_end_time", type: "datetime-local" },
              {
                label: "Kitchen",
                name: "kitchen",
                required: true,
                type: "select",
                options: kitchens.map((kitchen) => kitchen.kitchen_name),
              },
            ].map((field) => (
              <div key={field.name} className="form-group">
                <label>
                  {field.label} {field.required && <span>*</span>}
                </label>
                {field.type === "select" ? (
                  <select
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleInputChange}
                    className="input"
                    required={field.required}
                  >
                    <option value="">Select {field.label}</option>
                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type || "text"}
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleInputChange}
                    onFocus={field.type === "number" ? (e) => handleNumericInputFocus(e) : undefined}
                    onBlur={field.type === "number" ? (e) => handleNumericInputBlur(e, field.name) : undefined}
                    className="input"
                    required={field.required}
                    min={field.min}
                    step={field.step}
                  />
                )}
              </div>
            ))}
            <div className="form-group">
              <label>Item Image</label>
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "image")} className="input" />
              {imagePreviews.item ? (
                <div className="image-container">
                  <img src={`http://localhost:5000${imagePreviews.item}`} alt="Preview" className="image-preview" />
                  <button type="button" className="delete-button" onClick={() => handleImageDelete("image")}>
                    Delete Image
                  </button>
                </div>
              ) : (
                <img
                  src="https://via.placeholder.com/100?text=No+Image"
                  alt="No Image"
                  className="image-preview"
                />
              )}
            </div>
            <div className="form-group">
              <label>Multiple Images</label>
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "images")} className="input" />
              {imagePreviews.multiple.length > 0 ? (
                <div className="image-gallery">
                  {imagePreviews.multiple.map((img, index) => (
                    <div key={index} className="image-container">
                      <img src={`http://localhost:5000${img}`} alt={`Multiple ${index}`} className="image-preview" />
                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => handleImageDelete("images", null, index)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No additional images uploaded.</p>
              )}
            </div>
            <div className="form-group">
              <button
                type="button"
                className="add-button"
                onClick={() =>
                  navigate("/add-ingredients-nutrition", {
                    state: { name: formData.item_name, type: "item", itemId: itemToEdit?._id || "new" },
                  })
                }
              >
                Manage Ingredients and Nutrition
              </button>
            </div>
          </div>

          <div className="column">
            <h5 className="section-title">Variants</h5>
            <div className="nested-section">
              <label>Select Predefined Variant</label>
              <select name="selectedVariant" value={formData.selectedVariant} onChange={handleInputChange} className="input">
                <option value="">Select a variant</option>
                <option value="size">Size</option>
                <option value="cold">Cold</option>
                <option value="spicy">Spicy</option>
                <option value="sugar">Sugar</option>
              </select>

              {formData.selectedVariant && (
                <div className="variant-toggle">
                  <label>Enable {formData.selectedVariant} Variant</label>
                  <input
                    type="checkbox"
                    checked={formData.variants[formData.selectedVariant].enabled}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        variants: {
                          ...prev.variants,
                          [formData.selectedVariant]: {
                            ...prev.variants[formData.selectedVariant],
                            enabled: e.target.checked,
                          },
                        },
                      }))
                    }
                  />
                </div>
              )}

              {formData.selectedVariant === "size" && formData.variants.size.enabled && (
                <div className="variant-section">
                  <label>Small Price (₹)</label>
                  <input
                    type="number"
                    value={formData.variants.size.small_price}
                    onChange={(e) => handleVariantFieldChange("size", "small_price", e.target.value)}
                    onFocus={(e) => handleVariantNumericFieldFocus(e, "size", "small_price")}
                    onBlur={(e) => handleVariantNumericFieldBlur(e, "size", "small_price")}
                    className="input"
                    min="0"
                    step="0.01"
                  />
                  <label>Medium Price (₹)</label>
                  <input
                    type="number"
                    value={formData.variants.size.medium_price}
                    onChange={(e) => handleVariantFieldChange("size", "medium_price", e.target.value)}
                    onFocus={(e) => handleVariantNumericFieldFocus(e, "size", "medium_price")}
                    onBlur={(e) => handleVariantNumericFieldBlur(e, "size", "medium_price")}
                    className="input"
                    min="0"
                    step="0.01"
                  />
                  <label>Large Price (₹)</label>
                  <input
                    type="number"
                    value={formData.variants.size.large_price}
                    onChange={(e) => handleVariantFieldChange("size", "large_price", e.target.value)}
                    onFocus={(e) => handleVariantNumericFieldFocus(e, "size", "large_price")}
                    onBlur={(e) => handleVariantNumericFieldBlur(e, "size", "large_price")}
                    className="input"
                    min="0"
                    step="0.01"
                  />
                  <button type="button" className="save-button" onClick={() => handleVariantSave("size")}>
                    Save
                  </button>
                </div>
              )}

              {formData.selectedVariant === "cold" && formData.variants.cold.enabled && (
                <div className="variant-section">
                  <label>Ice Preference</label>
                  <select
                    value={formData.variants.cold.ice_preference}
                    onChange={(e) => handleVariantFieldChange("cold", "ice_preference", e.target.value)}
                    className="input"
                  >
                    <option value="without_ice">Without Ice</option>
                    <option value="with_ice">With Ice</option>
                  </select>
                  {formData.variants.cold.ice_preference === "with_ice" && (
                    <div>
                      <label>Ice Price (₹)</label>
                      <input
                        type="number"
                        value={formData.variants.cold.ice_price}
                        onChange={(e) => handleVariantFieldChange("cold", "ice_price", e.target.value)}
                        onFocus={(e) => handleVariantNumericFieldFocus(e, "cold", "ice_price")}
                        onBlur={(e) => handleVariantNumericFieldBlur(e, "cold", "ice_price")}
                        className="input"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  )}
                  <button type="button" className="save-button" onClick={() => handleVariantSave("cold")}>
                    Save
                  </button>
                </div>
              )}

              {formData.selectedVariant === "spicy" && formData.variants.spicy.enabled && (
                <div className="variant-section">
                  <label>Spicy Price (₹)</label>
                  <input
                    type="number"
                    value={formData.variants.spicy.spicy_price}
                    onChange={(e) => handleVariantFieldChange("spicy", "spicy_price", e.target.value)}
                    onFocus={(e) => handleVariantNumericFieldFocus(e, "spicy", "spicy_price")}
                    onBlur={(e) => handleVariantNumericFieldBlur(e, "spicy", "spicy_price")}
                    className="input"
                    min="0"
                    step="0.01"
                  />
                  <label>Spicy Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "spicy", "spicy_image")}
                    className="input"
                  />
                  {imagePreviews.spicy && (
                    <div className="image-container">
                      <img
                        src={`http://localhost:5000${imagePreviews.spicy}`}
                        alt="Spicy Preview"
                        className="image-preview"
                      />
                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => handleImageDelete("spicy", "spicy_image")}
                      >
                        Delete Spicy Image
                      </button>
                    </div>
                  )}
                  <label>Non-Spicy Price (₹)</label>
                  <input
                    type="number"
                    value={formData.variants.spicy.non_spicy_price}
                    onChange={(e) => handleVariantFieldChange("spicy", "non_spicy_price", e.target.value)}
                    onFocus={(e) => handleVariantNumericFieldFocus(e, "spicy", "non_spicy_price")}
                    onBlur={(e) => handleVariantNumericFieldBlur(e, "spicy", "non_spicy_price")}
                    className="input"
                    min="0"
                    step="0.01"
                  />
                  <label>Non-Spicy Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "spicy", "non_spicy_image")}
                    className="input"
                  />
                  {imagePreviews.non_spicy && (
                    <div className="image-container">
                      <img
                        src={`http://localhost:5000${imagePreviews.non_spicy}`}
                        alt="Non-Spicy Preview"
                        className="image-preview"
                      />
                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => handleImageDelete("spicy", "non_spicy_image")}
                      >
                        Delete Non-Spicy Image
                      </button>
                    </div>
                  )}
                  <button type="button" className="save-button" onClick={() => handleVariantSave("spicy")}>
                    Save
                  </button>
                </div>
              )}

              {formData.selectedVariant === "sugar" && formData.variants.sugar.enabled && (
                <div className="variant-section">
                  <label>Sugar Level</label>
                  <select
                    value={formData.variants.sugar.level}
                    onChange={(e) => handleVariantFieldChange("sugar", "level", e.target.value)}
                    className="input"
                  >
                    <option value="less">Less Sugar</option>
                    <option value="medium">Medium Sugar</option>
                    <option value="extra">Extra Sugar</option>
                  </select>
                  <button type="button" className="save-button" onClick={() => handleVariantSave("sugar")}>
                    Save
                  </button>
                </div>
              )}

              <div className="variant-section">
                {formData.variants.size.enabled && formData.selectedVariant !== "size" && (
                  <div className="nested-section">
                    <h6>Size Variant</h6>
                    <table className="variant-table">
                      <thead>
                        <tr>
                          <th>Size</th>
                          <th>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Small</td>
                          <td>₹{formData.variants.size.small_price}</td>
                        </tr>
                        <tr>
                          <td>Medium</td>
                          <td>₹{formData.variants.size.medium_price}</td>
                        </tr>
                        <tr>
                          <td>Large</td>
                          <td>₹{formData.variants.size.large_price}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                {formData.variants.cold.enabled && formData.selectedVariant !== "cold" && (
                  <div className="nested-section">
                    <h6>Cold Variant</h6>
                    <table className="variant-table">
                      <thead>
                        <tr>
                          <th>Ice Preference</th>
                          <th>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{formData.variants.cold.ice_preference === "with_ice" ? "With Ice" : "Without Ice"}</td>
                          <td>{formData.variants.cold.ice_preference === "with_ice" ? `₹${formData.variants.cold.ice_price}` : "₹0"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                {formData.variants.spicy.enabled && formData.selectedVariant !== "spicy" && (
                  <div className="nested-section">
                    <h6>Spicy Variant</h6>
                    <table className="variant-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Price</th>
                          <th>Image</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Spicy</td>
                          <td>₹{formData.variants.spicy.spicy_price}</td>
                          <td>
                            {imagePreviews.spicy ? (
                              <img
                                src={`http://localhost:5000${imagePreviews.spicy}`}
                                alt="Spicy Preview"
                                className="image-preview"
                              />
                            ) : (
                              "No Image"
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td>Non-Spicy</td>
                          <td>₹{formData.variants.spicy.non_spicy_price}</td>
                          <td>
                            {imagePreviews.non_spicy ? (
                              <img
                                src={`http://localhost:5000${imagePreviews.non_spicy}`}
                                alt="Non-Spicy Preview"
                                className="image-preview"
                              />
                            ) : (
                              "No Image"
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                {formData.variants.sugar.enabled && formData.selectedVariant !== "sugar" && (
                  <div className="nested-section">
                    <h6>Sugar Variant</h6>
                    <table className="variant-table">
                      <thead>
                        <tr>
                          <th>Sugar Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{formData.variants.sugar.level.charAt(0).toUpperCase() + formData.variants.sugar.level.slice(1)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="nested-section">
                <h5 className="section-title">Custom Variants</h5>
                <label>Select Custom Variant</label>
                <select
                  value={selectedCustomVariantId}
                  onChange={(e) => handleCustomVariantSelection(e.target.value)}
                  className="input"
                >
                  <option value="">Select a variant</option>
                  {customVariants.map((variant) => (
                    <option key={variant._id} value={variant._id}>
                      {variant.heading}
                    </option>
                  ))}
                </select>

                {selectedCustomVariantDetails && (
                  <div className="variant-section">
                    <div className="variant-toggle">
                      <label>Enable {selectedCustomVariantDetails.heading} Variant</label>
                      <input
                        type="checkbox"
                        checked={
                          formData.custom_variants.find((v) => v._id === selectedCustomVariantId)?.enabled || false
                        }
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            custom_variants: prev.custom_variants.map((variant) =>
                              variant._id === selectedCustomVariantId
                                ? { ...variant, enabled: e.target.checked }
                                : variant
                            ),
                          }))
                        }
                      />
                    </div>
                    {formData.custom_variants.find((v) => v._id === selectedCustomVariantId)?.enabled && (
                      <>
                        <h6>{selectedCustomVariantDetails.heading} Options</h6>
                        {renderVariantFields(formData.custom_variants.find((v) => v._id === selectedCustomVariantId))}
                        <button
                          type="button"
                          className="save-button"
                          onClick={() => handleCustomVariantSave(selectedCustomVariantId)}
                        >
                          Save Custom Variant
                        </button>
                      </>
                    )}
                  </div>
                )}

                {formData.custom_variants.filter((v) => v.enabled && v._id !== selectedCustomVariantId).length > 0 && (
                  <div className="variant-section">
                    <h6>Saved Custom Variants</h6>
                    {formData.custom_variants
                      .filter((v) => v.enabled && v._id !== selectedCustomVariantId)
                      .map((variant) => (
                        <div key={variant._id} className="nested-section">
                          <h6>{variant.heading}</h6>
                          <table className="variant-table">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Price</th>
                                <th>Image</th>
                              </tr>
                            </thead>
                            <tbody>
                              {variant.subheadings.map((sub) => (
                                <tr key={sub.name}>
                                  <td>{sub.name}</td>
                                  <td>{sub.price ? `₹${sub.price}` : "N/A"}</td>
                                  <td>
                                    {imagePreviews.custom_variant_images[`${variant._id}_${sub.name}_image`] ? (
                                      <img
                                        src={`http://localhost:5000${imagePreviews.custom_variant_images[`${variant._id}_${sub.name}_image`]}`}
                                        alt={`${sub.name} Preview`}
                                        className="image-preview"
                                      />
                                    ) : (
                                      "No Image"
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="column">
            <h5 className="section-title">Ingredients</h5>
            <div className="nested-section">
              <button
                type="button"
                className="add-button"
                onClick={() =>
                  navigate("/add-ingredients-nutrition", {
                    state: { name: formData.item_name, type: "item", itemId: itemToEdit?._id || "new" },
                  })
                }
              >
                Manage Ingredients and Nutrition
              </button>
              {formData.ingredients.length > 0 ? (
                <table className="variant-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Small (gm)</th>
                      <th>Medium (gm)</th>
                      <th>Large (gm)</th>
                      <th>Base Weight (gm)</th>
                      <th>Nutrition</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.ingredients.map((ingredient, index) => (
                      <tr key={index}>
                        <td>{ingredient.ingredients_name || "N/A"}</td>
                        <td>{ingredient.small || 0}</td>
                        <td>{ingredient.medium || 0}</td>
                        <td>{ingredient.large || 0}</td>
                        <td>{ingredient.weight || 0}</td>
                        <td>
                          {ingredient.nutrition.length > 0 ? (
                            <ul className="nutrition-list">
                              {ingredient.nutrition.map((nut, nutIndex) => (
                                <li key={nutIndex}>
                                  {nut.nutrition_name}: {nut.nutrition_value} gm
                                </li>
                              ))}
                            </ul>
                          ) : (
                            "No Nutrition Data"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No ingredients added yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="submit-section">
          <button type="button" className="submit-button" onClick={handleSubmit} disabled={loading}>
            {isEditing ? "Update Item" : "Create Item"}
          </button>
        </div>
      </div>

      <Modal
        isOpen={addonListModalOpen}
        onClose={() => setAddonListModalOpen(false)}
        title="Addons List"
        className="left-modal"
      >
        <div className="list-column">
          <h6 className="list-title">Addons</h6>
          {formData.addons.length > 0 ? (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Kitchen</th>
                  <th>Variants</th>
                  <th>Ingredients</th>
                  <th>Image</th>
                </tr>
              </thead>
              <tbody>
                {formData.addons.map((addon, index) => (
                  <tr
                    key={index}
                    onClick={() => {
                      setAddonListModalOpen(false);
                      setComboListModalOpen(false);
                      openModal("addons", index);
                    }}
                  >
                    <td>{addon.name1}</td>
                    <td>₹{addon.addon_price}</td>
                    <td>{addon.kitchen || "Not Set"}</td>
                    <td>{getVariantSummary(addon)}</td>
                    <td>{addon.ingredients.length} ingredients</td>
                    <td>
                      {addon.addon_image ? (
                        <img
                          src={`http://localhost:5000/static/uploads/${extractImageName(addon.addon_image)}`}
                          alt="Addon"
                          className="image-preview"
                        />
                      ) : (
                        "No Image"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No addons added yet.</p>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={comboListModalOpen}
        onClose={() => setComboListModalOpen(false)}
        title="Combos List"
        className="right-modal"
      >
        <div className="list-column">
          <h6 className="list-title">Combos</h6>
          {formData.combos.length > 0 ? (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Kitchen</th>
                  <th>Variants</th>
                  <th>Ingredients</th>
                  <th>Image</th>
                </tr>
              </thead>
              <tbody>
                {formData.combos.map((combo, index) => (
                  <tr
                    key={index}
                    onClick={() => {
                      setAddonListModalOpen(false);
                      setComboListModalOpen(false);
                      openModal("combos", index);
                    }}
                  >
                    <td>{combo.name1}</td>
                    <td>₹{combo.combo_price}</td>
                    <td>{combo.kitchen || "Not Set"}</td>
                    <td>{getVariantSummary(combo)}</td>
                    <td>{combo.ingredients.length} ingredients</td>
                    <td>
                      {combo.combo_image ? (
                        <img
                          src={`http://localhost:5000/static/uploads/${extractImageName(combo.combo_image)}`}
                          alt="Combo"
                          className="image-preview"
                        />
                      ) : (
                        "No Image"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No combos added yet.</p>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={modalState.isOpen}
        onClose={() =>
          setModalState({
            isOpen: false,
            type: "",
            addonType: "existing",
            selectedVariant: "",
            modalCustomSelectedVariantId: "",
            modalCustomSelectedVariantDetails: null,
            data: {
              selectedId: "",
              name1: "",
              newName: "",
              price: 0,
              image: "",
              imagePreview: "",
              kitchen: "",
              variants: {
                size: { enabled: false, small_price: 0, medium_price: 0, large_price: 0 },
                cold: { enabled: false, ice_preference: "without_ice", ice_price: 0 },
                spicy: {
                  enabled: false,
                  spicy_price: 0,
                  spicy_image: "",
                  non_spicy_price: 0,
                  non_spicy_image: "",
                },
                sugar: { enabled: false, level: "medium" },
              },
              custom_variants: [],
              ingredients: [{ ingredients_name: "", small: 0, medium: 0, large: 0, weight: 0, nutrition: [] }],
            },
            index: null,
          })
        }
        title={
          modalState.index !== null && modalState.index < formData[modalState.type].length
            ? `Edit ${modalState.type === "addons" ? "Addon" : "Combo"}`
            : `Add New ${modalState.type === "addons" ? "Addon" : "Combo"}`
        }
      >
        {(modalState.type === "addons" || modalState.type === "combos") && (
          <>
            <label>{modalState.type === "addons" ? "Addon Type" : "Combo Type"}</label>
            <select name="addonType" value={modalState.addonType} onChange={handleModalInputChange} className="input">
              <option value="existing">Select Existing Item</option>
              <option value="new">Create New {modalState.type === "addons" ? "Addon" : "Combo"}</option>
            </select>

            {modalState.addonType === "existing" && (
              <>
                <label>Select {modalState.type === "addons" ? "Addon" : "Combo"}</label>
                <select
                  name="selectedId"
                  value={modalState.data.selectedId || ""}
                  onChange={handleModalInputChange}
                  className="input"
                >
                  <option value="">Select an item, addon, or combo</option>
                  {options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </>
            )}

            {modalState.addonType === "new" && (
              <>
                <label>{modalState.type === "addons" ? "New Addon Name" : "New Combo Name"}</label>
                <input
                  type="text"
                  name="newName"
                  value={modalState.data.newName}
                  onChange={handleModalInputChange}
                  className="input"
                />
              </>
            )}

            <label>Price (₹)</label>
            <input
              type="number"
              name="price"
              value={modalState.data.price}
              onChange={handleModalInputChange}
              onFocus={handleModalNumericFocus}
              onBlur={(e) => handleModalNumericBlur(e, "price")}
              className="input"
              min="0"
              step="0.01"
            />

            <label>Kitchen</label>
            <select name="kitchen" value={modalState.data.kitchen} onChange={handleModalInputChange} className="input">
              <option value="">Select Kitchen</option>
              {kitchens.map((kitchen) => (
                <option key={kitchen._id} value={kitchen.kitchen_name}>
                  {kitchen.kitchen_name}
                </option>
              ))}
            </select>

            <label>Image</label>
            <input type="file" accept="image/*" onChange={(e) => handleModalImageUpload(e)} className="input" />
            {modalState.data.imagePreview && (
              <div className="image-container">
                <img src={modalState.data.imagePreview} alt="Preview" className="image-preview" />
                <button type="button" className="delete-button" onClick={() => handleModalImageDelete()}>
                  Delete Image
                </button>
              </div>
            )}

            <h6 className="alent-title">Variants</h6>
            <div className="nested-section">
              <label>Select Variant</label>
              <select
                name="selectedVariant"
                value={modalState.selectedVariant}
                onChange={handleModalInputChange}
                className="input"
              >
                <option value="">Select a variant</option>
                <option value="size">Size</option>
                <option value="cold">Cold</option>
                <option value="spicy">Spicy</option>
                <option value="sugar">Sugar</option>
              </select>

              {modalState.selectedVariant === "size" && (
                <div>
                  <div className="variant-toggle">
                    <label>Enable Size Variant</label>
                    <input
                      type="checkbox"
                      name="variants.size.enabled"
                      checked={modalState.data.variants.size.enabled}
                      onChange={handleModalInputChange}
                    />
                  </div>
                  {modalState.data.variants.size.enabled && (
                    <>
                      <label>Small Price (₹)</label>
                      <input
                        type="number"
                        name="variants.size.small_price"
                        value={modalState.data.variants.size.small_price}
                        onChange={handleModalInputChange}
                        onFocus={(e) => handleModalVariantNumericFocus(e, "size", "small_price")}
                        onBlur={(e) => handleModalVariantNumericBlur(e, "size", "small_price")}
                        className="input"
                        min="0"
                        step="0.01"
                      />
                      <label>Medium Price (₹)</label>
                      <input
                        type="number"
                        name="variants.size.medium_price"
                        value={modalState.data.variants.size.medium_price}
                        onChange={handleModalInputChange}
                        onFocus={(e) => handleModalVariantNumericFocus(e, "size", "medium_price")}
                        onBlur={(e) => handleModalVariantNumericBlur(e, "size", "medium_price")}
                        className="input"
                        min="0"
                        step="0.01"
                      />
                      <label>Large Price (₹)</label>
                      <input
                        type="number"
                        name="variants.size.large_price"
                        value={modalState.data.variants.size.large_price}
                        onChange={handleModalInputChange}
                        onFocus={(e) => handleModalVariantNumericFocus(e, "size", "large_price")}
                        onBlur={(e) => handleModalVariantNumericBlur(e, "size", "large_price")}
                        className="input"
                        min="0"
                        step="0.01"
                      />
                    </>
                  )}
                </div>
              )}

              {modalState.selectedVariant === "cold" && (
                <div>
                  <div className="variant-toggle">
                    <label>Enable Cold Variant</label>
                    <input
                      type="checkbox"
                      name="variants.cold.enabled"
                      checked={modalState.data.variants.cold.enabled}
                      onChange={handleModalInputChange}
                    />
                  </div>
                  {modalState.data.variants.cold.enabled && (
                    <>
                      <label>Ice Preference</label>
                      <select
                        name="variants.cold.ice_preference"
                        value={modalState.data.variants.cold.ice_preference}
                        onChange={handleModalInputChange}
                        className="input"
                      >
                        <option value="without_ice">Without Ice</option>
                        <option value="with_ice">With Ice</option>
                      </select>
                      {modalState.data.variants.cold.ice_preference === "with_ice" && (
                        <>
                          <label>Ice Price (₹)</label>
                          <input
                            type="number"
                            name="variants.cold.ice_price"
                            value={modalState.data.variants.cold.ice_price}
                            onChange={handleModalInputChange}
                            onFocus={(e) => handleModalVariantNumericFocus(e, "cold", "ice_price")}
                            onBlur={(e) => handleModalVariantNumericBlur(e, "cold", "ice_price")}
                            className="input"
                            min="0"
                            step="0.01"
                          />
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {modalState.selectedVariant === "spicy" && (
                <div>
                  <div className="variant-toggle">
                    <label>Enable Spicy Variant</label>
                    <input
                      type="checkbox"
                      name="variants.spicy.enabled"
                      checked={modalState.data.variants.spicy.enabled}
                      onChange={handleModalInputChange}
                    />
                  </div>
                  {modalState.data.variants.spicy.enabled && (
                    <div className="variant-section">
                      <label>Spicy Price (₹)</label>
                      <input
                        type="number"
                        name="variants.spicy.spicy_price"
                        value={modalState.data.variants.spicy.spicy_price}
                        onChange={handleModalInputChange}
                        onFocus={(e) => handleModalVariantNumericFocus(e, "spicy", "spicy_price")}
                        onBlur={(e) => handleModalVariantNumericBlur(e, "spicy", "spicy_price")}
                        className="input"
                        min="0"
                        step="0.01"
                      />
                      <label>Spicy Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleModalImageUpload(e, "spicy", "spicy_image")}
                        className="input"
                      />
                      {modalState.data.variants.spicy.spicy_image && (
                        <div className="image-container">
                          <img
                            src={`http://localhost:5000/static/uploads/${extractImageName(modalState.data.variants.spicy.spicy_image)}`}
                            alt="Spicy Preview"
                            className="image-preview"
                          />
                          <button
                            type="button"
                            className="delete-button"
                            onClick={() => handleModalImageDelete("spicy", "spicy_image")}
                          >
                            Delete Spicy Image
                          </button>
                        </div>
                      )}
                      <label>Non-Spicy Price (₹)</label>
                      <input
                        type="number"
                        name="variants.spicy.non_spicy_price"
                        value={modalState.data.variants.spicy.non_spicy_price}
                        onChange={handleModalInputChange}
                        onFocus={(e) => handleModalVariantNumericFocus(e, "spicy", "non_spicy_price")}
                        onBlur={(e) => handleModalVariantNumericBlur(e, "spicy", "non_spicy_price")}
                        className="input"
                        min="0"
                        step="0.01"
                      />
                      <label>Non-Spicy Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleModalImageUpload(e, "spicy", "non_spicy_image")}
                        className="input"
                      />
                      {modalState.data.variants.spicy.non_spicy_image && (
                        <div className="image-container">
                          <img
                            src={`http://localhost:5000/static/uploads/${extractImageName(modalState.data.variants.spicy.non_spicy_image)}`}
                            alt="Non-Spicy Preview"
                            className="image-preview"
                          />
                          <button
                            type="button"
                            className="delete-button"
                            onClick={() => handleModalImageDelete("spicy", "non_spicy_image")}
                          >
                            Delete Non-Spicy Image
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {modalState.selectedVariant === "sugar" && (
                <div>
                  <div className="variant-toggle">
                    <label>Enable Sugar Variant</label>
                    <input
                      type="checkbox"
                      name="variants.sugar.enabled"
                      checked={modalState.data.variants.sugar.enabled}
                      onChange={handleModalInputChange}
                    />
                  </div>
                  {modalState.data.variants.sugar.enabled && (
                    <div className="variant-section">
                      <label>Sugar Level</label>
                      <select
                        name="variants.sugar.level"
                        value={modalState.data.variants.sugar.level}
                        onChange={handleModalInputChange}
                        className="input"
                      >
                        <option value="less">Less Sugar</option>
                        <option value="medium">Medium Sugar</option>
                        <option value="extra">Extra Sugar</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="variant-section">
                {modalState.data.variants.size.enabled && modalState.selectedVariant !== "size" && (
                  <div className="nested-section">
                    <h6>Size Variant</h6>
                    <table className="variant-table">
                      <thead>
                        <tr>
                          <th>Size</th>
                          <th>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Small</td>
                          <td>₹{modalState.data.variants.size.small_price}</td>
                        </tr>
                        <tr>
                          <td>Medium</td>
                          <td>₹{modalState.data.variants.size.medium_price}</td>
                        </tr>
                        <tr>
                          <td>Large</td>
                          <td>₹{modalState.data.variants.size.large_price}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                {modalState.data.variants.cold.enabled && modalState.selectedVariant !== "cold" && (
                  <div className="nested-section">
                    <h6>Cold Variant</h6>
                    <table className="variant-table">
                      <thead>
                        <tr>
                          <th>Ice Preference</th>
                          <th>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{modalState.data.variants.cold.ice_preference === "with_ice" ? "With Ice" : "Without Ice"}</td>
                          <td>
                            {modalState.data.variants.cold.ice_preference === "with_ice"
                              ? `₹${modalState.data.variants.cold.ice_price}`
                              : "₹0"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                {modalState.data.variants.spicy.enabled && modalState.selectedVariant !== "spicy" && (
                  <div className="nested-section">
                    <h6>Spicy Variant</h6>
                    <table className="variant-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Price</th>
                          <th>Image</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Spicy</td>
                          <td>₹{modalState.data.variants.spicy.spicy_price}</td>
                          <td>
                            {modalState.data.variants.spicy.spicy_image ? (
                              <img
                                src={`http://localhost:5000/static/uploads/${extractImageName(modalState.data.variants.spicy.spicy_image)}`}
                                alt="Spicy Preview"
                                className="image-preview"
                              />
                            ) : (
                              "No Image"
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td>Non-Spicy</td>
                          <td>₹{modalState.data.variants.spicy.non_spicy_price}</td>
                          <td>
                            {modalState.data.variants.spicy.non_spicy_image ? (
                              <img
                                src={`http://localhost:5000/static/uploads/${extractImageName(modalState.data.variants.spicy.non_spicy_image)}`}
                                alt="Non-Spicy Preview"
                                className="image-preview"
                              />
                            ) : (
                              "No Image"
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                {modalState.data.variants.sugar.enabled && modalState.selectedVariant !== "sugar" && (
                  <div className="nested-section">
                    <h6>Sugar Variant</h6>
                    <table className="variant-table">
                      <thead>
                        <tr>
                          <th>Sugar Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            {modalState.data.variants.sugar.level.charAt(0).toUpperCase() +
                              modalState.data.variants.sugar.level.slice(1)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="nested-section">
              <h5 className="section-title">Custom Variants</h5>
              <label>Select Custom Variant</label>
              <select
                value={modalState.modalCustomSelectedVariantId}
                onChange={(e) => handleModalCustomVariantSelection(e.target.value)}
                className="input"
              >
                <option value="">Select a variant</option>
                {customVariants.map(variant => (
                  <option key={variant._id} value={variant._id}>
                    {variant.heading}
                  </option>
                ))}
              </select>

              {modalState.modalCustomSelectedVariantDetails && (
                <div className="variant-section">
                  {renderModalCustomVariantFields(
                    modalState.data.custom_variants.find(
                      v => v._id === modalState.modalCustomSelectedVariantId
                    )
                  )}
                </div>
              )}

              {modalState.data.custom_variants
                .filter(v => v.enabled && v._id !== modalState.modalCustomSelectedVariantId)
                .map(variant => (
                  <div key={variant._id} className="nested-section">
                    <h6>{variant.heading}</h6>
                    <table className="variant-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Price</th>
                          <th>Image</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variant.subheadings.map(sub => (
                          <tr key={sub.name}>
                            <td>{sub.name}</td>
                            <td>{sub.price ? `₹${sub.price}` : "N/A"}</td>
                            <td>
                              {sub.image ? (
                                <img
                                  src={`http://localhost:5000/static/uploads/${extractImageName(sub.image)}`}
                                  alt={`${sub.name} Preview`}
                                  className="image-preview"
                                />
                              ) : (
                                "No Image"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
            </div>

            <div className="form-group">
              <button
                type="button"
                className="add-button"
                onClick={() => {
                  const name = modalState.addonType === "new" ? modalState.data.newName : modalState.data.name1;
                  if (name) {
                    const type = modalState.type === "addons" ? "addon" : "combo";
                    navigate("/add-ingredients-nutrition", {
                      state: {
                        name,
                        type,
                        itemId: itemToEdit?._id || "new",
                        index: modalState.index,
                      },
                    });
                  } else {
                    setWarningMessage("Please enter a name first");
                  }
                }}
              >
                Manage Ingredients and Nutrition
              </button>
            </div>
     
            <div className="modal-actions">
              <button type="button" className="save-button" onClick={handleModalSave}>
                Save
              </button>
              {modalState.index !== null && modalState.index < formData[modalState.type].length && (
                <button type="button" className="delete-button" onClick={handleDeleteEntry}>
                  Delete
                </button>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default CreateItemPage;