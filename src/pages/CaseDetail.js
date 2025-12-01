import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import "./CaseDetail.css";

const CaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userStats, updateUserStats } = useAuth();
  const [caseData, setCaseData] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [judging, setJudging] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [userVote, setUserVote] = useState(null);
  const [userComment, setUserComment] = useState(null);

  useEffect(() => {
    loadCaseData();
    loadComments();
  }, [id]);

  const loadCaseData = async () => {
    try {
      const caseDoc = await getDoc(doc(db, "cases", id));
      if (!caseDoc.exists()) {
        toast.error("Case not found");
        navigate("/");
        return;
      }

      const data = caseDoc.data();
      if (!data.isVerified) {
        toast.error("This case is pending verification");
        navigate("/");
        return;
      }

      setCaseData({ id: caseDoc.id, ...data });

      // Check if user has already voted
      if (currentUser) {
        const voteId = `${id}_${currentUser.uid}`;
        const userVoteDoc = await getDoc(doc(db, "votes", voteId));
        if (userVoteDoc.exists()) {
          setUserVote(userVoteDoc.data().verdict);
        }

        // Check if user has already commented on this case
        const commentsRef = collection(db, "comments");
        const userCommentQuery = query(
          commentsRef,
          where("caseId", "==", id),
          where("userId", "==", currentUser.uid)
        );
        const userCommentSnapshot = await getDocs(userCommentQuery);
        if (!userCommentSnapshot.empty) {
          setUserComment(userCommentSnapshot.docs[0].data());
        }
      }
    } catch (error) {
      console.error("Error loading case:", error);
      toast.error("Failed to load case");
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const commentsRef = collection(db, "comments");
      const q = query(
        commentsRef,
        where("caseId", "==", id),
        where("isVerified", "==", true),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const commentsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setComments(commentsData);

      // If user has a comment that's not verified yet, show it in the submitted state
      if (currentUser && !userComment) {
        const userCommentQuery = query(
          commentsRef,
          where("caseId", "==", id),
          where("userId", "==", currentUser.uid),
          where("isVerified", "==", false)
        );
        const userCommentSnapshot = await getDocs(userCommentQuery);
        if (!userCommentSnapshot.empty) {
          setUserComment(userCommentSnapshot.docs[0].data());
        }
      }
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const handleVote = async (verdict) => {
    if (!currentUser) {
      toast.error("Please log in to vote");
      return;
    }

    if (userStats?.dailyCasesJudged >= 10) {
      toast.error("You can only judge 10 cases per day. Try again tomorrow!");
      return;
    }

    if (userVote) {
      toast.error("You have already voted on this case");
      return;
    }

    try {
      setJudging(true);

      const voteData = {
        caseId: id,
        userId: currentUser.uid,
        userName: currentUser.displayName,
        verdict: verdict,
        createdAt: serverTimestamp(),
      };

      // Add vote document with unique ID to prevent duplicate votes
      const voteId = `${id}_${currentUser.uid}`;
      await setDoc(doc(db, "votes", voteId), voteData);

      // Update case counts
      const caseRef = doc(db, "cases", id);
      const updateData = {
        totalVotes: increment(1),
        popularity: increment(1),
      };

      if (verdict === "guilty") {
        updateData.guiltyCount = increment(1);
      } else {
        updateData.innocentCount = increment(1);
      }

      await updateDoc(caseRef, updateData);

      // Update user stats
      await updateUserStats({
        casesJudged: (userStats?.casesJudged || 0) + 1,
        dailyCasesJudged: (userStats?.dailyCasesJudged || 0) + 1,
        lastJudgedDate: serverTimestamp(),
      });

      setUserVote(verdict);
      setCaseData((prev) => ({
        ...prev,
        totalVotes: (prev.totalVotes || 0) + 1,
        popularity: (prev.popularity || 0) + 1,
        guiltyCount:
          verdict === "guilty"
            ? (prev.guiltyCount || 0) + 1
            : prev.guiltyCount || 0,
        innocentCount:
          verdict === "innocent"
            ? (prev.innocentCount || 0) + 1
            : prev.innocentCount || 0,
      }));

      toast.success(`Voted ${verdict.toUpperCase()} successfully!`);
    } catch (error) {
      console.error("Error voting:", error);
      toast.error("Failed to submit vote");
    } finally {
      setJudging(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      toast.error("Please log in to comment");
      return;
    }

    if (!userVote) {
      toast.error("You must judge this case before you can comment");
      return;
    }

    if (userComment) {
      toast.error("You have already commented on this case");
      return;
    }

    if (!commentText.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    if (commentText.length > 200) {
      toast.error("Comment must be 200 characters or less");
      return;
    }

    try {
      const commentData = {
        caseId: id,
        userId: currentUser.uid,
        userName: currentUser.displayName,
        userVerdict: userVote, // Attach the judge's verdict to the comment
        text: commentText.trim(),
        createdAt: serverTimestamp(),
        isVerified: false, // Requires manual verification
      };

      await addDoc(collection(db, "comments"), commentData);
      setCommentText("");
      setUserComment(commentData); // Set the comment locally
      toast.success(
        "Comment submitted! It will be reviewed and published soon."
      );
    } catch (error) {
      console.error("Error submitting comment:", error);
      toast.error("Failed to submit comment");
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

  if (loading || (currentUser && !userStats)) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!caseData) {
    return <div>Case not found</div>;
  }

  const backgroundStyle = getCaseBackground(
    caseData.guiltyCount || 0,
    caseData.innocentCount || 0
  );

  return (
    <div className="case-detail-page">
      <div className="container">
        <div className="case-detail-card" style={backgroundStyle}>
          <div className="case-header">
            <div className="case-meta">
              <div className="case-author">
                {caseData.isAnonymous ? "Anonymous" : caseData.authorName}
              </div>
              <div className="case-date">
                {formatDistanceToNow(caseData.createdAt.toDate(), {
                  addSuffix: true,
                })}
              </div>
            </div>
            <button onClick={() => navigate("/")} className="back-btn">
              ← Back to Cases
            </button>
          </div>

          <div className="case-content">
            <h1 className="case-title">{caseData.title}</h1>
            <p className="case-description">{caseData.description}</p>
          </div>

          <div className="case-stats">
            <div className="verdict-display">
              <span className="verdict-text">
                {getVerdictText(
                  caseData.guiltyCount || 0,
                  caseData.innocentCount || 0
                )}
              </span>
            </div>
            <div className="vote-counts">
              <span className="guilty-count">
                😠 {caseData.guiltyCount || 0}
              </span>
              <span className="innocent-count">
                😇 {caseData.innocentCount || 0}
              </span>
              <span className="total-votes">
                Total: {caseData.totalVotes || 0}
              </span>
            </div>
          </div>

          {currentUser && !userVote && (
            <div className="judging-section">
              <h3>Cast Your Verdict</h3>
              <div className="judging-buttons">
                <button
                  onClick={() => handleVote("guilty")}
                  disabled={judging || (userStats?.dailyCasesJudged || 0) >= 10}
                  className="btn btn-danger"
                >
                  😠 GUILTY
                </button>
                <button
                  onClick={() => handleVote("innocent")}
                  disabled={judging || (userStats?.dailyCasesJudged || 0) >= 10}
                  className="btn btn-success"
                >
                  😇 INNOCENT
                </button>
              </div>
              <div className="judging-info">
                <p>Daily judgments: {userStats?.dailyCasesJudged || 0}/10</p>
                {(userStats?.dailyCasesJudged || 0) >= 10 && (
                  <p className="limit-warning">
                    Daily limit reached. Try again tomorrow!
                  </p>
                )}
              </div>
            </div>
          )}

          {userVote && (
            <div className="user-vote-display">
              <p>
                Your verdict: <strong>{userVote.toUpperCase()}</strong>
              </p>
            </div>
          )}
        </div>

        <div className="comments-section">
          <h3>Comments ({comments.length})</h3>

          {currentUser && (
            <div className="comment-section">
              {!userVote ? (
                <div className="comment-requirement">
                  <p>⚠️ You must judge this case before you can comment</p>
                  <p>Cast your verdict above to unlock commenting</p>
                </div>
              ) : userComment ? (
                <div className="comment-submitted">
                  <p>✅ Commented on this case</p>
                </div>
              ) : (
                <form onSubmit={handleComment} className="comment-form">
                  <div className="comment-form-header">
                    <p>
                      Commenting as Judge:{" "}
                      <strong>{userVote.toUpperCase()}</strong>
                    </p>
                  </div>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={`Add your comment as a ${userVote} judge (max 200 characters)`}
                    maxLength="200"
                    rows="3"
                    className="form-input form-textarea"
                  />
                  <div className="comment-form-footer">
                    <span className="char-count">
                      {200 - commentText.length} characters remaining
                    </span>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={!commentText.trim()}
                    >
                      Submit Comment
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          <div className="comments-list">
            {comments.length === 0 ? (
              <p className="no-comments">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="comment-card">
                  <div className="comment-header">
                    <div className="comment-author-info">
                      <span className="comment-author">{comment.userName}</span>
                      {comment.userVerdict && (
                        <span
                          className={`judge-verdict ${comment.userVerdict}`}
                        >
                          {comment.userVerdict === "guilty"
                            ? "😠 GUILTY"
                            : "😇 INNOCENT"}
                        </span>
                      )}
                    </div>
                    <span className="comment-date">
                      {formatDistanceToNow(comment.createdAt.toDate(), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="comment-text">{comment.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseDetail;
