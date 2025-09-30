import { BrowserRouter as Router} from "react-router-dom";
import 'react-toastify/dist/ReactToastify.css';

//layout
import Navbar from "./components/Navbar";

//style
import "./App.css";

function App() {
  return (
      <Router>
        <div className="min-h-screen flex flex-col font-sans">
          <Navbar />
        </div>
      </Router>
  );
}

export default App;