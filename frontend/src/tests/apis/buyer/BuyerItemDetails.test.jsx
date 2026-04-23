import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BuyerItemDetails from "../../../components/BuyerItemDetails";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/* ---------------- MOCKS ---------------- */

// config
vi.mock("../../../config", () => ({
  default: { API_BASE_URL: "http://test-api" },
}));

// toast (NO external variables → no hoisting issue)
vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// cart
const addItemMock = vi.fn();
vi.mock("../../../contexts/CartContext", () => ({
  useCart: () => ({ addItem: addItemMock }),
}));

// auth
const authFetchMock = vi.fn();
vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1 },
    authFetch: authFetchMock,
  }),
}));

/* ---------------- HELPERS ---------------- */

const renderComponent = () =>
  render(
    <MemoryRouter initialEntries={["/item/1"]}>
      <Routes>
        <Route path="/item/:id" element={<BuyerItemDetails />} />
      </Routes>
    </MemoryRouter>
  );

/* ---------------- DATA ---------------- */

const mockItem = {
  id: 1,
  brand: "Toyota",
  category: "Brake Pad",
  vehicle_type: "Car",
  buying_price: 5000,
  discount_percentage: 10,
  description: "High quality brake pad",
  image: "img.jpg",
  average_rating: 4,
};

const mockReviews = [
  {
    id: 10,
    user_id: 2,
    rating: 4,
    comment: "Good product",
    total_likes: 2,
    total_dislikes: 1,
    likes: [],
    created_at: new Date().toISOString(),
    user_display_name: "John",
  },
];

/* ---------------- SETUP ---------------- */

beforeEach(() => {
  vi.clearAllMocks();

  global.fetch = vi.fn((url) => {
    if (url.includes("/spareparts/")) {
      return Promise.resolve({
        ok: true,
        json: async () => mockItem,
      });
    }
    if (url.includes("/reviews/")) {
      return Promise.resolve({
        ok: true,
        json: async () => mockReviews,
      });
    }
  });

  authFetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({
      review: { total_likes: 3, total_dislikes: 0 },
    }),
  });
});

/* ---------------- TESTS ---------------- */

describe("BuyerItemDetails", () => {
  it("renders item details", async () => {
    renderComponent();

    expect(await screen.findByText(/Toyota Brake Pad/i)).toBeInTheDocument();
    expect(screen.getByText(/KES 5,000/i)).toBeInTheDocument();
  });

  it("renders reviews", async () => {
    renderComponent();

    expect(await screen.findByText(/Good product/i)).toBeInTheDocument();
    expect(screen.getByText(/John/i)).toBeInTheDocument();
  });

  it("adds item to cart", async () => {
    renderComponent();

    const btn = await screen.findByText(/Add To Cart/i);
    fireEvent.click(btn);

    expect(addItemMock).toHaveBeenCalledWith(mockItem);
  });

  it("submits review", async () => {
    renderComponent();

    const textarea = await screen.findByPlaceholderText(/Write a comment/i);

    fireEvent.change(textarea, {
      target: { value: "Nice product" },
    });

    fireEvent.click(screen.getByText(/Submit Review/i));

    await waitFor(() => {
      expect(authFetchMock).toHaveBeenCalled();
    });
  });

  it("handles fetch error + retry", async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false }));

    renderComponent();

    expect(await screen.findByText(/Something went wrong/i)).toBeInTheDocument();

    // restore success
    global.fetch = vi.fn((url) => {
      if (url.includes("/spareparts/")) {
        return Promise.resolve({ ok: true, json: async () => mockItem });
      }
      return Promise.resolve({ ok: true, json: async () => mockReviews });
    });

    fireEvent.click(screen.getByText(/Retry/i));

    expect(await screen.findByText(/Toyota Brake Pad/i)).toBeInTheDocument();
  });

  it("reacts to review (like)", async () => {
    renderComponent();

    await screen.findByText(/Good product/i);

    const likeBtn = screen
      .getAllByRole("button")
      .find((btn) => btn.textContent.includes("2"));

    fireEvent.click(likeBtn);

    await waitFor(() => {
      expect(authFetchMock).toHaveBeenCalled();
    });
  });
});