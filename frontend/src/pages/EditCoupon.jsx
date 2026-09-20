import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

function EditCoupon() {

  const { id } = useParams();

  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  useEffect(() => {

    async function getCoupon() {

      try {

        const response = await fetch(
          "http://localhost:5000/coupons/" + id
        );

        const data = await response.json();

        if (response.ok) {

          setCode(data.code);
          setDiscount(data.discount);
          setExpiryDate(data.expiryDate);

        } else {

          alert(data.message || "Coupon not found");

          navigate("/coupons");

        }

      } catch (error) {

        console.log(error);

        alert("Cannot connect to backend.");

      }
    }

    getCoupon();

  }, [id, navigate]);


  async function updateCoupon(e) {

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
        "http://localhost:5000/coupons/" + id,
        {
          method: "PUT",

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

        alert("Coupon updated successfully!");

        navigate("/coupons");

      } else {

        alert(data.message || "Failed to update coupon");

      }

    } catch (error) {

      console.log(error);

      alert("Cannot connect to backend.");

    }
  }


  return (
    <div className="container">

      <h1>Edit Coupon</h1>

      <form onSubmit={updateCoupon}>

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
          Update Coupon
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

export default EditCoupon;