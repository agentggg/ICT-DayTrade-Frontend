import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import ChartPage from "./components/ChartPage";
import Home from "./components/Home";
import NotFound from "./components/NotFound";
import FvgPage from "./components/FvgPage";
import ObPage from "./components/ObPage";

// Main App Component
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chart" element={<ChartPage />} />
        <Route path="/fvg" element={<FvgPage />} />
        <Route path="/ObPage" element={<ObPage />} />
        {/* <Route path="*" element={<NotFound />} /> */}
        <Route path="*" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;