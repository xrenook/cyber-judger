import React, { useState, useEffect, useCallback } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import "./Profile.css";

const Profile = () => {
  const { currentUser, userStats } = useAuth();
  const [userCases, setUserCases] = useState([]);
  const [userVotes, setUserVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("stats");

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);

      // Load user's cases
      const casesRef = collection(db, "cases");
      const casesQuery = query(
        casesRef,
        where("authorId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );
      const casesSnapshot = await getDocs(casesQuery);
      const casesData = casesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUserCases(casesData);

      // Load user's votes
      const votesRef = collection(db, "votes");
      const votesQuery = query(
        votesRef,
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );
      const votesSnapshot = await getDocs(votesQuery);
      const votesData = votesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUserVotes(votesData);
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser.uid]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const getVerdictPercentage = (verdict) => {
    const totalVotes = userVotes.length;
    if (totalVotes === 0) return 0;

    const verdictCount = userVotes.filter(
      (vote) => vote.verdict === verdict
    ).length;
    return Math.round((verdictCount / totalVotes) * 100);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="container">
        <div className="profile-header">
          <h1>👤 User Profile</h1>
          <p>Your Cyber Judger activity and statistics</p>
        </div>

        <div className="profile-card">
          <div className="user-info">
            <div className="user-avatar">
              {currentUser.displayName?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="user-details">
              <h2>{currentUser.displayName}</h2>
              <p>{currentUser.email}</p>
              <p className="member-since">
                Member since{" "}
                {userStats?.createdAt?.toDate?.()?.toLocaleDateString() ||
                  "Recently"}
              </p>
            </div>
          </div>

          <div className="profile-tabs">
            <button
              className={`tab-btn ${activeTab === "stats" ? "active" : ""}`}
              onClick={() => setActiveTab("stats")}
            >
              📊 Statistics
            </button>
            <button
              className={`tab-btn ${activeTab === "cases" ? "active" : ""}`}
              onClick={() => setActiveTab("cases")}
            >
              📝 My Cases
            </button>
            <button
              className={`tab-btn ${activeTab === "votes" ? "active" : ""}`}
              onClick={() => setActiveTab("votes")}
            >
              ⚖️ My Judgments
            </button>
          </div>

          <div className="tab-content">
            {activeTab === "stats" && (
              <div className="stats-content">
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">📝</div>
                    <div className="stat-info">
                      <h3>Cases Posted</h3>
                      <p className="stat-number">
                        {userStats?.casesPosted || 0}
                      </p>
                      <p className="stat-subtitle">Total cases shared</p>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">⚖️</div>
                    <div className="stat-info">
                      <h3>Cases Judged</h3>
                      <p className="stat-number">
                        {userStats?.casesJudged || 0}
                      </p>
                      <p className="stat-subtitle">Total judgments made</p>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">😠</div>
                    <div className="stat-info">
                      <h3>Guilty Votes</h3>
                      <p className="stat-number">
                        {getVerdictPercentage("guilty")}%
                      </p>
                      <p className="stat-subtitle">Of your judgments</p>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">😇</div>
                    <div className="stat-info">
                      <h3>Innocent Votes</h3>
                      <p className="stat-number">
                        {getVerdictPercentage("innocent")}%
                      </p>
                      <p className="stat-subtitle">Of your judgments</p>
                    </div>
                  </div>
                </div>

                <div className="daily-limits">
                  <h3>Daily Limits</h3>
                  <div className="limit-bars">
                    <div className="limit-bar">
                      <span>Cases Posted Today</span>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${
                              ((userStats?.dailyCasesPosted || 0) / 1) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span>{userStats?.dailyCasesPosted || 0}/1</span>
                    </div>
                    <div className="limit-bar">
                      <span>Cases Judged Today</span>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${
                              ((userStats?.dailyCasesJudged || 0) / 10) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span>{userStats?.dailyCasesJudged || 0}/10</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "cases" && (
              <div className="cases-content">
                <h3>My Cases ({userCases.length})</h3>
                {userCases.length === 0 ? (
                  <div className="empty-state">
                    <p>You haven't posted any cases yet.</p>
                  </div>
                ) : (
                  <div className="cases-list">
                    {userCases.map((caseItem) => (
                      <div key={caseItem.id} className="case-item">
                        <div className="case-header">
                          <h4>{caseItem.title}</h4>
                          <span
                            className={`status ${
                              caseItem.isVerified ? "verified" : "pending"
                            }`}
                          >
                            {caseItem.isVerified ? "✅ Verified" : "⏳ Pending"}
                          </span>
                        </div>
                        <p className="case-description">
                          {caseItem.description.length > 100
                            ? `${caseItem.description.substring(0, 100)}...`
                            : caseItem.description}
                        </p>
                        <div className="case-meta">
                          <span>
                            {formatDistanceToNow(caseItem.createdAt.toDate(), {
                              addSuffix: true,
                            })}
                          </span>
                          {caseItem.isVerified && (
                            <span>
                              😠 {caseItem.guiltyCount || 0} | 😇{" "}
                              {caseItem.innocentCount || 0}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "votes" && (
              <div className="votes-content">
                <h3>My Judgments ({userVotes.length})</h3>
                {userVotes.length === 0 ? (
                  <div className="empty-state">
                    <p>You haven't judged any cases yet.</p>
                  </div>
                ) : (
                  <div className="votes-list">
                    {userVotes.map((vote) => (
                      <div key={vote.id} className="vote-item">
                        <div className="vote-header">
                          <span className={`verdict ${vote.verdict}`}>
                            {vote.verdict === "guilty"
                              ? "😠 GUILTY"
                              : "😇 INNOCENT"}
                          </span>
                          <span className="vote-date">
                            {formatDistanceToNow(vote.createdAt.toDate(), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <p className="vote-case">Case ID: {vote.caseId}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
