import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { toast } from "react-toastify";
import "../styles/homepage.css";
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

        const sorted = items.sort(
          (a, b) => b.discount_percentage - a.discount_percentage
        );

        const grouped = sorted.reduce((acc, item) => {
          const cat = item.category || "Other";
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(item);
          return acc;
        }, {});

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
          if (!added) break;
        }

        const carouselItems = top16.slice(0, 8);
        const gridItems = top16.slice(8, 16).sort(() => Math.random() - 0.5);

        setSpareParts([...carouselItems, ...gridItems]);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load spare parts");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (spareParts.length < 8) return;
    const interval = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % 8);
    }, 4000);
    return () => clearInterval(interval);
  }, [spareParts]);

  if (loading) return <div className="message">Loading...</div>;
  if (!spareParts.length) return <div className="message">No spare parts found.</div>;

  const handleAddToCart = (item, e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(item);
  };

  const carouselItems = spareParts.slice(0, 8);
  const visibleCarouselItems = Array.from({ length: 4 }).map(
    (_, i) => carouselItems[(carouselIndex + i) % carouselItems.length]
  );

  const gridItems = spareParts.slice(8, 16);

  return (
    <div className="homepage">
      <h2>🔥 HOT DEALS</h2>

      {/* Carousel */}
      <div className="top-carousel">
        {visibleCarouselItems.map(item => (
          <Link
            key={item.id}
            to={`/items/${item.id}`}
            className="item-card-link"
          >
            <div className="item-card">
              <img src={item.image} alt={item.brand} />
              <h4>{item.brand} {item.category} for {item.vehicle_type}</h4>
              <p className='price'>
                KES {item.buying_price?.toLocaleString() || '0'}
                {item.discount_percentage > 0 && (
                  <span className="discount">
                    (-{item.discount_percentage.toFixed(0)}%)
                  </span>
                )}
              </p>
              <button
                className="add-to-cart"
                onClick={(e) => handleAddToCart(item, e)}
              >
                Add To Cart
              </button>
            </div>
          </Link>
        ))}
      </div>

      {/* Grid */}
      {gridItems.length > 0 && (
        <>
          <h2>More Deals</h2>
          <div className="items-grid">
            {gridItems.map(item => (
              <Link
                key={item.id}
                to={`/items/${item.id}`}
                className="item-card-link"
              >
                <div className="item-card">
                  <img src={item.image} alt={item.brand} />
                  <h4>{item.brand} {item.category} for {item.vehicle_type}</h4>
                  <p className='price'>
                    KES {item.buying_price?.toLocaleString() || '0'}
                    {item.discount_percentage > 0 && (
                      <span className="discount">
                        (-{item.discount_percentage.toFixed(0)}%)
                      </span>
                    )}
                  </p>

                  <button
                    className="add-to-cart"
                    onClick={(e) => handleAddToCart(item, e)}
                  >
                    Add To Cart
                  </button>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HomePage;
