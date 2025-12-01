import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import "./CreateCase.css";

const CreateCase = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const { currentUser, userStats, updateUserStats } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (title.length > 100) {
      toast.error("Title must be 100 characters or less");
      return;
    }

    if (description.length > 500) {
      toast.error("Description must be 500 characters or less");
      return;
    }

    // Check daily limit
    if (userStats?.dailyCasesPosted >= 1) {
      toast.error("You can only post 1 case per day. Try again tomorrow!");
      return;
    }

    try {
      setLoading(true);

      const caseData = {
        title: title.trim(),
        description: description.trim(),
        authorId: currentUser.uid,
        authorName: isAnonymous ? "Anonymous" : currentUser.displayName,
        isAnonymous: isAnonymous,
        createdAt: serverTimestamp(),
        isVerified: false, // Requires manual verification
        guiltyCount: 0,
        innocentCount: 0,
        popularity: 0,
        totalVotes: 0,
      };

      await addDoc(collection(db, "cases"), caseData);

      // Update user stats
      await updateUserStats({
        casesPosted: (userStats?.casesPosted || 0) + 1,
        dailyCasesPosted: (userStats?.dailyCasesPosted || 0) + 1,
        lastCaseDate: serverTimestamp(),
      });

      toast.success(
        "Case submitted successfully! It will be reviewed and published soon."
      );
      navigate("/");
    } catch (error) {
      console.error("Error creating case:", error);
      toast.error("Failed to submit case. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const remainingChars = 500 - description.length;
  const titleRemainingChars = 100 - title.length;

  // Show loading if userStats is not loaded yet
  if (currentUser && !userStats) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="create-case-page">
      <div className="container">
        <div className="create-case-header">
          <h1>📝 Share Your Case</h1>
          <p>Tell your story and let the community judge</p>
        </div>

        <div className="create-case-card">
          <div className="daily-limit-info">
            <div className="limit-item">
              <span className="limit-label">Daily Cases Posted:</span>
              <span
                className={`limit-count ${
                  (userStats?.dailyCasesPosted || 0) >= 1 ? "limit-reached" : ""
                }`}
              >
                {userStats?.dailyCasesPosted || 0}/1
              </span>
            </div>
            <div className="limit-item">
              <span className="limit-label">Total Cases Posted:</span>
              <span className="limit-count">{userStats?.casesPosted || 0}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="create-case-form">
            <div className="form-group">
              <label htmlFor="title" className="form-label">
                Case Title *
              </label>
              <input
                type="text"
                id="title"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a brief title for your case"
                maxLength="100"
                required
              />
              <div className="char-count">
                {titleRemainingChars} characters remaining
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">
                Case Description *
              </label>
              <textarea
                id="description"
                className="form-input form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your case in detail (max 500 characters)"
                maxLength="500"
                rows="6"
                required
              />
              <div
                className={`char-count ${
                  remainingChars < 50 ? "char-count-warning" : ""
                }`}
              >
                {remainingChars} characters remaining
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Posting Options</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="checkbox-input"
                  />
                  <span className="checkbox-text">Post anonymously</span>
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || (userStats?.dailyCasesPosted || 0) >= 1}
              >
                {loading ? "Submitting..." : "Submit Case"}
              </button>
            </div>
          </form>

          <div className="submission-info">
            <h4>📋 Submission Guidelines</h4>
            <ul>
              <li>Cases must be factual and appropriate</li>
              <li>Maximum 1 case per day per user</li>
              <li>All cases are reviewed before publication</li>
              <li>You can choose to post anonymously</li>
              <li>Cases will be judged by the community</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCase;
