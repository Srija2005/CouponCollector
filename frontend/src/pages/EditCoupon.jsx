import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

function EditCoupon() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [loading, setLoading] = useState(true);

  // =========================
  // LOAD COUPON
  // =========================
  useEffect(() => {
    async function getCoupon() {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Please login first.");
        navigate("/login");
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:5000/coupons/${id}`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          }
        );

        const data = await response.json();

        console.log("Edit coupon response:", data);

        if (response.ok) {
          setCode(data.code || "");
          setDiscount(data.discount || "");
          setExpiryDate(data.expiryDate || "");
          setLoading(false);
        } else {
          alert(data.message || "Coupon not found");

          if (response.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("isLoggedIn");

            navigate("/login");
          } else {
            navigate("/profile");
          }
        }
      } catch (error) {
        console.error("Get coupon error:", error);
        alert("Cannot connect to backend.");
        setLoading(false);
      }
    }

    if (id) {
      getCoupon();
    } else {
      alert("Coupon ID not found.");
      navigate("/profile");
    }
  }, [id, navigate]);

  // =========================
  // UPDATE COUPON
  // =========================
  async function updateCoupon(e) {
    e.preventDefault();

    if (!code || !discount || !expiryDate) {
      alert("Please fill all the fields");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please login first.");
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/coupons/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            code: code,
            discount: Number(discount),
            expiryDate: expiryDate
          })
        }
      );

      const data = await response.json();

      console.log("Update coupon response:", data);

      if (response.ok) {
        alert("Coupon updated successfully!");
        navigate("/profile");
      } else {
        alert(data.message || "Failed to update coupon");

        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("isLoggedIn");

          navigate("/login");
        }
      }
    } catch (error) {
      console.error("Update coupon error:", error);
      alert("Cannot connect to backend.");
    }
  }

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <div className="container">
        <h1>Loading Coupon...</h1>
      </div>
    );
  }

  // =========================
  // PAGE
  // =========================
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
          onClick={() => navigate("/profile")}
        >
          Back
        </button>

      </form>

    </div>
  );
}

export default EditCoupon;