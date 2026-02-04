import { createContext, useState, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      const storedCart = localStorage.getItem('titanCart');
      return storedCart ? JSON.parse(storedCart) : [];
    } catch (err) {
      console.error('Error parsing cart from localStorage', err);
      return [];
    }
  });

  // Persist cart whenever items change
  useEffect(() => {
    localStorage.setItem('titanCart', JSON.stringify(items));
  }, [items]);

  // Add item to cart with automatic normalization
  const addItem = (item, qty = 1) => {
    const normalizedItem = {
      id: item.id,
      brand: item.brand ,
      category: item.category ,
      vehicle_type: item.vehicle_type ,
      buying_price: item.buying_price ,
      image: item.image
    };

    setItems(prevItems => {
      const existingItem = prevItems.find(i => i.id === normalizedItem.id);
      if (existingItem) {
        return prevItems.map(i =>
          i.id === normalizedItem.id
            ? { ...i, quantity: i.quantity + qty }
            : i
        );
      }
      return [...prevItems, { ...normalizedItem, quantity: qty }];
    });

    toast.success(`${normalizedItem.brand} ${normalizedItem.category} for
       ${normalizedItem.vehicle_type} added to cart`);
  };

  // Remove an item completely
  const removeItem = (id) => {
    setItems(prevItems => prevItems.filter(i => i.id !== id));
    toast.success('Item removed from cart');
  };

  // Update quantity (removes if quantity < 1)
  const updateQuantity = (id, quantity) => {
    if (quantity < 1) {
      removeItem(id);
      return;
    }
    setItems(prevItems =>
      prevItems.map(i =>
        i.id === id ? { ...i, quantity } : i
      )
    );
  };

  // Clear the entire cart
  const clearCart = () => {
    setItems([]);
    toast.success("Cart cleared", {
      autoClose: 1000, 
   });

  };

  // Total price calculation
  const total = items.reduce(
    (sum, i) => sum + (i.buying_price || 0) * (i.quantity || 1),
    0
  );

  // Total quantity
  const itemCount = items.reduce((sum, i) => sum + (i.quantity || 0), 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
