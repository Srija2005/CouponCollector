import { Link, useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("user");

    alert("Logged out successfully");

    navigate("/login");
  }

  return (
    <div className="home-page">

      {/* TOP BAR */}
      <div className="top-bar">

        {/* TOP LEFT - SYSTEM NAME */}
        <div className="site-title">
          coupons collector
          <br />
        </div>

        {/* TOP RIGHT - BUTTONS */}
        <div className="top-buttons">

          {!token ? (
            <>
              <Link to="/register">
                <button className="register-btn">
                  Register
                </button>
              </Link>

              <Link to="/login">
                <button className="login-btn">
                  Login
                </button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/profile">
                <button className="login-btn">
                  Available Coupons
                </button>
              </Link>

              <Link to="/add-coupon">
                <button className="login-btn">
                  Add Coupon
                </button>
              </Link>

              <Link to="/profile">
                <button className="login-btn">
                  Profile
                </button>
              </Link>

             
            </>
          )}

        </div>
      </div>

      {/* CENTER CONTENT */}
      <div className="welcome-section">

        <h1>
          Welcome to the
          <br />

          <span>
            Coupons collector
          </span>
        </h1>

      </div>

    </div>
  );
}

export default Home;