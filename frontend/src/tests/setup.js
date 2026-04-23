import "@testing-library/jest-dom";

/* -------------------------------
   Silence React 18 act warnings
   (safe for test environments only)
-------------------------------- */

const originalError = console.error;

console.error = (...args) => {
  const msg = args[0];

  // Ignore React act warnings (known noise in async tests)
  if (
    typeof msg === "string" &&
    msg.includes("not wrapped in act")
  ) {
    return;
  }

  originalError(...args);
};