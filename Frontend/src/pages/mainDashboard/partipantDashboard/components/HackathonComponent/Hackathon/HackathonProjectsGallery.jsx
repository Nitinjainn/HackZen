"use client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../../components/CommonUI/card";
import { Skeleton } from "../../../../../../components/DashboardUI/skeleton";
import { ProjectCard } from "../../../../../../components/CommonUI/ProjectCard";
import { Rocket, Trophy } from "lucide-react";
import { Badge } from "../../../../../../components/CommonUI/badge";
import { API_BASE_URL } from "../../../../../../lib/api";

// Empty State Component
const EmptyProjectsState = () => (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-6 bg-indigo-100 rounded-full flex items-center justify-center">
        <Rocket className="w-8 h-8 text-indigo-600" />
      </div>
      <h4 className="text-2xl font-bold text-gray-800 mb-3">No projects submitted yet</h4>
      <p className="text-gray-700 leading-relaxed text-lg mb-6 max-w-2xl mx-auto">
        Be the first to showcase your innovative solution!
      </p>
    </div>
);

export default function HackathonProjectsGallery({ hackathonId, onProjectClick, sectionRef }) {
  const [projects, setProjects] = useState([]);
  const [winners, setWinners] = useState(new Map()); // Using a Map for efficient lookup
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Fetch submitted projects and winners
  useEffect(() => {
    const fetchData = async () => {
      if (!hackathonId) return;
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch all submitted projects for the hackathon
        const projectsRes = await axios.get(
          `${API_BASE_URL}/api/projects/hackathon/${hackathonId}`,
          { headers }
        );
        const submittedProjects = (projectsRes.data || []).filter(p => p.status === 'submitted');
        setProjects(submittedProjects);
        console.log("All Fetched Projects:", submittedProjects.map(p => ({ id: p._id, title: p.title })));

        // Fetch winners
        try {
            const winnersRes = await axios.get(
                `/api/judge-management/hackathons/${hackathonId}/winners`,
                { headers }
            );
            console.log("Raw Winners API Response:", winnersRes.data);

            if (winnersRes.data && Array.isArray(winnersRes.data.winners)) {
                const winnersMap = new Map();
                winnersRes.data.winners.forEach(winner => {
                    // --- CORRECTED LOGIC ---
                    // First, try to match by projectId, which is the most reliable method.
                    const pId = winner.projectId?._id || winner.projectId;
                    
                    if (pId) {
                        winnersMap.set(String(pId), winner.position);
                    } 
                    // If no projectId, fallback to matching by the project title.
                    else if (winner.projectTitle) {
                        console.warn(`Winner object is missing a projectId. Falling back to matching by title: "${winner.projectTitle}"`);
                        const matchingProject = submittedProjects.find(p => p.title === winner.projectTitle);
                        if (matchingProject) {
                            winnersMap.set(String(matchingProject._id), winner.position);
                        } else {
                           console.warn(`Could not find a project with the title "${winner.projectTitle}" to assign winner badge.`);
                        }
                    }
                    else {
                        console.error("Winner object could not be processed:", winner);
                    }
                });
                setWinners(winnersMap);
                console.log("Processed Winners Map:", winnersMap);
            }
        } catch (winnersError) {
            console.warn("Could not fetch winners, they may not be announced yet.", winnersError);
            setWinners(new Map());
        }

      } catch (err) {
        console.error("Error fetching submitted projects for hackathon", err);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [hackathonId]);

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      try {
        const userRes = await axios.get("${API_BASE_URL}/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(userRes.data);
      } catch (err) {
        console.error("Failed to fetch user", err);
      }
    };

    fetchUser();
  }, []);

  if (loading) {
    return (
      <section ref={sectionRef} className="space-y-6 max-w-5xl mx-auto">
        <Card className="shadow-none hover:shadow-none">
          <CardHeader className="border-b border-gray-100 bg-gray-50/50">
            <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <div className="w-1 h-8 bg-indigo-500 rounded-full"></div>
              <Skeleton className="h-8 w-48" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <Skeleton className="h-40 w-full mb-4" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="space-y-6 max-w-5xl mx-auto">
      <Card className="shadow-none hover:shadow-none">
        <CardHeader className="border-b border-gray-100 bg-gray-50/50">
          <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="w-1 h-8 bg-indigo-500 rounded-full"></div>
            Project Gallery
          </CardTitle>
        </CardHeader>

        <CardContent className="p-8 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3 my-4">
              <h3 className="text-xl font-semibold text-gray-900">Submitted Projects</h3>
            </div>
            
            {projects.length === 0 ? (
              <EmptyProjectsState />
            ) : (
              <div className="">
                <p className="text-gray-700 leading-relaxed text-lg mb-6">
                  {projects.length} {projects.length === 1 ? 'project' : 'projects'} submitted for this hackathon
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project) => {
                    // Ensure lookup is always done with a string key
                    const winnerRank = winners.get(String(project._id));
                    if (winnerRank) {
                      console.log(`Badge applied to project ${project.title} (${project._id}). Rank: ${winnerRank}`);
                    }
                    return (
                      <div key={project._id} className="relative">
                        {/* Winner Badge Overlay */}
                        {winnerRank && (
                            <Badge 
                              className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold shadow-lg z-10"
                            >
                              <Trophy className="w-4 h-4 mr-1.5" />
                              #{winnerRank} Winner
                            </Badge>
                        )}
                        <ProjectCard
                          project={project}
                          user={user}
                          onClick={() => {
                            if (onProjectClick) {
                              onProjectClick({ project });
                            } else {
                              navigate(`/dashboard/project-archive/${project._id}`);
                            }
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}