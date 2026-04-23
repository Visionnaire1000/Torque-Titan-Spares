import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import config from "../config";
import "../styles/searchResults.css";

const SkeletonCard = () => (
  <div className="item-card skeleton">
    <div className="img" />
    <div className="text" />
  </div>
);

const SearchResults = () => {
  const location = useLocation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState({});
  const { addItem } = useCart();

  const params = new URLSearchParams(location.search);
  const keyword = params.get("query");
  const brand = params.get("brand");
  const vehicle = params.get("vehicle");
  const category = params.get("category");

  const handleImageLoad = (id) => {
    setLoadedImages((prev) => ({ ...prev, [id]: true }));
  };

  const handleAddToCart = (item, e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(item);
  };

  useEffect(() => {
    setLoading(true);

    fetch(`${config.API_BASE_URL}/spareparts?per_page=1000`)
      .then((res) => res.json())
      .then((data) => {
        let results = data.items || [];

        if (keyword) {
          const words = keyword.toLowerCase().split(/\s+/);

          results = results.filter((item) => {
            const text = `${item.name} ${item.brand} ${item.category} ${item.vehicle_type}`.toLowerCase();
            return words.every((word) => text.includes(word));
          });
        }

        if (brand && vehicle && category) {
          results = results.filter(
            (item) =>
              item.brand.toLowerCase() === brand.toLowerCase() &&
              item.vehicle_type.toLowerCase() === vehicle.toLowerCase() &&
              item.category.toLowerCase() === category.toLowerCase()
          );
        }

        setItems(results);
        setLoading(false);
      });
  }, [keyword, brand, vehicle, category]);

  return (
    <div className="search-results-page">
      <h2>
        {keyword && `Results for "${keyword}"`}
        {brand && vehicle && category &&
          ` Category: ${brand} ${vehicle} ${category}`}
      </h2>

      {loading ? (
        <div className="grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="no-results">No items found</p>
      ) : (
        <div className="grid">
          {items.map((item) => (
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
                  src={item.image || item.image_url}
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
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResults;