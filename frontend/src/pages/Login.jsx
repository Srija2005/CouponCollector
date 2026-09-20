import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  async function handleLogin(e) {

    e.preventDefault();

    console.log("Email:", email);
    console.log("Password:", password);

    if (email.trim() === "" || password.trim() === "") {
      alert("Please enter email and password");
      return;
    }

    try {

      const response = await fetch("http://localhost:5000/login", {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          email: email.trim(),
          password: password
        })
      });

      const data = await response.json();

      console.log("Login response:", data);

      if (response.ok) {

        localStorage.setItem("token", data.token);

        localStorage.setItem("isLoggedIn", "true");

        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );

        alert("Login successful!");

        navigate("/");

      } else {

        alert(data.message || "Login failed");

      }

    } catch (error) {

      console.error("Login error:", error);

      alert("Cannot connect to backend");

    }
  }

  return (

    <div className="container">

      <h1>Admin Login</h1>

      <form onSubmit={handleLogin}>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <br />
        <br />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <br />
        <br />

        <button type="submit">
          Login
        </button>

      </form>

      <p>
        Don't have an account?
        <Link to="/register"> Register</Link>
      </p>

    </div>

  );
}

export default Login;