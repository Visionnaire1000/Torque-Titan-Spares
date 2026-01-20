import { useEffect, useState } from 'react';
import { Link } from "react-router-dom";
import { useCart } from "../../contexts/CartContext";
import config from '../../config';
import "../../styles/rims.css";

const TruckRims = () => {
  const [items, setItems] = useState([]);
  const [brand, setBrand] = useState('');
  const [colour, setColour] = useState('');
  const [price, setPrice] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const { addItem } = useCart();

  const availableBrands = [
    'Enkei',
    'BBS',
    'OZ Racing',
    'Konig',
    'HRE',
    'Vossen',
    'Advan'
  ];

  const availableColours = ['silver', 'black', 'gold'];

  const fetchRims = async () => {
    setLoading(true);

    const params = new URLSearchParams({
      category: 'rim',
      vehicle_type: 'truck',
      ...(brand && { brand }),
      ...(colour && { colour }),
      ...(price && { price }),
      page: currentPage,
      per_page: 16
    });

    try {
      const res = await fetch(`${config.API_BASE_URL}/spareparts?${params}`);
      if (!res.ok) return;

      const data = await res.json();
      setItems(data.items || []);
      setTotalPages(data.pages || 1);
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRims();
  }, [brand, colour, price, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [brand, colour, price]);

  const handleAddToCart = (item, e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(item);
  };

  const getVisiblePages = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(currentPage - 2, 1);
    let end = Math.min(start + maxVisible - 1, totalPages);
    start = Math.max(end - maxVisible + 1, 1);

    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="products-page">
      <div className="filters">
        {/* Brand */}
        <select value={brand} onChange={e => setBrand(e.target.value)}>
          <option value="">All Brands</option>
          {availableBrands.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        {/* Colour */}
        <select value={colour} onChange={e => setColour(e.target.value)}>
          <option value="">All Colours</option>
          {availableColours.map(c => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>

        {/* Price */}
        <select value={price} onChange={e => setPrice(e.target.value)}>
          <option value="">All Prices</option>
          <option value="low">Low (&lt; 30k)</option>
          <option value="medium">Medium (30k–35k)</option>
          <option value="high">High (&gt; 35k)</option>
        </select>
      </div>

      <div className="products-grid">
        {loading ? (
          <p>Loading truck rims...</p>
        ) : items.length ? (
          items.map(item => (
             <div key={item.id} className="item-card">
              <Link to={`/items/${item.id}`} className="item-card-link">
                <img src={item.image} alt={item.brand} />
                <h4>{item.brand} {item.category} for {item.vehicle_type}</h4>
                <p id="price">
                  KES {item.buying_price?.toLocaleString()}
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
              </Link>
            </div>
          ))
        ) : (
          <p>No truck rims found.</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
          >
            Prev
          </button>

          {getVisiblePages()[0] > 1 && <span className="dots">…</span>}

          {getVisiblePages().map(page => (
            <button
              key={page}
              className={page === currentPage ? 'active' : ''}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}

          {getVisiblePages().slice(-1)[0] < totalPages && <span className="dots">…</span>}

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default TruckRims;
