import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginRegister from "./Components/LoginRegister/LoginRegister";
import Dashboard from "./dashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginRegister />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;