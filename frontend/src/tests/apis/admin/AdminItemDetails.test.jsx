import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AdminItemDetails from "../../../components/admin/AdminItemDetails";

/* ---------------- MOCKS ---------------- */

const authFetchMock = vi.fn();

/* router params */
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ id: "1" }),
  };
});

/* config */
vi.mock("../../../config", () => ({
  default: { API_BASE_URL: "http://test-api" },
}));

/* toast */
vi.mock("react-toastify", () => ({
  toast: { error: vi.fn() },
}));

/* auth context */
vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 10, role: "admin" },
    authFetch: authFetchMock,
  }),
}));

/* ---------------- DATA ---------------- */

const itemMock = {
  id: 1,
  brand: "Toyota",
  category: "BrakePad",
  vehicle_type: "Car",
  buying_price: 5000,
  discount_percentage: 10,
  image: "test.jpg",
  description: "High quality brake pad",
  average_rating: 4.2,
};

/* ---------------- SETUP ---------------- */

beforeEach(() => {
  vi.clearAllMocks();

  authFetchMock.mockImplementation((url) => {
    if (url.includes("/spareparts/")) {
      return Promise.resolve({
        ok: true,
        json: async () => itemMock,
      });
    }

    if (url.includes("/admin/reviews")) {
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    }

    return Promise.reject(new Error("Failed"));
  });
});

/* ---------------- RENDER ---------------- */

const renderComponent = () =>
  render(
    <MemoryRouter>
      <AdminItemDetails />
    </MemoryRouter>
  );

/* ---------------- TESTS ---------------- */

describe("AdminItemDetails", () => {
  it("shows skeleton initially", () => {
    renderComponent();
    expect(document.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
  });

  it("fetches item and reviews", async () => {
    renderComponent();

    await waitFor(() => {
      expect(authFetchMock).toHaveBeenCalledWith(
        "http://test-api/spareparts/1"
      );
      expect(authFetchMock).toHaveBeenCalledWith(
        "http://test-api/admin/reviews/sparepart/1"
      );
    });
  });

  it("renders item details after load", async () => {
    renderComponent();

    expect(
      await screen.findByText(/toyota brakepad for car/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/high quality brake pad/i)
    ).toBeInTheDocument();
  });

  it("retry works on error", async () => {
    /* silence expected async error noise */
    const originalError = console.error;
    console.error = () => {};

    authFetchMock.mockRejectedValueOnce(new Error("Failed"));

    renderComponent();

    const btn = await screen.findByText(/retry/i);
    fireEvent.click(btn);

    await waitFor(() => {
      expect(authFetchMock).toHaveBeenCalled();
    });

    console.error = originalError;
  });
});