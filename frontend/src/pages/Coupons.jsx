import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const navigate = useNavigate();

  async function getCoupons() {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Please login first");
        navigate("/login");
        return;
      }

      const response = await fetch(
        "http://localhost:5000/coupons",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      console.log("Coupons response:", data);

      if (response.ok) {
        setCoupons(data);
      } else {
        alert(data.message || "Error getting coupons");

        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("isLoggedIn");
          localStorage.removeItem("user");

          navigate("/login");
        }
      }
    } catch (error) {
      console.error("Get coupons error:", error);
      alert("Cannot connect to backend");
    }
  }

  async function deleteCoupon(id) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this coupon?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/coupons/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert("Coupon deleted successfully");

        getCoupons();
      } else {
        alert(data.message || "Error deleting coupon");
      }
    } catch (error) {
      console.error("Delete coupon error:", error);
      alert("Cannot connect to backend");
    }
  }

  useEffect(() => {
    getCoupons();
  }, []);

  return (
    <div className="coupons-page">

      {/* LEFT SIDE MENU */}
      <div className="coupon-sidebar">

        <div className="sidebar-title">
          Coupons and Discount
          <br />
          Collection System
        </div>

        <div className="sidebar-menu">

          <Link to="/" className="sidebar-link">
            Home
          </Link>

          <Link to="/profile" className="sidebar-link">
            Profile
          </Link>

          

          <Link
            to="/coupons"
            className="sidebar-link active"
          >
            Available Coupons
          </Link>

        </div>
      </div>


      {/* MAIN CONTENT */}
      <div className="coupons-content">

        <h1>Available Coupons</h1>

        <p className="coupon-subtitle">
          Find the latest coupons and discounts
        </p>


        {/* COUPONS */}
        <div className="coupon-list">

          {coupons.length === 0 ? (

            <div className="no-coupons">
              <p>No coupons available.</p>

              
              

          ) : (

            filteredCoupons.map((coupon) => (

              <div
                className="coupon-box"
                key={coupon._id}
              >

                {/* COUPON CODE */}
                <div className="coupon-code">
                  {coupon.code}
                </div>


                {/* COUPON DETAILS */}
                <div className="coupon-details">

                  <p>
                    <strong>Discount:</strong>{" "}
                    <span>
                      {coupon.discount}%
                    </span>
                  </p>

                  <p>
                    <strong>Expiry Date:</strong>{" "}
                    {coupon.expiryDate}
                  </p>

                </div>


                {/* BUTTONS */}
                <div className="coupon-actions">

                  <Link
                    to={`/edit/${coupon._id}`}
                  >
                    <button className="edit-button">
                      Edit
                    </button>
                  </Link>

                  <button
                    className="delete-button"
                    onClick={() =>
                      deleteCoupon(coupon._id)
                    }
                  >
                    Delete
                  </button>

                </div>

              </div>

            ))

          )}

        </div>

      </div>

    </div>
  );
}

export default Coupons;