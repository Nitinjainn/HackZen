"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../../lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/CommonUI/card";
import {
  RCard,
  RCardContent,
  RCardHeader,
  RCardTitle,
} from "../../../components/CommonUI/RippleCard";
import { Button } from "../../../components/CommonUI/button";
import { Badge } from "../../../components/CommonUI/badge";
import { Input } from "../../../components/CommonUI/input";
import {
  Plus,
  Search,
  Calendar,
  Users,
  Trophy,
  Eye,
  FolderCode,
  Download,
  User,
  Shuffle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import CreateHackathon from "../../mainDashboard/organizerDashboard/Create-hackathon";
import ProjectDetail from "../../../components/CommonUI/ProjectDetail";
import { useNavigate } from "react-router-dom";

export function HackathonsPage() {
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHackathons = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/hackathons`);
        setHackathons(res.data);
      } catch {
        setError("Failed to fetch hackathons");
      } finally {
        setLoading(false);
      }
    };
    fetchHackathons();
  }, []);

  const filteredHackathons = hackathons.filter(
    (hackathon) =>
      hackathon.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hackathon.organizer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredHackathons.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentHackathons = filteredHackathons.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(page);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (loading) return <p className="text-gray-700">Loading hackathons...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="space-y-6 bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 min-h-screen">
      {!showCreateForm ? (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800">
              Hackathons Management
            </h1>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Hackathon
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-md mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black w-4 h-4" />
            <Input
              placeholder="Search hackathons by title or organizer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-purple-500/20 text-black placeholder-gray-600"
            />
          </div>

          {/* Results count and pagination info */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredHackathons.length)} of{" "}
              {filteredHackathons.length} hackathons
            </span>
            {totalPages > 1 && (
              <span>
                Page {currentPage} of {totalPages}
              </span>
            )}
          </div>

          {/* Grid */}
     
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 min-h-[600px]">
  {currentHackathons.map((hackathon) => (
    <RCard
      key={hackathon._id}
      className="w-full h-[400px] flex flex-col overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-transform duration-300 hover:scale-[1.02]"
    >
      {/* Thumbnail - Fixed height */}
      <div className="relative h-40 w-full flex-shrink-0">
        <img
          src={
            hackathon.images?.logo?.url ||
            hackathon.images?.banner?.url ||
            "/assets/default-banner.png"
          }
          alt={hackathon.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Prize Pool Badge */}
        <div className="absolute top-2 right-2">
          <Badge className="bg-yellow-400 text-yellow-900 font-semibold shadow-md">
            <Trophy className="w-3 h-3 mr-1" />
            {hackathon.prizePool?.amount
              ? `${hackathon.prizePool.amount} ${hackathon.prizePool.currency}`
              : "N/A"}
          </Badge>
        </div>
      </div>
      
      {/* Content - Flexible height */}
      <div className="p-4 flex flex-col gap-2 flex-1 min-h-0">
        {/* Title - Fixed height with ellipsis */}
        <h3 className="text-md font-semibold text-indigo-700 leading-tight line-clamp-2 h-12 overflow-hidden">
          {hackathon.title}
        </h3>
        
        {/* Organizer - Fixed height */}
        <p className="text-xs text-gray-500 mb-1 h-4 overflow-hidden text-ellipsis whitespace-nowrap">
          by {hackathon.organizer?.name || "Unknown"}
        </p>
        
        {/* Date - Fixed height */}
        <div className="flex items-center text-gray-700 text-xs mb-2 h-4">
          <Calendar className="w-4 h-4 mr-1 text-purple-500 flex-shrink-0" />
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            {formatDate(hackathon.startDate)} — {formatDate(hackathon.endDate)}
          </span>
        </div>
        
        {/* Details Row - Fixed height */}
        <div className="flex flex-wrap gap-1 text-xs text-gray-700 mb-2 h-8 overflow-hidden">
          <span className="flex items-center gap-1 whitespace-nowrap">
            <Users className="w-3 h-3 text-blue-500" />
            {hackathon.participants?.length || 0}
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap">
            <Trophy className="w-3 h-3 text-yellow-500" />
            {hackathon.prizePool?.amount
              ? `${hackathon.prizePool.amount}`
              : "N/A"}
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap">
            <FolderCode className="w-3 h-3 text-yellow-500" />
            {hackathon.submissions?.length || 0}
          </span>
        </div>
        
        {/* Button - Pushed to bottom */}
        <div className="mt-auto pt-2">
          <Button
            variant="outline"
            className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            onClick={() => navigate(`/admin/hackathons/${hackathon._id}/submissions`)}
          >
            <Eye className="w-4 h-4 mr-1" />
            View Submissions
          </Button>
        </div>
      </div>
    </RCard>
  ))}
</div>


          {/* Empty state */}
          {currentHackathons.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">
                {searchTerm ? "No hackathons found matching your search." : "No hackathons available."}
              </div>
              {searchTerm && (
                <Button
                  variant="outline"
                  onClick={() => setSearchTerm("")}
                  className="mt-2"
                >
                  Clear Search
                </Button>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>

              <div className="flex items-center space-x-1">
                {getPageNumbers().map((page, index) => (
                  <div key={index}>
                    {page === '...' ? (
                      <span className="px-3 py-2 text-gray-500">...</span>
                    ) : (
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(page)}
                        className={`w-10 h-10 ${
                          currentPage === page 
                            ? "bg-indigo-600 text-white" 
                            : "hover:bg-indigo-50"
                        }`}
                      >
                        {page}
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <div>
          <button
            onClick={() => setShowCreateForm(false)}
            className="flex items-center gap-1 text-sm font-semibold text-gray-800 hover:text-black mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <CreateHackathon
            onBack={() => setShowCreateForm(false)}
            isAdminCreate={true}
            onSave={() => setShowCreateForm(false)}
          />
        </div>
      )}
    </div>
  );
}
