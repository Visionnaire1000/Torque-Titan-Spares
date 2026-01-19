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
import ItemDetails from "./components/ItemDetails";
import SearchBar from './components/SearchBar';
import StripeCheckout from "./components/StripeCheckout";
import PaymentSuccess from "./components/PaymentSuccess"; 
import PaymentCancel from "./components/PaymentCancel"; 

//pages(categories)
import SedanTyres from "./components/categories/SedanTyres";
import SUVTyres from "./components/categories/SUVTyres";
import TruckTyres from "./components/categories/TruckTyres";
import BusTyres from "./components/categories/BusTyres";
/*import SedanRims from "./components/categories/SedanRims";
import SUVRims from "./components/categories/SUVRims";
import TruckRims from "./components/categories/TruckRims";
import BusRims from "./components/categories/BusRims";
import SedanBatteries from "./components/categories/SedanBatteries";
import SUVBatteries from "./components/categories/SUVBatteries";
import TruckBatteries from "./components/categories/TruckBatteries";
import BusBatteries from "./components/categories/BusBatteries";
import SedanFilters from "./components/categories/SedanFilters";
import SUVFilters from "./components/categories/SUVFilters";
import TruckFilters from "./components/categories/TruckFilters";
import BusFilters from "./components/categories/BusFilters"; */
 

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
              <Route path="/items/:id" element={<ItemDetails />} /> 
              <Route path="/search" element={<SearchBar />} />
              <Route 
                  path="/checkout" 
                  element={
                     <RoleProtectedRoutes allowedRoles={['buyer']}>
                        <StripeCheckout />
                    </RoleProtectedRoutes>
                  } 
              />
              <Route 
                  path="/payment-success" 
                  element={
                      <RoleProtectedRoutes allowedRoles={['buyer']}>
                         <PaymentSuccess />
                      </RoleProtectedRoutes>
                      }
              />
               <Route 
                  path="/payment-cancel" 
                  element={
                      <RoleProtectedRoutes allowedRoles={['buyer']}>
                         <PaymentCancel />
                      </RoleProtectedRoutes>
                      }
              /> 

              {/*categories */}
              <Route path="/sedan-tyres" element={<SedanTyres />} />
              <Route path="/suv-tyres" element={<SUVTyres />} />
              <Route path="/truck-tyres" element={<TruckTyres />} />
              <Route path="/bus-tyres" element={<BusTyres />} />
            </Routes>
             {/*<Route path="/sedan-rims" element={<SedanRims />} />
              <Route path="/suv-rims" element={<SUVRims />} />
              <Route path="/truck-rims" element={<TruckRims />} />
              <Route path="/bus-rims" element={<BusRims />} />
              <Route path="/sedan-batteries" element={<SedanBatteries />} />
              <Route path="/suv-batteries" element={<SUVBatteries />} />
              <Route path="/truck-batteries" element={<TruckBatteries />} />
              <Route path="/bus-batteries" element={<BusBatteries />} />
              <Route path="/sedan-filters" element={<SedanFilters />} />
              <Route path="/suv-filters" element={<SUVFilters />} />
              <Route path="/truck-filters" element={<TruckFilters />} />
              <Route path="/bus-filters" element={<BusFilters />} />  */}
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

