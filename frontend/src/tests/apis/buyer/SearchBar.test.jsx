import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SearchBar from "../../../components/SearchBar";
import { MemoryRouter } from "react-router-dom";

/* ---------------- MOCKS ---------------- */

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("../../../config", () => ({
  default: {
    API_BASE_URL: "http://test-api",
  },
}));

vi.mock("react-select", () => {
  return {
    default: ({ onInputChange, onChange }) => (
      <div>
        <input
          placeholder="Search spare parts..."
          onChange={(e) => onInputChange?.(e.target.value)}
        />
        <button
          onClick={() =>
            onChange({
              isGroup: true,
              label: "Toyota Car BrakePad",
              value: "toyota-car-brakepad",
            })
          }
        >
          select
        </button>
      </div>
    ),
    components: {
      Option: ({ children }) => <div>{children}</div>,
    },
  };
});

/* mock fetch */
global.fetch = vi.fn();

/* ---------------- SETUP ---------------- */

beforeEach(() => {
  vi.clearAllMocks();

  fetch.mockResolvedValue({
    json: async () => ({
      items: [
        {
          brand: "Toyota",
          vehicle_type: "Car",
          category: "BrakePad",
        },
      ],
    }),
  });
});

/* ---------------- TESTS ---------------- */

const renderComponent = () =>
  render(
    <MemoryRouter>
      <SearchBar />
    </MemoryRouter>
  );

describe("SearchBar", () => {
  it("renders search input", async () => {
    renderComponent();

    expect(
      await screen.findByPlaceholderText(/search spare parts/i)
    ).toBeInTheDocument();
  });

  it("fetches spare parts", async () => {
    renderComponent();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "http://test-api/spareparts?per_page=1000"
      );
    });
  });

  it("handles input change", async () => {
    renderComponent();

    const input = await screen.findByPlaceholderText(/search spare parts/i);

    fireEvent.change(input, {
      target: { value: "toyota" },
    });

    expect(input.value).toBe("toyota");
  });

  it("navigates on select", async () => {
    renderComponent();

    fireEvent.click(screen.getByText("select"));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled();
    });
  });
});