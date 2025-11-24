import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import ChartPage from "./components/ChartPage";
import Home from "./components/Home";
import NotFound from "./components/NotFound";
// Example pages




// Main App Component
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chart" element={<ChartPage />} />
        {/* <Route path="*" element={<NotFound />} /> */}
        <Route path="*" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;