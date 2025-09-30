import { BrowserRouter as Router} from "react-router-dom";
import 'react-toastify/dist/ReactToastify.css';

//layout
import Navbar from "./components/Navbar";

//contexts
import { CartProvider } from "./contexts/CartContext";
//style
import "./App.css";

function App() {
  return (
    <CartProvider>
      <Router>
        <div className="min-h-screen flex flex-col font-sans">
          <Navbar />
          <Footer />
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;