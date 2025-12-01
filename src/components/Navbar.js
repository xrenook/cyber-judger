import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import "./Navbar.css";

const Navbar = () => {
  const { currentUser, logout, userStats } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error) {
      toast.error("Failed to log out");
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      {currentUser ? (
        <nav className="navbar">
          <div className="navbar-container">
            <Link to="/" className="navbar-brand">
              <span className="brand-icon">⚖️</span>
              <span className="brand-text">Cyber Judger</span>
            </Link>
            <div className={`navbar-menu ${isMenuOpen ? "active" : ""}`}>
              <Link
                to="/create-case"
                className="nav-link"
                onClick={() => setIsMenuOpen(false)}
              >
                Share Case
              </Link>
              <Link
                to="/profile"
                className="nav-link"
                onClick={() => setIsMenuOpen(false)}
              >
                Profile
              </Link>
              <div className="user-info">
                <span className="user-name">
                  {currentUser.displayName || currentUser.email}
                </span>
                {userStats && (
                  <div className="user-stats">
                    <span className="stat">
                      Cases: {userStats?.casesPosted || 0}
                    </span>
                    <span className="stat">
                      Judged: {userStats?.casesJudged || 0}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-secondary logout-btn"
              >
                Logout
              </button>
            </div>

            <button
              className={`hamburger ${isMenuOpen ? "active" : ""}`}
              onClick={toggleMenu}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </nav>
      ) : (
        <></>
      )}
    </>
  );
};

export default Navbar;
