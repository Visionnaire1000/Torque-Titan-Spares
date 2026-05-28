import { useEffect, useState, useCallback } from 'react';
import Select, { components } from 'react-select';
import { useNavigate } from 'react-router-dom';
import { Clock, X } from 'lucide-react';
import config from '../config';
import '../styles/searchBar.css';

const HISTORY_KEY = 'search_history';
const HISTORY_LIMIT = 6;

const SearchBar = () => {
  const navigate = useNavigate();

  const [options, setOptions] = useState([]);
  const [historyOptions, setHistoryOptions] = useState([]);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    setHistoryOptions(saved);
  }, []);

  useEffect(() => {
    fetch(`${config.API_BASE_URL}/spareparts?per_page=1000`)
      .then(res => res.json())
      .then(data => {
        const parts = data.items || [];
        const groupedMap = {};

        parts.forEach(part => {
          const key = `${part.brand} ${part.vehicle_type} ${part.category}`.toLowerCase();

          if (!groupedMap[key]) {
            groupedMap[key] = {
              label: `${part.brand} ${part.vehicle_type} ${part.category}`,
              value: key,
              parts: [],
              searchableText: `${part.brand} ${part.vehicle_type} ${part.category}`.toLowerCase(),
              isGroup: true
            };
          }

          groupedMap[key].parts.push(part);
        });

        setOptions(Object.values(groupedMap));
      });
  }, []);

  const saveToHistory = useCallback((option) => {
    const updated = [
      {
        ...option,
        isHistory: true,
        searchableText: option.searchableText || option.label.toLowerCase()
      },
      ...historyOptions.filter(h => h.value !== option.value),
    ].slice(0, HISTORY_LIMIT);

    setHistoryOptions(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  }, [historyOptions]);

  const removeHistoryItem = useCallback((value) => {
    const updated = historyOptions.filter(h => h.value !== value);
    setHistoryOptions(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  }, [historyOptions]);

  const filterOption = (option, inputVal) => {
    if (option.data.isHistory && !inputVal) return true;
    if (!inputVal) return false;

    const words = inputVal.toLowerCase().trim().split(/\s+/);

    return words.every(word =>
      option.data.searchableText.includes(word)
    );
  };

  const handleInputChange = (value) => {
    setInputValue(value);
  };

  const handleSelect = (option) => {
    if (!option) return;

    saveToHistory(option);

    if (option.isGroup) {
      const [brand, vehicle_type, ...rest] = option.label.split(" ");
      const category = rest.join(" ");

      navigate(
        `/search-results?brand=${encodeURIComponent(brand)}&vehicle=${encodeURIComponent(vehicle_type)}&category=${encodeURIComponent(category)}`
      );
    } else {
      navigate(`/items/${option.value}`);
    }
  };

  const CustomOption = (props) => {
    const { data } = props;

    return (
      <components.Option {...props}>
        <div className="search-option">
          {data.isHistory && (
            <Clock className="clock-icon" size={16} strokeWidth={1.8} />
          )}

          <div className="option-main">
            <strong>
              {data.isGroup ? data.label : data.part?.name}
            </strong>

            <small>
              {data.part && `${data.part.brand} ${data.part.category} for ${data.part.vehicle_type}`}
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
            >
              <X size={16} strokeWidth={2} />
            </button>
          )}
        </div>
      </components.Option>
    );
  };

  const groupedOptions = [
    ...(historyOptions.length > 0 && !inputValue
      ? [{
          label: 'Recent Searches',
          options: historyOptions
        }]
      : []),

    ...(inputValue
      ? [{
          label: 'Categories',
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

      <div className="search-bar-wrapper">
        <Select
          autoFocus
          options={groupedOptions}
          isClearable
          placeholder="Search spare parts..."
          filterOption={filterOption}
          onChange={handleSelect}
          onInputChange={handleInputChange}
          inputValue={inputValue}
          components={{ Option: CustomOption }}
          styles={{
            container: (base) => ({ ...base, flex: 1 }),
            control: (base, state) => ({
              ...base,
              backgroundColor: '#fff',
              borderColor: state.isFocused ? 'rgb(0,64,128)' : '#ccc',
              boxShadow: state.isFocused ? '0 0 0 1px rgb(0,64,128)' : 'none',
              minHeight: '44px',
            }),
            menu: (base) => ({
              ...base,
              backgroundColor: '#1b1b1b',
              borderRadius: '10px',
              zIndex: 1000,
            }),
            option: (base, state) => ({
              ...base,
              backgroundColor: state.isFocused ? 'rgb(0,64,128)' : '#1b1b1b',
              color: state.isFocused ? '#fff' : '#ddd',
              padding: '12px 15px',
            }),
          }}
        />
      </div>
    </div>
  );
};

export default SearchBar;