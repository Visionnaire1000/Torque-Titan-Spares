import { useEffect, useState, useCallback, useMemo } from "react";
import Select, { components } from "react-select";
import { Clock } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../../contexts/AuthContext";
import config from "../../config";
import "../../styles/admin/adminSpares.css";

const HISTORY_KEY = "spareparts_history";
const HISTORY_LIMIT = 6;

const AdminSpareParts = () => {
  const { authFetch } = useAuth();

  const [options, setOptions] = useState([]);
  const [historyOptions, setHistoryOptions] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedPart, setSelectedPart] = useState(null);

  const [formData, setFormData] = useState({
    category: "",
    vehicle_type: "",
    brand: "",
    colour: "",
    buying_price: "",
    marked_price: "",
    image: "",
    description: "",
  });

  /* ---------------- Load history ---------------- */
  const reloadHistory = useCallback(() => {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    setHistoryOptions(saved);
  }, []);

  useEffect(() => {
    reloadHistory();
  }, [reloadHistory]);

  /* ---------------- Fetch spare parts ---------------- */
  const fetchSpareParts = useCallback(() => {
    authFetch(`${config.API_BASE_URL}/spareparts?per_page=1000`)
      .then(res => res.json())
      .then(data => {
        const parts = data.items || [];
        const mapped = parts.map(part => {
          const displayLabel = `${part.brand} ${part.vehicle_type} ${part.category}`;
          return {
            label: displayLabel,
            value: part.id,
            searchableText: `
              ${part.brand}
              ${part.vehicle_type}
              ${part.category}
            `.toLowerCase(),
            part,
            isHistory: false
          };
        });
        setOptions(mapped);
      });
  }, [authFetch]);

  useEffect(() => {
    fetchSpareParts();
  }, [fetchSpareParts]);

  /* ---------------- Save to history ---------------- */
  const saveToHistory = useCallback((option) => {
    setHistoryOptions(prev => {
      const updated = [{ ...option, isHistory: true }, ...prev.filter(h => h.value !== option.value)].slice(0, HISTORY_LIMIT);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  /* ---------------- Remove history item ---------------- */
  const removeHistoryItem = useCallback((value) => {
    setHistoryOptions(prev => {
      const updated = prev.filter(h => h.value !== value);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  /* ---------------- Filtering ---------------- */
  const filterOption = (option, inputVal) => {
    if (option.data.isHistory && !inputVal) return true;
    if (!inputVal) return false;

    const words = inputVal.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return words.every(word => option.data.searchableText.includes(word));
  };

  /* ---------------- Handlers ---------------- */
  const handleInputChange = (value) => setInputValue(value);

  const handleSelect = (option) => {
    if (!option) return;
    saveToHistory(option);
    setSelectedPart(option.part);

    // Autofill form
    setFormData({
      category: option.part.category || "",
      vehicle_type: option.part.vehicle_type || "",
      brand: option.part.brand || "",
      colour: option.part.colour || "",
      buying_price: option.part.buying_price || "",
      marked_price: option.part.marked_price || "",
      image: option.part.image || "",
      description: option.part.description || "",
    });
  };

  /* ---------------- Custom Option ---------------- */
  const CustomOption = (props) => {
    const { data } = props;
    return (
      <components.Option {...props}>
        <div className="search-option">
          {data.isHistory && <Clock className="clock-icon" size={16} strokeWidth={1.8} />}
          <div className="option-main">
            <strong>{data.part.brand} {data.part.vehicle_type} {data.part.category}</strong>
            {data.isHistory && <span className="history-tag">Recent</span>}
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
  const groupedOptions = useMemo(() => {
    const groups = [];
    if (historyOptions.length && !inputValue) {
      groups.push({
        label: "Recent Searches",
        options: historyOptions.map(item => ({
          ...item,
          isHistory: true,
          label: `${item.part.brand} ${item.part.vehicle_type} ${item.part.category}`
        }))
      });
    }
    if (inputValue) {
      groups.push({ label: "All Results", options });
    }
    return groups;
  }, [historyOptions, inputValue, options]);

  /* ---------------- Toast helpers ---------------- */
  const notifySuccess = (msg) => toast.success(msg, { position: "top-right" });
  const notifyError = (msg) => toast.error(msg, { position: "top-right" });

  /* ---------------- Form handlers ---------------- */
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch(`${config.API_BASE_URL}/admin/spareparts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.message) {
        notifySuccess(data.message);

        // REFRESH options to include new part
        fetchSpareParts();

        // Update history
        reloadHistory();
      } else notifyError(data.error);
    } catch {
      notifyError("Error creating spare part");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedPart) return notifyError("Select a spare part first");

    try {
      const res = await authFetch(`${config.API_BASE_URL}/admin/spareparts/${selectedPart.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.message) {
        notifySuccess(data.message);

        // Update history if exists
        setHistoryOptions(prev => {
          const updated = prev.map(h =>
            h.value === selectedPart.id ? { ...h, part: { ...formData, id: selectedPart.id } } : h
          );
          localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
          return updated;
        });

        // Refresh options to reflect update
        fetchSpareParts();
      } else notifyError(data.error);
    } catch {
      notifyError("Error updating spare part");
    }
  };

  const handleDelete = async () => {
    if (!selectedPart) return notifyError("Select a spare part first");
    try {
      const res = await authFetch(`${config.API_BASE_URL}/admin/spareparts/${selectedPart.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.message) {
        notifySuccess(data.message);
        setHistoryOptions(prev => {
          const updated = prev.filter(h => h.value !== selectedPart.id);
          localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
          return updated;
        });
        setSelectedPart(null);
        setFormData({
          category: "",
          vehicle_type: "",
          brand: "",
          colour: "",
          buying_price: "",
          marked_price: "",
          image: "",
          description: "",
        });

        // Refresh options after deletion
        fetchSpareParts();
      } else notifyError(data.error);
    } catch {
      notifyError("Error deleting spare part");
    }
  };

  return (
    <div className="admin-spareparts">
      <ToastContainer />
      <h2>Manage Spare Parts</h2>

      {/* SEARCH */}
      <Select
        autoFocus
        options={groupedOptions}
        isClearable
        placeholder="Search spare part..."
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
            borderColor: state.isFocused ? 'rgb(0,64,128)' : '#ccc',
            boxShadow: state.isFocused ? '0 0 0 1px rgb(0,64,128)' : 'none',
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
            backgroundColor: state.isFocused ? 'rgb(0,64,128)' : '#1b1b1b',
            color: state.isFocused ? '#fff' : '#ddd',
            padding: '12px 15px',
            cursor: 'pointer',
          }),
        }}
      />

      {/* IMAGE PREVIEW */}
      {formData.image && (
        <div className="spare-image-preview">
          <img src={formData.image} alt={`${formData.brand} ${formData.vehicle_type}`} />
        </div>
      )}

      {/* FORM */}
      <form className="spare-form">
        <input name="category" placeholder="Category" value={formData.category} onChange={handleChange} />
        <input name="vehicle_type" placeholder="Vehicle Type" value={formData.vehicle_type} onChange={handleChange} />
        <input name="brand" placeholder="Brand" value={formData.brand} onChange={handleChange} />
        <input name="colour" placeholder="Colour" value={formData.colour} onChange={handleChange} />
        <input name="buying_price" type="number" placeholder="Buying Price" value={formData.buying_price} onChange={handleChange} />
        <input name="marked_price" type="number" placeholder="Marked Price" value={formData.marked_price} onChange={handleChange} />
        <input name="image" placeholder="Image URL" value={formData.image} onChange={handleChange} />
        <textarea name="description" placeholder="Description" value={formData.description} onChange={handleChange} />

        <div className="actions">
          <button onClick={handleCreate} id="create">Create</button>
          <button onClick={handleUpdate} id="edit">Update</button>
          <button type="button" onClick={handleDelete} id="delete">Delete</button>
        </div>
      </form>
    </div>
  );
};

export default AdminSpareParts;