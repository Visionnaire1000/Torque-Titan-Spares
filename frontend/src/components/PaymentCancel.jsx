import { useEffect, useRef } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const PaymentCancel = () => {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    toast.error("Payment cancelled. No charges were made.", {
      autoClose: 4000, 
    });
  }, []);
};

export default PaymentCancel;
