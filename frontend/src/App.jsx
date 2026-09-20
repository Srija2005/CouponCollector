import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AddCoupon from "./pages/AddCoupon";
import EditCoupon from "./pages/EditCoupon";
import Profile from "./pages/Profile";

import "./App.css";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Home />} />

        <Route path="/register" element={<Register />} />

        <Route path="/login" element={<Login />} />

        <Route path="/add-coupon" element={<AddCoupon />} />

        <Route path="/edit/:id" element={<EditCoupon />} />

        <Route path="/profile" element={<Profile />} />

        <Route
          path="/coupons"
          element={<Navigate to="/profile" replace />}
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;