"use client"

import { useState, useEffect } from "react"
import { Button } from "../../components/CommonUI/button"
import { Card } from "../../components/CommonUI/card"
import { Input } from "../../components/CommonUI/input"
import { Label } from "../../components/CommonUI/label"
import { Separator } from "../../components/CommonUI/separator"
import { Eye, EyeOff, Zap, Rocket, Trophy, Brain } from "lucide-react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import axios from "axios"
import { useAuth } from "../../context/AuthContext"
import { getDashboardRouteByRole } from "../../utils/roleBasedRouting"
import { API_BASE_URL } from "../../lib/api"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })
  const [errorMsg, setErrorMsg] = useState("");
  const [show2FA, setShow2FA] = useState(false);
  const [twoFAUserId, setTwoFAUserId] = useState("");
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFAError, setTwoFAError] = useState("");
  const [loading, setLoading] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Get redirectTo from URL query parameters
  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get('redirectTo');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setTwoFAError("");
    setShow2FA(false);
    setTwoFACode("");
    setTwoFAUserId("");
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/users/login`, {
        email: formData.email,
        password: formData.password,
      });

      if (res.data.require2FA) {
        setShow2FA(true);
        setTwoFAUserId(res.data.userId);
        return;
      }

      login(res.data.user, res.data.token);
      if (redirectTo) {
        navigate(redirectTo);
      } else {
        const dashboardRoute = getDashboardRouteByRole(res.data.user);
        navigate(dashboardRoute);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setTwoFAError("");
    setTwoFALoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/users/2fa/login`, {
        userId: twoFAUserId,
        token: twoFACode,
      });

      if (res.data.success) {
        login(res.data.user, res.data.token);
        if (redirectTo) {
          navigate(redirectTo);
        } else {
          const dashboardRoute = getDashboardRouteByRole(res.data.user);
          navigate(dashboardRoute);
        }
      } else {
        setTwoFAError("Invalid 2FA code");
      }
    } catch (err) {
      setTwoFAError(err.response?.data?.message || "Invalid 2FA code");
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setTwoFACode(value);
    if (twoFAError) setTwoFAError("");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && twoFACode.length === 6) {
      handle2FASubmit(e);
    }
  };

  const handleGoogleLogin = () => {
    const googleUrl = redirectTo 
      ? `${API_BASE_URL}/api/users/google?redirectTo=${encodeURIComponent(redirectTo)}`
      : `${API_BASE_URL}/api/users/google`;
    window.location.href = googleUrl;
  };

  const handleGithubLogin = () => {
    const githubUrl = redirectTo 
      ? `${API_BASE_URL}/api/users/github?redirectTo=${encodeURIComponent(redirectTo)}`
      : `${API_BASE_URL}/api/users/github`;
    window.location.href = githubUrl;
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-2 sm:p-6">
      {/* Main modal container - Responsive */}
      <Card className="w-full max-w-5xl bg-white shadow-2xl rounded-3xl overflow-hidden h-auto">
        <div className="flex flex-col md:flex-row h-full">
          {/* Left Column - Branding */}
          <div className="w-full md:w-1/2 bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-500 relative overflow-hidden hidden md:flex">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative z-10 flex flex-col justify-center items-center h-full p-8 lg:p-12 text-white w-full">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <Zap className="w-7 h-7" />
                  </div>
                  <h1 className="text-4xl font-bold">HackZen</h1>
                </div>
                <p className="text-xl text-white/90 mb-2">Welcome Back!</p>
                <p className="text-white/80">
                  Sign in to continue your hackathon journey
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 max-w-sm w-full">
                <div className="flex items-center gap-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Rocket className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Build & Innovate</h3>
                    <p className="text-sm text-white/80">
                      Create groundbreaking projects
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Compete & Win</h3>
                    <p className="text-sm text-white/80">
                      Earn recognition and prizes
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Learn & Grow</h3>
                    <p className="text-sm text-white/80">
                      Connect with brilliant minds
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Login Form */}
          <div className="w-full md:w-1/2 bg-white flex flex-col">
            {/* 
              Set a max-h-[600px] (or adjust as needed) for desktop, 
              and make the form area scrollable if content overflows.
            */}
            <div className="h-full flex flex-col p-4 sm:p-8 md:max-h-[650px] md:overflow-y-auto">
              {/* Header - Fixed */}
              <div className="mb-6 flex-shrink-0">
                <h2 className="text-2xl sm:text-3xl font-bold text-[#111827] mb-2">
                  Sign in to your account
                </h2>
                <p className="text-[#6B7280]">
                  Welcome back! Please enter your details
                </p>
              </div>

              {/* Login form - Scrollable if needed */}
              {show2FA ? (
                <form onSubmit={handle2FASubmit} className="space-y-4 flex-1 overflow-y-auto pr-0 sm:pr-2 mb-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Two-Factor Authentication</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Enter the 6-digit code from your authenticator app
                    </p>
                  </div>
                  {twoFAError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-600 text-sm">{twoFAError}</p>
                    </div>
                  )}
                  <div>
                    <input
                      type="text"
                      value={twoFACode}
                      onChange={handleCodeChange}
                      onKeyPress={handleKeyPress}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b0c3f] text-center text-lg tracking-widest font-mono"
                      placeholder="000000"
                      maxLength={6}
                      required
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={twoFALoading || twoFACode.length !== 6}
                    className="w-full bg-[#4F46E5] hover:bg-[#4F46E5]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg transition"
                  >
                    {twoFALoading ? "Verifying..." : "Verify 2FA"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShow2FA(false)}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Back to Login
                  </button>
                </form>
              ) : (
                <div className="flex-1 overflow-y-auto pr-0 sm:pr-2 space-y-4 mb-4">
                  {/* Google Login Button */}
                  <Button
                    variant="outline"
                    className="w-full h-12 border-2 border-gray-200 hover:border-[#4285F4] hover:bg-[#4285F4]/5 transition-all duration-200 bg-transparent"
                    onClick={handleGoogleLogin}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span className="font-medium text-[#111827]">
                        Continue with Google
                      </span>
                    </div>
                  </Button>

                  {/* GitHub Login Button */}
                  <Button
                    variant="outline"
                    className="w-full h-12 border-2 border-gray-200 hover:border-[#24292e] hover:bg-[#24292e]/5 transition-all duration-200 bg-transparent"
                    onClick={handleGithubLogin}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#24292e">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    <span className="font-medium text-[#111827]">
                      Continue with GitHub
                    </span>
                  </div>
                  </Button>

                  {/* Divider */}
                  <div className="flex items-center gap-2">
                    <Separator className="flex-1" />
                    <span className="text-sm text-[#6B7280]">
                      Or login with email
                    </span>
                    <Separator className="flex-1" />
                  </div>

                  {/* Error message */}
                  {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-600 text-sm">{errorMsg}</p>
                    </div>
                  )}

                  {/* Email Input */}
                  <div className="space-y-2 px-1">
                    <Label htmlFor="email" className="text-[#111827] font-medium">
                      Email Id
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={e => handleInputChange("email", e.target.value)}
                      placeholder="Enter your email"
                      className="h-12 border-gray-200 focus:border-[#4F46E5] focus:ring-[#4F46E5] text-base"
                    />
                  </div>

                  {/* Login via OTP */}
                  

                  {/* Password Input */}
                  <div className="space-y-2 px-1">
                    <Label
                      htmlFor="password"
                      className="text-[#111827] font-medium"
                    >
                      Enter Your Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={e =>
                          handleInputChange("password", e.target.value)
                        }
                        placeholder="Enter your password"
                        className="h-12 border-gray-200 focus:border-[#4F46E5] focus:ring-[#4F46E5] text-base pr-12"
                      />
                    </div>
                  </div>

                  {/* Forgot Password */}
                  <div className="text-left">
                    <Button
                      variant="link"
                      className="p-0 h-auto text-[#4F46E5] hover:text-[#4F46E5]/80 font-medium"
                      onClick={() => navigate('/forgot-password')}
                    >
                      Forgot password?
                    </Button>
                  </div>

                  {/* Login Button */}
                  <form onSubmit={handleLogin} className="space-y-4">
                    <Button
                      className="w-full bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white font-medium py-3 h-12 rounded-xl transition-all duration-300 disabled:opacity-50"
                      size="lg"
                      disabled={!formData.email || !formData.password || loading}
                      type="submit"
                    >
                      {loading ? "Logging in..." : "Login"}
                    </Button>
                  </form>

                  <div className="text-center text-sm text-[#6B7280]">
                    Don't have an account?{" "}
                    <Link
                      to="/register"
                      className="text-[#4F46E5] hover:text-[#4F46E5]/80 font-medium"
                    >
                      Sign up
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
