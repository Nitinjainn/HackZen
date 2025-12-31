import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { getDashboardRouteByRole } from "../utils/roleBasedRouting";
import { API_BASE_URL } from "../lib/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error("❌ Error parsing stored user:", error);
      localStorage.removeItem("user"); // Clear corrupted data
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem("token"));
  
  // Add refs to prevent excessive badge checks
  const lastBadgeCheckRef = useRef(0);
  const isCheckingBadgesRef = useRef(false);

  // Check for new badges after login with debouncing
  const checkForNewBadges = async (userId, force = false) => {
    if (!userId || isCheckingBadgesRef.current) return;
    
    const now = Date.now();
    const timeSinceLastCheck = now - lastBadgeCheckRef.current;
    
    // Debounce: only allow checks every 10 minutes unless forced
    if (!force && timeSinceLastCheck < 600000) {
      console.log(`[Auth] ⏱️ Skipping badge check (checked ${Math.round(timeSinceLastCheck/1000)}s ago)`);
      return;
    }
    
    try {
      isCheckingBadgesRef.current = true;
      lastBadgeCheckRef.current = now;
      
      const token = localStorage.getItem('token');
      console.log('🔍 Badge check - token:', token);
      if (!token) return;
      
      await axios.post(
        `${API_BASE_URL}/api/badges/check${force ? '?force=true' : ''}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      console.log('[Auth] ✅ Badge check completed after login');
    } catch (err) {
      if (err.response && err.response.status === 401) {
        alert('Session expired. Please log in again.');
        localStorage.clear();
        window.location.href = '/?modal=login';
      } else {
        console.error('Failed to check badges after login:', err);
      }
    } finally {
      isCheckingBadgesRef.current = false;
    }
  };

  // ✅ Login helper
  const login = async (userData, authToken) => {
    console.log("🔍 Debug - Login called with userData:", userData);
    console.log("🔍 Debug - Login called with token:", authToken);
    console.log("🔍 Debug - Token type:", typeof authToken);
    console.log("🔍 Debug - Token length:", authToken ? authToken.length : 0);
    console.log("🔍 Debug - Token starts with 'eyJ':", authToken ? authToken.startsWith('eyJ') : false);
    console.log("🔍 Debug - Token contains dots:", authToken ? (authToken.split('.').length - 1) : 0);
    console.log("🔍 Debug - UserData._id:", userData?._id);
    console.log("🔍 Debug - UserData.id:", userData?.id);
    
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", authToken);
    
    // Check for new badges after login (forced check)
    await checkForNewBadges(userData._id, true);
  };

  // ✅ Logout handler
  const logout = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/users/logout`, {
        withCredentials: true
      });
      if (res.status === 200) {
        console.log("Logout successful");
        // Optionally show a toast here
      }
    } catch (err) {
      console.error("Logout error:", err.message);
    }

    localStorage.clear();
    setUser(null);
    setToken(null);
    navigate("/");
  };

  // ✅ OAuth redirect handling (token in URL)
  // ✅ 1. Handle OAuth redirect from URL
  useEffect(() => {
    const url = new URLSearchParams(location.search);
    const oauthToken = url.get("token");
    const name = url.get("name");
    const email = url.get("email");
    const id = url.get("id");
    const role = url.get("role");

    if (oauthToken && name && email && id) {
      const userData = {
        _id: id,
        name,
        email,
        role,
        profileCompleted: true, // Assume OAuth users have completed profile
      };
      login(userData, oauthToken);
      const dashboardRoute = getDashboardRouteByRole(userData);
      navigate(dashboardRoute);
    }
  }, [location]);

  // ✅ 2. Sync user/token from localStorage across tabs
  useEffect(() => {
    const sync = () => {
      try {
        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("token");
        setUser(storedUser ? JSON.parse(storedUser) : null);
        setToken(storedToken || null);
      } catch (error) {
        console.error("❌ Error syncing user from storage:", error);
        localStorage.removeItem("user"); // Clear corrupted data
        setUser(null);
      }
    };

    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  // ✅ Refresh user info from backend
  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await axios.get("http://localhost:3000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data) {
        setUser(res.data);
        localStorage.setItem("user", JSON.stringify(res.data));
        // Check for new badges after user refresh (not forced)
        await checkForNewBadges(res.data._id, false);
      }
    } catch (err) {
      console.error("Failed to refresh user info:", err.message);
    }
  }, []);

  // Check for new badges when user changes (only on initial load)
  useEffect(() => {
    if (user?._id) {
      // Only check on initial load, not on every user change
      const hasCheckedBefore = lastBadgeCheckRef.current > 0;
      if (!hasCheckedBefore) {
        checkForNewBadges(user._id, false);
      }
    }
  }, [user?._id]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
