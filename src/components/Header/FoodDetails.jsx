import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import './foodDetails.css';

const BASE_URL = 'http://127.0.0.1:5000';

class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error in FoodDetails:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please try again.</div>;
    }
    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

const FoodDetails = ({ item, cartItem, onClose, onUpdate }) => {
  if (!item) return null;

  const [addonQuantities, setAddonQuantities] = useState(cartItem?.addonQuantities || {});
  const [comboQuantities, setComboQuantities] = useState(cartItem?.comboQuantities || {});
  const [selectedAddonVariants, setSelectedAddonVariants] = useState(cartItem?.addonVariants || {});
  const [selectedComboVariants, setSelectedComboVariants] = useState(cartItem?.comboVariants || {});
  const [selectedCombos, setSelectedCombos] = useState(cartItem?.selectedCombos || []);
  const [showCombos, setShowCombos] = useState(false);
  const [fetchedItem, setFetchedItem] = useState(null);
  const [addonIngredients, setAddonIngredients] = useState({});
  const [comboIngredients, setComboIngredients] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [quantity, setQuantity] = useState(cartItem?.quantity || 1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState({
    size: cartItem?.selectedSize || (item.variants?.size?.enabled ? 'M' : null),
    cold: cartItem?.icePreference || (item.variants?.cold?.enabled ? 'without_ice' : null),
    spicy: item.variants?.spicy?.enabled ? (cartItem?.isSpicy || false) : null,
    sugar: item.variants?.sugar?.enabled ? (cartItem?.sugarLevel || 'medium') : null,
  });
  const [selectedCustomVariants, setSelectedCustomVariants] = useState(cartItem?.selectedCustomVariants || {});
  const [selectedAddonCustomVariants, setSelectedAddonCustomVariants] = useState(cartItem?.addonCustomVariants || {});
  const [selectedComboCustomVariants, setSelectedComboCustomVariants] = useState(cartItem?.comboCustomVariants || {});
  const [showVariantPopup, setShowVariantPopup] = useState(false);
  const [showCustomVariantPopup, setShowCustomVariantPopup] = useState(false);
  const [showAddonVariantPopup, setShowAddonVariantPopup] = useState(null);
  const [showAddonCustomVariantPopup, setShowAddonCustomVariantPopup] = useState(null);
  const [showComboVariantPopup, setShowComboVariantPopup] = useState(null);
  const [showComboCustomVariantPopup, setShowComboCustomVariantPopup] = useState(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedSizeFilter, setSelectedSizeFilter] = useState(
    cartItem?.selectedSize
      ? cartItem.selectedSize === 'S' ? 'small' : cartItem.selectedSize === 'M' ? 'medium' : 'large'
      : item.variants?.size?.enabled ? 'medium' : null
  );

  const hasActiveOffer = () => {
    return (
      fetchedItem?.offer_price !== undefined &&
      fetchedItem?.offer_price !== null &&
      fetchedItem?.offer_start_time &&
      fetchedItem?.offer_end_time &&
      new Date(fetchedItem.offer_start_time) <= new Date() &&
      new Date(fetchedItem.offer_end_time) > new Date()
    );
  };

  const calculateOfferSizePrice = (offerPrice, size) => {
    if (!offerPrice) return 0;
    switch (size) {
      case 'S': return offerPrice - 10;
      case 'M': return offerPrice;
      case 'L': return offerPrice + 10;
      default: return offerPrice;
    }
  };

  const calculateItemPrice = () => {
    if (!fetchedItem) return 0;
    if (hasActiveOffer()) {
      return calculateOfferSizePrice(fetchedItem.offer_price, selectedVariants.size);
    }
    if (fetchedItem.variants?.size?.enabled && selectedVariants.size) {
      return (
        selectedVariants.size === 'S' ? fetchedItem.variants.size.small_price :
        selectedVariants.size === 'M' ? fetchedItem.variants.size.medium_price :
        selectedVariants.size === 'L' ? fetchedItem.variants.size.large_price :
        fetchedItem.price_list_rate || 100
      );
    }
    return fetchedItem.price_list_rate || 100;
  };

  useEffect(() => {
    const fetchItemDetails = async () => {
      try {
        const itemName = encodeURIComponent(item.item_name || item.name);
        const response = await fetch(`${BASE_URL}/api/items/${itemName}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        if (data) {
          const fetchedData = {
            ...data,
            item_name: data.item_name || item.item_name,
            item_group: data.item_group || item.item_group,
            price_list_rate: data.price_list_rate || item.price_list_rate || 100,
            image: data.image || item.image,
            images: Array.isArray(data.images) ? data.images : item.images || [],
            ingredients: Array.isArray(data.ingredients) ? data.ingredients.map(ing => ({
              ...ing,
              base_price: ing.base_price || 100,
              nutrition: Array.isArray(ing.nutrition) ? ing.nutrition : [],
              weight: ing.weight || '1',
              small: ing.small || '1',
              medium: ing.medium || '1',
              large: ing.large || '1',
            })) : [],
            variants: {
              size: {
                enabled: data.variants?.size?.enabled ?? item.size?.enabled ?? false,
                small_price: data.variants?.size?.small_price ?? item.size?.small_price ?? 0,
                medium_price: data.variants?.size?.medium_price ?? item.size?.medium_price ?? 0,
                large_price: data.variants?.size?.large_price ?? item.size?.large_price ?? 0,
              },
              cold: data.variants?.cold || item.cold || { enabled: false, ice_price: 0 },
              spicy: {
                enabled: data.variants?.spicy?.enabled ?? item.spicy?.enabled ?? false,
                spicy_price: data.variants?.spicy?.spicy_price ?? item.spicy?.spicy_price ?? 30,
                non_spicy_price: data.variants?.spicy?.non_spicy_price ?? item.spicy?.non_spicy_price ?? 0,
                spicy_image: data.variants?.spicy?.spicy_image ?? item.spicy?.spicy_image,
                non_spicy_image: data.variants?.spicy?.non_spicy_image ?? item.spicy?.non_spicy_image,
              },
              sugar: data.variants?.sugar || item.sugar || { enabled: false, level: 'medium' },
            },
            custom_variants: Array.isArray(data.custom_variants) ? data.custom_variants.map(variant => ({
              ...variant,
              subheadings: Array.isArray(variant.subheadings) ? variant.subheadings : [],
            })) : item.custom_variants || [],
            addons: Array.isArray(data.addons) ? data.addons.map(addon => ({
              ...addon,
              size: addon.size || { enabled: false },
              cold: addon.cold || { enabled: false },
              spicy: addon.spicy || { enabled: false },
              sugar: addon.sugar || { enabled: false },
              custom_variants: Array.isArray(addon.custom_variants) ? addon.custom_variants.map(variant => ({
                ...variant,
                subheadings: Array.isArray(variant.subheadings) ? variant.subheadings : [],
              })) : [],
            })) : item.addons || [],
            combos: Array.isArray(data.combos) ? data.combos.map(combo => ({
              ...combo,
              size: combo.size || { enabled: false },
              cold: combo.cold || { enabled: false },
              spicy: combo.spicy || { enabled: false },
              sugar: combo.sugar || { enabled: false },
              custom_variants: Array.isArray(combo.custom_variants) ? combo.custom_variants.map(variant => ({
                ...variant,
                subheadings: Array.isArray(variant.subheadings) ? variant.subheadings : [],
              })) : [],
            })) : item.combos || [],
            offer_price: data.offer_price ?? item.offer_price,
            offer_start_time: data.offer_start_time ?? item.offer_start_time,
            offer_end_time: data.offer_end_time ?? item.offer_end_time,
            kitchen: data.kitchen || item.kitchen || 'Unknown',
          };
          setFetchedItem(fetchedData);
          setSelectedVariants({
            size: cartItem?.selectedSize || (fetchedData.variants.size.enabled ? 'M' : null),
            cold: cartItem?.icePreference || (fetchedData.variants.cold.enabled ? 'without_ice' : null),
            spicy: fetchedData.variants.spicy.enabled ? (cartItem?.isSpicy || false) : null,
            sugar: fetchedData.variants.sugar.enabled ? (cartItem?.sugarLevel || fetchedData.variants.sugar.level || 'medium') : null,
          });
          setSelectedSizeFilter(
            cartItem?.selectedSize
              ? cartItem.selectedSize === 'S' ? 'small' : cartItem.selectedSize === 'M' ? 'medium' : 'large'
              : fetchedData.variants.size.enabled ? 'medium' : null
          );
          const initialPrice = fetchedData.variants.size.enabled ? fetchedData.variants.size.medium_price : fetchedData.price_list_rate;
          setTotalPrice((initialPrice || 100) * quantity);
          setSelectedPreviewImage(null);
          setCurrentImageIndex(0);
        }
      } catch (error) {
        console.error('Error fetching item details:', error);
        const fallbackData = {
          ...item,
          ingredients: Array.isArray(item.ingredients) ? item.ingredients.map(ing => ({
            ...ing,
            base_price: ing.base_price || 100,
            nutrition: Array.isArray(ing.nutrition) ? ing.nutrition : [],
            weight: ing.weight || '1',
            small: ing.small || '1',
            medium: ing.medium || '1',
            large: ing.large || '1',
          })) : [],
          variants: {
            size: item.size || { enabled: false, small_price: 0, medium_price: 0, large_price: 0 },
            cold: item.cold || { enabled: false, ice_price: 0 },
            spicy: {
              enabled: item.spicy?.enabled ?? false,
              spicy_price: item.spicy?.spicy_price ?? 30,
              non_spicy_price: item.spicy?.non_spicy_price ?? 0,
              spicy_image: item.spicy?.spicy_image,
              non_spicy_image: item.spicy?.non_spicy_image,
            },
            sugar: item.sugar || { enabled: false, level: 'medium' },
          },
          custom_variants: Array.isArray(item.custom_variants) ? item.custom_variants : [],
          addons: Array.isArray(item.addons) ? item.addons.map(addon => ({
            ...addon,
            custom_variants: Array.isArray(addon.custom_variants) ? addon.custom_variants : [],
          })) : [],
          combos: Array.isArray(item.combos) ? item.combos.map(combo => ({
            ...combo,
            custom_variants: Array.isArray(combo.custom_variants) ? combo.custom_variants : [],
          })) : [],
          images: Array.isArray(item.images) ? item.images : [],
          price_list_rate: item.price_list_rate || 100,
          offer_price: item.offer_price ?? null,
          offer_start_time: item.offer_start_time ?? null,
          offer_end_time: item.offer_end_time ?? null,
          kitchen: item.kitchen || 'Unknown',
        };
        setFetchedItem(fallbackData);
        setSelectedSizeFilter(
          cartItem?.selectedSize
            ? cartItem.selectedSize === 'S' ? 'small' : cartItem.selectedSize === 'M' ? 'medium' : 'large'
            : item.size?.enabled ? 'medium' : null
        );
        setTotalPrice((item.price_list_rate || 100) * quantity);
        setSelectedPreviewImage(null);
        setCurrentImageIndex(0);
      }
    };
    fetchItemDetails();
  }, [item, cartItem, quantity]);

  useEffect(() => {
    const fetchAddonAndComboIngredients = async () => {
      if (!fetchedItem) return;

      const newAddonIngredients = {};
      for (const addon of fetchedItem.addons || []) {
        if (addonQuantities[addon.name1] > 0) {
          try {
            const response = await fetch(
              `${BASE_URL}/api/items/nutrition/${encodeURIComponent(addon.name1)}?type=addon&item_id=${fetchedItem._id}&index=${fetchedItem.addons.indexOf(addon)}`,
              {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
              }
            );
            if (response.ok) {
              const data = await response.json();
              newAddonIngredients[addon.name1] = Array.isArray(data.ingredients) ? data.ingredients.map(ing => ({
                ...ing,
                nutrition: Array.isArray(ing.nutrition) ? ing.nutrition : [],
                weight: ing.weight || '1',
                small: ing.small || '1',
                medium: ing.medium || '1',
                large: ing.large || '1',
              })) : [];
            } else {
              console.warn(`Failed to fetch ingredients for add-on ${addon.name1}`);
              newAddonIngredients[addon.name1] = [];
            }
          } catch (error) {
            console.error(`Error fetching ingredients for add-on ${addon.name1}:`, error);
            newAddonIngredients[addon.name1] = [];
          }
        }
      }
      setAddonIngredients(newAddonIngredients);

      const newComboIngredients = {};
      for (const combo of fetchedItem.combos || []) {
        if (comboQuantities[combo.name1] > 0) {
          try {
            const response = await fetch(
              `${BASE_URL}/api/items/nutrition/${encodeURIComponent(combo.name1)}?type=combo&item_id=${fetchedItem._id}&index=${fetchedItem.combos.indexOf(combo)}`,
              {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
              }
            );
            if (response.ok) {
              const data = await response.json();
              newComboIngredients[combo.name1] = Array.isArray(data.ingredients) ? data.ingredients.map(ing => ({
                ...ing,
                nutrition: Array.isArray(ing.nutrition) ? ing.nutrition : [],
                weight: ing.weight || '1',
                small: ing.small || '1',
                medium: ing.medium || '1',
                large: ing.large || '1',
              })) : [];
            } else {
              console.warn(`Failed to fetch ingredients for combo ${combo.name1}`);
              newComboIngredients[combo.name1] = [];
            }
          } catch (error) {
            console.error(`Error fetching ingredients for combo ${combo.name1}:`, error);
            newComboIngredients[combo.name1] = [];
          }
        }
      }
      setComboIngredients(newComboIngredients);
    };
    fetchAddonAndComboIngredients();
  }, [fetchedItem, addonQuantities, comboQuantities]);

  useEffect(() => {
    if (!fetchedItem) return;

    let itemPrice = calculateItemPrice();

    if (fetchedItem.variants?.cold?.enabled && selectedVariants.cold === 'with_ice') {
      itemPrice += fetchedItem.variants.cold.ice_price || 0;
    }
    if (fetchedItem.variants?.spicy?.enabled && selectedVariants.spicy) {
      itemPrice += fetchedItem.variants.spicy.spicy_price || 30;
    }

    itemPrice *= quantity;

    const addonsPrice = Object.entries(addonQuantities).reduce((sum, [addonName, qty]) => {
      if (qty <= 0) return sum;
      const addon = fetchedItem.addons?.find(a => a.name1 === addonName);
      if (!addon) return sum;
      const variants = selectedAddonVariants[addonName] || {};
      let price = addon.size?.enabled ? addon.size.medium_price : addon.addon_price || 0;

      if (addon.size?.enabled && variants.size) {
        price =
          variants.size === 'S' ? addon.size.small_price :
          variants.size === 'M' ? addon.size.medium_price :
          variants.size === 'L' ? addon.size.large_price :
          price;
      }
      if (addon.spicy?.enabled && variants.spicy) {
        price += addon.spicy.spicy_price || 30;
      }

      const customVariantsPrice = addon.custom_variants?.length > 0
        ? addon.custom_variants.reduce((variantSum, variant) => {
            if (!variant.enabled) return variantSum;
            return variantSum + variant.subheadings.reduce((subSum, sub) => {
              if (selectedAddonCustomVariants[addonName]?.[sub.name]) {
                return subSum + (sub.price || 0);
              }
              return subSum;
            }, 0);
          }, 0)
        : 0;

      return sum + (price + customVariantsPrice) * qty;
    }, 0);

    const combosPrice = Object.entries(comboQuantities).reduce((sum, [comboName, qty]) => {
      if (qty <= 0) return sum;
      const combo = fetchedItem.combos?.find(c => c.name1 === comboName);
      if (!combo) return sum;
      const variants = selectedComboVariants[comboName] || {};
      let price = combo.size?.enabled ? combo.size.medium_price : combo.combo_price || 0;

      if (combo.size?.enabled && variants.size) {
        price =
          variants.size === 'S' ? combo.size.small_price :
          variants.size === 'M' ? combo.size.medium_price :
          variants.size === 'L' ? combo.size.large_price :
          price;
      }
      if (combo.spicy?.enabled && variants.spicy) {
        price += combo.spicy.spicy_price || 30;
      }

      const customVariantsPrice = combo.custom_variants?.length > 0
        ? combo.custom_variants.reduce((variantSum, variant) => {
            if (!variant.enabled) return variantSum;
            return variantSum + variant.subheadings.reduce((subSum, sub) => {
              if (selectedComboCustomVariants[comboName]?.[sub.name]) {
                return subSum + (sub.price || 0);
              }
              return subSum;
            }, 0);
          }, 0)
        : 0;

      return sum + (price + customVariantsPrice) * qty;
    }, 0);

    const customVariantsPrice = fetchedItem.custom_variants?.length > 0
      ? fetchedItem.custom_variants.reduce((sum, variant) => {
          if (!variant.enabled) return sum;
          return sum + variant.subheadings.reduce((variantSum, sub) => {
            if (selectedCustomVariants[sub.name]) {
              return variantSum + (sub.price || 0);
            }
            return variantSum;
          }, 0);
        }, 0) * quantity
      : 0;

    setTotalPrice(itemPrice + addonsPrice + combosPrice + customVariantsPrice);
  }, [
    fetchedItem,
    quantity,
    selectedVariants,
    addonQuantities,
    selectedAddonVariants,
    selectedAddonCustomVariants,
    comboQuantities,
    selectedComboVariants,
    selectedComboCustomVariants,
    selectedCustomVariants,
  ]);

  const getCurrentItemPrice = () => {
    if (!fetchedItem) return item?.price_list_rate || 100;
    return calculateItemPrice();
  };

  const handleVariantChange = (type, value) => {
    setSelectedVariants(prev => ({ ...prev, [type]: value }));
    if (type === 'size') {
      setSelectedSizeFilter(value === 'S' ? 'small' : value === 'M' ? 'medium' : value === 'L' ? 'large' : null);
    }
  };

  const handleCustomVariantChange = (name) => {
    setSelectedCustomVariants(prev => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleAddonCustomVariantChange = (addonName, subName) => {
    setSelectedAddonCustomVariants(prev => ({
      ...prev,
      [addonName]: {
        ...prev[addonName],
        [subName]: !prev[addonName]?.[subName],
      },
    }));
  };

  const handleComboCustomVariantChange = (comboName, subName) => {
    setSelectedComboCustomVariants(prev => ({
      ...prev,
      [comboName]: {
        ...prev[comboName],
        [subName]: !prev[comboName]?.[subName],
      },
    }));
  };

  const handleAddonCheck = (addon, checked) => {
    setAddonQuantities(prev => ({
      ...prev,
      [addon.name1]: checked ? 1 : 0,
    }));
    setSelectedAddonVariants(prev => ({
      ...prev,
      [addon.name1]: checked ? {
        size: addon.size?.enabled ? 'M' : null,
        cold: addon.cold?.enabled ? 'without_ice' : null,
        spicy: addon.spicy?.enabled ? false : null,
        sugar: addon.sugar?.enabled ? 'medium' : null,
      } : prev[addon.name1] || {},
    }));
    if (!checked) {
      setSelectedAddonCustomVariants(prev => {
        const { [addon.name1]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleAddonVariantChange = (addonName, variantType, value) => {
    setSelectedAddonVariants(prev => {
      const current = prev[addonName] || {};
      return { ...prev, [addonName]: { ...current, [variantType]: value } };
    });
  };

  const increaseAddonQuantity = addonName => {
    setAddonQuantities(prev => ({ ...prev, [addonName]: (prev[addonName] || 0) + 1 }));
  };

  const decreaseAddonQuantity = addonName => {
    setAddonQuantities(prev => {
      const newQty = Math.max((prev[addonName] || 0) - 1, 0);
      if (newQty === 0) {
        setSelectedAddonVariants(prev => {
          const { [addonName]: _, ...rest } = prev;
          return rest;
        });
        setSelectedAddonCustomVariants(prev => {
          const { [addonName]: _, ...rest } = prev;
          return rest;
        });
      }
      return { ...prev, [addonName]: newQty };
    });
  };

  const handleComboCheck = combo => {
    const isSelected = comboQuantities[combo.name1] > 0;
    if (!isSelected) {
      setComboQuantities(prev => ({ ...prev, [combo.name1]: 1 }));
      setSelectedComboVariants(prev => ({
        ...prev,
        [combo.name1]: {
          size: combo.size?.enabled ? 'M' : null,
          cold: combo.cold?.enabled ? 'without_ice' : null,
          spicy: combo.spicy?.enabled ? false : null,
          sugar: combo.sugar?.enabled ? 'medium' : null,
        },
      }));
      setSelectedCombos(prev => [
        ...prev.filter(c => c.name1 !== combo.name1),
        {
          ...combo,
          variant: {
            size: combo.size?.enabled ? 'M' : null,
            cold: combo.cold?.enabled ? 'without_ice' : null,
            spicy: combo.spicy?.enabled ? false : null,
            sugar: combo.sugar?.enabled ? 'medium' : null,
          },
        },
      ]);
    }
  };

  const handleComboVariantChange = (comboName, variantType, value) => {
    setSelectedComboVariants(prev => {
      const current = prev[comboName] || {};
      return { ...prev, [comboName]: { ...current, [variantType]: value } };
    });
  };

  const increaseComboQuantity = comboName => {
    setComboQuantities(prev => ({ ...prev, [comboName]: (prev[comboName] || 0) + 1 }));
  };

  const decreaseComboQuantity = comboName => {
    setComboQuantities(prev => {
      const newQty = Math.max((prev[comboName] || 0) - 1, 0);
      if (newQty === 0) {
        setSelectedCombos(prev => prev.filter(c => c.name1 !== comboName));
        setSelectedComboVariants(prev => {
          const { [comboName]: _, ...rest } = prev;
          return rest;
        });
        setSelectedComboCustomVariants(prev => {
          const { [comboName]: _, ...rest } = prev;
          return rest;
        });
      }
      return { ...prev, [comboName]: newQty };
    });
  };

  const handleAddToCart = () => {
    if (!fetchedItem) return;

    let basePrice = calculateItemPrice();
    let icePrice = 0;
    let spicyPrice = 0;

    if (fetchedItem.variants?.cold?.enabled && selectedVariants.cold === 'with_ice') {
      icePrice = fetchedItem.variants.cold.ice_price || 0;
    }
    if (fetchedItem.variants?.spicy?.enabled && selectedVariants.spicy) {
      spicyPrice = fetchedItem.variants.spicy.spicy_price || 30;
    }

    const filteredAddonQuantities = {};
    const filteredAddonVariants = {};
    const filteredAddonCustomVariants = {};
    const addonPrices = {};
    const addonCustomVariantsDetails = {};
    Object.entries(addonQuantities).forEach(([addonName, qty]) => {
      if (qty > 0) {
        filteredAddonQuantities[addonName] = qty;
        const addon = fetchedItem.addons?.find(a => a.name1 === addonName);
        if (!addon) return;
        const variants = selectedAddonVariants[addonName] || {};
        let price = addon.size?.enabled ? addon.size.medium_price : addon.addon_price || 0;

        if (addon.size?.enabled && variants.size) {
          price =
            variants.size === 'S' ? addon.size.small_price :
            variants.size === 'M' ? addon.size.medium_price :
            variants.size === 'L' ? addon.size.large_price :
            price;
        }
        if (addon.spicy?.enabled && variants.spicy) {
          price += addon.spicy.spicy_price || 30;
        }

        const customVariantsPrice = addon.custom_variants?.length > 0
          ? addon.custom_variants.reduce((variantSum, variant) => {
              if (!variant.enabled) return variantSum;
              return variantSum + variant.subheadings.reduce((subSum, sub) => {
                if (selectedAddonCustomVariants[addonName]?.[sub.name]) {
                  return subSum + (sub.price || 0);
                }
                return subSum;
              }, 0);
            }, 0)
          : 0;

        filteredAddonVariants[addonName] = variants;
        filteredAddonCustomVariants[addonName] = selectedAddonCustomVariants[addonName] || {};
        addonPrices[addonName] = price + customVariantsPrice;

        if (addon.custom_variants?.length > 0) {
          addonCustomVariantsDetails[addonName] = {};
          addon.custom_variants.forEach(variant => {
            if (variant.enabled) {
              variant.subheadings.forEach(sub => {
                if (selectedAddonCustomVariants[addonName]?.[sub.name]) {
                  addonCustomVariantsDetails[addonName][sub.name] = {
                    name: sub.name,
                    price: sub.price || 0,
                    heading: variant.heading,
                    image: sub.image,
                  };
                }
              });
            }
          });
        }
      }
    });

    const filteredComboQuantities = {};
    const filteredComboVariants = {};
    const filteredComboCustomVariants = {};
    const comboPrices = {};
    const comboCustomVariantsDetails = {};
    Object.entries(comboQuantities).forEach(([comboName, qty]) => {
      if (qty > 0) {
        filteredComboQuantities[comboName] = qty;
        const combo = fetchedItem.combos?.find(c => c.name1 === comboName);
        if (!combo) return;
        const variants = selectedComboVariants[comboName] || {};
        let price = combo.size?.enabled ? combo.size.medium_price : combo.combo_price || 0;

        if (combo.size?.enabled && variants.size) {
          price =
            variants.size === 'S' ? combo.size.small_price :
            variants.size === 'M' ? combo.size.medium_price :
            variants.size === 'L' ? combo.size.large_price :
            price;
        }
        if (combo.spicy?.enabled && variants.spicy) {
          price += combo.spicy.spicy_price || 30;
        }

        const customVariantsPrice = combo.custom_variants?.length > 0
          ? combo.custom_variants.reduce((variantSum, variant) => {
              if (!variant.enabled) return variantSum;
              return variantSum + variant.subheadings.reduce((subSum, sub) => {
                if (selectedComboCustomVariants[comboName]?.[sub.name]) {
                  return subSum + (sub.price || 0);
                }
                return subSum;
              }, 0);
            }, 0)
          : 0;

        filteredComboVariants[comboName] = variants;
        filteredComboCustomVariants[comboName] = selectedComboCustomVariants[comboName] || {};
        comboPrices[comboName] = price + customVariantsPrice;

        if (combo.custom_variants?.length > 0) {
          comboCustomVariantsDetails[comboName] = {};
          combo.custom_variants.forEach(variant => {
            if (variant.enabled) {
              variant.subheadings.forEach(sub => {
                if (selectedComboCustomVariants[comboName]?.[sub.name]) {
                  comboCustomVariantsDetails[comboName][sub.name] = {
                    name: sub.name,
                    price: sub.price || 0,
                    heading: variant.heading,
                    image: sub.image,
                  };
                }
              });
            }
          });
        }
      }
    });

    const customizedItem = {
      _id: fetchedItem._id,
      item_name: fetchedItem.item_name,
      item_group: fetchedItem.item_group,
      image: fetchedItem.image,
      images: fetchedItem.images,
      basePrice,
      offer_price: fetchedItem.offer_price,
      offer_start_time: fetchedItem.offer_start_time,
      offer_end_time: fetchedItem.offer_end_time,
      variants: {
        size: fetchedItem.variants?.size?.enabled ? { selected: selectedVariants.size, prices: fetchedItem.variants.size } : null,
        cold: fetchedItem.variants?.cold?.enabled ? { icePreference: selectedVariants.cold, ice_price: fetchedItem.variants.cold.ice_price } : null,
        spicy: fetchedItem.variants?.spicy?.enabled ? {
          isSpicy: selectedVariants.spicy,
          spicy_price: fetchedItem.variants.spicy.spicy_price,
          non_spicy_price: fetchedItem.variants.spicy.non_spicy_price,
          spicy_image: fetchedItem.variants.spicy.spicy_image,
          non_spicy_image: fetchedItem.variants.spicy.non_spicy_image,
        } : null,
        sugar: fetchedItem.variants?.sugar?.enabled ? { level: selectedVariants.sugar } : null,
      },
      selectedCustomVariants,
      addonQuantities: filteredAddonQuantities,
      addonVariants: filteredAddonVariants,
      addonCustomVariants: filteredAddonCustomVariants,
      addonPrices,
      addonCustomVariantsDetails,
      comboQuantities: filteredComboQuantities,
      comboVariants: filteredComboVariants,
      comboCustomVariants: filteredComboCustomVariants,
      comboPrices,
      comboCustomVariantsDetails,
      selectedCombos: selectedCombos.map(combo => ({
        name1: combo.name1,
        price: comboPrices[combo.name1] || (combo.size?.enabled ? combo.size.medium_price : combo.combo_price || 0),
        combo_image: combo.combo_image,
        variant: combo.variant,
        custom_variants: selectedComboCustomVariants[combo.name1] || {},
        quantity: comboQuantities[combo.name1] || 0,
      })),
      kitchen: fetchedItem.kitchen,
      quantity,
      totalPrice,
      icePrice,
      spicyPrice,
      isSpicy: selectedVariants.spicy,
      ingredients: fetchedItem.ingredients,
      nutrition: fetchedItem.nutrition,
    };

    onUpdate(customizedItem);
    onClose();
  };

  const increaseQuantity = () => setQuantity(prev => prev + 1);
  const decreaseQuantity = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  const getImageUrl = imagePath => {
    if (!imagePath) return 'default-image.jpg';
    if (imagePath.startsWith('/static/uploads/')) return `${BASE_URL}${imagePath}`;
    if (imagePath.startsWith('static/uploads/')) return `${BASE_URL}/${imagePath}`;
    return `${BASE_URL}/static/uploads/${imagePath}`;
  };

  const getCurrentAddonPrice = addon => {
    if (!addon) return 0;
    const variants = selectedAddonVariants[addon.name1] || {};
    let price = addon.size?.enabled ? addon.size.medium_price : addon.addon_price || 0;

    if (addon.size?.enabled && variants.size) {
      price =
        variants.size === 'S' ? addon.size.small_price :
        variants.size === 'M' ? addon.size.medium_price :
        variants.size === 'L' ? addon.size.large_price :
        price;
    }
    if (addon.spicy?.enabled && variants.spicy) {
      price += addon.spicy.spicy_price || 30;
    }

    const customVariantsPrice = addon.custom_variants?.length > 0
      ? addon.custom_variants.reduce((variantSum, variant) => {
          if (!variant.enabled) return variantSum;
          return variantSum + variant.subheadings.reduce((subSum, sub) => {
            if (selectedAddonCustomVariants[addon.name1]?.[sub.name]) {
              return subSum + (sub.price || 0);
            }
            return subSum;
          }, 0);
        }, 0)
      : 0;

    return price + customVariantsPrice;
  };

  const getCurrentComboPrice = combo => {
    if (!combo) return 0;
    const variants = selectedComboVariants[combo.name1] || {};
    let price = combo.size?.enabled ? combo.size.medium_price : combo.combo_price || 0;

    if (combo.size?.enabled && variants.size) {
      price =
        variants.size === 'S' ? combo.size.small_price :
        variants.size === 'M' ? combo.size.medium_price :
        variants.size === 'L' ? combo.size.large_price :
        price;
    }
    if (combo.spicy?.enabled && variants.spicy) {
      price += combo.spicy.spicy_price || 30;
    }

    const customVariantsPrice = combo.custom_variants?.length > 0
      ? combo.custom_variants.reduce((variantSum, variant) => {
          if (!variant.enabled) return variantSum;
          return variantSum + variant.subheadings.reduce((subSum, sub) => {
            if (selectedComboCustomVariants[combo.name1]?.[sub.name]) {
              return subSum + (sub.price || 0);
            }
            return subSum;
          }, 0);
        }, 0)
      : 0;

    return price + customVariantsPrice;
  };

  const handlePrevImage = () => {
    if (!fetchedItem?.images?.length) return;
    const allImages = [fetchedItem.image, ...fetchedItem.images];
    const newIndex = (currentImageIndex - 1 + allImages.length) % allImages.length;
    setCurrentImageIndex(newIndex);
    setSelectedPreviewImage(allImages[newIndex]);
  };

  const handleNextImage = () => {
    if (!fetchedItem?.images?.length) return;
    const allImages = [fetchedItem.image, ...fetchedItem.images];
    const newIndex = (currentImageIndex + 1) % allImages.length;
    setCurrentImageIndex(newIndex);
    setSelectedPreviewImage(allImages[newIndex]);
  };

  const handleClose = () => {
    setSelectedPreviewImage(null);
    setCurrentImageIndex(0);
    setSelectedSizeFilter(null);
    onClose();
  };

  const calculateNutrition = (ingredient, sizeKey, isAddon = false, addonName = null, isCombo = false, comboName = null) => {
    if (!ingredient || !Array.isArray(ingredient.nutrition)) {
      console.warn(`Invalid ingredient or nutrition data:`, ingredient);
      return [];
    }

    const baseWeight = parseFloat(ingredient.weight) || 1;
    let effectiveSizeKey = sizeKey;

    if (isAddon && addonName) {
      const addonVariants = selectedAddonVariants[addonName] || {};
      effectiveSizeKey = addonVariants.size
        ? addonVariants.size === 'S' ? 'small' : addonVariants.size === 'M' ? 'medium' : 'large'
        : effectiveSizeKey;
    }

    if (isCombo && comboName) {
      const comboVariants = selectedComboVariants[comboName] || {};
      effectiveSizeKey = comboVariants.size
        ? comboVariants.size === 'S' ? 'small' : comboVariants.size === 'M' ? 'medium' : 'large'
        : effectiveSizeKey;
    }

    const sizeWeight = parseFloat(ingredient[effectiveSizeKey]) || 1;
    const scalingFactor = baseWeight !== 0 ? sizeWeight / baseWeight : 1;

    return ingredient.nutrition.map(nut => {
      if (!nut || typeof nut.nutrition_value === 'undefined') {
        console.warn(`Invalid nutrition data for ingredient:`, ingredient, nut);
        return '0.000';
      }

      const nutritionValue = parseFloat(nut.nutrition_value) || 0;
      if (nutritionValue === 0) {
        return '0.000';
      }

      const scaledValue = nutritionValue * scalingFactor;
      return Number.isFinite(scaledValue) ? scaledValue.toFixed(3) : '0.000';
    });
  };

  const getAllNutritionNames = useMemo(() => {
    const nutritionNames = new Set();
    const allIngredients = [
      ...(Array.isArray(fetchedItem?.ingredients) ? fetchedItem.ingredients : []),
      ...Object.values(addonIngredients).flat(),
      ...Object.values(comboIngredients).flat(),
    ];
    allIngredients.forEach(ingredient => {
      if (Array.isArray(ingredient.nutrition)) {
        ingredient.nutrition.forEach(nut => {
          if (nut.nutrition_name) {
            nutritionNames.add(nut.nutrition_name);
          }
        });
      }
    });
    return Array.from(nutritionNames);
  }, [fetchedItem, addonIngredients, comboIngredients]);

  const calculateTotalNutritionForSize = (sizeKey, nutritionName) => {
    let total = 0;

    const mainIngredients = Array.isArray(fetchedItem?.ingredients) ? fetchedItem.ingredients : [];
    mainIngredients.forEach(ingredient => {
      if (!Array.isArray(ingredient.nutrition)) return;
      const nutritionValues = calculateNutrition(ingredient, sizeKey);
      const nutritionIndex = ingredient.nutrition.findIndex(nut => nut.nutrition_name === nutritionName);
      if (nutritionIndex !== -1) {
        total += parseFloat(nutritionValues[nutritionIndex]) || 0;
      }
    });

    Object.entries(addonIngredients).forEach(([addonName, ingredients]) => {
      ingredients.forEach(ingredient => {
        if (!Array.isArray(ingredient.nutrition)) return;
        const nutritionValues = calculateNutrition(ingredient, sizeKey, true, addonName);
        const nutritionIndex = ingredient.nutrition.findIndex(nut => nut.nutrition_name === nutritionName);
        if (nutritionIndex !== -1) {
          const value = parseFloat(nutritionValues[nutritionIndex]) || 0;
          const qty = addonQuantities[addonName] || 0;
          total += value * qty;
        }
      });
    });

    Object.entries(comboIngredients).forEach(([comboName, ingredients]) => {
      ingredients.forEach(ingredient => {
        if (!Array.isArray(ingredient.nutrition)) return;
        const nutritionValues = calculateNutrition(ingredient, sizeKey, false, null, true, comboName);
        const nutritionIndex = ingredient.nutrition.findIndex(nut => nut.nutrition_name === nutritionName);
        if (nutritionIndex !== -1) {
          const value = parseFloat(nutritionValues[nutritionIndex]) || 0;
          const qty = comboQuantities[comboName] || 0;
          total += value * qty;
        }
      });
    });

    return Number.isFinite(total) ? total.toFixed(3) : '0.000';
  };

  const handleSizeFilterClick = size => setSelectedSizeFilter(size);
  const handleResetFilter = () => setSelectedSizeFilter(null);

  const getSelectedCustomVariantsDisplay = (variants, customVariants, type = 'item') => {
    if (!variants?.length) return 'None';
    const selected = [];
    variants.forEach(variant => {
      if (variant.enabled) {
        variant.subheadings.forEach(sub => {
          if (customVariants[sub.name]) {
            selected.push(`${variant.heading}: ${sub.name}`);
          }
        });
      }
    });
    return selected.join(', ') || 'None';
  };

  if (!fetchedItem) return <div className="food-detail bg-dark"><p>Loading...</p></div>;

  const currentSizeFilter = selectedVariants.size
    ? selectedVariants.size === 'S' ? 'small' : selectedVariants.size === 'M' ? 'medium' : 'large'
    : 'medium';

  return (
    <ErrorBoundary>
      <div className="food-detail bg-dark">
        <div className="modal fade show d-block sec-modal" style={{ zIndex: 1050 }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{fetchedItem.item_name}</h5>
                <button type="button" className="btn-close" onClick={handleClose}></button>
              </div>
              <div className="modal-body" style={{ overflowY: 'auto', maxHeight: '70vh', position: 'relative' }}>
                <div className="image-i-wrapper d-flex justify-content-center align-items-center position-relative">
                  <button
                    className="image-nav-btn left-arrow"
                    onClick={handlePrevImage}
                    disabled={!fetchedItem.images?.length}
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>
                  <div className="image-i">
                    <img
                      src={getImageUrl(selectedPreviewImage || fetchedItem.image)}
                      alt={fetchedItem.item_name}
                      width={150}
                      height={150}
                      className="mb-3 rounded d-flex mx-auto transition-image"
                      onError={e => (e.target.src = 'default-image.jpg')}
                    />
                    {!fetchedItem.images?.length && (
                      <p className="no-images-message">No additional images available</p>
                    )}
                    <i
                      className="fa-solid fa-info info-icon"
                      onClick={() => setShowModal(true)}
                      title="View Details"
                    ></i>
                  </div>
                  <button
                    className="image-nav-btn right-arrow"
                    onClick={handleNextImage}
                    disabled={!fetchedItem.images?.length}
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </div>

                <p className="mb-0 text-center">
                  <strong>Category:</strong> {fetchedItem.item_group || 'Unknown'}
                </p>
                <div className="price-info text-center">
                  <p className="mb-1">
                    <strong>Price:</strong>{' '}
                    {hasActiveOffer() ? (
                      <span>
                        <span style={{ textDecoration: 'line-through', color: '#888' }}>
                          ₹{(fetchedItem.price_list_rate || 0).toFixed(2)}
                        </span>
                        <span style={{ color: '#ff4500', fontWeight: 'bold', marginLeft: '5px' }}>
                          ₹{calculateOfferSizePrice(fetchedItem.offer_price, selectedVariants.size).toFixed(2)}
                        </span>
                      </span>
                    ) : (
                      `₹${getCurrentItemPrice().toFixed(2)}`
                    )}
                  </p>
                  {hasActiveOffer() && (
                    <>
                      <p className="mb-1 offer-start">
                        <strong>Offer Starts:</strong>{' '}
                        <span style={{ color: '#ff4500' }}>{new Date(fetchedItem.offer_start_time).toLocaleString()}</span>
                      </p>
                      <p className="mb-1 offer-end">
                        <strong>Offer Ends:</strong>{' '}
                        <span style={{ color: '#ff4500' }}>{new Date(fetchedItem.offer_end_time).toLocaleString()}</span>
                      </p>
                    </>
                  )}
                </div>
                <p className="text-center">
                  <strong>Total Price:</strong> ₹{(totalPrice || 0).toFixed(2)}
                </p>
                <div className="quantity-container d-flex justify-content-center mb-3">
                  <button className="quantity-btn minus" onClick={decreaseQuantity}>
                    −
                  </button>
                  <span className="quantity-value">{quantity}</span>
                  <button className="quantity-btn plus" onClick={increaseQuantity}>
                    +
                  </button>
                </div>

                <div className="content-wrapper">
                  {(fetchedItem.variants?.size?.enabled || fetchedItem.variants?.cold?.enabled || 
                    fetchedItem.variants?.spicy?.enabled || fetchedItem.variants?.sugar?.enabled || 
                    fetchedItem.custom_variants?.some(v => v.enabled)) && (
                    <div className="mt-3 text-center">
                      <strong>Selected Variants:</strong>
                      <div>
                        {fetchedItem.variants?.size?.enabled && selectedVariants.size && (
                          <span>
                            Size: {selectedVariants.size === 'S' ? 'Small' : selectedVariants.size === 'M' ? 'Medium' : 'Large'}{' '}
                          </span>
                        )}
                        {fetchedItem.variants?.cold?.enabled && selectedVariants.cold && (
                          <span>Ice: {selectedVariants.cold === 'with_ice' ? 'With Ice' : 'Without Ice'} </span>
                        )}
                        {fetchedItem.variants?.spicy?.enabled && selectedVariants.spicy !== null && (
                          <span>Spicy: {selectedVariants.spicy ? 'Yes' : 'No'} </span>
                        )}
                        {fetchedItem.variants?.sugar?.enabled && selectedVariants.sugar && (
                          <span>Sugar: {selectedVariants.sugar.charAt(0).toUpperCase() + selectedVariants.sugar.slice(1)} </span>
                        )}
                        {fetchedItem.custom_variants?.some(v => v.enabled) && (
                          <span>Custom: {getSelectedCustomVariantsDisplay(fetchedItem.custom_variants, selectedCustomVariants)}</span>
                        )}
                      </div>
                      <button className="btn btn-outline-secondary mt-2" onClick={() => setShowVariantPopup(true)}>
                        Select Predefined Variants
                      </button>
                      {fetchedItem.custom_variants?.some(v => v.enabled) && (
                        <button className="btn btn-outline-secondary mt-2 ms-2" onClick={() => setShowCustomVariantPopup(true)}>
                          Select Custom Variants
                        </button>
                      )}
                      {showVariantPopup && (
                        <div className="modal-overlay">
                          <div className="modal-content p-3" style={{ maxWidth: '300px', textAlign: 'center' }}>
                            <h5>Select Predefined Variants</h5>
                            {fetchedItem.variants?.size?.enabled && (
                              <div className="mt-3">
                                <h6>Size</h6>
                                <div className="d-flex justify-content-around">
                                  <div
                                    className={`variant-option ${selectedVariants.size === 'S' ? 'selected' : ''}`}
                                    onClick={() => handleVariantChange('size', 'S')}
                                  >
                                    <h6>S (₹{fetchedItem.variants.size.small_price || 0})</h6>
                                  </div>
                                  <div
                                    className={`variant-option ${selectedVariants.size === 'M' ? 'selected' : ''}`}
                                    onClick={() => handleVariantChange('size', 'M')}
                                  >
                                    <h6>M (₹{fetchedItem.variants.size.medium_price || 0})</h6>
                                  </div>
                                  <div
                                    className={`variant-option ${selectedVariants.size === 'L' ? 'selected' : ''}`}
                                    onClick={() => handleVariantChange('size', 'L')}
                                  >
                                    <h6>L (₹{fetchedItem.variants.size.large_price || 0})</h6>
                                  </div>
                                </div>
                              </div>
                            )}
                            {fetchedItem.variants?.cold?.enabled && (
                              <div className="mt-3">
                                <h6>Ice Preference</h6>
                                <div className="d-flex justify-content-around">
                                  <div
                                    className={`variant-option ${selectedVariants.cold === 'without_ice' ? 'selected' : ''}`}
                                    onClick={() => handleVariantChange('cold', 'without_ice')}
                                  >
                                    <h6>Without Ice</h6>
                                  </div>
                                  <div
                                    className={`variant-option ${selectedVariants.cold === 'with_ice' ? 'selected' : ''}`}
                                    onClick={() => handleVariantChange('cold', 'with_ice')}
                                  >
                                    <h6>With Ice (+₹{fetchedItem.variants.cold.ice_price || 0})</h6>
                                  </div>
                                </div>
                              </div>
                            )}
                            {fetchedItem.variants?.spicy?.enabled && (
                              <div className="mt-3">
                                <h6>Spicy Preference</h6>
                                <div className="d-flex justify-content-around">
                                  <div
                                    className={`variant-option ${!selectedVariants.spicy ? 'selected' : ''}`}
                                    onClick={() => handleVariantChange('spicy', false)}
                                  >
                                    <h6>Non-Spicy (₹{fetchedItem.variants.spicy.non_spicy_price || 0})</h6>
                                  </div>
                                  <div
                                    className={`variant-option ${selectedVariants.spicy ? 'selected' : ''}`}
                                    onClick={() => handleVariantChange('spicy', true)}
                                  >
                                    <h6>Spicy (+₹{fetchedItem.variants.spicy.spicy_price || 30})</h6>
                                  </div>
                                </div>
                              </div>
                            )}
                            {fetchedItem.variants?.sugar?.enabled && (
                              <div className="mt-3">
                                <h6>Sugar Level</h6>
                                <select
                                  value={selectedVariants.sugar || 'medium'}
                                  onChange={e => handleVariantChange('sugar', e.target.value)}
                                  className="form-select"
                                >
                                  <option value="less">Less Sugar</option>
                                  <option value="medium">Medium Sugar</option>
                                  <option value="extra">Extra Sugar</option>
                                </select>
                              </div>
                            )}
                            <button className="btn btn-secondary mt-3" onClick={() => setShowVariantPopup(false)}>
                              Close
                            </button>
                          </div>
                        </div>
                      )}
                      {showCustomVariantPopup && (
                        <div className="modal-overlay">
                          <div className="modal-content p-3" style={{ maxWidth: '400px', textAlign: 'center' }}>
                            <h5>Select Custom Variants</h5>
                            {fetchedItem.custom_variants?.map(variant => (
                              variant.enabled && (
                                <div key={variant._id} className="mt-3">
                                  <h6>{variant.heading}</h6>
                                  <div className="d-flex justify-content-around flex-wrap">
                                    {variant.subheadings.map(sub => (
                                      <div
                                        key={sub.name}
                                        className={`variant-option ${selectedCustomVariants[sub.name] ? 'selected' : ''}`}
                                        onClick={() => handleCustomVariantChange(sub.name)}
                                      >
                                        <h6>{sub.name} (+₹{sub.price || 0})</h6>
                                        {sub.image && (
                                          <img
                                            src={getImageUrl(sub.image)}
                                            alt={sub.name}
                                            width={50}
                                            height={50}
                                            className="mt-1 rounded"
                                            onError={e => (e.target.src = 'default-image.jpg')}
                                          />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            ))}
                            <button className="btn btn-secondary mt-3" onClick={() => setShowCustomVariantPopup(false)}>
                              Close
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {fetchedItem.addons?.length > 0 && (
                    <div className="mt-3">
                      <strong>Add-ons:</strong>
                      <ul className="addons-list d-flex justify-content-evenly flex-wrap">
                        {fetchedItem.addons.map(addon => {
                          const isSelected = addonQuantities[addon.name1] > 0;
                          const addonQty = addonQuantities[addon.name1] || 0;
                          const currentPrice = getCurrentAddonPrice(addon);

                          return (
                            <li key={addon.name1} className="addon-container">
                              <div
                                className={`addon-item ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleAddonCheck(addon, !isSelected)}
                              >
                                <img
                                  src={getImageUrl(addon.addon_image)}
                                  width={75}
                                  height={75}
                                  className="mx-2 rounded"
                                  alt={addon.name1}
                                  onError={e => (e.target.src = 'default-addon-image.jpg')}
                                />
                                <span>{addon.name1}</span>
                                <span>₹{(currentPrice || 0).toFixed(2)}</span>
                                {isSelected && (
                                  <div className="addon-controls">
                                    {(addon.size?.enabled || addon.cold?.enabled || addon.spicy?.enabled || addon.sugar?.enabled) && (
                                      <button
                                        className="btn btn-outline-secondary btn-sm mt-2"
                                        onClick={e => {
                                          e.stopPropagation();
                                          setShowAddonVariantPopup(addon.name1);
                                        }}
                                      >
                                        Select Predefined Variants
                                      </button>
                                    )}
                                    {addon.custom_variants?.some(v => v.enabled) && (
                                      <button
                                        className="btn btn-outline-secondary btn-sm mt-2 ms-2"
                                        onClick={e => {
                                          e.stopPropagation();
                                          setShowAddonCustomVariantPopup(addon.name1);
                                        }}
                                      >
                                        Select Custom Variants
                                      </button>
                                    )}
                                    <div className="quantity-container mt-2">
                                      <button
                                        className="quantity-btn minus"
                                        onClick={e => {
                                          e.stopPropagation();
                                          decreaseAddonQuantity(addon.name1);
                                        }}
                                      >
                                        −
                                      </button>
                                      <span className="quantity-value">{addonQty}</span>
                                      <button
                                        className="quantity-btn plus"
                                        onClick={e => {
                                          e.stopPropagation();
                                          increaseAddonQuantity(addon.name1);
                                        }}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {showAddonVariantPopup === addon.name1 && (
                                <div className="modal-overlay">
                                  <div className="modal-content p-3" style={{ maxWidth: '300px', textAlign: 'center' }}>
                                    <h5>Select Predefined Variants for {addon.name1}</h5>
                                    {addon.size?.enabled && (
                                      <div className="mt-3">
                                        <h6>Size</h6>
                                        <div className="d-flex justify-content-around">
                                          <div
                                            className={`variant-option ${selectedAddonVariants[addon.name1]?.size === 'S' ? 'selected' : ''}`}
                                            onClick={() => handleAddonVariantChange(addon.name1, 'size', 'S')}
                                          >
                                            <h6>S (₹{addon.size.small_price || 0})</h6>
                                          </div>
                                          <div
                                            className={`variant-option ${selectedAddonVariants[addon.name1]?.size === 'M' ? 'selected' : ''}`}
                                            onClick={() => handleAddonVariantChange(addon.name1, 'size', 'M')}
                                          >
                                            <h6>M (₹{addon.size.medium_price || 0})</h6>
                                          </div>
                                          <div
                                            className={`variant-option ${selectedAddonVariants[addon.name1]?.size === 'L' ? 'selected' : ''}`}
                                            onClick={() => handleAddonVariantChange(addon.name1, 'size', 'L')}
                                          >
                                            <h6>L (₹{addon.size.large_price || 0})</h6>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    {addon.cold?.enabled && (
                                      <div className="mt-3">
                                        <h6>Ice Preference</h6>
                                        <div className="d-flex justify-content-around">
                                          <div
                                            className={`variant-option ${selectedAddonVariants[addon.name1]?.cold === 'without_ice' ? 'selected' : ''}`}
                                            onClick={() => handleAddonVariantChange(addon.name1, 'cold', 'without_ice')}
                                          >
                                            <h6>Without Ice</h6>
                                          </div>
                                          <div
                                            className={`variant-option ${selectedAddonVariants[addon.name1]?.cold === 'with_ice' ? 'selected' : ''}`}
                                            onClick={() => handleAddonVariantChange(addon.name1, 'cold', 'with_ice')}
                                          >
                                            <h6>With Ice (+₹{addon.cold.ice_price || 0})</h6>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    {addon.spicy?.enabled && (
                                      <div className="mt-3">
                                        <h6>Spicy Preference</h6>
                                        <div className="d-flex justify-content-around">
                                          <div
                                            className={`variant-option ${!selectedAddonVariants[addon.name1]?.spicy ? 'selected' : ''}`}
                                            onClick={() => handleAddonVariantChange(addon.name1, 'spicy', false)}
                                          >
                                            <h6>Non-Spicy (₹{addon.size?.enabled ? addon.size.medium_price : addon.addon_price || 0})</h6>
                                          </div>
                                          <div
                                            className={`variant-option ${selectedAddonVariants[addon.name1]?.spicy ? 'selected' : ''}`}
                                            onClick={() => handleAddonVariantChange(addon.name1, 'spicy', true)}
                                          >
                                            <h6>Spicy (+₹{addon.spicy.spicy_price || 30})</h6>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    {addon.sugar?.enabled && (
                                      <div className="mt-3">
                                        <h6>Sugar Level</h6>
                                        <select
                                          value={selectedAddonVariants[addon.name1]?.sugar || 'medium'}
                                          onChange={e => handleAddonVariantChange(addon.name1, 'sugar', e.target.value)}
                                          className="form-select"
                                        >
                                          <option value="less">Less Sugar</option>
                                          <option value="medium">Medium Sugar</option>
                                          <option value="extra">Extra Sugar</option>
                                        </select>
                                      </div>
                                    )}
                                    <button
                                      className="btn btn-secondary mt-3"
                                      onClick={() => setShowAddonVariantPopup(null)}
                                    >
                                      Close
                                    </button>
                                  </div>
                                </div>
                              )}
                              {showAddonCustomVariantPopup === addon.name1 && (
                                <div className="modal-overlay">
                                  <div className="modal-content p-3" style={{ maxWidth: '400px', textAlign: 'center' }}>
                                    <h5>Select Custom Variants for {addon.name1}</h5>
                                    {addon.custom_variants?.map(variant => (
                                      variant.enabled && (
                                        <div key={variant._id} className="mt-3">
                                          <h6>{variant.heading}</h6>
                                          <div className="d-flex justify-content-around flex-wrap">
                                            {variant.subheadings.map(sub => (
                                              <div
                                                key={sub.name}
                                                className={`variant-option ${selectedAddonCustomVariants[addon.name1]?.[sub.name] ? 'selected' : ''}`}
                                                onClick={() => handleAddonCustomVariantChange(addon.name1, sub.name)}
                                              >
                                                <h6>{sub.name} (+₹{sub.price || 0})</h6>
                                                {sub.image && (
                                                  <img
                                                    src={getImageUrl(sub.image)}
                                                    alt={sub.name}
                                                    width={50}
                                                    height={50}
                                                    className="mt-1 rounded"
                                                    onError={e => (e.target.src = 'default-image.jpg')}
                                                  />
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )
                                    ))}
                                    <button
                                      className="btn btn-secondary mt-3"
                                      onClick={() => setShowAddonCustomVariantPopup(null)}
                                    >
                                      Close
                                    </button>
                                  </div>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {fetchedItem.combos?.length > 0 && (
                    <div>
                      <div className="form-check mt-4">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={showCombos}
                          onChange={() => setShowCombos(!showCombos)}
                        />
                        <label className="form-check-label">Show Combos</label>
                      </div>
                      {showCombos && (
                        <div className="combo-list mt-3">
                          <h5>Combo Options:</h5>
                          <ul className="addons-list d-flex justify-content-evenly flex-wrap">
                            {fetchedItem.combos.map(combo => {
                              const isSelected = comboQuantities[combo.name1] > 0;
                              const comboQty = comboQuantities[combo.name1] || 0;
                              const currentPrice = getCurrentComboPrice(combo);

                              return (
                                <li key={combo.name1} className="addon-container">
                                  <div
                                    className={`addon-item ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleComboCheck(combo)}
                                  >
                                    <img
                                      src={getImageUrl(combo.combo_image)}
                                      width={75}
                                      height={75}
                                      className="mx-2 rounded"
                                      alt={combo.name1}
                                      onError={e => (e.target.src = 'default-combo-image.jpg')}
                                    />
                                    <span>{combo.name1}</span>
                                    <span>₹{(currentPrice || 0).toFixed(2)}</span>
                                    {isSelected && (
                                      <div className="combo-controls">
                                        {(combo.size?.enabled || combo.cold?.enabled || combo.spicy?.enabled || combo.sugar?.enabled) && (
                                          <button
                                            className="btn btn-outline-secondary btn-sm mt-2"
                                            onClick={e => {
                                              e.stopPropagation();
                                              setShowComboVariantPopup(combo.name1);
                                            }}
                                          >
                                            Select Predefined Variants
                                          </button>
                                        )}
                                        {combo.custom_variants?.some(v => v.enabled) && (
                                          <button
                                            className="btn btn-outline-secondary btn-sm mt-2 ms-2"
                                            onClick={e => {
                                              e.stopPropagation();
                                              setShowComboCustomVariantPopup(combo.name1);
                                            }}
                                          >
                                            Select Custom Variants
                                          </button>
                                        )}
                                        <div className="quantity-container mt-2">
                                          <button
                                            className="quantity-btn minus"
                                            onClick={e => {
                                              e.stopPropagation();
                                              decreaseComboQuantity(combo.name1);
                                            }}
                                          >
                                            −
                                          </button>
                                          <span className="quantity-value">{comboQty}</span>
                                          <button
                                            className="quantity-btn plus"
                                            onClick={e => {
                                              e.stopPropagation();
                                              increaseComboQuantity(combo.name1);
                                            }}
                                          >
                                            +
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {showComboVariantPopup === combo.name1 && (
                                    <div className="modal-overlay">
                                      <div className="modal-content p-3" style={{ maxWidth: '300px', textAlign: 'center' }}>
                                        <h5>Select Predefined Variants for {combo.name1}</h5>
                                        {combo.size?.enabled && (
                                          <div className="mt-3">
                                            <h6>Size</h6>
                                            <div className="d-flex justify-content-around">
                                              <div
                                                className={`variant-option ${selectedComboVariants[combo.name1]?.size === 'S' ? 'selected' : ''}`}
                                                onClick={() => handleComboVariantChange(combo.name1, 'size', 'S')}
                                              >
                                                <h6>S (₹{combo.size.small_price || 0})</h6>
                                              </div>
                                              <div
                                                className={`variant-option ${selectedComboVariants[combo.name1]?.size === 'M' ? 'selected' : ''}`}
                                                onClick={() => handleComboVariantChange(combo.name1, 'size', 'M')}
                                              >
                                                <h6>M (₹{combo.size.medium_price || 0})</h6>
                                              </div>
                                              <div
                                                className={`variant-option ${selectedComboVariants[combo.name1]?.size === 'L' ? 'selected' : ''}`}
                                                onClick={() => handleComboVariantChange(combo.name1, 'size', 'L')}
                                              >
                                                <h6>L (₹{combo.size.large_price || 0})</h6>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        {combo.cold?.enabled && (
                                          <div className="mt-3">
                                            <h6>Ice Preference</h6>
                                            <div className="d-flex justify-content-around">
                                              <div
                                                className={`variant-option ${selectedComboVariants[combo.name1]?.cold === 'without_ice' ? 'selected' : ''}`}
                                                onClick={() => handleComboVariantChange(combo.name1, 'cold', 'without_ice')}
                                              >
                                                <h6>Without Ice</h6>
                                              </div>
                                              <div
                                                className={`variant-option ${selectedComboVariants[combo.name1]?.cold === 'with_ice' ? 'selected' : ''}`}
                                                onClick={() => handleComboVariantChange(combo.name1, 'cold', 'with_ice')}
                                              >
                                                <h6>With Ice (+₹{combo.cold.ice_price || 0})</h6>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        {combo.spicy?.enabled && (
                                          <div className="mt-3">
                                            <h6>Spicy Preference</h6>
                                            <div className="d-flex justify-content-around">
                                              <div
                                                className={`variant-option ${!selectedComboVariants[combo.name1]?.spicy ? 'selected' : ''}`}
                                                onClick={() => handleComboVariantChange(combo.name1, 'spicy', false)}
                                              >
                                                <h6>Non-Spicy (₹{combo.size?.enabled ? combo.size.medium_price : combo.combo_price || 0})</h6>
                                              </div>
                                              <div
                                                className={`variant-option ${selectedComboVariants[combo.name1]?.spicy ? 'selected' : ''}`}
                                                onClick={() => handleComboVariantChange(combo.name1, 'spicy', true)}
                                              >
                                                <h6>Spicy (+₹{combo.spicy.spicy_price || 30})</h6>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        {combo.sugar?.enabled && (
                                          <div className="mt-3">
                                            <h6>Sugar Level</h6>
                                            <select
                                              value={selectedComboVariants[combo.name1]?.sugar || 'medium'}
                                              onChange={e => handleComboVariantChange(combo.name1, 'sugar', e.target.value)}
                                              className="form-select"
                                            >
                                              <option value="less">Less Sugar</option>
                                              <option value="medium">Medium Sugar</option>
                                              <option value="extra">Extra Sugar</option>
                                            </select>
                                          </div>
                                        )}
                                        <button
                                          className="btn btn-secondary mt-3"
                                          onClick={() => setShowComboVariantPopup(null)}
                                        >
                                          Close
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  {showComboCustomVariantPopup === combo.name1 && (
                                    <div className="modal-overlay">
                                      <div className="modal-content p-3" style={{ maxWidth: '400px', textAlign: 'center' }}>
                                        <h5>Select Custom Variants for {combo.name1}</h5>
                                        {combo.custom_variants?.map(variant => (
                                          variant.enabled && (
                                            <div key={variant._id} className="mt-3">
                                              <h6>{variant.heading}</h6>
                                              <div className="d-flex justify-content-around flex-wrap">
                                                {variant.subheadings.map(sub => (
                                                  <div
                                                    key={sub.name}
                                                    className={`variant-option ${selectedComboCustomVariants[combo.name1]?.[sub.name] ? 'selected' : ''}`}
                                                    onClick={() => handleComboCustomVariantChange(combo.name1, sub.name)}
                                                  >
                                                    <h6>{sub.name} (+₹{sub.price || 0})</h6>
                                                    {sub.image && (
                                                      <img
                                                        src={getImageUrl(sub.image)}
                                                        alt={sub.name}
                                                        width={50}
                                                        height={50}
                                                        className="mt-1 rounded"
                                                        onError={e => (e.target.src = 'default-image.jpg')}
                                                      />
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )
                                        ))}
                                        <button
                                          className="btn btn-secondary mt-3"
                                          onClick={() => setShowComboCustomVariantPopup(null)}
                                        >
                                          Close
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" onClick={handleAddToCart}>
                  {cartItem ? 'Update Cart' : 'Add to Cart'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleClose}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>

        {showModal && (
          <div className="modal-side-content" style={{ zIndex: 1060 }}>
            <div className="modal-side-header">
              <h5 className="modal-side-title">{fetchedItem.item_name} Details</h5>
              <i className="fa-solid fa-times close-icon" onClick={() => setShowModal(false)}></i>
            </div>
            <div className="modal-side-body">
              <div className="ingredients-section">
                <h6 className="section-title">Ingredients and Nutrition Details</h6>
                <div className="size-filter-buttons mb-3">
                  {fetchedItem.variants?.size?.enabled && (
                    <>
                      <button
                        className={`btn btn-outline-primary me-2 ${selectedSizeFilter === currentSizeFilter ? 'active' : ''}`}
                        onClick={() => handleSizeFilterClick(currentSizeFilter)}
                      >
                        {currentSizeFilter.charAt(0).toUpperCase() + currentSizeFilter.slice(1)}
                      </button>
                      <button
                        className={`btn btn-outline-secondary ${!selectedSizeFilter ? 'active' : ''}`}
                        onClick={handleResetFilter}
                      >
                        Show All
                      </button>
                    </>
                  )}
                </div>
                {fetchedItem.ingredients.length === 0 &&
                Object.values(addonIngredients).every(ings => ings.length === 0) &&
                Object.values(comboIngredients).every(ings => ings.length === 0) ? (
                  <p>No ingredients available.</p>
                ) : selectedSizeFilter ? (
                  <table className="nutrition-table">
                    <thead>
                      <tr>
                        <th>Nutrition</th>
                        {fetchedItem.ingredients.map((ingredient, index) => (
                          <th key={`main-${index}`} className="main-ingredient">{ingredient.name}</th>
                        ))}
                        {Object.entries(addonIngredients).map(([addonName, ingredients]) =>
                          ingredients.map((ingredient, index) => (
                            <th key={`addon-${addonName}-${index}`} className="addon-ingredient">
                              {ingredient.name} ({addonName})
                            </th>
                          ))
                        )}
                        {Object.entries(comboIngredients).map(([comboName, ingredients]) =>
                          ingredients.map((ingredient, index) => (
                            <th key={`combo-${comboName}-${index}`} className="combo-ingredient">
                              {ingredient.name} ({comboName})
                            </th>
                          ))
                        )}
                        <th className="total-column">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getAllNutritionNames.map((nutritionName, nutIndex) => {
                        const hasNutrition = [
                          ...(Array.isArray(fetchedItem?.ingredients) ? fetchedItem.ingredients : []),
                          ...Object.values(addonIngredients).flat(),
                          ...Object.values(comboIngredients).flat(),
                        ].some(ing => ing.nutrition?.some(nut => nut.nutrition_name === nutritionName));
                        if (!hasNutrition) return null;
                        return (
                          <tr key={nutIndex}>
                            <td>{nutritionName}</td>
                            {fetchedItem.ingredients.map((ingredient, ingIndex) => {
                              const nutritionIndex = ingredient.nutrition?.findIndex(
                                nut => nut.nutrition_name === nutritionName
                              ) ?? -1;
                              if (nutritionIndex === -1) {
                                return <td key={`main-${ingIndex}`} className="main-ingredient">-</td>;
                              }
                              const scaledValues = calculateNutrition(ingredient, selectedSizeFilter);
                              return (
                                <td key={`main-${ingIndex}`} className="main-ingredient">
                                  {scaledValues[nutritionIndex]} gm
                                </td>
                              );
                            })}
                            {Object.entries(addonIngredients).map(([addonName, ingredients]) =>
                              ingredients.map((ingredient, ingIndex) => {
                                const nutritionIndex = ingredient.nutrition?.findIndex(
                                  nut => nut.nutrition_name === nutritionName
                                ) ?? -1;
                                if (nutritionIndex === -1) {
                                  return <td key={`addon-${addonName}-${ingIndex}`} className="addon-ingredient">-</td>;
                                }
                                const scaledValues = calculateNutrition(ingredient, selectedSizeFilter, true, addonName);
                                return (
                                  <td key={`addon-${addonName}-${ingIndex}`} className="addon-ingredient">
                                    {scaledValues[nutritionIndex]} gm
                                  </td>
                                );
                              })
                            )}
                            {Object.entries(comboIngredients).map(([comboName, ingredients]) =>
                              ingredients.map((ingredient, ingIndex) => {
                                const nutritionIndex = ingredient.nutrition?.findIndex(
                                  nut => nut.nutrition_name === nutritionName
                                ) ?? -1;
                                if (nutritionIndex === -1) {
                                  return <td key={`combo-${comboName}-${ingIndex}`} className="combo-ingredient">-</td>;
                                }
                                const scaledValues = calculateNutrition(ingredient, selectedSizeFilter, false, null, true, comboName);
                                return (
                                  <td key={`combo-${comboName}-${ingIndex}`} className="combo-ingredient">
                                    {scaledValues[nutritionIndex]} gm
                                  </td>
                                );
                              })
                            )}
                            <td className="total-column">
                              {calculateTotalNutritionForSize(selectedSizeFilter, nutritionName)} gm
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <table className="nutrition-table">
                    <thead>
                      <tr>
                        <th>Ingredient</th>
                        <th>Nutrition</th>
                        <th className="size-column">Small (gm)</th>
                        <th className="size-column">Medium (gm)</th>
                        <th className="size-column">Large (gm)</th>
                        <th className="total-column">Total (gm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fetchedItem.ingredients.map((ingredient, ingIndex) => (
                        ingredient.nutrition.map((nut, nutIndex) => (
                          <tr key={`main-${ingIndex}-${nutIndex}`} className="main-row">
                            {nutIndex === 0 && (
                              <td rowSpan={ingredient.nutrition.length} className="main-ingredient">
                                {ingredient.name}
                              </td>
                            )}
                            <td>{nut.nutrition_name}</td>
                            <td className="size-column">{calculateNutrition(ingredient, 'small')[nutIndex]} gm</td>
                            <td className="size-column">{calculateNutrition(ingredient, 'medium')[nutIndex]} gm</td>
                            <td className="size-column">{calculateNutrition(ingredient, 'large')[nutIndex]} gm</td>
                            {nutIndex === 0 && (
                              <td rowSpan={ingredient.nutrition.length} className="total-column">
                                {calculateTotalNutritionForSize(currentSizeFilter, nut.nutrition_name)} gm
                              </td>
                            )}
                          </tr>
                        ))
                      ))}
                      {Object.entries(addonIngredients).map(([addonName, ingredients]) =>
                        ingredients.map((ingredient, ingIndex) => (
                          ingredient.nutrition.map((nut, nutIndex) => (
                            <tr key={`addon-${addonName}-${ingIndex}-${nutIndex}`} className="addon-row">
                              {nutIndex === 0 && (
                                <td rowSpan={ingredient.nutrition.length} className="addon-ingredient">
                                  {ingredient.name} ({addonName})
                                </td>
                              )}
                              <td>{nut.nutrition_name}</td>
                              <td className="size-column">{calculateNutrition(ingredient, 'small', true, addonName)[nutIndex]} gm</td>
                              <td className="size-column">{calculateNutrition(ingredient, 'medium', true, addonName)[nutIndex]} gm</td>
                              <td className="size-column">{calculateNutrition(ingredient, 'large', true, addonName)[nutIndex]} gm</td>
                              {nutIndex === 0 && (
                                <td rowSpan={ingredient.nutrition.length} className="total-column">
                                  {calculateTotalNutritionForSize(currentSizeFilter, nut.nutrition_name)} gm
                                </td>
                              )}
                            </tr>
                          ))
                        ))
                      )}
                      {Object.entries(comboIngredients).map(([comboName, ingredients]) =>
                        ingredients.map((ingredient, ingIndex) => (
                          ingredient.nutrition.map((nut, nutIndex) => (
                            <tr key={`combo-${comboName}-${ingIndex}-${nutIndex}`} className="combo-row">
                              {nutIndex === 0 && (
                                <td rowSpan={ingredient.nutrition.length} className="combo-ingredient">
                                  {ingredient.name} ({comboName})
                                </td>
                              )}
                              <td>{nut.nutrition_name}</td>
                              <td className="size-column">{calculateNutrition(ingredient, 'small', false, null, true, comboName)[nutIndex]} gm</td>
                              <td className="size-column">{calculateNutrition(ingredient, 'medium', false, null, true, comboName)[nutIndex]} gm</td>
                              <td className="size-column">{calculateNutrition(ingredient, 'large', false, null, true, comboName)[nutIndex]} gm</td>
                              {nutIndex === 0 && (
                                <td rowSpan={ingredient.nutrition.length} className="total-column">
                                  {calculateTotalNutritionForSize(currentSizeFilter, nut.nutrition_name)} gm
                                </td>
                              )}
                            </tr>
                          ))
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

FoodDetails.propTypes = {
  item: PropTypes.shape({
    _id: PropTypes.string,
    name: PropTypes.string,
    item_name: PropTypes.string,
    item_group: PropTypes.string,
    price_list_rate: PropTypes.number,
    image: PropTypes.string,
    images: PropTypes.arrayOf(PropTypes.string),
    ingredients: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
      base_price: PropTypes.number,
      nutrition: PropTypes.arrayOf(PropTypes.shape({
        nutrition_name: PropTypes.string,
        nutrition_value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      })),
    })),
    size: PropTypes.shape({
      enabled: PropTypes.bool,
      small_price: PropTypes.number,
      medium_price: PropTypes.number,
      large_price: PropTypes.number,
    }),
    cold: PropTypes.shape({
      enabled: PropTypes.bool,
      ice_price: PropTypes.number,
    }),
    spicy: PropTypes.shape({
      enabled: PropTypes.bool,
      spicy_price: PropTypes.number,
      non_spicy_price: PropTypes.number,
      spicy_image: PropTypes.string,
      non_spicy_image: PropTypes.string,
    }),
    sugar: PropTypes.shape({
      enabled: PropTypes.bool,
      level: PropTypes.string,
    }),
    variantDetails: PropTypes.shape({
      enabled: PropTypes.bool,
      subheadings: PropTypes.arrayOf(PropTypes.shape({
        name: PropTypes.string,
        price: PropTypes.number,
        image: PropTypes.string,
      })),
    }),
    addons: PropTypes.arrayOf(PropTypes.shape({
      name1: PropTypes.string,
      addon_price: PropTypes.number,
      addon_image: PropTypes.string,
      size: PropTypes.shape({
        enabled: PropTypes.bool,
        small_price: PropTypes.number,
        medium_price: PropTypes.number,
        large_price: PropTypes.number,
      }),
      spicy: PropTypes.shape({
        enabled: PropTypes.bool,
        spicy_price: PropTypes.number,
      }),
    })),
    combos: PropTypes.arrayOf(PropTypes.shape({
      name1: PropTypes.string,
      combo_price: PropTypes.number,
      combo_image: PropTypes.string,
      size: PropTypes.shape({
        enabled: PropTypes.bool,
        small_price: PropTypes.number,
        medium_price: PropTypes.number,
        large_price: PropTypes.number,
      }),
      spicy: PropTypes.shape({
        enabled: PropTypes.bool,
        spicy_price: PropTypes.number,
      }),
    })),
    offer_price: PropTypes.number,
    offer_start_time: PropTypes.string,
    offer_end_time: PropTypes.string,
    kitchen: PropTypes.string,
  }).isRequired,
  cartItem: PropTypes.shape({
    quantity: PropTypes.number,
    selectedSize: PropTypes.string,
    icePreference: PropTypes.string,
    isSpicy: PropTypes.bool,
    addonQuantities: PropTypes.object,
    addonVariants: PropTypes.object,
    comboQuantities: PropTypes.object,
    comboVariants: PropTypes.object,
    selectedCombos: PropTypes.array,
    selectedCustomVariants: PropTypes.object,
  }),
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

export default FoodDetails;