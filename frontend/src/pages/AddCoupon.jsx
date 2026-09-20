import { useState } from "react";
import { useNavigate } from "react-router-dom";

function AddCoupon() {

  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const navigate = useNavigate();

  async function addCoupon(e) {

    e.preventDefault();

    if (!code || !discount || !expiryDate) {
      alert("Please fill all the fields");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {

      alert("Please login as admin first.");

      navigate("/login");

      return;
    }

    try {

      const response = await fetch(
        "http://localhost:5000/coupons",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
          },

          body: JSON.stringify({
            code: code,
            discount: Number(discount),
            expiryDate: expiryDate
          })
        }
      );

      const data = await response.json();

      if (response.ok) {

        alert("Coupon added successfully!");

        setCode("");
        setDiscount("");
        setExpiryDate("");

        navigate("/coupons");

      } else {

        alert(data.message || "Failed to add coupon");

      }

    } catch (error) {

      console.log("Add coupon error:", error);

      alert("Cannot connect to backend.");

    }
  }

  return (
    <div className="container">

      <h1>Add Coupon</h1>

      <form onSubmit={addCoupon}>

        <input
          type="text"
          placeholder="Coupon Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />

        <br />
        <br />

        <input
          type="number"
          placeholder="Discount %"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          min="1"
          max="100"
          required
        />

        <br />
        <br />

        <input
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          required
        />

        <br />
        <br />

        <button type="submit">
          Add Coupon
        </button>

        <button
          type="button"
          onClick={() => navigate("/coupons")}
        >
          Back
        </button>

      </form>

    </div>
  );
}

export default AddCoupon;