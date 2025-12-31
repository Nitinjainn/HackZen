"use client";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  BellIcon,
  GitGraphIcon,
  Menu,
  X,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { InteractiveHoverButton } from "../Magic UI/HoverButton";
import { AnimatedList } from "../Magic UI/AnimatedList";
import SignOutModal from "../SignOutModal";
import useDropdownTimeout from "../../hooks/useDropdownTimeout";
import { useToast } from '../../hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../DashboardUI/dialog';
import NotificationBell from '../DashboardUI/NotificationBell';
import { API_BASE_URL } from "../../lib/api";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showHackathonDropdown, setShowHackathonDropdown] = useState(false);
  const [showResourceDropdown, setShowResourceDropdown] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, notification: null });
  const [successDialog, setSuccessDialog] = useState({ open: false, message: '' });

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Check URL search parameters for modal state
  const searchParams = new URLSearchParams(location.search);
  const showLogin = searchParams.get("modal") === "login";
  const showRegister = searchParams.get("modal") === "register";

  const { handleMouseEnter: profileEnter, handleMouseLeave: profileLeave } =
    useDropdownTimeout(setShowProfileDropdown);
  const { handleMouseEnter: hackathonEnter, handleMouseLeave: hackathonLeave } =
    useDropdownTimeout(setShowHackathonDropdown);
  const { handleMouseEnter: resourceEnter, handleMouseLeave: resourceLeave } =
    useDropdownTimeout(setShowResourceDropdown);

  const handleDashboard = () => navigate("/dashboard");

  const handleSignOut = () => {
    logout();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setShowProfileDropdown(false);
    setShowSignOutConfirm(false);
    navigate("/");
  };

  const showSignOutConfirmation = () => {
    setShowSignOutConfirm(true);
    setShowProfileDropdown(false);
  };

  const handleLoginClick = () => {
    // navigate("/?modal=login");
    navigate("/login");
  };

  const handleRegisterClick = () => {
    navigate("/register");
  };

  const handleCloseAuthModal = () => {
    navigate("/");
  };

  // Accept team invite
  const handleAcceptInvite = (notification) => {
    setConfirmDialog({ open: true, action: 'accept', notification });
  };

  // Decline team invite
  const handleDeclineInvite = (notification) => {
    setConfirmDialog({ open: true, action: 'decline', notification });
  };

  const handleConfirmAction = async () => {
    const { action, notification } = confirmDialog;
    if (!notification) return;
    setConfirmDialog({ open: false, action: null, notification: null });
    if (action === 'accept') {
      try {
        const token = localStorage.getItem('token');
        const inviteId = notification.link.split('/').pop();
        const res = await fetch(`${API_BASE_URL}/api/team-invites/${inviteId}/accept`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          toast({ title: 'Invite Accepted', description: data.message || 'You’ve joined the team!' });
          // Immediately redirect to registration form
          navigate(`/invite/${inviteId}?register=1`);
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to accept invite.' });
        }
      } catch (err) {
        toast({ title: 'Error', description: 'Failed to accept invite.' });
      }
    } else if (action === 'decline') {
      try {
        const token = localStorage.getItem('token');
        const inviteId = notification.link.split('/').pop();
        const res = await fetch(`${API_BASE_URL}/api/team-invites/${inviteId}/respond`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'declined' })
        });
        const data = await res.json();
        if (res.ok) {
          setSuccessDialog({ open: true, message: data.message || 'You have declined the invite.' });
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to decline invite.' });
        }
      } catch (err) {
        toast({ title: 'Error', description: 'Failed to decline invite.' });
      }
    }
  };

  const handleSuccessDialogClose = () => {
    setSuccessDialog({ open: false, message: '' });
    if (confirmDialog.action === 'accept' && confirmDialog.notification) {
      // Extract inviteId from notification link
      const inviteId = confirmDialog.notification.link.split('/').pop();
      navigate(`/invite/${inviteId}?register=1`);
    } else {
      navigate('/dashboard/my-hackathons');
    }
  };

  useEffect(() => {
    if (user) {
      // fetchNotifications(); // Removed as per edit hint
    }
  }, [user]);

  return (
    <div className="relative">
      {showSignOutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm z-30"></div>
      )}

      <SignOutModal
        isOpen={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        onConfirm={handleSignOut}
      />

      <nav className="px-6 pt-0">
        <div className="w-full px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="https://res.cloudinary.com/dg2q2tzbv/image/upload/v1751960561/logo_bg_yvh9hq.png"
                alt="HackZen Logo"
                className="w-10 h-10 object-contain border rounded-full"
              />
              <h1 className="text-2xl font-bold font-heading1 text-indigo-800">
                HackZen
              </h1>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex gap-6 items-center">
            <Link
              to="/"
              className="text-[#1b0c3f] hover:text-primary font-medium hover:rotate-3"
            >
              Home
            </Link>

            {/* Hackathons Dropdown */}
            <div
              className="relative"
              onMouseEnter={hackathonEnter}
              onMouseLeave={hackathonLeave}
            >
              <button className="text-[#1b0c3f] hover:text-primary font-medium flex items-center gap-1">
                Hackathons <ChevronDown className="w-4 h-4" />
              </button>
              {showHackathonDropdown && (
                <div className="absolute top-full mt-2 left-0 bg-white/30 border border-gray-200 rounded-xl shadow-lg w-56 z-50 py-2">
                  <Link
                    to="/dashboard/explore-hackathons"
                    className="block px-4 py-2 hover:bg-gray-100"
                  >
                    Explore Hackathons
                  </Link>
                  {user && (
                    <>
                      <Link
                        to="/dashboard/my-hackathons"
                        className="block px-4 py-2 hover:bg-gray-100"
                      >
                        My Hackathons
                      </Link>
                      <Link
                        to="/dashboard/my-submissions"
                        className="block px-4 py-2 hover:bg-gray-100"
                      >
                        My Submissions
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Resources Dropdown */}
            <div
              className="relative"
              onMouseEnter={resourceEnter}
              onMouseLeave={resourceLeave}
            >
              <button className="text-[#1b0c3f] hover:text-primary font-medium flex items-center gap-1">
                Resources <ChevronDown className="w-4 h-4" />
              </button>
              {showResourceDropdown && (
                <div className="absolute top-full mt-2 left-0 bg-white/30 border border-gray-200 rounded-xl shadow-lg w-56 z-50 py-2">
                  <Link
                    to="/dashboard/project-archive"
                    className="block px-4 py-2 hover:bg-gray-100"
                  >
                    Project Archive
                  </Link>
                  <Link
                    to="/dashboard/blogs"
                    className="block px-4 py-2 hover:bg-gray-100"
                  >
                    Blogs
                  </Link>
                </div>
              )}
            </div>

            <Link
              to="/about"
              className="text-[#1b0c3f] hover:text-primary font-medium hover:rotate-3"
            >
              About
            </Link>
          </div>

          {/* Right Section */}
          <div className="hidden md:flex items-center gap-4">
            {/* Notification Bell */}
            <NotificationBell />
            {/* Auth Buttons */}
            {!user ? (
              <>
                <InteractiveHoverButton onClick={handleLoginClick}>
                  Login
                </InteractiveHoverButton>
                <InteractiveHoverButton onClick={handleRegisterClick}>
                  Register
                </InteractiveHoverButton>
              </>
            ) : (
              <div
                className="relative"
                onMouseEnter={profileEnter}
                onMouseLeave={profileLeave}
              >
                <div
                  className="cursor-pointer w-10 h-10 rounded-full bg-[#1b0c3f] text-white flex items-center justify-center font-semibold text-sm uppercase overflow-hidden"
                  title={user?.name || user?.email}
                >
                  {user?.profilePic ? (
                    <img
                      src={user.profilePic}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>
                      {user?.name?.charAt(0) || user?.email?.charAt(0)}
                    </span>
                  )}
                </div>
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white/20 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg z-50 text-sm overflow-hidden">
                    <Link
                      to="/dashboard/profile"
                      className="block px-4 py-2 hover:bg-gray-100 text-gray-900 border-b border-gray-200"
                    >
                      Profile
                    </Link>
                    {user?.role === "admin" && (
                      <Link
                        to="/admin"
                        className="block px-4 py-2 hover:bg-gray-100 text-gray-900 border-b border-gray-200"
                      >
                        Admin Panel
                      </Link>
                    )}
                    {user?.role === "organizer" && (
                      <Link
                        to="/dashboard/organizer-tools"
                        className="block px-4 py-2 hover:bg-gray-100 text-gray-900 border-b border-gray-200"
                      >
                        Organizer Tools
                      </Link>
                    )}
                    {user?.role === "judge" && (
                      <Link
                        to="/dashboard/judge-panel"
                        className="block px-4 py-2 hover:bg-gray-100 text-gray-900 border-b border-gray-200"
                      >
                        Judge Panel
                      </Link>
                    )}
                    <Link
                      to="/dashboard/profile/privacy-security"
                      className="block px-4 py-2 hover:bg-gray-100 text-gray-900 border-b border-gray-200"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={showSignOutConfirmation}
                      className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? (
                <X className="w-6 h-6 text-indigo-600" />
              ) : (
                <Menu className="w-6 h-6 text-indigo-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isOpen && (
          <div className="md:hidden flex flex-col gap-4 pb-4">
            <Link
              to="/"
              className="text-gray-800 hover:text-indigo-600 font-medium"
            >
              Home
            </Link>
            <Link
              to="/dashboard/explore-hackathons"
              className="text-gray-800 hover:text-indigo-600 font-medium"
            >
              Explore Hackathons
            </Link>
            {user && (
              <>
                <Link
                  to="/dashboard/my-hackathons"
                  className="text-gray-800 hover:text-indigo-600 font-medium"
                >
                  My Hackathons
                </Link>
                <Link
                  to="/dashboard/my-submissions"
                  className="text-gray-800 hover:text-indigo-600 font-medium"
                >
                  My Submissions
                </Link>
              </>
            )}

            <Link
              to="/dashboard/project-archive"
              className="text-gray-800 hover:text-indigo-600 font-medium"
            >
              Project Archive
            </Link>
            <Link
              to="/dashboard/blogs"
              className="text-gray-800 hover:text-indigo-600 font-medium"
            >
              Blogs
            </Link>
            <Link
              to="/about"
              className="text-gray-800 hover:text-indigo-600 font-medium"
            >
              About
            </Link>
            {!user ? (
              <>
                <button
                  onClick={handleLoginClick}
                  className="text-left text-indigo-600"
                >
                  Login
                </button>
                <button
                  onClick={handleRegisterClick}
                  className="text-left text-indigo-600"
                >
                  Register
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleDashboard}
                  className="text-left text-indigo-600 font-medium"
                >
                  Dashboard
                </button>
                <button
                  onClick={showSignOutConfirmation}
                  className="text-left text-red-600 font-medium flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            )}
          </div>
        )}
      </nav>
      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={open => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              {confirmDialog.action === 'accept'
                ? 'Do you want to accept this team invite? You will join the team.'
                : 'Do you want to decline this team invite? You will not be able to join this team unless re-invited.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-4 justify-end mt-4">
            <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setConfirmDialog({ open: false, action: null, notification: null })}>Cancel</button>
            <button className={`px-4 py-2 rounded text-white ${confirmDialog.action === 'accept' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`} onClick={handleConfirmAction}>
              {confirmDialog.action === 'accept' ? 'Accept' : 'Decline'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Success Dialog */}
      <Dialog open={successDialog.open} onOpenChange={handleSuccessDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Success</DialogTitle>
            <DialogDescription>{successDialog.message}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={handleSuccessDialogClose}>Go to My Hackathons</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Navbar;
