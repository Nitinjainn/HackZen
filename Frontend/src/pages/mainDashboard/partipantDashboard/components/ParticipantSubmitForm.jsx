"use client";

import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../../../../lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../components/CommonUI/card";
import { Button } from "../../../../components/CommonUI/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/CommonUI/select";
import { Textarea } from "../../../../components/CommonUI/textarea";
import { Label } from "../../../../components/CommonUI/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/CommonUI/tabs";
import { ArrowLeft, ChevronRight, ChevronLeft } from "lucide-react";
import axios from "axios";
import { useAchievements } from '../../../../hooks/useAchievements';
import { useToast } from '../../../../hooks/use-toast';
import ProjectTeamManagement from '../components/TeamsParticipantsPage';

export default function ProjectSubmissionForm({
  hackathon,
  onBack,
  userProjects = [],
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("project-selection");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProblem, setSelectedProblem] = useState("");
  const [organizerQuestions, setOrganizerQuestions] = useState([]);
  const [termsAndConditions, setTermsAndConditions] = useState([]);
  const [organizerAnswers, setOrganizerAnswers] = useState({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();
  const isMounted = useRef(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isLeader, setIsLeader] = useState(false);
  // Store full submission objects for display
  const [submissions, setSubmissions] = useState([]);

  // State for PPT upload
  const [pptFile, setPptFile] = useState(null);
  const [pptUploading, setPptUploading] = useState(false);
  const [pptUploadError, setPptUploadError] = useState("");
  const [pptUploadSuccess, setPptUploadSuccess] = useState(false);

  // State for PPT link and problem statement
  const [pptLink, setPptLink] = useState("");
  const [pptProblem, setPptProblem] = useState("");
  const [pptLinkError, setPptLinkError] = useState("");
  const [pptLinkSuccess, setPptLinkSuccess] = useState(false);
  const [pptLinkSubmitting, setPptLinkSubmitting] = useState(false);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const user = JSON.parse(localStorage.getItem('user'));
  const userId = user?._id;
  const { checkForNewBadges } = useAchievements(userId);

  // Track which projects have already been submitted to this hackathon
  const [submittedProjectIds, setSubmittedProjectIds] = useState([]);

  useEffect(() => {
    const fetchCustomForm = async () => {
      if (!hackathon || (!hackathon.id && !hackathon._id)) {
        console.warn('fetchCustomForm: No valid hackathon id found:', hackathon);
        return;
      }
      try {
        console.log('fetchCustomForm: hackathon =', hackathon);
        const res = await axios.get(
          `${API_BASE_URL}/api/hackathons/${hackathon._id || hackathon.id}`
        );
        const form = res.data.customForm || {};
        setOrganizerQuestions(form.questions || []);
        setTermsAndConditions(form.terms?.map((t) => t.text) || []);
      } catch (err) {
        console.error("Error fetching form questions:", err);
      }
    };
    fetchCustomForm();
  }, [hackathon]);

  useEffect(() => {
    // Fetch all submissions for this hackathon and user
    const fetchSubmissions = async () => {
      try {
        const token = localStorage.getItem("token");
        const hackathonId = hackathon._id || hackathon.id;
        const res = await axios.get(
          `${API_BASE_URL}/api/submission-form/submissions?hackathonId=${hackathonId}&userId=${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const submissions = res.data.submissions || [];
        setSubmissions(submissions);
        // Ensure projectId is always a string
        const projectIds = submissions.map((s) =>
          s.projectId && typeof s.projectId === 'object' && s.projectId._id
            ? s.projectId._id.toString()
            : s.projectId?.toString()
        );
        setSubmittedProjectIds(projectIds);
      } catch (err) {
        setSubmissions([]);
        setSubmittedProjectIds([]);
      }
    };
    if ((hackathon._id || hackathon.id) && userId) fetchSubmissions();
  }, [hackathon._id, hackathon.id, userId]);

  // Helper: can edit/delete before deadline
  const canEditOrDelete = () => {
    const deadline = hackathon.submissionDeadline;
    return !deadline || new Date() <= new Date(deadline);
  };

  // Delete submission handler
  const handleDeleteSubmission = async (submissionId) => {
    if (!window.confirm('Are you sure you want to delete this submission?')) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/api/submission-form/submission/${submissionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmissions(submissions.filter(s => s._id !== submissionId));
      setSubmittedProjectIds(submittedProjectIds.filter(id => id !== submissionId));
      toast({ title: 'Deleted', description: 'Submission deleted.' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete submission.' });
    }
  };

  // Edit submission handler (opens form pre-filled)
  const [editingSubmission, setEditingSubmission] = useState(null);
  const handleEditSubmission = (submission) => {
    setEditingSubmission(submission);
    setSelectedProjectId(submission.projectId._id || submission.projectId);
    setSelectedProblem(submission.problemStatement);
    setOrganizerAnswers(
      (submission.customAnswers || []).reduce((acc, ans) => {
        acc[ans.questionId] = ans.answer;
        return acc;
      }, {})
    );
    setSelectedMembers(submission.selectedMembers || []);
    setActiveTab('project-selection');
  };
  // Save edited submission
  const handleSaveEdit = async () => {
    if (!editingSubmission) return;
    try {
      const token = localStorage.getItem("token");
      const answersArray = Object.entries(organizerAnswers).map(
        ([id, answer]) => ({ questionId: id, answer })
      );
      await axios.put(
        `${API_BASE_URL}/api/submission-form/submission/${editingSubmission._id}`,
        {
          customAnswers: answersArray,
          problemStatement: selectedProblem,
          selectedMembers,
          projectId: selectedProjectId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: 'Updated', description: 'Submission updated.' });
      setEditingSubmission(null);
      // Refresh submissions
      const hackathonId = hackathon._id || hackathon.id;
      const res = await axios.get(
        `${API_BASE_URL}/api/submission-form/submissions?hackathonId=${hackathonId}&userId=${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubmissions(res.data.submissions || []);
      setSubmittedProjectIds((res.data.submissions || []).map(s => s.projectId && typeof s.projectId === 'object' && s.projectId._id ? s.projectId._id.toString() : s.projectId?.toString()));
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to update submission.' });
    }
  };

  useEffect(() => {
    if (selectedProjectId && submittedProjectIds.some(id => id.toString() === selectedProjectId.toString())) {
      setSelectedProjectId("");
      toast({
        title: 'Already Submitted',
        description: 'You have already submitted this project in this hackathon.',
        duration: 4000,
      });
    }
  }, [selectedProjectId, submittedProjectIds, toast]);

  // Pre-select new project if redirected back from create project
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const newProjectId = params.get("newProjectId");
    if (newProjectId) {
      setSelectedProjectId(newProjectId);
    }
  }, [location.search]);

  // Fetch team members for this hackathon
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const token = localStorage.getItem("token");
        const hackathonId = hackathon._id || hackathon.id;
        const res = await fetch(`${API_BASE_URL}/api/teams/hackathon/${hackathonId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const teams = await res.json();
        // Find the team where the user is a member
        if (Array.isArray(teams) && teams.length > 0) {
          const user = JSON.parse(localStorage.getItem('user'));
          const myTeam = teams.find(team => team.members.some(m => m._id === user._id));
          if (myTeam) {
            setTeamMembers(myTeam.members);
            setIsLeader(myTeam.leader && myTeam.leader._id === user._id);
            // By default, select all members
            setSelectedMembers(myTeam.members.map(m => m._id));
          }
        }
      } catch (err) {
        setTeamMembers([]);
        setIsLeader(false);
      }
    };
    if (hackathon && (hackathon._id || hackathon.id)) fetchTeam();
  }, [hackathon]);

  const handleOrganizerAnswer = (questionId, answer) => {
    setOrganizerAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleProjectSelect = (projectId) => {
    if (projectId === "create-new") {
      const returnUrl = encodeURIComponent(location.pathname + location.search);
      navigate(`/dashboard/my-hackathons?createProject=1&hackathonId=${hackathon._id || hackathon.id}&returnUrl=${returnUrl}`);
      return;
    }
    const isSubmitted = submittedProjectIds.some(id => id.toString() === projectId.toString());
    if (isSubmitted) {
      toast({
        title: 'Already Submitted',
        description: 'You have already submitted this project in this hackathon.',
        duration: 4000,
      });
      return;
    }
    setSelectedProjectId(projectId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!selectedProjectId || selectedProjectId === "create-new") {
      toast({
        title: '❌ Error',
        description: 'Please select a project to submit.',
        duration: 4000,
      });
      return;
    }

    if (!selectedProblem) {
      toast({
        title: '❌ Error',
        description: 'Please select a problem statement.',
        duration: 4000,
      });
      return;
    }

    if (submittedProjectIds.some(id => id.toString() === selectedProjectId.toString())) {
      toast({
        title: 'Already Submitted',
        description: 'You have already submitted this project in this hackathon.',
        duration: 4000,
      });
      return;
    }

    setIsSubmitting(true);
    const token = localStorage.getItem("token");
    const answersArray = Object.entries(organizerAnswers).map(
      ([id, answer]) => ({
        questionId: id,
        answer,
      })
    );

    const payload = {
      hackathonId: hackathon._id || hackathon.id,
      projectId: selectedProjectId,
      problemStatement: selectedProblem,
      customAnswers: answersArray,
      selectedMembers,
      roundIndex: currentRound ? currentRound.roundIndex : 0, // Use current round index
    };
    console.log('handleSubmit: payload =', payload);

    try {
      console.log('🚀 Submitting project with payload:', payload);
      const response = await axios.post(
        `${API_BASE_URL}/api/submission-form/submit`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log('✅ Submission successful:', response.data);
      
      // Add the just-submitted project to the submitted list
      setSubmittedProjectIds((prev) => [...prev, selectedProjectId]);
      setSelectedProjectId(""); // Optionally clear the selection
      
      // Call badge check after successful submission
      await checkForNewBadges();
      
      // Show success state
      setShowSuccess(true);
      
      // Show success toast
      toast({
        title: '🎉 Success!',
        description: 'Your project has been submitted successfully!',
        duration: 5000,
      });
      
      // Robust redirect after 2 seconds
      setTimeout(() => {
        // Use hard redirect to ensure navigation always works
        window.location.href = "/dashboard/my-hackathons";
      }, 2000);
      
    } catch (err) {
      console.error("❌ Error submitting project:", err);
      console.error("❌ Error response:", err.response?.data);
      toast({
        title: '❌ Error',
        description: err.response?.data?.error || 'Failed to submit project. Please try again.',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for PPT upload
  const handlePptFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowedTypes = ["application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"];
    if (!allowedTypes.includes(file.type)) {
      setPptUploadError("Only PPT or PPTX files are allowed.");
      setPptFile(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPptUploadError("File size must be less than 10MB.");
      setPptFile(null);
      return;
    }
    setPptUploadError("");
    setPptFile(file);
  };

  // Handler for PPT form submit
  const handlePptSubmit = async (e) => {
    e.preventDefault();
    if (!pptFile) {
      setPptUploadError("Please select a PPT file to upload.");
      return;
    }
    setPptUploading(true);
    setPptUploadError("");
    setPptUploadSuccess(false);
    try {
      // 1. Upload file to backend (now /api/uploads/ppt)
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("ppt", pptFile);
      const uploadRes = await fetch(`${API_BASE_URL}/api/uploads/ppt`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.message || "Upload failed");
      // 2. Submit the PPT submission
      const submissionRes = await fetch(`${API_BASE_URL}/api/submission-form/ppt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          hackathonId: hackathon._id || hackathon.id,
          pptFile: uploadData.url,
          roundIndex: currentRound ? currentRound.roundIndex : 0, // Use current round index
        }),
      });
      const submissionData = await submissionRes.json();
      if (!submissionRes.ok) throw new Error(submissionData.message || "Submission failed");
      setPptUploadSuccess(true);
      setPptFile(null);
      toast({ title: "Success!", description: "PPT submitted successfully." });
    } catch (err) {
      setPptUploadError(err.message);
    } finally {
      setPptUploading(false);
    }
  };

  // Handler for PPT link submit
  const handlePptLinkSubmit = async (e) => {
    e.preventDefault();
    setPptLinkError("");
    setPptLinkSuccess(false);
    if (!pptProblem) {
      setPptLinkError("Please select a problem statement.");
      return;
    }
    if (!pptLink.trim() || !pptLink.startsWith("http")) {
      setPptLinkError("Please enter a valid PPT link (e.g., Google Drive link).");
      return;
    }
    setPptLinkSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const submissionRes = await fetch(`${API_BASE_URL}/api/submission-form/ppt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          hackathonId: hackathon._id || hackathon.id,
          pptFile: pptLink.trim(),
          problemStatement: pptProblem,
          roundIndex: currentRound ? currentRound.roundIndex : 0, // Use current round index
        }),
      });
      const submissionData = await submissionRes.json();
      if (!submissionRes.ok) throw new Error(submissionData.message || "Submission failed");
      setPptLinkSuccess(true);
      setPptLink("");
      setPptProblem("");
      toast({ title: "Success!", description: "PPT link submitted successfully." });
    } catch (err) {
      setPptLinkError(err.message);
    } finally {
      setPptLinkSubmitting(false);
    }
  };

  // Keep all projects but mark submitted ones as disabled
  const allProjects = userProjects;
  console.log("DEBUG: allProjects", allProjects);
  console.log("DEBUG: submittedProjectIds", submittedProjectIds);

  const maxReached = submittedProjectIds.length >= (hackathon.maxSubmissionsPerParticipant || 1);

  // Check if there are custom questions or terms
  const hasCustomQuestions = organizerQuestions.length > 0;
  const hasTerms = termsAndConditions.length > 0;
  const hasCustomForm = hasCustomQuestions || hasTerms;
  
  // Check if there are any required questions
  const hasRequiredQuestions = organizerQuestions.some(q => q.required);

  // Dynamic stepper based on whether there are custom questions/terms
  const steps = hasCustomForm 
    ? [
        { key: "project-selection", label: "Select Project" },
        { key: "terms-submit", label: "Q&A & Submit" },
      ]
    : [
        { key: "project-selection", label: "Submit Project" },
      ];
  const currentStep = steps.findIndex((s) => s.key === activeTab);

  // Determine current eligible round for the participant
  const [currentRound, setCurrentRound] = useState(null);
  const [round2Eligibility, setRound2Eligibility] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  useEffect(() => {
    if (!hackathon || !Array.isArray(hackathon.rounds)) return;
    
    // Check Round 2 eligibility if Round 2 exists
    // Only check next round eligibility for multi-round hackathons
    if (hackathon.rounds.length >= 2) {
      checkNextRoundEligibility();
    }
    
    // For single round hackathons, everyone is eligible for the first round
    if (hackathon.rounds.length === 1) {
      setCurrentRound({ ...hackathon.rounds[0], roundIndex: 0 });
      return;
    }
    
    // If no roundProgress, everyone is eligible for round 0
    if (!Array.isArray(hackathon.roundProgress) || hackathon.roundProgress.length === 0) {
      setCurrentRound({ ...hackathon.rounds[0], roundIndex: 0 });
      return;
    }
    
    // For multi-round hackathons, find the highest roundIndex the user is in advancedParticipantIds for
    let eligibleRound = null;
    for (let i = 0; i < hackathon.roundProgress.length; i++) {
      const progress = hackathon.roundProgress[i];
      if (progress.advancedParticipantIds && progress.advancedParticipantIds.includes(userId)) {
        // Eligible for next round (if exists)
        if (hackathon.rounds[progress.roundIndex + 1]) {
          eligibleRound = { ...hackathon.rounds[progress.roundIndex + 1], roundIndex: progress.roundIndex + 1 };
        }
      }
    }
    // If not advanced, check if eligible for round 0
    if (!eligibleRound && hackathon.roundProgress.every(rp => !rp.advancedParticipantIds.includes(userId))) {
      eligibleRound = { ...hackathon.rounds[0], roundIndex: 0 };
    }
    setCurrentRound(eligibleRound);
  }, [hackathon, userId]);

  const checkNextRoundEligibility = async () => {
    setCheckingEligibility(true);
    try {
      const token = localStorage.getItem('token');
      // For single round hackathons, don't check eligibility
      if (hackathon.rounds && hackathon.rounds.length === 1) {
        setRound2Eligibility({ eligible: true, shortlisted: true });
        return;
      }
      
      // For multi-round hackathons, check eligibility for the next round
      const nextRoundIndex = currentRound ? currentRound.roundIndex + 1 : 1;
      const response = await fetch(`/api/judge-management/hackathons/${hackathon._id || hackathon.id}/rounds/${nextRoundIndex}/eligibility`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRound2Eligibility(data);
      } else {
        console.error('Failed to check next round eligibility');
      }
    } catch (error) {
      console.error('Error checking next round eligibility:', error);
    } finally {
      setCheckingEligibility(false);
    }
  };

  // Block access if not eligible
  if (!currentRound) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl text-red-600 font-bold">
        You are not eligible to submit in the current round. Please wait for results or contact the organizer.
      </div>
    );
  }

  // Check if this is a final round and show eligibility status (only for multi-round hackathons)
  const isFinalRound = currentRound && hackathon.rounds && currentRound.roundIndex === hackathon.rounds.length - 1;
  const showFinalRoundEligibility = isFinalRound && round2Eligibility && hackathon.rounds.length > 1;

  // Render the correct form for the current round's type
  // Dynamic rendering based on round type
  if (currentRound.type === 'ppt') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-purple-50 to-slate-100 py-8 px-4">
        {/* Final Round Eligibility Check */}
        {showFinalRoundEligibility && (
          <div className="max-w-4xl mx-auto mb-6">
            {checkingEligibility ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-blue-800">Checking Round 2 eligibility...</span>
                </div>
              </div>
            ) : (round2Eligibility.shortlisted || round2Eligibility.eligible) ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-800">
                      {round2Eligibility.round2Started ? 'Congratulations! You\'re eligible for Round 2' : 'Congratulations! You\'re selected for Round 2'}
                    </h3>
                    <p className="text-sm text-green-700 mt-1">
                      {round2Eligibility.round2Started 
                        ? 'Your team was shortlisted for Round 2. You can now submit a new project for this round.'
                        : 'Your team was shortlisted for Round 2. You can submit your project when Round 2 starts.'
                      }
                    </p>
                    {round2Eligibility.shortlistingDetails && (
                      <p className="text-xs text-green-600 mt-2">
                        Shortlisted project: {round2Eligibility.shortlistingDetails.projectTitle}
                      </p>
                    )}
                    {!round2Eligibility.round2Started && round2Eligibility.round2StartDate && (
                      <p className="text-xs text-green-600 mt-2">
                        Round 2 starts: {new Date(round2Eligibility.round2StartDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✗</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-800">Not Selected for Round 2</h3>
                    <p className="text-sm text-red-700 mt-1">
                      {round2Eligibility.message || 'Your team was not shortlisted for Round 2. Thank you for participating in Round 1!'}
                    </p>
                    {!round2Eligibility.round2Started && round2Eligibility.round2StartDate && (
                      <p className="text-xs text-red-600 mt-2">
                        Round 2 starts: {new Date(round2Eligibility.round2StartDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Eligibility and round type logic */}
        {!currentRound ? (
          <div className="flex items-center justify-center text-xl text-red-600 font-bold min-h-[300px]">
            You are not eligible to submit in the current round. Please wait for results or contact the organizer.
          </div>
        ) : currentRound.type === 'ppt' ? (
          <form className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow" onSubmit={handlePptLinkSubmit}>
            <h2 className="text-2xl font-bold mb-4 text-center">PPT Submission</h2>
            <div className="mb-4">
              <label className="block font-medium mb-2">Select Problem Statement</label>
              <select
                value={pptProblem}
                onChange={e => setPptProblem(e.target.value)}
                className="block w-full border rounded p-2 mb-2"
                required
                disabled={pptLinkSubmitting}
              >
                <option value="">-- Select a problem statement --</option>
                {hackathon.problemStatements && hackathon.problemStatements.map((statement, idx) => (
                  <option key={idx} value={statement}>{statement.length > 80 ? statement.slice(0, 80) + "..." : statement}</option>
                ))}
              </select>
              <label className="block font-medium mb-2">Paste your PPT link (Google Drive, Dropbox, etc.)</label>
              <input
                type="url"
                value={pptLink}
                onChange={e => setPptLink(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="block w-full border rounded p-2"
                disabled={pptLinkSubmitting}
                required
              />
              {pptLinkError && <div className="mt-2 text-red-600">{pptLinkError}</div>}
              {pptLinkSuccess && <div className="mt-2 text-green-600">PPT link submitted successfully!</div>}
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
              disabled={pptLinkSubmitting}
            >
              {pptLinkSubmitting ? "Submitting..." : "Submit PPT Link"}
            </button>
          </form>
        ) : currentRound.type === 'quiz' ? (
          <div className="flex items-center justify-center text-lg min-h-[300px]">Quiz Form (Coming Soon)</div>
        ) : currentRound.type === 'both' ? (
          <div className="flex items-center justify-center text-lg min-h-[300px]">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Round {currentRound.roundIndex + 1} - PPT & Project Submission</h2>
              <p className="text-gray-600 mb-4">This round accepts both PPT and Project submissions.</p>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">PPT Submission</h3>
                  <p className="text-sm text-blue-700 mb-3">Upload your presentation slides for this round.</p>
                  {/* PPT submission form would go here */}
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">Project Submission</h3>
                  <p className="text-sm text-green-700 mb-3">Submit your project for this round.</p>
                  {/* Project submission form would go here */}
                </div>
              </div>
            </div>
          </div>
        ) : currentRound.type === 'project' ? (
          <div>
            {/* Final Round Eligibility Check for Project Submissions */}
            {showFinalRoundEligibility && (
              <div className="max-w-4xl mx-auto mb-6">
                {checkingEligibility ? (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-blue-800">Checking Round 2 eligibility...</span>
                    </div>
                  </div>
                ) : round2Eligibility.eligible ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-green-800">Congratulations! You're eligible for Round 2</h3>
                        <p className="text-sm text-green-700 mt-1">
                          Your team was shortlisted for Round 2. You can now submit a new project for this round.
                        </p>
                        {round2Eligibility.shortlistingDetails && (
                          <p className="text-xs text-green-600 mt-2">
                            Shortlisted project: {round2Eligibility.shortlistingDetails.projectTitle}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✗</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-red-800">Not Selected for Round 2</h3>
                        <p className="text-sm text-red-700 mt-1">
                          {round2Eligibility.message || 'Your team was not shortlisted for Round 2. Thank you for participating in Round 1!'}
                        </p>
                        {!round2Eligibility.round2Started && round2Eligibility.round2StartDate && (
                          <p className="text-xs text-red-600 mt-2">
                            Round 2 starts: {new Date(round2Eligibility.round2StartDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Show allowed submissions info */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 font-medium">
              {hackathon.maxSubmissionsPerParticipant === 1
                ? 'You can submit only 1 project to this hackathon.'
                : `You can submit up to ${hackathon.maxSubmissionsPerParticipant} different projects to this hackathon.`}
              {maxReached && (
                <div className="mt-2 text-red-600 font-semibold">
                  You have already submitted {hackathon.maxSubmissionsPerParticipant} project{hackathon.maxSubmissionsPerParticipant > 1 ? 's' : ''} to this hackathon. No more submissions allowed.
                </div>
              )}
            </div>
            <div className=" mx-auto space-y-4">
              <Button
                variant="outline"
                onClick={() => (onBack ? onBack() : navigate(-1))}
                className="mb-2 border-indigo-300 text-indigo-700 hover:bg-indigo-100"
              >
                <ArrowLeft className="mr-2 w-4 h-4" /> Back
              </Button>

              {/* Submitted Projects List */}
              {submissions.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-indigo-800 mb-2">Your Submissions</h2>
                  <div className="space-y-2">
                    {submissions.map(sub => (
                      <Card key={sub._id} className="flex flex-col md:flex-row items-center justify-between p-4">
                        <div className="flex-1">
                          <div className="font-semibold text-black">{sub.projectId?.title || sub.projectId?.name || 'Untitled Project'}</div>
                          <div className="text-sm text-gray-600">Problem: {sub.problemStatement}</div>
                          <div className="text-xs text-gray-400">Submitted: {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : ''}</div>
                        </div>
                        {canEditOrDelete() && (
                          <div className="flex gap-2 mt-2 md:mt-0">
                            <Button size="sm" variant="outline" onClick={() => handleEditSubmission(sub)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteSubmission(sub._id)}>
                              Delete
                            </Button>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <Card>
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-3xl font-extrabold text-indigo-800 mb-2 tracking-tight">
                    Submit Project
                  </CardTitle>
                  <p className="text-lg text-black font-medium">
                    {hackathon?.name || "Hackathon"}
                  </p>
                  {/* Stepper */}
                  <div className="flex justify-center mt-4 gap-4">
                    {steps.map((step, idx) => (
                      <div key={step.key} className="flex items-center">
                        <div
                          className={`rounded-full w-7 h-7 flex items-center justify-center font-bold text-white transition-all
                            ${idx <= currentStep ? "bg-indigo-600" : "bg-indigo-200"}
                          `}
                        >
                          {idx + 1}
                        </div>
                        {idx < steps.length - 1 && (
                          <div
                            className={`w-8 h-1 ${
                              idx < currentStep ? "bg-indigo-500" : "bg-indigo-200"
                            } mx-1 rounded`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleSubmit}>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      {hasCustomForm ? (
                        <TabsList className="grid w-full grid-cols-2 mb-8 ">
                          <TabsTrigger
                            value="project-selection"
                            className={`transition-all ${
                              activeTab === "project-selection"
                                ? "bg-indigo-600 text-white"
                                : "text-black"
                            }`}
                          >
                            Select Project
                          </TabsTrigger>
                          <TabsTrigger
                            value="terms-submit"
                            className={`transition-all ${
                              activeTab === "terms-submit"
                                ? "bg-indigo-600 text-white"
                                : "text-gray-400 cursor-not-allowed"
                            }`}
                            disabled={
                              !selectedProjectId ||
                              selectedProjectId === "create-new" ||
                              !selectedProblem ||
                              submittedProjectIds.some(id => id.toString() === selectedProjectId.toString())
                            }
                          >
                            Q&A & Submit
                            {(!selectedProjectId || selectedProjectId === "create-new" || !selectedProblem) && (
                              <span className="ml-2 text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded-full">
                                Locked
                              </span>
                            )}
                            {(selectedProjectId && selectedProjectId !== "create-new" && selectedProblem) && (
                              <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                                Ready
                              </span>
                            )}
                          </TabsTrigger>
                        </TabsList>
                      ) : (
                        <TabsList className="grid w-full grid-cols-1 mb-8 ">
                          <TabsTrigger
                            value="project-selection"
                            className="bg-indigo-600 text-white"
                          >
                            Submit Project
                          </TabsTrigger>
                        </TabsList>
                      )}

                      {/* Step 1: Select Project */}
                      <TabsContent
                        value="project-selection"
                        className="space-y-8 animate-fade-in"
                      >
                        <div className="space-y-3 text-black">
                          <Label className="text-black font-semibold">
                            Select Project<span className="text-red-500">*</span>
                          </Label>
                          <Select
                            key={submittedProjectIds.join(",")}
                            value={selectedProjectId}
                            onValueChange={handleProjectSelect}
                            required
                            disabled={maxReached && !editingSubmission}
                          >
                            <SelectTrigger className="border-indigo-300 focus:ring-2 focus:ring-indigo-400">
                              <SelectValue placeholder={allProjects.length === 0 ? "No projects available" : "Choose..."} />
                            </SelectTrigger>
                            <SelectContent>
                              {allProjects.length === 0 ? (
                                <div className="px-4 py-2 text-gray-500">No projects available. Create a project first.</div>
                              ) : (
                                <>
                                  {/* Available projects */}
                                  {allProjects
                                    .filter(project =>
                                      !submittedProjectIds.some(id => id.toString() === project._id.toString()) ||
                                      (editingSubmission && (editingSubmission.projectId._id === project._id || editingSubmission.projectId === project._id))
                                    )
                                    .map((project) => (
                                      <SelectItem
                                        key={project._id}
                                        value={project._id}
                                        className="text-black"
                                      >
                                        {project.title}
                                      </SelectItem>
                                    ))
                                  }
                                  
                                  {/* Submitted projects (disabled) */}
                                  {allProjects
                                    .filter(project =>
                                      submittedProjectIds.some(id => id.toString() === project._id.toString()) &&
                                      !(editingSubmission && (editingSubmission.projectId._id === project._id || editingSubmission.projectId === project._id))
                                    )
                                    .map((project) => (
                                      <SelectItem
                                        key={project._id}
                                        value={project._id}
                                        className="text-gray-400 cursor-not-allowed"
                                        disabled={true}
                                      >
                                        {project.title} (Already Submitted)
                                      </SelectItem>
                                    ))
                                  }
                                  
                                  <SelectItem
                                    value="create-new"
                                    className="text-indigo-600 font-semibold"
                                  >
                                    + Create New Project
                                  </SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                          {selectedProjectId === "create-new" && (
                            <div className="mt-2 p-4 bg-indigo-50 rounded-lg border border-indigo-200 text-black">
                              Please create your project from the <b>Projects</b>{" "}
                              section before submitting.
                            </div>
                          )}
                        </div>

                        {/* Problem Statement Dropdown */}
                        <div className="space-y-3 text-black">
                          <Label className="text-black font-semibold">
                            Problem Statement<span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={selectedProblem}
                            onValueChange={setSelectedProblem}
                            required
                            disabled={!hackathon.problemStatements || hackathon.problemStatements.length === 0}
                          >
                            <SelectTrigger className="border-indigo-300 focus:ring-2 focus:ring-indigo-400">
                              <SelectValue placeholder={hackathon.problemStatements && hackathon.problemStatements.length > 0 ? "Select a problem statement..." : "No problem statements available"} />
                            </SelectTrigger>
                            <SelectContent>
                              {hackathon.problemStatements && hackathon.problemStatements.length > 0 ? (
                                hackathon.problemStatements.map((statement, idx) => (
                                  <SelectItem key={idx} value={statement} className="text-black">
                                    {statement.length > 80 ? statement.slice(0, 80) + "..." : statement}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-problem" disabled>No problem statements available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3 text-black">
                          {isLeader && teamMembers.length > 0 && (
                            <div className="mb-4">
                              <Label className="text-black font-semibold">Select Team Members to Include in Submission</Label>
                              <div className="border border-indigo-300 rounded p-2 bg-white">
                                {teamMembers.map(member => (
                                  <label key={member._id} className="flex items-center space-x-2 mb-1">
                                    <input
                                      type="checkbox"
                                      checked={selectedMembers.includes(member._id)}
                                      onChange={e => {
                                        if (e.target.checked) {
                                          setSelectedMembers(prev => [...prev, member._id]);
                                        } else {
                                          setSelectedMembers(prev => prev.filter(id => id !== member._id));
                                        }
                                      }}
                                      disabled={member._id === userId} // leader always included
                                    />
                                    <span>{member.name} {member._id === userId ? "(You)" : ""}</span>
                                  </label>
                                ))}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">You (leader) are always included in the submission.</div>
                            </div>
                          )}
                        </div>

                        {/* Team Management Section */}
                        {selectedProjectId && selectedProjectId !== "create-new" && (
                          <div className="mt-6">
                            <ProjectTeamManagement
                              project={allProjects.find(p => p._id === selectedProjectId)}
                              hackathon={hackathon}
                              user={user}
                              toast={toast}
                              onTeamUpdate={() => {
                                // Refresh team data when team is updated
                                const fetchTeam = async () => {
                                  try {
                                    const token = localStorage.getItem("token");
                                    const hackathonId = hackathon._id || hackathon.id;
                                    const res = await fetch(`${API_BASE_URL}/api/teams/hackathon/${hackathonId}`, {
                                      headers: { Authorization: `Bearer ${token}` },
                                    });
                                    const teams = await res.json();
                                    if (Array.isArray(teams) && teams.length > 0) {
                                      const user = JSON.parse(localStorage.getItem('user'));
                                      const myTeam = teams.find(team => team.members.some(m => m._id === user._id));
                                      if (myTeam) {
                                        setTeamMembers(myTeam.members);
                                        setIsLeader(myTeam.leader && myTeam.leader._id === user._id);
                                        setSelectedMembers(myTeam.members.map(m => m._id));
                                      }
                                    }
                                  } catch (err) {
                                    setTeamMembers([]);
                                    setIsLeader(false);
                                  }
                                };
                                fetchTeam();
                              }}
                            />
                          </div>
                        )}

                        <div className="flex justify-end">
                          {hasCustomForm ? (
                            <>
                              {/* Show guidance message when requirements not met */}
                              {(!selectedProjectId || selectedProjectId === "create-new" || !selectedProblem) && (
                                <div className="flex-1 text-sm text-gray-500">
                                  {!selectedProjectId || selectedProjectId === "create-new" ? "Please select a project" : ""}
                                  {(!selectedProjectId || selectedProjectId === "create-new") && !selectedProblem ? " and " : ""}
                                  {!selectedProblem ? "choose a problem statement" : ""}
                                  {" to proceed to Q&A & Submit"}
                                </div>
                              )}
                              {(selectedProjectId && selectedProjectId !== "create-new" && selectedProblem) && (
                                <div className="flex-1 text-sm text-green-600">
                                  ✓ Ready to proceed to Q&A & Submit
                                </div>
                              )}
                              <Button
                                type="button"
                                onClick={() => setActiveTab("terms-submit")}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg shadow transition-all"
                                disabled={
                                  !selectedProjectId ||
                                  selectedProjectId === "create-new" ||
                                  !selectedProblem ||
                                  submittedProjectIds.some(id => id.toString() === selectedProjectId.toString())
                                }
                              >
                                Next <ChevronRight className="ml-2 h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                                                          <Button
                                type="submit"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-lg shadow transition-all font-semibold"
                                disabled={
                                  !selectedProjectId ||
                                  selectedProjectId === "create-new" ||
                                  !selectedProblem ||
                                  submittedProjectIds.some(id => id.toString() === selectedProjectId.toString()) ||
                                  isSubmitting ||
                                  maxReached ||
                                  (isFinalRound && round2Eligibility && !round2Eligibility.eligible)
                                }
                              >
                              {isSubmitting ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                  Submitting...
                                </>
                              ) : isFinalRound && round2Eligibility && !round2Eligibility.eligible ? (
                                "Not Eligible for Round 2"
                              ) : (
                                "Submit Project →"
                              )}
                            </Button>
                          )}
                        </div>
                      </TabsContent>

                      {/* Step 2: Questions & Terms */}
                      <TabsContent
                        value="terms-submit"
                        className="space-y-6 animate-fade-in"
                      >
                        {!hasCustomForm && (
                          <div className="text-center py-8">
                            <div className="text-gray-500 mb-4">
                              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p className="text-lg font-medium text-gray-700">Ready to Submit!</p>
                              <p className="text-sm text-gray-500">No additional questions or terms required.</p>
                            </div>
                          </div>
                        )}
                        {organizerQuestions.length > 0 && (
                          <>
                            <h3 className="text-xl font-bold text-black mb-2">
                              Organizer Questions
                            </h3>
                            <div className="space-y-4">
                              {organizerQuestions.map((q) => (
                                <div key={q.id}>
                                  <Label className="text-black font-medium">
                                    {q.text}
                                    {q.required && (
                                      <span className="text-red-500 ml-1">*</span>
                                    )}
                                  </Label>
                                  <Textarea
                                    value={organizerAnswers[q.id] || ""}
                                    onChange={(e) =>
                                      handleOrganizerAnswer(q.id, e.target.value)
                                    }
                                    required={q.required}
                                    className="mt-1 border-indigo-300 focus:ring-2 focus:ring-indigo-400 text-black"
                                    placeholder="Type your answer..."
                                  />
                                  {q.required && (
                                    <span className="text-xs text-indigo-500">
                                      This question is required.
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {termsAndConditions.length > 0 && (
                          <>
                            <h3 className="text-xl font-bold text-black mb-2">
                              Terms & Conditions
                            </h3>
                            <div className="max-h-40 overflow-y-auto bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-2">
                              <ul className="list-disc pl-6 space-y-1">
                                {termsAndConditions.map((term, i) => (
                                  <li key={i} className="text-sm text-black">
                                    {term}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {hasTerms && (
                              <label className="flex items-center space-x-2 text-sm text-black font-medium">
                                <input
                                  type="checkbox"
                                  checked={agreedToTerms}
                                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                                  required
                                  className="accent-indigo-600"
                                />
                                <span>I agree to the terms above</span>
                              </label>
                            )}
                          </>
                        )}

                        <div className="flex justify-between pt-4">
                          <Button
                            type="button"
                            onClick={() => setActiveTab("project-selection")}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg shadow transition-all"
                          >
                            <ChevronLeft className="mr-2 h-4 w-4" /> Back
                          </Button>
                          <Button
                            type="submit"
                            disabled={
                              (hasTerms && !agreedToTerms) || 
                              (hasRequiredQuestions && !organizerQuestions.every(q => !q.required || organizerAnswers[q.id])) ||
                              isSubmitting || 
                              !selectedProjectId || 
                              selectedProjectId === "create-new" || 
                              !selectedProblem ||
                              submittedProjectIds.some(id => id.toString() === selectedProjectId.toString()) ||
                              maxReached
                            }
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-lg shadow transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSubmitting ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Submitting...
                              </>
                            ) : (
                              "Submit →"
                            )}
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </form>
                </CardContent>
              </Card>
            </div>
            
            {/* Success Overlay */}
            {showSuccess && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center animate-fade-in">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Success!</h3>
                  <p className="text-gray-600 mb-6">Your project has been submitted successfully!</p>
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                  </div>
                  <p className="text-sm text-gray-500">Redirecting to My Hackathons...</p>
                </div>
              </div>
            )}
            
            {/* Animation for fade-in */}
            <style>{`
              .animate-fade-in {
                animation: fadeIn 0.5s;
              }
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(16px);}
                to { opacity: 1; transform: translateY(0);}
              }
            `}</style>
          </div>
        ) : null}
      </div>
    );
}}