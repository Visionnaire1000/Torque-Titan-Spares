import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AdminManagement from "../../../components/admin/adminDashboard/AdminManagement";

/* ---------------- MOCKS ---------------- */

const authFetchMock = vi.fn();

/* auth context */
vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { role: "super_admin" },
    authFetch: authFetchMock,
  }),
}));

/* config */
vi.mock("../../../config", () => ({
  default: { API_BASE_URL: "http://test-api" },
}));

/* icons */
vi.mock("lucide-react", () => ({
  Eye: () => <span />,
  EyeOff: () => <span />,
}));

/* toast */
vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  ToastContainer: () => <div />,
}));

/* ---------------- DATA ---------------- */

const adminsMock = [
  { id: 1, email: "admin1@test.com" },
  { id: 2, email: "admin2@test.com" },
];

/* ---------------- SETUP ---------------- */

beforeEach(() => {
  vi.clearAllMocks();

  authFetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ admins: adminsMock }),
  });
});

/* ---------------- TESTS ---------------- */

describe("AdminManagement", () => {
  it("renders create admin form", () => {
    render(<AdminManagement />);

    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  });

  it("fetches admins on mount", async () => {
    render(<AdminManagement />);

    await waitFor(() => {
      expect(authFetchMock).toHaveBeenCalledWith(
        "http://test-api/admin/admins"
      );
    });
  });
});