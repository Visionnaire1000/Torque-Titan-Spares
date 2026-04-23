import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import config from "../config";
import "../styles/homepage.css";
import { Flame, RefreshCw } from "lucide-react";

const SkeletonCard = () => (
  <div className="item-card skeleton" data-testid="skeleton">
    <div className="skeleton-image" />
    <div className="skeleton-text short" />
    <div className="skeleton-text long" />
    <div className="skeleton-button" />
  </div>
);

const BuyerHomepage = () => {
  const [spareParts, setSpareParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const { addItem } = useCart();
  const [loadedImages, setLoadedImages] = useState({});

  const fetchSpareParts = () => {
    setLoading(true);
    setError(null);

    fetch(`${config.API_BASE_URL}/spareparts?per_page=100`)
      .then((res) => {
        if (!res.ok) throw new Error("Server error");
        return res.json();
      })
      .then((data) => {
        const items = Array.isArray(data.items) ? data.items : [];

        if (!items.length) {
          setSpareParts([]);
          setLoading(false);
          return;
        }

        const sorted = [...items].sort(
          (a, b) => (b?.discount_percentage || 0) - (a?.discount_percentage || 0)
        );

        const grouped = sorted.reduce((acc, item) => {
          if (!item) return acc;
          const cat = item.category || "Other";
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(item);
          return acc;
        }, {});

        const top16 = [];
        while (top16.length < 16) {
          let added = false;
          for (const cat of Object.keys(grouped)) {
            if (grouped[cat]?.length > 0) {
              const next = grouped[cat].shift();
              if (next) top16.push(next);
              added = true;
              if (top16.length >= 16) break;
            }
          }
          if (!added) break;
        }

        const carouselItems = top16.slice(0, 8);
        const gridItems = top16
          .slice(8, 16)
          .sort(() => Math.random() - 0.5);

        setSpareParts([...carouselItems, ...gridItems]);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(
          "Unable to load spare parts. Please check your connection and try again."
        );
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSpareParts();
  }, []);

  useEffect(() => {
    if (spareParts.length < 8) return;

    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % 8);
    }, 4000);

    return () => clearInterval(interval);
  }, [spareParts]);

  const handleAddToCart = (item, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (item) addItem(item);
  };

  const handleImageLoad = (id) => {
    if (!id) return;
    setLoadedImages((prev) => ({ ...prev, [id]: true }));
  };

  const carouselItems = spareParts.slice(0, 8);
  const gridItems = spareParts.slice(8, 16);

  const visibleCarouselItems =
    carouselItems.length > 0
      ? Array.from({ length: Math.min(4, carouselItems.length) }).map(
          (_, i) =>
            carouselItems[
              (carouselIndex + i) % carouselItems.length
            ]
        )
      : [];

  if (error) {
    return (
      <div className="homepage error-state">
        <h2>Something went wrong</h2>
        <p>{error}</p>
        <button className="retry-btn" onClick={fetchSpareParts}>
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="homepage">
      <h2>
        <span className="fire-icon">
          <Flame size={24} color="red" />
        </span>
        Hot Deals
      </h2>

      <div className="top-carousel">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))
        ) : visibleCarouselItems.length > 0 ? (
          visibleCarouselItems
            .filter(Boolean)
            .map((item) => (
              <Link
                key={item.id}
                to={`/items/${item.id}`}
                className="item-card-link"
              >
                <div
                  className={`item-card ${
                    loadedImages[item.id] ? "" : "skeleton"
                  }`}
                >
                  <img
                    src={item.image}
                    alt={item.brand}
                    onLoad={() => handleImageLoad(item.id)}
                  />
                  <h4>
                    {item.brand} {item.category} for {item.vehicle_type}
                  </h4>
                  <p id="price">
                    KES {item.buying_price?.toLocaleString() || "0"}
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
            ))
        ) : (
          <p>No deals available</p>
        )}
      </div>

      <h2>More Deals</h2>

      <div className="items-grid">
        {loading ? (
          Array.from({ length: 8 }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))
        ) : gridItems.length > 0 ? (
          gridItems
            .filter(Boolean)
            .map((item) => (
              <Link
                key={item.id}
                to={`/items/${item.id}`}
                className="item-card-link"
              >
                <div
                  className={`item-card ${
                    loadedImages[item.id] ? "" : "skeleton"
                  }`}
                >
                  <img
                    src={item.image}
                    alt={item.brand}
                    onLoad={() => handleImageLoad(item.id)}
                  />
                  <h4>
                    {item.brand} {item.category} for {item.vehicle_type}
                  </h4>
                  <p id="price">
                    KES {item.buying_price?.toLocaleString() || "0"}
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
            ))
        ) : (
          <p>No items available</p>
        )}
      </div>
    </div>
  );
};

export default BuyerHomepage;