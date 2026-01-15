import { useEffect, useState, useCallback } from 'react';
import Select, { components } from 'react-select';
import { useNavigate, Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import config from '../config';
import '../styles/searchBar.css';

const HISTORY_KEY = 'search_history';
const HISTORY_LIMIT = 6;

const SearchBar = () => {
  const navigate = useNavigate();

  const [options, setOptions] = useState([]);
  const [historyOptions, setHistoryOptions] = useState([]);
  const [inputValue, setInputValue] = useState('');

  /* ---------------- Load history ---------------- */
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    setHistoryOptions(saved);
  }, []);

  /* ---------------- Fetch spare parts ---------------- */
  useEffect(() => {
    fetch(`${config.API_BASE_URL}/spareparts?per_page=1000`)
      .then(res => res.json())
      .then(data => {
        const parts = data.items || [];
        const mapped = parts.map(part => ({
          label: part.name,
          value: part.id,
          searchableText: `
            ${part.name}
            ${part.brand}
            ${part.category}
            ${part.vehicle_type}
          `.toLowerCase(),
          part,
          isHistory: false
        }));
        setOptions(mapped);
      });
  }, []);

  /* ---------------- Save to history ---------------- */
  const saveToHistory = useCallback((option) => {
    const updated = [
      { ...option, isHistory: true },
      ...historyOptions.filter(h => h.value !== option.value),
    ].slice(0, HISTORY_LIMIT);

    setHistoryOptions(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  }, [historyOptions]);

  /* ---------------- Remove single history item ---------------- */
  const removeHistoryItem = useCallback((value) => {
    const updated = historyOptions.filter(h => h.value !== value);
    setHistoryOptions(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  }, [historyOptions]);

  /* ---------------- Filtering ---------------- */
  const filterOption = (option, inputVal) => {
    // Always show recent searches when input is empty
    if (option.data.isHistory && !inputVal) return true;
    if (!inputVal) return false;

    const words = inputVal.toLowerCase().trim().split(/\s+/);
    return words.every(word =>
      option.data.searchableText.includes(word)
    );
  };

  /* ---------------- Handlers ---------------- */
  const handleInputChange = (value) => {
    setInputValue(value);
  };

  const handleSelect = (option) => {
    if (!option) return;
    saveToHistory(option);
    navigate(`/items/${option.value}`);
  };

  /* ---------------- Custom Option ---------------- */
  const CustomOption = (props) => {
    const { data } = props;

    return (
      <components.Option {...props}>
        <div className="search-option">
          {data.isHistory && (
            <Clock className="clock-icon" size={16} strokeWidth={1.8} />
          )}

          <div className="option-main">
            <Link
              to={`/items/${data.value}`}
              onClick={(e) => e.stopPropagation()}
              className="item-link"
            >
              <strong>{data.part.name}</strong>
            </Link>

            <small>
              {data.part.brand} {data.part.category} for {data.part.vehicle_type}
              {data.isHistory && (
                <span className="history-tag">Recent</span>
              )}
            </small>
          </div>

          {data.isHistory && (
            <button
              className="remove-history-item"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeHistoryItem(data.value);
              }}
              aria-label="Remove search"
            >
              ×
            </button>
          )}
        </div>
      </components.Option>
    );
  };

  /* ---------------- Grouped options ---------------- */
  const groupedOptions = [
    ...(historyOptions.length && !inputValue
      ? [{
          label: 'Recent Searches',
          options: historyOptions.map(item => ({
            ...item,
            label: item.part.name,
            isHistory: true
          }))
        }]
      : []),

    ...(inputValue
      ? [{
          label: 'All Results',
          options
        }]
      : [])
  ];

  return (
    <div className="search-page">
      <div className="search-overlay" />

      <div className="search-header">
        <h2>Search Spare Parts</h2>
      </div>

      <Select
        autoFocus
        options={groupedOptions}
        isClearable
        placeholder="Search sparepart..."
        filterOption={filterOption}
        onChange={handleSelect}
        onInputChange={handleInputChange}
        inputValue={inputValue}
        components={{ Option: CustomOption }}
        styles={{
          container: (base) => ({ ...base, width: '100%' }),
          control: (base, state) => ({
            ...base,
            backgroundColor: '#fff',
            borderColor: state.isFocused ? 'rgb(0,64,128);' : '#ccc',
            boxShadow: state.isFocused ? '0 0 0 1px rgb(0,64,128);' : 'none',
            minHeight: '42px',
          }),
          input: (base) => ({ ...base, color: '#000' }),
          singleValue: (base) => ({ ...base, color: '#000' }),
          placeholder: (base) => ({ ...base, color: '#888' }),
          menu: (base) => ({
            ...base,
            backgroundColor: '#1b1b1b',
            borderRadius: '10px',
            zIndex: 1000,
          }),
          option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused ? 'rgb(0,64,128);' : '#1b1b1b',
            color: state.isFocused ? '#fff' : '#ddd',
            padding: '12px 15px',
            cursor: 'pointer',
          }),
        }}
      />
    </div>
  );
};

export default SearchBar;
