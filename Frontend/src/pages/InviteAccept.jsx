import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, AlertCircle, UserPlus, ArrowRight, XCircle, Mail, Users } from "lucide-react";
import { Button } from "../components/CommonUI/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/CommonUI/card";
import { HackathonRegistration } from "./mainDashboard/partipantDashboard/components/RegistrationHackathon";
import { API_BASE_URL } from "../lib/api";

function getUserFromStorage() {
  try {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function InviteAccept() {
  const { inviteId } = useParams();
  const location = useLocation();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [inviteData, setInviteData] = useState(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const navigate = useNavigate();

  // Helper to refresh user from storage
  const refreshUser = useCallback(() => {
    /* no-op: removed user state */
  }, []);

  // On mount, check for stored invite redirect after login
  useEffect(() => {
    const storedInvite = localStorage.getItem("pendingInviteRedirect");
    if (storedInvite) {
      localStorage.removeItem("pendingInviteRedirect");
      if (window.location.pathname !== storedInvite) {
        navigate(storedInvite, { replace: true });
        return;
      }
    }
    refreshUser();
  }, [navigate, refreshUser]);

  // Main invite logic
  const checkInvite = useCallback(async () => {
    setStatus("loading");
    try {
      const inviteRes = await fetch(`${API_BASE_URL}/api/team-invites/${inviteId}`);
      if (!inviteRes.ok) {
        setStatus("error");
        setMessage("❌ Invalid or expired invitation link.");
        return;
      }
      const invite = await inviteRes.json();
      setInviteData(invite);
      const userObj = getUserFromStorage();
      const searchParams = new URLSearchParams(location.search);
      const forceRegister = searchParams.get('register') === '1';
      if (!userObj) {
        setShowLoginModal(true);
        setShowAcceptModal(false);
        setStatus("login");
        return;
      }
      if (userObj.email !== invite.invitedEmail) {
        setShowLoginModal(false);
        setShowAcceptModal(false);
        setStatus("wronguser");
        setMessage(`You are logged in as ${userObj.email}. Please log out and log in as ${invite.invitedEmail} to accept this invite.`);
        return;
      }
      // If already accepted and forceRegister is set, show registration form only if not already registered
      if (invite.status === 'accepted' && forceRegister && invite.isRegistered === false) {
        setShowLoginModal(false);
        setShowAcceptModal(false);
        setShowRegistrationForm(true);
        setStatus("register");
        return;
      }
      // Already accepted or already a member, but NOT if forceRegister is set
      if (!forceRegister && (invite.status === 'accepted' || (invite.team && invite.team.members && invite.team.members.some(m => m.email === userObj.email)))) {
        setShowLoginModal(false);
        setShowAcceptModal(false);
        setStatus("accepted");
        setMessage("✅ You are already a member of this team!");
        return;
      }
      // Show accept/reject modal
      setShowLoginModal(false);
      setShowAcceptModal(true);
      setStatus("pending");
    } catch {
      setStatus("error");
      setMessage("❌ Failed to process invitation.");
    }
  }, [inviteId, location.search]);

  useEffect(() => {
    checkInvite();
  }, [checkInvite]);

  // Accept invite handler (now just accepts, then shows registration form)
  const handleAccept = async () => {
    setShowAcceptModal(false);
    setStatus("loading");
    try {
      const token = localStorage.getItem("token");
      const acceptRes = await fetch(`${API_BASE_URL}/api/team-invites/${inviteId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await acceptRes.json();
      if (acceptRes.ok) {
        setStatus("register");
        setShowRegistrationForm(true);
      } else {
        setStatus("error");
        setMessage(data.error || "❌ Failed to accept invite.");
      }
    } catch {
      setStatus("error");
      setMessage("❌ Failed to accept invite.");
    }
  };

  // Registration form submit handler
  const handleRegistrationSubmit = async (formData) => {
    setStatus("loading");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/team-invites/${inviteId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ formData })
      });
      const data = await res.json();
      if (res.ok) {
        setRegistrationSuccess(true);
        setStatus("accepted");
        setMessage("✅ You have successfully joined the team and registered for the hackathon!");
      } else {
        setStatus("error");
        setMessage(data.error || "❌ Failed to register for hackathon.");
      }
    } catch {
      setStatus("error");
      setMessage("❌ Failed to register for hackathon.");
    } finally {
      // Always redirect after registration attempt
      setTimeout(() => {
        navigate("/dashboard/my-hackathons");
      }, 2000);
    }
  };

  // Reject invite handler
  const handleReject = async () => {
    setShowAcceptModal(false);
    setStatus("loading");
    try {
      const token = localStorage.getItem("token");
      const rejectRes = await fetch(`${API_BASE_URL}/api/team-invites/${inviteId}/respond`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "declined" })
      });
      const data = await rejectRes.json();
      if (rejectRes.ok) {
        setStatus("declined");
        setMessage("You have declined the invitation.");
        await checkInvite();
      } else {
        setStatus("error");
        setMessage(data.error || "❌ Failed to decline invite.");
      }
    } catch {
      setStatus("error");
      setMessage("❌ Failed to decline invite.");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Card className="w-full max-w-lg border-0 shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-indigo-100 rounded-full animate-pulse"></div>
              <div className="absolute inset-2 bg-indigo-500 rounded-full animate-spin"></div>
              <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                <Mail className="w-4 h-4 text-indigo-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Processing Invitation</h2>
            <p className="text-gray-600">Please wait while we verify your invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Card className="w-full max-w-lg border-0 shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <UserPlus className="w-10 h-10 text-indigo-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">Join the Team!</CardTitle>
            <p className="text-gray-600">You've received a special invitation</p>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-8">
            {inviteData && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-indigo-900">Team Invitation</h3>
                </div>
                <p className="text-indigo-800">
                  You've been invited to join <span className="font-bold">{inviteData.team?.name}</span> for{" "}
                  <span className="font-bold">{inviteData.hackathon?.title}</span>
                </p>
              </div>
            )}
            <div className="space-y-4">
              <p className="text-gray-600 text-center leading-relaxed">
                To accept this invitation, you need to have an account. Please log in or create a new account to continue.
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => {
                    localStorage.setItem("pendingInviteRedirect", `/invite/${inviteId}`);
                    navigate("/login");
                  }}
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg"
                >
                  <ArrowRight className="w-5 h-5 mr-3" />
                  Login to Existing Account
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    localStorage.setItem("pendingInviteRedirect", `/invite/${inviteId}`);
                    navigate("/register");
                  }}
                  className="w-full h-12 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-medium rounded-lg"
                >
                  <UserPlus className="w-5 h-5 mr-3" />
                  Create New Account
                </Button>
              </div>
            </div>
            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                After logging in, you'll be automatically redirected back here to accept the invitation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "wronguser") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-pink-50">
        <Card className="w-full max-w-lg border-0 shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900">Account Mismatch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-8">
            <div className="bg-gradient-to-r from-red-50 to-pink-50 p-6 rounded-xl border border-red-100">
              <p className="text-red-800 leading-relaxed">{message}</p>
            </div>
            <div className="space-y-3">
              <Button 
                onClick={() => {
                  localStorage.setItem("pendingInviteRedirect", `/invite/${inviteId}`);
                  localStorage.removeItem("user");
                  localStorage.removeItem("token");
                  navigate("/login");
                }}
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg"
              >
                Switch Account
              </Button>
              <Button 
                onClick={() => navigate("/dashboard")} 
                variant="outline"
                className="w-full h-12 border-gray-200 text-gray-700 hover:bg-gray-50 font-medium rounded-lg"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show login/register modal
  if (showLoginModal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Card className="w-full max-w-lg border-0 shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <UserPlus className="w-10 h-10 text-indigo-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900">Welcome!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-8">
            <p className="text-gray-600 text-center leading-relaxed">
              Please register or log in to accept this invitation and join the hackathon.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => {
                  localStorage.setItem("pendingInviteRedirect", `/invite/${inviteId}`);
                  navigate("/login");
                }}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg"
              >
                <ArrowRight className="w-5 h-5 mr-3" />
                Login to Existing Account
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  localStorage.setItem("pendingInviteRedirect", `/invite/${inviteId}`);
                  navigate("/register");
                }}
                className="w-full h-12 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-medium rounded-lg"
              >
                <UserPlus className="w-5 h-5 mr-3" />
                Create New Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show accept/reject modal
  if (showAcceptModal && inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Card className="w-full max-w-lg border-0 shadow-xl">
          <CardHeader className="text-center pb-4">
           
            <CardTitle className="text-3xl font-bold text-gray-900">Team Invitation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-8">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-indigo-900">You've been invited!</h3>
              </div>
              <p className="text-indigo-800 leading-relaxed">
                Join <span className="font-bold">{inviteData.team?.name}</span> for <span className="font-bold">{inviteData.hackathon?.title}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={handleAccept} 
                className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg"
              >
                <CheckCircle className="w-5 h-5 mr-2" /> 
                Accept
              </Button>
              <Button 
                onClick={handleReject} 
                variant="outline"
                className="h-12 border-red-200 text-red-700 hover:bg-red-50 font-medium rounded-lg"
              >
                <XCircle className="w-5 h-5 mr-2" /> 
                Decline
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show registration form after accepting invite
  if (showRegistrationForm && inviteData && inviteData.hackathon) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-8">
        <div className="flex flex-col items-center justify-center">
          <div className="w-full max-w-3xl px-6">
            <div className="mb-8 p-6 bg-white rounded-xl shadow-lg border border-indigo-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Complete Your Registration</h2>
                  <p className="text-gray-600">Join the hackathon and start building!</p>
                </div>
              </div>
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-100">
                <p className="text-indigo-900 leading-relaxed">
                  <span className="font-semibold">{inviteData.invitedBy?.name || inviteData.invitedBy?.email || "A friend"}</span> is inviting you to join <span className="font-bold">{inviteData.hackathon?.title}</span>!
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg border border-gray-100">
              <HackathonRegistration
                hackathon={inviteData.hackathon}
                onBack={() => setShowRegistrationForm(false)}
                onSuccess={handleRegistrationSubmit}
                inviteMode={true}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Card className="w-full max-w-lg border-0 shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg ${
            status === "accepted" 
              ? "bg-gradient-to-br from-green-100 to-green-200" 
              : "bg-gradient-to-br from-red-100 to-red-200"
          }`}>
            {status === "accepted" ? (
              <CheckCircle className="w-10 h-10 text-green-600" />
            ) : (
              <AlertCircle className="w-10 h-10 text-red-600" />
            )}
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">
            {status === "accepted" ? "Welcome to the Team!" : "Something went wrong"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 px-8 pb-8">
          <div className={`p-6 rounded-xl border ${
            status === "accepted" 
              ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-100" 
              : "bg-gradient-to-r from-red-50 to-pink-50 border-red-100"
          }`}>
            <p className={`leading-relaxed ${
              status === "accepted" ? "text-green-800" : "text-red-800"
            }`}>
              {message}
            </p>
          </div>
          
          {status === "accepted" && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100">
                <h3 className="font-semibold text-indigo-900 mb-4 flex items-center gap-2">
                  <ArrowRight className="w-5 h-5" />
                  What's Next?
                </h3>
                <ul className="text-indigo-800 space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                    Check your dashboard for team details
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                    Connect with your teammates
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                    Start working on your project
                  </li>
                </ul>
              </div>
              
              <Button 
                onClick={() => navigate("/dashboard/my-hackathons")}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg"
              >
                <ArrowRight className="w-5 h-5 mr-3" />
                Go to My Hackathons
              </Button>
            </div>
          )}
          
          {status === "error" && (
            <Button 
              onClick={() => navigate("/dashboard")}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg"
            >
              Go to Dashboard
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default InviteAccept;
