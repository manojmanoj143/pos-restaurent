import React, { createContext, useEffect, useState } from 'react';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [cartItems, setCartItems] = useState([]);
    const [selectedItemDetails, setSelectedItemDetails] = useState(null);
    const [totalPrice, setTotalPrice] = useState(0);
    const [preparedItems, setPreparedItems] = useState([]);
    const [kitchenOrders, setKitchenOrders] = useState([]);
    const [bearerOrders, setBearerOrders] = useState([]);
    const [quantity, setQuantity] = useState([]);
    const [savedOrders, setSavedOrders] = useState(() => {
        const saved = localStorage.getItem("savedOrders");
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem("savedOrders", JSON.stringify(savedOrders));
    }, [savedOrders]);
    
    const addToCart = (item) => {
        const existingItem = cartItems.find(cartItem => cartItem.id === item.id);
        if (existingItem) {
            setCartItems(prevItems =>
                prevItems.map(cartItem =>
                    cartItem.id === item.id
                        ? { ...cartItem, quantity: cartItem.quantity + 1 }
                        : cartItem
                )
            );
        } else {
            setCartItems(prevItem => [...prevItem, { ...item, quantity: 1 }]);
        }
    };
 
    const removeFromCart = (item) => {
        setCartItems(prevItems => prevItems.filter(cartItem => cartItem !== item));
    };

    const setItemDetails = (item) => {
        setSelectedItemDetails(item);
    };

    const updateCartItem = (updatedItem) => {
        setCartItems(prevItems =>
            prevItems.map(item =>
                item.name === updatedItem.name
                    ? {
                          ...item,
                          quantity: updatedItem.quantity,
                          totalPrice: updatedItem.totalPrice,
                          addons: updatedItem.addon,
                      }
                    : item
            )
        );
    };

    const updateOrderStatus = (id, status) => {
        setSavedOrders(prevOrders =>
            prevOrders.map(order => ({
                ...order,
                cartItems: order.cartItems.map(item =>
                    item.id === id ? { ...item, status } : item
                ),
            }))
        );

        if (status === "Prepared") {
            setPreparedItems(prev => (!prev.includes(id) ? [...prev, id] : prev));
        } else {
            setPreparedItems(prev =>
                prev.filter(preparedItemId => preparedItemId !== id)
            );
        }
    };

    const markAsPickedUp = (id) => {
        setPreparedItems(prev => prev.filter(itemId => itemId !== id)); 
        setBearerOrders(prev => prev.filter(item => item.id !== id));  
    };
  
    const addKitchenOrder = (order) => {
        const filteredCartItems = order.cartItems.filter(
            item => item.category !== "Drinks"
        );
        if (filteredCartItems.length === 0) {
            alert(
                "No items to send to the kitchen as all items belong to the 'Drinks' category."
            );
            return;
        }
        const kitchenOrder = {
            ...order,
            cartItems: filteredCartItems,
        };
        setSavedOrders(prevOrders => {
            const updatedOrders = [...prevOrders, kitchenOrder];
            localStorage.setItem("savedOrders", JSON.stringify(updatedOrders));
            return updatedOrders;
        });
        alert("Order successfully sent to the kitchen!");
    };
    
    const informBearer = (item) => {
        if (!item || (!item.id && !item.name)) {           
            console.error("Invalid item passed to informBearer.");
            return;
        }
        setBearerOrders(prevOrders => [...prevOrders, { ...item, status: "Prepared" }]);
        setPreparedItems(prev =>
            prev.filter(preparedItem => preparedItem.id !== item.id)
        );
    };

    return (
        <UserContext.Provider
            value={{
                user,
                setUser,
                cartItems,
                addToCart,
                removeFromCart,
                setItemDetails,
                selectedItemDetails,
                updateCartItem,
                totalPrice,
                setTotalPrice,
                updateOrderStatus,
                setCartItems,
                markAsPickedUp,
                addKitchenOrder,
                preparedItems,
                kitchenOrders,
                bearerOrders,
                informBearer,
                savedOrders,
                setSavedOrders,
            }}
        >
            {children}
        </UserContext.Provider>
    );
};

export default UserContext;