"use client";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../../lib/api";
import {
  Calendar,
  Users,
  Trophy,
  MapPin,
  Clock,
  Star,
  Heart,
  ExternalLink,
} from "lucide-react";
import {
  RCard,
  RCardContent,
  RCardDescription,
  RCardTitle,
} from "../../components/CommonUI/RippleCard";
import { Button } from "../../components/CommonUI/button";
import { Badge } from "../../components/CommonUI/badge";

export default function FeaturedHackCards({ hackathons: propHackathons }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(!propHackathons);

  useEffect(() => {
    const filterActiveHackathons = (hackathons) => {
      const currentDate = new Date();
      return hackathons
        .filter((h) => h.approvalStatus === "approved" && new Date(h.endDate) > currentDate)
        .slice(0, 3);
    };

    if (propHackathons) {
      const approvedActiveHackathons = filterActiveHackathons(propHackathons);
      setHackathons(approvedActiveHackathons);
      setLoading(false);
    } else {
      const fetchHackathons = async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/api/hackathons`);
          const approvedActiveHackathons = filterActiveHackathons(res.data);
          setHackathons(approvedActiveHackathons);
        } catch (err) {
          console.error("Hackathon fetch error:", err.message);
        } finally {
          setLoading(false);
        }
      };

      fetchHackathons();
    }
  }, [propHackathons]);

  const handleHackathonClick = (hackathon) => {
    // Create URL-friendly slug from hackathon title
    const slug = hackathon.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Navigate to the explore page with hackathon parameters
    navigate(
      `/dashboard/explore-hackathons?hackathon=${hackathon._id}&title=${slug}`
    );
  };

  const renderHackathonCard = (hackathon) => (
    <RCard
      key={hackathon._id}
      className="w-full overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] group bg-white/20 backdrop-blur-sm border border-gray-200 shadow-lg rounded-xl"
      onClick={() => handleHackathonClick(hackathon)}
    >
      <div className="flex flex-col md:flex-row h-full">
        {/* Left Side: Image Section */}
        <div className="relative w-full h-40 md:w-64 md:h-52 flex-shrink-0 rounded-t-xl md:rounded-l-xl md:rounded-tr-none overflow-hidden">
          <img
            src={
              hackathon.images?.logo?.url ||
              hackathon.images?.banner?.url ||
              "/assets/default-banner.png"
            }
            alt={hackathon.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          {/* Overlay Gradient */}
          {/* Bottom-left Prize */}
          <div className="absolute bottom-3 left-3">
            <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-semibold shadow-lg hover:shadow-xl transition-shadow duration-300">
              <Trophy className="w-3 h-3 mr-1" />
              {hackathon.prizePool?.amount
                ? `$${hackathon.prizePool.amount.toLocaleString()}`
                : "TBA"}
            </Badge>
          </div>
          {/* Featured Badge */}
          {hackathon.tags?.includes("featured") && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow-lg">
                <Star className="w-3 h-3 mr-1 fill-current" />
                Featured
              </Badge>
            </div>
          )}
        </div>
        {/* Right Side: Content */}
        <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
          {/* Top Section: Title, Org, Desc, Info */}
          <div className="space-y-3 md:space-y-4">
            {/* Header: Title & Organizer */}
            <div className="flex items-start justify-between gap-2 md:gap-4">
              <div className="flex-1 min-w-0">
                <RCardTitle className="text-lg md:text-xl font-bold text-indigo-700 hover:text-indigo-800 transition-colors leading-tight group-hover:text-indigo-900 line-clamp-2 min-h-[2.5rem] md:min-h-[3.5rem]">
                  {hackathon.title}
                </RCardTitle>
              </div>
            </div>
            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              {/* Duration */}
              <div className="flex items-center gap-2 md:gap-3">
                <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-indigo-100 rounded-xl flex-shrink-0 group-hover:bg-indigo-200 transition-colors">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Duration
                  </p>
                  <p className="text-xs md:text-sm font-semibold text-gray-800 truncate">
                    {new Date(hackathon.startDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })} {" "}
                    - {" "}
                    {new Date(hackathon.endDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
              {/* Location */}
              <div className="flex items-center gap-2 md:gap-3">
                <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-green-100 rounded-xl flex-shrink-0 group-hover:bg-green-200 transition-colors">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Location
                  </p>
                  <p className="text-xs md:text-sm font-semibold text-gray-800 truncate">
                    {hackathon.location || "TBA"}
                  </p>
                </div>
              </div>
              {/* Participants */}
              <div className="flex items-center gap-2 md:gap-3">
                <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-orange-100 rounded-xl flex-shrink-0 group-hover:bg-orange-200 transition-colors">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Participants
                  </p>
                  <div className="flex items-center gap-1 md:gap-2">
                    <p className="text-xs md:text-sm font-semibold text-gray-800">
                      {hackathon.participants?.length || 0}/
                      {hackathon.maxParticipants || 100}
                    </p>
                    <div className="w-6 md:w-8 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            ((hackathon.participants?.length || 0) /
                              (hackathon.maxParticipants || 100)) *
                              100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              {/* Deadline */}
              <div className="flex items-center gap-2 md:gap-3">
                <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-red-100 rounded-xl flex-shrink-0 group-hover:bg-red-200 transition-colors">
                  <Clock className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Deadline
                  </p>
                  <p className="text-xs md:text-sm font-semibold text-gray-800 truncate">
                    {new Date(
                      hackathon.registrationDeadline
                    ).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* Bottom Section: Tags & Buttons */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-3 md:pt-4 border-t border-gray-100">
            <div className="flex flex-wrap gap-1 md:gap-2 max-w-full overflow-hidden">
              <Badge
                variant="outline"
                className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 transition-colors font-medium"
              >
                {hackathon.category}
              </Badge>
              {(hackathon.tags || []).slice(0, 2).map((tag) => (
                <Badge
                  key={tag}
                  className="bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors whitespace-nowrap"
                  variant="outline"
                >
                  {tag}
                </Badge>
              ))}
              {hackathon.tags?.length > 2 && (
                <Badge
                  variant="outline"
                  className="bg-gray-50 text-gray-500 whitespace-nowrap"
                >
                  +{hackathon.tags.length - 2} more
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </RCard>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-6"></div>
          <p className="text-gray-500 text-lg">
            Loading featured hackathons...
          </p>
        </div>
      </div>
    );
  }

  if (hackathons.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No Featured Hackathons
          </h3>
          <p className="text-gray-500">
            Check back soon for exciting hackathons to join!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {hackathons.map((hackathon) => renderHackathonCard(hackathon))}
    </div>
  );
}
