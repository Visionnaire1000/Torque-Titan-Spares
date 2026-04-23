import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SearchResults from "../../../components/SearchResults";
import { MemoryRouter } from "react-router-dom";

/* ---------------- MOCKS ---------------- */

const addItemMock = vi.fn();

/* mock useLocation */
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useLocation: () => ({
      search: "?brand=Toyota&vehicle=Car&category=BrakePad",
    }),
  };
});

/* config */
vi.mock("../../../config", () => ({
  default: {
    API_BASE_URL: "http://test-api",
  },
}));

/* cart context */
vi.mock("../../../contexts/CartContext", () => ({
  useCart: () => ({
    addItem: addItemMock,
  }),
}));

/* fetch */
global.fetch = vi.fn();

/* ---------------- SETUP ---------------- */

beforeEach(() => {
  vi.clearAllMocks();

  fetch.mockResolvedValue({
    json: async () => ({
      items: [
        {
          id: 1,
          brand: "Toyota",
          category: "BrakePad",
          vehicle_type: "Car",
          buying_price: 5000,
          discount_percentage: 10,
          image: "test.jpg",
        },
      ],
    }),
  });
});

/* ---------------- RENDER ---------------- */

const renderComponent = () =>
  render(
    <MemoryRouter>
      <SearchResults />
    </MemoryRouter>
  );

/* ---------------- TESTS ---------------- */

describe("SearchResults", () => {
  it("renders loading skeleton initially", async () => {
    renderComponent();

    await waitFor(() => {
      expect(document.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
    });
  });

  it("fetches spare parts from API", async () => {
    renderComponent();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "http://test-api/spareparts?per_page=1000"
      );
    });
  });

  it("renders results after fetch", async () => {
    renderComponent();

    const item = await screen.findByText(/toyota brakepad for car/i);

    expect(item).toBeInTheDocument();
  });

  it("shows no results message when API returns empty", async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({ items: [] }),
    });

    renderComponent();

    expect(await screen.findByText(/no items found/i)).toBeInTheDocument();
  });

  it("adds item to cart when button clicked", async () => {
    renderComponent();

    const button = await screen.findByText(/add to cart/i);

    fireEvent.click(button);

    expect(addItemMock).toHaveBeenCalledTimes(1);
  });
});