"use client";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "@/lib/api";

import {
  SquarePen,
  Save,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Trophy,
  Award,
  Star,
  TrendingUp,
  Github,
  ExternalLink,
  Phone,
  MapPin,
  Globe,
  Linkedin,
  UserCircle2,
  Info,
  Shield,
  Check,
  X,
  Twitter,
  Instagram,
  Share2Icon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/CommonUI/card";
import { Button } from "../../components/CommonUI/button";
import { Badge } from "../../components/CommonUI/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/DashboardUI/avatar";
import { Switch } from "../../components/DashboardUI/switch";
import { Input } from "../../components/CommonUI/input";
import { Label } from "../../components/CommonUI/label";
import { Textarea } from "../../components/CommonUI/textarea";
import { MultiSelect } from "../../components/CommonUI/multiselect";
import { useAuth } from "../../context/AuthContext";
import {PublicProfileView} from "./PublicProfileView";
import StreakGraphic from "../../components/DashboardUI/StreakGraphic";
import TwoFASetup from "../../components/security/TwoFASetup";
import PasswordModal from "../../components/security/PasswordModal";
import AchievementsSection from "../../components/DashboardUI/AchievementsSection";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "../../components/DashboardUI/alert-dialog";
import { toast } from "react-hot-toast";

// Add this utility function at the top
function getCurrentViewFromPath(pathname) {
  if (pathname.includes("/dashboard/profile/edit")) return "edit-profile";
  if (pathname.includes("/dashboard/profile/account-settings"))
    return "account-settings";
  if (pathname.includes("/dashboard/profile/privacy-security"))
    return "privacy-security";
  if (pathname.includes("/dashboard/profile/help-support"))
    return "help-support";
  return "overview";
}

export function ProfileSection({ viewUserId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, login } = useAuth();

  // Define the hackathon type options based on backend schema
  const hackathonTypeOptions = [
    { value: 'web-development', label: 'Web Development' },
    { value: 'mobile-app', label: 'Mobile App Development' },
    { value: 'ai-ml', label: 'AI & Machine Learning' },
    { value: 'blockchain', label: 'Blockchain' },
    { value: 'iot', label: 'Internet of Things (IoT)' },
    { value: 'game-dev', label: 'Game Development' },
    { value: 'design', label: 'Design' },
    { value: 'social-impact', label: 'Social Impact' },
    { value: 'fintech', label: 'FinTech' },
    { value: 'healthtech', label: 'HealthTech' },
    { value: 'edtech', label: 'EdTech' },
    { value: 'other', label: 'Other' }
  ];

  // All hooks must be called at the top level
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentView, setCurrentViewState] = useState(() =>
    getCurrentViewFromPath(location.pathname)
  );
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    maxStreak: 0,
    activityLog: [],
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFAError, setTwoFAError] = useState("");
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
    website: "",
    github: "",
    linkedin: "",
    bannerImage: "",
    // New fields from CompleteProfile
    gender: "prefer-not-to-say",
    age: "",
    userType: "",
    domain: "",
    course: "",
    courseDuration: "",
    collegeName: "",
    country: "",
    city: "",
    courseSpecialization: "",
    companyName: "",
    jobTitle: "",
    yearsOfExperience: "",
    currentYear: "",
    skills: "",
    interests: "",
    twitter: "",
    instagram: "",
    portfolio: "",
    preferredHackathonTypes: [],
    teamSizePreference: "any",
    telegram: "",
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);

  // All useEffect hooks must be called at the top level
  useEffect(() => {
    const newView = getCurrentViewFromPath(location.pathname);
    setCurrentViewState(newView);
  }, [location.pathname]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        await fetchUserProfile();
        // Only fetch streak data once on mount, don't ping repeatedly
        await fetchStreakData();
        await fetch2FAStatus(); // Fetch 2FA status
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchUserData();
  }, []);

  // Show loading if user context is not ready
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // If viewing someone else's profile, show public view immediately
  if (viewUserId && user && viewUserId !== user._id) {
    return <PublicProfileView userId={viewUserId} />;
  }

  // Updated setCurrentView function to handle URL navigation
  const setCurrentView = (view) => {
    setCurrentViewState(view);

    // Navigate to appropriate URL
    switch (view) {
      case "overview":
        navigate("/dashboard/profile");
        break;
      case "edit-profile":
        navigate("/dashboard/profile/edit");
        break;
      case "account-settings":
        navigate("/dashboard/profile/account-settings");
        break;
      case "privacy-security":
        navigate("/dashboard/profile/privacy-security");
        break;
      case "help-support":
        navigate("/dashboard/profile/help-support");
        break;
      default:
        navigate("/dashboard/profile");
    }
  };

  // Fetch 2FA status from backend (only for email users)
  const fetch2FAStatus = async () => {
    // Only fetch 2FA status for email users
    if (user?.authProvider && user.authProvider !== "email") {
      setTwoFactorEnabled(false);
      return;
    }
    
    try {
      console.log("Fetching 2FA status...");
      const token = localStorage.getItem("token");
      console.log("🔍 2FA status fetch - token:", token);
      const response = await axios.get(
        `${API_BASE_URL}/api/users/2fa/status`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("2FA status response:", response.data);
      setTwoFactorEnabled(response.data.enabled);
    } catch (err) {
      if (err.response && err.response.status === 401) {
         toast.error("Session expired, Please log in again.");
        localStorage.clear();
        window.location.href = "/?modal=login";
      } else {
        console.error("Error fetching 2FA status:", err);
        setTwoFAError("Failed to load 2FA status");
      }
    }
  };

  // Handle 2FA toggle
  const handle2FAToggle = async (enabled) => {
    console.log("2FA toggle clicked:", enabled);
    
    // Only allow 2FA operations for email users
    if (user?.authProvider && user.authProvider !== "email") {
      console.log("2FA not available for OAuth users");
      return;
    }
    
    if (enabled) {
      setShow2FASetup(true);
    } else {
      // For email users, show password modal
      setShowPasswordModal(true);
    }
  };

  // Handle 2FA disable (only for email users)
  const handleDisable2FA = async (currentPassword) => {
    // Only allow 2FA operations for email users
    if (user?.authProvider && user.authProvider !== "email") {
      console.log("2FA not available for OAuth users");
      return;
    }
    
    setTwoFALoading(true);
    setTwoFAError("");

    try {
      console.log("Disabling 2FA...", { hasPassword: !!currentPassword });
      const response = await axios.post(
        `${API_BASE_URL}/api/users/2fa/disable`,
        { currentPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("2FA disabled successfully:", response.data);
      await fetch2FAStatus(); // Refresh 2FA status
      setShow2FASetup(false);
      setShowPasswordModal(false);
    } catch (err) {
      console.error("2FA disable error:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to disable 2FA";
      setTwoFAError(errorMessage);
    } finally {
      setTwoFALoading(false);
    }
  };

  // Handle password modal confirm
  const handlePasswordConfirm = async (password) => {
    await handleDisable2FA(password);
  };

  // Handle password modal close
  const handlePasswordModalClose = () => {
    setShowPasswordModal(false);
  };

  // Handle 2FA setup success
  const handle2FASuccess = async () => {
    console.log("2FA setup successful, refreshing status...");
    await fetch2FAStatus(); // Refresh 2FA status
    setShow2FASetup(false);
  };

  // Handle 2FA setup cancel
  const handle2FACancel = () => {
    console.log("2FA setup cancelled");
    setShow2FASetup(false);
  };

  const fetchStreakData = async () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");
      console.log("🔍 Streak fetch - token:", token);
      if (!storedUser?._id || !token) return;

      const res = await axios.get(
        `${API_BASE_URL}/api/users/${storedUser._id}/streaks`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setStreakData({
        currentStreak: res.data.current,
        maxStreak: res.data.max,
        activityLog: res.data.streaks,
      });
    } catch (err) {
      if (err.response && err.response.status === 401) {
        toast.error("Session expired, Please log in again.");
        localStorage.clear();
        window.location.href = "/?modal=login";
      } else {
        console.error("Failed to fetch streaks:", err.message);
      }
    }
  };

  const fetchUserProfile = async () => {
    try {
      const storedUser = localStorage.getItem("user");
      const userId = storedUser ? JSON.parse(storedUser)._id : null;
      const token = localStorage.getItem("token");

      if (!userId || !token) {
        console.warn("Missing user ID or token.");
        return;
      }

      const res = await axios.get(`${API_BASE_URL}/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = res.data;

      setEditForm({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        location: data.location || "",
        bio: data.bio || "",
        website: data.website || "",
        github: data.github || "",
        linkedin: data.linkedin || "",
        profileImage: data.profileImage || "",
        bannerImage: data.bannerImage || "",
        // New fields from CompleteProfile
        gender: data.gender || "prefer-not-to-say",
        age: data.age || "",
        userType: data.userType || "",
        domain: data.domain || "",
        course: data.course || "",
        courseDuration: data.courseDuration || "",
        collegeName: data.collegeName || "",
        country: data.country || "",
        city: data.city || "",
        courseSpecialization: data.courseSpecialization || "",
        companyName: data.companyName || "",
        jobTitle: data.jobTitle || "",
        yearsOfExperience: data.yearsOfExperience || "",
        currentYear: data.currentYear || "",
        skills: data.skills ? data.skills.join(", ") : "",
        interests: data.interests ? data.interests.join(", ") : "",
        twitter: data.twitter || "",
        instagram: data.instagram || "",
        portfolio: data.portfolio || "",
        preferredHackathonTypes: data.preferredHackathonTypes || [],
        teamSizePreference: data.teamSizePreference || "any",
        telegram: data.telegram || "",
      });

      // Optional: update local context
      const updatedUser = { ...data };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      login(updatedUser, token);
    } catch (err) {
      console.error("Failed to load user profile", err);
    }
  };

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const renderOverview = () => (
    <div className="flex flex-col gap-8 w-full">
      {/* Hero Profile Card */}
      <Card className="w-full overflow-hidden relative rounded-3xl bg-gradient-to-br from-white via-purple-50/30 to-white">
        {/* Loader Overlay */}
        {isUploading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <svg
                className="animate-spin h-10 w-10 text-purple-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                ></path>
              </svg>
              <span className="text-sm text-purple-600 font-medium">
                Uploading...
              </span>
            </div>
          </div>
        )}
        {/* Banner */}
        <div className="relative h-48 w-full overflow-hidden">
          <img
            src={user?.bannerImage || "/assets/default-banner.png"}
            alt="Banner"
            className="w-full h-full object-cover"
          />
        </div>
        {/* Profile Info Section */}
        <div className="relative px-8 pb-8">
         <button
  className="rounded-full hover:bg-gray-100 p-2 transition-all ml-auto block mt-2"
  style={{ 
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  }}
  title="Share Profile"
  onClick={async () => {
    const url = `${window.location.origin}/dashboard/profile/${user?._id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Public profile link copied to clipboard!");
  }}
>
  <Share2Icon className="w-6 h-6 text-gray-600" style={{ pointerEvents: 'none' }} />
</button>

          {/* Avatar */}
          <div className="flex justify-start -mt-20 mb-6">
            <div className="relative group">
              <Avatar className="w-28 h-28 border-2">
                <AvatarImage src={user?.profileImage || "/placeholder.svg"} />
                <AvatarFallback className="text-3xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* User Info */}
          <div className="text-start mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              {user?.name}
            </h2>
            <div className="flex gap-2 mb-4">
              <Badge
                variant="outline"
                className="bg-purple-100 text-purple-800 border-purple-300 px-3 py-1 text-sm font-medium"
              >
                {user?.role || "Unknown"}
              </Badge>
            </div>
            {/* Bio */}
            {user?.bio && (
              <p className="text-gray-600  mx-auto leading-relaxed">
                {user.bio}
              </p>
            )}
          </div>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/50 rounded-2xl p-0 border border-gray-100">
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {user?.registeredHackathonIds?.length || 0}
                </p>
                <p className="text-sm text-gray-500 font-medium">Hackathons</p>
              </div>
            </div>
            <div className="bg-white/50 rounded-2xl p-0 border border-gray-100">
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <p className="text-2xl font-bold text-gray-800">0</p>
                <p className="text-sm text-gray-500 font-medium">Wins</p>
              </div>
            </div>
            <div className="bg-white/50 rounded-2xl p-0 border border-gray-100">
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {user?.badges?.length || 0}
                </p>
                <p className="text-sm text-gray-500 font-medium">Badges</p>
              </div>
            </div>
            <div className="bg-white/50 rounded-2xl p-0 border border-gray-100">
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Save className="w-6 h-6 text-white" />
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {user?.projects?.length || 0}
                </p>
                <p className="text-sm text-gray-500 font-medium">Projects</p>
              </div>
            </div>
          </div>
          {/* Contact & Social Info */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Information */}
            <div className="bg-white/50 rounded-2xl border border-gray-100 p-0 ">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <UserCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Contact Information
                    </h3>
                    <p className="text-sm text-gray-500">
                      Your personal details
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Mail className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 font-medium">Email</p>
                      <p className="text-gray-700 font-medium">
                        {user?.email || "Not provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Phone className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 font-medium">Phone</p>
                      <p className="text-gray-700 font-medium">
                        {user?.phone || "Not provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 font-medium">
                        Location
                      </p>
                      <p className="text-gray-700 font-medium">
                        {user?.location || "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Social Links */}
            <div className="bg-white/50 rounded-2xl border border-gray-100 p-0">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Social Links
                    </h3>
                    <p className="text-sm text-gray-500">
                      Connect with me online
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {user?.website && (
                    <a
                      href={user.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100 hover:from-orange-100 hover:to-red-100 transition-all group"
                    >
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                        <Globe className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 font-medium">
                          Website
                        </p>
                        <p className="text-gray-700 font-medium group-hover:text-orange-700 transition-colors">
                          Visit my website
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                    </a>
                  )}
                  {user?.github && (
                    <a
                      href={user.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-100 hover:from-gray-100 hover:to-slate-100 transition-all group"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                        <Github className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 font-medium">
                          GitHub
                        </p>
                        <p className="text-gray-700 font-medium group-hover:text-gray-800 transition-colors">
                          View my projects
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </a>
                  )}
                  {user?.linkedin && (
                    <a
                      href={user.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 hover:from-blue-100 hover:to-indigo-100 transition-all group"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <Linkedin className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 font-medium">
                          LinkedIn
                        </p>
                        <p className="text-gray-700 font-medium group-hover:text-blue-700 transition-colors">
                          Connect professionally
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </a>
                  )}
                  {!user?.website && !user?.github && !user?.linkedin && (
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-100">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Info className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 font-medium">
                          No social links
                        </p>
                        <p className="text-gray-500 text-sm">
                          Add your social profiles in edit mode
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Professional Profile Information */}
      <Card className="bg-white/90 rounded-3xl border border-gray-100 p-0 ">
        <div className="space-y-8 p-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Personal Information */}
            <div className="space-y-6">
              <h4 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <UserCircle2 className="w-4 h-4 text-white" />
                </div>
                Personal Details
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 ">
                  <span className="text-sm text-gray-600 font-medium">
                    Gender
                  </span>
                  <span className="text-sm font-semibold text-gray-800 capitalize">
                    {user?.gender?.replace(/-/g, " ") || "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100 ">
                  <span className="text-sm text-gray-600 font-medium">
                    User Type
                  </span>
                  <span className="text-sm font-semibold text-gray-800 capitalize">
                    {user?.userType?.replace(/-/g, " ") || "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100 ">
                  <span className="text-sm text-gray-600 font-medium">
                    Domain
                  </span>
                  <span className="text-sm font-semibold text-gray-800 capitalize">
                    {user?.domain?.replace(/-/g, " ") || "Not specified"}
                  </span>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="space-y-6">
              <h4 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                Academic Details
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100 ">
                  <span className="text-sm text-gray-600 font-medium">
                    Course
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    {user?.course || "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                  <span className="text-sm text-gray-600 font-medium">
                    Course Duration
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    {user?.courseDuration || "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                  <span className="text-sm text-gray-600 font-medium">
                    Current Year
                  </span>
                  <span className="text-sm font-semibold text-gray-800 capitalize">
                    {user?.currentYear?.replace(/-/g, " ") || "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100 ">
                  <span className="text-sm text-gray-600 font-medium">
                    Specialization
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    {user?.courseSpecialization || "Not specified"}
                  </span>
                </div>
              </div>
            </div>

            {/* Institution Information */}
            <div className="space-y-6">
              <h4 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                Institution
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                  <span className="text-sm text-gray-600 font-medium">
                    College/University
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    {user?.collegeName || "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100 ">
                  <span className="text-sm text-gray-600 font-medium">
                    Country
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    {user?.country || "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100 ">
                  <span className="text-sm text-gray-600 font-medium">
                    City
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    {user?.city || "Not specified"}
                  </span>
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="space-y-6">
              <h4 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6"
                    />
                  </svg>
                </div>
                Professional Details
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100">
                  <span className="text-sm text-gray-600 font-medium">
                    Company
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    {user?.companyName || "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100 ">
                  <span className="text-sm text-gray-600 font-medium">
                    Job Title
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    {user?.jobTitle || "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 ">
                  <span className="text-sm text-gray-600 font-medium">
                    Experience
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    {user?.yearsOfExperience
                      ? `${user.yearsOfExperience} years`
                      : "Not specified"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Skills and Interests Display */}
          {(user?.skills?.length > 0 || user?.interests?.length > 0) && (
            <div className="space-y-6">
              <h4 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                Skills & Interests
              </h4>
              <div className="grid md:grid-cols-2 gap-6">
                {user?.skills?.length > 0 && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100">
                    <h5 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </div>
                      Skills
                    </h5>
                    <div className="flex flex-wrap gap-3">
                      {user.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-blue-100 text-blue-800 text-sm font-medium rounded-full transition-all duration-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {user?.interests?.length > 0 && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-100">
                    <h5 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                      </div>
                      Interests
                    </h5>
                    <div className="flex flex-wrap gap-3">
                      {user.interests.map((interest, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-green-100 text-green-800 text-sm font-medium rounded-full"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hackathon Preferences Display */}
          <div className="space-y-6">
            <h4 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              Hackathon Preferences
            </h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100 ">
                <span className="text-sm text-gray-600 font-medium">
                  Team Size Preference
                </span>
                <span className="text-sm font-semibold text-gray-800 capitalize">
                  {user?.teamSizePreference || "Any"}
                </span>
              </div>
              {user?.preferredHackathonTypes?.length > 0 && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-100">
                  <h5 className="text-base font-semibold text-gray-700 mb-4">
                    Preferred Hackathon Types
                  </h5>
                  <div className="flex flex-wrap gap-3">
                    {user.preferredHackathonTypes.map((type, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 bg-purple-100 text-purple-800 text-sm font-medium rounded-full "
                      >
                        {type.replace(/-/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Social Links Display */}
          {(user?.twitter ||
            user?.instagram ||
            user?.portfolio ||
            user?.telegram) && (
            <div className="space-y-6">
              <h4 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center">
                  {/* SVG icon for social */}
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2"
                    />
                  </svg>
                </div>
                Additional Social Links
              </h4>
              <div className="space-y-4">
                {user?.twitter && (
                  <a
                    href={user.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100 hover:from-blue-100 hover:to-cyan-100  transition-all duration-300 group"
                  >
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center ">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 font-semibold mb-1">
                        Twitter
                      </p>
                      <p className="text-gray-800 font-semibold text-base group-hover:text-blue-700 transition-colors">
                        Follow me on Twitter
                      </p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </a>
                )}
                {user?.instagram && (
                  <a
                    href={user.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl border border-pink-100 hover:from-pink-100 hover:to-rose-100 transition-all duration-300 group"
                  >
                    <div className="w-10 h-10 bg-pink-500 rounded-xl flex items-center justify-center ">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 font-semibold mb-1">
                        Instagram
                      </p>
                      <p className="text-gray-800 font-semibold text-base group-hover:text-pink-700 transition-colors">
                        Follow me on Instagram
                      </p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-pink-500 transition-colors" />
                  </a>
                )}
                {user?.portfolio && (
                  <a
                    href={user.portfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-100 hover:from-gray-100 hover:to-slate-100  transition-all duration-300 group"
                  >
                    <div className="w-10 h-10 bg-gray-500 rounded-xl flex items-center justify-center">
                      <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 font-semibold mb-1">
                        Portfolio
                      </p>
                      <p className="text-gray-800 font-semibold text-base group-hover:text-gray-700 transition-colors">
                        View my portfolio
                      </p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </a>
                )}
                {user?.telegram && (
                  <a
                    href={`https://t.me/${user.telegram.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100 hover:from-blue-100 hover:to-cyan-100 transition-all group"
                  >
                    <div className="w-10 h-10 bg-blue-400 rounded-xl flex items-center justify-center">
                      {/* Telegram SVG icon */}
                      <svg
                        className="w-5 h-5 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M9.036 16.572l-.398 3.52c.57 0 .816-.244 1.113-.537l2.664-2.537 5.522 4.04c1.012.557 1.73.264 1.98-.937l3.594-16.84c.328-1.527-.553-2.127-1.54-1.76l-21.36 8.23c-1.46.557-1.44 1.36-.25 1.72l5.46 1.705 12.66-7.98c.6-.41 1.15-.18.7.23z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 font-semibold mb-1">
                        Telegram
                      </p>
                      <p className="text-gray-800 font-semibold text-base group-hover:text-blue-700 transition-colors">
                        {user.telegram.startsWith("@")
                          ? user.telegram
                          : `@${user.telegram}`}
                      </p>
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Achievements Section */}
      <Card className="bg-white/70 rounded-3xl border border-gray-100 p-0">
        <div className="space-y-6 p-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Star className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">
              Achievements & Badges
            </h3>
          </div>
          <AchievementsSection
            user={user}
            onBadgeUnlocked={(badge) => {
              console.log("Badge unlocked:", badge);
              // You can add notification logic here
            }}
          />
        </div>
      </Card>
      {/* Activity Streak Section */}
      <Card className="bg-white/70 rounded-3xl border border-gray-100 p-0 shadow-none hover:shadow-md transition-shadow">
        <div className="space-y-6 p-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">
              Activity Streak
            </h3>
          </div>
          <div className="">
            <StreakGraphic
              data={streakData.activityLog}
              current={streakData.currentStreak}
              max={streakData.maxStreak}
            />
          </div>
        </div>
      </Card>
    </div>
  );

  const renderEditProfile = () => (
    <div className="w-full flex flex-col gap-6">
      {/* Card with Banner and Avatar */}
      <Card className="w-full overflow-hidden relative">
        {/* Loader Overlay */}
        {isUploading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70">
            <svg
              className="animate-spin h-12 w-12 text-purple-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              ></path>
            </svg>
          </div>
        )}
        {/* Banner with Hover Edit */}
        <div className="relative h-48 w-full rounded-t-2xl overflow-hidden group">
          <img
            src={editForm.bannerImage || "/assets/default-banner.png"}
            alt="Banner"
            className="w-full h-full object-cover"
          />

          {/* Edit Banner Icon */}
          <button
            onClick={() =>
              document.getElementById("upload-banner-edit").click()
            }
            className="absolute top-2 right-2 bg-white text-gray-700 p-1 rounded-full shadow-md hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition"
            title="Edit Banner"
          >
            <SquarePen className="w-4 h-4" />
          </button>

          {/* Remove Banner Icon */}
          {editForm.bannerImage &&
            editForm.bannerImage !== "/assets/default-banner.png" && (
              <button
                onClick={handleRemoveBanner}
                className="absolute top-2 right-10 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 opacity-0 group-hover:opacity-100 transition"
                title="Remove Banner"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}

          <input
            type="file"
            id="upload-banner-edit"
            accept="image/*"
            className="hidden"
            onChange={handleBannerUpload}
          />
        </div>

        {/* Avatar with Hover Edit */}
        <div className="relative flex justify-center -mt-16 z-10 group">
          <Avatar className="w-28 h-28 border-[3px] border-white shadow-xl">
            <AvatarImage src={editForm.profileImage || "/placeholder.svg"} />
            <AvatarFallback className="text-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Remove Profile Icon (centered) */}
          {editForm.profileImage && (
            <>
              <button
                onClick={handleRemoveProfileImage}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white p-2 rounded-full shadow-md hover:bg-red-600 opacity-0 group-hover:opacity-100 transition z-20"
                title="Remove Profile Picture"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <button
                onClick={() => document.getElementById("upload-avatar").click()}
                className="absolute left-1/2 top-[60%] -translate-x-1/2 bg-white text-gray-700 p-2 rounded-full shadow-md hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition z-10"
                title="Edit Profile Picture"
              >
                <SquarePen className="w-5 h-5" />
              </button>
            </>
          )}

          {/* If no profile image, show only edit button at center bottom */}
          {!editForm.profileImage && (
            <button
              onClick={() => document.getElementById("upload-avatar").click()}
              className="absolute left-1/2 bottom-2 -translate-x-1/2 bg-white text-gray-700 p-2 rounded-full shadow-md hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition z-10"
              title="Edit Profile Picture"
            >
              <SquarePen className="w-5 h-5" />
            </button>
          )}

          <input
            type="file"
            id="upload-avatar"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        {/* User Info */}
        <CardHeader className="text-center pt-2">
          <CardTitle className="text-xl font-semibold">{user?.name}</CardTitle>
          <CardDescription> {user?.role || "Unknown"}</CardDescription>

          {uploadSuccess && (
            <div className="mt-2 px-4 py-2 rounded bg-green-100 text-green-700 text-sm border border-green-300">
              ✅ Image uploaded successfully!
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Personal Information Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
            <div className="w-full sm:w-[48%]">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
            </div>
            <div className="w-full sm:w-[48%]">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
              />
            </div>
            <div className="w-full sm:w-[48%]">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
              />
            </div>
            <div className="w-full sm:w-[48%]">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={editForm.location}
                onChange={(e) =>
                  setEditForm({ ...editForm, location: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              rows={3}
              value={editForm.bio}
              onChange={(e) =>
                setEditForm({ ...editForm, bio: e.target.value })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Social Links Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
          <CardDescription>
            Add your social media and professional links
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="w-full">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={editForm.website}
              onChange={(e) =>
                setEditForm({ ...editForm, website: e.target.value })
              }
            />
          </div>
          <div className="w-full">
            <Label htmlFor="github">GitHub</Label>
            <Input
              id="github"
              value={editForm.github}
              onChange={(e) =>
                setEditForm({ ...editForm, github: e.target.value })
              }
            />
          </div>
          <div className="w-full">
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              value={editForm.linkedin}
              onChange={(e) =>
                setEditForm({ ...editForm, linkedin: e.target.value })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Personal Details Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle2 className="w-5 h-5" />
            Personal Details
          </CardTitle>
          <CardDescription>
            Update your personal information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                value={editForm.gender}
                onChange={(e) =>
                  setEditForm({ ...editForm, gender: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
              >
                <option value="prefer-not-to-say">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={editForm.age}
                onChange={(e) =>
                  setEditForm({ ...editForm, age: e.target.value })
                }
                placeholder="Enter your age"
              />
            </div>
            <div>
              <Label htmlFor="userType">User Type</Label>
              <select
                id="userType"
                value={editForm.userType}
                onChange={(e) =>
                  setEditForm({ ...editForm, userType: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
              >
                <option value="">Select user type</option>
                <option value="school">School Student</option>
                <option value="college">College Student</option>
                <option value="fresher">Fresher</option>
                <option value="professional">Professional</option>
              </select>
            </div>
            <div>
              <Label htmlFor="domain">Domain</Label>
              <select
                id="domain"
                value={editForm.domain}
                onChange={(e) =>
                  setEditForm({ ...editForm, domain: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
              >
                <option value="">Select domain</option>
                <option value="engineering">Engineering</option>
                <option value="computer-science">Computer Science</option>
                <option value="information-technology">Information Technology</option>
                <option value="data-science">Data Science</option>
                <option value="artificial-intelligence">Artificial Intelligence</option>
                <option value="machine-learning">Machine Learning</option>
                <option value="cybersecurity">Cybersecurity</option>
                <option value="web-development">Web Development</option>
                <option value="mobile-development">Mobile Development</option>
                <option value="game-development">Game Development</option>
                <option value="design">Design</option>
                <option value="business">Business</option>
                <option value="management">Management</option>
                <option value="finance">Finance</option>
                <option value="marketing">Marketing</option>
                <option value="law">Law</option>
                <option value="medicine">Medicine</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="nursing">Nursing</option>
                <option value="architecture">Architecture</option>
                <option value="arts">Arts</option>
                <option value="humanities">Humanities</option>
                <option value="social-sciences">Social Sciences</option>
                <option value="education">Education</option>
                <option value="agriculture">Agriculture</option>
                <option value="environmental-science">Environmental Science</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Academic Details Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Academic Details
          </CardTitle>
          <CardDescription>
            Update your academic information
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="course">Course</Label>
              <Input
                id="course"
                value={editForm.course}
                onChange={(e) =>
                  setEditForm({ ...editForm, course: e.target.value })
                }
                placeholder="e.g., Computer Science"
              />
            </div>
            <div>
              <Label htmlFor="courseDuration">Course Duration</Label>
              <select
                id="courseDuration"
                value={editForm.courseDuration}
                onChange={(e) =>
                  setEditForm({ ...editForm, courseDuration: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
              >
                <option value="">Select duration</option>
                <option value="1-year">1 Year</option>
                <option value="2-years">2 Years</option>
                <option value="3-years">3 Years</option>
                <option value="4-years">4 Years</option>
                <option value="5-years">5 Years</option>
                <option value="6-years">6 Years</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="currentYear">Current Year</Label>
              <select
                id="currentYear"
                value={editForm.currentYear}
                onChange={(e) =>
                  setEditForm({ ...editForm, currentYear: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
              >
                <option value="">Select year</option>
                <option value="1st-year">1st Year</option>
                <option value="2nd-year">2nd Year</option>
                <option value="3rd-year">3rd Year</option>
                <option value="4th-year">4th Year</option>
                <option value="final-year">Final Year</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="courseSpecialization">Specialization</Label>
              <Input
                id="courseSpecialization"
                value={editForm.courseSpecialization}
                onChange={(e) =>
                  setEditForm({ ...editForm, courseSpecialization: e.target.value })
                }
                placeholder="e.g., Software Engineering"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Institution Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Institution
          </CardTitle>
          <CardDescription>
            Update your institution information
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="collegeName">College/University Name</Label>
              <Input
                id="collegeName"
                value={editForm.collegeName}
                onChange={(e) =>
                  setEditForm({ ...editForm, collegeName: e.target.value })
                }
                placeholder="Enter your college/university name"
              />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={editForm.country}
                onChange={(e) =>
                  setEditForm({ ...editForm, country: e.target.value })
                }
                placeholder="Enter your country"
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={editForm.city}
                onChange={(e) =>
                  setEditForm({ ...editForm, city: e.target.value })
                }
                placeholder="Enter your city"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Details Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
            </svg>
            Professional Details
          </CardTitle>
          <CardDescription>
            Update your professional information
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={editForm.companyName}
                onChange={(e) =>
                  setEditForm({ ...editForm, companyName: e.target.value })
                }
                placeholder="Enter your company name"
              />
            </div>
            <div>
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={editForm.jobTitle}
                onChange={(e) =>
                  setEditForm({ ...editForm, jobTitle: e.target.value })
                }
                placeholder="Enter your job title"
              />
            </div>
            <div>
              <Label htmlFor="yearsOfExperience">Years of Experience</Label>
              <select
                id="yearsOfExperience"
                value={editForm.yearsOfExperience}
                onChange={(e) =>
                  setEditForm({ ...editForm, yearsOfExperience: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
              >
                <option value="">Select experience</option>
                <option value="0-1">0-1 years</option>
                <option value="1-2">1-2 years</option>
                <option value="2-3">2-3 years</option>
                <option value="3-5">3-5 years</option>
                <option value="5-10">5-10 years</option>
                <option value="10+">10+ years</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills and Interests Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Skills & Interests
          </CardTitle>
          <CardDescription>
            Add your skills and interests
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="skills">Skills (comma separated)</Label>
              <Input
                id="skills"
                value={editForm.skills}
                onChange={(e) =>
                  setEditForm({ ...editForm, skills: e.target.value })
                }
                placeholder="e.g., JavaScript, Python, React"
              />
            </div>
            <div>
              <Label htmlFor="interests">Interests (comma separated)</Label>
              <Input
                id="interests"
                value={editForm.interests}
                onChange={(e) =>
                  setEditForm({ ...editForm, interests: e.target.value })
                }
                placeholder="e.g., AI, Web Development, Blockchain"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hackathon Preferences Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Hackathon Preferences
          </CardTitle>
          <CardDescription>
            Set your hackathon preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="teamSizePreference">Team Size Preference</Label>
              <select
                id="teamSizePreference"
                value={editForm.teamSizePreference}
                onChange={(e) =>
                  setEditForm({ ...editForm, teamSizePreference: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
              >
                <option value="any">Any</option>
                <option value="solo">Solo</option>
                <option value="2-3">2-3</option>
                <option value="4-5">4-5</option>
                <option value="6+">6+</option>
              </select>
            </div>
            <div>
              <Label htmlFor="preferredHackathonTypes">Preferred Hackathon Types</Label>
              <MultiSelect
                options={hackathonTypeOptions}
                value={editForm.preferredHackathonTypes}
                onChange={(value) =>
                  setEditForm({ ...editForm, preferredHackathonTypes: value })
                }
                placeholder="Select your preferred hackathon types"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Social Links Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
            </svg>
            Additional Social Links
          </CardTitle>
          <CardDescription>
            Add your additional social media links
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="twitter">Twitter</Label>
              <Input
                id="twitter"
                value={editForm.twitter}
                onChange={(e) =>
                  setEditForm({ ...editForm, twitter: e.target.value })
                }
                placeholder="https://twitter.com/username"
              />
            </div>
            <div>
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={editForm.instagram}
                onChange={(e) =>
                  setEditForm({ ...editForm, instagram: e.target.value })
                }
                placeholder="https://instagram.com/username"
              />
            </div>
            <div>
              <Label htmlFor="portfolio">Portfolio</Label>
              <Input
                id="portfolio"
                value={editForm.portfolio}
                onChange={(e) =>
                  setEditForm({ ...editForm, portfolio: e.target.value })
                }
                placeholder="https://your-portfolio.com"
              />
            </div>
            <div>
              <Label htmlFor="telegram">Telegram</Label>
              <Input
                id="telegram"
                value={editForm.telegram}
                onChange={(e) =>
                  setEditForm({ ...editForm, telegram: e.target.value })
                }
                placeholder="Enter your Telegram username or link"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save + Cancel Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-start">
        <AlertDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
        >
          <AlertDialogTrigger asChild>
            <Button
              onClick={handleSaveClick}
              className="flex items-center gap-2 w-full sm:w-auto"
              variant="blue"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to save changes?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will update your profile information. You can't undo this
                action.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pendingSave}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmSave}
                disabled={pendingSave}
              >
                {pendingSave ? "Saving..." : "Yes, Save"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => setCurrentView("overview")}
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  const renderPrivacySecurity = () => (
    <div className="w-full flex flex-col gap-6">
      {/* Password Section - Only show for email users */}
      {user?.authProvider === "email" && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Password & Authentication</CardTitle>
            <CardDescription>Manage your login credentials</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Show Current Password only if registered via email */}
            <div className="relative">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pr-10" // Add padding for eye icon
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-700 focus:outline-none"
                style={{ top: "32px" }}
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* New Password */}
            <div className="relative">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-700 focus:outline-none"
                style={{ top: "32px" }}
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Confirm New Password */}
            <div className="relative">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-700 focus:outline-none"
                style={{ top: "32px" }}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Error and Success Messages */}
            {passwordError && (
              <div className="p-4 bg-red-100 border-2 border-red-500 rounded-lg flex items-center gap-2 mt-2">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0Z"
                  />
                </svg>
                <span className="text-red-700 font-bold text-base">
                  {passwordError}
                </span>
              </div>
            )}

            {passwordMessage && (
              <div className="p-4 bg-green-100 border-2 border-green-500 rounded-lg flex items-center gap-2 mt-2">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-green-700 font-bold text-base">
                  {passwordMessage}
                </span>
              </div>
            )}

            <Button
              className="flex items-center gap-2 w-full sm:w-auto"
              onClick={handlePasswordUpdate}
              variant="blue"
            >
              <Lock className="w-4 h-4" />
              Update Password
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 2FA Section - Only show for email users */}
      {user?.authProvider === "email" && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {twoFAError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{twoFAError}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Enable 2FA</span>
                <p className="text-xs text-gray-500">
                  Secure your account with two-factor authentication
                </p>
              </div>
              <Switch
                checked={twoFactorEnabled}
                onCheckedChange={handle2FAToggle}
                disabled={twoFALoading}
              />
            </div>

            {twoFactorEnabled && (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">2FA is enabled</span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Use your authenticator app to sign in securely
                </p>
              </div>
            )}

            {!twoFactorEnabled && !show2FASetup && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">2FA is disabled</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enable 2FA for enhanced account security
                </p>
              </div>
            )}

            {show2FASetup && (
              <div className="border-t pt-4">
                <TwoFASetup
                  token={token}
                  onSuccess={handle2FASuccess}
                  onCancel={handle2FACancel}
                />
              </div>
            )}

            {/* Password Modal for 2FA Disable */}
            <PasswordModal
              isOpen={showPasswordModal}
              onClose={handlePasswordModalClose}
              onConfirm={handlePasswordConfirm}
              loading={twoFALoading}
              error={twoFAError}
            />
          </CardContent>
        </Card>
      )}

      

      {/* Privacy Settings */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Privacy Settings</CardTitle>
          <CardDescription>Control your data and visibility</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {[
            {
              label: "Profile Visibility",
              desc: "Make your profile visible to other users",
              defaultChecked: true,
            },
            {
              label: "Activity Status",
              desc: "Show when you're online",
              defaultChecked: false,
            },
          ].map(({ label, desc, defaultChecked }) => (
            <div className="flex items-center justify-between" key={label}>
              <div>
                <span className="text-sm font-medium">{label}</span>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              <Switch defaultChecked={defaultChecked} />
            </div>
          ))}
        </CardContent>
      </Card>



      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="blue" className="w-full sm:w-auto">Save Security Settings</Button>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => setCurrentView("overview")}
        >
          Back to Overview
        </Button>
      </div>
    </div>
  );

  const handleSaveChanges = async () => {
    if (!user?._id || !token) {
        toast.error("User not logged in. Please log in again.");
      return;
    }

    // Process array fields - convert comma-separated strings to arrays
    const processArrayField = (field) => {
      if (!field || typeof field !== "string") return [];
      return field
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    };

    const updates = {
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      location: editForm.location,
      bio: editForm.bio,
      website: editForm.website,
      github: editForm.github,
      linkedin: editForm.linkedin,
      profileImage: editForm.profileImage || selectedImage,
      bannerImage: editForm.bannerImage || selectedBanner,
      // New fields from CompleteProfile
      gender: editForm.gender,
      age: editForm.age,
      userType: editForm.userType,
      domain: editForm.domain,
      course: editForm.course,
      courseDuration: editForm.courseDuration,
      collegeName: editForm.collegeName,
      country: editForm.country,
      city: editForm.city,
      courseSpecialization: editForm.courseSpecialization,
      companyName: editForm.companyName,
      jobTitle: editForm.jobTitle,
      yearsOfExperience: editForm.yearsOfExperience,
      currentYear: editForm.currentYear,
      skills: processArrayField(editForm.skills),
      interests: processArrayField(editForm.interests),
      twitter: editForm.twitter,
      instagram: editForm.instagram,
      portfolio: editForm.portfolio,
      preferredHackathonTypes: editForm.preferredHackathonTypes,
      teamSizePreference: editForm.teamSizePreference,
      telegram: editForm.telegram,
    };

    try {
      const res = await axios.put(
        `${API_BASE_URL}/api/users/${user._id}`,
        updates,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updatedUser = res.data;

      // 🔄 Sync context and localStorage
      login(updatedUser, token);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      setCurrentView("overview");
    } catch (err) {
      console.error("Error updating profile:", err);
          toast.error("Failed to update profile, Please try again.");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    setIsUploading(true); // ⏳ Start loading

    try {
      const uploadRes = await axios.post(
        `${API_BASE_URL}/api/uploads/image`,
        formData
      );
      const imageUrl = uploadRes.data.url;

      setSelectedImage(null);
      setEditForm((prev) => ({ ...prev, profileImage: imageUrl }));

      const userData = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      if (userData?._id && token) {
        await axios.put(
          `${API_BASE_URL}/api/users/${userData._id}`,
          { profileImage: imageUrl },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        // ✅ Update local storage and auth context
        const updatedUser = { ...userData, profileImage: imageUrl };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        login(updatedUser, token);
      }

      // ✅ Show success notification
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000); // Auto-hide after 3s
    } catch (err) {
      console.error("Image upload failed:", err);
         toast.error("Failed to update image, Please try again.");
    } finally {
      setIsUploading(false); // ✅ Stop loading
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    setIsUploading(true);

    try {
      const uploadRes = await axios.post(
        `${API_BASE_URL}/api/uploads/image`,
        formData
      );
      const imageUrl = uploadRes.data.url;

      setSelectedBanner(imageUrl);
      setEditForm((prev) => ({ ...prev, bannerImage: imageUrl }));

      const userData = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      if (userData?._id && token) {
        await axios.put(
          `${API_BASE_URL}/api/users/${userData._id}`,
          { bannerImage: imageUrl },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const updatedUser = { ...userData, bannerImage: imageUrl };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        login(updatedUser, token);
      }

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      console.error("Banner upload failed:", err);
        toast.error("Failed to update banner, Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    const userData = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");

    // Clear previous messages
    setPasswordMessage("");
    setPasswordError("");

    console.log("User data from localStorage:", userData);
    console.log("Token available:", !!token);

    if (!userData?._id || !token) {
      setPasswordError("Missing user session. Please re-login.");
      return;
    }

    if (!newPassword || newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match or are empty");
      return;
    }

    // For email users, current password is required
    if (user?.authProvider === "email" && !currentPassword) {
      setPasswordError("Current password is required");
      return;
    }

    // New: Check if current and new password are the same
    if (
      user?.authProvider === "email" &&
      currentPassword &&
      newPassword &&
      currentPassword === newPassword
    ) {
      setPasswordError("Your current and new password are the same");
      return;
    }

    try {
      console.log("Updating password for user:", userData._id);
      console.log("Request payload:", { currentPassword: !!currentPassword, newPassword: !!newPassword });
      
      const response = await axios.put(
        `${API_BASE_URL}/api/users/${userData._id}/password`,
        {
          currentPassword, // Optional if OAuth
          newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Password update response:", response.data);
      setPasswordMessage("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);

      // Clear success message after 3 seconds
      setTimeout(() => setPasswordMessage(""), 3000);
    } catch (err) {
      console.error("Password update error:", err);
      console.error("Error response:", err.response?.data);
      setPasswordError(
        err.response?.data?.message || "Error updating password"
      );
    }
  };

  const handleRemoveBanner = async () => {
    if (!user?._id || !token) {
         toast.error("User not logged in. Please log in again.");
      return;
    }

    try {
      await axios.put(
        `${API_BASE_URL}/api/users/${user._id}`,
        { bannerImage: "/assets/default-banner.png" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSelectedBanner(null);
      setEditForm((prev) => ({
        ...prev,
        bannerImage: "/assets/default-banner.png",
      }));

      // Update user context
      const userData = JSON.parse(localStorage.getItem("user"));
      const updatedUser = {
        ...userData,
        bannerImage: "/assets/default-banner.png",
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      login(updatedUser, token);

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error) {
      console.error("Error removing banner:", error);
        toast.error("Failed to remove banner, Please try again.");
    }
  };

  const handleRemoveProfileImage = async () => {
    if (!user?._id || !token) {
         toast.error("User not logged in. Please log in again.");
      return;
    }

    try {
      await axios.put(
        `${API_BASE_URL}/api/users/${user._id}`,
        { profileImage: "" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSelectedImage(null);
      setEditForm((prev) => ({ ...prev, profileImage: "" }));

      // Update user context
      const userData = JSON.parse(localStorage.getItem("user"));
      const updatedUser = { ...userData, profileImage: "" };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      login(updatedUser, token);

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error) {
      console.error("Error removing profile image:", error);
        toast.error("Failed to remove profile, Please try again.");
    }
  };







  const handleSaveClick = () => {
    setShowConfirmDialog(true);
  };

const handleConfirmSave = async () => {
  setPendingSave(true);
  
  try {
    await handleSaveChanges();
    
    // Success toast
    toast.success("Profile updated successfully!", {
      description: "Your changes have been saved.",
      duration: 4000,
    });
    
    setShowConfirmDialog(false);
    
  } catch (error) {
    console.error('Error saving profile:', error);
    
    // Error toast
    toast.error("Failed to save changes", {
      description: error.message || "Something went wrong. Please try again.",
      duration: 5000,
    });
    
    
  } finally {
    setPendingSave(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-purple-50 to-slate-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex flex-col gap-8">
          {/* Horizontal Tab Navigation */}
          <div className="flex flex-wrap gap-2 justify-start">
            <Button
              variant={currentView === "overview" ? "default" : "outline"}
              onClick={() => setCurrentView("overview")}
            >
              Overview
            </Button>
            <Button
              variant={currentView === "edit-profile" ? "default" : "outline"}
              onClick={() => setCurrentView("edit-profile")}
            >
              Edit Profile
            </Button>
            <Button
              variant={
                currentView === "privacy-security" ? "default" : "outline"
              }
              onClick={() => setCurrentView("privacy-security")}
            >
              Privacy & Security
            </Button>
          </div>

          {/* View Renderer */}
          <div className="flex-1 space-y-6">
            {currentView === "overview" && renderOverview()}
            {currentView === "edit-profile" && renderEditProfile()}
            {currentView === "privacy-security" && renderPrivacySecurity()}
          </div>
        </div>
      </div>


    </div>
  );
}
