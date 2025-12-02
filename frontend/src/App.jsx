import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

//  Toast Container import
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; 

//contexts
import { CartProvider } from "./contexts/CartContext";

//protected routes component
import RoleProtectedRoutes from "./components/RoleProtectedRoutes"; 

//layout
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

//pages
import Register from "./components/Register";
import Login from "./components/Login";
import Cart from "./components/Cart";
import Homepage from "./components/Homepage";
import Checkout from "./components/Checkout"; 
import Stripe from "./components/Stripe";  


function App() {
  return (
   <CartProvider>
      <Router>
        <div className="min-h-screen flex flex-col font-sans">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/register" element={<Register />} /> 
              <Route path="/login" element={<Login />} /> 
              <Route path="/" element={<Homepage />} />  
              <Route 
                  path="/cart" 
                  element={
                     <RoleProtectedRoutes allowedRoles={['buyer']}>
                        <Cart />
                    </RoleProtectedRoutes>
                  } 
              />
              <Route 
                  path="/checkout" 
                  element={
                     <RoleProtectedRoutes allowedRoles={['buyer']}>
                        <Checkout />
                    </RoleProtectedRoutes>
                  } 
              />
              <Route 
                  path="/payment" 
                  element={
                     <RoleProtectedRoutes allowedRoles={['buyer']}>
                        <Stripe />
                    </RoleProtectedRoutes>
                  } 
              />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />
    </CartProvider>
  );
}

export default App;

