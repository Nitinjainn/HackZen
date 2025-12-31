"use client";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/CommonUI/card";
import { Button } from "../../../components/CommonUI/button";
import { API_BASE_URL } from "../../../lib/api";
import { Badge } from "../../../components/CommonUI/badge";
import { Input } from "../../../components/CommonUI/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/CommonUI/select";
import { 
  Gavel, 
  Trophy, 
  FileText, 
  Star, 
  Search, 
  Calendar,
  Clock,
  CheckCircle,
  PlayCircle,
  X,
  SlidersHorizontal
} from "lucide-react";
import {
  ACard,
  ACardContent,
} from "../../../components/DashboardUI/AnimatedCard";
import { HackathonCard } from "../../../components/DashboardUI/HackathonCard";
import { FilterSidebar, FilterField, FilterToggleButton } from "../../../components/CommonUI/FilterSidebar";
import { useAuth } from "../../../context/AuthContext";

export default function JudgePanel() {
  const [judgeData, setJudgeData] = useState({
    totalHackathons: 0,
    totalSubmissions: 0,
    averageRating: 0,
    completedJudgments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [hackathons, setHackathons] = useState([]);
  const [loadingHackathons, setLoadingHackathons] = useState(true);
  const [pendingInvites, setPendingInvites] = useState([]);
  
  // Simplified filter states - removed roundFilter and evaluationFilter
  const [hackathonStatusFilter, setHackathonStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);
  
  const navigate = useNavigate();
  const { token } = useAuth();

  // Your existing useEffect hooks remain the same...
  useEffect(() => {
    const fetchHackathons = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          "${API_BASE_URL}/api/users/me/judge-hackathons",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();

        console.log('Judge hackathons data:', data);
        setHackathons(data);
      } catch (err) {
        console.error("Error fetching judge hackathons", err);
      } finally {
        setLoadingHackathons(false);
      }
    };

    fetchHackathons();
  }, []);

  useEffect(() => {
    const fetchJudgeData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch("${API_BASE_URL}/api/users/judge-stats", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setJudgeData(data);
        }
      } catch (err) {
        console.error("Error loading judge data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchJudgeData();
  }, []);

  // Fetch pending judge invites
  useEffect(() => {
    if (!token) return;
    fetch("${API_BASE_URL}/api/role-invites/my", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setPendingInvites(data || []));
  }, [token]);

  // Helper function to get hackathon status
  const getHackathonStatus = (hackathon) => {
    const now = new Date();
    const startDate = new Date(hackathon.startDate);
    const endDate = new Date(hackathon.endDate);
    
    if (now < startDate) return 'upcoming';
    if (now >= startDate && now <= endDate) return 'running';
    if (now > endDate) return 'over';
    return 'unknown';
  };

  // Simplified filter hackathons function
  const filteredHackathons = hackathons.filter(hackathon => {
    if (!hackathon || !hackathon._id) return false;
    
    // Status filter
    if (hackathonStatusFilter !== 'all') {
      const status = getHackathonStatus(hackathon);
      if (status !== hackathonStatusFilter) return false;
    }
    
    // Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      const titleMatch = hackathon.title?.toLowerCase().includes(searchLower);
      const descriptionMatch = hackathon.description?.toLowerCase().includes(searchLower);
      if (!titleMatch && !descriptionMatch) return false;
    }
    
    return true;
  });

  // Updated active filters count - removed roundFilter and evaluationFilter
  const getActiveFiltersCount = () => {
    let count = 0;
    if (hackathonStatusFilter !== 'all') count++;
    if (searchTerm.trim()) count++;
    return count;
  };

  // Updated has active filters check - removed roundFilter and evaluationFilter
  const hasActiveFilters = searchTerm || hackathonStatusFilter !== 'all';

  // Updated clear all filters - removed roundFilter and evaluationFilter
  const clearAllFilters = () => {
    setHackathonStatusFilter('all');
    setSearchTerm('');
  };

  // Filter options - removed roundOptions and evaluationOptions
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'upcoming', label: 'Scheduled' },
    { value: 'running', label: 'Active' },
    { value: 'over', label: 'Completed' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-80 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 relative">
      {/* Simplified Filter Sidebar - removed search and other filters */}
      <FilterSidebar
        isOpen={showFilterSidebar}
        onClose={() => setShowFilterSidebar(false)}
        title="Filters"
        hasActiveFilters={hasActiveFilters}
        onClearAll={clearAllFilters}
      >
        {/* Only Status Filter remains */}
        <FilterField label="Hackathon Status">
          <Select value={hackathonStatusFilter} onValueChange={setHackathonStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent className="bg-white text-black shadow-lg rounded-md border">
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      </FilterSidebar>

      {/* Header Section */}
      <header className="mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Judge Panel</h1>
            <p className="text-gray-600 mt-1">
              Manage your hackathon judgments and reviews
            </p>
          </div>
        </div>
      </header>

      {/* Pending Judge Invites */}
      {pendingInvites.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Pending Judge Invites
          </h2>
          <div className="space-y-3">
            {pendingInvites.map((invite) => (
              <Card 
                key={invite._id} 
                className="border-yellow-200 bg-yellow-50 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {invite.hackathon?.title}
                        </p>
                        <p className="text-sm text-gray-600">{invite.role}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => navigate(`/invite/role?token=${invite.token}`)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white shadow-sm"
                    >
                      View Invite
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Stats Grid */}
      <section className="mb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ACard className="hover:shadow-lg transition-shadow">
            <ACardContent className="p-6 pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Trophy className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {judgeData.totalHackathons}
                  </p>
                  <p className="text-sm font-medium text-gray-600">Hackathons</p>
                </div>
              </div>
            </ACardContent>
          </ACard>

          <ACard className="hover:shadow-lg transition-shadow">
           <ACardContent className="p-6 pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <FileText className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {judgeData.totalSubmissions}
                  </p>
                  <p className="text-sm font-medium text-gray-600">Submissions</p>
                </div>
              </div>
            </ACardContent>
          </ACard>

          <ACard className="hover:shadow-lg transition-shadow">
          <ACardContent className="p-6 pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <Star className="w-8 h-8 text-yellow-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {Number(judgeData.averageRating).toFixed(2)}
                  </p>
                  <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                </div>
              </div>
            </ACardContent>
          </ACard>

          <ACard className="hover:shadow-lg transition-shadow">
        <ACardContent className="p-6 pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Gavel className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {judgeData.completedJudgments}
                  </p>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                </div>
              </div>
            </ACardContent>
          </ACard>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow border-0 shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Gavel className="h-5 w-5 text-blue-600" />
                </div>
                Active Judgments
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-gray-600 mb-6 leading-relaxed">
                Review and score submissions for active hackathons you're judging.
              </p>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 shadow-sm"
                onClick={() => navigate("/judge/active")}
              >
                View Active Judgments
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-0 shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <FileText className="h-5 w-5 text-gray-600" />
                </div>
                My Judgments
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-gray-600 mb-6 leading-relaxed">
                View your completed judgments and review history.
              </p>
              <Button
                variant="outline"
                className="w-full border-gray-300 hover:bg-gray-50 shadow-sm"
                onClick={() => navigate("/judge/history")}
              >
                View History
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Hackathons Section - Reference Style */}
      <section>
        {/* Header with Search and Filter */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Hackathons You're Judging
            </h2>
            <p className="text-gray-600">
              Discover and manage your assigned hackathons
            </p>
          </div>
        </div>

        {/* Search and Filter Controls - Reference Style */}
        <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search hackathons..."
              className="pl-10 h-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Filter Button */}
          <FilterToggleButton
            onClick={() => setShowFilterSidebar(true)}
            hasActiveFilters={hasActiveFilters}
            activeFiltersCount={getActiveFiltersCount()}
          />
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            Showing <span className="font-semibold">{filteredHackathons.length}</span> of{" "}
            <span className="font-semibold">{hackathons.length}</span> hackathons
          </p>
          {hasActiveFilters && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearAllFilters}
              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Results */}
        <div className="space-y-4">
          {filteredHackathons.length > 0 ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredHackathons.map((hackathon) => (
                  <HackathonCard
                    key={hackathon._id || hackathon.title || Math.random()}
                    hackathon={hackathon}
                    onClick={() =>
                      hackathon._id && navigate(
                        `/dashboard/judge/hackathon/${hackathon._id}/gallery`,
                        { state: { hackathon } }
                      )
                    }
                  />
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Search className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {hasActiveFilters ? "No Hackathons Found" : "No Hackathons Assigned"}
                </h3>
                <p className="text-gray-500 text-center mb-4">
                  {hasActiveFilters 
                    ? "Try adjusting your search criteria or filters."
                    : "You're not assigned to judge any hackathons yet. Check back later or contact an organizer if you're expecting an assignment."
                  }
                </p>
                {hasActiveFilters && (
                  <Button onClick={clearAllFilters} variant="outline">
                    Clear All Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
