"use client";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../../../lib/api";
import {
  ArrowLeft,
  Search,
  Calendar,
  Users,
  Trophy,
  MapPin,
  Clock,
  Star,
  Heart,
  ExternalLink,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "../../../components/CommonUI/card";
import { RCard } from "../../../components/CommonUI/RippleCard";
import { Button } from "../../../components/CommonUI/button";
import { Badge } from "../../../components/CommonUI/badge";
import { Input } from "../../../components/CommonUI/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/CommonUI/select";
import { cn } from "../../../lib/utils";
import { HackathonDetails } from "./components/HackathonDetails";

export function ExploreHackathons() {
  const navigate = useNavigate();
  const location = useLocation();

  // --- STATE MANAGEMENT ---
  const [hackathons, setHackathons] = useState([]);
  const [bannerHackathons, setBannerHackathons] = useState([]);
  const [registeredHackathonIds, setRegisteredHackathonIds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHackathon, setSelectedHackathon] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false); // ✅ State to manage hover

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchRegisteredHackathons = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await axios.get(`${API_BASE_URL}/api/registration/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const ids = Array.isArray(res.data) ? res.data
          .filter((reg) => reg.hackathonId && reg.hackathonId._id)
          .map((reg) => reg.hackathonId._id) : [];
        
        setRegisteredHackathonIds(ids);
      } catch (err) {
        console.error("Error fetching registered hackathons", err);
        setRegisteredHackathonIds([]);
      }
    };
    fetchRegisteredHackathons();
  }, []);

  useEffect(() => {
    const fetchAndProcessHackathons = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/api/hackathons`);
        const now = new Date();

        const approved = Array.isArray(res.data) ? res.data.filter(
          (h) => h.approvalStatus === "approved" && new Date(h.registrationDeadline) >= now
        ) : [];

        const banners = approved.filter(
          h => h.isFeatured && (h.featuredType === 'banner' || h.featuredType === 'both')
        );
        banners.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setBannerHackathons(banners);

        approved.sort((a, b) => {
          const isAPromoted = a.isFeatured && (a.featuredType === 'card' || a.featuredType === 'both');
          const isBPromoted = b.isFeatured && (b.featuredType === 'card' || b.featuredType === 'both');

          if (isAPromoted && !isBPromoted) return -1;
          if (!isAPromoted && isBPromoted) return 1;

          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        setHackathons(approved);

      } catch (err) {
        console.error("Hackathon fetch error:", err.message);
        setError("Failed to fetch hackathons");
      } finally {
        setLoading(false);
      }
    };
    fetchAndProcessHackathons();
  }, []);

  // --- ROUTING & DETAIL VIEW ---
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const hackathonId = urlParams.get("hackathon");

    if (hackathonId && hackathons.length > 0) {
      const hackathon = hackathons.find((h) => h._id === hackathonId);
      if (hackathon) {
        const transformedHackathon = transformHackathonData(hackathon);
        setSelectedHackathon(transformedHackathon);
      } else {
        const newParams = new URLSearchParams(location.search);
        newParams.delete("hackathon");
        newParams.delete("title");
        navigate(`${location.pathname}?${newParams.toString()}`, {
          replace: true,
        });
      }
    }
  }, [hackathons, location.search, navigate, location.pathname]);

  // --- UI EFFECTS & HELPERS ---
  // ✅ MODIFIED: Carousel now pauses on hover
  useEffect(() => {
    let interval;
    if (!isCarouselHovered && bannerHackathons.length > 1) {
      interval = setInterval(() => {
        setCurrentCarouselIndex((prev) => (prev === bannerHackathons.length - 1 ? 0 : prev + 1));
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [bannerHackathons, isCarouselHovered]);

  const transformHackathonData = (hackathon) => {
    return {
      ...hackathon,
      name: hackathon.title,
      prize: hackathon.prizePool?.amount
        ? `$${hackathon.prizePool.amount.toLocaleString()} ${
            hackathon.prizePool.currency || "USD"
          }`
        : "TBA",
      participants: hackathon.participants?.length || 0,
      maxParticipants: hackathon.maxParticipants || 100,
      rating: 4.5,
      reviews: 12,
      difficulty: hackathon.difficultyLevel,
      status:
        hackathon.status === "upcoming"
          ? "Registration Open"
          : hackathon.status === "ongoing"
          ? "Ongoing"
          : "Ended",
      startDate: hackathon.startDate,
      endDate: hackathon.endDate,
      registrationDeadline: hackathon.registrationDeadline,
      organizer: hackathon.organizer?.name || "Unknown Organizer",
      organizerLogo: hackathon.organizer?.logo || null,
      featured: hackathon.tags?.includes("featured") || false,
      sponsored: hackathon.tags?.includes("sponsored") || false,
      requirements: hackathon.requirements || [
        "Valid student/professional ID",
        "Team size: 2-4 members",
        "Original project submission",
        "Attend mandatory sessions",
      ],
      perks: hackathon.perks || [
        "Free accommodation",
        "Meals included",
        "Networking opportunities",
        "Workshop access",
        "Mentorship sessions",
      ],
      tags: hackathon.tags || [hackathon.category],
      problemStatements: hackathon.problemStatements || [],
    };
  };

  // --- FILTERING LOGIC ---
  const filterFunction = (hackathon) => {
    const matchesSearch = hackathon.title.toLowerCase().includes(searchTerm.toLowerCase()) || hackathon.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || hackathon.tags?.includes(selectedCategory);
    const matchesDifficulty = selectedDifficulty === "all" || hackathon.difficultyLevel === selectedDifficulty;
    const matchesLocation = selectedLocation === "all" || hackathon.location?.toLowerCase().includes(selectedLocation.toLowerCase());
    return matchesSearch && matchesCategory && matchesDifficulty && matchesLocation;
  };
  
  const filteredHackathons = hackathons.filter(filterFunction);
  const totalFilteredCount = filteredHackathons.length;

  const handleHackathonClick = (hackathon) => {
    const transformedHackathon = transformHackathonData(hackathon);
    const slug = hackathon.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const newParams = new URLSearchParams(location.search);
    newParams.set("hackathon", hackathon._id);
    newParams.set("title", slug);
    navigate(`${location.pathname}?${newParams.toString()}`, { replace: false });
    setSelectedHackathon(transformedHackathon);
  };
  
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedDifficulty("all");
    setSelectedLocation("all");
  };

  const hasActiveFilters = searchTerm || selectedCategory !== 'all' || selectedDifficulty !== 'all' || selectedLocation !== 'all';

  // --- CONSTANTS FOR FILTERS ---
  const categories = [
    "All Categories",
    "Artificial Intelligence",
    "Blockchain",
    "Cybersecurity",
    "FinTech",
    "Gaming",
    "Healthcare",
    "Sustainability",
    "Mobile Development",
    "Web Development",
    "IoT",
    "Data Science",
    "DevOps",
  ];

  const difficulties = ["All Levels", "Beginner", "Intermediate", "Advanced"];
  const locations = [
    "All Locations",
    "Virtual",
    "Online",
    "Hybrid",
    "New York",
    "Delhi",
  ];

  // --- RENDER FUNCTIONS ---
  
  const renderHackathonCard = (hackathon) => {
   const registrationDeadline = new Date(hackathon.registrationDeadline);
   const today = new Date();
   const daysLeft = Math.ceil((registrationDeadline - today) / (1000 * 60 * 60 * 24));
   const deadlineLabel = isNaN(daysLeft) ? "TBA" : daysLeft > 0 ? `${daysLeft} day${daysLeft > 1 ? "s" : ""} left` : "Closed";

   return (
     <RCard key={hackathon._id} className={cn(
       "w-full max-w-xs flex flex-col overflow-hidden group"
     )} onClick={() => handleHackathonClick(hackathon)}>
       <div className="relative h-40 w-full overflow-hidden">
         {hackathon.isFeatured && (
           <div className="absolute top-2 left-2 z-10">
             <Badge className="bg-indigo-600 text-white font-semibold shadow-md">
               <Sparkles className="w-3 h-3 mr-1" />
               Featured
             </Badge>
           </div>
         )}
         <img src={hackathon.images?.logo?.url || hackathon.images?.banner?.url || "/assets/default-banner.png"} alt={hackathon.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
       </div>
       <div className="p-4 flex flex-col gap-2">
         <h3 className="text-md font-semibold text-indigo-700 leading-tight line-clamp-2 h-10">{hackathon.title}</h3>
         <div className="text-xs text-gray-500 flex justify-between items-center">
           <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {hackathon.location || "TBA"}</span>
           <span className="flex items-center gap-1 text-red-600 font-medium"><Clock className="w-3 h-3" /> {deadlineLabel}</span>
         </div>
         <div className="flex gap-1 overflow-hidden whitespace-nowrap text-ellipsis">
           {hackathon.tags?.slice(0, 3).map((tag) => (<Badge key={tag} variant="outline" className="text-xs px-2 py-1 bg-gray-100 text-gray-700 border-gray-200 shrink-0">{tag}</Badge>))}
         </div>
       </div>
     </RCard>
   );
 };
 
  // ✅ MODIFIED: Carousel slide now shows details on hover
  const renderCarouselSlide = (hackathon, index) => {
    const isActive = index === currentCarouselIndex;
    const prize = hackathon.prizePool?.amount
        ? `$${hackathon.prizePool.amount.toLocaleString()} ${hackathon.prizePool.currency || 'USD'}`
        : "Not specified";

    return (
      <div
        key={hackathon._id}
        className={cn("absolute inset-0 transition-opacity duration-700 ease-in-out", isActive ? "opacity-100 z-10" : "opacity-0 z-0")}
        style={{ pointerEvents: isActive ? 'auto' : 'none' }}
      >
        <div
          className="relative h-full w-full rounded-xl overflow-hidden cursor-pointer group"
          onClick={() => handleHackathonClick(hackathon)}
        >
          <img
            src={hackathon.images?.banner?.url || "/assets/default-banner.png"}
            alt={hackathon.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 flex flex-col justify-end p-6 text-white bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <h3 className="text-2xl font-bold drop-shadow-lg">{hackathon.title}</h3>
            <p className="text-sm opacity-90 drop-shadow-md mt-1">
              Organized by {hackathon.organizer?.name || 'Community'}
            </p>
            <div className="flex items-center gap-4 mt-4 text-md">
              <span className="flex items-center gap-1.5">
                <Trophy className="w-5 h-5" />
                <span>{prize}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- CONDITIONAL RETURNS ---
  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading hackathons...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
    
  if (selectedHackathon) {
    const urlParams = new URLSearchParams(location.search);
    const source = urlParams.get("source");
    
    return (
      <HackathonDetails
        hackathon={selectedHackathon}
        backButtonLabel={source === "my-hackathons" ? "Back to My Hackathons" : "Back to Explore"}
        onBack={() => {
          setSelectedHackathon(null);
          const newParams = new URLSearchParams(location.search);
          newParams.delete("hackathon");
          newParams.delete("title");
          newParams.delete("source");
          
          if (source === "my-hackathons") {
            navigate("/dashboard/my-hackathons", { replace: true });
          } else {
            navigate(`${location.pathname}?${newParams.toString()}`, {
              replace: true,
            });
          }
        }}
      />
    );
  }


  return (
    <div className="flex-1 space-y-6 p-6 bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 relative">
      {/* Filter Sidebar */}
      <div className={cn(
        "fixed inset-y-0 right-0 z-50 w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out",
        showFilterSidebar ? "translate-x-0" : "translate-x-full",
        !showFilterSidebar && "invisible"
      )}>
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Filters</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilterSidebar(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Category */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Category
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-white text-black shadow-lg rounded-md border">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.slice(1).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Difficulty Level
              </label>
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent className="bg-white text-black shadow-lg rounded-md border">
                  <SelectItem value="all">All Levels</SelectItem>
                  {difficulties.slice(1).map((difficulty) => (
                    <SelectItem key={difficulty} value={difficulty}>
                      {difficulty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Location
              </label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent className="bg-white text-black shadow-lg rounded-md border">
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.slice(1).map((location) => (
                    <SelectItem key={location} value={location.toLowerCase()}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-gray-50">
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
              >
                Clear All
              </Button>
              <Button
                className="flex-1"
                onClick={() => setShowFilterSidebar(false)}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {showFilterSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-40 !mt-0"
          onClick={() => setShowFilterSidebar(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Explore Hackathons
          </h1>
          <p className="text-gray-600 mt-1">
            Discover and join exciting hackathons from around the world
          </p>
        </div>
      </div>

      {/* ✅ MODIFIED: Carousel container now pauses on hover */}
      {bannerHackathons.length > 0 && (
        <div
          className="relative h-80 rounded-xl overflow-hidden"
          onMouseEnter={() => setIsCarouselHovered(true)}
          onMouseLeave={() => setIsCarouselHovered(false)}
        >
          {bannerHackathons.map((hackathon, index) => renderCarouselSlide(hackathon, index))}
          {bannerHackathons.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
              {bannerHackathons.map((_, index) => (
                <button
                  key={index}
                  className={cn("w-3 h-3 rounded-full transition-all duration-300 shadow-lg", index === currentCarouselIndex ? "bg-white scale-110" : "bg-white/70 hover:bg-white/90")}
                  onClick={() => setCurrentCarouselIndex(index)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
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
        <Button
          onClick={() => setShowFilterSidebar(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 h-12 px-6"
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <Badge className="bg-red-500 text-white ml-1 px-1.5 py-0.5 text-xs">
              {[searchTerm, selectedCategory !== "all", selectedDifficulty !== "all", selectedLocation !== "all"]
                .filter(Boolean).length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          Showing <span className="font-semibold">{totalFilteredCount}</span> of{" "}
          <span className="font-semibold">{hackathons.length}</span> hackathons
        </p>
        {hasActiveFilters && ( <Button variant="outline" size="sm" onClick={clearFilters} className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">Clear Filters</Button>)}
      </div>

      <div className="space-y-4">
        {totalFilteredCount > 0 ? (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              All Hackathons
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredHackathons.map((hackathon) =>
                renderHackathonCard(hackathon)
              )}
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Search className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Hackathons Found</h3>
              <p className="text-gray-500 text-center mb-4">Try adjusting your search criteria or filters.</p>
              {hasActiveFilters && ( <Button onClick={clearFilters} variant="outline">Clear All Filters</Button> )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}