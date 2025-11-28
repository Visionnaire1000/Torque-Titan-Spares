import { useEffect, useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { toast } from 'react-toastify';
import '../styles/homepage.css';
import config from "../config";

const HomePage = () => {
  const [spareParts, setSpareParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const { addItem } = useCart();

  useEffect(() => {
    fetch(`${config.API_BASE_URL}/spareparts?per_page=100`)
      .then(res => res.json())
      .then(data => {
        const items = data.items || [];
        if (!items.length) {
          setLoading(false);
          return;
        }

        // Sort by discount descending
        const sorted = items.sort((a, b) => b.discount_percentage - a.discount_percentage);

        // Group items by category
        const grouped = sorted.reduce((acc, item) => {
          const cat = item.category || 'Other';
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(item);
          return acc;
        }, {});

        // Pick top items from each category in round-robin fashion for top 16
        const top16 = [];
        while (top16.length < 16) {
          let added = false;
          for (const cat of Object.keys(grouped)) {
            if (grouped[cat].length > 0) {
              top16.push(grouped[cat].shift());
              added = true;
              if (top16.length >= 16) break;
            }
          }
          if (!added) break; // no more items to add
        }

        // Shuffle the last 8 items for grid variety
        const carouselItems = top16.slice(0, 8);
        const gridItems = top16.slice(8, 16).sort(() => Math.random() - 0.5);

        setSpareParts([...carouselItems, ...gridItems]);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching parts:', err);
        toast.error("Failed to load spare parts");
        setLoading(false);
      });
  }, []);

  // Carousel rotation: show 4 items at a time, rotate by 1 every 4s
  useEffect(() => {
    if (spareParts.length < 8) return;

    const interval = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % 8);
    }, 4000);

    return () => clearInterval(interval);
  }, [spareParts]);

  if (loading)
    return (
      <div className="homepage">
        <div className="loading-screen">Loading...</div>
      </div>
    );

  if (!spareParts.length) return <div className="homepage">No spare parts found.</div>;

  const handleAddToCart = (item) => {
    addItem(item);
  };

  // Carousel items
  const carouselItems = spareParts.slice(0, 8);
  const visibleCarouselItems = [];
  for (let i = 0; i < 4; i++) {
    visibleCarouselItems.push(carouselItems[(carouselIndex + i) % carouselItems.length]);
  }

  // Grid items (next 8, already shuffled)
  const gridItems = spareParts.slice(8, 16);

  return (
    <div className="homepage">
      <h2>🔥HOT DEALS</h2>
      
      {/* Carousel */}
      <div className="top-carousel">
        {visibleCarouselItems.map(item => (
          <div key={item.id} className="item-card">
            <img src={item.image} alt={item.brand} />
            <h4>{item.brand} for {item.vehicle_type}</h4>
            <p id='price'>
              KSH {item.buying_price} 
              {item.discount_percentage > 0 && (
                <span className="discount"> (-{item.discount_percentage.toFixed(0)}%)</span>
              )}
            </p>
            <button className="add-to-cart" onClick={() => handleAddToCart(item)}>
              Add To Cart
            </button>
          </div>
        ))}
      </div>

      {/* Grid */}
      {gridItems.length > 0 && (
        <>
          <h2>More Deals</h2>
          <div className="items-grid">
            {gridItems.map(item => (
              <div key={item.id} className="item-card">
                <img src={item.image} alt={item.brand} />
                <h4>{item.brand} for {item.vehicle_type}</h4>
                <p id="price">
                  KSH {item.buying_price} 
                  {item.discount_percentage > 0 && (
                    <span className="discount"> (-{item.discount_percentage.toFixed(0)}%)</span>
                  )}
                </p>
                <button className="add-to-cart" onClick={() => handleAddToCart(item)}>
                  Add To Cart
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HomePage;
