"use client";
import { useState } from "react";
import { CalendarDays, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../../../components/CommonUI/card";
import {
  uploadPPTFile,
  savePPTSubmission,
  fetchUserPPTSubmissions,
  deletePPTSubmission,
} from "../../../../../../lib/api";
import { API_BASE_URL } from "../../../../../../lib/api";
import { useToast } from "../../../../../../hooks/use-toast";
import { useAuth } from "../../../../../../context/AuthContext";
import { useEffect, useRef } from "react";
import PPTSubmissionModal from "./PPTSubmissionModal";
import ProjectSubmissionModal from "./ProjectSubmissionModal";
import axios from "axios";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../../../../components/DashboardUI/alert-dialog";

export default function HackathonTimeline({
  hackathon,
  sectionRef,
  isRegistered,
  showProjectModal,
  setShowProjectModal,
  autoSelectProjectId,
}) {
  const rounds = Array.isArray(hackathon.rounds) ? hackathon.rounds : [];
  const [refreshKey, setRefreshKey] = useState(0);
  const now = new Date();
  const { toast } = useToast ? useToast() : { toast: () => {} };
  const { user } = useAuth ? useAuth() : { user: null };
  

  const [uploadingIdx, setUploadingIdx] = useState(null);
  const [pptSubmissions, setPptSubmissions] = useState([]);
  const [pptModal, setPptModal] = useState({ open: false, roundIdx: null });
  const pptModalRef = useRef();
  const [projectSubmissions, setProjectSubmissions] = useState([]);
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [projectModal, setProjectModal] = useState({
    open: false,
    roundIdx: null,
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    submission: null,
  });
  
  // Add state for next round eligibility
  const [nextRoundEligibility, setNextRoundEligibility] = useState(null);
  const [loadingEligibility, setLoadingEligibility] = useState(false);
  


  // Fetch user's PPT submissions for this hackathon
  useEffect(() => {
    if (!hackathon._id || !user?._id) return;
    fetchUserPPTSubmissions(hackathon._id, user._id)
      .then(setPptSubmissions)
      .catch(() => setPptSubmissions([]));
  }, [hackathon._id, user?._id, refreshKey]);

  // Fetch user's project submissions for this hackathon
  useEffect(() => {
    
    async function fetchProjectSubmissions() {
      if (!hackathon._id || !user?._id) return;
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${API_BASE_URL}/api/submission-form/submissions?hackathonId=${hackathon._id}&userId=${user._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const updatedSubs = (res.data.submissions || []).filter(
          (s) => s.projectId
        );
        setProjectSubmissions(updatedSubs);
      } catch {
        setProjectSubmissions([]);
      }
    }
    fetchProjectSubmissions();
  }, [hackathon._id, user?._id, refreshKey]);

  // Fetch shortlisting status for the current user
  const fetchShortlistingStatus = async () => {
    if (!hackathon._id || !user?._id) {
      console.log('🔍 fetchShortlistingStatus: Missing hackathon._id or user._id');
      return;
    }
    
    // Check for multi-round hackathons (2 or more rounds)
    const hasMultipleRounds = hackathon.rounds && hackathon.rounds.length >= 2;
    console.log('🔍 fetchShortlistingStatus: hasMultipleRounds =', hasMultipleRounds, 'rounds =', hackathon.rounds?.length);
    if (!hasMultipleRounds) {
      console.log('🔍 fetchShortlistingStatus: Not a multi-round hackathon, skipping');
      return;
    }
    
    setLoadingEligibility(true);
    try {
      const token = localStorage.getItem("token");
      console.log('🔍 fetchShortlistingStatus: Fetching eligibility for Round 1');
      
      // Use the existing eligibility endpoint for Round 1
      const response = await fetch(`/api/judge-management/hackathons/${hackathon._id}/rounds/1/eligibility`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 fetchShortlistingStatus: Eligibility data =', data);
        
        // Create a compatible data structure
        const eligibilityData = {
          shortlistingStatus: {
            round1ToRound2: {
              isShortlisted: data.shortlisted || false,
              roundStarted: data.roundStarted || false,
              message: data.message || ''
            }
          },
          hasShortlistedSubmissions: data.shortlisted || false,
          shortlistedSubmissions: data.shortlistedSubmissions || [],
          totalSubmissions: data.totalSubmissions || 0
        };
        
        setNextRoundEligibility(eligibilityData);
      } else {
        console.error('🔍 fetchShortlistingStatus: Failed to fetch eligibility');
        setNextRoundEligibility(null);
      }
    } catch (error) {
      console.error("Error fetching shortlisting status:", error);
      setNextRoundEligibility(null);
    } finally {
      setLoadingEligibility(false);
    }
  };

  // Fetch shortlisting status
  useEffect(() => {
    fetchShortlistingStatus();
  }, [hackathon._id, user?._id, isRegistered, refreshKey]);

  // Helper function to check if deadline has passed
  const hasDeadlinePassed = (endDate) => {
    if (!endDate) return false;
    return now > new Date(endDate);
  };

  // Helper function to format deadline message
  const formatDeadlineMessage = (endDate) => {
    if (!endDate) return "";
    const deadline = new Date(endDate);
    return deadline.toLocaleString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata"
    });
  };

  // Helper function to check if user has submitted in previous round
  const hasSubmittedInPreviousRound = (currentRoundIdx) => {
    if (currentRoundIdx === 0) return true; // First round, no previous submission needed
    const previousRoundSubmissions = getProjectSubmissionsForRound(currentRoundIdx - 1);
    return previousRoundSubmissions.length > 0;
  };

  // Helper function to check if user is eligible for next round
  const isEligibleForNextRound = (currentRoundIdx) => {
    console.log('🔍 isEligibleForNextRound:', { currentRoundIdx, roundsLength: hackathon.rounds?.length, nextRoundEligibility });
    
    if (currentRoundIdx === 0) {
      console.log('🔍 isEligibleForNextRound: First round, everyone eligible');
      return true; // First round, everyone is eligible
    }
    
    // For any round that's not the final round, check if user has qualified from previous round
    if (currentRoundIdx < hackathon.rounds.length - 1 && nextRoundEligibility && nextRoundEligibility.shortlistingStatus) {
      // Check specific round transition - use the correct key format
      const roundKey = `round${currentRoundIdx + 1}ToRound${currentRoundIdx + 2}`;
      const roundStatus = nextRoundEligibility.shortlistingStatus[roundKey];
      
      if (roundStatus) {
        const isEligible = roundStatus.isShortlisted || false;
        console.log('🔍 isEligibleForNextRound: Round-specific eligibility =', { roundKey, isEligible, roundStatus });
        return isEligible;
      }
      
      // Fallback: check if user is eligible for any round
      const eligibilityEntries = Object.values(nextRoundEligibility.shortlistingStatus);
      const isEligible = eligibilityEntries.some(entry => entry.isShortlisted);
      console.log('🔍 isEligibleForNextRound: Fallback eligibility =', isEligible);
      return isEligible;
    }
    
    // For 2-round hackathons, check if user is shortlisted for Round 1
    if (hackathon.rounds && hackathon.rounds.length === 2 && currentRoundIdx === 0) {
      if (nextRoundEligibility && nextRoundEligibility.hasShortlistedSubmissions) {
        console.log('🔍 isEligibleForNextRound: User is shortlisted for Round 1');
        return true;
      }
      
      // Fallback: check hackathon round progress data directly
      if (hackathon.roundProgress && hackathon.roundProgress.length > 0) {
        const round0Progress = hackathon.roundProgress.find(rp => rp.roundIndex === 0);
        if (round0Progress && round0Progress.shortlistedTeams) {
          const userTeam = user?.teamId || user?._id;
          const userId = user?._id;
          
          // Check if user is shortlisted individually
          const isIndividuallyShortlisted = round0Progress.shortlistedTeams.includes(userId?.toString());
          
          // Check if user's team is shortlisted
          const isTeamShortlisted = round0Progress.shortlistedTeams.includes(userTeam?.toString());
          
          const isShortlisted = isIndividuallyShortlisted || isTeamShortlisted;
          
          console.log('🔍 isEligibleForNextRound: Direct round progress check =', { 
            userId,
            userTeam, 
            shortlistedTeams: round0Progress.shortlistedTeams, 
            isIndividuallyShortlisted,
            isTeamShortlisted,
            isShortlisted 
          });
          return isShortlisted;
        }
      }
    }
    
    // For Round 1 (currentRoundIdx: 1), check if user was shortlisted from Round 0
    if (hackathon.rounds && hackathon.rounds.length === 2 && currentRoundIdx === 1) {
      console.log('🔍 isEligibleForNextRound: Checking Round 1 eligibility (was shortlisted from Round 0)');
      
      // Check hackathon round progress data directly
      if (hackathon.roundProgress && hackathon.roundProgress.length > 0) {
        const round0Progress = hackathon.roundProgress.find(rp => rp.roundIndex === 0);
        if (round0Progress && round0Progress.shortlistedTeams) {
          const userTeam = user?.teamId || user?._id;
          const userId = user?._id;
          
          // Check if user is shortlisted individually
          const isIndividuallyShortlisted = round0Progress.shortlistedTeams.includes(userId?.toString());
          
          // Check if user's team is shortlisted
          const isTeamShortlisted = round0Progress.shortlistedTeams.includes(userTeam?.toString());
          
          const isShortlisted = isIndividuallyShortlisted || isTeamShortlisted;
          
          console.log('🔍 isEligibleForNextRound: Round 1 eligibility check =', { 
            userId,
            userTeam, 
            shortlistedTeams: round0Progress.shortlistedTeams, 
            isIndividuallyShortlisted,
            isTeamShortlisted,
            isShortlisted 
          });
          return isShortlisted;
        }
      }
    }
    
    console.log('🔍 isEligibleForNextRound: No eligibility data, returning false');
    return false; // For other rounds, implement as needed
  };

  // Helper function to check if user is shortlisted for next round (backward compatibility)
  const isShortlistedForNextRound = (currentRoundIdx) => {
    return isEligibleForNextRound(currentRoundIdx);
  };

  // Helper function to check if user is not selected for next round
  const isNotSelectedForNextRound = (currentRoundIdx) => {
    if (currentRoundIdx === 0) {
      return false; // First round, no selection needed
    }
    // For 2-round hackathons, Round 1 (index 1) is the final round, so no selection needed
    if (hackathon.rounds && hackathon.rounds.length === 2 && currentRoundIdx === 1) {
      return false; // Final round, no selection needed
    }
    // For any round that's not the final round, check if user has shortlisted submissions
    if (currentRoundIdx < hackathon.rounds.length - 1 && nextRoundEligibility && nextRoundEligibility.shortlistingStatus) {
      // Check specific round transition
      const roundKey = `round${currentRoundIdx + 1}ToRound${currentRoundIdx + 2}`;
      const roundStatus = nextRoundEligibility.shortlistingStatus[roundKey];
      
      if (roundStatus) {
        const isShortlisted = roundStatus.isShortlisted || false;
        // Only show "not selected" if user is explicitly not shortlisted
        return isShortlisted === false;
      }
      
      // Fallback: check if user is shortlisted for any round
      const shortlistingEntries = Object.values(nextRoundEligibility.shortlistingStatus);
      const isShortlisted = shortlistingEntries.some(entry => entry.isShortlisted);
      return isShortlisted === false;
    }
    return false;
  };

  const handlePPTUpload = async (e, roundIdx) => {
    const file = e.target.files[0];
    if (!file) return;
    if (
      file.type !==
        "application/vnd.openxmlformats-officedocument.presentationml.presentation" &&
      !file.name.endsWith(".pptx")
    ) {
      toast({
        title: "Invalid file",
        description: "Please upload a .pptx file",
        variant: "destructive",
      });
      return;
    }
    setUploadingIdx(roundIdx);
    try {
      const result = await uploadPPTFile(file);
      await savePPTSubmission({
        hackathonId: hackathon._id,
        roundIndex: roundIdx, // Use the actual round index
        pptFile: result.url,
      });
      toast({
        title: "PPT Uploaded!",
        description: "Your PPT has been uploaded successfully.",
        variant: "success",
      });
      const updated = await fetchUserPPTSubmissions(hackathon._id, user._id);
      setPptSubmissions(updated);
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err.message || "Could not upload PPT",
        variant: "destructive",
      });
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleDeletePPT = async (roundIdx) => {
    if (
      !window.confirm(
        "Are you sure you want to delete your PPT submission for this round?"
      )
    )
      return;
    try {
      await deletePPTSubmission({
        hackathonId: hackathon._id,
        roundIndex: roundIdx, // Use the actual round index
      });
      toast({
        title: "PPT Deleted",
        description: "Your PPT submission has been deleted.",
        variant: "success",
      });
      if (hackathon._id && user?._id) {
        const updated = await fetchUserPPTSubmissions(hackathon._id, user._id);
        setPptSubmissions(updated);
      }
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err.message || "Could not delete PPT",
        variant: "destructive",
      });
    }
  };

  const handleAfterAction = () => {
    console.log('🔄 handleAfterAction called - refreshing data...');
    setRefreshKey((k) => k + 1);
    // Also directly fetch updated data after a short delay to ensure backend has processed
    setTimeout(() => {
      if (hackathon._id && user?._id) {
        const token = localStorage.getItem("token");
        axios.get(
          `${API_BASE_URL}/api/submission-form/submissions?hackathonId=${hackathon._id}&userId=${user._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        .then(res => {
          const updatedSubs = (res.data.submissions || []).filter(
            (s) => s.projectId
          );
          console.log('📊 Updated project submissions:', updatedSubs);
          setProjectSubmissions(updatedSubs);
        })
        .catch(() => {
          // Silently fail, the useEffect will handle it
        });
      }
    }, 500); // Small delay to ensure backend has processed
  };

  const handleDeleteProjectSubmission = (submission) => {
    setDeleteDialog({ open: true, submission });
  };

  const confirmDeleteProjectSubmission = async () => {
    const submission = deleteDialog.submission;
    setDeleteDialog({ open: false, submission: null });
    if (!submission) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${API_BASE_URL}/api/submission-form/submission/${submission._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast({
        title: "Project Deleted",
        description:
          "Your project submission has been deleted. You can now resubmit until the round ends.",
        variant: "success",
      });
      if (hackathon._id && user?._id) {
        const res = await axios.get(
          `${API_BASE_URL}/api/submission-form/submissions?hackathonId=${hackathon._id}&userId=${user._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const updatedSubs = (res.data.submissions || []).filter(
          (s) => s.projectId
        );
        setProjectSubmissions(updatedSubs);
      }
      handleAfterAction();
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.message ||
        "Could not delete project submission";
      toast({
        title: "Delete failed",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const getSubmissionForRound = (roundIdx) => {
    // PPT submissions should only appear in Round 1 (idx 0)
    if (roundIdx === 0) {
      const found = pptSubmissions.find(
        (s) => String(s.roundIndex) === String(roundIdx)
      );
      return found;
    }
    // For Round 2 and beyond, no PPT submissions should be shown
    return null;
  };

  const getPPTDownloadLink = (
    pptFile,
    originalName,
    fallbackName = "presentation"
  ) => {
    if (!pptFile) return "#";
    let url = pptFile.replace("/raw/raw/", "/raw/");
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+)$/);
    let publicId = matches ? matches[1] : "";
    publicId = publicId.replace(/\.pptx$/, "");
    let baseName = fallbackName;
    if (originalName) {
      baseName = originalName.replace(/\.[^/.]+$/, "");
    } else if (publicId) {
      baseName = publicId.split("/").pop() || fallbackName;
    }
    const baseUrl = url.split("/upload/")[0];
    return `${baseUrl}/raw/upload/fl_attachment:${baseName}.pptx/${publicId}.pptx`;
  };

  const getProjectSubmissionsForRound = (roundIdx) => {
    const submissions = projectSubmissions.filter(
      (s) => {
        // Dynamic filtering based on round configuration
        if (hackathon?.rounds && hackathon.rounds[roundIdx]) {
          const roundType = hackathon.rounds[roundIdx].type || 'project';
          
          if (roundType === 'ppt') {
            // PPT round: Show only submissions with PPT files
            return String(s.roundIndex) === String(roundIdx) && s.pptFile;
          } else if (roundType === 'project') {
            // Project round: Show only submissions with project IDs
            return String(s.roundIndex) === String(roundIdx) && s.projectId && !s.pptFile;
          } else if (roundType === 'both') {
            // Both round: Show all submissions for this round
            return String(s.roundIndex) === String(roundIdx);
          } else {
            // Default: Show all submissions for this round
            return String(s.roundIndex) === String(roundIdx);
          }
        }
        
        // Fallback: Use roundIndex matching
        return String(s.roundIndex) === String(roundIdx);
      }
    );
    console.log(`🔍 getProjectSubmissionsForRound(${roundIdx}): ${submissions.length} submissions`, submissions);
    return submissions;
  };

  const canEdit = (end) => {
    return !end || now <= end;
  };

  const handleProjectModalOpenChange = (open) => {
    setProjectModal((prev) => ({ ...prev, open }));
    if (!open) setEditingSubmission(null);
    if (!open && typeof setShowProjectModal === "function")
      setShowProjectModal(false);
    if (!open) handleAfterAction();
  };

  const handleSubmitAnother = (roundIdx) => {
    setEditingSubmission(null);
    setProjectModal({ open: true, roundIdx });
  };

  const handleOpenNewSubmission = (roundIdx) => {
    setEditingSubmission(null);
    setProjectModal({ open: true, roundIdx });
  };

  return (
    <section ref={sectionRef} className="space-y-6 max-w-5xl mx-auto">
      <Card className="shadow-none hover:shadow-none">
        <CardHeader className="border-b border-gray-100 bg-gray-50/50">
          <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="w-1 h-8 bg-indigo-500 rounded-full"></div>
            Stages and Timelines
          </CardTitle>
        </CardHeader>

        <CardContent className="p-8 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3 my-4">
              <h3 className="text-xl font-semibold text-gray-900">Competition Rounds</h3>
            </div>
            
            {rounds.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <CalendarDays className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-2xl font-bold text-gray-800 mb-3">No Rounds Defined</h4>
                <p className="text-gray-700 leading-relaxed text-lg">
                  No rounds have been defined for this hackathon yet.
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {(() => {
                  const submissionType = hackathon.submissionType || "single-project";
                  const roundType = hackathon.roundType || "single-round";
                  let filteredRounds = rounds;
                  if (
                    submissionType === "multi-project" &&
                    roundType === "single-round"
                  ) {
                    const firstProjectIdx = rounds.findIndex(
                      (r) => r.type && r.type.toLowerCase().includes("project")
                    );
                    filteredRounds =
                      firstProjectIdx !== -1 ? [rounds[firstProjectIdx]] : [];
                  }
                  return filteredRounds.map((round, idx) => {
                    const start = round.startDate ? new Date(round.startDate) : null;
                    const end = round.endDate ? new Date(round.endDate) : null;
                    const isLive = start && end && now >= start && now <= end;
                    const isSubmission =
                      round.type && (round.type.toLowerCase().includes("ppt") || round.type.toLowerCase() === "both");
                    const isProjectSubmission =
                      round.type && (round.type.toLowerCase().includes("project") || round.type.toLowerCase() === "both");
                    const isBothSubmission = round.type && round.type.toLowerCase() === "both";
                    
                    console.log(`🔍 Round ${idx} Debug:`, {
                      roundType: round.type,
                      isProjectSubmission,
                      isSubmission,
                      isBothSubmission,
                      isLive,
                      canEdit: canEdit(end)
                    });
                    
                    const dayNum = start ? start.getDate() : idx + 24;
                    const monthStr = start
                      ? start.toLocaleString("en-US", { month: "short" })
                      : "Jul";

                    const startTime = start
                      ? start.toLocaleString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                          timeZone: "Asia/Kolkata"
                        })
                      : "11:48 PM";
                    
                    const endTime = end
                      ? end.toLocaleString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                          timeZone: "Asia/Kolkata"
                        })
                      : "11:46 PM";

                    let projectSubmissionsForRound = getProjectSubmissionsForRound(idx);
                    const maxProjects = hackathon.maxSubmissionsPerParticipant || 1;
                    const submission = getSubmissionForRound(idx);
                    const roundType2 = hackathon.roundType || "single-round";
                    
                    // Debug for Round 2 specifically
                    if (idx === 1) {
                      console.log(`🔍 ROUND 2 DEBUG:`, {
                        roundIndex: idx,
                        projectSubmissionsForRound: projectSubmissionsForRound,
                        submissionType: hackathon.submissionType,
                        roundType2,
                        isProjectSubmission,
                        isLive,
                        canEdit: canEdit(end),
                        submissionCount: projectSubmissionsForRound.length
                      });
                    }
                    const isFirstProjectRound =
                      rounds
                        .filter(
                          (r) => r.type && r.type.toLowerCase().includes("project")
                        )
                        .findIndex((r) => r === round) === 0;

                    let projectSubmissionUI = null;
                    let pptSubmissionUI = null;
                    
                    // Check if this is a final round and user needs to be shortlisted (only for multi-round hackathons)
                    const isFinalRound = idx === hackathon.rounds.length - 1;
                    const needsShortlisting = isFinalRound && isProjectSubmission && hackathon.rounds.length > 1;
                    
                    // Check if user submitted in Round 1 (for eligibility message)
                    const round1Submissions = getProjectSubmissionsForRound(0);
                    const hasSubmittedRound1 = round1Submissions.length > 0;
                    
                    // Check deadline conditions
                    const deadlinePassed = hasDeadlinePassed(end);
                    const hasSubmittedInPrevious = hasSubmittedInPreviousRound(idx);
                    const isEligible = isEligibleForNextRound(idx);
                    const isShortlisted = isShortlistedForNextRound(idx); // Backward compatibility
                    const isNotSelected = isNotSelectedForNextRound(idx);
                    
                    // Debug logging
                    // Enhanced debug logging
                    console.log(`🔍 Round ${idx} Enhanced Debug:`, {
                      isFinalRound: idx === hackathon.rounds.length - 1,
                      isProjectSubmission,
                      isShortlisted,
                      isNotSelected,
                      nextRoundEligibility: nextRoundEligibility ? {
                        hasShortlistedSubmissions: nextRoundEligibility.hasShortlistedSubmissions,
                        shortlistedSubmissions: nextRoundEligibility.shortlistedSubmissions?.length || 0,
                        totalSubmissions: nextRoundEligibility.totalSubmissions || 0
                      } : null,
                      condition1: isShortlisted && isProjectSubmission && projectSubmissionsForRound.length === 0,
                      condition2: isNotSelected && isProjectSubmission && hackathon.rounds.length > 1
                    });
                    
                                        // Show loading state for next round eligibility check
                    if (!isFinalRound && isProjectSubmission && loadingEligibility) {
                      console.log(`🔍 Round ${idx} - Showing loading state`);
                      projectSubmissionUI = (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-spin">
                              <div className="w-3 h-3 bg-white rounded-full"></div>
                            </div>
                            <h3 className="font-semibold text-blue-800">Checking Shortlisting Status</h3>
                          </div>
                          <p className="text-sm text-blue-700">
                            Please wait while we check your Round 2 eligibility...
                          </p>
                        </div>
                      );
                    }
                    // Show loading state when checking eligibility
                    else if (!isFinalRound && isProjectSubmission && loadingEligibility) {
                      projectSubmissionUI = (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-spin">
                              <div className="w-3 h-3 bg-white rounded-full"></div>
                            </div>
                            <h3 className="font-semibold text-blue-800">Checking Shortlisting Status</h3>
                          </div>
                          <p className="text-sm text-blue-700">
                            Please wait while we check your next round eligibility...
                          </p>
                        </div>
                      );
                    }
                    

                    
                    // Condition 1: Missed Deadline (No Submission)
                    if (deadlinePassed && !projectSubmissionsForRound.length && !submission) {
                      const deadlineMessage = formatDeadlineMessage(end);
                      projectSubmissionUI = (
                        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 font-medium">
                          The hackathon submission window is closed. The deadline was {deadlineMessage}.
                        </div>
                      );
                      if (isSubmission) {
                        pptSubmissionUI = (
                          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 font-medium">
                            The hackathon submission window is closed. The deadline was {deadlineMessage}.
                          </div>
                        );
                      }
                    }
                    // Condition 2: Show shortlisted message and submit button for shortlisted teams
                    else if (!isFinalRound && isShortlisted && isProjectSubmission) {
                      console.log(`🔍 Round ${idx} - Showing shortlisted message and submit button`, {
                        isFinalRound,
                        isShortlisted,
                        isProjectSubmission,
                        roundsLength: hackathon.rounds.length,
                        nextRoundEligibility: nextRoundEligibility ? 'exists' : 'null',
                        projectSubmissionsForRound: projectSubmissionsForRound.length,
                        hasShortlistedSubmissions: nextRoundEligibility?.hasShortlistedSubmissions
                      });
                      
                      // Check if user has already submitted for this round
                      const hasSubmitted = projectSubmissionsForRound.length > 0;
                      
                      if (isLive && canEdit(end)) {
                        projectSubmissionUI = (
                          <div className="space-y-3">
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-sm">✓</span>
                                </div>
                                <h3 className="font-semibold text-green-800">🎉 Congratulations! You're Shortlisted for Round {idx + 2}</h3>
                              </div>
                              <p className="text-sm text-green-700 mb-3">
                                Your Round {idx + 1} submission has been shortlisted. You can now submit a new project for Round {idx + 2}.
                              </p>
                              {!hasSubmitted ? (
                                <button
                                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-60 disabled:cursor-not-allowed font-medium"
                                  onClick={() =>
                                    isRegistered && handleOpenNewSubmission(idx)
                                  }
                                  disabled={!isRegistered}
                                  title={
                                    isRegistered
                                      ? `Submit your project for Round ${idx + 2}`
                                      : "Register for the hackathon to submit"
                                  }
                                >
                                  Submit Project for Round {idx + 2}
                                </button>
                              ) : (
                                <div className="flex gap-2 items-center">
                                  <div className="px-4 py-2 bg-green-600 text-white rounded text-center cursor-default select-none opacity-80">
                                    Project Submitted
                                  </div>
                                  <button
                                    className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm"
                                    onClick={() =>
                                      handleDeleteProjectSubmission(
                                        projectSubmissionsForRound[0]
                                      )
                                    }
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      } else if (!isLive) {
                        projectSubmissionUI = (
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm">✓</span>
                              </div>
                              <h3 className="font-semibold text-green-800">🎉 Congratulations! You're Shortlisted for Round {idx + 2}</h3>
                            </div>
                            <p className="text-sm text-green-700">
                              Your Round {idx + 1} submission has been shortlisted. You can submit your project when Round {idx + 2} starts.
                            </p>
                            {nextRoundEligibility && nextRoundEligibility.roundStartDate && (
                              <p className="text-xs text-green-600 mt-2">
                                Round {idx + 2} starts: {new Date(nextRoundEligibility.roundStartDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        );
                      } else {
                        projectSubmissionUI = (
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm">✓</span>
                              </div>
                              <h3 className="font-semibold text-green-800">🎉 Congratulations! You're Shortlisted for Round {idx + 2}</h3>
                            </div>
                            <p className="text-sm text-green-700">
                              Your Round {idx + 1} submission has been shortlisted. Round {idx + 2} has ended.
                            </p>
                          </div>
                        );
                      }
                    }
                    // Fallback: Show pending message when shortlisting status is not determined yet
                    else if (!isFinalRound && isProjectSubmission && !nextRoundEligibility && !loadingEligibility && hackathon.rounds.length > 1) {
                      console.log(`🔍 Round ${idx} - Showing pending message`, {
                        isFinalRound,
                        isProjectSubmission,
                        nextRoundEligibility: nextRoundEligibility ? 'exists' : 'null',
                        loadingEligibility,
                        roundsLength: hackathon.rounds.length
                      });
                      projectSubmissionUI = (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm">⏳</span>
                            </div>
                            <h3 className="font-semibold text-yellow-800">Shortlisting Status Pending</h3>
                          </div>
                          <p className="text-sm text-yellow-700 mb-3">
                            Round {idx + 1} evaluations are in progress. Your shortlisting status will be determined soon.
                          </p>
                          <button 
                            className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition"
                            onClick={() => {
                              fetchShortlistingStatus();
                            }}
                          >
                            Check Status
                          </button>
                        </div>
                      );
                    }
                    // Condition 3: Show "not shortlisted" message for non-shortlisted teams
                    else if (!isFinalRound && !isShortlisted && isProjectSubmission && hackathon.rounds.length > 1 && nextRoundEligibility) {
                      console.log(`🔍 Round ${idx} - Showing not shortlisted message`, {
                        isFinalRound,
                        isShortlisted,
                        isProjectSubmission,
                        nextRoundEligibility: nextRoundEligibility ? 'exists' : 'null',
                        roundsLength: hackathon.rounds.length,
                        hasShortlistedSubmissions: nextRoundEligibility?.hasShortlistedSubmissions
                      });
                      projectSubmissionUI = (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm">✗</span>
                            </div>
                            <h3 className="font-semibold text-red-800">Not Shortlisted for Round {idx + 2}</h3>
                          </div>
                          <p className="text-sm text-red-700">
                            Your Round {idx + 1} submission was not shortlisted for Round {idx + 2}. Thank you for participating in this round.
                          </p>
                        </div>
                      );
                    }
                    // Normal submission logic for active rounds
                    else if (isLive && canEdit(end)) {
                      console.log(`🔍 Round ${idx} - isLive && canEdit(end): true`);
                      // Project submission logic
                      if (isProjectSubmission) {
                        console.log(`🔍 Round ${idx} - isProjectSubmission: true`);
                        if (
                          submissionType === "single-project" &&
                          roundType2 === "single-round"
                        ) {
                          console.log(`🔍 Timeline Round ${idx}: projectSubmissionsForRound.length = ${projectSubmissionsForRound.length}`, projectSubmissionsForRound);
                          projectSubmissionUI =
                            projectSubmissionsForRound.length > 0 ? (
                              <div className="flex gap-2 items-center">
                                <div className="px-4 py-2 bg-green-600 text-white rounded text-center cursor-default select-none opacity-80">
                                  Project Submitted
                                </div>
                                <button
                                  className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm"
                                  onClick={() =>
                                    handleDeleteProjectSubmission(
                                      projectSubmissionsForRound[0]
                                    )
                                  }
                                >
                                  Delete
                                </button>
                              </div>
                            ) : (
                              // Only show submit button to eligible teams for non-final rounds
                              (!isFinalRound && isEligible) || (isFinalRound && isEligible) ? (
                                <button
                                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                                  onClick={() =>
                                    isRegistered && handleOpenNewSubmission(idx)
                                  }
                                  disabled={!isRegistered}
                                  title={
                                    isRegistered
                                      ? "Submit your project"
                                      : "Register for the hackathon to submit"
                                  }
                                >
                                  Submit Project
                                </button>
                              ) : null
                            );
                        } else if (
                          submissionType === "single-project" &&
                          roundType2 === "multi-round"
                        ) {
                          console.log(`🔍 Timeline Round ${idx} (multi-round): projectSubmissionsForRound.length = ${projectSubmissionsForRound.length}`, projectSubmissionsForRound);
                          console.log(`🔍 Round ${idx} - Condition: single-project && multi-round`);
                          projectSubmissionUI =
                            projectSubmissionsForRound.length > 0 ? (
                              <div className="flex gap-2 items-center">
                                <div className="px-4 py-2 bg-green-600 text-white rounded text-center cursor-default select-none opacity-80">
                                  Project Submitted
                                </div>
                                {canEdit(end) && (
                                  <button
                                    className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm"
                                    onClick={() =>
                                      handleDeleteProjectSubmission(
                                        projectSubmissionsForRound[0]
                                      )
                                    }
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            ) : (
                              // Only show submit button to eligible teams for non-final rounds
                              (!isFinalRound && isEligible) || (isFinalRound && isEligible) ? (
                                <button
                                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                                  onClick={() =>
                                    isRegistered && handleOpenNewSubmission(idx)
                                  }
                                  disabled={!isRegistered}
                                  title={
                                    isRegistered
                                      ? "Submit your project"
                                      : "Register for the hackathon to submit"
                                  }
                                >
                                  Submit Project
                                </button>
                              ) : null
                            );
                        } else if (
                          submissionType === "multi-project" &&
                          roundType2 === "single-round"
                        ) {
                          const submittedCount = projectSubmissionsForRound.length;
                          const maxAllowed = hackathon.maxSubmissionsPerParticipant || 1;
                          const canSubmitMore = submittedCount < maxAllowed;
                          
                          projectSubmissionUI = (
                            <div className="flex flex-col gap-2">
                              {submittedCount > 0 && (
                                <div className="text-sm text-gray-600">
                                  Submitted: {submittedCount}/{maxAllowed} projects
                                </div>
                              )}
                              <div className="flex gap-2 items-center">
                                {canSubmitMore ? (
                                  // Only show submit button to shortlisted teams for non-final rounds
                                  (!isFinalRound && isShortlisted) || (isFinalRound && isShortlisted) ? (
                                    <button
                                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                                      onClick={() =>
                                        isRegistered && handleOpenNewSubmission(idx)
                                      }
                                      disabled={!isRegistered}
                                      title={
                                        isRegistered
                                          ? "Submit another project"
                                          : "Register for the hackathon to submit"
                                      }
                                    >
                                      Submit Project
                                    </button>
                                  ) : null
                                ) : (
                                  <div className="px-4 py-2 bg-gray-400 text-white rounded text-center cursor-default select-none opacity-80">
                                    Max Submissions Reached
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        } else if (
                          submissionType === "multi-project" &&
                          roundType2 === "multi-round"
                        ) {
                          const submittedCount = projectSubmissionsForRound.length;
                          const maxAllowed = hackathon.maxSubmissionsPerParticipant || 1;
                          const canSubmitMore = submittedCount < maxAllowed;
                          
                          projectSubmissionUI = (
                            <div className="flex flex-col gap-2">
                              {submittedCount > 0 && (
                                <div className="text-sm text-gray-600">
                                  Submitted: {submittedCount}/{maxAllowed} projects
                                </div>
                              )}
                              <div className="flex gap-2 items-center">
                                {canSubmitMore ? (
                                  // Only show submit button to eligible teams for non-final rounds
                                  (!isFinalRound && isEligible) || (isFinalRound && isEligible) ? (
                                    <button
                                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                                      onClick={() =>
                                        isRegistered && handleOpenNewSubmission(idx)
                                      }
                                      disabled={!isRegistered}
                                      title={
                                        isRegistered
                                          ? "Submit another project"
                                          : "Register for the hackathon to submit"
                                      }
                                    >
                                      Submit Project
                                    </button>
                                  ) : null
                                ) : (
                                  <div className="px-4 py-2 bg-gray-400 text-white rounded text-center cursor-default select-none opacity-80">
                                    Max Submissions Reached
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                      }
                      
                      // PPT submission logic
                      if (isSubmission) {
                        if (submission) {
                          pptSubmissionUI = (
                            <div className="flex gap-2 items-center">
                              {submission.originalName ? (
                                <div className="px-4 py-2 bg-green-600 text-white rounded text-center cursor-default select-none opacity-80">
                                  {submission.originalName}
                                </div>
                              ) : (
                                <div className="px-4 py-2 bg-green-600 text-white rounded text-center cursor-default select-none opacity-80">
                                  PPT Submitted
                                </div>
                              )}
                              <button
                                className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm"
                                onClick={() => handleDeletePPT(idx)}
                              >
                                Delete
                              </button>
                            </div>
                          );
                        } else {
                          pptSubmissionUI = (
                            <button
                              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                              onClick={() =>
                                isRegistered &&
                                setPptModal({ open: true, roundIdx: idx })
                              }
                              disabled={
                                uploadingIdx === idx || !isRegistered
                              }
                              title={
                                isRegistered
                                  ? "Submit your PPT"
                                  : "Register for the hackathon to submit"
                              }
                            >
                              Submit PPT
                            </button>
                          );
                        }
                      }
                    }
                    // Round has ended but no deadline passed message
                    else if (!isLive && !deadlinePassed) {
                      if (isProjectSubmission) {
                        projectSubmissionUI = (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 font-medium">
                            This round has not started yet. You can submit when the round begins.
                          </div>
                        );
                      }
                      if (isSubmission) {
                        pptSubmissionUI = (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 font-medium">
                            This round has not started yet. You can submit when the round begins.
                          </div>
                        );
                      }
                    }

                    return (
                      <div key={idx} className="flex items-start relative">
                        <div className="flex flex-col items-center mr-6">
                          <div className="w-12 h-12 bg-indigo-600 rounded-full flex flex-col items-center justify-center text-white font-bold relative z-10 border-2 border-white shadow-md">
                            <span className="text-lg leading-none">{dayNum}</span>
                          </div>
                          
                          <div className="text-xs text-indigo-600 font-medium mt-1 mb-2">
                            {monthStr.toUpperCase()}
                          </div>

                          {idx < filteredRounds.length - 1 && (
                            <div className="w-0.5 h-20 bg-indigo-200 mt-2"></div>
                          )}
                        </div>

                        <div className="flex-1 pb-8">
                          <div className="bg-gray-50 rounded-2xl p-6 border">
                            {isLive && (
                              <div className="flex items-center gap-2 mb-4">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium text-red-600">Live Now</span>
                              </div>
                            )}

                            <div className="space-y-4">
                              <h4 className="text-lg font-semibold text-gray-900">
                                {round.name || `Submission Round (via Unstop)`}
                              </h4>
                              
                              <p className="text-gray-700 leading-relaxed">
                                {round.description || "This will be a submission round! You will see the \"Submit\" button here, once the round is live."}
                              </p>

                              <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span className="font-medium">Start:</span>
                                  <span>{dayNum} {monthStr} 25, {startTime} IST</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span className="font-medium">End:</span>
                                  <span>{dayNum + 1} {monthStr} 25, {endTime} IST</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 pt-2">
                                {projectSubmissionUI}
                                {pptSubmissionUI}
                                
                                {round.resultsAvailable && (
                                  <button className="px-4 py-2 border border-blue-500 text-blue-600 rounded hover:bg-blue-50 transition">
                                    Results
                                  </button>
                                )}
                              </div>

                              {!isRegistered && (
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                                  <p className="text-sm text-yellow-700">
                                    You're not eligible to participate in this round.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <PPTSubmissionModal
        open={pptModal.open}
        onOpenChange={(open) => {
          setPptModal({ open, roundIdx: open ? pptModal.roundIdx : null });
          if (!open) handleAfterAction();
        }}
        hackathonId={hackathon._id}
        roundIndex={pptModal.roundIdx}
        onSuccess={handleAfterAction}
        hackathon={hackathon}
        editingSubmission={
          pptModal.open && pptModal.roundIdx !== null
            ? getSubmissionForRound(pptModal.roundIdx)
            : null
        }
      />
      
      <ProjectSubmissionModal
        open={
          showProjectModal !== undefined
            ? showProjectModal
            : projectModal.open
        }
        onOpenChange={handleProjectModalOpenChange}
        hackathon={hackathon}
        roundIndex={projectModal.roundIdx}
        onSuccess={handleAfterAction}
        autoSelectProjectId={autoSelectProjectId}
        editingSubmission={editingSubmission}
        onEditSuccess={handleAfterAction}
        onSubmitAnother={handleSubmitAnother}
        projectSubmissions={projectSubmissions}
      />
      
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({
            open,
            submission: open ? deleteDialog.submission : null,
          })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project Submission?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete your project submission? You
              can resubmit anytime until the round ends.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() =>
                setDeleteDialog({ open: false, submission: null })
              }
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProjectSubmission}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
