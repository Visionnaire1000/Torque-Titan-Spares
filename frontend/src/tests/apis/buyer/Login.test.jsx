import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Login from "../../../components/Login";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/* ---------------- MOCK NAVIGATION ---------------- */

const navigateMock = vi.fn();
let locationMock = { state: {} };

/* ---------------- DYNAMIC AUTH STATE ---------------- */

let authState = {
  login: vi.fn(),
  isLoading: false,
  user: null,
  isAuthenticated: false,
};

/* ---------------- MOCKS ---------------- */

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => locationMock,
  };
});

vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

/* ---------------- SETUP ---------------- */

beforeEach(() => {
  vi.clearAllMocks();

  authState = {
    login: vi.fn(),
    isLoading: false,
    user: null,
    isAuthenticated: false,
  };

  locationMock = { state: {} };
});

/* ---------------- RENDER ---------------- */

const renderComponent = () =>
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Login />} />
      </Routes>
    </MemoryRouter>
  );

/* ---------------- TESTS ---------------- */

describe("Login Component", () => {
  it("renders login form", () => {
    renderComponent();
    expect(screen.getByText(/Sign in to your account/i)).toBeInTheDocument();
  });

  it("updates input values", () => {
    renderComponent();

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "test@gmail.com" },
    });

    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "123456" },
    });

    expect(screen.getByDisplayValue("test@gmail.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("123456")).toBeInTheDocument();
  });

  it("calls login on submit", async () => {
    renderComponent();

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "test@gmail.com" },
    });

    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "Password@1" },
    });

    fireEvent.click(screen.getByText(/Login/i));

    await waitFor(() => {
      expect(authState.login).toHaveBeenCalledWith(
        "test@gmail.com",
        "Password@1"
      );
    });
  });

  it("redirects normal user after login", async () => {
    authState = {
      ...authState,
      user: { role: "user" },
      isAuthenticated: true,
    };

    renderComponent();

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/", {
        replace: true,
      });
    });
  });

  it("redirects admin user to /admin", async () => {
    authState = {
      ...authState,
      user: { role: "admin" },
      isAuthenticated: true,
    };

    renderComponent();

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/admin", {
        replace: true,
      });
    });
  });

  it("redirects to previous page if available", async () => {
    locationMock = {
      state: { from: "/checkout" },
    };

    authState = {
      ...authState,
      user: { role: "user" },
      isAuthenticated: true,
    };

    renderComponent();

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/checkout", {
        replace: true,
      });
    });
  });
});