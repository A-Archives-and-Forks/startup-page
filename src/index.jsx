import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes} from "react-router-dom";
import "./assets/styles/index.css";

// views without layouts
import IndexPage from "./views/Index.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<IndexPage />} />
      </Routes>
    </HashRouter>
  </StrictMode>
);
