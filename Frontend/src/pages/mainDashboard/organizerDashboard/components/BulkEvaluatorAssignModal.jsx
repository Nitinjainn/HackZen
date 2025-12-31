import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/DashboardUI/dialog';
import { X, Search, UserPlus, ChevronDown, CheckCircle, Clock, XCircle, Users, FileText } from 'lucide-react';
import { useToast } from '../../../../hooks/use-toast';
import AddEvaluatorModal from './AddEvaluatorModal';
import { API_BASE_URL } from '../../../../lib/api';

export default function BulkEvaluatorAssignModal({
  open,
  onClose,
  selectedCount = 0,
  onAssign,
  hackathonId,
  roundIndex = 0,
  selectedSubmissionIds = [],
  onAssignmentComplete,
}) {

  const { toast } = useToast();
  const [evaluatorSearch, setEvaluatorSearch] = useState("");
  const [selectedEvaluators, setSelectedEvaluators] = useState([]);
  const [assignCounts, setAssignCounts] = useState({});
  const [allEvaluators, setAllEvaluators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState('manual'); // 'manual' or 'equal'
  
  // New state for multiple judges per project
  const [multipleJudgesMode, setMultipleJudgesMode] = useState(false);
  const [judgesPerProject, setJudgesPerProject] = useState(1);
  const [judgesPerProjectMode, setJudgesPerProjectMode] = useState('manual'); // 'manual' or 'equal'
  const [showAddEvaluatorModal, setShowAddEvaluatorModal] = useState(false);

  // Assignment overview state
  const [assignmentOverview, setAssignmentOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  
  // Evaluator selector modal state
  const [showEvaluatorSelector, setShowEvaluatorSelector] = useState(false);

  // Problem statement selection state
  const [selectedProblemStatement, setSelectedProblemStatement] = useState("");
  const [hackathonData, setHackathonData] = useState(null);



  // Fetch evaluators when modal opens
  useEffect(() => {
    if (open && hackathonId) {
      fetchEvaluators();
      fetchAssignmentOverview();
      fetchHackathonData();
    }
  }, [open, hackathonId, roundIndex]);

  // Refetch assignment overview when problem statement selection changes
  useEffect(() => {
    if (open && hackathonId) {
      fetchAssignmentOverview();
    }
  }, [selectedProblemStatement]);

  // Reset assignment counts when problem statement selection changes
  useEffect(() => {
    if (selectedProblemStatement) {
      // Reset assignment counts when problem statement filter is applied
      setAssignCounts({});
      setAssignmentMode('manual');
    }
  }, [selectedProblemStatement]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedEvaluators([]);
      setAssignCounts({});
      setEvaluatorSearch("");
      setAssignmentMode('manual');
      setMultipleJudgesMode(false);
      setJudgesPerProject(1);
      setJudgesPerProjectMode('manual');
      setShowAddEvaluatorModal(false);
      setShowEvaluatorSelector(false);
    }
  }, [open]);

  const fetchEvaluators = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const url = `${API_BASE_URL}/api/judge-management/hackathons/${hackathonId}/evaluators`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAllEvaluators(data.evaluators);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch evaluators:', response.status, errorText);
        throw new Error('Failed to fetch evaluators');
      }
    } catch (error) {
      console.error('Error fetching evaluators:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch evaluators',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignmentOverview = async () => {
    setOverviewLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Build URL with filters
      let url = `${API_BASE_URL}/api/judge-management/hackathons/${hackathonId}/assignment-overview`;
      const params = new URLSearchParams();
      
      if (selectedProblemStatement) {
        params.append('problemStatementId', selectedProblemStatement);
      }
      
      // Add roundIndex filter
      if (roundIndex !== undefined && roundIndex !== null) {
        params.append('roundIndex', roundIndex.toString());
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
        console.error('Failed to fetch assignment overview');
      }
    } catch (error) {
      console.error('Error fetching assignment overview:', error);
    } finally {
      setOverviewLoading(false);
    }
  };

  const fetchHackathonData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/hackathons/${hackathonId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setHackathonData(data);
      } else {
        console.error('Failed to fetch hackathon data');
      }
    } catch (error) {
      console.error('Error fetching hackathon data:', error);
    }
  };



  const handleEvaluatorAdded = () => {
    // Refresh the evaluators list
    fetchEvaluators();
    setShowAddEvaluatorModal(false);
  };

  // Filter evaluators based on search and judge type restrictions
  const filteredEvaluators = allEvaluators.filter(ev => {
    // First filter by search
    const matchesSearch = ev.name.toLowerCase().includes(evaluatorSearch.toLowerCase()) ||
                         ev.email.toLowerCase().includes(evaluatorSearch.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Then filter by judge type restrictions
    if (selectedProblemStatement && hackathonData?.problemStatements) {
      const selectedPS = hackathonData.problemStatements.find(ps => 
        ps._id === selectedProblemStatement || ps.statement === selectedProblemStatement
      );
      
      if (selectedPS) {
        const isSponsoredPS = selectedPS.type === 'sponsored';
        
        // Platform judges can only judge non-sponsored PS (unless they have special permission)
        if (ev.type === 'platform') {
          return !isSponsoredPS || ev.canJudgeSponsoredPS;
        }
        
        // Sponsor judges can only judge sponsored PS
        if (ev.type === 'sponsor') {
          return isSponsoredPS;
        }
        
        // Hybrid judges can judge both
        if (ev.type === 'hybrid') {
          return true;
        }
      }
    }
    
    // If no problem statement is selected, show all evaluators
    return true;
  });

  // Helper function to get problem statement type
  const getProblemStatementType = () => {
    if (!selectedProblemStatement || !hackathonData?.problemStatements) return null;
    
    const selectedPS = hackathonData.problemStatements.find(ps => 
      ps._id === selectedProblemStatement || ps.statement === selectedProblemStatement
    );
    
    return selectedPS?.type || null;
  };

  // Helper function to get available judge types for current PS
  const getAvailableJudgeTypes = () => {
    const psType = getProblemStatementType();
    
    if (!psType) return ['platform', 'sponsor', 'hybrid']; // Show all if no PS selected
    
    if (psType === 'sponsored') {
      return ['sponsor', 'hybrid']; // Only sponsor and hybrid judges
    } else {
      return ['platform', 'hybrid']; // Only platform and hybrid judges
    }
  };

  // Get current problem statement type
  const currentPSType = getProblemStatementType();
  const availableJudgeTypes = getAvailableJudgeTypes();

  // Separate evaluators by status
  const activeEvaluators = filteredEvaluators.filter(ev => ev.status === 'active');
  const pendingEvaluators = filteredEvaluators.filter(ev => ev.status === 'pending');
  const declinedEvaluators = filteredEvaluators.filter(ev => ev.status === 'declined');

  // Calculate actual submission count after filtering
  const actualSubmissionCount = selectedProblemStatement ? 
    assignmentOverview?.unassignedSubmissions?.length || 0 : selectedCount;

  // Use selected submissions count when available, otherwise use actualSubmissionCount
  const effectiveSubmissionCount = selectedSubmissionIds.length > 0 ? selectedSubmissionIds.length : actualSubmissionCount;

  // Add debugging and ensure we have a valid count
  console.log('🔍 actualSubmissionCount calculation:', {
    selectedProblemStatement,
    assignmentOverview: !!assignmentOverview,
    unassignedSubmissionsLength: assignmentOverview?.unassignedSubmissions?.length,
    selectedCount,
    actualSubmissionCount,
    effectiveSubmissionCount,
    selectedSubmissionIds: selectedSubmissionIds.length
  });

  // Ensure we have a valid count (fallback to selectedCount if actualSubmissionCount is 0 or undefined)
  const validSubmissionCount = actualSubmissionCount > 0 ? actualSubmissionCount : selectedCount;

  // Calculate total assigned, but cap it at the actual submission count when filtering is active
  const totalAssigned = selectedEvaluators.reduce((sum, id) => {
    const count = parseInt(assignCounts[id] || 0);
    return sum + count;
  }, 0);

  // When filtering is active, show the actual submission count instead of the assigned count
  const displayTotalAssigned = selectedProblemStatement ? effectiveSubmissionCount : totalAssigned;

  // Calculate remaining to assign based on actual available submissions
  const remainingToAssign = effectiveSubmissionCount - displayTotalAssigned;

  const handleEvaluatorToggle = (id) => {
    setSelectedEvaluators(prev =>
      prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (selectedEvaluators.length === 0) {
      toast({
        title: 'No evaluators selected',
        description: 'Please select at least one evaluator to assign submissions.',
        variant: 'destructive',
      });
      return;
    }

    // Check if any evaluator has 0 assignments (only for multiple submissions)
    if (effectiveSubmissionCount > 1) {
      const hasZeroAssignments = selectedEvaluators.some(id => (assignCounts[id] || 0) === 0);
      if (hasZeroAssignments) {
        toast({
          title: 'Invalid assignment',
          description: 'Cannot assign 0 submissions. Please assign at least 1 submission to each selected evaluator.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (!assignmentOverview) {
      toast({
        title: 'Assignment data not loaded',
        description: 'Please wait for assignment data to load before assigning submissions.',
        variant: 'destructive',
      });
      return;
    }

    // Refresh assignment overview to ensure we have the latest data
    await fetchAssignmentOverview();

    // Validate multiple judges per project settings
    if (multipleJudgesMode) {
      if (judgesPerProject < 1) {
        toast({
          title: 'Invalid judges per project',
          description: 'Judges per project must be at least 1.',
          variant: 'destructive',
        });
        return;
      }
      
      // Warn if more judges per project than available evaluators
      if (judgesPerProject > selectedEvaluators.length) {
        console.warn(`Warning: ${judgesPerProject} judges per project requested but only ${selectedEvaluators.length} evaluators available`);
      }
    }

    // Use the computed actual submission count

    // Only validate if we're trying to assign more than available (skip validation for multiple judges mode)
    // For multiple projects, each judge gets all projects, so total assigned can exceed available submissions
    if (!multipleJudgesMode && effectiveSubmissionCount === 1 && totalAssigned > effectiveSubmissionCount) {
      toast({
        title: 'Too many assignments',
        description: `You're trying to assign ${totalAssigned} submissions but only ${effectiveSubmissionCount} are available (${selectedProblemStatement ? 'filtered by problem statement' : 'total'}).`,
        variant: 'destructive',
      });
      return;
    }

    setAssignLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Get list of unassigned submission IDs from assignment overview
      const unassignedSubmissionIdsFromOverview = assignmentOverview?.unassignedSubmissions?.map(s => s._id) || [];
      
      // Filter selected submissions to only include unassigned ones
      let unassignedSubmissionIds = selectedSubmissionIds.filter(submissionId => {
        const isUnassigned = unassignedSubmissionIdsFromOverview.includes(submissionId);
        return isUnassigned;
      });

      // Filter by problem statement if selected
      if (selectedProblemStatement) {
        const selectedPS = hackathonData?.problemStatements?.find(ps => ps._id === selectedProblemStatement || ps._id === selectedProblemStatement.toString());
        
        if (selectedPS) {
          // Since the backend already filtered by problem statement, we just use the unassigned submissions from overview
          unassignedSubmissionIds = assignmentOverview?.unassignedSubmissions?.map(s => s._id) || [];
          
          console.log('🔍 Problem Statement Filter Applied:', {
            selectedProblemStatement,
            selectedProblemStatementText: selectedPS.statement.slice(0, 50) + '...',
            originalSelectedCount: selectedSubmissionIds.length,
            filteredCount: unassignedSubmissionIds.length
          });
        }
      }

      if (unassignedSubmissionIds.length === 0) {
        console.log('🔍 DEBUG: No unassigned submissions to assign');
        
        let errorMessage = `All ${selectedSubmissionIds.length} selected submissions are already assigned to judges.`;
        
        if (selectedProblemStatement) {
          const selectedPS = hackathonData?.problemStatements?.find(ps => ps._id === selectedProblemStatement || ps._id === selectedProblemStatement.toString());
          errorMessage = `No submissions found for the selected problem statement "${selectedPS?.statement?.slice(0, 30)}..." that are available for assignment.`;
        } else {
          errorMessage += ` Only ${assignmentOverview?.unassignedSubmissions?.length || 0} submissions are available for assignment.`;
        }
        
        toast({
          title: 'No submissions to assign',
          description: errorMessage,
          variant: 'destructive',
        });
        setAssignLoading(false);
        return;
      }

      console.log(`🔍 DEBUG: Proceeding with assignment: ${unassignedSubmissionIds.length} filtered submissions out of ${selectedSubmissionIds.length} originally selected`);
      
      if (selectedProblemStatement && unassignedSubmissionIds.length < selectedSubmissionIds.length) {
        const selectedPS = hackathonData?.problemStatements?.find(ps => ps._id === selectedProblemStatement || ps._id === selectedProblemStatement.toString());
        console.log(`🔍 INFO: Problem statement filter applied. Only ${unassignedSubmissionIds.length} submissions match "${selectedPS?.statement?.slice(0, 30)}..."`);
      }

      // Prepare evaluator assignments
      const evaluatorAssignments = selectedEvaluators.map(evaluatorId => {
        const evaluator = allEvaluators.find(e => e.id === evaluatorId);
        return {
          evaluatorId,
          maxSubmissions: parseInt(assignCounts[evaluatorId] || 0),
          evaluatorEmail: evaluator?.email,
          evaluatorName: evaluator?.name
        };
      });

      console.log('🔍 DEBUG: Sending bulk assignment request:', {
        originalSubmissionIds: selectedSubmissionIds,
        filteredSubmissionIds: unassignedSubmissionIds,
        evaluatorAssignments,
        assignmentMode,
        roundIndex,
        multipleJudgesMode,
        judgesPerProject,
        judgesPerProjectMode,
        selectedProblemStatement
      });

      const url = `${API_BASE_URL}/api/judge-management/hackathons/${hackathonId}/bulk-assign-submissions`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          submissionIds: unassignedSubmissionIds,
          evaluatorAssignments,
          assignmentMode,
          roundIndex,
          multipleJudgesMode,
          judgesPerProject,
          judgesPerProjectMode,
          problemStatementId: selectedProblemStatement || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Assignment failed:', errorData);
        throw new Error(errorData.message || 'Failed to assign submissions');
      }

      const result = await response.json();
      
      if (result.assignedSubmissions > 0) {
        let description = `Assigned ${result.assignedSubmissions} submissions to ${selectedEvaluators.length} evaluators`;
        
        if (selectedProblemStatement && result.assignedSubmissions < selectedSubmissionIds.length) {
          const selectedPS = hackathonData?.problemStatements?.find(ps => ps._id === selectedProblemStatement || ps._id === selectedProblemStatement.toString());
          description += ` (filtered by problem statement: "${selectedPS?.statement?.slice(0, 30)}...")`;
        }
        
        if (multipleJudgesMode) {
          description += ` with ${judgesPerProjectMode === 'manual' ? judgesPerProject : Math.ceil(selectedEvaluators.length / selectedCount)} judges per project`;
        }
        
        toast({
          title: 'Assignments completed successfully',
          description: description + '.',
          variant: 'default',
        });
      } else {
        let description = 'All selected submissions were already assigned to judges.';
        
        if (selectedProblemStatement) {
          description = 'No submissions matching the selected problem statement were available for assignment.';
        }
        
        toast({
          title: 'No assignments made',
          description: description,
          variant: 'default',
        });
      }

      // Reset form
      setSelectedEvaluators([]);
      setAssignCounts({});
      setEvaluatorSearch("");
      setAssignmentMode('manual');
      setMultipleJudgesMode(false);
      setJudgesPerProject(1);
      setJudgesPerProjectMode('manual');
      
      // Refresh assignment overview and submissions status
      await fetchAssignmentOverview();
      
      // Notify parent component and close modal
      if (onAssignmentComplete) {
        onAssignmentComplete();
      }
      if (onClose) {
        onClose();
      }
      if (onAssign) {
        onAssign(selectedEvaluators);
      }
      
    } catch (error) {
      console.error('Assignment error:', error);
      toast({
        title: 'Assignment failed',
        description: error.message || 'Failed to assign submissions to evaluators.',
        variant: 'destructive',
      });
    } finally {
      setAssignLoading(false);
    }
  };

  // Enhanced increment/decrement handlers
  const handleIncrement = (id) => {
    console.log('🔍 handleIncrement called for id:', id);
    const currentCount = parseInt(assignCounts[id] || 0);
    const totalAssigned = selectedEvaluators.reduce((sum, evaluatorId) => {
      const count = evaluatorId === id ? currentCount : parseInt(assignCounts[evaluatorId] || 0);
      return sum + count;
    }, 0);
    
    // Only increment if we haven't reached the available submission count
    if (totalAssigned < effectiveSubmissionCount) {
    const newCount = currentCount + 1;
    console.log('🔍 Increment - currentCount:', currentCount, 'newCount:', newCount);
    setAssignCounts(prev => ({ ...prev, [id]: newCount }));
    }
  };

  const handleDecrement = (id) => {
    console.log('🔍 handleDecrement called for id:', id);
    const currentCount = parseInt(assignCounts[id] || 0);
    const newCount = Math.max(0, currentCount - 1);
    console.log('🔍 Decrement - currentCount:', currentCount, 'newCount:', newCount);
    setAssignCounts(prev => ({ ...prev, [id]: newCount }));
  };

  // Simplified count change handler
  const handleCountChange = (id, value) => {
    const numValue = parseInt(value) || 0;
    console.log('🔍 handleCountChange - id:', id, 'value:', value, 'numValue:', numValue);
    
    // Calculate total assigned excluding current evaluator
    const totalAssignedExcludingCurrent = selectedEvaluators.reduce((sum, evaluatorId) => {
      if (evaluatorId === id) return sum;
      const count = parseInt(assignCounts[evaluatorId] || 0);
      return sum + count;
    }, 0);
    
    // Cap the new value to prevent exceeding available submissions
    const maxAllowed = effectiveSubmissionCount - totalAssignedExcludingCurrent;
    const cappedValue = Math.max(0, Math.min(numValue, maxAllowed));
    
    setAssignCounts(prev => ({ ...prev, [id]: cappedValue }));
  };

  const handleAssignEqually = () => {
    if (selectedEvaluators.length === 0) return;
    
    // Use the number of selected submissions when available, otherwise use actualSubmissionCount
    const submissionCountToDistribute = selectedSubmissionIds.length > 0 ? selectedSubmissionIds.length : actualSubmissionCount;
    
    // For single project assignment, assign 1 submission to each evaluator
    if (submissionCountToDistribute === 1 && selectedEvaluators.length >= 1) {
      const newCounts = {};
      selectedEvaluators.forEach((id) => {
        // Assign 1 to each evaluator for single project
        newCounts[id] = 1;
      });
      setAssignCounts(newCounts);
      setAssignmentMode('equal');
      return;
    }
    
    // For multiple submissions, assign all submissions to each evaluator
    const newCounts = {};
    selectedEvaluators.forEach(id => {
      newCounts[id] = submissionCountToDistribute;
    });
    setAssignCounts(newCounts);
    setAssignmentMode('equal');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'declined':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Accepted';
      case 'pending':
        return 'Pending';
      case 'declined':
        return 'Declined';
      default:
        return status;
    }
  };

  if (!hackathonId) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div className="text-red-600 p-4">No hackathonId provided to BulkEvaluatorAssignModal.        </div>
      </DialogContent>
      
      {/* Add Evaluator Modal */}
      <AddEvaluatorModal
        open={showAddEvaluatorModal}
        onClose={() => setShowAddEvaluatorModal(false)}
        hackathonId={hackathonId}
        onEvaluatorAdded={handleEvaluatorAdded}
      />
      
      {/* Evaluator Selector Modal */}
      <Dialog open={showEvaluatorSelector} onOpenChange={setShowEvaluatorSelector}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Select Evaluators
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-2">
              Choose evaluators to assign to the selected submissions
            </p>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Evaluator by name and email"
                value={evaluatorSearch}
                onChange={(e) => setEvaluatorSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Evaluators List */}
            <div className="max-h-60 overflow-y-auto space-y-2">
              {filteredEvaluators.map(ev => {
                // Check if this evaluator is compatible with current PS
                const isCompatible = !selectedProblemStatement || availableJudgeTypes.includes(ev.type);
                
                return (
                  <div key={ev.id} className={`flex items-center gap-3 p-3 rounded-lg ${
                    isCompatible ? 'hover:bg-gray-50' : 'bg-gray-100 opacity-60'
                  }`}>
                    <input
                      type="checkbox"
                      checked={selectedEvaluators.includes(ev.id)}
                      onChange={() => handleEvaluatorToggle(ev.id)}
                      className="h-4 w-4 text-blue-600 rounded"
                      disabled={!isCompatible}
                    />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      ev.type === 'platform' ? 'bg-green-100' :
                      ev.type === 'sponsor' ? 'bg-blue-100' :
                      ev.type === 'hybrid' ? 'bg-yellow-100' : 'bg-gray-100'
                    }`}>
                      <span className={`text-sm font-semibold ${
                        ev.type === 'platform' ? 'text-green-700' :
                        ev.type === 'sponsor' ? 'text-blue-700' :
                        ev.type === 'hybrid' ? 'text-yellow-700' : 'text-gray-700'
                      }`}>
                        {ev.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{ev.name}</div>
                      <div className="text-sm text-gray-500">{ev.email}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          ev.type === 'platform' ? 'bg-green-100 text-green-800' :
                          ev.type === 'sponsor' ? 'bg-blue-100 text-blue-800' :
                          ev.type === 'hybrid' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {ev.type === 'platform' ? '🟢 Platform' :
                           ev.type === 'sponsor' ? '🔵 Sponsor' :
                           ev.type === 'hybrid' ? '🟡 Hybrid' : '⚪ Unknown'}
                        </span>
                        {ev.type === 'platform' && ev.canJudgeSponsoredPS && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            💰 Can Judge Sponsored
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(ev.status)}
                      <span className="text-xs text-gray-500">{getStatusText(ev.status)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Judge Type Legend */}
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-xs font-medium text-gray-700 mb-2">Judge Types:</div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-green-100 rounded-full"></span>
                  <span>🟢 Platform (General PS)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-blue-100 rounded-full"></span>
                  <span>🔵 Sponsor (Sponsored PS)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-yellow-100 rounded-full"></span>
                  <span>🟡 Hybrid (Both)</span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => setShowEvaluatorSelector(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowEvaluatorSelector(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full max-h-[80vh] overflow-y-auto" aria-describedby="bulk-assign-description">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Assign Evaluators '{selectedCount} Candidates'
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2" id="bulk-assign-description">
            Select judges to evaluate the selected submissions. Judges will only see submissions assigned to them.
          </p>
          
          {/* Problem Statement Selection */}
          {hackathonData?.problemStatements && hackathonData.problemStatements.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">Filter by Problem Statement</span>
                {currentPSType && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    currentPSType === 'sponsored' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {currentPSType === 'sponsored' ? '🔵 Sponsored PS' : '🟢 General PS'}
                  </span>
                )}
              </div>
              <select
                value={selectedProblemStatement}
                onChange={(e) => setSelectedProblemStatement(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Problem Statements</option>
                {hackathonData.problemStatements.map((ps, index) => (
                  <option key={ps._id || index} value={ps._id || index.toString()}>
                    {ps.statement?.slice(0, 60)}... {ps.type && `(${ps.type})`}
                  </option>
                ))}
              </select>
              
              {currentPSType && (
                <div className="mt-2 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <span>Available Judge Types:</span>
                    <div className="flex items-center gap-1">
                      {availableJudgeTypes.map(type => (
                        <span key={type} className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          type === 'platform' ? 'bg-green-100 text-green-800' :
                          type === 'sponsor' ? 'bg-blue-100 text-blue-800' :
                          type === 'hybrid' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {type === 'platform' ? '🟢 Platform' :
                           type === 'sponsor' ? '🔵 Sponsor' :
                           type === 'hybrid' ? '🟡 Hybrid' : '⚪ Unknown'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Assignment Overview */}
          {assignmentOverview && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">
                      {selectedProblemStatement ? 'Filtered Unassigned Projects:' : 'Unassigned Projects:'}
                    </span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">
                      {assignmentOverview.unassignedSubmissions?.length || 0}
                    </span>
                    {selectedProblemStatement && (
                      <span className="text-xs text-gray-500">
                        (filtered by problem statement)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-600" />
                    <span className="font-medium">Assigned Projects:</span>
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                      {assignmentOverview.assignedSubmissions?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span className="font-medium">Active Judges:</span>
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-semibold">
                      {assignmentOverview.judges?.length || 0}
                    </span>
                  </div>
                </div>
                {overviewLoading && (
                  <div className="text-xs text-gray-500">Loading...</div>
                )}
              </div>
            </div>
          )}
          
        </DialogHeader>
        

        
        {/* Selected Evaluators Section */}
        {selectedEvaluators.length > 0 && (
          <div className="mb-6">
            <div className="text-sm font-semibold mb-3 flex items-center justify-between">
              <span>Select Evaluator</span>
                      <div className="flex items-center gap-4">
          <button 
            className="text-blue-600 text-xs font-semibold flex items-center gap-1 hover:text-blue-700" 
            onClick={handleAssignEqually}
          >
            Assign Equally <ChevronDown className="w-3 h-3" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <button
                type="button"
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border-r border-gray-300"
                onClick={() => {
                  const newValue = Math.max(0, displayTotalAssigned - 1);
                  if (selectedEvaluators.length > 0) {
                    // For single submission case
                    if (effectiveSubmissionCount === 1) {
                      const newCounts = {};
                      selectedEvaluators.forEach((id) => {
                        newCounts[id] = Math.min(1, newValue);
                      });
                      setAssignCounts(newCounts);
                    } else {
                      // For multiple submissions, assign all to each evaluator
                    const newCounts = {};
                    selectedEvaluators.forEach(id => {
                        newCounts[id] = newValue;
                    });
                    setAssignCounts(newCounts);
                    }
                  }
                }}
              >
                <span className="text-xs font-bold">−</span>
              </button>
              <input
                type="number"
                min="0"
                step="1"
                className="w-16 border-0 px-2 py-1 text-sm text-center focus:ring-0 focus:outline-none"
                value={displayTotalAssigned}
                onChange={(e) => {
                  const newValue = parseInt(e.target.value) || 0;
                  // Cap the value at the effective submission count
                  const cappedValue = Math.min(newValue, effectiveSubmissionCount);
                  
                  // Distribute the new value equally among selected evaluators
                  if (selectedEvaluators.length > 0) {
                    // For single submission case
                    if (effectiveSubmissionCount === 1) {
                      const newCounts = {};
                      selectedEvaluators.forEach((id) => {
                        newCounts[id] = Math.min(1, cappedValue);
                      });
                      setAssignCounts(newCounts);
                    } else {
                      // For multiple submissions, assign all to each evaluator
                    const newCounts = {};
                    selectedEvaluators.forEach(id => {
                        newCounts[id] = cappedValue;
                    });
                    setAssignCounts(newCounts);
                    }
                  }
                }}
                onKeyDown={(e) => {
                  // Handle arrow keys for increment/decrement
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const newValue = Math.min(displayTotalAssigned + 1, effectiveSubmissionCount);
                    if (selectedEvaluators.length > 0) {
                      // For single submission case
                      if (effectiveSubmissionCount === 1) {
                        const newCounts = {};
                        selectedEvaluators.forEach((id) => {
                          newCounts[id] = Math.min(1, newValue);
                        });
                        setAssignCounts(newCounts);
                      } else {
                        // For multiple submissions, assign all to each evaluator
                      const newCounts = {};
                      selectedEvaluators.forEach(id => {
                          newCounts[id] = newValue;
                      });
                      setAssignCounts(newCounts);
                      }
                    }
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const newValue = Math.max(0, displayTotalAssigned - 1);
                    if (selectedEvaluators.length > 0) {
                      // For single submission case
                      if (effectiveSubmissionCount === 1) {
                        const newCounts = {};
                        selectedEvaluators.forEach((id) => {
                          newCounts[id] = Math.min(1, newValue);
                        });
                        setAssignCounts(newCounts);
                      } else {
                        // For multiple submissions, assign all to each evaluator
                      const newCounts = {};
                      selectedEvaluators.forEach(id => {
                          newCounts[id] = newValue;
                      });
                      setAssignCounts(newCounts);
                      }
                    }
                  }
                }}
              />
              <button
                type="button"
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border-l border-gray-300"
                onClick={() => {
                  const newValue = Math.min(displayTotalAssigned + 1, effectiveSubmissionCount);
                  if (selectedEvaluators.length > 0) {
                    // For single submission case
                    if (effectiveSubmissionCount === 1) {
                      const newCounts = {};
                      selectedEvaluators.forEach((id) => {
                        newCounts[id] = Math.min(1, newValue);
                      });
                      setAssignCounts(newCounts);
                    } else {
                      // For multiple submissions, assign all to each evaluator
                    const newCounts = {};
                    selectedEvaluators.forEach(id => {
                        newCounts[id] = newValue;
                    });
                    setAssignCounts(newCounts);
                    }
                  }
                }}
              >
                <span className="text-xs font-bold">+</span>
              </button>
            </div>
            {selectedProblemStatement && (
              <span className="text-xs text-gray-500">
                (filtered: {actualSubmissionCount})
              </span>
            )}
          </div>
        </div>
            </div>
            
            {/* Selected Evaluators Display */}
            <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  {selectedEvaluators.slice(0, 3).map((id, index) => {
                    const ev = allEvaluators.find(e => e.id === id);
                    if (!ev) return null;
                    return (
                      <div key={id} className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-700">
                          {ev.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                  {selectedEvaluators.length > 3 && (
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-gray-600">+{selectedEvaluators.length - 3}</span>
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">{selectedEvaluators.length} Evaluators</span>
                <button 
                  className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
                  onClick={() => setShowEvaluatorSelector(true)}
                >
                  <UserPlus className="w-3 h-3 text-gray-600" />
                </button>
                <div className="flex items-center gap-2 ml-auto">
                 
                  <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                    
                   
                    
                  </div>
                </div>
              </div>
            </div>
            
            {/* Multiple Judges Per Project Section */}
            <div className="mb-4 p-3 border border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">Multiple Judges Per Project</span>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={multipleJudgesMode}
                    onChange={(e) => setMultipleJudgesMode(e.target.checked)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Enable multiple judges per project</span>
                </label>
              </div>
              
              {multipleJudgesMode && (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="judgesPerProjectMode"
                        checked={judgesPerProjectMode === 'manual'}
                        onChange={() => setJudgesPerProjectMode('manual')}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Manual assignment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="judgesPerProjectMode"
                        checked={judgesPerProjectMode === 'equal'}
                        onChange={() => setJudgesPerProjectMode('equal')}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Equal distribution</span>
                    </div>
                  </div>
                  
                  {judgesPerProjectMode === 'manual' && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">Judges per project:</span>
                      <div className="flex items-center gap-1">
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors"
                            onClick={() => setJudgesPerProject(Math.max(1, judgesPerProject - 1))}
                            disabled={judgesPerProject <= 1}
                          >
                            <span className="text-xs font-bold">−</span>
                          </button>
                          <input
                            type="number"
                            min="1"
                            className="w-20 border-0 px-2 py-1 text-sm text-center focus:ring-0 focus:outline-none"
                            value={judgesPerProject}
                            onChange={(e) => setJudgesPerProject(parseInt(e.target.value) || 1)}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setJudgesPerProject(prev => prev + 1);
                              } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setJudgesPerProject(prev => Math.max(1, prev - 1));
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors"
                            onClick={() => setJudgesPerProject(judgesPerProject + 1)}
                          >
                            <span className="text-xs font-bold">+</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {[...Array(Math.min(judgesPerProject, 5))].map((_, i) => (
                            <Users key={i} className="w-4 h-4 text-blue-600" />
                          ))}
                          {judgesPerProject > 5 && (
                            <span className="text-xs text-blue-600 font-medium">+{judgesPerProject - 5}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">(recommended: ≤ {selectedEvaluators.length})</span>
                      {judgesPerProject > selectedEvaluators.length && (
                        <span className="text-xs text-red-500 ml-2">Warning: More judges per project than available evaluators!</span>
                      )}
                    </div>
                  )}
                  
                  {judgesPerProjectMode === 'equal' && (
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center gap-2 mb-2">
                        <span>Each project will be assigned to {Math.ceil(selectedEvaluators.length / selectedCount)} judges equally</span>
                        <div className="flex items-center gap-1">
                          {[...Array(Math.min(Math.ceil(selectedEvaluators.length / selectedCount), 5))].map((_, i) => (
                            <Users key={i} className="w-3 h-3 text-blue-600" />
                          ))}
                          {Math.ceil(selectedEvaluators.length / selectedCount) > 5 && (
                            <span className="text-xs text-blue-600 font-medium">+{Math.ceil(selectedEvaluators.length / selectedCount) - 5}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Distribution: {selectedCount} projects × {Math.ceil(selectedEvaluators.length / selectedCount)} judges = {selectedCount * Math.ceil(selectedEvaluators.length / selectedCount)} total assignments
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              {selectedEvaluators.map(id => {
                const ev = allEvaluators.find(e => e.id === id);
                if (!ev) return null;
                
                return (
                  <div key={id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <input 
                      type="checkbox" 
                      checked 
                      onChange={() => handleEvaluatorToggle(id)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                      {ev.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">{ev.name}</div>
                      <div className="text-xs text-gray-500">{ev.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        className="rounded-full border border-gray-200 p-1 bg-white text-gray-500 hover:text-blue-600" 
                        title="Assign equally"
                        onClick={() => {
                          const equalCount = Math.ceil(actualSubmissionCount / selectedEvaluators.length);
                          setAssignCounts(prev => ({ ...prev, [id]: equalCount }));
                        }}
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>

                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          type="button"
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border-r border-gray-300"
                          onClick={() => {
                            console.log('🔍 Decrement button clicked for id:', id);
                            handleDecrement(id);
                          }}
                        >
                          <span className="text-xs font-bold">−</span>
                        </button>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="w-16 border-0 px-2 py-1 text-sm text-center focus:ring-0 focus:outline-none"
                          value={assignCounts[id] || "0"}
                          onChange={e => handleCountChange(id, e.target.value)}
                          onKeyDown={(e) => {
                            // Handle arrow keys for increment/decrement
                            if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              handleIncrement(id);
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              handleDecrement(id);
                            }
                          }}
                          placeholder="0"
                        />
                        <button
                          type="button"
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border-l border-gray-300"
                          onClick={() => {
                            console.log('🔍 Increment button clicked for id:', id);
                            handleIncrement(id);
                          }}
                        >
                          <span className="text-xs font-bold">+</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Unassigned Evaluators Section */}
        <div className="mb-4">
          <div className="text-sm font-semibold mb-3">Unassigned Evaluators</div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg pl-10 pr-3 py-2 text-sm"
              placeholder="Search Evaluator by name and email"
              value={evaluatorSearch}
              onChange={e => setEvaluatorSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {loading ? (
            <div className="text-gray-400 text-sm text-center py-4">Loading evaluators...</div>
          ) : filteredEvaluators.length === 0 ? (
            <div className="text-gray-400 text-sm text-center py-4">No evaluators found.</div>
          ) : (
            filteredEvaluators.map(ev => (
              <div key={ev.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                <input 
                  type="checkbox" 
                  checked={selectedEvaluators.includes(ev.id)} 
                  onChange={() => handleEvaluatorToggle(ev.id)}
                  className="h-4 w-4 text-blue-600"
                  disabled={ev.status !== 'active'}
                />
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                  {ev.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 text-sm">{ev.name}</div>
                  <div className="text-xs text-gray-500">{ev.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(ev.status)}
                  <span className="text-xs text-gray-500">{getStatusText(ev.status)}</span>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Assignment Preview */}
        {multipleJudgesMode && selectedEvaluators.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-blue-800 text-sm font-semibold">Assignment Preview</span>
            </div>
            <div className="text-sm text-blue-700">
              {judgesPerProjectMode === 'manual' ? (
                <div>
                  <span>Each project will have {judgesPerProject} judge(s)</span>
                  <div className="flex items-center gap-1 mt-1">
                    {[...Array(Math.min(judgesPerProject, 5))].map((_, i) => (
                      <Users key={i} className="w-3 h-3 text-blue-600" />
                    ))}
                    {judgesPerProject > 5 && (
                      <span className="text-xs text-blue-600 font-medium">+{judgesPerProject - 5}</span>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <span>Equal distribution: {Math.ceil(selectedEvaluators.length / selectedCount)} judges per project</span>
                  <div className="flex items-center gap-1 mt-1">
                    {[...Array(Math.min(Math.ceil(selectedEvaluators.length / selectedCount), 5))].map((_, i) => (
                      <Users key={i} className="w-3 h-3 text-blue-600" />
                    ))}
                    {Math.ceil(selectedEvaluators.length / selectedCount) > 5 && (
                      <span className="text-xs text-blue-600 font-medium">+{Math.ceil(selectedEvaluators.length / selectedCount) - 5}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Warning Bar */}
        {!multipleJudgesMode && totalAssigned < actualSubmissionCount && selectedEvaluators.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">i</span>
                </div>
                <span className="text-orange-800 text-sm">
                  {actualSubmissionCount - totalAssigned} submission(s) still need to be assigned!
                </span>
              </div>
              <button 
                className="text-blue-600 text-sm font-semibold hover:text-blue-700"
                onClick={handleAssignEqually}
              >
                Assign equally
              </button>
            </div>
          </div>
        )}
        
        {/* Bottom Action Bar */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <button 
            className="flex items-center gap-2 text-gray-700 hover:text-blue-700 font-medium text-sm" 
            onClick={() => setShowAddEvaluatorModal(true)}
          >
            <UserPlus className="w-4 h-4" />
            Evaluator
          </button>
          <button 
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              selectedEvaluators.length > 0 && (multipleJudgesMode ? true : totalAssigned <= actualSubmissionCount)
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            onClick={handleAssign} 
            disabled={selectedEvaluators.length === 0 || (multipleJudgesMode ? false : totalAssigned > actualSubmissionCount) || assignLoading}
          >
            {assignLoading ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </DialogContent>
      
      {/* Add Evaluator Modal */}
      <AddEvaluatorModal
        open={showAddEvaluatorModal}
        onClose={() => setShowAddEvaluatorModal(false)}
        hackathonId={hackathonId}
        onEvaluatorAdded={handleEvaluatorAdded}
      />
    </Dialog>
  );
} 