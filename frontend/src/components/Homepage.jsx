/*import { useEffect, useState } from 'react';
import { useCart } from '../contexts/CartContext'; 
import { toast } from 'react-toastify';
import '../styles/homepage.css';

const HomePage = () => {
  const [spareParts, setSpareParts] = useState([]);
  const [topIndex, setTopIndex] = useState(0);
  const { addItem } = useCart();

  useEffect(() => {
    fetch('http://localhost:8000/spareParts')
      .then(res => res.json())
      .then(data => setSpareParts(data))
      .catch(err => console.error('Error fetching parts:', err));
  }, []);

  useEffect(() => {
    const interval = setTimeout(() => {
      setTopIndex(prev => (prev + 4) % 8);
    }, 4000);
    return () => clearTimeout(interval);
  }, [topIndex]);

  const topItems = spareParts.slice(0, 8);
  const rotatingTopItems = topItems.slice(topIndex, topIndex + 4).length === 4
    ? topItems.slice(topIndex, topIndex + 4)
    : [...topItems.slice(topIndex), ...topItems.slice(0, 4 - (topItems.length - topIndex))];

  const bottomItems = spareParts.slice(8);

  const handleAddToCart = (item) => {
    addItem(item);
    toast.success(`${item.name} added to cart`);
  };

  return (
    <div className="homepage">
      <div className="hot-deals-sticker">🔥 Hot Deals</div>

      <div className="top-items">
        {rotatingTopItems.map(item => (
          <div key={item.id} className="item-card">
            <img src={item.imageUrl} alt={item.name} />
            <h4>{item.name}</h4>
            <p>{item.brand}</p>
            <p>KES {item.price}</p>
            <button
              className="add-to-cart"
              onClick={() => handleAddToCart(item)}
            >
              Add To Cart
            </button>
          </div>
        ))}
      </div>

      <div className="bottom-items">
        {bottomItems.map(item => (
          <div key={item.id} className="item-card">
            <img src={item.imageUrl} alt={item.name} />
            <h4>{item.name}</h4>
            <p>{item.brand}</p>
            <p>KES {item.price}</p>
            <button
              className="add-to-cart"
              onClick={() => handleAddToCart(item)}
            >
              Add To Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;  */

