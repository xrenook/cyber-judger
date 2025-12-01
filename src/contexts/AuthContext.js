import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { auth, db, googleProvider } from "../firebase/config";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState(null);

  const signup = async (email, password, displayName) => {
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await updateProfile(result.user, { displayName });

      // Create user document in Firestore
      await setDoc(doc(db, "users", result.user.uid), {
        uid: result.user.uid,
        email: result.user.email,
        displayName: displayName,
        createdAt: serverTimestamp(),
        casesPosted: 0,
        casesJudged: 0,
        lastCaseDate: null,
        lastJudgedDate: null,
        dailyCasesPosted: 0,
        dailyCasesJudged: 0,
      });

      return result;
    } catch (error) {
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await loadUserStats(result.user.uid);
      return result;
    } catch (error) {
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);

      // Check if user document exists, if not create one
      const userDoc = await getDoc(doc(db, "users", result.user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", result.user.uid), {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          createdAt: serverTimestamp(),
          casesPosted: 0,
          casesJudged: 0,
          lastCaseDate: null,
          lastJudgedDate: null,
          dailyCasesPosted: 0,
          dailyCasesJudged: 0,
        });
      }

      await loadUserStats(result.user.uid);
      return result;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    return signOut(auth);
  };

  const loadUserStats = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        setUserStats(userDoc.data());
      }
    } catch (error) {
      console.error("Error loading user stats:", error);
    }
  };

  const updateUserStats = useCallback(
    async (updates) => {
      try {
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, updates);
        await loadUserStats(currentUser.uid);
      } catch (error) {
        console.error("Error updating user stats:", error);
        throw error;
      }
    },
    [currentUser]
  );

  const resetDailyCounts = useCallback(async () => {
    if (!currentUser) return;

    const today = new Date().toDateString();
    const lastCaseDate = userStats?.lastCaseDate?.toDate?.()?.toDateString();
    const lastJudgedDate = userStats?.lastJudgedDate
      ?.toDate?.()
      ?.toDateString();

    const updates = {};

    if (lastCaseDate !== today) {
      updates.dailyCasesPosted = 0;
      updates.lastCaseDate = serverTimestamp();
    }

    if (lastJudgedDate !== today) {
      updates.dailyCasesJudged = 0;
      updates.lastJudgedDate = serverTimestamp();
    }

    if (Object.keys(updates).length > 0) {
      await updateUserStats(updates);
    }
  }, [currentUser, userStats, updateUserStats]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await loadUserStats(user.uid);
      } else {
        setUserStats(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (currentUser && userStats) {
      resetDailyCounts();
    }
  }, [currentUser, userStats, resetDailyCounts]);

  const value = {
    currentUser,
    userStats,
    signup,
    login,
    loginWithGoogle,
    logout,
    updateUserStats,
    loadUserStats,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
