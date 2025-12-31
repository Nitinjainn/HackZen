import { useEffect, useState } from "react";
import BaseModal from "./TeamModals/BaseModal";
import { Button } from "../../../../../../components/CommonUI/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../../../components/CommonUI/select";
import { useToast } from '../../../../../../hooks/use-toast';
import { useNavigate, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../../../../../../lib/api";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '../../../../../../components/DashboardUI/alert-dialog';
import ReactDOM from "react-dom";
import EditTeamNameModal from "./TeamModals/EditTeamNameModal";
import { Edit, X } from "lucide-react"; // Added X import
import { useAuth } from "../../../../../../context/AuthContext";

export default function ProjectSubmissionModal({ open, onOpenChange, hackathon, roundIndex, onSuccess, autoSelectProjectId, editingSubmission, projectSubmissions = [], setEditingSubmission }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedProblem, setSelectedProblem] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDebug, setShowDebug] = useState(false);
  // Add state for editing mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  // Add state for confirmation dialog
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [pendingProjectId, setPendingProjectId] = useState(null);
  // Add state for submit confirmation dialog
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [team, setTeam] = useState(null);
  const [editingTeamName, setEditingTeamName] = useState(false);
  const [updatingTeamName, setUpdatingTeamName] = useState(false);
  const { user } = useAuth();

  // Helper to fetch projects
  const fetchProjects = async (autoSelectLatest = false) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/mine`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
      const params = new URLSearchParams(location.search);
      const newProjectId = params.get("newProjectId");
      if (newProjectId && data.some(p => p._id === newProjectId)) {
        setSelectedProject(newProjectId);
      } else if (autoSelectLatest && data && data.length > 0) {
        const sorted = [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setSelectedProject(sorted[0]._id);
      }
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-open modal if returnTo=hackathon-timeline is in the URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("returnTo") === "hackathon-timeline" && !open) {
      if (onOpenChange) onOpenChange(true);
      // Remove the param from the URL after opening
      params.delete("returnTo");
      navigate({ search: params.toString() }, { replace: true });
    }
    // eslint-disable-next-line
  }, [location.search]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedProject("");
      setSelectedProblem("");
      setSubmitting(false);
      setShowSubmitConfirm(false);
      setPendingSubmit(false);
    }
  }, [open]);

  // Fetch projects and auto-select the latest if redirected from create
  useEffect(() => {
    if (!open) {
      setSelectedProject("");
      setSelectedProblem("");
      return;
    }
    const params = new URLSearchParams(location.search);
    fetchProjects(params.get("returnTo") === "hackathon-timeline");
    // eslint-disable-next-line
  }, [open, location.search]);

  useEffect(() => {
    if (open && autoSelectProjectId) {
      setSelectedProject(autoSelectProjectId);
    }
  }, [open, autoSelectProjectId]);

  // Pre-fill form if editing
  useEffect(() => {
    if (editingSubmission && open) {
      setIsEditMode(true);
      setEditingId(editingSubmission._id);
      setSelectedProject(editingSubmission.projectId?._id || editingSubmission.projectId);
      setSelectedProblem(editingSubmission.problemStatement || "");
    } else if (open) {
      setIsEditMode(false);
      setEditingId(null);
      setSelectedProject("");
      setSelectedProblem("");
    }
  }, [editingSubmission, open]);

  // Fetch user's team for this hackathon
  const fetchTeam = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/teams/hackathon/${hackathon._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      // Assume user can only be in one team per hackathon
      setTeam(Array.isArray(data) && data.length > 0 ? data[0] : null);
    } catch {
      setTeam(null);
    }
  };

  // Fetch team when modal opens
  useEffect(() => {
    if (open && hackathon?._id) fetchTeam();
  }, [open, hackathon?._id]);

  const handleRefresh = () => {
    fetchProjects();
  };

  const handleCreateNew = () => {
    const hackathonId = hackathon?._id || hackathon?.id;
    const returnUrl = encodeURIComponent(`/dashboard/hackathons/${hackathonId}?returnTo=hackathon-timeline`);
    navigate(`/dashboard/my-hackathons?createProject=1&hackathonId=${hackathonId}&returnUrl=${returnUrl}`);
    if (onOpenChange) onOpenChange(false); // Close modal
  };

  const handleClose = () => {
    setSelectedProject("");
    setSelectedProblem("");
    setSubmitting(false);
    setShowSubmitConfirm(false);
    setPendingSubmit(false);
    if (onOpenChange) onOpenChange(false);
  };

  const handleSubmit = async () => {
    console.log('[ProjectSubmissionModal] handleSubmit called with:', {
      selectedProject,
      selectedProblem,
      roundIndex,
      isEditMode,
      editingId
    });
    
    if (!selectedProject) {
      toast({ title: 'Error', description: 'Please select a project to submit.', variant: 'destructive' });
      return;
    }
    if (hackathon.problemStatements?.length && !selectedProblem) {
      toast({ title: 'Error', description: 'Please select a problem statement.', variant: 'destructive' });
      return;
    }
    if (typeof roundIndex !== 'number' || isNaN(roundIndex)) {
      toast({ title: 'Submission Error', description: 'Round index is missing or invalid. Please refresh and try again.', variant: 'destructive' });
      console.error('Submission aborted: roundIndex is', roundIndex);
      return;
    }
    // Prevent duplicate submissions for single project/single round
    if (isSingleProjectSingleRound && !isEditMode) {
      const alreadySubmitted = projectSubmissions && projectSubmissions.some(
        s => s.hackathonId === hackathon._id && s.roundIndex === roundIndex
      );
      if (alreadySubmitted) {
        toast({ title: 'Already Submitted', description: 'You have already submitted a project for this round. Please edit or delete your previous submission first.', variant: 'destructive' });
        return;
      }
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      console.log("[ProjectSubmissionModal] Submitting project with:", {
        hackathonId: hackathon._id,
        roundIndex,
        projectId: selectedProject,
        problemStatement: selectedProblem,
        isEditMode,
        editingId
      });
      if (isEditMode && editingId) {
        // Edit existing submission
        const res = await fetch(`${API_BASE_URL}/api/submission-form/submission/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            projectId: selectedProject,
            problemStatement: selectedProblem,
          }),
        });
        const data = await res.json();
        console.log('[ProjectSubmissionModal] Update response:', data);
        if (!res.ok) {
          console.error('Submission error details:', data);
          throw new Error(data.error || data.message || "Update failed");
        }
        toast({ title: "Submission Updated!", description: "Your project submission has been updated.", variant: "success" });
        // Close modal and refresh data
        if (onOpenChange) onOpenChange(false);
        if (onSuccess) onSuccess();
        // Reset form state
        setSelectedProject("");
        setSelectedProblem("");
        setSubmitting(false);
      } else {
        // Create new submission (existing logic)
        // Find the selected project
        const project = projects.find(p => p._id === selectedProject);
        // Check if already submitted to this hackathon/round
        const alreadySubmitted = projectSubmissions && projectSubmissions.some(
          s => s.projectId === selectedProject && s.hackathonId === hackathon._id && s.roundIndex === roundIndex
        );
        if (alreadySubmitted) {
          toast({ title: "Already Submitted", description: "This project has already been submitted to this round.", variant: "destructive" });
          setSubmitting(false);
          return;
        }
        // If the project is not linked to this hackathon, update it first
        if (!project.hackathon || (project.hackathon._id !== hackathon._id && project.hackathon !== hackathon._id)) {
          const updateRes = await fetch(`${API_BASE_URL}/api/projects/${selectedProject}/assign-hackathon`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ hackathonId: hackathon._id }),
          });
          if (!updateRes.ok) {
            const errData = await updateRes.json();
            // If the error is "Project already linked to a hackathon", skip and proceed to submission
            if (errData.message && errData.message.includes("already linked")) {
              // proceed
            } else {
              console.error('Assign hackathon error details:', errData);
              throw new Error(errData.message || "Failed to link project to hackathon");
            }
          }
        }
        // Now submit the project
        const res = await fetch(`${API_BASE_URL}/api/submission-form/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            hackathonId: hackathon._id,
            roundIndex: roundIndex, // Use the passed roundIndex prop
            projectId: selectedProject,
            problemStatement: selectedProblem,
          }),
        });
        const data = await res.json();
        console.log('[ProjectSubmissionModal] Submission response:', data);
        if (!res.ok) {
          console.error('Submission error details:', data);
          throw new Error(data.error || data.message || "Submission failed");
        }
        toast({ title: "Project Submitted!", description: "Your project has been submitted successfully.", variant: "success" });
        // Close modal and refresh data
        if (onOpenChange) onOpenChange(false);
        if (onSuccess) onSuccess();
        // Reset form state
        setSelectedProject("");
        setSelectedProblem("");
        setSubmitting(false);
      }
    } catch (err) {
      console.error("[ProjectSubmissionModal] Project submission error:", err);
      toast({ title: isEditMode ? "Update failed" : "Submission failed", description: err.message || "Could not submit project", variant: "destructive" });
      // Don't close modal on error, let user try again
    } finally {
      setSubmitting(false);
    }
  };

  const showProblemDropdown = hackathon.problemStatements && hackathon.problemStatements.length > 0 && selectedProject;
  const canSubmit = selectedProject && (!showProblemDropdown || selectedProblem);

  // Debug log for dropdown rendering
  if (projects && projects.length > 0) {
    // eslint-disable-next-line
    console.log("[ProjectSubmissionModal] Projects for dropdown:", projects);
  }

  // Helper: check if single project, single round, and editing
  const isSingleProjectSingleRound =
    hackathon.submissionType === 'single-project' &&
    hackathon.roundType === 'single-round' &&
    isEditMode;

  // Helper: filter out already submitted projects for multi-project modes
  let availableProjects = projects;
  if (hackathon.submissionType === 'multi-project') {
    if (hackathon.roundType === 'single-round') {
      // Exclude projects already submitted to this hackathon (any round)
      const submittedIds = (projectSubmissions || []).map(s => s.projectId && (s.projectId._id || s.projectId));
      availableProjects = projects.filter(p => !submittedIds.includes(p._id));
    } else if (hackathon.roundType === 'multi-round') {
      // Exclude projects already submitted to this hackathon/round
      const submittedIds = (projectSubmissions || []).filter(s => s.roundIndex === roundIndex).map(s => s.projectId && (s.projectId._id || s.projectId));
      availableProjects = projects.filter(p => !submittedIds.includes(p._id));
    }
  }

  // Handler for selecting a new project in edit mode (single project/single round)
  const handleProjectChange = (projectId) => {
    if (isSingleProjectSingleRound && selectedProject !== projectId) {
      setPendingProjectId(projectId);
      setShowConfirmDelete(true);
    } else {
      setSelectedProject(projectId);
    }
  };

  // Handler for confirming delete and switching project
  const handleConfirmDelete = async () => {
    setShowConfirmDelete(false);
    // Delete previous submission
    if (editingId) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE_URL}/api/submission-form/submission/${editingId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        // Optionally show error toast
      }
    }
    // After deleting, immediately create a new submission for the new project
    setIsEditMode(false);
    setEditingId(null);
    setSelectedProject(pendingProjectId);
    setPendingProjectId(null);
    // If setEditingSubmission is available as a prop, call it to clear editingSubmission
    if (typeof setEditingSubmission === 'function') setEditingSubmission(null);
    // Submit the new project automatically as a new submission (not edit mode)
    setTimeout(() => {
      setIsEditMode(false);
      setEditingId(null);
      if (typeof setEditingSubmission === 'function') setEditingSubmission(null);
      handleSubmit();
    }, 0);
  };

  // Handler for cancel
  const handleCancelDelete = () => {
    setShowConfirmDelete(false);
    setPendingProjectId(null);
    if (onOpenChange) onOpenChange(false); // Close modal, return to timeline
  };

  // Handler for submit button click
  const handlePreSubmit = () => {
    // For Round 2 submissions, skip confirmation dialog
    if (roundIndex === 1) {
      handleSubmit();
    } else if (!isEditMode) {
      setShowSubmitConfirm(true);
      setPendingSubmit(true);
    } else {
      handleSubmit();
    }
  };

  // Handler for confirming submit
  const handleConfirmSubmit = () => {
    setShowSubmitConfirm(false);
    setPendingSubmit(false);
    handleSubmit();
  };

  // Handler for canceling submit
  const handleCancelSubmit = () => {
    setShowSubmitConfirm(false);
    setPendingSubmit(false);
  };

  return (
    <>
      <BaseModal
        open={open}
        onOpenChange={handleClose}
        title={
          <div className="flex items-center justify-between w-full">
            <span>Submit Project for this Round</span>
            <button
              type="button"
              onClick={handleClose}
              className="h-6 w-6 p-0 flex items-center justify-center hover:bg-gray-100 rounded"
              disabled={submitting}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        }
        description="Choose a project to submit for this round. You can select an existing project or create a new one."
        content={
          <div className="flex flex-col gap-4 mt-2">
            {/* Submission count info for multi-project, single-round */}
            {hackathon.submissionType === 'multi-project' && hackathon.roundType === 'single-round' && (
              (() => {
                const submittedCount = projectSubmissions ? projectSubmissions.length : 0;
                const maxAllowed = hackathon.maxSubmissionsPerParticipant || 1;
                const canSubmitMore = submittedCount < maxAllowed;
                const remaining = maxAllowed - submittedCount;
                return (
                  <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-800 font-medium">
                    {`You have submitted ${submittedCount} out of ${maxAllowed} allowed projects. ${canSubmitMore ? `You can submit ${remaining} more.` : 'You cannot submit more projects.'}`}
                    {!canSubmitMore && (
                      <div className="mt-2 text-red-600 font-semibold">
                        You have submitted all allowed projects. To submit a new one, delete an existing submission.
                      </div>
                    )}
                  </div>
                );
              })()
            )}
            
            {loading ? (
              <div>Loading your projects...</div>
            ) : projects.length === 0 ? (
              <>
                <div className="text-gray-600 text-center">No previous projects.</div>
                <Button onClick={handleCreateNew} className="w-full bg-blue-600 text-white mt-2">Create New Project</Button>
              </>
            ) : (
              <>
                
                {/* Fallback: Native select for debugging */}
                <label className="block text-sm font-medium text-gray-700 mt-2">Select a project</label>
                <select
                  value={selectedProject}
                  onChange={e => handleProjectChange(e.target.value)}
                  disabled={submitting}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select a project</option>
                  {availableProjects.map(project => (
                    <option key={project._id} value={project._id}>
                      {project.title || project.name}
                    </option>
                  ))}
                </select>
                {/*
              <Select value={selectedProject} onValueChange={setSelectedProject} disabled={submitting}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project._id} value={project._id}>{project.title || project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              */}
                <Button onClick={handleCreateNew} className="w-full bg-blue-600 text-white mt-2">Create New Project</Button>

                {team && (
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-medium">Team Name:</span>
                    <span>{team.name}</span>
                    {team.leader?._id === user?._id && (
                      <Button size="xs" variant="ghost" onClick={() => setEditingTeamName(true)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
                <EditTeamNameModal
                  open={editingTeamName}
                  onClose={() => setEditingTeamName(false)}
                  defaultValue={team?.name || ""}
                  loading={updatingTeamName}
                  onSave={async (newName) => {
                    setUpdatingTeamName(true);
                    try {
                      const token = localStorage.getItem("token");
                      await fetch(`${API_BASE_URL}/api/teams/${team._id}/name`, {
                        method: "PUT",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ name: newName }),
                      });
                      setEditingTeamName(false);
                      fetchTeam();
                      toast({ title: "Team name updated!", description: "Your team name has been updated.", variant: "success" });
                    } catch (err) {
                      toast({ title: "Error", description: "Failed to update team name.", variant: "destructive" });
                    } finally {
                      setUpdatingTeamName(false);
                    }
                  }}
                />

                {showProblemDropdown && (
                  <>
                    <label className="block text-sm font-medium text-gray-700 mt-2">Select a problem statement</label>
                    <select
                      value={selectedProblem}
                      onChange={e => setSelectedProblem(e.target.value)}
                      disabled={submitting}
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Select a problem statement</option>
                      {hackathon.problemStatements.map((ps, idx) => (
                        <option key={idx} value={typeof ps === 'object' && ps !== null ? ps.statement : ps}>
                          {typeof ps === 'object' && ps !== null ? ps.statement : ps}
                        </option>
                      ))}
                    </select>
                    {/*
                  <Select value={selectedProblem} onValueChange={setSelectedProblem} disabled={submitting}>
                    <SelectTrigger className="w-full mt-2">
                      <SelectValue placeholder="Select a problem statement" />
                    </SelectTrigger>
                    <SelectContent>
                      {hackathon.problemStatements.map((ps, idx) => (
                        <SelectItem key={idx} value={typeof ps === 'object' && ps !== null ? ps.statement : ps}>
                          {typeof ps === 'object' && ps !== null ? ps.statement : ps}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  */}
                  </>
                )}
              </>
            )}
            <Button
              className="w-full bg-green-600 text-white mt-4"
              onClick={handlePreSubmit}
              disabled={submitting || !canSubmit}
            >
              {submitting ? (isEditMode ? "Saving..." : "Submitting...") : (isEditMode ? "Save Changes" : "Submit Project")}
            </Button>
           {/* Confirmation Dialog for changing project in single project/single round edit mode */}
           <AlertDialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
             <AlertDialogContent>
               <AlertDialogHeader>
                 <AlertDialogTitle>Change Project?</AlertDialogTitle>
                 <AlertDialogDescription>
                   Changing your project will delete your previous submission for this round. Are you sure you want to continue?
                 </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                 <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
                 <AlertDialogAction onClick={handleConfirmDelete}>Continue</AlertDialogAction>
               </AlertDialogFooter>
             </AlertDialogContent>
           </AlertDialog>
          </div>
        }
      />
      {/* Confirmation Dialog for first submission (not edit mode) - outside BaseModal for z-index fix */}
      {ReactDOM.createPortal(
        <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
          <AlertDialogContent style={{ zIndex: 9999 }}>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                Once you submit, you can't edit or resubmit this project for this round. Are you sure you want to submit?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelSubmit}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmSubmit}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>,
        document.body
      )}
    </>
  );
}
