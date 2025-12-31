"use client";
import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { API_BASE_URL } from "../../../lib/api";
import {
  Plus,
  Trophy,
  Clock,
  ExternalLink,
  Heart,
  MapPin,
  Code,
  Star,
  Edit,
} from "lucide-react";

import { Button } from "../../../components/CommonUI/button";
import { Badge } from "../../../components/CommonUI/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/CommonUI/card";
import { ACard } from "../../../components/DashboardUI/AnimatedCard";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/CommonUI/tabs";
import { Skeleton } from "../../../components/DashboardUI/skeleton"; 

// Import the ProjectSubmission component
import ProjectSubmission from "./components/ProjectSubmission";
import ProjectDetail from "../../../components/CommonUI/ProjectDetail";
import { HackathonCard } from "../../../components/DashboardUI/HackathonCard";
import ParticipantSubmissionForm from "./components/ParticipantSubmitForm";
import { HackathonDetails } from "./components/HackathonDetails";
import { ProjectCard } from "../../../components/CommonUI/ProjectCard";

export default function MyHackathons() {
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState([]);
  const [hackathons, setHackathons] = useState([]);
  const [savedHackathons, setSavedHackathons] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingHackathons, setLoadingHackathons] = useState(true);
  const [savedLoading, setSavedLoading] = useState(true);
  const [selectedHackathon, setSelectedHackathon] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [selectedHackathonDetails, setSelectedHackathonDetails] =
    useState(null);

  // State to manage which view to show
  const [currentView, setCurrentView] = useState("dashboard"); // 'dashboard' or 'create-project'

  // Listen for ?createProject=1 in the URL to open the project creation form
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("createProject") === "1") {
      setCurrentView("create-project");
    }
  }, [location.search]);

  // Get projectId from URL if present
  const urlProjectId =
    location.pathname.match(/my-hackathons\/(\w+)/)?.[1] || null;

  // Fetch Projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch("${API_BASE_URL}/api/projects/mine", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await res.json();
        setProjects(data || []);
        // If URL has a projectId, select that project
        if (urlProjectId && Array.isArray(data)) {
          const found = data.find((p) => p._id === urlProjectId);
          if (found) setSelectedProject(found);
        }
      } catch (err) {
        console.error("Failed to fetch projects", err);
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [urlProjectId]);

  // Move fetchRegisteredHackathons out so we can call it on location change
  const fetchRegisteredHackathons = async () => {
    try {
      setLoadingHackathons(true);
      const res = await fetch("${API_BASE_URL}/api/registration/my", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      const formatted = data
        .filter((reg) => reg.hackathonId) // Only keep registrations with a valid hackathon
        .map((reg) => {
          const h = reg.hackathonId;
          return {
            id: h._id,
            name: h.title,
            image: h.images?.banner?.url,
            images: h.images,
            status: h.status,
            deadline: new Date(h.registrationDeadline).toDateString(),
            participants: h.participants?.length || 0,
            description: h.description,
            prize: `$${h.prizePool?.amount?.toLocaleString()}`,
            startDate: new Date(h.startDate).toDateString(),
            endDate: new Date(h.endDate).toDateString(),
            category: h.category,
            difficulty: h.difficultyLevel,
            registered: true,
            submitted: false,
          };
        });
      setHackathons(formatted);
    } catch (err) {
      console.error("Failed to fetch registered hackathons", err);
    } finally {
      setLoadingHackathons(false);
    }
  };

  // Fetch saved hackathons
  const fetchSavedHackathons = async () => {
    try {
      setSavedLoading(true);
      const res = await fetch(
        "${API_BASE_URL}/api/users/me/saved-hackathons",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await res.json();
      const formatted = data.map((h) => ({
        id: h._id,
        name: h.title,
        image: h.images?.banner?.url,
        images: h.images,
        status: h.status,
        deadline: new Date(h.registrationDeadline).toDateString(),
        participants: h.participants?.length || 0,
        description: h.description,
        prize: `$${h.prizePool?.amount?.toLocaleString()}`,
        startDate: new Date(h.startDate).toDateString(),
        endDate: new Date(h.endDate).toDateString(),
        category: h.category,
        difficulty: h.difficultyLevel,
        saved: true,
      }));
      setSavedHackathons(formatted);
    } catch (err) {
      console.error("Failed to fetch saved hackathons", err);
      setSavedHackathons([]);
    } finally {
      setSavedLoading(false);
    }
  };

  // Fetch on mount and whenever the location is /dashboard/my-hackathons
  useEffect(() => {
    if (location.pathname === "/dashboard/my-hackathons") {
      fetchRegisteredHackathons();
      fetchSavedHackathons();
    }
  }, [location.pathname]);

  // Refresh data when component mounts
  useEffect(() => {
    fetchRegisteredHackathons();
    fetchSavedHackathons();
  }, []);

  const handleCreateProject = () => {
    navigate("?createProject=1", { replace: false });
    setCurrentView("create-project");
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard/my-hackathons", { replace: false });
    setCurrentView("dashboard");
  };

  const handleSaveProject = (projectData) => {
    console.log("Saving project:", projectData);
    // Here you would typically save the project to your backend
    // For now, we'll just add it to the local projects state
    const newProject = {
      _id: Date.now().toString(),
      title: projectData.title,
      builderName: "You", // or get from user context
      updatedAt: new Date().toISOString(),
      description: projectData.description,
      status: projectData.status,
    };

    setProjects((prev) => [newProject, ...(Array.isArray(prev) ? prev : [])]);

    // Optionally go back to dashboard
    setCurrentView("dashboard");
  };

  const handleExploreHackathons = () => {
    navigate("/dashboard/explore-hackathons");
  };

  // If we're in create project view, render the ProjectSubmission component
  if (currentView === "create-project") {
    return (
      <ProjectSubmission
        hackathonName={selectedHackathon?.name || "HackZen 2024"}
        hackathonId={selectedHackathon?.id || null}
        onBack={handleBackToDashboard}
        onSave={handleSaveProject}
      />
    );
  }

  if (selectedProject) {
    return (
      <div>
        <ProjectDetail
          project={selectedProject}
          onBack={() => {
            setSelectedProject(null);
            navigate("/dashboard/my-hackathons");
          }}
          backButtonLabel="Back to My Hackathons"
          onlyOverview={true}
        />
        <div className="fixed bottom-8 right-8">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedProject(null);
              setProjectToEdit(selectedProject);
              setEditMode(true);
              setCurrentView("edit-project");
            }}
            variant="outline"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Project
          </Button>
        </div>
      </div>
    );
  }

  if (currentView === "edit-project" && projectToEdit) {
    return (
      <ProjectSubmission
        mode="edit"
        projectId={projectToEdit._id}
        initialData={projectToEdit}
        onBack={() => {
          setEditMode(false);
          setCurrentView("dashboard");
        }}
        onSave={(updated) => {
          // Replace the updated project in local state
          setProjects((prev) =>
            prev.map((p) => (p._id === updated._id ? updated : p))
          );
          setSelectedProject(updated);
          setEditMode(false);
          setCurrentView("dashboard");
        }}
      />
    );
  }

  const ProjectsSkeleton = () => (
    <Card className="w-full max-w-sm rounded-2xl bg-white/70 border border-border/30 shadow-sm">
      <div className="h-32 w-full bg-muted">
        <Skeleton className="h-full w-full" />
      </div>

      <CardHeader className="px-4 pt-3 pb-1 space-y-2">
        <Skeleton className="h-4 w-2/3 rounded-md" />
        <Skeleton className="h-3 w-5/6 rounded-md" />
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-2 space-y-3">
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      </CardContent>
    </Card>
  );

  const HackathonsSkeleton = () => (
    <div className="flex gap-4 flex-wrap">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="w-full max-w-sm">
          <Skeleton className="h-48 w-full" />
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (showSubmissionForm && selectedHackathon) {
    return (
      <ParticipantSubmissionForm
        hackathon={selectedHackathon}
        onBack={() => setShowSubmissionForm(false)}
        userProjects={projects} // ✅ This is what the form needs
      />
    );
  }

  // Main dashboard view
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-purple-50 to-slate-100 ">
      <div className="container mx-auto px-6 py-8 space-y-12">
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                My Projects
              </h2>
              <p className="text-muted-foreground">
                Your creative coding projects
              </p>
            </div>
          </div>

          {loadingProjects ? (
            <ProjectsSkeleton />
          ) : (
            <div className="space-y-6">
              {projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <Card
                    className="group border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 cursor-pointer transition-all duration-300 hover:shadow-lg bg-white/50"
                    onClick={handleCreateProject}
                  >
                    <CardContent className="h-full flex flex-col items-center justify-center text-center p-6">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                        <Plus className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">
                        Create New Project
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Start building something amazing
                      </p>
                    </CardContent>
                  </Card>
                  {projects.map((project) => (
                    <ProjectCard
                      key={project._id}
                      project={project}
                      onClick={() => {
                        setSelectedProject(project);
                        navigate(`/dashboard/my-hackathons/${project._id}`);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card
                    className="group border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 cursor-pointer transition-all duration-300 hover:shadow-lg bg-white/50 max-w-sm"
                    onClick={handleCreateProject}
                  >
                    <CardContent className="pt-8 flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                        <Plus className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">
                        Create New Project
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Start building something amazing
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/80 backdrop-blur-sm lg:col-span-2">
                    <CardContent className="pt-8 flex flex-col items-center justify-center py-12 text-center">
                      <Code className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No Projects Yet
                      </h3>
                      <p className="text-muted-foreground">
                        You haven't created any projects yet. Start your coding
                        journey!
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Hackathons Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              My Hackathons
            </h2>
            <p className="text-muted-foreground">
              Track your hackathon participation and progress
            </p>
          </div>

          <Tabs defaultValue="active" className="space-y-6">
            <TabsList className=" grid w-full max-w-md grid-cols-2 ">
              <TabsTrigger value="active" className="flex gap-2">
                <Trophy className="w-4 h-4" />
                Registered ({hackathons.length})
              </TabsTrigger>
              <TabsTrigger value="saved" className="flex gap-2">
                <Heart className="w-4 h-4" />
                Saved ({savedHackathons.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {loadingHackathons ? (
                <HackathonsSkeleton />
              ) : hackathons.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {hackathons.map((hackathon) => (
                    <Card
                      key={hackathon.id}
                      className="relative group bg-white/90 border border-indigo-100 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer"
                      onClick={() =>
                        navigate(
                          `/dashboard/explore-hackathons?hackathon=${
                            hackathon.id
                          }&title=${encodeURIComponent(
                            hackathon.name || hackathon.title
                          )}&source=my-hackathons&view=registration`
                        )
                      }
                    >
                      {/* Banner */}
                      <div className="h-32 w-full bg-indigo-50 flex items-center justify-center overflow-hidden">
                        <img
                          src={
                            hackathon.images?.logo?.url ||
                            hackathon.images?.banner?.url ||
                            "/assets/default-banner.png"
                          }
                          alt={hackathon.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardHeader className="px-4 pt-3 pb-1">
                        <CardTitle className="text-lg font-semibold text-indigo-700 line-clamp-1 group-hover:text-indigo-900 transition">
                          {hackathon.name}
                        </CardTitle>
                        <CardDescription className="text-xs text-gray-500">
                          {hackathon.category} • {hackathon.difficulty}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 pt-2 space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            <Clock className="inline w-4 h-4 mr-1" />
                            {hackathon.deadline}
                          </span>
                          <span>
                            <Trophy className="inline w-4 h-4 mr-1" />
                            {hackathon.prize}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          {/* Removed submit button - clicking on card opens registration page */}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-12 flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-6">
                      <Trophy className="w-8 h-8 text-orange-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      No Registered Hackathons
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                      You're not currently registered for any hackathons.
                      Explore exciting competitions and start building!
                    </p>
                    <Button onClick={handleExploreHackathons} className="gap-2">
                      <ExternalLink className="w-4 h-4" />
                      Explore Hackathons
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="saved" className="space-y-4">
              {savedLoading && savedHackathons.length > 0 ? (
                <HackathonsSkeleton />
              ) : savedHackathons.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {savedHackathons.map((hackathon) => (
                    <Card
                      key={hackathon.id}
                      className="relative group bg-white/90 border border-indigo-100 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer"
                      onClick={() =>
                        navigate(
                          `/dashboard/explore-hackathons?hackathon=${
                            hackathon.id
                          }&title=${encodeURIComponent(
                            hackathon.name || hackathon.title
                          )}&source=my-hackathons`
                        )
                      }
                    >
                      {/* Banner */}
                      <div className="h-32 w-full bg-indigo-50 flex items-center justify-center overflow-hidden">
                        <img
                          src={
                            hackathon.images?.logo?.url ||
                            hackathon.images?.banner?.url ||
                            "/assets/default-banner.png"
                          }
                          alt={hackathon.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardHeader className="px-4 pt-3 pb-1">
                        <CardTitle className="text-lg font-semibold text-indigo-700 line-clamp-1 group-hover:text-indigo-900 transition">
                          {hackathon.name}
                        </CardTitle>
                        <CardDescription className="text-xs text-gray-500">
                          {hackathon.category} • {hackathon.difficulty}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 pt-2 space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            <Clock className="inline w-4 h-4 mr-1" />
                            {hackathon.deadline}
                          </span>
                          <span>
                            <Trophy className="inline w-4 h-4 mr-1" />
                            {hackathon.prize}
                          </span>
                        </div>
                        {/* No action buttons for saved hackathons */}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 pt-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center mb-6">
                      <Heart className="w-8 h-8 text-pink-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      No Saved Hackathons
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                      You haven't saved any hackathons yet. Save interesting
                      competitions to participate later!
                    </p>
                    <Button
                      onClick={handleExploreHackathons}
                      variant="outline"
                      className="gap-2 bg-transparent"
                    >
                      <Star className="w-4 h-4" />
                      Browse Hackathons
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </section>
      </div>
      {selectedHackathonDetails ? (
        <HackathonDetails
          hackathon={selectedHackathonDetails}
          backButtonLabel={"Back to My Hackathons"}
          onBack={() => setSelectedHackathonDetails(null)}
        />
      ) : (
        ""
      )}
    </div>
  );
}
