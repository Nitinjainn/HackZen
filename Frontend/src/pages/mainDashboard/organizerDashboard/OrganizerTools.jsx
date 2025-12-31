"use client";
import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Download,
  Settings,
  Users,
  Trophy,
  MessageSquare,
  Award,
  FileText,
  Calendar,
} from "lucide-react";
import { API_BASE_URL } from "../../../lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/CommonUI/card";
import { Button } from "../../../components/CommonUI/button";
import { Badge } from "../../../components/CommonUI/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/CommonUI/tabs";
import { Progress } from "../../../components/DashboardUI/progress";

const recentActivity = [
  {
    id: 1,
    action: "New participant registered",
    event: "AI Innovation Challenge",
    time: "2 minutes ago",
    type: "registration",
  },
  {
    id: 2,
    action: "Project submitted",
    event: "Cybersecurity Challenge",
    time: "15 minutes ago",
    type: "submission",
  },
  {
    id: 3,
    action: "Judge assigned",
    event: "Web3 Builder Fest",
    time: "1 hour ago",
    type: "judging",
  },
  {
    id: 4,
    action: "Announcement sent",
    event: "All Events",
    time: "2 hours ago",
    type: "communication",
  },
];

const quickActions = [
  {
    title: "Export Participant Data",
    description: "Download CSV of all participant information",
    icon: Download,
    action: "export-participants",
    category: "Data Management",
  },
  {
    title: "Generate Analytics Report",
    description: "Create comprehensive event performance report",
    icon: BarChart3,
    action: "analytics-report",
    category: "Analytics",
  },
  {
    title: "Bulk Send Certificates",
    description: "Send completion certificates to winners",
    icon: Award,
    action: "send-certificates",
    category: "Awards",
  },
  {
    title: "Schedule Announcement",
    description: "Create and schedule future announcements",
    icon: MessageSquare,
    action: "schedule-announcement",
    category: "Communication",
  },
  {
    title: "Manage Judges",
    description: "Advanced judge management with problem statement assignments",
    icon: Users,
    action: "manage-judges",
    category: "Event Management",
  },
];

// Placeholder chart component
function AnalyticsGraph() {
  return (
    <div className="w-full h-[430px] flex items-center justify-center bg-indigo-50 rounded-xl border border-indigo-100 my-4">
      <span className="text-indigo-400">[Analytics Graph Placeholder]</span>
    </div>
  );
}

export function OrganizerTools() {
  const [analyticsData, setAnalyticsData] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalParticipants: 0,
    totalSubmissions: 0,
    averageRating: 0,
    completionRate: 0,
    monthlyGrowth: 0,
    topPerformingEvent: "-",
  });
  const [_, setLoading] = useState(true); // loading state not used

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("${API_BASE_URL}/api/hackathons/my", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const hackathons = await res.json();
        // Calculate analytics
        const totalEvents = hackathons.length;
        const totalParticipants = hackathons.reduce(
          (sum, h) => sum + (h.participants?.length || 0),
          0
        );
        const totalSubmissions = hackathons.reduce(
          (sum, h) => sum + (h.submissions?.length || 0),
          0
        );
        setAnalyticsData({
          totalEvents,
          activeEvents: hackathons.filter((h) => h.status === "ongoing").length,
          totalParticipants,
          totalSubmissions,
          averageRating: 0, // Placeholder
          completionRate: 0, // Placeholder
          monthlyGrowth: 0, // Placeholder
          topPerformingEvent: hackathons[0]?.title || "-",
        });
      } catch {
        setAnalyticsData({
          totalEvents: 0,
          activeEvents: 0,
          totalParticipants: 0,
          totalSubmissions: 0,
          averageRating: 0,
          completionRate: 0,
          monthlyGrowth: 0,
          topPerformingEvent: "-",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const getActivityIcon = (type) => {
    switch (type) {
      case "registration":
        return <Users className="w-4 h-4 text-indigo-500" />;
      case "submission":
        return <FileText className="w-4 h-4 text-green-500" />;
      case "judging":
        return <Award className="w-4 h-4 text-indigo-400" />;
      case "communication":
        return <MessageSquare className="w-4 h-4 text-orange-500" />;
      default:
        return <Settings className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="flex-1 p-6 bg-gray-50 min-h-screen">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Organizer Tools
        </h1>
        <p className="text-base text-gray-500 mt-1">
          Advanced tools and analytics for event management
        </p>
      </div>

      {/* Main Analytics and Sidebar */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Analytics Overview and Graph */}
        <div className="flex-1 space-y-8">
          {/* Analytics Overview */}
          <Card className="shadow-sm border border-gray-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-700">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Analytics Overview
              </CardTitle>
              <CardDescription className="text-gray-500">
                Key metrics across all your events
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-3xl font-bold text-indigo-700">
                    {analyticsData.totalEvents}
                  </p>
                  <p className="text-sm text-gray-600">Total Events</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-3xl font-bold text-green-600">
                    {analyticsData.totalParticipants}
                  </p>
                  <p className="text-sm text-gray-600">Participants</p>
                </div>
                <div className="text-center p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-3xl font-bold text-indigo-700">
                    {analyticsData.totalSubmissions}
                  </p>
                  <p className="text-sm text-gray-600">Submissions</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                  <p className="text-3xl font-bold text-yellow-600">
                    {analyticsData.averageRating}
                  </p>
                  <p className="text-sm text-gray-600">Avg Rating</p>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Completion Rate</span>
                    <span>{analyticsData.completionRate}%</span>
                  </div>
                  <Progress
                    value={analyticsData.completionRate}
                    className="h-2 bg-indigo-100"
                    indicatorClassName="bg-indigo-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Monthly Growth</span>
                    <span>+{analyticsData.monthlyGrowth}%</span>
                  </div>
                  <Progress
                    value={analyticsData.monthlyGrowth}
                    className="h-2 bg-indigo-100"
                    indicatorClassName="bg-indigo-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analytics Graph */}
          <AnalyticsGraph />
        </div>

        {/* Right: Sidebar */}
        <div className="w-full lg:w-[350px] flex-shrink-0 space-y-8">
          {/* Recent Activity */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Recent Activity
              </CardTitle>
              <CardDescription className="text-gray-500">
                Latest events across your hackathons
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                >
                  {getActivityIcon(activity.type)}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.action}
                    </p>
                    <p className="text-xs text-gray-600">{activity.event}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Today's Summary */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Today's Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">New Registrations</span>
                <span className="font-medium">23</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Submissions</span>
                <span className="font-medium">8</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Reviews Completed</span>
                <span className="font-medium">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Messages Sent</span>
                <span className="font-medium">156</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions - Full Width */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action) => {
            const ActionIcon = action.icon;
            return (
              <Card
                key={action.action}
                className="border border-gray-200 bg-white shadow-sm flex flex-col"
              >
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100">
                    <ActionIcon className="w-6 h-6 text-indigo-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-indigo-700">
                      {action.title}
                    </CardTitle>
                    <CardDescription className="text-gray-500">
                      {action.category}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between pt-0">
                  <p className="text-sm text-gray-500 mb-4">
                    {action.description}
                  </p>
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow"
                  >
                    Execute
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
