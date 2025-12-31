"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Code } from "lucide-react";
import { Input } from "../../../components/CommonUI/input";
import { Card, CardContent } from "../../../components/CommonUI/card";
import { Separator } from "../../../components/CommonUI/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/CommonUI/tabs";
import { ProjectCard } from "../../../components/CommonUI/ProjectCard";
import ProjectDetail from "../../../components/CommonUI/ProjectDetail";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../../../components/CommonUI/select";
import { FilterSidebar, FilterField, FilterToggleButton } from "../../../components/CommonUI/FilterSidebar";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { API_BASE_URL } from "../../../lib/api";

export function ProjectArchive() {
  const navigate = useNavigate();
  const { hackathonId } = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const location = useLocation();
  const socketRef = useRef(null);
  const urlProjectId =
    location.pathname.match(/project-archive\/(\w+)/)?.[1] || null;

  const categories = [
    "all",
    "AI/ML",
    "Blockchain",
    "Fintech",
    "DevTools",
    "Education",
    "HealthTech",
    "Sustainability",
    "Gaming",
    "Productivity",
    "Other",
  ];

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/projects`);
        const data = await res.json();
        setProjects(data);

        // If user opened a direct project link, match by ID
        if (urlProjectId) {
          const matched = data.find((p) => p._id === urlProjectId);
          if (matched) setSelectedProject(matched);
        }
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [urlProjectId, location.pathname]);

  // Real-time updates with socket.io
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(API_BASE_URL);
    }
    const socket = socketRef.current;
    socket.on("project-like-update", ({ projectId, likes, likedBy }) => {
      setProjects((prev) =>
        prev.map((p) =>
          p._id === projectId ? { ...p, likes, likedBy } : p
        )
      );
    });
    socket.on("project-view-update", ({ projectId, views }) => {
      setProjects((prev) =>
        prev.map((p) =>
          p._id === projectId ? { ...p, views } : p
        )
      );
    });
    return () => {
      socket.off("project-like-update");
      socket.off("project-view-update");
      // Optionally disconnect: socket.disconnect();
    };
  }, []);

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.skills?.some((tech) =>
        tech.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesCategory =
      selectedCategory === "all" || project.category === selectedCategory;

    const isSubmitted = project.status === "submitted";

    return matchesSearch && matchesCategory && isSubmitted;
  });

  const handleProjectClick = (project) => {
    setSelectedProject(project);
    navigate(`/dashboard/project-archive/${project._id}`);
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
    navigate("/dashboard/project-archive");
  };

  const handleClearFilters = () => {
    setSelectedCategory("all");
    setSearchTerm("");
  };

  const hasActiveFilters = selectedCategory !== "all" || searchTerm !== "";

  const renderLoadingCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 px-5">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="animate-pulse border-gray-200">
          <div className="h-48 bg-gray-200 rounded-t-xl"></div>
          <CardContent className="p-6">
            <div className="h-4 bg-gray-200 rounded mb-3"></div>
            <div className="h-3 bg-gray-200 rounded mb-4"></div>
            <div className="flex justify-between">
              <div className="h-3 bg-gray-200 rounded w-20"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderProjectGrid = (projectList) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 px-5 mt-5">
      {projectList.map((project) => (
        <ProjectCard
          key={project._id}
          project={project}
          onClick={handleProjectClick}
        />
      ))}
    </div>
  );

  if (selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject}
        onBack={handleBackToProjects}
        backButtonLabel="Back to Project Archive"
        fallbackHackathonId={hackathonId}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-slate-50 via-purple-50 to-slate-100">
      <header className="px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-800">
                Project Archive
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6 overflow-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-5">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search by title or tech..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-base border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <FilterToggleButton
            onClick={() => setIsFilterSidebarOpen(true)}
            hasActiveFilters={hasActiveFilters}
            activeFiltersCount={hasActiveFilters ? 1 : 0}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Filters
          </FilterToggleButton>
        </div>

        <Tabs value="all" className="w-full">
          

          <TabsContent value="all">
            {loading ? (
              renderLoadingCards()
            ) : filteredProjects.length === 0 ? (
              <div className="text-center text-gray-500 mt-16">
                No projects found.
              </div>
            ) : (
              renderProjectGrid(filteredProjects)
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Filter Sidebar */}
      <FilterSidebar
        isOpen={isFilterSidebarOpen}
        onClose={() => setIsFilterSidebarOpen(false)}
        title="Project Filters"
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearFilters}
      >
        <FilterField label="Category">
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Search">
          <Input
            type="text"
            placeholder="Search by title or tech..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
          />
        </FilterField>
      </FilterSidebar>
    </div>
  );
}
