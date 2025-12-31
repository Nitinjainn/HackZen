"use client"

import { Card, CardContent, CardHeader, CardTitle } from "../../../components/CommonUI/card"
import { RCard, RCardContent, RCardHeader, RCardTitle } from "../../../components/CommonUI/RippleCard"
import { Button } from "../../../components/CommonUI/button"
import { API_BASE_URL } from "../../../lib/api"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"
import { TrendingUp, Users, Target, DollarSign, Download, Calendar } from "lucide-react"
import { useEffect, useState } from "react";
import axios from "axios";

export function AnalyticsPage() {
  // State for all analytics data
  const [userStats, setUserStats] = useState(null);
  const [userMonthlyStats, setUserMonthlyStats] = useState([]);
  const [hackathonStats, setHackathonStats] = useState(null);
  const [hackathonMonthlyStats, setHackathonMonthlyStats] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [engagementData, setEngagementData] = useState([]);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        // Fetch all analytics endpoints in parallel
        const [userStatsRes, userMonthlyRes, hackathonStatsRes, hackathonMonthlyRes, statusRes, engagementRes, categoryRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/users/admin/stats`, { headers }),
          axios.get(`${API_BASE_URL}/api/users/admin/monthly-stats`, { headers }),
          axios.get(`${API_BASE_URL}/api/hackathons/admin/stats`, { headers }),
          axios.get(`${API_BASE_URL}/api/hackathons/admin/monthly-stats`, { headers }),
          axios.get("${API_BASE_URL}/api/hackathons/admin/status-breakdown", { headers }),
          axios.get("${API_BASE_URL}/api/users/admin/weekly-engagement", { headers }),
          axios.get("${API_BASE_URL}/api/hackathons/admin/category-breakdown", { headers }),
        ]);
        setUserStats(userStatsRes.data);
        setUserMonthlyStats(userMonthlyRes.data);
        setHackathonStats(hackathonStatsRes.data);
        setHackathonMonthlyStats(hackathonMonthlyRes.data);
        setStatusData(statusRes.data);
        setEngagementData(engagementRes.data);
        setCategoryData(categoryRes.data);
      } catch {
        // Optionally handle error
        setUserStats(null);
        setUserMonthlyStats([]);
        setHackathonStats(null);
        setHackathonMonthlyStats([]);
        setStatusData([]);
        setEngagementData([]);
        setCategoryData([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  // Prepare chart data
  const monthlyData = hackathonMonthlyStats.map((h, i) => ({
    month: h.month,
    hackathons: h.hackathons,
    users: userMonthlyStats[i]?.users || 0,
    revenue: 0, // Placeholder, add revenue if available
    submissions: 0, // Placeholder, add submissions if available
  }));

  const userGrowthData = userMonthlyStats.map((u, i) => ({
    month: u.month,
    newUsers: u.users,
    totalUsers: userMonthlyStats.slice(0, i + 1).reduce((sum, curr) => sum + curr.users, 0),
  }));

  // Fallback for loading state
  if (loading) {
    return <div className="p-10 text-center text-lg">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6 bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-black">Reports & Analytics</h1>
        <div className="flex items-center space-x-3">
          <Button variant="default" className="">
            <Calendar className="w-4 h-4 mr-2" />
            Last 6 Months
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <RCard>
          <RCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-700 text-sm">Total Users</p>
                <p className="text-2xl font-bold text-black">{userStats?.totalUsers ?? '-'}</p>
                <p className="text-gray-600 text-sm flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {userStats?.userGrowthPercentage ?? '-'} from last month
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </RCardContent>
        </RCard>
        <RCard>
          <RCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-700 text-sm">Total Hackathons</p>
                <p className="text-2xl font-bold text-black">{hackathonStats?.totalHackathons ?? '-'}</p>
                <p className="text-gray-600 text-sm flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {hackathonStats?.hackathonGrowthPercentage ?? '-'} from last month
                </p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </RCardContent>
        </RCard>
        <RCard>
          <RCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-700 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold text-black">Will be updated soon</p>
                <p className="text-gray-600 text-sm flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Will be updated soon
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </RCardContent>
        </RCard>
        <RCard>
          <RCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-700 text-sm">Avg. Engagement</p>
                <p className="text-2xl font-bold text-black">Will be updated soon</p>
                <p className="text-gray-600 text-sm flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Will be updated soon
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center text-white text-sm font-bold">
                T
              </div>
            </div>
          </RCardContent>
        </RCard>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-black flex items-center">
              <BarChart className="w-5 h-5 mr-2 text-purple-500" />
              Monthly Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    border: "1px solid rgba(47, 2, 89, 0.3)",
                    borderRadius: "8px",
                    color: "white",
                  }}
                />
                <Bar dataKey="hackathons" fill="#8B5CF6" name="Hackathons" />
                <Bar dataKey="users" fill="#3B82F6" name="Users" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="text-black flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
              User Growth Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    border: "1px solid rgba(168, 85, 247, 0.3)",
                    borderRadius: "8px",
                    color: "white",
                  }}
                />
                <Area type="monotone" dataKey="totalUsers" stroke="#10B981" fill="url(#colorUsers)" strokeWidth={2} />
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-black flex items-center">
              <Target className="w-5 h-5 mr-2 text-blue-500" />
              Hackathon Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    border: "1px solid rgba(168, 85, 247, 0.3)",
                    borderRadius: "8px",
                    color: "white",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Engagement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-black flex items-center">
              <Users className="w-5 h-5 mr-2 text-yellow-500" />
              Weekly Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {engagementData && engagementData.length > 0 ? (
                <LineChart data={['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => engagementData.find(d => d.day === day) || { day, sessions: 0 })}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="day" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0, 0, 0, 0.8)",
                      border: "1px solid rgba(168, 85, 247, 0.3)",
                      borderRadius: "8px",
                      color: "white",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sessions"
                    stroke="#F59E0B"
                    strokeWidth={3}
                    dot={{ fill: "#F59E0B", strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">No engagement data available</div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-black">Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 ring-1 ring-indigo-300 rounded-xl border border-white/20 bg-gradient-to-br from-white/10 to-indigo-200/10 backdrop-blur-lg shadow-sm shadow-indigo-300 text-gray-900 transition-all hover:scale-[1.01]">
              <h3 className="text-black font-semibold mb-2">Top Performing Category</h3>
              <p className="text-black text-lg">AI/ML Hackathons</p>
              <p className="text-gray-600 text-sm">35% of all events, 4.8★ avg rating</p>
            </div>
            <div className="p-4 ring-1 ring-indigo-300 rounded-2xl border border-white/20 bg-gradient-to-br from-white/10 to-indigo-200/10 backdrop-blur-lg shadow-sm shadow-indigo-300 text-gray-900 transition-all hover:scale-[1.01]">
              <h3 className="text-black font-semibold mb-2">Peak Activity Day</h3>
              <p className="text-black text-lg">Friday</p>
              <p className="text-gray-600 text-sm">2,800 sessions, 62min avg duration</p>
            </div>
            <div className="p-4 ring-1 ring-indigo-300 rounded-2xl border border-white/20 bg-gradient-to-br from-white/10 to-indigo-200/10 backdrop-blur-lg shadow-sm shadow-indigo-300 text-gray-900 transition-all hover:scale-[1.01]">
              <h3 className="text-black font-semibold mb-2">User Retention</h3>
              <p className="text-black text-lg">78%</p>
              <p className="text-gray-600 text-sm">30-day retention rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
