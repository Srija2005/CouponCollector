import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Load user
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (!token || !savedUser) {
      navigate("/login");
      return;
    }

    try {
      const userData = JSON.parse(savedUser);
      setUser(userData);
    } catch (error) {
      console.error("User data error:", error);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      navigate("/login");
    }
  }, [navigate]);

  // Load coupons
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    async function loadCoupons() {
      try {
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

        console.log("Coupons received:", data);

        if (response.ok) {
          setCoupons(data);
        } else {
          console.error("Coupon error:", data);

          if (response.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("isLoggedIn");

            navigate("/login");
          }
        }
      } catch (error) {
        console.error("Cannot connect to backend:", error);
      }
    }

    loadCoupons();
  }, [navigate]);

  // Delete coupon
  async function deleteCoupon(id) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this coupon?"
    );

    if (!confirmDelete) {
      return;
    }

    const token = localStorage.getItem("token");

    try {
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

        setCoupons((oldCoupons) =>
          oldCoupons.filter((coupon) => coupon._id !== id)
        );
      } else {
        alert(data.message || "Unable to delete coupon");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Cannot connect to backend");
    }
  }

  // Logout
  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");

    navigate("/login");
  }

  if (!user) {
    return (
      <div className="profile-loading">
        <h2>Loading...</h2>
      </div>
    );
  }
const filteredCoupons = coupons.filter((coupon) =>
  coupon.code.toLowerCase().includes(searchTerm.toLowerCase())
);
  return (
    <div className="profile-page">

      {/* =================================================
          LEFT SIDE - PROFILE
          ================================================= */}

      <aside className="profile-sidebar">

        <h1>My Profile</h1>

        <div className="profile-details">

          <div className="profile-info">
            <strong>Name</strong>
            <span>{user.name}</span>
          </div>

          <div className="profile-info">
            <strong>Email</strong>
            <span>{user.email}</span>
          </div>

          <div className="profile-info">
            <strong>Role</strong>
            <span>{user.role}</span>
          </div>

        </div>

        <div className="profile-buttons">

          <Link to="/">
            <button>Home</button>
          </Link>

          

          <button onClick={handleLogout}>
            Logout
          </button>

        </div>

      </aside>


      {/* =================================================
          RIGHT SIDE - AVAILABLE COUPONS
          ================================================= */}

      <main className="profile-coupons">

        <h1>Available Coupons</h1>

        <p className="profile-coupon-subtitle">
          Find the latest coupons and discounts
        </p>
<div className="coupon-search">
  <input
    type="text"
    placeholder="Search coupon code..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
  />
</div>
        {coupons.length === 0 ? (

          <div className="no-profile-coupons">

            <h2>No Coupons Available</h2>

            <p>
              You have not added any coupons yet.
            </p>

           

          </div>

        ) : (

          <div className="profile-coupon-list">

            {filteredCoupons.map((coupon) => (

              <div
                className="profile-coupon-box"
                key={coupon._id}
              >

                <div className="profile-coupon-code">
                  {coupon.code}
                </div>

                <div className="profile-coupon-details">

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

                <div className="profile-coupon-actions">

                  <Link to={`/edit/${coupon._id}`}>
                    <button className="profile-edit-button">
                      Edit
                    </button>
                  </Link>

                  <button
                    className="profile-delete-button"
                    onClick={() =>
                      deleteCoupon(coupon._id)
                    }
                  >
                    Delete
                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </main>

    </div>
  );
}

export default Profile;