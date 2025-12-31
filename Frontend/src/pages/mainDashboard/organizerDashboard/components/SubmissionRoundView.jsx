"use client";
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../../components/CommonUI/card";
import { Button } from "../../../../components/CommonUI/button";
import { API_BASE_URL } from "../../../../lib/api";
import { Gavel, Loader2, Users, Award, FileText, Eye, Calendar, Mail, CheckCircle, RefreshCw, Clock } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "../../../../components/DashboardUI/avatar";
import { toast } from "../../../../hooks/use-toast";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel
} from "../../../../components/DashboardUI/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../../../components/DashboardUI/dialog";
// Removed circular import - this component is SubmissionRoundView
import BulkEvaluatorAssignModal from "./BulkEvaluatorAssignModal";

// Mock stages data - will be dynamically generated based on hackathon rounds
const getStages = (hackathon) => {
  const stages = [
    { id: 'reg', label: 'All Registrations', icon: 'REG', status: 'active' }
  ];
  
  if (hackathon?.rounds && Array.isArray(hackathon.rounds)) {
    hackathon.rounds.forEach((round, index) => {
      const roundNumber = index + 1;
      let label = `Submission Round ${roundNumber}`;
      
      // Determine if this is the final round (winner assignment round)
      const isFinalRound = index === hackathon.rounds.length - 1;
      if (isFinalRound) {
        label = `Winner Assignment Round ${roundNumber}`;
      }
      
      stages.push({
        id: `r${roundNumber}`,
        label: label,
        icon: `R${roundNumber}`,
        status: 'pending',
        roundIndex: index,
        isFinalRound: isFinalRound
      });
    });
  }
  
  return stages;
};

export default function JudgeManagementAssignments({
  allJudgeAssignments = [],
  hackathon,
  teams = [],
  fetchJudgeAssignments,
  submissions = [],
}) {
  // Generate stages dynamically based on hackathon rounds
  const stages = getStages(hackathon);
  
  const [unassigning, setUnassigning] = useState({});
  const [selectedStage, setSelectedStage] = useState(stages[0].id);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedSubmissions, setSelectedSubmissions] = useState(new Set());
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignmentOverview, setAssignmentOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [availableJudges, setAvailableJudges] = useState([]);
  const [deletingJudge, setDeletingJudge] = useState(null);
  const [judgeDetailsOpen, setJudgeDetailsOpen] = useState(false);
  const [selectedJudge, setSelectedJudge] = useState(null);
  const [judgeDetailsModalOpen, setJudgeDetailsModalOpen] = useState(false);
  const [loadingAvailableJudges, setLoadingAvailableJudges] = useState(false);
  const [submissionScores, setSubmissionScores] = useState({});
  const [submissionDetailsModalOpen, setSubmissionDetailsModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [submissionDetails, setSubmissionDetails] = useState(null);
  const [loadingSubmissionDetails, setLoadingSubmissionDetails] = useState(false);

  // Update selectedStage when stages change (e.g., when hackathon changes)
  useEffect(() => {
    if (stages.length > 0 && !stages.find(s => s.id === selectedStage)) {
      setSelectedStage(stages[0].id);
    }
  }, [stages, selectedStage]);

  // Fetch assignment overview when component mounts, hackathon changes, or selected stage changes
  useEffect(() => {
    if (hackathon?._id || hackathon?.id) {
      fetchAssignmentOverview();
    }
  }, [hackathon?._id, hackathon?.id, selectedStage]);

  // Refresh assignment overview periodically to ensure data is current
  useEffect(() => {
    if (hackathon?._id || hackathon?.id) {
      const interval = setInterval(() => {
        fetchAssignmentOverview();
      }, 30000); // Refresh every 30 seconds

      return () => {
        clearInterval(interval);
      };
    }
  }, [hackathon?._id, hackathon?.id]);

  // Fetch scores when assignment overview changes
  useEffect(() => {
    if (assignmentOverview) {
      fetchSubmissionScores();
    }
  }, [assignmentOverview]);

  const fetchAssignmentOverview = async () => {
    const hackathonId = hackathon?._id || hackathon?.id;
    if (!hackathonId) {
      console.log('🔍 No hackathon ID available');
      return;
    }
    

    setOverviewLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Build URL with filters
      let url = `${API_BASE_URL}/api/judge-management/hackathons/${hackathonId}/assignment-overview`;
      const params = new URLSearchParams();
      
      // Add roundIndex filter based on selected stage
      if (selectedStage !== 'reg') {
        const stage = stages.find(s => s.id === selectedStage);
        if (stage && stage.roundIndex !== undefined) {
          params.append('roundIndex', stage.roundIndex.toString());
        }
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      

      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAssignmentOverview(data);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch assignment overview:', response.status, errorText);
        toast({
          title: 'Error',
          description: `Failed to fetch assignment overview. Status: ${response.status}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching assignment overview:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch assignment overview. Please check your connection.',
        variant: 'destructive',
      });
    } finally {
      setOverviewLoading(false);
    }
  };

  // Helper: get round name from stage id
  const getRoundName = (stageId) => {
    if (stageId === 'reg') return 'All Registrations';
    
    // Find the stage to get the proper label
    const stage = stages.find(s => s.id === stageId);
    if (stage) {
      return stage.label;
    }
    
    return stageId;
  };

  // Helper: get round details based on dynamic stages
  const getRoundDetails = (stageId) => {
    if (stageId === 'reg') return 'All teams that have registered.';
    
    // Find the stage to get the proper details
    const stage = stages.find(s => s.id === stageId);
    if (stage) {
      if (stage.isFinalRound) {
        return `Teams that have submitted in ${stage.label}. This is the final round for winner assignment.`;
      } else {
        return `Teams that have submitted in ${stage.label}. This round is for shortlisting to the next round.`;
      }
    }
    
    return '';
  };

      // Filter teams by selected stage (round) - Use assignmentOverview data instead of submissions prop
    let teamsToShow = teams;
    
    if (selectedStage !== 'reg') {
      // Use assignmentOverview data which is properly filtered by the backend
      if (assignmentOverview?.assignedSubmissions && !overviewLoading) {
        const submittedTeamIds = assignmentOverview.assignedSubmissions.map(sub => sub.teamId || sub.teamName).filter(Boolean);
        teamsToShow = teams.filter(team => submittedTeamIds.includes(team._id) || submittedTeamIds.includes(team.name));
      }
    }

  const handleUnassignAll = async (assignmentId) => {
    setUnassigning(prev => ({ ...prev, [assignmentId]: true }));
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/judge-management/judge-assignments/${assignmentId}/assign-teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teamIds: [] }),
      });
      if (res.ok) {
        fetchJudgeAssignments?.();
        toast({ title: "All teams unassigned successfully!" });
      } else {
        toast({ title: "Failed to unassign teams", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Failed to unassign teams", variant: "destructive" });
    } finally {
      setUnassigning(prev => ({ ...prev, [assignmentId]: false }));
    }
  };

  const handleJudgeClick = (judge) => {
    setSelectedJudge(judge);
    setJudgeDetailsModalOpen(true);
  };

  const getJudgeAssignmentStats = (judge) => {
    const totalSubmissions = judge.assignedRounds?.reduce((total, round) => 
      total + (round.assignedSubmissions?.length || 0), 0) || 0;
    
    const evaluatedSubmissions = judge.assignedRounds?.reduce((total, round) => {
      const evaluatedInRound = round.assignedSubmissions?.filter(subId => {
        // Use assignmentOverview data instead of submissions prop
        const submission = assignmentOverview?.assignedSubmissions?.find(s => s._id === subId) ||
                          assignmentOverview?.unassignedSubmissions?.find(s => s._id === subId);
        return submission?.scores?.length > 0;
      }).length || 0;
      return total + evaluatedInRound;
    }, 0) || 0;

    return { totalSubmissions, evaluatedSubmissions };
  };

  const getJudgeAssignedTeams = (judge) => {
    const assignedTeamIds = new Set();
    judge.assignedRounds?.forEach(round => {
      round.assignedSubmissions?.forEach(subId => {
        // Use assignmentOverview data instead of submissions prop
        const submission = assignmentOverview?.assignedSubmissions?.find(s => s._id === subId) ||
                          assignmentOverview?.unassignedSubmissions?.find(s => s._id === subId);
        if (submission?.teamId) {
          assignedTeamIds.add(submission.teamId);
        }
      });
    });
    
    return teams.filter(team => assignedTeamIds.has(team._id));
  };

  const handleDeleteJudge = async (judgeAssignment) => {
    if (!confirm(`Are you sure you want to delete judge "${judgeAssignment.judge.email}"? This will also remove all their assigned submissions and scores.`)) {
      return;
    }

    setDeletingJudge(judgeAssignment._id);
        try {
          const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/judge-management/hackathons/${hackathon?._id || hackathon?.id}/judges/${judgeAssignment._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const result = await res.json();
        toast({ 
          title: "Judge deleted successfully!", 
          description: `Removed ${result.deletedJudge.assignmentsRemoved} assignments and ${result.deletedJudge.scoresRemoved} scores.`
        });
        fetchJudgeAssignments?.();
      } else {
        const error = await res.json();
        toast({ 
          title: "Failed to delete judge", 
          description: error.message || "An error occurred while deleting the judge.",
          variant: "destructive" 
        });
      }
    } catch (err) {
      toast({ 
        title: "Failed to delete judge", 
        description: "Network error occurred. Please try again.",
        variant: "destructive" 
      });
    } finally {
      setDeletingJudge(null);
    }
  };

  const formatDate = (date) => date ? new Date(date).toLocaleString() : '--';

  // Calculate average score for a submission
  const getAverageScore = (submissionId) => {
    const scores = submissionScores[submissionId] || [];
    if (scores.length === 0) return null;
    
    const CRITERIA = ["innovation", "impact", "technicality", "presentation"];
    const totalScore = scores.reduce((sum, score) => {
      const criteriaScore = CRITERIA.reduce((acc, criteria) => acc + (score.scores?.[criteria] || 0), 0);
      return sum + (criteriaScore / CRITERIA.length);
    }, 0);
    
    return (totalScore / scores.length).toFixed(2);
  };

  // Fetch scores for submissions
  const fetchSubmissionScores = async () => {
    try {
      const token = localStorage.getItem('token');
      const allSubmissionIds = [
        ...(assignmentOverview?.unassignedSubmissions?.map(sub => sub._id) || []),
        ...(assignmentOverview?.assignedSubmissions?.map(sub => sub._id) || [])
      ];
      
      if (allSubmissionIds.length === 0) return;

      const response = await fetch(`${API_BASE_URL}/api/scores/submissions-scores`, {
        method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ submissionIds: allSubmissionIds })
      });

      if (response.ok) {
        const data = await response.json();
        const scoresData = {};
        
        data.forEach(score => {
          if (!scoresData[score.submissionId]) {
            scoresData[score.submissionId] = [];
          }
          scoresData[score.submissionId].push(score);
        });
        
        setSubmissionScores(scoresData);
        console.log('🔍 Fetched submission scores:', scoresData);
      }
    } catch (error) {
      console.error('Error fetching submission scores:', error);
    }
  };

  // Fetch available judges
  // Handle submission selection
  const handleSubmissionSelection = (submissionId, isSelected) => {
    setSelectedSubmissions(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(submissionId);
      } else {
        newSet.delete(submissionId);
      }
      return newSet;
    });
  };

  // Handle bulk assignment
  const handleBulkAssignment = () => {
    if (selectedSubmissions.size === 0) {
      toast({
        title: "No submissions selected",
        description: "Please select at least one submission to assign.",
        variant: "destructive",
      });
      return;
    }
    setAssignModalOpen(true);
  };

  const fetchAvailableJudges = async (problemStatementId = null, problemStatementType = null) => {
    const hackathonId = hackathon?._id || hackathon?.id;
    if (!hackathonId) return;
    
    setLoadingAvailableJudges(true);
    try {
      const token = localStorage.getItem('token');
      
      // Build URL with query parameters for filtering
      let url = `${API_BASE_URL}/api/judge-management/hackathons/${hackathonId}/available-judges`;
      const params = new URLSearchParams();
      
      if (problemStatementId) {
        params.append('problemStatementId', problemStatementId);
      }
      if (problemStatementType) {
        params.append('problemStatementType', problemStatementType);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableJudges(data.evaluators || []);
      } else {
        console.error('Failed to fetch available judges');
      }
    } catch (error) {
      console.error('Error fetching available judges:', error);
    } finally {
      setLoadingAvailableJudges(false);
    }
  };

  const handleViewSubmission = async (submission) => {
    setSelectedSubmission(submission);
    setSubmissionDetailsModalOpen(true);
    setLoadingSubmissionDetails(true);
    
    try {
      const token = localStorage.getItem('token');
      
      // Fetch detailed submission information
      const response = await fetch(`/api/submission-form/admin/${submission._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const submissionData = await response.json();
        
        // Fetch judge evaluations for this submission
        const evaluationsResponse = await fetch(`/api/scores/submission/${submission._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        let evaluations = [];
        if (evaluationsResponse.ok) {
          evaluations = await evaluationsResponse.json();
        }
        
        setSubmissionDetails({
          ...submissionData.submission,
          evaluations
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch submission details",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching submission details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch submission details",
        variant: "destructive",
      });
    } finally {
      setLoadingSubmissionDetails(false);
    }
  };

  // Fetch available judges when component mounts
  React.useEffect(() => {
    fetchAvailableJudges();
  }, [hackathon?._id]);

  // Find the round object for the selected stage
  let roundObj = null;
  if (selectedStage !== 'reg' && hackathon?.rounds) {
    const stage = stages.find(s => s.id === selectedStage);
    if (stage && stage.roundIndex !== undefined) {
      roundObj = hackathon.rounds[stage.roundIndex];
    }
  }

  // Format round dates for description
  let roundDescription = getRoundDetails(selectedStage);
  if (roundObj) {
    roundDescription += `\nStart: ${formatDate(roundObj.startDate)}\nEnd: ${formatDate(roundObj.endDate)}`;
  }

  return (
    <div className="space-y-6">
      {/* Stage Selection */}
      <div className="flex flex-wrap gap-2 mb-6">
        {stages.map((stage) => (
          <button
            key={stage.id}
            onClick={() => setSelectedStage(stage.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedStage === stage.id
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {stage.label}
          </button>
        ))}
            </div>

      {/* Show round-specific view if selected */}
      {selectedStage !== 'reg' ? (
        <div key={`round-${selectedStage}`} className="space-y-6">
          {/* Round Header */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                  {getRoundName(selectedStage)}
                  {overviewLoading && <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />}
                </h2>
                <p className="text-gray-500 text-base">{roundDescription}</p>
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={async () => {
                  console.log(`🔍 Manual refresh button clicked for ${selectedStage}`);
                  await fetchAssignmentOverview();
                  toast({
                    title: 'Data Refreshed',
                    description: `Successfully refreshed data for ${getRoundName(selectedStage)}`,
                    variant: 'default',
                  });
                }}
                disabled={overviewLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  overviewLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${overviewLoading ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
            </div>
          </div>
          
          {/* Submission Round Content */}
          <div className="space-y-6">
            {/* Assignment Overview Cards */}
            {assignmentOverview && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="border-2 border-blue-200 bg-blue-50/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      <Users className="w-5 h-5" />
                      Active Judges
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-lg font-bold text-blue-700">{assignmentOverview.judges?.length || 0}</div>
                    <div className="text-sm text-blue-600">
                      {assignmentOverview.judges?.reduce((total, judge) => total + (judge.assignedSubmissions?.length || 0), 0) || 0} assigned projects
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-orange-200 bg-orange-50/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-orange-700">
                      <FileText className="w-5 h-5" />
                      Unassigned Projects
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-lg font-bold text-orange-700">{assignmentOverview.unassignedSubmissions?.length || 0}</div>
                    <div className="text-sm text-orange-600">
                      Need judge assignment
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-green-200 bg-green-50/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-5 h-5" />
                      Total Submissions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-lg font-bold text-green-700">
                      {(assignmentOverview.judges?.reduce((total, judge) => total + (judge.assignedSubmissions?.length || 0), 0) || 0) +
                      (assignmentOverview.unassignedSubmissions?.length || 0)}
                    </div>
                    <div className="text-sm text-green-600">
                      All submissions
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Assigned Submissions Table */}
            <div className="mb-6">
              <Card className="border-2 border-green-200 bg-green-50/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="w-5 h-5" />
                        Assigned Submissions
                      </CardTitle>
                      <CardDescription className="text-green-600">
                        Submissions already assigned to Judges
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{assignmentOverview?.assignedSubmissions?.length || 0}</div>
                      <div className="text-sm text-gray-500">Assigned to Judges</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {assignmentOverview?.assignedSubmissions?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TEAM</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PROJECT</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PROBLEM STATEMENT</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ROUND</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TYPE</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ASSIGNED JUDGES</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SCORE</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {assignmentOverview.assignedSubmissions.map((submission) => (
                            <tr key={submission._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="font-medium text-gray-900">{submission.teamName}</div>
                                  <div className="text-sm text-gray-500">{submission.teamId}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {submission.projectTitle || submission.title || 'Untitled Project'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {submission.problemStatement ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                      {typeof submission.problemStatement === 'string' 
                                        ? (submission.problemStatement.length > 30 
                                            ? submission.problemStatement.substring(0, 30) + "..." 
                                            : submission.problemStatement)
                                        : submission.problemStatement.statement 
                                          ? (submission.problemStatement.statement.length > 30 
                                              ? submission.problemStatement.statement.substring(0, 30) + "..." 
                                              : submission.problemStatement.statement)
                                          : 'Not specified'
                                      }
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-sm">Not specified</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {submission.roundIndex !== null && submission.roundIndex !== undefined && !isNaN(submission.roundIndex) 
                                    ? `Round ${submission.roundIndex + 1}` 
                                    : 'Round 1'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-900">{submission.pptFile ? 'PPT' : 'Project'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-900">
                                    {submission.assignedJudges?.length || 0} judge{submission.assignedJudges?.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {submission.averageScore ? (
                                  <div className="text-sm font-medium text-green-600">
                                    {submission.averageScore}/10
                                  </div>
                                ) : (
                                  <div className="text-sm italic text-gray-500">
                                    Not evaluated yet
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button 
                                  onClick={() => handleViewSubmission(submission)}
                                  className="inline-flex items-center gap-2 px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                  <Eye className="w-4 h-4" />
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>No assigned submissions</p>
                    </div>
                  )}
                </CardContent>
              </Card>
                         </div>

             {/* Unassigned Submissions Section */}
             <div className="bg-white rounded-lg shadow-sm border border-gray-200">
               <div className="p-6 border-b border-gray-200">
                 <div className="flex items-center justify-between">
                   <div>
                     <h3 className="text-lg font-semibold text-gray-900">Unassigned Submissions</h3>
                     <p className="text-sm text-gray-600">Submissions that need to be assigned to judges</p>
                   </div>
                   <div className="text-right">
                     <div className="text-2xl font-bold text-yellow-600">{assignmentOverview?.unassignedSubmissions?.length || 0}</div>
                     <div className="text-sm text-gray-500">Pending Assignment</div>
                   </div>
                 </div>
               </div>
               <div className="p-6">
                 {assignmentOverview?.unassignedSubmissions?.length > 0 ? (
                   <>
                     <div className="overflow-x-auto">
                       <table className="min-w-full divide-y divide-gray-200">
                         <thead className="bg-gray-50">
                           <tr>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                               <input
                                 type="checkbox"
                                 checked={selectedSubmissions.size === assignmentOverview.unassignedSubmissions.length}
                                 onChange={(e) => {
                                   if (e.target.checked) {
                                     setSelectedSubmissions(new Set(assignmentOverview.unassignedSubmissions.map(s => s._id)));
                                   } else {
                                     setSelectedSubmissions(new Set());
                                   }
                                 }}
                                 className="h-4 w-4 text-blue-600 rounded"
                               />
                             </th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TEAM</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PROBLEM STATEMENT</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TYPE</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
                           </tr>
                         </thead>
                         <tbody className="bg-white divide-y divide-gray-200">
                           {assignmentOverview.unassignedSubmissions.map((submission) => (
                             <tr key={submission._id} className="hover:bg-gray-50">
                               <td className="px-6 py-4 whitespace-nowrap">
                                 <input
                                   type="checkbox"
                                   checked={selectedSubmissions.has(submission._id)}
                                   onChange={(e) => handleSubmissionSelection(submission._id, e.target.checked)}
                                   className="h-4 w-4 text-blue-600 rounded"
                                 />
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap">
                                 <div>
                                   <div className="font-medium text-gray-900">{submission.teamName}</div>
                                   <div className="text-sm text-gray-500">{submission.teamId}</div>
                                 </div>
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap">
                                 <div className="text-sm text-gray-900">
                                   {submission.problemStatement ? (
                                     <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                       {typeof submission.problemStatement === 'string' 
                                         ? (submission.problemStatement.length > 30 
                                             ? submission.problemStatement.substring(0, 30) + "..." 
                                             : submission.problemStatement)
                                         : submission.problemStatement.statement 
                                           ? (submission.problemStatement.statement.length > 30 
                                               ? submission.problemStatement.statement.substring(0, 30) + "..." 
                                               : submission.problemStatement.statement)
                                           : 'Not specified'
                                       }
                                     </span>
                                   ) : (
                                     <span className="text-gray-400 text-sm">Not specified</span>
                                   )}
                                 </div>
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap">
                                 <div className="flex items-center gap-2">
                                   <FileText className="w-4 h-4 text-gray-400" />
                                   <span className="text-sm text-gray-900">{submission.pptFile ? 'PPT' : 'Project'}</span>
                                 </div>
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap">
                                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                   Unassigned
                                 </span>
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                     {/* Assignment Actions for Unassigned */}
                     {selectedSubmissions.size > 0 && (
                       <div className="flex flex-wrap gap-4 mt-6 items-center">
                         <Button
                           onClick={handleBulkAssignment}
                           className="bg-blue-600 hover:bg-blue-700 text-white"
                           disabled={selectedSubmissions.size === 0}
                         >
                           <Users className="w-4 h-4 mr-2" />
                           Assign to Judges ({selectedSubmissions.size} selected)
                         </Button>
                         <span className="text-sm text-gray-500">
                           Select judges to assign these submissions
                         </span>
                       </div>
                     )}
                   </>
                 ) : (
                   // Empty state for no unassigned submissions
                   <div className="text-center py-12">
                     <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                       <CheckCircle className="w-8 h-8 text-green-600" />
                     </div>
                     <h3 className="text-lg font-medium text-gray-900 mb-2">No Unassigned Submissions</h3>
                     <p className="text-sm text-gray-500 mb-4">
                       All submissions have been assigned to judges for evaluation.
                     </p>
                     <div className="text-xs text-gray-400">
                       Great job! All submissions are now being reviewed by the judges.
                     </div>
                   </div>
                 )}
               </div>
             </div>
           </div>
         </div>
      ) : (
        <>
          {/* Show round name and details above the table for other stages */}
          <div className="mb-4">
            <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
              {getRoundName(selectedStage)}
            </h2>
            <p className="text-gray-500 text-base">{getRoundDetails(selectedStage)}</p>
          </div>
          
          {/* Team Management Section */}
          <Card className="p-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="w-5 h-5" />
                Team Management
              </CardTitle>
              <CardDescription>
                View and manage teams across different stages of the hackathon.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Teams Table */}
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leader</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Problem Statement</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamsToShow.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-gray-400">No teams found.</td></tr>
                    ) : teamsToShow.map((team, idx) => (
                      <tr key={team._id} className="border-b hover:bg-indigo-50 transition-all">
                        <td className="px-6 py-4 font-medium">{idx + 1}</td>
                        <td className="px-6 py-4">
                          <button className="flex items-center gap-2 font-semibold text-indigo-700 hover:underline" onClick={() => setSelectedTeam(team)}>
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-white" style={{ background: '#'+((1<<24)*Math.abs(Math.sin(team.name.length))).toString(16).slice(0,6) }}>{team.name.charAt(0).toUpperCase()}</div>
                            {team.name}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-900">{team.leader?.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {team.submittedProblemStatements && team.submittedProblemStatements.length > 0 ? (
                              <div className="space-y-1">
                                {team.submittedProblemStatements.map((ps, psIdx) => (
                                  <span key={psIdx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    {typeof ps === 'string' 
                                      ? (ps.length > 25 ? ps.substring(0, 25) + "..." : ps)
                                      : ps.statement 
                                        ? (ps.statement.length > 25 ? ps.statement.substring(0, 25) + "..." : ps.statement)
                                        : 'Not specified'
                                    }
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">Not specified</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-2 text-xs font-medium text-gray-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 17l-4 4m0 0l-4-4m4 4V3" /></svg>
                            REG <span className="text-green-500">→</span> R1
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Current Assignments Table */}
          <Card className="p-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="w-5 h-5" />
                Current Judge Assignments
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAssignmentOverview}
                  disabled={overviewLoading}
                  className="ml-auto"
                >
                  <RefreshCw className={`w-4 h-4 ${overviewLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                    setSelectedSubmissions(new Set());
                    fetchAssignmentOverview();
              }}
                  disabled={overviewLoading}
            >
                  Force Refresh
            </Button>
              </CardTitle>
              <CardDescription>
                View current judge assignments and their assigned projects/teams for this hackathon.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Assignment Summary */}
              {assignmentOverview && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
          </div>
                      <div>
                        <div className="text-sm font-medium text-gray-600">Active Judges</div>
                        <div className="text-lg font-bold text-blue-700">{assignmentOverview.judges?.length || 0}</div>
        </div>
            </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <FileText className="w-5 h-5 text-green-600" />
          </div>
                      <div>
                        <div className="text-sm font-medium text-gray-600">Assigned Projects</div>
                        <div className="text-lg font-bold text-green-700">
                          {assignmentOverview.judges?.reduce((total, judge) => total + (judge.assignedSubmissions?.length || 0), 0) || 0}
            </div>
          </div>
            </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <FileText className="w-5 h-5 text-orange-600" />
      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-600">Unassigned Projects</div>
                        <div className="text-lg font-bold text-orange-700">{assignmentOverview.unassignedSubmissions?.length || 0}</div>
        </div>
      </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Award className="w-5 h-5 text-purple-600" />
                      </div>
              <div>
                        <div className="text-sm font-medium text-gray-600">Total Projects</div>
                        <div className="text-lg font-bold text-purple-700">
                          {(assignmentOverview.judges?.reduce((total, judge) => total + (judge.assignedSubmissions?.length || 0), 0) || 0) + 
                           (assignmentOverview.unassignedSubmissions?.length || 0)}
              </div>
              </div>
            </div>
          </div>
                          </div>
              )}

              {/* Assigned Submissions Table */}
              <div className="mb-6">
                <Card className="border-2 border-green-200 bg-green-50/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-5 h-5" />
                          Assigned Submissions
                        </CardTitle>
                        <CardDescription className="text-green-600">
                          Submissions already assigned to Judges
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{assignmentOverview?.assignedSubmissions?.length || 0}</div>
                        <div className="text-sm text-gray-500">Assigned to Judges</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {assignmentOverview?.assignedSubmissions?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TEAM</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PROBLEM STATEMENT</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TYPE</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ASSIGNED JUDGES</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SCORE</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {assignmentOverview.assignedSubmissions.map((submission) => (
                              <tr key={submission._id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div>
                                    <div className="font-medium text-gray-900">{submission.teamName}</div>
                                    <div className="text-sm text-gray-500">{submission.teamId}</div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {submission.problemStatement ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                        {typeof submission.problemStatement === 'string' 
                                          ? (submission.problemStatement.length > 30 
                                              ? submission.problemStatement.substring(0, 30) + "..." 
                                              : submission.problemStatement)
                                          : submission.problemStatement.statement 
                                            ? (submission.problemStatement.statement.length > 30 
                                                ? submission.problemStatement.statement.substring(0, 30) + "..." 
                                                : submission.problemStatement.statement)
                                            : 'Not specified'
                                        }
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 text-sm">Not specified</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-900">{submission.pptFile ? 'PPT' : 'Project'}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-900">
                                      {submission.assignedJudges?.length || 0} judge{submission.assignedJudges?.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {submission.averageScore ? (
                                    <div className="text-sm font-medium text-green-600">
                                      {submission.averageScore}/10
                                    </div>
                                  ) : (
                                    <div className="text-sm italic text-gray-500">
                                      Not evaluated yet
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <button 
                                    onClick={() => handleViewSubmission(submission)}
                                    className="inline-flex items-center gap-2 px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p>No assigned submissions</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <div className="overflow-x-auto rounded-2xl shadow-lg bg-white/90 border border-gray-200 p-2 md:p-4">
                <table className="min-w-full text-sm border-separate border-spacing-y-3">
                  <thead className="bg-gradient-to-r from-indigo-100 to-purple-100 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-8 py-4 text-left font-bold text-gray-800 tracking-wide rounded-tl-2xl">Judge</th>
                      <th className="px-8 py-4 text-left font-bold text-gray-800 tracking-wide">Type</th>
                      <th className="px-8 py-4 text-left font-bold text-gray-800 tracking-wide">Status</th>
                      <th className="px-8 py-4 text-left font-bold text-gray-800 tracking-wide">Assigned Projects</th>
                      <th className="px-8 py-4 text-left font-bold text-gray-800 tracking-wide rounded-tr-2xl">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Assigned Judges */}
                    {(!allJudgeAssignments || allJudgeAssignments.length === 0) && (!availableJudges || availableJudges.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="text-center py-16">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <span className="text-5xl">🧑‍⚖️</span>
                            <span className="font-semibold text-gray-700 text-lg">No judges assigned yet</span>
                            <span className="text-gray-500 text-base">Invite judges to get started.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {/* Assigned Judges */}
                        {allJudgeAssignments?.map(a => (
                          <tr key={a._id} className="bg-white hover:bg-indigo-50 transition-all duration-200 rounded-2xl shadow-md border border-gray-100">
                            <td className="px-8 py-4 flex items-center gap-4 border-r border-gray-100">
                              <Avatar className="h-9 w-9 shadow-sm">
                                <AvatarImage src={a.judge.avatarUrl || undefined} alt={a.judge.email} />
                                <AvatarFallback>{a.judge.email[0]?.toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <button 
                                onClick={() => handleJudgeClick(a)}
                                className="font-medium text-gray-900 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                              >
                                {a.judge.email}
                              </button>
                            </td>
                            <td className="px-8 py-4 border-r border-gray-100">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${a.judge.type === 'platform' ? 'bg-blue-100 text-blue-700' : a.judge.type === 'sponsor' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{a.judge.type}</span>
                            </td>
                            <td className="px-8 py-4 border-r border-gray-100">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Assigned
                              </span>
                            </td>
                                                             <td className="px-8 py-4 border-r border-gray-100">
                               <div className="space-y-2">
                                 {(() => {
                                   // Get assigned projects from assignment overview
                                   const judgeOverview = assignmentOverview?.judges?.find(j => j.judgeEmail === a.judge.email);
                                   const assignedProjects = judgeOverview?.assignedSubmissions || [];
                                   
                                   if (assignedProjects.length > 0) {
                            return (
                                       <div className="space-y-1">
                                         {assignedProjects.slice(0, 3).map((project, idx) => (
                                           <div key={project._id} className="flex items-center justify-between p-2 bg-indigo-50 rounded border border-indigo-100">
                              <div className="flex items-center gap-2">
                                               <FileText className="w-3 h-3 text-indigo-600" />
                                               <span className="text-xs font-medium text-indigo-700">
                                                 {project.projectTitle || 'Untitled'}
                                </span>
                                             </div>
                                             <div className="flex items-center gap-2">
                                               <span className={`text-xs px-2 py-1 rounded-full ${
                                                 project.evaluationStatus === 'evaluated' 
                                                   ? 'bg-green-100 text-green-700' 
                                                   : 'bg-yellow-100 text-yellow-700'
                                               }`}>
                                                 {project.evaluationStatus === 'evaluated' ? '✓' : '⏳'}
                                </span>
                                               {project.averageScore && (
                                                 <span className="text-xs font-bold text-green-700">
                                                   {project.averageScore}/10
                                                 </span>
                                               )}
                                             </div>
                                           </div>
                                         ))}
                                         {assignedProjects.length > 3 && (
                                           <div className="text-xs text-gray-500 text-center">
                                             +{assignedProjects.length - 3} more projects
                                           </div>
                                         )}
                              </div>
                            );
                                   } else {
                                     return (
                                       <span className="text-gray-400 text-sm">No projects assigned</span>
                                     );
                                   }
                          })()}
                               </div>
                        </td>
                            <td className="px-8 py-4">
                              <div className="flex items-center gap-2">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                      Unassign All
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Unassign All Teams</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will remove all team assignments from this judge. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleUnassignAll(a._id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        {unassigning[a._id] ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unassign All"}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                                      disabled={deletingJudge === a._id}
                                    >
                                      {deletingJudge === a._id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        "Delete Judge"
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Judge</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete judge "{a.judge.email}" and remove all their:
                                        <ul className="list-disc list-inside mt-2 space-y-1">
                                          <li>Assigned submissions</li>
                                          <li>Given scores</li>
                                          <li>Judge role for this hackathon</li>
                                        </ul>
                                        <p className="mt-2 font-semibold text-red-600">This action cannot be undone!</p>
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteJudge(a)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete Judge
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                        </td>
                          </tr>
                        ))}
                        
                        {/* Available Judges */}
                        {availableJudges?.map(judge => (
                          <tr key={judge.id} className="bg-gray-50 hover:bg-gray-100 transition-all duration-200 rounded-2xl shadow-sm border border-gray-200">
                            <td className="px-8 py-4 flex items-center gap-4 border-r border-gray-200">
                              <Avatar className="h-9 w-9 shadow-sm">
                                <AvatarImage src={judge.profileImage || undefined} alt={judge.email} />
                                <AvatarFallback>{judge.name?.charAt(0)?.toUpperCase() || judge.email[0]?.toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-gray-600">
                                {judge.name || judge.email}
                              </span>
                            </td>
                            <td className="px-8 py-4 border-r border-gray-200">
                              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold shadow-sm bg-gray-100 text-gray-700">
                                {judge.type || 'external'}
                              </span>
                            </td>
                            <td className="px-8 py-4 border-r border-gray-200">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                                <Users className="w-3 h-3 mr-1" />
                                Available
                              </span>
                            </td>
                            <td className="px-8 py-4 border-r border-gray-200">
                              <span className="text-gray-400 text-sm">Not assigned yet</span>
                            </td>
                            <td className="px-8 py-4">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50"
                                onClick={() => {
                                  // TODO: Open invite modal or assign directly
                                  toast({
                                    title: 'Invite Judge',
                                    description: `Click "Assign to Judges" in the submission round to invite ${judge.name || judge.email}`,
                                    variant: 'default',
                                  });
                                }}
                              >
                                Invite
                              </Button>
                        </td>
                      </tr>
                        ))}
                      </>
                    )}
                </tbody>
              </table>
            </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Team Details Modal */}
      <Dialog open={!!selectedTeam} onOpenChange={() => setSelectedTeam(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Team Details</DialogTitle>
            <DialogDescription>
              Detailed view of team information and submissions.
            </DialogDescription>
          </DialogHeader>
          {selectedTeam && (
            <SubmissionRoundView
              team={selectedTeam}
              hackathonId={hackathon?._id || hackathon?.id}
              onClose={() => setSelectedTeam(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Judge Details Modal */}
      <Dialog open={judgeDetailsModalOpen} onOpenChange={setJudgeDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
              Judge Assignment Details
            </DialogTitle>
            <DialogDescription>
              Detailed view of judge assignments, submissions, and evaluation progress.
            </DialogDescription>
          </DialogHeader>
          {selectedJudge && (
            <div className="space-y-6">
              {/* Judge Info */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedJudge.judge.avatarUrl || undefined} alt={selectedJudge.judge.email} />
                  <AvatarFallback className="text-lg">{selectedJudge.judge.email[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{selectedJudge.judge.name || selectedJudge.judge.email}</h3>
                  <p className="text-gray-600 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {selectedJudge.judge.email}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                      selectedJudge.judge.type === 'platform' ? 'bg-blue-100 text-blue-700' : 
                      selectedJudge.judge.type === 'sponsor' ? 'bg-green-100 text-green-700' : 
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {selectedJudge.judge.type} Judge
                    </span>
                    <span className="text-sm text-gray-500">
                      Status: {selectedJudge.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assignment Statistics */}
              {(() => {
                const stats = getJudgeAssignmentStats(selectedJudge);
                const assignedTeams = getJudgeAssignedTeams(selectedJudge);
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-blue-900">Total Submissions</span>
          </div>
                      <p className="text-2xl font-bold text-blue-700">{stats.totalSubmissions}</p>
        </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-900">Evaluated</span>
                      </div>
                      <p className="text-2xl font-bold text-green-700">{stats.evaluatedSubmissions}</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-600" />
                        <span className="font-semibold text-purple-900">Assigned Teams</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-700">{assignedTeams.length}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Assigned Teams */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Assigned Teams
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getJudgeAssignedTeams(selectedJudge).map(team => (
                    <div key={team._id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                          <h5 className="font-semibold text-gray-900">{team.name}</h5>
                          <p className="text-sm text-gray-600">
                            Leader: {team.leader?.name || 'Unknown'}
                          </p>
              </div>
              <div className="text-right">
                          <span className="text-sm text-gray-500">
                            {team.members?.length || 0} members
                          </span>
              </div>
            </div>
          </div>
                  ))}
                          </div>
                          </div>

              {/* Round-wise Assignments */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Round-wise Assignments
                </h4>
                {selectedJudge.assignedRounds?.map((round, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-gray-900">
                        {round.roundName || (round.roundIndex !== null && round.roundIndex !== undefined && !isNaN(round.roundIndex) 
                          ? `Round ${round.roundIndex + 1}` 
                          : 'Round 1')}
                      </h5>
                      <span className="text-sm text-gray-500">
                        {round.assignedSubmissions?.length || 0} submissions
                      </span>
                    </div>
                    
                    {round.assignedSubmissions?.length > 0 ? (
                      <div className="space-y-2">
                        {round.assignedSubmissions.map(subId => {
                          // Use assignmentOverview data instead of submissions prop
                          const submission = assignmentOverview?.assignedSubmissions?.find(s => s._id === subId) ||
                                            assignmentOverview?.unassignedSubmissions?.find(s => s._id === subId);
                          const team = teams.find(t => t._id === submission?.teamId);
                          return submission ? (
                            <div key={subId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                                {submission.pptFile ? (
                              <FileText className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Award className="w-4 h-4 text-green-600" />
                            )}
                                <span className="text-sm font-medium">
                                  {submission.projectTitle || submission.title || 'Untitled Project'}
                          </span>
                                <span className="text-xs text-gray-500">
                                  ({team?.name || 'No Team'})
                          </span>
                        </div>
                              <div className="flex items-center gap-2">
                                {submission.scores?.length > 0 ? (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                    Evaluated
                                </span>
                                ) : (
                                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                                    Pending
                                </span>
                                )}
                              </div>
                            </div>
                          ) : null;
                        })}
          </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No submissions assigned to this round</p>
                    )}
          </div>
                )) || (
                  <p className="text-gray-500 text-sm">No rounds assigned</p>
                )}
              </div>
        </div>
              )}
            </DialogContent>
          </Dialog>

      {/* Assignment Modal */}
          <BulkEvaluatorAssignModal
            open={assignModalOpen}
            onClose={() => {
              setAssignModalOpen(false);
            }}
        selectedCount={selectedSubmissions.size}
        hackathonId={hackathon?._id || hackathon?.id}
        roundIndex={(() => {
          const stage = stages.find(s => s.id === selectedStage);
          return stage && stage.roundIndex !== undefined ? stage.roundIndex : 0;
        })()}
        selectedSubmissionIds={Array.from(selectedSubmissions)}
        onAssign={(selectedEvaluators) => {
          setSelectedSubmissions(new Set());
              setAssignModalOpen(false);
          // Force refresh after assignment
          fetchAssignmentOverview();
            }}
            onAssignmentComplete={() => {
          // Force refresh assignment overview immediately
          fetchAssignmentOverview();
          // Reset selected submissions
          setSelectedSubmissions(new Set());
          // Show success message
          toast({
            title: 'Assignment completed',
            description: 'Submissions have been assigned to judges. The overview has been refreshed.',
            variant: 'default',
          });
          // Force a second refresh after a short delay to ensure data is updated
          setTimeout(() => {
            fetchAssignmentOverview();
          }, 1000);
            }}
            onEvaluatorAdded={() => {
              // Refresh available judges when a new evaluator is added
              fetchAvailableJudges();
            }}
          />

      {/* Submission Details Modal */}
      <Dialog open={submissionDetailsModalOpen} onOpenChange={setSubmissionDetailsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Submission Details
            </DialogTitle>
            <DialogDescription>
              Complete view of submission, assigned judges, and evaluations
            </DialogDescription>
          </DialogHeader>
          {loadingSubmissionDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading submission details...</span>
            </div>
          ) : submissionDetails ? (
            <div className="space-y-6">
              {/* Submission Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {submissionDetails.projectTitle || submissionDetails.title || 'Untitled Project'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Team:</span>
                        <span className="ml-2 text-gray-900">{submissionDetails.teamName}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Submission Type:</span>
                        <span className="ml-2 text-gray-900">
                          {submissionDetails.pptFile ? 'PPT Presentation' : 'Project Files'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Submitted:</span>
                        <span className="ml-2 text-gray-900">
                          {formatDate(submissionDetails.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {submissionDetails.assignedJudges?.length || 0}
                    </div>
                    <div className="text-sm text-gray-500">Assigned Judges</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {(() => {
                        const evaluatedCount = submissionDetails.evaluations?.length || 0;
                        const totalCount = submissionDetails.assignedJudges?.length || 0;
                        return `${evaluatedCount}/${totalCount} Evaluated`;
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submission Files */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Submission Files
                </h4>
                <div className="space-y-4">
                  {submissionDetails.pptFile && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-3">
                          <FileText className="w-6 h-6 text-blue-600" />
                          <div>
                            <div className="font-medium text-gray-900">PPT Presentation</div>
                            <div className="text-sm text-gray-500">
                              {submissionDetails.pptFile.split('/').pop()}
                            </div>
                          </div>
                        </div>
                        <a
                          href={submissionDetails.pptFile}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Eye className="w-4 h-4" />
                          Open in New Tab
                        </a>
                      </div>
                      
                      {/* PPT Preview Section */}
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-600" />
                          PPT Preview
                        </h5>
                        <div className="relative bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                          <iframe
                            src={`https://docs.google.com/gview?url=${encodeURIComponent(submissionDetails.pptFile)}&embedded=true`}
                            style={{ 
                              width: "100%", 
                              height: "600px", 
                              border: "none"
                            }}
                            title="PPT Preview"
                            allowFullScreen
                            className="rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {submissionDetails.projectFiles && submissionDetails.projectFiles.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-medium text-gray-900">Project Files:</h5>
                      {submissionDetails.projectFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-gray-600" />
                            <div>
                              <div className="font-medium text-gray-900">{file.name}</div>
                              <div className="text-sm text-gray-500">{file.type}</div>
                            </div>
                          </div>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Assigned Judges */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  Assigned Judges ({submissionDetails.assignedJudges?.length || 0})
                </h4>
                {submissionDetails.assignedJudges && submissionDetails.assignedJudges.length > 0 ? (
                  <div className="space-y-4">
                    {submissionDetails.assignedJudges.map((judge, index) => {
                      // Check if this judge has evaluated
                      const hasEvaluated = submissionDetails.evaluations?.some(evaluation => 
                        evaluation.judge?._id === judge._id || 
                        evaluation.judge?.email === judge.judgeEmail || 
                        evaluation.judge?.email === judge.email
                      );
                      
                      return (
                        <div key={index} className={`flex items-center justify-between p-4 rounded-lg border ${
                          hasEvaluated ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                        }`}>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={judge.avatarUrl} alt={judge.judgeName || judge.name || judge.judgeEmail || judge.email} />
                              <AvatarFallback>
                                {(judge.judgeName || judge.name || judge.judgeEmail || judge.email || 'J')[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-gray-900">
                                {judge.judgeName || judge.name || 'Unknown Judge'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {judge.judgeEmail || judge.email || 'No email available'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {hasEvaluated ? (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="text-sm font-medium text-green-700">Evaluated</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-700">Pending</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No judges assigned yet</p>
                  </div>
                )}
              </div>

              {/* Judge Evaluations */}
              {submissionDetails.evaluations && submissionDetails.evaluations.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-600" />
                    Judge Evaluations ({submissionDetails.evaluations.length})
                  </h4>
                  <div className="space-y-4">
                    {submissionDetails.evaluations.map((evaluation, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-semibold text-blue-700">
                                {(evaluation.judge?.name || evaluation.judge?.email || 'J')[0].toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {evaluation.judge?.name || evaluation.judge?.email || 'Unknown Judge'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {evaluation.judge?.email || 'No email available'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">
                              {evaluation.totalScore || (evaluation.scores && Object.values(evaluation.scores).reduce((sum, score) => sum + (score || 0), 0) / Object.keys(evaluation.scores).length) || 0}/10
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(evaluation.createdAt)}
                            </div>
                          </div>
                        </div>

                        {/* Evaluation Criteria */}
                        {evaluation.scores && Object.keys(evaluation.scores).length > 0 && (
                          <div className="space-y-2">
                            <h6 className="font-medium text-gray-900">Evaluation Criteria:</h6>
                            {Object.entries(evaluation.scores).map(([criteria, score]) => (
                              <div key={criteria} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm text-gray-700 capitalize">{criteria}</span>
                                <span className="text-sm font-medium text-gray-900">
                                  {score}/10
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Feedback */}
                        {evaluation.feedback && (
                          <div className="mt-4">
                            <h6 className="font-medium text-gray-900 mb-2">Feedback:</h6>
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700">{evaluation.feedback}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No submission details available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 
