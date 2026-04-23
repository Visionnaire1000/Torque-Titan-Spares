import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AdminSpareparts from "../../../components/admin/AdminSpareparts";

/* ---------------- MOCKS ---------------- */

const authFetchMock = vi.fn();

/* react-select mocked to avoid async + act issues */
vi.mock("react-select", () => ({
  default: ({ onChange }) => (
    <div>
      <button
        onClick={() =>
          onChange({
            label: "Toyota Car BrakePad",
            value: 1,
            part: {
              id: 1,
              brand: "Toyota",
              vehicle_type: "Car",
              category: "BrakePad",
              colour: "Black",
              buying_price: 1000,
              marked_price: 1500,
              image: "img.jpg",
              description: "Test part",
            },
          })
        }
      >
        Select Part
      </button>
    </div>
  ),
}));

vi.mock("lucide-react", () => ({
  Clock: () => <span />,
  X: () => <span />,
}));

vi.mock("../../../config", () => ({
  default: { API_BASE_URL: "http://test-api" },
}));

vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({
    authFetch: authFetchMock,
  }),
}));

vi.mock("react-router-dom", () => ({
  Link: ({ children }) => <div>{children}</div>,
}));

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  ToastContainer: () => <div />,
}));

/* ---------------- LOCALSTORAGE MOCK ---------------- */

beforeEach(() => {
  vi.clearAllMocks();

  const store = {};

  global.localStorage = {
    getItem: vi.fn((k) => store[k] || null),
    setItem: vi.fn((k, v) => (store[k] = v)),
    clear: vi.fn(() => Object.keys(store).forEach((k) => delete store[k])),
  };

  authFetchMock.mockResolvedValue({
    json: async () => ({
      items: [
        {
          id: 1,
          brand: "Toyota",
          vehicle_type: "Car",
          category: "BrakePad",
        },
      ],
    }),
  });
});

/* ---------------- TESTS ---------------- */

describe("AdminSpareparts", () => {
  it("selects a spare part and fills form", async () => {
    render(<AdminSpareparts />);

    fireEvent.click(screen.getByText(/select part/i));

    expect(await screen.findByDisplayValue("Toyota")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Car")).toBeInTheDocument();
    expect(screen.getByDisplayValue("BrakePad")).toBeInTheDocument();
  });

  it("creates spare part successfully", async () => {
    authFetchMock.mockResolvedValueOnce({
      json: async () => ({ message: "Created" }),
    });

    render(<AdminSpareparts />);

    fireEvent.click(screen.getByText(/create/i));

    await waitFor(() => {
      expect(authFetchMock).toHaveBeenCalledWith(
        "http://test-api/admin/spareparts",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("updates spare part successfully", async () => {
    authFetchMock.mockResolvedValueOnce({
      json: async () => ({ message: "Updated" }),
    });

    render(<AdminSpareparts />);

    fireEvent.click(screen.getByText(/select part/i));
    fireEvent.click(screen.getByText(/update/i));

    await waitFor(() => {
      expect(authFetchMock).toHaveBeenCalledWith(
        "http://test-api/admin/spareparts/1",
        expect.objectContaining({ method: "PUT" })
      );
    });
  });

  it("deletes spare part successfully", async () => {
    authFetchMock.mockResolvedValueOnce({
      json: async () => ({ message: "Deleted" }),
    });

    render(<AdminSpareparts />);

    fireEvent.click(screen.getByText(/select part/i));
    fireEvent.click(screen.getByText(/delete/i));

    await waitFor(() => {
      expect(authFetchMock).toHaveBeenCalledWith(
        "http://test-api/admin/spareparts/1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });
});