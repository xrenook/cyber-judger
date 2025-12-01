import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import "./Home.css";

const Home = () => {
  const { currentUser } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      setLoading(true);
      const casesRef = collection(db, "cases");

      // First, get all cases and filter on client side to avoid index issues
      const querySnapshot = await getDocs(casesRef);
      const casesData = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((caseData) => caseData.isVerified === true) // Filter verified cases
        .sort((a, b) => {
          // Sort by popularity first, then by creation date
          if (a.popularity !== b.popularity) {
            return b.popularity - a.popularity;
          }
          return b.createdAt.toDate() - a.createdAt.toDate();
        });

      setCases(casesData);
    } catch (error) {
      console.error("Error loading cases:", error);

      // Provide more specific error messages
      if (error.code === "permission-denied") {
        toast.error(
          "Permission denied. Please check Firestore security rules."
        );
      } else if (error.code === "unavailable") {
        toast.error(
          "Database unavailable. Please check your internet connection."
        );
      } else if (error.code === "not-found") {
        toast.error("Database not found. Please create a Firestore database.");
      } else {
        toast.error(`Failed to load cases: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const getCaseBackground = (guiltyCount, innocentCount) => {
    const total = guiltyCount + innocentCount;
    if (total === 0) return { background: "#808080", color: "white" }; // Gray

    const guiltyPercentage = (guiltyCount / total) * 100;

    if (guiltyPercentage > 60) {
      return { background: "#000000", color: "white" }; // Black
    } else if (guiltyPercentage < 40) {
      return { background: "#ffffff", color: "black" }; // White
    } else {
      return { background: "#808080", color: "white" }; // Gray
    }
  };

  const getVerdictText = (guiltyCount, innocentCount) => {
    const total = guiltyCount + innocentCount;
    if (total === 0) return "No verdicts yet";

    const guiltyPercentage = (guiltyCount / total) * 100;

    if (guiltyPercentage > 60) {
      return `GUILTY (${Math.round(guiltyPercentage)}%)`;
    } else if (guiltyPercentage < 40) {
      return `INNOCENT (${Math.round(100 - guiltyPercentage)}%)`;
    } else {
      return "UNDECIDED";
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="home">
      <div className="container">
        <div className="home-header">
          <h1>⚖️ Cyber Judger</h1>
          <p>Share your cases and let the community judge</p>
        </div>

        {cases.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No cases available</h3>
            <p>
              Be the first to share a case or check back later for new
              submissions.
            </p>
            {currentUser && (
              <div className="empty-state-actions">
                <Link to="/create-case" className="btn btn-primary">
                  Share Your First Case
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="cases-grid">
            {cases.map((caseItem) => {
              const backgroundStyle = getCaseBackground(
                caseItem.guiltyCount || 0,
                caseItem.innocentCount || 0
              );

              return (
                <div
                  key={caseItem.id}
                  className="case-card"
                  style={backgroundStyle}
                >
                  <div className="case-header">
                    <div className="case-author">
                      {caseItem.isAnonymous ? "Anonymous" : caseItem.authorName}
                    </div>
                    <div className="case-date">
                      {formatDistanceToNow(caseItem.createdAt.toDate(), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>

                  <div className="case-content">
                    <h3 className="case-title">{caseItem.title}</h3>
                    <p className="case-description">
                      {caseItem.description.length > 200
                        ? `${caseItem.description.substring(0, 200)}...`
                        : caseItem.description}
                    </p>
                  </div>

                  <div className="case-stats">
                    <div className="verdict-display">
                      <span className="verdict-text">
                        {getVerdictText(
                          caseItem.guiltyCount || 0,
                          caseItem.innocentCount || 0
                        )}
                      </span>
                    </div>
                    <div className="vote-counts">
                      <span className="guilty-count">
                        😠 {caseItem.guiltyCount || 0}
                      </span>
                      <span className="innocent-count">
                        😇 {caseItem.innocentCount || 0}
                      </span>
                    </div>
                  </div>

                  <Link to={`/case/${caseItem.id}`} className="case-link">
                    View Details & Judge
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
