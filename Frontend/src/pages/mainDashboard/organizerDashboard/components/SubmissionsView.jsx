"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "../../../../components/CommonUI/button";
import { API_BASE_URL } from "../../../../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "../../../../components/CommonUI/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/CommonUI/select";
import {
  ArrowLeft,
  FileCheck,
  Upload,
  Filter,
  Download,
  Eye,
  Trophy,FileText ,
  Users,
  // New icons imported for the detailed modal
  Gavel, Loader2, Calendar, Mail, CheckCircle, RefreshCw, Clock,
  Github, Globe, ExternalLink, Video, Code, BookOpen, User, Phone, MapPin, Star, Tag, Link, Award, TrendingUp
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "../../../../components/DashboardUI/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "../../../../components/DashboardUI/avatar";
import { toast } from "../../../../hooks/use-toast";

export default function SubmissionsView({
  submissions = [], // This prop likely contains summary data
  hackathon,
  selectedType = 'All',
  setSelectedType = () => {},
  selectedProblemStatement = 'All',
  setSelectedProblemStatement = () => {},
  setShowSubmissionsView = () => {},
  selectedSubmissionId, // Prop to control which submission is open in detail modal
  setSelectedSubmissionId, // Prop to set/clear the selected submission ID
  onExportSubmissions = () => {},
}) {
  // State for the Submission Details Modal
  const [submissionDetails, setSubmissionDetails] = useState(null);
  const [loadingSubmissionDetails, setLoadingSubmissionDetails] = useState(false);
  const [submissionScores, setSubmissionScores] = useState({}); // To store scores if needed separately

  // Helper function to extract problem statement text (from original)
  const getProblemStatementText = (ps) => {
    if (typeof ps === 'string') return ps;
    if (typeof ps === 'object' && ps.statement) return ps.statement;
    return String(ps); // Fallback for other formats
  };

  // Helper function to check if a submission matches the selected problem statement (from original)
  const hasSubmittedToProblemStatement = (submission, problemStatement) => {
    if (!submission.problemStatement) return false;
    return getProblemStatementText(submission.problemStatement) === getProblemStatementText(problemStatement);
  };

  // Filtering logic for submissions by type and problem statement (from original)
  const filteredSubmissions = submissions.filter(sub => {
    const typeMatch = selectedType === 'All' ||
      (selectedType === 'Round 1' && sub.roundNumber === 1) ||
      (selectedType === 'Round 2' && sub.roundNumber === 2);

    const psMatch = selectedProblemStatement === 'All' ||
      hasSubmittedToProblemStatement(sub, selectedProblemStatement);

    return typeMatch && psMatch;
  });

  // Get all problem statements from hackathon (including those with no submissions) (from original)
  const allProblemStatements = hackathon?.problemStatements || [];

  // Process and deduplicate problem statements (from original)
  const uniqueProblemStatements = [...new Set(
    allProblemStatements
      .map(ps => getProblemStatementText(ps))
      .filter(ps => ps && ps.trim()) // Remove empty strings
  )];

  // Calculate statistics (from original)
  const totalSubmissions = submissions.length;
  const round1Submissions = submissions.filter(s => s.roundNumber === 1).length;
  const round2Submissions = submissions.filter(s => s.roundNumber === 2).length;
  const filteredSubmissionsCount = filteredSubmissions.length;

  // Get problem statement statistics (from original)
  const problemStatementStats = {};
  submissions.forEach(sub => {
    if (sub.problemStatement) {
      const ps = getProblemStatementText(sub.problemStatement);
      if (!problemStatementStats[ps]) {
        problemStatementStats[ps] = { total: 0, round1: 0, round2: 0 };
      }
      problemStatementStats[ps].total++;
      if (sub.roundNumber === 1) {
        problemStatementStats[ps].round1++;
      } else if (sub.roundNumber === 2) {
        problemStatementStats[ps].round2++;
      }
    }
  });

  // Calculate problem statement counts based on current type filter (from original)
  const getProblemStatementCount = (ps) => {
    if (selectedType === 'All') {
      return problemStatementStats[ps]?.total || 0;
    } else if (selectedType === 'Round 1') {
      return problemStatementStats[ps]?.round1 || 0;
    } else if (selectedType === 'Round 2') {
      return problemStatementStats[ps]?.round2 || 0;
    }
    return 0;
  };

  // Helper function to format dates (copied from JudgeManagementAssignments)
  const formatDate = (date) => date ? new Date(date).toLocaleString() : '--';

  // Helper function to calculate average score (copied from JudgeManagementAssignments)
  const getAverageScore = (submissionId) => {
    const scores = submissionScores[submissionId] || [];
    if (scores.length === 0) return null;

    const CRITERIA = ["innovation", "impact", "technicality", "presentation"]; // Assume these are the criteria
    const totalScore = scores.reduce((sum, score) => {
      const criteriaScore = CRITERIA.reduce((acc, criteria) => acc + (score.scores?.[criteria] || 0), 0);
      return sum + (criteriaScore / CRITERIA.length);
    }, 0);

    return (totalScore / scores.length).toFixed(2);
  };

  // Function to fetch full submission details (adapted from JudgeManagementAssignments)
  const fetchSubmissionDetails = useCallback(async (submissionId) => {
    if (!submissionId) {
      setSubmissionDetails(null);
      return;
    }

    setLoadingSubmissionDetails(true);
    try {
      const token = localStorage.getItem('token');

      // Fetch detailed submission information
      const submissionResponse = await fetch(`${API_BASE_URL}/api/submission-form/admin/${submissionId}`, { // Renamed to submissionResponse
        headers: { Authorization: `Bearer ${token}` }
      });

      // Fetch judge evaluations for this submission
      const evaluationsResponse = await fetch(`${API_BASE_URL}/api/scores/submission/${submissionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      let submissionData = null;
      if (submissionResponse.ok) {
        submissionData = await submissionResponse.json(); // Read once
      } else {
        const errorText = await submissionResponse.text();
        console.error('Failed to fetch main submission data:', submissionResponse.status, errorText);
        toast({
          title: 'Error',
          description: `Failed to fetch main submission data. Status: ${submissionResponse.status}`,
          variant: 'destructive',
        });
        setSubmissionDetails(null);
        setLoadingSubmissionDetails(false);
        return; // Exit early on primary fetch failure
      }

      let evaluations = [];
      if (evaluationsResponse.ok) {
        evaluations = await evaluationsResponse.json(); // Read once
        setSubmissionScores(prev => ({
          ...prev,
          [submissionId]: evaluations // Store the evaluations array
        }));
      } else {
        const errorText = await evaluationsResponse.text();
        console.warn('Failed to fetch judge evaluations:', evaluationsResponse.status, errorText);
        // It's a warning because the main submission details might still be useful
      }

      // We need to find the full submission object from the 'submissions' prop
      // to get 'assignedJudges' if it's not directly in the /admin API response
      const localSubmission = submissions.find(s => (s._id || s.id) === submissionId);
      const assignedJudges = localSubmission?.assignedJudges || [];


      // Merge all relevant data into submissionDetails state
      const mergedSubmission = {
        ...submissionData.submission, // API response
        ...localSubmission,          // Original submission from prop (prioritize pptFile, teamName etc.)
        evaluations,
        assignedJudges
      };

      setSubmissionDetails(mergedSubmission);

    } catch (error) {
      console.error('Error fetching submission details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch submission details. Please check your connection.',
        variant: 'destructive',
      });
      setSubmissionDetails(null); // Clear details on error
    } finally {
      setLoadingSubmissionDetails(false);
    }
  }, [submissions]);


  // Effect to fetch submission details when selectedSubmissionId changes
  useEffect(() => {
    fetchSubmissionDetails(selectedSubmissionId);
  }, [selectedSubmissionId, fetchSubmissionDetails]);

  // Helper function to get team progress (copied from JudgeManagementAssignments)
  const getTeamProgress = (team) => {
    const teamSubmissions = submissions.filter(sub =>
      sub.teamId === team._id || sub.teamName === team.name
    );

    let progress = 'REG';

    // Check submissions for each round dynamically
    if (hackathon?.rounds) {
      hackathon.rounds.forEach((round, index) => {
        const hasRoundSubmission = teamSubmissions.some(sub => sub.roundIndex === index);
        if (hasRoundSubmission) {
          progress += ` → R${index + 1}`;
        }
      });
    }

    return progress;
  };


  // Helper for finding PPT file URL (copied and refined from JudgeManagementAssignments)
  const getPptFileDetails = (submission) => {
    let pptFileUrl = submission.pptFile;
    let pptFileName = submission.originalName || 'PPT Presentation';

    // Prioritize pptFile if it exists directly on the submission object
    if (pptFileUrl) {
      pptFileName = pptFileUrl.split('/').pop() || pptFileName; // Extract name from URL if available
      return { pptFileUrl, pptFileName };
    }

    // Fallback 1: Check originalName if it suggests a PPT, assumes /uploads/ convention
    if (submission.originalName && (submission.originalName.toLowerCase().endsWith('.ppt') || submission.originalName.toLowerCase().endsWith('.pptx'))) {
      pptFileUrl = `/uploads/${submission.originalName}`; // Adjust this path if different
      pptFileName = submission.originalName;
      return { pptFileUrl, pptFileName };
    }

    // Fallback 2: Check projectFiles array
    if (submission.projectFiles && Array.isArray(submission.projectFiles)) {
      const pptFile = submission.projectFiles.find(file =>
        file.name?.toLowerCase().includes('.ppt') ||
        file.name?.toLowerCase().includes('.pptx') ||
        file.type?.includes('powerpoint')
      );
      if (pptFile) {
        pptFileUrl = pptFile.url;
        pptFileName = pptFile.name;
        return { pptFileUrl, pptFileName };
      }
    }

    // Fallback 3: Check projectId.attachments array
    if (submission.projectId?.attachments && Array.isArray(submission.projectId.attachments)) {
      const pptFile = submission.projectId.attachments.find(file =>
        file.name?.toLowerCase().includes('.ppt') ||
        file.name?.toLowerCase().includes('.pptx') ||
        file.type?.includes('powerpoint')
      );
      if (pptFile) {
        pptFileUrl = pptFile.url;
        pptFileName = pptFile.name;
        return { pptFileUrl, pptFileName };
      }
    }

    // Fallback 4: Check projectId.files array
    if (submission.projectId?.files && Array.isArray(submission.projectId.files)) {
      const pptFile = submission.projectId.files.find(file =>
        file.name?.toLowerCase().includes('.ppt') ||
        file.name?.toLowerCase().includes('.pptx') ||
        file.type?.includes('powerpoint')
      );
      if (pptFile) {
        pptFileUrl = pptFile.url;
        pptFileName = pptFile.name;
        return { pptFileUrl, pptFileName };
      }
    }

    // Fallback 5: Check other generic file fields in projectId
    if (submission.projectId) {
      const project = submission.projectId;
      const possibleFileFields = ['documents', 'presentations', 'slides']; // Add other potential array fields
      for (const field of possibleFileFields) {
        if (project[field] && Array.isArray(project[field])) {
          const pptFile = project[field].find(file =>
            file.name?.toLowerCase().includes('.ppt') ||
            file.name?.toLowerCase().includes('.pptx') ||
            file.type?.includes('powerpoint')
          );
          if (pptFile) {
            pptFileUrl = pptFile.url;
            pptFileName = pptFile.name;
            return { pptFileUrl, pptFileName };
          }
        }
      }
    }

    // If no PPT found, return nulls
    return { pptFileUrl: null, pptFileName: null };
  };


  return (
    <div className="bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-6">
        {/* Enhanced Header */}
        <div className="sticky top-0 z-20 backdrop-blur-sm bg-white/80 rounded-xl shadow-sm mb-6">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                className="flex items-center gap-2 hover:bg-gray-100"
                onClick={() => setShowSubmissionsView(false)}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Submissions</h1>
                {(selectedProblemStatement !== 'All' || selectedType !== 'All') && (
                  <p className="text-sm text-gray-600 mt-1">
                    Filtered by: {selectedType !== 'All' ? selectedType : ''}
                    {selectedType !== 'All' && selectedProblemStatement !== 'All' ? ' + ' : ''}
                    {selectedProblemStatement !== 'All' ? `"${selectedProblemStatement.length > 40 ? selectedProblemStatement.substring(0, 40) + "..." : selectedProblemStatement}"` : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
              <Filter className="w-4 h-4 text-gray-500" />

              {/* Type Filter */}
              <span className="text-sm font-medium text-gray-500">Type:</span>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-40 bg-white">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Types ({totalSubmissions})</SelectItem>
                  <SelectItem value="Round 1">Round 1 ({round1Submissions})</SelectItem>
                  <SelectItem value="Round 2">Round 2 ({round2Submissions})</SelectItem>
                </SelectContent>
              </Select>

              {/* Problem Statement Filter */}
              <span className="text-sm font-medium text-gray-500">Problem Statement:</span>
              <Select value={selectedProblemStatement} onValueChange={setSelectedProblemStatement}>
                <SelectTrigger className="w-64 bg-white">
                  <SelectValue placeholder="All Problem Statements" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Problem Statements ({filteredSubmissionsCount})</SelectItem>
                  {uniqueProblemStatements.map((ps, idx) => (
                    <SelectItem key={idx} value={ps}>
                      {ps.length > 50 ? ps.substring(0, 50) + "..." : ps} ({getProblemStatementCount(ps)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {(selectedType !== 'All' || selectedProblemStatement !== 'All') && (
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => {
                    setSelectedType('All');
                    setSelectedProblemStatement('All');
                  }}
                  className="text-gray-700 hover:text-gray-900 border-gray-400 hover:border-gray-500 bg-white hover:bg-gray-50 px-8 py-2 font-medium"
                >
                  Clear Filters
                </Button>
              )}

              {/* Export Button */}
              <Button
                variant="outline"
                size="default"
                onClick={() => {
                  // Export submissions functionality
                  const csvContent = [
                    ['Project Title', 'Submitted By', 'Email', 'Round', 'Problem Statement', 'Status', 'Submitted Date'],
                    ...filteredSubmissions.map(s => [
                      s.projectTitle || 'Untitled Project',
                      s.submittedByName || s.submittedBy?.name || 'Unknown',
                      s.submittedBy?.email || 'N/A',
                      s.roundLabel || `Round ${s.roundNumber}`,
                      s.problemStatement ? getProblemStatementText(s.problemStatement) : 'Not specified',
                      s.status === 'submitted' ? 'Submitted' : 'Draft',
                      s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : 'N/A'
                    ])
                  ].map(row => row.join(',')).join('\n');

                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `submissions-${selectedType === 'All' ? 'all' : selectedType.toLowerCase()}-${selectedProblemStatement === 'All' ? 'all' : 'filtered'}.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                className="text-gray-700 hover:text-gray-900 border-gray-400 hover:border-gray-500 bg-white hover:bg-gray-50 px-8 py-2 font-medium"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card className="overflow-hidden">
            <CardContent className="p-6 pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 rounded-xl">
                  <Upload className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{filteredSubmissionsCount}</div>
                  <div className="text-sm text-gray-500">
                    {selectedType !== 'All' || selectedProblemStatement !== 'All' ? 'Filtered Submissions' : 'Total Submissions'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-6 pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-xl">
                  <Trophy className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {filteredSubmissions.filter(s => s.roundNumber === 1).length}
                  </div>
                  <div className="text-sm text-gray-500">Round 1</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-6 pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <FileCheck className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {filteredSubmissions.filter(s => s.roundNumber === 2).length}
                  </div>
                  <div className="text-sm text-gray-500">Round 2</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-6 pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 rounded-xl">
                  <Users className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {new Set(filteredSubmissions.map(s => s.submittedBy?._id || s.submittedBy?.id)).size}
                  </div>
                  <div className="text-sm text-gray-500">Unique Submitters</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submissions List */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              Submissions ({filteredSubmissionsCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-8">
                <FileCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No submissions found for the selected filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted By</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Round</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Problem Statement</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredSubmissions.map((submission, idx) => (
                      <tr key={submission._id || submission.id || idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-medium">
                              {submission.projectTitle?.charAt(0).toUpperCase() || 'S'}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {submission.projectTitle || 'Untitled Project'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {submission.teamName || 'Individual'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {submission.submittedByName || submission.submittedBy?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {submission.submittedBy?.email || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            submission.roundNumber === 1
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {submission.roundLabel || `Round ${submission.roundNumber}`}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {submission.problemStatement ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {getProblemStatementText(submission.problemStatement).length > 30
                                ? getProblemStatementText(submission.problemStatement).substring(0, 30) + "..."
                                : getProblemStatementText(submission.problemStatement)}
                            </span>
                          ) : (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            submission.status === 'submitted'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {submission.status === 'submitted' ? 'Submitted' : 'Draft'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSubmissionId(submission._id || submission.id)} // Set ID to open modal
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Submission Details Modal - Refactored and enhanced */}
      <Dialog open={!!selectedSubmissionId} onOpenChange={() => setSelectedSubmissionId(null)}>
        {/* Adjusted DialogContent width and height for better visibility */}
        <DialogContent className="max-w-[98vw] max-h-[98vh] w-[98vw] h-[98vh] overflow-y-auto p-8">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Submission Details
            </DialogTitle>
            <DialogDescription>
              Complete view of submission, assigned judges, and evaluations.
            </DialogDescription>
          </DialogHeader>

          {loadingSubmissionDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading submission details...</span>
            </div>
          ) : submissionDetails ? (
            <div className="bg-gradient-to-b from-slate-50 via-purple-50 to-slate-100 min-h-full">
              {/* Project Summary Section */}
              <div className="px-6 pt-8">
                <div className="max-w-7xl mx-auto">
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-6 rounded-2xl bg-white/70 backdrop-blur-sm border-0 shadow-lg shadow-indigo-100/50 p-6">
                    {/* Project Logo */}
                    <div className="w-28 h-28 flex items-center justify-center rounded-2xl">
                      <img
                        src={submissionDetails.projectId?.logo?.url || submissionDetails.logo?.url || submissionDetails.projectId?.images?.[0]?.url || "/assets/default-banner.png"}
                        alt="Project Logo"
                        className="rounded-xl object-cover w-24 h-24"
                      />
                    </div>

                    {/* Project Info */}
                    <div className="flex-1 w-full">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <h1 className="text-4xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                          {submissionDetails.projectTitle || submissionDetails.title || submissionDetails.projectId?.title || 'Untitled Project'}
                        </h1>
                        {submissionDetails.projectId?.category && (
                          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            {submissionDetails.projectId.category}
                          </div>
                        )}
                      </div>

                      {submissionDetails.projectId?.description && (
                        <p className="text-gray-700 italic text-md mb-2 mt-1 max-w-2xl">
                          {submissionDetails.projectId.description}
                        </p>
                      )}

                      {/* Horizontal line below title/intro */}
                      <div className="border-t border-gray-200 my-4 w-full" />

                      {/* Project meta info */}
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-blue-500" />
                          {submissionDetails.teamName || submissionDetails.team?.name || 'Unknown Team'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-green-500" />
                          {formatDate(submissionDetails.createdAt || submissionDetails.submittedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Award className="w-4 h-4 text-yellow-500" />
                          {submissionDetails.assignedJudges?.length || 0} Judges Assigned
                        </span>
                        {submissionDetails.evaluations?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            {submissionDetails.evaluations.length} Evaluations
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="px-6 py-8">
                <div className="max-w-7xl mx-auto space-y-8">
                  {/* Project Information Grid */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Project Description */}
                    {(submissionDetails.projectId?.description || submissionDetails.description) && (
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-blue-600" />
                          Project Description
                        </h4>
                        <div className="prose prose-sm max-w-none">
                          <div dangerouslySetInnerHTML={{ __html: submissionDetails.projectId?.description || submissionDetails.description }} />
                        </div>
                      </div>
                    )}

                    {/* Problem Statement */}
                    {(submissionDetails.projectId?.problemStatement || submissionDetails.problemStatement) && (
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Code className="w-5 h-5 text-green-600" />
                          Problem Statement
                        </h4>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-gray-700 whitespace-pre-line">{submissionDetails.projectId?.problemStatement || submissionDetails.problemStatement}</p>
                        </div>
                      </div>
                    )}

                    {/* Tech Stack */}
                    {(submissionDetails.projectId?.techStack || submissionDetails.techStack) && (
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Tag className="w-5 h-5 text-indigo-600" />
                          Tech Stack
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {(submissionDetails.projectId?.techStack || submissionDetails.techStack || []).map((tech, index) => (
                            <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Project Links */}
                    {(submissionDetails.projectId?.githubUrl || submissionDetails.projectId?.websiteUrl || submissionDetails.projectId?.demoUrl || submissionDetails.githubUrl || submissionDetails.websiteUrl || submissionDetails.demoUrl) && (
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Link className="w-5 h-5 text-purple-600" />
                          Project Links
                        </h4>
                        <div className="space-y-3">
                          {(submissionDetails.projectId?.githubUrl || submissionDetails.githubUrl) && (
                            <a
                              href={submissionDetails.projectId?.githubUrl || submissionDetails.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <Github className="w-5 h-5 text-gray-600" />
                              <span className="text-gray-700">GitHub Repository</span>
                              <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
                            </a>
                          )}
                          {(submissionDetails.projectId?.websiteUrl || submissionDetails.websiteUrl) && (
                            <a
                              href={submissionDetails.projectId?.websiteUrl || submissionDetails.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <Globe className="w-5 h-5 text-gray-600" />
                              <span className="text-gray-700">Live Website</span>
                              <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
                            </a>
                          )}
                          {(submissionDetails.projectId?.demoUrl || submissionDetails.demoUrl) && (
                            <a
                              href={submissionDetails.projectId?.demoUrl || submissionDetails.demoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <Video className="w-5 h-5 text-gray-600" />
                              <span className="text-gray-700">Demo Video</span>
                              <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Project Category */}
                    {(submissionDetails.projectId?.category || submissionDetails.category) && (
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Tag className="w-5 h-5 text-orange-600" />
                          Project Category
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                            {submissionDetails.projectId?.category || submissionDetails.category}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Project Status */}
                    {(submissionDetails.projectId?.status || submissionDetails.status) && (
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Star className="w-5 h-5 text-yellow-600" />
                          Project Status
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                            {submissionDetails.projectId?.status || submissionDetails.status}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Additional Project Information */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Project Images */}
                    {(submissionDetails.projectId?.images && submissionDetails.projectId.images.length > 0) && (
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Eye className="w-5 h-5 text-blue-600" />
                          Project Images
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                          {submissionDetails.projectId.images.map((image, index) => (
                            <img
                              key={index}
                              src={image.url}
                              alt={`Project image ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border border-gray-200"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Project Attachments */}
                    {(submissionDetails.projectId?.attachments && submissionDetails.projectId.attachments.length > 0) && (
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Download className="w-5 h-5 text-green-600" />
                          Project Attachments
                        </h4>
                        <div className="space-y-2">
                          {submissionDetails.projectId.attachments.map((file, index) => (
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
                      </div>
                    )}

                    {/* Project Files */}
                    {(submissionDetails.projectId?.files && submissionDetails.projectId.files.length > 0) && (
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-purple-600" />
                          Project Files
                        </h4>
                        <div className="space-y-2">
                          {submissionDetails.projectId.files.map((file, index) => (
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
                      </div>
                    )}

                    {/* Project Documents */}
                    {(submissionDetails.projectId?.documents && submissionDetails.projectId.documents.length > 0) && (
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-indigo-600" />
                          Project Documents
                        </h4>
                        <div className="space-y-2">
                          {submissionDetails.projectId.documents.map((doc, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-gray-600" />
                                <div>
                                  <div className="font-medium text-gray-900">{doc.name}</div>
                                  <div className="text-sm text-gray-500">{doc.type}</div>
                                </div>
                              </div>
                              <a
                                href={doc.url}
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
                      </div>
                    )}
                  </div>

                  {/* Team Information */}
                  {(submissionDetails.projectId?.team || submissionDetails.team || submissionDetails.teamMembers) && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-green-600" />
                        Team Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {(submissionDetails.projectId?.team || submissionDetails.team || submissionDetails.teamMembers || []).map((member, index) => (
                          <div key={member._id || member.id || index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={member.avatarUrl || member.profileImage} alt={member.name} />
                              <AvatarFallback>{member.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-gray-900">{member.name}</div>
                              <div className="text-sm text-gray-500">{member.role || member.position}</div>
                              {member.email && (
                                <div className="text-xs text-gray-400">{member.email}</div>
                              )}
                              {member.phone && (
                                <div className="text-xs text-gray-400">{member.phone}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Project Statistics */}
                  {(submissionDetails.projectId?.views || submissionDetails.projectId?.likes || submissionDetails.views || submissionDetails.likes) && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-600" />
                        Project Statistics
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {(submissionDetails.projectId?.views || submissionDetails.views) && (
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{submissionDetails.projectId?.views || submissionDetails.views}</div>
                            <div className="text-sm text-gray-600">Views</div>
                          </div>
                        )}
                        {(submissionDetails.projectId?.likes || submissionDetails.likes) && (
                          <div className="text-center p-4 bg-red-50 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">{submissionDetails.projectId?.likes || submissionDetails.likes}</div>
                            <div className="text-sm text-gray-600">Likes</div>
                          </div>
                        )}
                        {(submissionDetails.projectId?.comments || submissionDetails.comments) && (
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{submissionDetails.projectId?.comments || submissionDetails.comments}</div>
                            <div className="text-sm text-gray-600">Comments</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Original Submission Files Section - This is the PPT/Files section */}
                  <div className="space-y-4">
                    {(() => {
                      const { pptFileUrl, pptFileName } = getPptFileDetails(submissionDetails);

                      if (pptFileUrl) {
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <FileText className="w-5 h-5 text-blue-600" />
                              PPT Presentation
                            </h5>
                            {/* Adjusted flex for better spacing and to prevent overlap */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex items-center gap-3 mb-2 sm:mb-0">
                                <FileText className="w-6 h-6 text-blue-600" />
                                <div>
                                  <div className="font-medium text-gray-900">PPT Presentation</div>
                                  <div className="text-sm text-gray-500 break-all"> {/* Added break-all for long file names */}
                                    {pptFileName}
                                  </div>
                                </div>
                              </div>
                              <a
                                href={pptFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex-shrink-0" // flex-shrink-0 to prevent shrinking
                              >
                                <Eye className="w-4 h-4" />
                                Open in New Tab
                              </a>
                            </div>

                            {/* PPT Preview Section */}
                            <div className="mt-4 bg-white border border-gray-200 rounded-lg p-6">
                              <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600" />
                                PPT Preview
                              </h5>
                              <div className="relative bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <iframe
                                  src={`https://docs.google.com/gview?url=${encodeURIComponent(pptFileUrl)}&embedded=true`}
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
                        );
                      } else if (submissionDetails.projectFiles && submissionDetails.projectFiles.length > 0) {
                        // Display generic project files if no PPT specific file found
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <FileText className="w-5 h-5 text-purple-600" />
                              Project Files
                            </h4>
                            <div className="space-y-2">
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
                          </div>
                        );
                      } else {
                        // Fallback if no specific PPT or general project files are found
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <FileText className="w-5 h-5 text-blue-600" />
                              Submission Files
                            </h5>
                            <div className="text-center py-8 text-gray-500">
                              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                              <p>No PPT or project files uploaded for this submission.</p>
                            </div>
                          </div>
                        );
                      }
                    })()}
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
                                  <div className="text-xs font-medium">
                                    {hasEvaluated ? (
                                      <span className="text-green-600">✅ Evaluated</span>
                                    ) : (
                                      <span className="text-yellow-600">⏳ Pending Evaluation</span>
                                    )}
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
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={evaluation.judge?.avatarUrl} alt={evaluation.judge?.name || evaluation.judge?.email} />
                                  <AvatarFallback>
                                    {(evaluation.judge?.name || evaluation.judge?.email || 'J')[0].toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
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

                  {/* Average Score */}
                  {submissionDetails.evaluations && submissionDetails.evaluations.length > 0 && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                      <div className="text-center">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">Overall Score</h4>
                        <div className="text-4xl font-bold text-green-600">
                          {(() => {
                            if (!submissionDetails.evaluations || submissionDetails.evaluations.length === 0) return '0.0';
                            const totalScore = submissionDetails.evaluations.reduce((sum, evaluation) => {
                              const score = evaluation.totalScore ||
                                (evaluation.scores && Object.values(evaluation.scores).reduce((s, val) => s + (val || 0), 0) / Object.keys(evaluation.scores).length) || 0;
                              return sum + score;
                            }, 0);
                            return (totalScore / submissionDetails.evaluations.length).toFixed(1);
                          })()}/10
                        </div>
                        <div className="text-sm text-gray-500 mt-2">
                          Based on {submissionDetails.evaluations.length} evaluation{submissionDetails.evaluations.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No submission details available. It might be a draft or not fully populated.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}