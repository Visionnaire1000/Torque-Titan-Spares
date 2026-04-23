import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SedanTyres from "../../../components/categories/SedanTyres";
import { MemoryRouter } from "react-router-dom";

/* ---------------- MOCKS ---------------- */

vi.mock("../../../config", () => ({
  default: { API_BASE_URL: "http://test-api" },
}));

global.fetch = vi.fn();

const addItemMock = vi.fn();

vi.mock("../../../contexts/CartContext", () => ({
  useCart: () => ({
    addItem: addItemMock,
  }),
}));

/* ---------------- WRAPPER ---------------- */

const renderComponent = () =>
  render(
    <MemoryRouter>
      <SedanTyres />
    </MemoryRouter>
  );

/* ---------------- TEST DATA ---------------- */

const mockData = {
  items: [
    {
      id: 1,
      brand: "Michelin",
      category: "tyre",
      vehicle_type: "sedan",
      buying_price: 20000,
      image: "/test.jpg",
    },
  ],
  pages: 1,
};

/* ---------------- SETUP ---------------- */

beforeEach(() => {
  vi.clearAllMocks();

  fetch.mockResolvedValue({
    ok: true,
    json: async () => mockData,
  });
});

/* ---------------- TESTS ---------------- */

describe("SedanTyres", () => {
  it("renders loading state initially", () => {
    fetch.mockImplementation(() => new Promise(() => {}));

    renderComponent();

    expect(document.querySelector(".products-page")).toBeInTheDocument();
  });

  it("renders fetched tyres", async () => {
    renderComponent();

    expect(await screen.findByText(/michelin/i)).toBeInTheDocument();
  });

  it("filters by brand", async () => {
    renderComponent();

    await screen.findByText(/michelin/i);

    const selects = screen.getAllByRole("combobox");

    const brandSelect =
      selects.find((el) =>
        el.closest("div")?.textContent?.toLowerCase().includes("brand")
      ) || selects[0];

    // wrap state-triggering event in waitFor
    await waitFor(() => {
      fireEvent.change(brandSelect, {
        target: { value: "Michelin" },
      });
    });

    expect(brandSelect.value).toBe("Michelin");
  });

  it("adds item to cart", async () => {
    renderComponent();

    const button = await screen.findByRole("button", {
      name: /add to cart/i,
    });

    await waitFor(() => {
      fireEvent.click(button);
    });

    expect(addItemMock).toHaveBeenCalledTimes(1);
  });

  it("shows error state when fetch fails", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    renderComponent();

    expect(
      await screen.findByText(/something went wrong/i)
    ).toBeInTheDocument();
  });
});