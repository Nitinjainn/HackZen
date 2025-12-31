"use client";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/CommonUI/card";
import { Button } from "../../../../components/CommonUI/button";
import { Badge } from "../../../../components/CommonUI/badge";
import { API_BASE_URL } from "../../../../lib/api";
import {
  Gavel,
  Target,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  Building,
  Globe,
  Shield,
  Mail,
} from "lucide-react";
import { useAuth } from "../../../../context/AuthContext";

export default function JudgeInvitation() {
  const { assignmentId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [hackathon, setHackathon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    if (assignmentId) {
      fetchAssignmentDetails();
    }
  }, [assignmentId]);

  const fetchAssignmentDetails = async () => {
    try {
      // Note: You'll need to create this endpoint to fetch assignment details
      const response = await fetch(
        `${API_BASE_URL}/api/judge-management/judge-assignments/${assignmentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setAssignment(data.assignment);
        setHackathon(data.hackathon);
      } else {
        console.error("Failed to fetch assignment details");
      }
    } catch (error) {
      console.error("Error fetching assignment details:", error);
    } finally {
      setLoading(false);
    }
  };

  const respondToInvitation = async (response) => {
    setResponding(true);
    try {
      const apiResponse = await fetch(
        `${API_BASE_URL}/api/judge-management/judge-assignments/${assignmentId}/respond`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ response }),
        }
      );

      if (apiResponse.ok) {
        if (response === "accept") {
          alert("✅ Invitation accepted! You can now access the judge dashboard.");
          navigate("/dashboard/judge");
        } else {
          alert("❌ Invitation declined.");
          navigate("/dashboard");
        }
      } else {
        alert("Failed to respond to invitation");
      }
    } catch (error) {
      console.error("Error responding to invitation:", error);
      alert("Error responding to invitation");
    } finally {
      setResponding(false);
    }
  };

  const getJudgeTypeIcon = (type) => {
    switch (type) {
      case "platform":
        return <Globe className="w-5 h-5 text-blue-500" />;
      case "sponsor":
        return <Building className="w-5 h-5 text-green-500" />;
      case "hybrid":
        return <Shield className="w-5 h-5 text-purple-500" />;
      default:
        return <Users className="w-5 h-5 text-gray-500" />;
    }
  };

  const getJudgeTypeLabel = (type) => {
    switch (type) {
      case "platform":
        return "Platform Judge";
      case "sponsor":
        return "Sponsor Judge";
      case "hybrid":
        return "Hybrid Judge";
      default:
        return "Unknown";
    }
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-8 p-6 bg-gray-50 min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex-1 space-y-8 p-6 bg-gray-50 min-h-screen">
        <div className="text-center py-12">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Invitation Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            This judge invitation could not be found or has expired.
          </p>
          <Button onClick={() => navigate("/dashboard")}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Check if the invitation is for the current user
  if (assignment.judge.email !== user.email) {
    return (
      <div className="flex-1 space-y-8 p-6 bg-gray-50 min-h-screen">
        <div className="text-center py-12">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-6">
            This invitation is not for your email address.
          </p>
          <Button onClick={() => navigate("/dashboard")}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Gavel className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Judge Invitation
            </h1>
          </div>
          <p className="text-lg text-gray-600">
            You've been invited to judge a hackathon
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Hackathon Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-500" />
                  Hackathon Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {hackathon?.title}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {hackathon?.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Start Date</p>
                    <p className="font-medium">
                      {new Date(hackathon?.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">End Date</p>
                    <p className="font-medium">
                      {new Date(hackathon?.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Problem Statements</p>
                  <div className="space-y-2">
                    {hackathon?.problemStatements?.map((ps, index) => (
                      <div
                        key={index}
                        className="p-3 border rounded-lg bg-gray-50"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge
                            variant={ps.type === "sponsored" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {ps.type === "sponsored" ? "Sponsored" : "General"}
                          </Badge>
                          {ps.type === "sponsored" && ps.sponsorCompany && (
                            <span className="text-xs text-gray-600">
                              {ps.sponsorCompany}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">
                          {typeof ps === "object" ? ps.statement : ps}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Judge Assignment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  Your Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-4 border rounded-lg bg-indigo-50">
                  {getJudgeTypeIcon(assignment.judge.type)}
                  <div>
                    <p className="font-medium">
                      {getJudgeTypeLabel(assignment.judge.type)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {assignment.judge.email}
                    </p>
                  </div>
                </div>

                {/* Assigned Problem Statements */}
                {assignment.assignedProblemStatements?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Assigned Problem Statements:</h4>
                    <div className="space-y-2">
                      {assignment.assignedProblemStatements.map((ps, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 border rounded-lg"
                        >
                          <Target className="w-4 h-4 text-indigo-500 mt-1" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{ps.problemStatement}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {ps.type}
                              </Badge>
                              {ps.sponsorCompany && (
                                <span className="text-xs text-gray-600">
                                  {ps.sponsorCompany}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assigned Rounds */}
                {assignment.assignedRounds?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Assigned Rounds:</h4>
                    <div className="space-y-2">
                      {assignment.assignedRounds.map((round, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 border rounded-lg"
                        >
                          <Award className="w-4 h-4 text-indigo-500" />
                          <div>
                            <p className="font-medium">{round.roundName}</p>
                            <p className="text-sm text-gray-600 capitalize">
                              {round.roundType} round
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Permissions */}
                <div>
                  <h4 className="font-medium mb-3">Your Permissions:</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">
                        {assignment.permissions.canJudgeGeneralPS
                          ? "Can judge general problem statements"
                          : "Cannot judge general problem statements"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">
                        {assignment.permissions.canJudgeSponsoredPS
                          ? "Can judge sponsored problem statements"
                          : "Cannot judge sponsored problem statements"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invitation Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="font-medium">Pending Response</p>
                    <p className="text-sm text-gray-600">
                      Please accept or decline this invitation
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => respondToInvitation("accept")}
                    disabled={responding}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accept Invitation
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-red-600 hover:text-red-700"
                    onClick={() => respondToInvitation("decline")}
                    disabled={responding}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Decline Invitation
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Judge Type Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Judge Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    {getJudgeTypeIcon(assignment.judge.type)}
                    <div>
                      <p className="font-medium">
                        {getJudgeTypeLabel(assignment.judge.type)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {assignment.judge.type === "platform" &&
                          "Can judge general problem statements"}
                        {assignment.judge.type === "sponsor" &&
                          `Can judge ${assignment.judge.sponsorCompany} problem statements`}
                        {assignment.judge.type === "hybrid" &&
                          "Can judge all problem statement types"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Organizer</p>
                    <p className="text-sm text-gray-600">
                      Contact the hackathon organizer for questions
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 