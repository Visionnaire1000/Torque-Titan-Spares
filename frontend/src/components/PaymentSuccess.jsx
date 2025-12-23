import { useEffect, useRef } from "react";
import { useCart } from "../contexts/CartContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../styles/paymentSuccess.css";

const PaymentSuccess = () => {
  const { clearCart } = useCart();
  const hasRun = useRef(false); // track if effect has already run

  useEffect(() => {
    if (hasRun.current) return; // skip if already run
    hasRun.current = true;

    clearCart();
    toast.success("Payment Successful.", {
      autoClose: 6000, 
    });
  }, []);

};

export default PaymentSuccess;
