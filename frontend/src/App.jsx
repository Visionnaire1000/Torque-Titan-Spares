import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import 'react-toastify/dist/ReactToastify.css';

//layout
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

//contexts
import { CartProvider } from "./contexts/CartContext";

//pages
import Register from "./components/Register";
import Login from "./components/Login";
import Homepage from "./components/Homepage";

//style
import "./App.css";

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
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;