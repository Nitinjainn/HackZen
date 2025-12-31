"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
} from "../../../../components/CommonUI/card";
import { Button } from "../../../../components/CommonUI/button";
import { API_BASE_URL } from "../../../../lib/api";
import { Badge } from "../../../../components/CommonUI/badge";
import { Input } from "../../../../components/CommonUI/input";
import { Label } from "../../../../components/CommonUI/label";
import { Textarea } from "../../../../components/CommonUI/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/CommonUI/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/CommonUI/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../../components/DashboardUI/dialog";
import {
  Users,
  Gavel,
  Target,
  Plus,
  Edit,
  Trash2,
  Award,
  Building,
  Globe,
  Shield,
  Trophy,
  User,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../../../../context/AuthContext";
import { MultiSelect } from "../../../../components/CommonUI/multiselect";
import ProjectScoresList from '../../../../components/CommonUI/ProjectScoresList';

import axios from "axios";
import JudgeManagementOverview from './JudgeManagementOverview';
import JudgeManagementProblemStatements from './JudgeManagementProblemStatements';
import JudgeManagementJudges from './JudgeManagementJudges';
import JudgeManagementAssignments from './JudgeManagementAssignments';
import LeaderboardView from './LeaderboardView';
import { useLocation, useNavigate } from "react-router-dom";
import { Checkbox } from "../../../../components/DashboardUI/checkbox";

export default function JudgeManagement({ hackathonId, hideHackathonSelector = false, onBack, submissions: propSubmissions = [] }) {
  const { token } = useAuth();
  const [hackathon, setHackathon] = useState(null);
  const [hackathons, setHackathons] = useState([]);
  const [selectedHackathonId, setSelectedHackathonId] = useState(hackathonId);
  const [judgeAssignments, setJudgeAssignments] = useState({
    platform: [],
    sponsor: [],
    hybrid: [],
  });
  const [summary, setSummary] = useState({
    total: 0,
    platform: 0,
    sponsor: 0,
    hybrid: 0,
    active: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadingHackathons, setLoadingHackathons] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Problem Statement Management
  const [newProblemStatement, setNewProblemStatement] = useState({
    statement: "",
    type: "general",
    sponsorCompany: "",
  });
  const [showAddPSDialog, setShowAddPSDialog] = useState(false);
  const [sponsoredProposals, setSponsoredProposals] = useState([]);
  const [selectedSponsoredProposal, setSelectedSponsoredProposal] = useState(null);

  // Judge Assignment Management
  const [newJudgeAssignment, setNewJudgeAssignment] = useState({
    judgeEmail: "",
    judgeType: "platform",
    sponsorCompany: "",
    canJudgeSponsoredPS: false,
    problemStatementIds: [],
    roundIndices: [],
    maxSubmissionsPerJudge: 50,
  });
  const [showAddJudgeDialog, setShowAddJudgeDialog] = useState(false);

  const [judgedSubmissions, setJudgedSubmissions] = useState([]);

  // Add state for teams and assignment mode loading
  const [teams, setTeams] = useState([]);
  const [assignmentModeLoading, setAssignmentModeLoading] = useState(false);
  const [localSubmissions, setLocalSubmissions] = useState([]);

  // Add filter state for judged submissions
  const [selectedJudgedRound, setSelectedJudgedRound] = useState('All');
  const [selectedJudgedProblemStatement, setSelectedJudgedProblemStatement] = useState('All');

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchHackathons();
  }, []);

  useEffect(() => {
    if (selectedHackathonId) {
      fetchJudgeAssignments();
    } else {
      setLoading(false);
    }
  }, [selectedHackathonId]);

  useEffect(() => {
    if (selectedHackathonId) {
      fetch(`${API_BASE_URL}/api/sponsor-proposals/${selectedHackathonId}`)
        .then(res => res.json())
        .then(data => setSponsoredProposals(data.filter(p => p.status === "approved")));
    }
  }, [selectedHackathonId]);

  const fetchJudged = async () => {
    if (!selectedHackathonId) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/scores/all/hackathon/${selectedHackathonId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setJudgedSubmissions(res.data || []);
    } catch (err) {
      setJudgedSubmissions([]);
    }
  };

  useEffect(() => {
    fetchJudged();
  }, [selectedHackathonId]);

  // Fetch teams for the selected hackathon
  useEffect(() => {
    if (!selectedHackathonId) return;
    const fetchTeams = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/api/teams/hackathon/${selectedHackathonId}/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setTeams(Array.isArray(data) ? data : []);
      } catch (err) {
        setTeams([]);
      }
    };
    fetchTeams();
  }, [selectedHackathonId]);

  useEffect(() => {
    async function fetchSubmissions() {
      if (!selectedHackathonId) return;
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/api/submission-form/admin/hackathon/${selectedHackathonId}`,
          { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setLocalSubmissions(Array.isArray(data.submissions) ? data.submissions : []);
      } catch (err) {
        setLocalSubmissions([]);
      }
    }
    if (!propSubmissions || propSubmissions.length === 0) {
      fetchSubmissions();
    }
  }, [selectedHackathonId, propSubmissions]);

  const submissions = (propSubmissions && propSubmissions.length > 0) ? propSubmissions : localSubmissions;

  const fetchHackathons = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/hackathons/my`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      setHackathons(data);
      
      // If no hackathonId is provided, select the first hackathon
      if (!selectedHackathonId && data.length > 0) {
        setSelectedHackathonId(data[0]._id);
      }
    } catch (error) {
      console.error("Error fetching hackathons:", error);
    } finally {
      setLoadingHackathons(false);
    }
  };

  const fetchJudgeAssignments = async () => {
    try {
      setLoading(true);
      console.log("Fetching judge assignments for hackathon:", selectedHackathonId);
      
      const response = await fetch(
        `${API_BASE_URL}/api/judge-management/hackathons/${selectedHackathonId}/judge-assignments`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      console.log("Response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("Judge assignments data:", data);
        setHackathon(data.hackathon);
        setJudgeAssignments(data.assignments);
        setSummary(data.summary);
        console.log('DEBUG: setHackathon called with', data.hackathon);
      } else {
        console.error("Failed to fetch judge assignments:", response.status);
        // Set empty data if the API fails
        setHackathon(null);
        setJudgeAssignments({ platform: [], sponsor: [], hybrid: [] });
        setSummary({ total: 0, platform: 0, sponsor: 0, hybrid: 0, active: 0, pending: 0 });
      }
    } catch (error) {
      console.error("Error fetching judge assignments:", error);
      // Set empty data on error
      setHackathon(null);
      setJudgeAssignments({ platform: [], sponsor: [], hybrid: [] });
      setSummary({ total: 0, platform: 0, sponsor: 0, hybrid: 0, active: 0, pending: 0 });
    } finally {
      setLoading(false);
    }
  };

  const addProblemStatement = async () => {
    try {
      const payload = {
        ...newProblemStatement,
      };
      if (newProblemStatement.sponsorProposalId) {
        payload.sponsorProposalId = newProblemStatement.sponsorProposalId;
      }
      const response = await fetch(
        `${API_BASE_URL}/api/judge-management/hackathons/${selectedHackathonId}/problem-statements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            problemStatements: [payload],
          }),
        }
      );
      if (response.ok) {
        setShowAddPSDialog(false);
        setNewProblemStatement({ statement: "", type: "general", sponsorCompany: "" });
        setSelectedSponsoredProposal(null);
        fetchJudgeAssignments();
      }
    } catch (error) {
      console.error("Error adding problem statement:", error);
    }
  };

  const assignJudge = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/judge-management/hackathons/${selectedHackathonId}/assign-judges`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            judgeAssignments: [{
              judgeEmail: newJudgeAssignment.judgeEmail,
              judgeType: newJudgeAssignment.judgeType,
              sponsorCompany: newJudgeAssignment.sponsorCompany,
              canJudgeSponsoredPS: newJudgeAssignment.canJudgeSponsoredPS,
              problemStatementIds: newJudgeAssignment.problemStatementIds,
              maxSubmissionsPerJudge: newJudgeAssignment.maxSubmissionsPerJudge,
            }],
          }),
        }
      );

      if (response.ok) {
        setShowAddJudgeDialog(false);
        setNewJudgeAssignment({
          judgeEmail: "",
          judgeType: "platform",
          sponsorCompany: "",
          canJudgeSponsoredPS: false,
          problemStatementIds: [],
          roundIndices: [],
          maxSubmissionsPerJudge: 50,
        });
        fetchJudgeAssignments();
      }
    } catch (error) {
      console.error("Error assigning judge:", error);
    }
  };

  const removeJudgeAssignment = async (assignmentId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/judge-management/judge-assignments/${assignmentId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        fetchJudgeAssignments();
      }
    } catch (error) {
      console.error("Error removing judge assignment:", error);
    }
  };

  // Handler to set assignment mode for a round or problem statement
  const setAssignmentMode = async (type, index, mode) => {
    setAssignmentModeLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/judge-management/hackathons/${selectedHackathonId}/${type}/${index}/assignment-mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mode }),
      });
      if (res.ok) {
        fetchJudgeAssignments();
      }
    } finally {
      setAssignmentModeLoading(false);
    }
  };

  // Memoize all judge assignments flat
  const allJudgeAssignments = useMemo(() =>
    [
      ...judgeAssignments.platform,
      ...judgeAssignments.sponsor,
      ...judgeAssignments.hybrid,
    ], [judgeAssignments]);

  const getJudgeTypeIcon = (type) => {
    switch (type) {
      case "platform":
        return <Globe className="w-4 h-4 text-blue-500" />;
      case "sponsor":
        return <Building className="w-4 h-4 text-green-500" />;
      case "hybrid":
        return <Shield className="w-4 h-4 text-purple-500" />;
      default:
        return <Users className="w-4 h-4 text-gray-500" />;
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

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500 text-white">Active</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
      case "completed":
        return <Badge className="bg-blue-500 text-white">Completed</Badge>;
      case "removed":
        return <Badge className="bg-red-500 text-white">Removed</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white">{status}</Badge>;
    }
  };

  // Persist tab state in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab && tab !== activeTab) setActiveTab(tab);
    // eslint-disable-next-line
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (activeTab !== params.get("tab")) {
      params.set("tab", activeTab);
      navigate({ search: params.toString() }, { replace: true });
    }
    // eslint-disable-next-line
  }, [activeTab]);

  if (loadingHackathons) {
    return (
      <div className="flex-1 space-y-8 p-6 bg-gray-50 min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (hackathons.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center text-center">
            <Trophy className="w-16 h-16 text-yellow-400 mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">No Hackathons Found</h2>
            <p className="text-gray-600 mb-6">
              You need to create a hackathon before you can manage judges and assignments.<br/>
              Get started by creating your first hackathon!
            </p>
            <Button
              className="w-full mb-2 bg-indigo-600 hover:bg-indigo-700 text-lg py-2"
              onClick={() => window.location.href = '/dashboard/create-hackathon'}
            >
              <Plus className="w-5 h-5 mr-2" /> Create Hackathon
            </Button>
            <Button
              className="w-full mt-1"
              variant="outline"
              onClick={() => window.location.href = '/dashboard'}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-8 p-6 bg-gray-50 min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="space-y-6">
              {[1, 2].map((i) => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // In JudgeManagement component, add handler for unassigning a single team
  const handleUnassignSingleTeam = (assignmentId, teamId) => {
    const assignment = allJudgeAssignments.find(a => a._id === assignmentId);
    if (!assignment) return;
    const newTeams = assignment.assignedTeams.filter(id => id !== teamId);
  };


  return (
    <div className="bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
       <div className="sticky top-0 z-20 backdrop-blur-sm bg-white/80 rounded-xl shadow-sm mb-6">
          <CardContent className="pt-6 flex flex-col gap-4">
            {/* First row: Back button, title, actions */}
            <div className="flex items-center gap-4">
              {hideHackathonSelector && typeof onBack === 'function' && (
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 hover:bg-gray-100"
                  onClick={onBack}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              )}
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex-1">
                Judge Management
              </h1>
              <div className="flex gap-3 flex-wrap">
                {selectedHackathonId && (
                  <>
                    <Dialog open={showAddPSDialog} onOpenChange={setShowAddPSDialog}>
                      <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Problem Statement
                        </Button>
                      </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add Problem Statement</DialogTitle>
                        <DialogDescription>
                          Add a new problem statement for participants to work on.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="statement">Problem Statement</Label>
                          <Textarea
                            id="statement"
                            value={newProblemStatement.statement}
                            onChange={(e) =>
                              setNewProblemStatement({
                                ...newProblemStatement,
                                statement: e.target.value,
                              })
                            }
                            placeholder="Describe the problem participants need to solve..."
                            rows={4}
                          />
                        </div>
                        <div>
                          <Label htmlFor="type">Type</Label>
                          <Select
                            value={newProblemStatement.type}
                            onValueChange={(value) =>
                              setNewProblemStatement({
                                ...newProblemStatement,
                                type: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">General</SelectItem>
                              <SelectItem value="sponsored">Sponsored</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {newProblemStatement.type === "sponsored" && (
                          <div>
                            <Label htmlFor="sponsorCompany">Sponsor Company</Label>
                            <Input
                              id="sponsorCompany"
                              value={newProblemStatement.sponsorCompany}
                              onChange={(e) =>
                                setNewProblemStatement({
                                  ...newProblemStatement,
                                  sponsorCompany: e.target.value,
                                })
                              }
                              placeholder="Enter sponsor company name"
                            />
                          </div>
                        )}
                        <div>
                          <Label htmlFor="sponsorProposalId">Sponsored Proposal</Label>
                          <Select
                            value={newProblemStatement.sponsorProposalId}
                            onValueChange={id => {
                              setNewProblemStatement(prev => ({
                                ...prev,
                                sponsorProposalId: id,
                              }));
                              const proposal = sponsoredProposals.find(p => p._id === id);
                              setSelectedSponsoredProposal(proposal || null);
                              if (proposal) {
                                setNewProblemStatement(prev => ({
                                  ...prev,
                                  statement: proposal.description || '',
                                  sponsorCompany: proposal.organization || '',
                                  // Optionally, you can prefill more fields if needed
                                }));
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select sponsored proposal" />
                            </SelectTrigger>
                            <SelectContent>
                              {sponsoredProposals.map(proposal => (
                                <SelectItem key={proposal._id} value={proposal._id}>
                                  {proposal.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-3">
                          <Button
                            variant="outline"
                            onClick={() => setShowAddPSDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button onClick={addProblemStatement}>Add Problem Statement</Button>
                        </div>
                      </div>
                    </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>
            </div>
            {/* Second row: Hackathon selector and subtitle */}
            <div>
              {!hideHackathonSelector && (
                <div className="flex items-center gap-4 mt-2">
                  <Label htmlFor="hackathon-select" className="text-sm font-medium text-gray-700">
                    Select Hackathon:
                  </Label>
                  <Select
                    value={selectedHackathonId || ""}
                    onValueChange={(value) => setSelectedHackathonId(value)}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Choose a hackathon" />
                    </SelectTrigger>
                    <SelectContent>
                      {hackathons.map((hack) => (
                        <SelectItem key={hack._id} value={hack._id}>
                          {hack.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            
            </div>
          </CardContent>
        </div>

        {/* Tabs */}
        <div>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5 rounded-t-xl">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="problem-statements">Problem Statements</TabsTrigger>
                <TabsTrigger value="judges">Judges</TabsTrigger>
                <TabsTrigger value="assignments">Assignments</TabsTrigger>
                <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6 p-2">
                <JudgeManagementOverview
                  summary={summary}
                  hackathon={hackathon}
                  judgedSubmissions={judgedSubmissions}
                  fetchJudged={fetchJudged}
                  selectedJudgedRound={selectedJudgedRound}
                  setSelectedJudgedRound={setSelectedJudgedRound}
                  selectedJudgedProblemStatement={selectedJudgedProblemStatement}
                  setSelectedJudgedProblemStatement={setSelectedJudgedProblemStatement}
                />
              </TabsContent>

              {/* Problem Statements Tab */}
              <TabsContent value="problem-statements" className="space-y-6 p-2">
                <JudgeManagementProblemStatements
                  hackathon={hackathon}
                  onEdit={(updatedPS, idx) => {
                    // Refresh hackathon data after edit
                    console.log('Problem statement updated:', updatedPS);
                    // Trigger a refresh of the hackathon data
                    if (selectedHackathonId) {
                      fetchHackathons();
                    }
                  }}
                  onDelete={(deletedPS, idx) => {
                    // Refresh hackathon data after delete
                    console.log('Problem statement deleted:', deletedPS);
                    // Trigger a refresh of the hackathon data
                    if (selectedHackathonId) {
                      fetchHackathons();
                    }
                  }}
                />
              </TabsContent>

              {/* Judges Tab */}
              <TabsContent value="judges" className="space-y-6 p-2">
                <JudgeManagementJudges
                  judgeAssignments={judgeAssignments}
                  getJudgeTypeIcon={getJudgeTypeIcon}
                  getJudgeTypeLabel={getJudgeTypeLabel}
                  getStatusBadge={getStatusBadge}
                  removeJudgeAssignment={removeJudgeAssignment}
                  hackathonId={selectedHackathonId}
                />
              </TabsContent>

              {/* Assignments Tab - Card-based UI */}
              <TabsContent value="assignments" className="space-y-6 p-2">
                {(hackathon && (hackathon._id || hackathon.id)) ? (
                  <JudgeManagementAssignments
                    key={selectedHackathonId}
                    allJudgeAssignments={allJudgeAssignments}
                    hackathon={hackathon}
                    teams={teams}
                    fetchJudgeAssignments={fetchJudgeAssignments}
                    submissions={submissions}
                  />
                ) : (
                  <div className="p-8 text-center text-lg text-gray-500">Loading hackathon data...</div>
                )}
              </TabsContent>

              {/* Leaderboard Tab */}
              <TabsContent value="leaderboard" className="space-y-6 p-2">
                {(hackathon && (hackathon._id || hackathon.id)) ? (
                  <LeaderboardView
                    hackathonId={hackathon._id || hackathon.id}
                    roundIndex={0} // Default to first round, but LeaderboardView will handle dynamic rounds
                    onShortlistingComplete={() => {
                      // Refresh data after shortlisting
                      fetchJudgeAssignments();
                      fetchJudged();
                    }}
                  />
                ) : (
                  <div className="p-8 text-center text-lg text-gray-500">Loading hackathon data...</div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </div>
      </div>
    </div>
  );
}

function JudgeAssignmentCard({ assignment, teams, onAssignTeams, onUnassignTeams, onUnassignSingleTeam, onAutoDistribute, getJudgeTypeIcon, getJudgeTypeLabel, getStatusBadge, removeJudgeAssignment }) {
  if (!assignment || !assignment.judge) {
    return (
      <div className="bg-red-100 text-red-800 p-4 rounded-md">
        Judge not found for assignment ID: {assignment?._id}
      </div>
    );
  }
  const [selectedTeamIds, setSelectedTeamIds] = React.useState([]);
  const ps = assignment.assignedProblemStatements?.[0];
  const round = assignment.assignedRounds?.[0];
  // Only show teams not already assigned for assignment
  const unassignedTeams = teams.filter(t => !assignment.assignedTeams?.includes(t._id));

  // Debug log
  console.log("Rendering Card UI for:", assignment._id);

  // Strong debug visual
  return (
    <div style={{ background: '#f0f', padding: 20, border: '2px solid red', margin: 8 }}>
      <div className="w-full bg-white border rounded-2xl shadow-lg flex flex-col md:flex-row items-stretch md:items-center gap-6 p-8 transition hover:shadow-xl">
        {/* Judge Info */}
        <div className="flex items-center gap-4 min-w-[220px]">
          {/* Avatar placeholder */}
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-600">
            {assignment.judge.email?.[0]?.toUpperCase() || <User className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">
                {assignment.judge?.name || 'Unknown Judge'} ({assignment.judge?.email || 'No Email'})
              </h3>
              {getJudgeTypeIcon(assignment.judge.type)}
              <Badge className="ml-1" variant={assignment.judge.type === 'platform' ? 'secondary' : assignment.judge.type === 'sponsor' ? 'default' : 'outline'}>
                {getJudgeTypeLabel(assignment.judge.type)}
              </Badge>
            </div>
            {assignment.judge.sponsorCompany && (
              <span className="text-xs text-gray-500">{assignment.judge.sponsorCompany}</span>
            )}
          </div>
        </div>
        {/* Assignment Scope */}
        <div className="flex flex-col gap-2 min-w-[220px]">
          {ps ? (
            <div className="flex items-center gap-2">
              <Badge variant={ps.type === "sponsored" ? "default" : "secondary"}>
                {ps.type === "sponsored" ? "Sponsored" : "General"}
              </Badge>
              <span className="text-sm font-medium">{typeof ps.problemStatement === 'string' ? ps.problemStatement.slice(0, 40) : '-'}</span>
              {ps.sponsorCompany && <span className="text-xs text-gray-500">({ps.sponsorCompany})</span>}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-gray-100 text-gray-600">No problem statement assigned</Badge>
            </div>
          )}
          {round ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Round</Badge>
              <span className="text-sm font-medium">{round.roundName}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-gray-100 text-gray-600">No round assigned</Badge>
            </div>
          )}
        </div>
        {/* Teams Section */}
        <div className="flex-1 flex flex-col gap-2 min-w-[260px]">
          <span className="font-medium text-sm text-gray-700 mb-1">Teams:</span>
          <div className="flex flex-wrap gap-2 mb-2">
            {Array.isArray(assignment.assignedTeams) && assignment.assignedTeams.length > 0 ? (
              assignment.assignedTeams.map(teamId => {
                const team = teams.find(t => t._id === teamId);
                return (
                  <span key={teamId} className="inline-flex items-center bg-indigo-100 text-indigo-800 rounded px-2 py-1 text-xs font-medium">
                    {team ? team.name : teamId}
                    <button
                      className="ml-1 text-red-500 hover:text-red-700 focus:outline-none"
                      title="Unassign this team"
                      onClick={() => onUnassignSingleTeam(assignment._id, teamId)}
                    >
                      ×
                    </button>
                  </span>
                );
              })
            ) : (
              <span className="text-gray-400">None</span>
            )}
          </div>
          {/* Multi-select for assigning more teams */}
          <div className="flex gap-2 items-center">
            <MultiSelect
              options={unassignedTeams.map(t => ({ value: t._id, label: t.name }))}
              value={selectedTeamIds}
              onChange={setSelectedTeamIds}
              placeholder="Assign more teams..."
            />
            <Button
              size="sm"
              className="ml-2"
              onClick={() => {
                if (selectedTeamIds.length > 0) onAssignTeams([...(assignment.assignedTeams || []), ...selectedTeamIds]);
                setSelectedTeamIds([]);
              }}
              disabled={selectedTeamIds.length === 0}
              title="Assign selected teams"
            >
              Assign
            </Button>
          </div>
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onUnassignTeams}
              disabled={!(Array.isArray(assignment.assignedTeams) && assignment.assignedTeams.length > 0)}
              title="Unassign all teams"
            >
              Unassign All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onAutoDistribute}
              title="Auto-distribute teams among judges for this group"
            >
              Auto-Distribute
            </Button>
          </div>
        </div>
        {/* Actions & Status */}
        <div className="flex flex-col gap-3 items-end min-w-[120px]">
          {getStatusBadge(assignment.status)}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" title="Edit assignment">
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600"
              onClick={() => removeJudgeAssignment(assignment._id)}
              title="Remove assignment"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
