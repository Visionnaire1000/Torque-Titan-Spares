import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { ShoppingCart, Menu } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { components } from 'react-select';
import '../styles/navbar.css';

const Navbar = () => {
  const { items } = useCart();
  const [showDropdown, setShowDropdown] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:3000/spareParts')
      .then(res => res.json())
      .then(data => {
        setAllItems(data);
      });
  }, []);

  const handleInputChange = (input) => {
    setInputValue(input);

    const filtered = allItems.filter(item => {
      const search = input.toLowerCase();
      return (
        item.name.toLowerCase().includes(search) ||
        item.brand.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search)
      );
    }).map(item => ({
      label: `${item.name} (${item.brand}, ${item.category})`,
      value: item.name.toLowerCase().replace(/\s+/g, '-')
    }));

    setFilteredOptions(filtered);
  };

  const handleSearch = () => {
    const searchQuery = selectedOption?.value || inputValue.trim().toLowerCase();
    if (searchQuery) {
      navigate(`/search-results?query=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSelectNavigate = (e) => {
    const value = e.target.value;
    if (value) navigate(`/${value}`);
  };

const handleSelectChange = (selectedOption) => {
  setSelectedOption(selectedOption); // Update state
  if (selectedOption) {
    navigate(`/search?query=${encodeURIComponent(selectedOption.label)}`);
  }
};


 const CustomOption = (props) => {
  return (
    <components.Option {...props}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <i className="fa fa-search" aria-hidden="true" />
        {props.data.label}
      </span>
    </components.Option>
  );
};

  return (
    <nav className="navbar">
      <div className="logo">
        <img src="https://i.imgur.com/wVCDyd7.png" alt="Torque Titan logo" />
      </div>

      <div className="dashboard-dropdown">
        <button className="dashboard-button" onClick={() => setShowDropdown(!showDropdown)} title="Dashboard">
          <Menu />
        </button>
        {showDropdown && (
          <div className="dropdown-menu">
            <Link to="/">Home</Link>
            <Link to="/">My Account</Link>
            <Link to="/marketplace">Marketplace</Link>
            <Link to="/farmer">Farmer Dashboard</Link>
            <Link to="/">Theme</Link>
            <button onClick={() => navigate('/login')}>Logout</button>
          </div>
        )}
      </div>

      <div className="categories">
        {['TYRES', 'RIMS', 'BATTERIES', 'OIL FILTERS'].map((cat) => {
          const options = ['sedan', 'suv', 'truck', 'bus'].map(type => (
            <option key={type} value={`${type.toLowerCase()}-${cat.toLowerCase().replace(' ', '-')}`}>
              {type.toUpperCase()} {cat}
            </option>
          ));
          return (
            <select key={cat} defaultValue="" onChange={handleSelectNavigate}>
              <option disabled value="">{cat}</option>
              {options}
            </select>
          );
        })}
      </div>

     <div className="navbar-smart-search">
 <Select
  className="smart-select"
  options={filteredOptions}
  onInputChange={handleInputChange}
  onChange={handleSelectChange}
  placeholder="Search item..."
  isClearable
  inputValue={inputValue}
  components={{ Option: CustomOption }}  // <-- custom option here
  styles={{
    container: (base) => ({
      ...base,
      width: '200px',
    }),
 
    menu: (base) => ({
      ...base,
      backgroundColor: 'rgba(8, 18, 30, 0.856)',
      zIndex: 1000,
      width: '400px',
      borderRadius: '12px',
    }),
    menuList: (base) => ({
      ...base,
      padding: 0,
      borderRadius: '12px',
    }),
    option: (base, { isFocused }) => ({
      ...base,
      backgroundColor: isFocused ? 'rgba(107, 114, 123, 0.89)' : 'rgba(8, 18, 30, 0.856)',
      color: 'white',
      cursor: 'pointer',
      padding: '10px 15px',
      borderRadius: '4px',
    }),
    singleValue: (base) => ({
      ...base,
      color: '#000',
    }),
    placeholder: (base) => ({
      ...base,
      color: '#666',
    }),
    input: (base) => ({
      ...base,
      color: '#000',
    }),
  }}
/>
<button onClick={handleSearch} className="navbar-search-button" title="Search">
  <i className="fa fa-search" />
</button>

</div>


      <div className="right-section">
        <Link to="/cart" className="cart">
          <ShoppingCart />
          <span className="cart-count">{items.length}</span>
        </Link>
        <Link to="/login" className="login">Login</Link>
        <Link to="/register" className="register">Register</Link>
      </div>
    </nav>
  );
};

export default Navbar;
