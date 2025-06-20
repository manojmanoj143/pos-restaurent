import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import FoodDetails from "./FoodDetails";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import "./front.css";

function FrontPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All Items");
  const [categories, setCategories] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [billCartItems, setBillCartItems] = useState([]);
  const location = useLocation();
  const { state } = location;
  const {
    tableNumber,
    chairsBooked = [],
    orderType,
    existingOrder,
    cartItems: initialCartItems,
  } = state || {};
  const [isPhoneNumberSet, setIsPhoneNumberSet] = useState(false);
  const [savedOrders, setSavedOrders] = useState([]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustomerSection, setShowCustomerSection] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState({
    building_name: "",
    flat_villa_no: "",
    location: "",
  });
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [email, setEmail] = useState("");
  const [orderId, setOrderId] = useState(null);
  const navigate = useNavigate();
  const [bookedTables, setBookedTables] = useState([]);
  const [bookedChairs, setBookedChairs] = useState({});
  const [vatRate] = useState(0.10);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showISDCodeDropdown, setShowISDCodeDropdown] = useState(false);
  const [selectedISDCode, setSelectedISDCode] = useState("+91");
  const [warningMessage, setWarningMessage] = useState("");
  const [warningType, setWarningType] = useState("warning");
  const [pendingAction, setPendingAction] = useState(null);
  const [selectedCartItem, setSelectedCartItem] = useState(null);
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [startIndex, setStartIndex] = useState(0);
  const [totalChairs, setTotalChairs] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Added state for sidebar toggle

  const phoneNumberRef = useRef(null);
  const customerSectionRef = useRef(null);
  const reduxUser = useSelector((state) => state.user.user);
  const storedUser = JSON.parse(localStorage.getItem("user")) || { email: "Guest" };
  const user = reduxUser || storedUser;

  const isdCodes = [
    { code: "+91", country: "India" },
    { code: "+1", country: "USA" },
    { code: "+44", country: "UK" },
    { code: "+971", country: "UAE" },
    { code: "+61", country: "Australia" },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        customerSectionRef.current &&
        !customerSectionRef.current.contains(event.target) &&
        showCustomerSection
      ) {
        setShowCustomerSection(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCustomerSection]);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const options = { year: "numeric", month: "long", day: "numeric" };
      setCurrentDate(now.toLocaleDateString("en-US", options));
      setCurrentTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }));
    };
    updateDateTime();
    const intervalId = setInterval(updateDateTime, 60000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const fetchTableData = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/tables", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        const table = data.message.find((t) => t.table_number === tableNumber);
        if (table) setTotalChairs(table.number_of_chairs || 0);
      } catch (err) {
        setWarningMessage(`Error fetching table data: ${err.message}`);
        setWarningType("warning");
      }
    };
    if (tableNumber) fetchTableData();
  }, [tableNumber]);

  useEffect(() => {
    if (state) {
      setPhoneNumber(state.phoneNumber?.replace(/^\+\d+/, "") || existingOrder?.phoneNumber?.replace(/^\+\d+/, "") || "");
      setCustomerName(state.customerName || existingOrder?.customerName || "");
      const savedAddress = state.deliveryAddress || existingOrder?.deliveryAddress || {};
      setDeliveryAddress({
        building_name: savedAddress.building_name || "",
        flat_villa_no: savedAddress.flat_villa_no || "",
        location: savedAddress.location || "",
      });
      setWhatsappNumber(state.whatsappNumber || existingOrder?.whatsappNumber || "");
      setEmail(state.email || existingOrder?.email || "");
      setIsPhoneNumberSet(!!(state.phoneNumber || existingOrder?.phoneNumber));
      setCartItems(initialCartItems || existingOrder?.cartItems || []);
      setBillCartItems(initialCartItems || existingOrder?.cartItems || []);
      if (existingOrder) {
        setOrderId(existingOrder.orderId);
      }
    }
  }, [state, existingOrder, initialCartItems]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("savedOrders")) || [];
    setSavedOrders(saved);
    const booked = JSON.parse(localStorage.getItem("bookedTables")) || [];
    setBookedTables(booked);
    const chairs = JSON.parse(localStorage.getItem("bookedChairs")) || {};
    setBookedChairs(chairs);
  }, []);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/items");
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        if (Array.isArray(data)) {
          const formattedItems = data.map((item) => ({
            id: uuidv4(),
            name: item.item_name || "Unnamed Item",
            category: item.item_group ? item.item_group.toLowerCase() : "uncategorized",
            image: item.image || "/static/images/default-item.jpg",
            basePrice: item.price_list_rate || 0,
            offer_price: item.offer_price,
            offer_end_time: item.offer_end_time,
            size: item.size || { enabled: true, small_price: item.price_list_rate - 10, medium_price: item.price_list_rate, large_price: item.price_list_rate + 10 },
            cold: item.cold || { enabled: false, ice_preference: "without_ice", ice_price: 10 },
            spicy: item.spicy || { enabled: false, is_spicy: false, spicy_price: 20 },
            sugar: item.sugar || { enabled: false, level: "medium" },
            custom_variants: item.custom_variants || [],
            addons: item.addons?.map((addon) => ({
              name1: addon.name1,
              addon_image: addon.addon_image || "/static/images/default-addon-image.jpg",
              price: addon.addon_price || 0,
              size: addon.size || { enabled: true, small_price: addon.addon_price - 10, medium_price: addon.addon_price, large_price: addon.addon_price + 10 },
              spicy: addon.spicy || { enabled: false, is_spicy: false, spicy_price: 20 },
              kitchen: addon.kitchen || "Main Kitchen",
              custom_variants: addon.custom_variants || [],
            })) || [],
            combos: item.combos?.map((combo) => ({
              name1: combo.name1,
              combo_image: combo.combo_image || "/static/images/default-combo-image.jpg",
              price: combo.combo_price || 0,
              size: combo.size || { enabled: true, small_price: combo.combo_price - 10, medium_price: combo.combo_price, large_price: combo.combo_price + 10 },
              spicy: { enabled: false, is_spicy: false, spicy_price: 30 },
              kitchen: combo.kitchen || "Main Kitchen",
              custom_variants: combo.custom_variants || [],
            })) || [],
            kitchen: item.kitchen || "Main Kitchen",
            ingredients: item.ingredients || [],
          }));
          setMenuItems(formattedItems);
          setFilteredItems(formattedItems);
          const uniqueCategories = [...new Set(formattedItems.map((item) => item.category))];
          const filteredCategories = uniqueCategories.filter((category) => category && category !== "uncategorized");
          setCategories(["All Items", ...filteredCategories]);
        }
      } catch (error) {
        console.error("Error fetching items:", error);
        setWarningMessage("Failed to load menu items. Please try again.");
        setWarningType("warning");
      }
    };
    fetchItems();
  }, []);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/customers");
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        setCustomers(data);
        setFilteredCustomers(data);
      } catch (error) {
        console.error("Network error:", error);
        setWarningMessage("Failed to load customers. Please try again.");
        setWarningType("warning");
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredItems(menuItems);
      setSelectedCategory("All Items");
    } else {
      const filtered = menuItems.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredItems(filtered);
      setSelectedCategory("");
    }
  }, [searchQuery, menuItems]);

  const handleFilter = (category) => {
    setSearchQuery("");
    if (category === "All Items") {
      setFilteredItems(menuItems);
    } else {
      const filtered = menuItems.filter((item) => item.category.toLowerCase() === category.toLowerCase());
      setFilteredItems(filtered);
    }
    setSelectedCategory(category);
  };

  const handleItemClick = (item) => {
    const existingCartItem = cartItems.find((cartItem) => cartItem.item_name === item.name);
    setSelectedItem(item);
    setSelectedCartItem(existingCartItem || null);
  };

  const handleCartItemClick = (cartItem) => {
    const menuItem = menuItems.find((item) => item.name === cartItem.item_name || item.name === cartItem.name);
    if (menuItem) {
      setSelectedCartItem(cartItem);
      setSelectedItem(menuItem);
    }
  };

  const hasActiveOffer = (item) => {
    return (
      item &&
      item.offer_price !== undefined &&
      item.offer_end_time &&
      new Date(item.offer_end_time) > new Date()
    );
  };

  const calculateOfferSizePrice = (offerPrice, size) => {
    if (!offerPrice) return 0;
    switch (size) {
      case "S": return offerPrice - 10;
      case "M": return offerPrice;
      case "L": return offerPrice + 10;
      default: return offerPrice;
    }
  };

  const handleItemUpdate = (updatedItem) => {
    const menuItem = menuItems.find((item) => item.name === updatedItem.item_name);
    const hasSizeVariant = menuItem?.size?.enabled || false;
    const updatedSelectedSize = hasSizeVariant ? updatedItem.variants?.size?.selected : null;

    const existingItemIndex = cartItems.findIndex(
      (cartItem) =>
        cartItem.item_name === updatedItem.item_name &&
        (hasSizeVariant ? cartItem.selectedSize === updatedSelectedSize : cartItem.selectedSize === null)
    );

    const addonVariants = {};
    const addonImages = {};
    const addonPrices = {};
    const addonSizePrices = {};
    const addonSpicyPrices = {};
    const addonCustomVariantsDetails = updatedItem.addonCustomVariantsDetails || {};
    Object.keys(updatedItem.addonQuantities || {}).forEach((addonName) => {
      const addon = menuItem?.addons.find((a) => a.name1 === addonName);
      const addonBasePrice = addon?.price || updatedItem.addonPrices?.[addonName] || 0;
      const addonSize = updatedItem.addonVariants?.[addonName]?.size || "M";
      const addonSpicy = updatedItem.addonVariants?.[addonName]?.spicy || false;
      const addonSizePrice = addon?.size?.enabled
        ? addonSize === "S" ? addon.size.small_price || addonBasePrice - 10
        : addonSize === "L" ? addon.size.large_price || addonBasePrice + 10
        : addon.size.medium_price || addonBasePrice
        : addonBasePrice;
      const addonSpicyPrice = addonSpicy ? (updatedItem.addonVariants[addonName]?.spicy_price || 20) : 0;
      const customVariantsPrice = addonCustomVariantsDetails[addonName]
        ? Object.values(addonCustomVariantsDetails[addonName]).reduce((sum, variant) => sum + (variant.price || 0), 0)
        : 0;
      const totalAddonPrice = addonSizePrice + addonSpicyPrice + customVariantsPrice;
      addonVariants[addonName] = { size: addonSize, spicy: addonSpicy, kitchen: addon?.kitchen || "Main Kitchen" };
      addonImages[addonName] = addon?.addon_image || "/static/images/default-addon-image.jpg";
      addonPrices[addonName] = totalAddonPrice;
      addonSizePrices[addonName] = addonSizePrice;
      addonSpicyPrices[addonName] = addonSpicyPrice;
    });

    const comboVariants = {};
    const comboImages = {};
    const comboPrices = {};
    const comboSizePrices = {};
    const comboSpicyPrices = {};
    const comboCustomVariantsDetails = updatedItem.comboCustomVariantsDetails || {};
    Object.keys(updatedItem.comboQuantities || {}).forEach((comboName) => {
      const combo = menuItem?.combos.find((c) => c.name1 === comboName);
      const comboBasePrice = combo?.price || updatedItem.comboPrices?.[comboName] || 0;
      const comboSize = updatedItem.comboVariants?.[comboName]?.size || "M";
      const comboSpicy = updatedItem.comboVariants?.[comboName]?.spicy || false;
      const comboSizePrice = combo?.size?.enabled
        ? comboSize === "S" ? combo.size.small_price || comboBasePrice - 10
        : comboSize === "L" ? combo.size.large_price || comboBasePrice + 10
        : combo.size.medium_price || comboBasePrice
        : comboBasePrice;
      const comboSpicyPrice = comboSpicy ? (updatedItem.comboVariants[comboName]?.spicy_price || 30) : 0;
      const customVariantsPrice = comboCustomVariantsDetails[comboName]
        ? Object.values(comboCustomVariantsDetails[comboName]).reduce((sum, variant) => sum + (variant.price || 0), 0)
        : 0;
      const totalComboPrice = comboSizePrice + comboSpicyPrice + customVariantsPrice;
      comboVariants[comboName] = { size: comboSize, spicy: comboSpicy, kitchen: combo?.kitchen || "Main Kitchen" };
      comboImages[comboName] = combo?.combo_image || "/static/images/default-combo-image.jpg";
      comboPrices[comboName] = totalComboPrice;
      comboSizePrices[comboName] = comboSizePrice;
      comboSpicyPrices[comboName] = comboSpicyPrice;
    });

    const customVariantsDetails = {};
    const customVariantsQuantities = {};
    let customVariantsTotalPrice = 0;
    if (updatedItem.selectedCustomVariants && menuItem?.custom_variants) {
      menuItem.custom_variants.forEach((variant) => {
        if (variant.enabled) {
          variant.subheadings.forEach((sub) => {
            if (updatedItem.selectedCustomVariants[sub.name]) {
              customVariantsDetails[sub.name] = { name: sub.name, price: sub.price || 0, heading: variant.heading };
              customVariantsQuantities[sub.name] = updatedItem.customVariantsQuantities?.[sub.name] || 1;
              customVariantsTotalPrice += (sub.price || 0) * (updatedItem.customVariantsQuantities?.[sub.name] || 1);
            }
          });
        }
      });
    }

    const cartItem = {
      ...updatedItem,
      id: existingItemIndex !== -1 ? cartItems[existingItemIndex].id : uuidv4(),
      name: updatedItem.item_name || "Unnamed Item",
      item_name: updatedItem.item_name,
      quantity: updatedItem.quantity || 1,
      basePrice: updatedItem.basePrice || 0,
      icePrice: updatedItem.icePrice || 0,
      spicyPrice: updatedItem.spicyPrice || 0,
      totalPrice: updatedItem.totalPrice,
      addonQuantities: updatedItem.addonQuantities || {},
      addonVariants,
      addonPrices,
      addonSizePrices,
      addonSpicyPrices,
      addonImages,
      addonCustomVariantsDetails,
      comboQuantities: updatedItem.comboQuantities || {},
      comboVariants,
      comboPrices,
      comboSizePrices,
      comboSpicyPrices,
      comboImages,
      comboCustomVariantsDetails,
      selectedCombos: updatedItem.selectedCombos || [],
      selectedSize: updatedSelectedSize,
      icePreference: updatedItem.variants?.cold?.icePreference || "without_ice",
      isSpicy: updatedItem.variants?.spicy?.isSpicy || false,
      kitchen: updatedItem.kitchen || "Main Kitchen",
      ingredients: updatedItem.ingredients || [],
      selectedCustomVariants: updatedItem.selectedCustomVariants || {},
      customVariantsDetails,
      customVariantsQuantities,
      status: "Pending",
      image: menuItem?.image || "/static/images/default-item.jpg",
    };

    if (existingItemIndex !== -1) {
      setCartItems((prevItems) => {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = cartItem;
        return updatedItems;
      });
      setBillCartItems((prevItems) => {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = cartItem;
        return updatedItems;
      });
    } else {
      setCartItems((prevItems) => [...prevItems, cartItem]);
      setBillCartItems((prevItems) => [...prevItems, cartItem]);
    }

    setSelectedItem(null);
    setSelectedCartItem(null);
  };

  const handleQuantityChange = (itemId, value, type, name) => {
    const newQty = Math.max(1, parseInt(value) || 1);
    const updateItems = (prevItems) =>
      prevItems.map((cartItem) => {
        if (cartItem.id === itemId) {
          let updatedItem = { ...cartItem };
          if (type === "item") {
            const customVariantsTotalPrice = Object.entries(updatedItem.customVariantsDetails || {}).reduce(
              (sum, [variantName, variant]) => sum + (variant.price || 0) * (updatedItem.customVariantsQuantities?.[variantName] || 1),
              0
            );
            updatedItem = {
              ...updatedItem,
              quantity: newQty,
              totalPrice: (updatedItem.basePrice + updatedItem.icePrice + updatedItem.spicyPrice + customVariantsTotalPrice) * newQty,
            };
          } else if (type === "addon" && name) {
            updatedItem = {
              ...updatedItem,
              addonQuantities: { ...updatedItem.addonQuantities, [name]: newQty },
            };
          } else if (type === "combo" && name) {
            updatedItem = {
              ...updatedItem,
              comboQuantities: { ...updatedItem.comboQuantities, [name]: newQty },
            };
          } else if (type === "customVariant" && name) {
            const customVariantsTotalPrice = Object.entries(updatedItem.customVariantsDetails || {}).reduce(
              (sum, [variantName, variant]) => sum + (variant.price || 0) * (variantName === name ? newQty : updatedItem.customVariantsQuantities?.[variantName] || 1),
              0
            );
            updatedItem = {
              ...updatedItem,
              customVariantsQuantities: { ...updatedItem.customVariantsQuantities, [name]: newQty },
              totalPrice: (updatedItem.basePrice + updatedItem.icePrice + updatedItem.spicyPrice + customVariantsTotalPrice) * updatedItem.quantity,
            };
          }
          return updatedItem;
        }
        return cartItem;
      });

    setCartItems(updateItems);
    setBillCartItems(updateItems);
  };

  const getAddonsTotal = (item) => {
    if (!item.addonQuantities || !item.addonPrices) return 0;
    return Object.entries(item.addonQuantities).reduce((sum, [addonName, qty]) => {
      const price = item.addonPrices[addonName] || 0;
      return sum + price * qty;
    }, 0);
  };

  const getCombosTotal = (item) => {
    if (!item.comboQuantities || !item.comboPrices) return 0;
    return Object.entries(item.comboQuantities).reduce((sum, [comboName, qty]) => {
      const price = item.comboPrices[comboName] || 0;
      return sum + price * qty;
    }, 0);
  };

  const getCustomVariantsTotal = (item) => {
    if (!item.customVariantsDetails || !item.customVariantsQuantities) return 0;
    return Object.entries(item.customVariantsDetails).reduce((sum, [variantName, variant]) => {
      const qty = item.customVariantsQuantities[variantName] || 1;
      return sum + (variant.price || 0) * qty;
    }, 0);
  };

  const getMainItemTotal = (item) => {
    const mainItemPrice = item.basePrice + item.icePrice + item.spicyPrice + getCustomVariantsTotal(item);
    return mainItemPrice * item.quantity;
  };

  const removeFromCart = (item) => {
    setCartItems((prevItems) => prevItems.filter((cartItem) => cartItem.id !== item.id));
    setBillCartItems((prevItems) => prevItems.filter((cartItem) => cartItem.id !== item.id));
  };

  const removeAddonOrCombo = (itemId, type, name) => {
    const updateItems = (prevItems) =>
      prevItems.map((cartItem) => {
        if (cartItem.id === itemId) {
          let updatedItem = { ...cartItem };
          if (type === "addon") {
            const { [name]: _, ...remainingAddons } = updatedItem.addonQuantities || {};
            const { [name]: __, ...remainingAddonVariants } = updatedItem.addonVariants || {};
            const { [name]: ___, ...remainingAddonPrices } = updatedItem.addonPrices || {};
            const { [name]: ____, ...remainingAddonImages } = updatedItem.addonImages || {};
            const { [name]: _____, ...remainingAddonSizePrices } = updatedItem.addonSizePrices || {};
            const { [name]: ______, ...remainingAddonSpicyPrices } = updatedItem.addonSpicyPrices || {};
            updatedItem = {
              ...updatedItem,
              addonQuantities: remainingAddons,
              addonVariants: remainingAddonVariants,
              addonPrices: remainingAddonPrices,
              addonSizePrices: remainingAddonSizePrices,
              addonSpicyPrices: remainingAddonSpicyPrices,
              addonImages: remainingAddonImages,
              addonCustomVariantsDetails: { ...updatedItem.addonCustomVariantsDetails, [name]: {} },
            };
          } else if (type === "combo") {
            const { [name]: _, ...remainingCombos } = updatedItem.comboQuantities || {};
            const { [name]: __, ...remainingComboVariants } = updatedItem.comboVariants || {};
            const { [name]: ___, ...remainingComboPrices } = updatedItem.comboPrices || {};
            const { [name]: ____, ...remainingComboImages } = updatedItem.comboImages || {};
            const { [name]: _____, ...remainingComboSizePrices } = updatedItem.comboSizePrices || {};
            const { [name]: ______, ...remainingComboSpicyPrices } = updatedItem.comboSpicyPrices || {};
            updatedItem = {
              ...updatedItem,
              comboQuantities: remainingCombos,
              comboVariants: remainingComboVariants,
              comboPrices: remainingComboPrices,
              comboSizePrices: remainingComboSizePrices,
              comboSpicyPrices: remainingComboSpicyPrices,
              comboImages: remainingComboImages,
              selectedCombos: updatedItem.selectedCombos.filter((combo) => combo.name1 !== name),
              comboCustomVariantsDetails: { ...updatedItem.comboCustomVariantsDetails, [name]: {} },
            };
          }
          return updatedItem;
        }
        return cartItem;
      });

    setCartItems(updateItems);
    setBillCartItems(updateItems);
  };

  const removeCustomVariant = (itemId, variantName) => {
    const updateItems = (prevItems) =>
      prevItems.map((cartItem) => {
        if (cartItem.id === itemId) {
          const { [variantName]: _, ...remainingCustomVariants } = cartItem.selectedCustomVariants || {};
          const { [variantName]: __, ...remainingCustomVariantsDetails } = cartItem.customVariantsDetails || {};
          const { [variantName]: ___, ...remainingCustomVariantsQuantities } = cartItem.customVariantsQuantities || {};
          const customVariantsTotalPrice = Object.values(remainingCustomVariantsDetails).reduce((sum, variant) => sum + (variant.price || 0), 0);
          return {
            ...cartItem,
            selectedCustomVariants: remainingCustomVariants,
            customVariantsDetails: remainingCustomVariantsDetails,
            customVariantsQuantities: remainingCustomVariantsQuantities,
            totalPrice: (cartItem.basePrice + cartItem.icePrice + cartItem.spicyPrice + customVariantsTotalPrice) * cartItem.quantity,
          };
        }
        return cartItem;
      });

    setCartItems(updateItems);
    setBillCartItems(updateItems);
  };

  const handleWarningOk = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setWarningMessage("");
    setWarningType("warning");
  };

  const calculateSubtotal = (items) => {
    return items.reduce((sum, item) => {
      const mainItemPrice = item.basePrice + item.icePrice + item.spicyPrice + getCustomVariantsTotal(item);
      const mainItemTotal = mainItemPrice * item.quantity;
      const addonsTotal = getAddonsTotal(item);
      const combosTotal = getCombosTotal(item);
      return sum + mainItemTotal + addonsTotal + combosTotal;
    }, 0);
  };

  const handlePaymentSelection = async (method) => {
    if (billCartItems.length === 0) {
      setWarningMessage("Cart is empty. Please add items before proceeding.");
      setWarningType("warning");
      return;
    }

    const subtotal = calculateSubtotal(billCartItems);
    const paymentDetails = {
      mode_of_payment: method,
      amount: Number(subtotal.toFixed(2)),
    };

    const billDetails = {
      customerName: customerName || "N/A",
      phoneNumber: phoneNumber ? `${selectedISDCode}${phoneNumber}` : "N/A",
      tableNumber: tableNumber || "N/A",
      chairsBooked: chairsBooked,
      deliveryAddress: deliveryAddress,
      whatsappNumber: whatsappNumber || "N/A",
      email: email || "N/A",
      items: billCartItems.map((item) => ({
        item_name: item.item_name || item.name,
        basePrice: item.basePrice,
        icePreference: item.icePreference,
        icePrice: item.icePrice,
        isSpicy: item.isSpicy,
        spicyPrice: item.spicyPrice,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
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
        kitchen: item.kitchen,
        selectedSize: item.selectedSize || null,
        ingredients: item.ingredients || [],
        selectedCustomVariants: item.selectedCustomVariants || {},
        customVariantsDetails: item.customVariantsDetails || {},
        customVariantsQuantities: item.customVariantsQuantities || {},
        image: item.image || "/static/images/default-item.jpg",
      })),
      totalAmount: Number(subtotal.toFixed(2)),
      payments: [paymentDetails],
      invoice_no: `INV-${Date.now()}`, // Temporary invoice_no, will be updated
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    try {
      const savedSale = await handleSaveToBackend(paymentDetails);
      if (savedSale) {
        billDetails.invoice_no = savedSale.invoice_no; // Update with backend-generated invoice_no
      }

      if (orderId) {
        try {
          await axios.delete(`http://localhost:5000/api/activeorders/${orderId}`);
          console.log("Order deleted successfully from activeorders");
        } catch (error) {
          console.error("Error deleting order:", error);
        }
      }

      if (orderType === "Takeaway") {
        setWarningMessage("Payment completed. Takeaway order processed successfully!");
        setWarningType("success");
        setPendingAction(() => () => {
          setCartItems([]);
          setBillCartItems([]);
          setShowPaymentModal(false);
          setOrderId(null);
        });
      } else if (method === "CASH") {
        setWarningMessage("Payment completed. Redirecting to cash payment page...");
        setWarningType("success");
        setPendingAction(() => () => {
          navigate("/cash", { state: { billDetails } });
          handlePaymentCompletion(tableNumber, chairsBooked);
          setOrderId(null);
        });
      } else if (method === "CARD") {
        setWarningMessage("Payment completed. Redirecting to card payment page...");
        setWarningType("success");
        setPendingAction(() => () => {
          navigate("/card", { state: { billDetails } });
          handlePaymentCompletion(tableNumber, chairsBooked);
          setOrderId(null);
        });
      } else if (method === "UPI") {
        setWarningMessage("Redirecting to UPI payment... Please complete the payment in your UPI app.");
        setWarningType("warning");
        setPendingAction(() => () => {
          handlePaymentCompletion(tableNumber, chairsBooked);
          setOrderId(null);
        });
      }
      setShowPaymentModal(false);
    } catch (error) {
      console.error("Error processing payment:", error);
      setWarningMessage("Failed to process payment. Please try again.");
      setWarningType("warning");
    }
  };

  const handlePaymentCompletion = (tableNumber, chairsBooked) => {
    const updatedOrders = savedOrders.filter(
      (order) =>
        !(
          order.tableNumber === tableNumber &&
          order.chairsBooked.some((chair) => chairsBooked.includes(chair))
        )
    );
    setSavedOrders(updatedOrders);
    localStorage.setItem("savedOrders", JSON.stringify(updatedOrders));

    const updatedChairs = { ...bookedChairs };
    if (updatedChairs[tableNumber]) {
      updatedChairs[tableNumber] = updatedChairs[tableNumber].filter((chair) => !chairsBooked.includes(chair));
      if (updatedChairs[tableNumber].length === 0) {
        delete updatedChairs[tableNumber];
        const updatedBookedTables = bookedTables.filter((table) => table !== tableNumber);
        setBookedTables(updatedBookedTables);
        localStorage.setItem("bookedTables", JSON.stringify(updatedBookedTables));
      }
    }
    setBookedChairs(updatedChairs);
    localStorage.setItem("bookedChairs", JSON.stringify(updatedChairs));

    const reservations = JSON.parse(localStorage.getItem("reservations")) || [];
    const verifiedReservations = JSON.parse(localStorage.getItem("verifiedReservations")) || [];
    const updatedReservations = reservations.filter(
      (res) => !(res.tableNumber === tableNumber && res.chairs.some((chair) => chairsBooked.includes(chair)))
    );
    const updatedVerifiedReservations = verifiedReservations.filter((vr) => {
      const res = reservations.find((r) => r.id === vr.reservationId);
      return res && updatedReservations.includes(res);
    });
    localStorage.setItem("reservations", JSON.stringify(updatedReservations));
    localStorage.setItem("verifiedReservations", JSON.stringify(updatedVerifiedReservations));

    setCartItems([]);
    setBillCartItems([]);
    setWarningMessage(`Payment for Table ${tableNumber}, Chairs ${chairsBooked.join(", ")} completed. Chairs are now available.`);
    setWarningType("success");
    setPendingAction(() => () => navigate("/table"));
  };

  const handleSaveToBackend = async (paymentDetails) => {
    if (billCartItems.length === 0) {
      setWarningMessage("Cart is empty. Please add items before saving.");
      setWarningType("warning");
      throw new Error("Cart is empty");
    }

    const validItems = billCartItems.filter((item) => item.quantity > 0);
    if (validItems.length !== billCartItems.length) {
      setWarningMessage("All items must have a quantity greater than zero.");
      setWarningType("warning");
      throw new Error("Invalid item quantities");
    }

    const subtotal = calculateSubtotal(billCartItems);
    const payload = {
      customer: customerName.trim() || "N/A",
      phoneNumber: phoneNumber ? `${selectedISDCode}${phoneNumber}` : "N/A",
      tableNumber: tableNumber || "N/A",
      chairsBooked: chairsBooked,
      deliveryAddress: deliveryAddress,
      whatsappNumber: whatsappNumber || "N/A",
      email: email || "N/A",
      items: validItems.map((item) => ({
        item_name: item.item_name || item.name,
        basePrice: item.basePrice,
        icePreference: item.icePreference,
        ice_price: item.icePrice,
        isSpicy: item.isSpicy,
        spicy_price: item.spicyPrice,
        quantity: Number(item.quantity) || 1,
        amount: Number(item.totalPrice.toFixed(2)),
        addons: Object.entries(item.addonQuantities || {}).map(([addonName, qty]) => ({
          name1: addonName,
          addon_image: item.addonImages[addonName] || "/static/images/default-addon-image.jpg",
          addon_price: Number(item.addonPrices?.[addonName] || item.addonVariants[addonName]?.price || 0),
          addon_quantity: Number(qty),
          size: item.addonVariants?.[addonName]?.size || "M",
          isSpicy: item.addonVariants?.[addonName]?.spicy || false,
          kitchen: item.addonVariants?.[addonName]?.kitchen || "Main Kitchen",
          custom_variants: item.addonCustomVariantsDetails?.[addonName] || {},
        })),
        selectedCombos: Object.entries(item.comboQuantities || {}).map(([comboName, qty]) => ({
          name1: comboName,
          combo_image: item.comboImages[comboName] || "/static/images/default-combo-image.jpg",
          combo_price: Number(item.comboPrices?.[comboName] || item.comboVariants[comboName]?.price || 0),
          size: item.comboVariants?.[comboName]?.size || "M",
          isSpicy: item.comboVariants?.[comboName]?.spicy || false,
          combo_quantity: Number(qty),
          kitchen: item.comboVariants?.[comboName]?.kitchen || "Main Kitchen",
          custom_variants: item.comboCustomVariantsDetails?.[comboName] || {},
        })),
        kitchen: item.kitchen || "Main Kitchen",
        selectedSize: item.selectedSize || null,
        ingredients: item.ingredients || [],
        selectedCustomVariants: item.selectedCustomVariants || {},
        customVariantsDetails: item.customVariantsDetails || {},
        customVariantsQuantities: item.customVariantsQuantities || {},
        image: item.image || "/static/images/default-item.jpg",
      })),
      total: Number(subtotal.toFixed(2)),
      payment_terms: [{ due_date: new Date().toISOString().split("T")[0], payment_terms: "Immediate" }],
      payments: [paymentDetails],
      orderType: orderType || "Dine In",
    };

    try {
      const response = await fetch("http://localhost:5000/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save sale");

      console.log("Sale saved successfully:", result);
      setWarningMessage(`Sale saved successfully! Invoice No: ${result.invoice_no}`);
      setWarningType("success");
      setPendingAction(() => () => {
        setCartItems([]);
        setBillCartItems([]);
      });
      return result; // Return the result containing invoice_no
    } catch (error) {
      console.error("Error saving to backend:", error.message);
      setWarningMessage(`Failed to save sale: ${error.message}`);
      setWarningType("warning");
      throw error;
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === " " || e.keyCode === 32) {
      e.preventDefault();
    }
  };

  const handleCreateCustomer = async () => {
    if (orderType !== "Dine In" && (!customerName.trim() || !phoneNumber)) {
      setWarningMessage("Customer name and phone number are required for non-Dine In orders.");
      setWarningType("warning");
      return;
    }

    if (orderType !== "Dine In" && phoneNumber.length !== 10) {
      setWarningMessage("Phone number must be 10 digits for non-Dine In orders.");
      setWarningType("warning");
      return;
    }

    try {
      const customerData = {
        customer_name: customerName.trim(),
        phone_number: `${selectedISDCode}${phoneNumber}`,
        building_name: deliveryAddress.building_name || "",
        flat_villa_no: deliveryAddress.flat_villa_no || "",
        location: deliveryAddress.location || "",
        whatsapp_number: whatsappNumber || "",
        email: email || "",
      };

      const response = await fetch("http://localhost:5000/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerData),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          setWarningMessage(`Phone number ${phoneNumber} already exists for customer ${data.customer_name}`);
          setWarningType("warning");
          return;
        }
        throw new Error(data.error || "Failed to create customer");
      }

      setCustomers((prev) => [...prev, { ...customerData, _id: data.id }]);
      setFilteredCustomers((prev) => [...prev, { ...customerData, _id: data.id }]);
      setShowCustomerSection(false);
      setWarningMessage("Customer created successfully!");
      setWarningType("success");
      setPendingAction(() => () => {
        setIsPhoneNumberSet(true);
        phoneNumberRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    } catch (error) {
      console.error("Error creating customer:", error);
      setWarningMessage("Failed to create customer: " + error.message);
      setWarningType("warning");
    }
  };

  const handleCustomerNameChange = (e) => {
    const value = e.target.value;
    setCustomerName(value);
    if (value.trim() === "") {
      setFilteredCustomers(customers);
      setPhoneNumber("");
      setDeliveryAddress({ building_name: "", flat_villa_no: "", location: "" });
      setWhatsappNumber("");
      setEmail("");
      setIsPhoneNumberSet(false);
    } else {
      const filtered = customers.filter((customer) =>
        customer.customer_name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  };

  const handlePhoneNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 10) {
      setPhoneNumber(value);
      if (value.length === 0) {
        setCustomerName("");
        setDeliveryAddress({ building_name: "", flat_villa_no: "", location: "" });
        setWhatsappNumber("");
        setEmail("");
        setIsPhoneNumberSet(false);
      } else if (value.length === 10) {
        const existingCustomer = customers.find((c) => c.phone_number === `${selectedISDCode}${value}`);
        if (existingCustomer) {
          setCustomerName(existingCustomer.customer_name);
          setDeliveryAddress({
            building_name: existingCustomer.building_name || "",
            flat_villa_no: existingCustomer.flat_villa_no || "",
            location: existingCustomer.location || "",
          });
          setWhatsappNumber(existingCustomer.whatsapp_number || "");
          setEmail(existingCustomer.email || "");
          setIsPhoneNumberSet(true);
        } else {
          setIsPhoneNumberSet(false);
        }
      }
    }
  };

  const handleISDCodeSelect = (code) => {
    setSelectedISDCode(code);
    setShowISDCodeDropdown(false);
  };

  const handleCustomerSelect = (customer) => {
    setCustomerName(customer.customer_name);
    const fullPhone = customer.phone_number || "";
    const code = isdCodes.find((isd) => fullPhone.startsWith(isd.code))?.code || "+91";
    setSelectedISDCode(code);
    setPhoneNumber(fullPhone.replace(code, ""));
    setDeliveryAddress({
      building_name: customer.building_name || "",
      flat_villa_no: customer.flat_villa_no || "",
      location: customer.location || "",
    });
    setWhatsappNumber(customer.whatsapp_number || "");
    setEmail(customer.email || "");
    setShowCustomerSection(false);
    setIsPhoneNumberSet(true);
  };

  const handleCustomerSubmit = () => {
    if (orderType === "Dine In") {
      setIsPhoneNumberSet(true);
      return;
    }

    if (customerName.trim() && phoneNumber.length === 10) {
      const existingCustomer = customers.find((c) => c.phone_number === `${selectedISDCode}${phoneNumber}`);
      if (existingCustomer) {
        handleCustomerSelect(existingCustomer);
      } else {
        handleCreateCustomer();
      }
    } else if (!phoneNumber) {
      setWarningMessage("Please enter a phone number");
      setWarningType("warning");
    } else if (phoneNumber.length !== 10) {
      setWarningMessage("Phone number must be 10 digits");
      setWarningType("warning");
    }
  };

  const saveOrder = async () => {
    if (cartItems.length === 0) {
      setWarningMessage("Cart is empty. Please add items before saving.");
      setWarningType("warning");
      return;
    }

    let currentOrderId = orderId || uuidv4();
    if (!orderId) {
      setOrderId(currentOrderId);
    }

    const newOrder = {
      orderId: currentOrderId,
      customerName: customerName || "N/A",
      tableNumber: tableNumber || "N/A",
      chairsBooked: Array.isArray(chairsBooked) ? chairsBooked : [],
      phoneNumber: phoneNumber ? `${selectedISDCode}${phoneNumber}` : "N/A",
      deliveryAddress: deliveryAddress || { building_name: "", flat_villa_no: "", location: "" },
      whatsappNumber: whatsappNumber || "N/A",
      email: email || "N/A",
      cartItems: cartItems.map((item) => ({
        id: item.id || uuidv4(),
        item_name: item.item_name || item.name,
        name: item.name || item.item_name,
        image: item.image || "/static/images/default-item.jpg",
        quantity: Number(item.quantity) || 1,
        basePrice: Number(item.basePrice) || 0,
        icePreference: item.icePreference || "without_ice",
        icePrice: Number(item.icePrice) || 0,
        isSpicy: item.isSpicy || false,
        spicyPrice: Number(item.spicyPrice) || 0,
        totalPrice: Number(item.totalPrice) || item.basePrice * (item.quantity || 1),
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
        selectedSize: item.selectedSize || null,
        kitchen: item.kitchen || "Main Kitchen",
        ingredients: item.ingredients || [],
        selectedCustomVariants: item.selectedCustomVariants || {},
        customVariantsDetails: item.customVariantsDetails || {},
        customVariantsQuantities: item.customVariantsQuantities || {},
        status: item.status || "Pending",
      })),
      timestamp: new Date().toISOString(),
      orderType: orderType || "Dine In",
      status: "Pending",
    };

    try {
      const kitchenResponse = await axios.post("http://localhost:5000/api/kitchen-saved", newOrder);
      if (!kitchenResponse.data.success) {
        console.error("Failed to send order to kitchen:", kitchenResponse.data.error);
        setWarningMessage("Failed to notify kitchen.");
        setWarningType("warning");
        return;
      }
      console.log("Order sent to kitchen:", kitchenResponse.data.order_id);

      if (orderId) {
        const response = await axios.put(`http://localhost:5000/api/activeorders/${orderId}`, newOrder);
        if (response.status === 200) {
          console.log("Order updated successfully");
          setWarningMessage("Order updated successfully!");
          setWarningType("success");
        } else {
          setWarningMessage("Failed to update order.");
          setWarningType("warning");
          return;
        }
      } else {
        const response = await axios.post("http://localhost:5000/api/activeorders", newOrder);
        if (response.status === 201) {
          console.log("Order saved successfully");
          setWarningMessage("Order saved successfully!");
          setWarningType("success");
          setOrderId(response.data.orderId);
        } else {
          setWarningMessage("Failed to save order.");
          setWarningType("warning");
          return;
        }
      }

      const updatedOrders = [
        ...savedOrders.filter(
          (order) =>
            !(
              order.tableNumber === tableNumber &&
              order.chairsBooked.some((chair) => chairsBooked.includes(chair))
            )
        ),
        { ...newOrder, orderId: currentOrderId },
      ];
      setSavedOrders(updatedOrders);
      localStorage.setItem("savedOrders", JSON.stringify(updatedOrders));

      if (orderType === "Dine In") {
        const updatedBookedTables = [...new Set([...bookedTables, tableNumber])];
        setBookedTables(updatedBookedTables);
        localStorage.setItem("bookedTables", JSON.stringify(updatedBookedTables));

        const updatedBookedChairs = { ...bookedChairs };
        updatedBookedChairs[tableNumber] = [
          ...new Set([...(updatedBookedChairs[tableNumber] || []), ...chairsBooked]),
        ];
        setBookedChairs(updatedBookedChairs);
        localStorage.setItem("bookedChairs", JSON.stringify(updatedBookedChairs));
      }

      setPendingAction(() => () => {
        setCartItems([]);
        setBillCartItems([]);
        if (orderType === "Dine In") {
          navigate("/table");
        }
      });
    } catch (error) {
      console.error("Error saving order:", error.response?.data?.error || error.message);
      setWarningMessage(error.response?.data?.error || "Failed to save order.");
      setWarningType("warning");
    }
  };

  const handleDeliveryAddressChange = (field, value) => {
    setDeliveryAddress((prev) => ({ ...prev, [field]: value.trimStart() }));
  };

  const handleWhatsappNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 10) setWhatsappNumber(value);
  };

  const handleSetPhoneNumber = () => {
    if (orderType === "Dine In") {
      setIsPhoneNumberSet(true);
      return;
    }

    if (phoneNumber.length !== 10) {
      setWarningMessage("Please enter a valid 10-digit phone number.");
      setWarningType("warning");
      return;
    }
    handleCustomerSubmit();
  };

  const cancelCart = () => {
    setCartItems([]);
    setBillCartItems([]);
    setWarningMessage("Cart cleared successfully.");
    setWarningType("success");
  };

  const handleActiveOrdersClick = () => {
    navigate("/active-orders");
  };

  const handleNext = () => {
    setStartIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    setStartIndex((prev) => Math.max(0, prev - 1));
  };

  const handleSalesReportNavigation = () => {
    navigate("/sales-reports");
  };

  const handleClosingEntryNavigation = () => {
    navigate("/closing-entry");
  };

  const handleLogout = () => {
    setWarningMessage("Logout Successful!");
    setWarningType("success");
    setPendingAction(() => () => {
      localStorage.removeItem("user");
      navigate("/");
    });
  };

  const totalBookedChairs = bookedChairs[tableNumber]?.length || 0;
  const availableChairs = totalChairs - totalBookedChairs;
  const subtotal = calculateSubtotal(cartItems);
  const vat = subtotal * vatRate;
  const total = subtotal + vat;
  const showKitchenColumn = orderType === "Dine In";
  const visibleCategories = categories.slice(startIndex, startIndex + 5);

  return (
    <div className="frontpage-container">
      <div className={`frontpage-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        {isSidebarOpen && (
          <div className="frontpage-sidebar-close" onClick={() => setIsSidebarOpen(false)}>
            <i className="bi bi-x"></i>
          </div>
        )}
        <ul className="navbar-nav mx-auto mb-2 mb-lg-0 d-flex justify-content-center flex-column align-items-center h-100">
          <li className="nav-item">
            <a
              className={`nav-link ${location.pathname === "/frontpage" ? "active text-primary" : "text-black"} cursor-pointer`}
              onClick={() => navigate("/frontpage")}
              title="Home"
            >
              <img src="/menuIcons/home.svg" alt="Home" className="icon-size" />
            </a>
          </li>
          <li className="nav-item">
            <a
              className={`nav-link ${location.pathname === "/home" ? "active text-primary" : "text-black"} cursor-pointer`}
              onClick={() => navigate("/home")}
              title="Type Of Delivery"
            >
              <img src="/menuIcons/delivery.svg" alt="Delivery" className="icon-size" />
            </a>
          </li>
          <li className="nav-item">
            <a
              className={`nav-link ${location.pathname === "/table" ? "active text-primary" : "text-black"} cursor-pointer`}
              onClick={() => navigate("/table")}
              title="Table"
            >
              <img src="/menuIcons/table1.svg" alt="Table" className="icon-size" />
            </a>
          </li>
          <li className="nav-item">
            <a
              className={`nav-link ${location.pathname === "/kitchen" ? "active text-primary" : "text-black"} cursor-pointer`}
              onClick={() => navigate("/kitchen")}
              title="Kitchen"
            >
              <img src="/menuIcons/kitchen.svg" alt="Kitchen" className="icon-size" />
            </a>
          </li>
          <li className="nav-item">
            <a
              className={`nav-link ${location.pathname === "/salespage" ? "active text-primary" : "text-black"} cursor-pointer`}
              onClick={() => navigate("/salespage")}
              title="Sales Invoice"
            >
              <img src="/menuIcons/save.svg" alt="Save" className="icon-size" />
            </a>
          </li>
          <li className="nav-item">
            <a
              className={`nav-link ${location.pathname === "/sales-reports" ? "active text-primary" : "text-black"} cursor-pointer`}
              onClick={handleSalesReportNavigation}
              title="Sales Report"
            >
              <img src="/menuIcons/salesreport.svg" alt="Sales Report" className="icon-size" />
            </a>
          </li>
          <li className="nav-item">
            <a
              className={`nav-link ${location.pathname === "/closing-entry" ? "active text-primary" : "text-black"} cursor-pointer`}
              onClick={handleClosingEntryNavigation}
              title="Closing Entry"
            >
              <img src="/menuIcons/closingentry.svg" alt="Closing Entry" className="icon-size" />
            </a>
          </li>
          <li className="nav-item mt-auto">
            <a className="nav-link text-black cursor-pointer" onClick={handleLogout} title="Logout">
              <img src="/menuIcons/poweroff.svg" alt="Logout" className="icon-size" />
            </a>
          </li>
        </ul>
      </div>
      {isSidebarOpen && (
        <div className="frontpage-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      <div className="frontpage-main-content">
        <div className="frontpage-header">
          <div className="frontpage-hamburger" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <i className="bi bi-list"></i>
          </div>
          <h2>Restaurant POS</h2>
          <div className="frontpage-user-info">
            <div className="frontpage-date-time">
              <div className="frontpage-date-time-row">
                <i className="bi bi-calendar-event"></i>
                <span>{currentDate}</span>
              </div>
              <div>{currentTime}</div>
            </div>
            <div className="frontpage-user-profile">
              <span>{user.email}</span>
              <div className="frontpage-user-avatar">
                <i className="bi bi-person"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="frontpage-category-search-section">
          <div className="frontpage-category-nav">
            <button className="frontpage-nav-arrow" onClick={handlePrev} disabled={startIndex === 0}>
              <i className="bi bi-chevron-left"></i>
            </button>
            <div className="frontpage-categories-container">
              {visibleCategories.map((category) => (
                <button
                  key={category}
                  className={`frontpage-category-btn ${selectedCategory === category ? "active" : ""}`}
                  onClick={() => handleFilter(category)}
                >
                  {category}
                </button>
              ))}
            </div>
            <button className="frontpage-nav-arrow" onClick={handleNext} disabled={startIndex + 5 >= categories.length}>
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
          <div className="frontpage-search-container">
            <i className="bi bi-search frontpage-search-icon"></i>
            <input
              type="text"
              className="frontpage-search-input"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="frontpage-menu-section">
          <div className="frontpage-menu-grid">
            {filteredItems.map((item) => (
              <div key={item.id} className="frontpage-menu-card" onClick={() => handleItemClick(item)}>
                <img src={item.image} alt={item.name} className="frontpage-menu-card-image" />
                <div className="frontpage-menu-card-content">
                  <h5 className="frontpage-menu-card-name">{item.name}</h5>
                  <p className="frontpage-menu-card-price">₹{(hasActiveOffer(item) ? item.offer_price : item.basePrice).toFixed(2)}</p>
                  {hasActiveOffer(item) && <span className="frontpage-offer-badge">Offer</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="frontpage-billing-section">
        <div className="frontpage-billing-tabs">
          <button className={`frontpage-billing-tab ${location.pathname === "/active-orders" ? "active" : ""}`} onClick={handleActiveOrdersClick}>
            Active Orders
          </button>
          <button className={`frontpage-billing-tab ${showCustomerSection ? "active" : ""}`} onClick={() => setShowCustomerSection(true)}>
            Customers
          </button>
        </div>

        {showCustomerSection && (
          <div className="frontpage-customer-info" ref={customerSectionRef}>
            {tableNumber && (
              <>
                <h4 className="frontpage-order-header">Order for Table {tableNumber}, Chairs {chairsBooked.join(", ")}</h4>
                <div className="frontpage-chairs-container">
                  {totalChairs > 0 ? (
                    <>
                      {Array.from({ length: totalBookedChairs }).map((_, index) => (
                        <i key={`booked-${index}`} className="fa-solid fa-chair frontpage-chair-icon frontpage-booked-chair"></i>
                      ))}
                      {Array.from({ length: availableChairs }).map((_, index) => (
                        <i key={`available-${index}`} className="fa-solid fa-chair frontpage-chair-icon frontpage-available-chair"></i>
                      ))}
                    </>
                  ) : (
                    <span>No chairs</span>
                  )}
                </div>
                <div className="frontpage-chair-status">
                  {totalChairs > 0 && (
                    <span>{totalBookedChairs} booked, {availableChairs} available</span>
                  )}
                </div>
              </>
            )}
            <div className="frontpage-input-group">
              <input
                type="text"
                className="frontpage-customer-input"
                placeholder="Enter Customer Name"
                value={customerName}
                onChange={handleCustomerNameChange}
                onKeyPress={(e) => orderType !== "Dine In" && e.key === "Enter" && handleCustomerSubmit()}
              />
              {filteredCustomers.length > 0 && customerName.trim() && (
                <ul className="frontpage-customer-suggestions">
                  {filteredCustomers.map((customer, index) => (
                    <li key={index} onClick={() => handleCustomerSelect(customer)}>
                      {customer.customer_name} ({customer.phone_number})
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="frontpage-phone-input-group">
              <div className="frontpage-phone-prefix">
                <button className="frontpage-isd-button" onClick={() => setShowISDCodeDropdown(!showISDCodeDropdown)}>
                  {selectedISDCode} <i className="bi bi-chevron-down"></i>
                </button>
                {showISDCodeDropdown && (
                  <ul className="frontpage-isd-code-dropdown">
                    {isdCodes.map((isd, index) => (
                      <li key={index} onClick={() => handleISDCodeSelect(isd.code)}>
                        {isd.code} ({isd.country})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <input
                ref={phoneNumberRef}
                type="text"
                className="frontpage-phone-input"
                placeholder="Enter Phone Number"
                value={phoneNumber}
                onChange={handlePhoneNumberChange}
              />
            </div>
            {orderType !== "Dine In" && (
              <>
                <input
                  type="text"
                  className="frontpage-customer-input"
                  placeholder="Enter Flat/Villa No"
                  value={deliveryAddress.flat_villa_no}
                  onChange={(e) => handleDeliveryAddressChange("flat_villa_no", e.target.value)}
                />
                <input
                  type="text"
                  className="frontpage-customer-input"
                  placeholder="Enter Building Name"
                  value={deliveryAddress.building_name}
                  onChange={(e) => handleDeliveryAddressChange("building_name", e.target.value)}
                />
                <input
                  type="text"
                  className="frontpage-customer-input"
                  placeholder="Enter Location"
                  value={deliveryAddress.location}
                  onChange={(e) => handleDeliveryAddressChange("location", e.target.value)}
                />
                <input
                  type="text"
                  className="frontpage-customer-input"
                  placeholder="Enter WhatsApp Number"
                  value={whatsappNumber}
                  onChange={handleWhatsappNumberChange}
                />
                <input
                  type="email"
                  className="frontpage-customer-input"
                  placeholder="Enter Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button className="frontpage-save-customer-btn" onClick={handleCustomerSubmit}>
                  Save Customer
                </button>
              </>
            )}
          </div>
        )}

        <div className="frontpage-cart-section">
          <table className="frontpage-cart-table">
            <thead>
              <tr>
                <th>T.No.</th>
                <th>Item Details</th>
                <th>Qty</th>
                <th>Price</th>
                {showKitchenColumn && <th>Kitchen</th>}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {cartItems.length === 0 ? (
                <tr>
                  <td colSpan={showKitchenColumn ? 6 : 5} className="frontpage-empty-cart">
                    Cart is empty.
                  </td>
                </tr>
              ) : (
                cartItems.map((item, index) => (
                  <React.Fragment key={item.id}>
                    <tr>
                      <td>{tableNumber || index + 1}</td>
                      <td>
                        <div className="frontpage-cart-item-details">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="frontpage-cart-item-image"
                            onError={(e) => (e.target.src = "/static/images/default-item.jpg")}
                          />
                          <span className="frontpage-cart-item-link" onClick={() => handleCartItemClick(item)}>
                            {item.item_name || item.name} {item.selectedSize && `(${item.selectedSize})`}
                          </span>
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="frontpage-cart-quantity-input"
                          value={item.quantity || 1}
                          onChange={(e) => handleQuantityChange(item.id, e.target.value, "item")}
                          min="1"
                        />
                      </td>
                      <td>₹{getMainItemTotal(item).toFixed(2)}</td>
                      {showKitchenColumn && <td>{item.kitchen || "Main Kitchen"}</td>}
                      <td>
                        <button className="frontpage-remove-btn" onClick={() => removeFromCart(item)}>
                          <i className="bi bi-x"></i>
                        </button>
                      </td>
                    </tr>
                    {item.icePreference === "with_ice" && (
                      <tr>
                        <td></td>
                        <td>
                          <div className="frontpage-cart-item-option">
                            Ice
                          </div>
                        </td>
                        <td>
                          <input
                            type="number"
                            className="frontpage-cart-quantity-input"
                            value={item.quantity || 1}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value, "item")}
                            min="1"
                          />
                        </td>
                        <td>₹{(item.icePrice * item.quantity).toFixed(2)}</td>
                        {showKitchenColumn && <td></td>}
                        <td>
                          <button className="frontpage-remove-btn" onClick={() => handleItemUpdate({ ...item, icePreference: "without_ice", icePrice: 0 })}>
                            <i className="bi bi-x"></i>
                          </button>
                        </td>
                      </tr>
                    )}
                    {item.isSpicy && (
                      <tr>
                        <td></td>
                        <td>
                          <div className="frontpage-cart-item-option">
                            Spicy
                          </div>
                        </td>
                        <td>
                          <input
                            type="number"
                            className="frontpage-cart-quantity-input"
                            value={item.quantity || 1}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value, "item")}
                            min="1"
                          />
                        </td>
                        <td>₹{(item.spicyPrice * item.quantity).toFixed(2)}</td>
                        {showKitchenColumn && <td></td>}
                        <td>
                          <button className="frontpage-remove-btn" onClick={() => handleItemUpdate({ ...item, isSpicy: false, spicyPrice: 0 })}>
                            <i className="bi bi-x"></i>
                          </button>
                        </td>
                      </tr>
                    )}
                    {item.customVariantsDetails &&
                      Object.entries(item.customVariantsDetails).map(([variantName, variant]) => (
                        <tr key={`${item.id}-custom-${variantName}`}>
                          <td></td>
                          <td>
                            <div className="frontpage-cart-item-option">
                              {variant.heading}: {variant.name}
                            </div>
                          </td>
                          <td>
                            <input
                              type="number"
                              className="frontpage-cart-quantity-input"
                              value={item.customVariantsQuantities?.[variantName] || 1}
                              onChange={(e) => handleQuantityChange(item.id, e.target.value, "customVariant", variantName)}
                              min="1"
                            />
                          </td>
                          <td>₹{(variant.price * (item.customVariantsQuantities?.[variantName] || 1)).toFixed(2)}</td>
                          {showKitchenColumn && <td></td>}
                          <td>
                            <button className="frontpage-remove-btn" onClick={() => removeCustomVariant(item.id, variantName)}>
                              <i className="bi bi-x"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    {item.addonQuantities &&
                      Object.entries(item.addonQuantities).map(([addonName, qty]) =>
                        qty > 0 && (
                          <React.Fragment key={`${item.id}-addon-${addonName}`}>
                            <tr>
                              <td></td>
                              <td>
                                <div className="frontpage-cart-item-details">
                                  <img
                                    src={item.addonImages[addonName] || "/static/images/default-addon-image.jpg"}
                                    alt={addonName}
                                    className="frontpage-cart-item-image"
                                    onError={(e) => (e.target.src = "/static/images/default-addon-image.jpg")}
                                  />
                                  <span className="frontpage-cart-item-addon">
                                    {addonName} ({item.addonVariants[addonName]?.size || "M"})
                                  </span>
                                </div>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="frontpage-cart-quantity-input"
                                  value={qty}
                                  onChange={(e) => handleQuantityChange(item.id, e.target.value, "addon", addonName)}
                                  min="1"
                                />
                              </td>
                              <td>₹{(item.addonSizePrices[addonName] * qty).toFixed(2)}</td>
                              {showKitchenColumn && <td>{item.addonVariants[addonName]?.kitchen || "Main Kitchen"}</td>}
                              <td>
                                <button className="frontpage-remove-btn" onClick={() => removeAddonOrCombo(item.id, "addon", addonName)}>
                                  <i className="bi bi-x"></i>
                                </button>
                              </td>
                            </tr>
                            {item.addonVariants[addonName]?.spicy && (
                              <tr>
                                <td></td>
                                <td>
                                  <div className="frontpage-cart-item-option">
                                    {addonName} (Spicy)
                                  </div>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="frontpage-cart-quantity-input"
                                    value={qty}
                                    onChange={(e) => handleQuantityChange(item.id, e.target.value, "addon", addonName)}
                                    min="1"
                                  />
                                </td>
                                <td>₹{(item.addonSpicyPrices[addonName] * qty).toFixed(2)}</td>
                                {showKitchenColumn && <td></td>}
                                <td>
                                  <button
                                    className="frontpage-remove-btn"
                                    onClick={() => {
                                      const updatedVariants = {
                                        ...item.addonVariants,
                                        [addonName]: { ...item.addonVariants[addonName], spicy: false },
                                      };
                                      handleItemUpdate({
                                        ...item,
                                        addonVariants: updatedVariants,
                                        addonSpicyPrices: { ...item.addonSpicyPrices, [addonName]: 0 },
                                      });
                                    }}
                                  >
                                    <i className="bi bi-x"></i>
                                  </button>
                                </td>
                              </tr>
                            )}
                            {item.addonCustomVariantsDetails?.[addonName] &&
                              Object.entries(item.addonCustomVariantsDetails[addonName]).map(([variantName, variant]) => (
                                <tr key={`${item.id}-addon-${addonName}-custom-${variantName}`}>
                                  <td></td>
                                  <td>
                                    <div className="frontpage-cart-item-option">
                                      {addonName} - {variant.heading}: {variant.name}
                                    </div>
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      className="frontpage-cart-quantity-input"
                                      value={qty}
                                      onChange={(e) => handleQuantityChange(item.id, e.target.value, "addon", addonName)}
                                      min="1"
                                    />
                                  </td>
                                  <td>₹{(variant.price * qty).toFixed(2)}</td>
                                  {showKitchenColumn && <td></td>}
                                  <td>
                                    <button
                                      className="frontpage-remove-btn"
                                      onClick={() => {
                                        const updatedDetails = { ...item.addonCustomVariantsDetails };
                                        delete updatedDetails[addonName][variantName];
                                        if (Object.keys(updatedDetails[addonName]).length === 0) {
                                          delete updatedDetails[addonName];
                                        }
                                        handleItemUpdate({ ...item, addonCustomVariantsDetails: updatedDetails });
                                      }}
                                    >
                                      <i className="bi bi-x"></i>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </React.Fragment>
                        )
                      )}
                    {item.comboQuantities &&
                      Object.entries(item.comboQuantities).map(([comboName, qty]) =>
                        qty > 0 && (
                          <React.Fragment key={`${item.id}-combo-${comboName}`}>
                            <tr>
                              <td></td>
                              <td>
                                <div className="frontpage-cart-item-details">
                                  <img
                                    src={item.comboImages[comboName] || "/static/images/default-combo-image.jpg"}
                                    alt={comboName}
                                    className="frontpage-cart-item-image"
                                    onError={(e) => (e.target.src = "/static/images/default-combo-image.jpg")}
                                  />
                                  <span className="frontpage-cart-item-combo">
                                    {comboName} ({item.comboVariants[comboName]?.size || "M"})
                                  </span>
                                </div>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="frontpage-cart-quantity-input"
                                  value={qty}
                                  onChange={(e) => handleQuantityChange(item.id, e.target.value, "combo", comboName)}
                                  min="1"
                                />
                              </td>
                              <td>₹{(item.comboSizePrices[comboName] * qty).toFixed(2)}</td>
                              {showKitchenColumn && <td>{item.comboVariants[comboName]?.kitchen || "Main Kitchen"}</td>}
                              <td>
                                <button className="frontpage-remove-btn" onClick={() => removeAddonOrCombo(item.id, "combo", comboName)}>
                                  <i className="bi bi-x"></i>
                                </button>
                              </td>
                            </tr>
                            {item.comboVariants[comboName]?.spicy && (
                              <tr>
                                <td></td>
                                <td>
                                  <div className="frontpage-cart-item-option">
                                    {comboName} (Spicy)
                                  </div>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="frontpage-cart-quantity-input"
                                    value={qty}
                                    onChange={(e) => handleQuantityChange(item.id, e.target.value, "combo", comboName)}
                                    min="1"
                                  />
                                </td>
                                <td>₹{(item.comboSpicyPrices[comboName] * qty).toFixed(2)}</td>
                                {showKitchenColumn && <td></td>}
                                <td>
                                  <button
                                    className="frontpage-remove-btn"
                                    onClick={() => {
                                      const updatedVariants = {
                                        ...item.comboVariants,
                                        [comboName]: { ...item.comboVariants[comboName], spicy: false },
                                      };
                                      handleItemUpdate({
                                        ...item,
                                        comboVariants: updatedVariants,
                                        comboSpicyPrices: { ...item.comboSpicyPrices, [comboName]: 0 },
                                      });
                                    }}
                                  >
                                    <i className="bi bi-x"></i>
                                  </button>
                                </td>
                              </tr>
                            )}
                            {item.comboCustomVariantsDetails?.[comboName] &&
                              Object.entries(item.comboCustomVariantsDetails[comboName]).map(([variantName, variant]) => (
                                <tr key={`${item.id}-combo-${comboName}-custom-${variantName}`}>
                                  <td></td>
                                  <td>
                                    <div className="frontpage-cart-item-option">
                                      Combo: {comboName} - {variant.heading}: {variant.name}
                                    </div>
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      className="frontpage-cart-quantity-input"
                                      value={qty}
                                      onChange={(e) => handleQuantityChange(item.id, e.target.value, "combo", comboName)}
                                      min="1"
                                    />
                                  </td>
                                  <td>₹{(variant.price * qty).toFixed(2)}</td>
                                  {showKitchenColumn && <td></td>}
                                  <td>
                                    <button
                                      className="frontpage-remove-btn"
                                      onClick={() => {
                                        const updatedDetails = { ...item.comboCustomVariantsDetails };
                                        delete updatedDetails[comboName][variantName];
                                        if (Object.keys(updatedDetails[comboName]).length === 0) {
                                          delete updatedDetails[comboName];
                                        }
                                        handleItemUpdate({ ...item, comboCustomVariantsDetails: updatedDetails });
                                      }}
                                    >
                                      <i className="bi bi-x"></i>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </React.Fragment>
                        )
                      )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="frontpage-billing-summary">
          <div className="frontpage-summary-row">
            <span>TOTAL QUANTITY:</span>
            <span>{cartItems.reduce((total, item) => total + (item.quantity || 0), 0)}</span>
          </div>
          <div className="frontpage-summary-row">
            <span>Subtotal:</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="frontpage-summary-row skylight">
            <span>VAT ({vatRate * 100}%):</span>
            <span>₹{vat.toFixed(2)}</span>
          </div>
          <div className="frontpage-summary-row total">
            <span>Grand Total:</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
        </div>

        <div className="frontpage-action-buttons">
          <button className="frontpage-action-btn frontpage-btn-save" onClick={saveOrder}>
            SAVE
          </button>
          <button className="frontpage-action-btn frontpage-btn-cancel" onClick={cancelCart}>
            CANCEL
          </button>
          <button className="frontpage-action-btn frontpage-btn-pay" onClick={() => setShowPaymentModal(true)}>
            PAY
          </button>
        </div>
      </div>

      {warningMessage && (
        <div className={`frontpage-alert frontpage-alert-${warningType}`}>
          <span>{warningMessage}</span>
          <button className="frontpage-alert-button" onClick={handleWarningOk}>
            OK
          </button>
        </div>
      )}

      {showPaymentModal && (
        <div className="frontpage-modal-overlay">
          <div className="frontpage-modal-content">
            <div className="frontpage-modal-header">
              <h3 className="frontpage-modal-title">Select Payment Method</h3>
              <button className="frontpage-modal-close" onClick={() => setShowPaymentModal(false)}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div className="frontpage-modal-body">
              <div className="frontpage-payment-options">
                <button className="frontpage-payment-btn frontpage-cash" onClick={() => handlePaymentSelection("CASH")}>
                  CASH
                </button>
                <button className="frontpage-payment-btn frontpage-card" onClick={() => handlePaymentSelection("CARD")}>
                  CARD
                </button>
                <button className="frontpage-payment-btn frontpage-upi" onClick={() => handlePaymentSelection("UPI")}>
                  UPI
                </button>
              </div>
            </div>
            <div className="frontpage-modal-footer">
              <button className="frontpage-modal-btn frontpage-cancel" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <FoodDetails
          item={selectedItem}
          cartItem={selectedCartItem}
          onClose={() => {
            setSelectedItem(null);
            setSelectedCartItem(null);
          }}
          onUpdate={handleItemUpdate}
        />
      )}
    </div>
  );
}

export default FrontPage;