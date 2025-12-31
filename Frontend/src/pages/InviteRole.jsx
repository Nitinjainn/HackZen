import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "../components/CommonUI/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/CommonUI/card";
import { CheckCircle, XCircle, Gavel, AlertCircle, Award, LogIn, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../lib/api";

export default function InviteRole() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      // Fetch invite details
      fetch(`${API_BASE_URL}/api/role-invites/${token}`)
        .then(res => res.json())
        .then(data => setInvite(data))
        .catch(err => {
          console.error('Error fetching invite:', err);
          setError('Failed to load invitation');
        })
        .finally(() => setLoading(false));
      
      // Check if user is logged in
      const userToken = localStorage.getItem('token');
      if (userToken) {
        // Verify token and get user info
        fetch('${API_BASE_URL}/api/users/me', {
          headers: { Authorization: `Bearer ${userToken}` }
        })
        .then(res => {
          if (!res.ok) {
            throw new Error('Invalid token');
          }
          return res.json();
        })
        .then(data => {
          if (data._id) {
            setUser(data);
          } else {
            // Invalid response, remove token
            localStorage.removeItem('token');
          }
        })
        .catch(err => {
          console.error('Error fetching user:', err);
          // Token might be invalid, remove it
          localStorage.removeItem('token');
        })
        .finally(() => setUserLoading(false));
      } else {
        setUserLoading(false);
      }
    }
  }, [token]);

  const respond = async (action) => {
    try {
      const endpoint = action === "accept"
        ? `/api/role-invites/${token}/accept`
        : `/api/role-invites/${token}/decline`;
      
      const userToken = localStorage.getItem("token");
      if (!userToken) {
        setError('You must be logged in to respond to this invitation');
        return;
      }

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}` 
        }
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || `Invite ${action}ed successfully!`);
        navigate("/dashboard/judge");
      } else {
        const errorData = await res.json();
        setError(errorData.error || `Failed to ${action} invite`);
      }
    } catch (err) {
      console.error('Error responding to invite:', err);
      setError('Network error. Please try again.');
    }
  };

  const handleLogin = () => {
    // Redirect to login with return URL
    const returnUrl = encodeURIComponent(window.location.href);
    navigate(`/login?returnUrl=${returnUrl}`);
  };

  if (loading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Card className="w-full max-w-4xl border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-indigo-100 rounded-full animate-pulse"></div>
              <div className="absolute inset-2 bg-indigo-500 rounded-full animate-spin"></div>
              <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                <Gavel className="w-4 h-4 text-indigo-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Loading Invitation</h2>
            <p className="text-gray-600">Please wait while we verify your judge invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invite || invite.error || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-pink-50">
        <Card className="w-full max-w-4xl border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {error ? 'Error Loading Invitation' : 'Invitation Not Found'}
            </h2>
            <div className="bg-gradient-to-r from-red-50 to-pink-50 p-6 rounded-xl border border-red-100 mb-6">
              <p className="text-red-800 leading-relaxed">
                {error || 'The invitation link is invalid or has expired. Please contact the hackathon organizer for a new invitation.'}
              </p>
            </div>
            <Button 
              onClick={() => navigate("/dashboard")}
              className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-8"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-6xl border-0 shadow-xl">
        {/* Header Section */}
        <CardHeader className="text-center pb-6">
         
          <CardTitle className="text-4xl font-bold text-gray-900 mb-2">Judge Invitation</CardTitle>
          <p className="text-gray-600 text-lg">You've been invited to be a judge for this hackathon</p>
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            
            {/* Left Column - Invitation Details */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100 h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-indigo-900">Invitation Details</h3>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-lg border border-indigo-100">
                    <span className="text-indigo-700 font-medium text-sm uppercase tracking-wide">Hackathon</span>
                    <p className="text-indigo-900 font-bold text-lg mt-1">{invite.hackathon?.title}</p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-indigo-100">
                    <span className="text-indigo-700 font-medium text-sm uppercase tracking-wide">Role</span>
                    <p className="text-indigo-900 font-bold text-lg mt-1 capitalize">{invite.role}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Column - Role Description */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100 h-full">
                <h4 className="text-xl font-semibold text-blue-900 mb-6 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6" />
                  What does this mean?
                </h4>
                <ul className="text-blue-800 space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-white text-xs font-bold">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Evaluate Submissions</p>
                      <p className="text-sm text-blue-700">Review and score project submissions</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-white text-xs font-bold">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Provide Feedback</p>
                      <p className="text-sm text-blue-700">Give valuable feedback to participants</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-white text-xs font-bold">3</span>
                    </div>
                    <div>
                      <p className="font-medium">Select Winners</p>
                      <p className="text-sm text-blue-700">Help determine the hackathon winners</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Column - Actions */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-6 rounded-xl border border-gray-100 h-full flex flex-col justify-between">
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-4">Ready to Judge?</h4>
                  
                  {/* Authentication Status */}
                  {!user ? (
                    <div className="mb-6">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <LogIn className="w-5 h-5 text-yellow-600" />
                          <span className="text-yellow-800 font-medium">Login Required</span>
                        </div>
                        <p className="text-yellow-700 text-sm">
                          You need to be logged in to respond to this invitation. Please log in with the email address: <strong>{invite.email}</strong>
                        </p>
                      </div>
                      <Button 
                        onClick={handleLogin}
                        className="w-full h-14 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg text-lg"
                      >
                        <LogIn className="w-6 h-6 mr-3" />
                        Log In to Continue
                      </Button>
                    </div>
                  ) : user.email !== invite.email ? (
                    <div className="mb-6">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="w-5 h-5 text-red-600" />
                          <span className="text-red-800 font-medium">Email Mismatch</span>
                        </div>
                        <p className="text-red-700 text-sm">
                          This invitation is for <strong>{invite.email}</strong> but you are logged in as <strong>{user.email}</strong>. Please log in with the correct email address.
                        </p>
                      </div>
                      <Button 
                        onClick={handleLogin}
                        className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-lg"
                      >
                        <LogIn className="w-6 h-6 mr-3" />
                        Log In with Correct Email
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-600 mb-6">
                        Accept this invitation to start your journey as a hackathon judge and help shape the future of innovation.
                      </p>
                      
                      <div className="space-y-4">
                        <Button 
                          onClick={() => respond("accept")}
                          className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-lg"
                        >
                          <CheckCircle className="w-6 h-6 mr-3" />
                          Accept Invitation
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => respond("decline")}
                          className="w-full h-14 border-red-200 text-red-700 hover:bg-red-50 font-medium rounded-lg text-lg"
                        >
                          <XCircle className="w-6 h-6 mr-3" />
                          Decline Invitation
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-6 border-t border-gray-100">
            <p className="text-gray-500">
              By accepting, you agree to judge fairly and provide constructive feedback to all participants.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
