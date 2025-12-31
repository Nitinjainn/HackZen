"use client";
import { useEffect, useState, useRef } from "react";
import {
  ArrowLeft,
  Plus,
  Users,
  Calendar,
  Trophy,
  Settings,
  Eye,
  Edit,
  Edit3,
  Trash2,
  BarChart3,
  Check,
  Clock,
  MapPin,
} from "lucide-react";
import { API_BASE_URL } from "../../../lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/CommonUI/card";
import {
  ACard,
  ACardContent,
  ACardDescription,
  ACardHeader,
  ACardTitle,
} from "../../../components/DashboardUI/AnimatedCard";
import { Button } from "../../../components/CommonUI/button";
import { Badge } from "../../../components/CommonUI/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/CommonUI/tabs";
import { Progress } from "../../../components/DashboardUI/progress";
import HackathonDetailModal from "./components/HackathonDetailModal";
import HackathonEditModal from "./components/HackathonEditModal"; // Adjust path
import CustomSubmissionForm from "./components/CustomSubmissionForm";
import InnerCreatedCard from "./components/InnerCreatedCard"; // Adjust path
import { cn } from "../../../lib/utils";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
// import { Modal } from '../../../components/CommonUI/modal'; // If you have a modal component, else use a div

export function CreatedHackathons({ onCreateNew }) {
  const [hackathons, setHackathons] = useState([]);
  const [editHackathon, setEditHackathon] = useState(null);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [submissionHackathon, setSubmissionHackathon] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showInnerCard, setShowInnerCard] = useState(false);
  const [innerCardHackathon, setInnerCardHackathon] = useState(null);
  const hackathonToDelete = useRef(null);
  const navigate = useNavigate();
  const { hackathonId } = useParams();
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [sponsorProposals, setSponsorProposals] = useState([]);
  const [selectedHackathonId, setSelectedHackathonId] = useState(null);
  const [loadingProposals, setLoadingProposals] = useState(false);
  // NEW: Track pending sponsor proposal counts for each hackathon
  const [pendingSponsorCounts, setPendingSponsorCounts] = useState({});

  useEffect(() => {
    const fetchHackathons = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("${API_BASE_URL}/api/hackathons/my", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        setHackathons(data);
      } catch (err) {
        console.error("Failed to load hackathons", err);
      }
    };

    fetchHackathons();
  }, []);

  // NEW: Fetch pending sponsor proposal counts for all hackathons
  useEffect(() => {
    if (hackathons.length === 0) return;
    let ignore = false;
    const fetchCounts = async () => {
      const counts = {};
      await Promise.all(
        hackathons.map(async (h) => {
          try {
            const res = await fetch(`${API_BASE_URL}/api/sponsor-proposals/${h._id}`);
            const data = await res.json();
            counts[h._id] = Array.isArray(data) ? data.filter(p => p.status === 'pending').length : 0;
          } catch {
            counts[h._id] = 0;
          }
        })
      );
      if (!ignore) setPendingSponsorCounts(counts);
    };
    fetchCounts();
    return () => { ignore = true; };
  }, [hackathons]);

  useEffect(() => {
    if (hackathonId && hackathons.length > 0) {
      const found = hackathons.find((h) => h._id === hackathonId);
      if (found) {
        setInnerCardHackathon(found);
        setShowInnerCard(true);
      }
    } else {
      setShowInnerCard(false);
    }
  }, [hackathonId, hackathons]);

  const liveHackathons = hackathons.filter((h) => h.status === "ongoing");
  const completedHackathons = hackathons.filter((h) => h.status === "ended");
  const draftHackathons = hackathons.filter((h) => h.status === "draft");
  const pendingHackathons = hackathons.filter(
    (h) => h.approvalStatus === "pending"
  );
  const approvedHackathons = hackathons.filter(
    (h) => h.approvalStatus === "approved"
  );
  const rejectedHackathons = hackathons.filter(
    (h) => h.approvalStatus === "rejected"
  );

  const registrationOpenHackathons = hackathons.filter(
    (h) => new Date(h.registrationDeadline) > new Date()
  );

  const handleCardClick = (hackathon) => {
    navigate(`/dashboard/created-hackathons/${hackathon._id}`);
  };

  const confirmDelete = async () => {
    const hackathon = hackathonToDelete.current;
    if (!hackathon) return;
    setDeletingId(hackathon._id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE_URL}/api/hackathons/${hackathon._id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Failed to delete hackathon");
      setHackathons((prev) => prev.filter((h) => h._id !== hackathon._id));
      setShowDeleteDialog(false);
      hackathonToDelete.current = null;
    } catch {
      toast.error("Error deleting hackathon");
    } finally {
      setDeletingId(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    hackathonToDelete.current = null;
  };

  const fetchSponsorProposals = async (hackathonId) => {
    setLoadingProposals(true);
    setSelectedHackathonId(hackathonId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/sponsor-proposals/${hackathonId}`);
      const data = await res.json();
      setSponsorProposals(data);
      setShowSponsorModal(true);
    } catch {
      setSponsorProposals([]);
      setShowSponsorModal(true);
    } finally {
      setLoadingProposals(false);
    }
  };

  // Approve/Reject proposal
  const updateProposalStatus = async (proposalId, status) => {
    await fetch(`${API_BASE_URL}/api/sponsor-proposals/${proposalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    // Refresh proposals
    fetchSponsorProposals(selectedHackathonId);
  };

  // Update renderHackathonCard to accept pendingCount as a prop
  const renderHackathonCard = (hackathon, featured = false, pendingCount = 0) => {
    const registrationDeadline = new Date(hackathon.registrationDeadline);
    const today = new Date();
    const daysLeft = Math.ceil(
      (registrationDeadline - today) / (1000 * 60 * 60 * 24)
    );

    const deadlineLabel = isNaN(daysLeft)
      ? "TBA"
      : daysLeft > 0
      ? `${daysLeft} day${daysLeft > 1 ? "s" : ""} left`
      : "Closed";

    return (
      <Card
        key={hackathon._id}
        className={cn(
          "w-full max-w-xs flex flex-col overflow-hidden cursor-pointer rounded-xl transition-transform duration-300 hover:scale-[1.02] shadow-md hover:shadow-lg",
          featured && "ring-2 ring-purple-300"
        )}
        onClick={() => handleCardClick(hackathon)}
      >
        {/* Thumbnail with status badge */}
        <div className="relative h-40 w-full">
          <img
            src={
              hackathon.images?.logo?.url ||
              hackathon.images?.banner?.url ||
              "/assets/default-banner.png"
            }
            alt={hackathon.title}
            className="w-full h-full object-cover transition-transform duration-300"
          />

          {/* Status Badge */}
          <div className="absolute top-2 right-2">
            {hackathon.approvalStatus === "approved" && (
              <Badge className="bg-green-500 text-white font-semibold shadow-md">
                Approved
              </Badge>
            )}
            {hackathon.approvalStatus === "pending" && (
              <Badge className="bg-yellow-400 text-yellow-900 font-semibold shadow-md">
                Pending
              </Badge>
            )}
            {hackathon.approvalStatus === "rejected" && (
              <Badge className="bg-red-500 text-white font-semibold shadow-md">
                Rejected
              </Badge>
            )}
            {/* If draft, show Draft badge */}
            {hackathon.status === "draft" && (
              <Badge className="bg-gray-400 text-white font-semibold shadow-md">
                Draft
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-2">
          {/* Title */}
          <h3 className="text-md font-semibold text-indigo-700 leading-tight line-clamp-2 h-10">
            {hackathon.title}
          </h3>

          {/* Date and Participants */}
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>
                {new Date(hackathon.startDate).toLocaleDateString("en-GB")} -{" "}
                {new Date(hackathon.endDate).toLocaleDateString("en-GB")}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>
                {hackathon.participantCount || 0}/{hackathon.maxParticipants}{" "}
                participants
              </span>
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              <span>{hackathon.submissions?.length || 0} submissions</span>
            </div>
          </div>

          {/* Location + Registration Deadline */}
          <div className="text-xs text-gray-500 flex justify-between items-center pt-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {hackathon.location || "TBA"}
            </span>
            <span className="flex items-center gap-1 text-red-600 font-medium">
              <Clock className="w-3 h-3" />
              {deadlineLabel}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-2">
            {/* Removed Edit and Manage buttons as per new requirements */}
            {pendingCount > 0 && (
              <Button size="sm" variant="outline" className="border-yellow-500 text-yellow-700" onClick={e => { e.stopPropagation(); fetchSponsorProposals(hackathon._id); }}>
                Sponsored PS Pending ({pendingCount})
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  if (showInnerCard && innerCardHackathon) {
    return (
      <InnerCreatedCard
        hackathon={innerCardHackathon}
       onBack={(postBack) => {
          setShowInnerCard(false);
          setTimeout(() => {
            if (typeof postBack === 'function') postBack();
          },0);
}}
        onEdit={(hackathon) => {
          setEditHackathon(hackathon);
          setShowInnerCard(false);
          navigate("/dashboard/created-hackathons");
        }}
      />
    );
  }

  return (
    <>
      {showSubmissionForm ? (
        <CustomSubmissionForm
          hackathon={submissionHackathon}
          onCancel={() => {
            setShowSubmissionForm(false);
            setSubmissionHackathon(null);
          }}
        />
      ) : (
        <div className="min-h-screen flex-1 space-y-6 p-4 sm:p-6 bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Created Hackathons
              </h1>
              <p className="text-sm text-gray-500">
                Manage and monitor your organized events
              </p>
            </div>
            <Button className="flex items-center gap-2 w-full sm:w-auto" onClick={onCreateNew}>
              <Plus className="w-4 h-4" />
              Create New Hackathon
            </Button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 w-full">
            <ACard>
              <ACardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{hackathons.length}</p>
                    <p className="text-sm text-gray-500">Total Events</p>
                  </div>
                </div>
              </ACardContent>
            </ACard>
            <ACard>
              <ACardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <Settings className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {liveHackathons.length}
                    </p>
                    <p className="text-sm text-gray-500">Active Now</p>
                  </div>
                </div>
              </ACardContent>
            </ACard>
            <ACard>
              <ACardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {pendingHackathons.length}
                    </p>
                    <p className="text-sm text-gray-500">Pending Approval</p>
                  </div>
                </div>
              </ACardContent>
            </ACard>
            <ACard>
              <ACardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <Check className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {approvedHackathons.length}
                    </p>
                    <p className="text-sm text-gray-500">Approved</p>
                  </div>
                </div>
              </ACardContent>
            </ACard>
          </div>

          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="flex flex-wrap gap-2">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="live">Live</TabsTrigger>
              <TabsTrigger value="registration">Registration Open</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="draft">Drafts</TabsTrigger>
              <TabsTrigger value="pending">Pending Approval</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {hackathons.map(h => renderHackathonCard(h, false, pendingSponsorCounts[h._id] || 0))}
              </div>
            </TabsContent>
            <TabsContent value="live" className="space-y-4">
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {liveHackathons.map(h => renderHackathonCard(h, false, pendingSponsorCounts[h._id] || 0))}
              </div>
            </TabsContent>
            <TabsContent value="registration" className="space-y-4">
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {registrationOpenHackathons.map(h => renderHackathonCard(h, false, pendingSponsorCounts[h._id] || 0))}
              </div>
            </TabsContent>
            <TabsContent value="completed" className="space-y-4">
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {completedHackathons.map(h => renderHackathonCard(h, false, pendingSponsorCounts[h._id] || 0))}
              </div>
            </TabsContent>
            <TabsContent value="draft" className="space-y-4">
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {draftHackathons.map(h => renderHackathonCard(h, false, pendingSponsorCounts[h._id] || 0))}
              </div>
            </TabsContent>
            <TabsContent value="pending" className="space-y-4">
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {pendingHackathons.map(h => renderHackathonCard(h, false, pendingSponsorCounts[h._id] || 0))}
              </div>
            </TabsContent>
            <TabsContent value="approved" className="space-y-4">
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {approvedHackathons.map(h => renderHackathonCard(h, false, pendingSponsorCounts[h._id] || 0))}
              </div>
            </TabsContent>
            <TabsContent value="rejected" className="space-y-4">
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {rejectedHackathons.map(h => renderHackathonCard(h, false, pendingSponsorCounts[h._id] || 0))}
              </div>
            </TabsContent>
          </Tabs>

          {editHackathon && (
            <HackathonEditModal
              hackathon={editHackathon}
              onClose={() => setEditHackathon(null)}
              onUpdated={() => {
                setEditHackathon(null);
                window.location.reload(); // OR re-fetch if you prefer
              }}
            />
          )}

          {/* Delete Confirmation Dialog */}
          {showDeleteDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
                <h2 className="text-lg font-bold mb-2">Delete Hackathon?</h2>
                <p className="mb-4 text-gray-700">
                  Are you sure you want to delete this hackathon? This action
                  cannot be undone.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="destructive"
                    onClick={confirmDelete}
                    disabled={deletingId !== null}
                    className="flex-1"
                  >
                    {deletingId !== null ? "Deleting..." : "Delete"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={cancelDelete}
                    className="flex-1"
                    disabled={deletingId !== null}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Sponsor Proposals Modal */}
          {showSponsorModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full relative overflow-y-auto max-h-[90vh]">
                <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl font-bold" onClick={() => setShowSponsorModal(false)}>&times;</button>
                <h2 className="text-xl font-bold mb-4">Sponsored Problem Statement Proposals</h2>
                {loadingProposals ? (
                  <div>Loading...</div>
                ) : sponsorProposals.length === 0 ? (
                  <div className="text-gray-500">No proposals found.</div>
                ) : (
                  <div className="space-y-6">
                    {sponsorProposals.map((p) => (
                      <div key={p._id} className="border rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <div className="font-semibold text-lg">{p.title}</div>
                          <span className={p.status === 'pending' ? 'text-yellow-600' : p.status === 'approved' ? 'text-green-600' : 'text-red-600'}>{p.status}</span>
                        </div>
                        <div className="text-sm text-gray-700 mb-1"><b>By:</b> {p.name} ({p.email}) | {p.organization}</div>
                        <div className="text-xs text-gray-500 mb-2">Submitted: {new Date(p.createdAt).toLocaleString()}</div>
                        <div className="mb-2"><b>Description:</b> {p.description}</div>
                        <div className="mb-2"><b>Deliverables:</b> {p.deliverables}</div>
                        <div className="mb-2"><b>Tech Stack:</b> {p.techStack}</div>
                        <div className="mb-2"><b>Target Audience:</b> {p.targetAudience}</div>
                        <div className="mb-2"><b>Prize:</b> {p.prizeAmount} - {p.prizeDescription}</div>
                        <div className="mb-2"><b>Judging:</b> {p.provideJudges === 'yes' ? `Sponsor Provided (${p.judgeName}, ${p.judgeEmail}, ${p.judgeRole})` : 'Organizer Assigned'}</div>
                        <div className="mb-2"><b>Timeline:</b> {p.customStartDate ? new Date(p.customStartDate).toLocaleDateString() : 'N/A'} - {p.customDeadline ? new Date(p.customDeadline).toLocaleDateString() : 'N/A'}</div>
                        <div className="mb-2"><b>Notes:</b> {p.notes || 'None'}</div>
                        {p.status === 'pending' && (
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => updateProposalStatus(p._id, 'approved')}>Approve</Button>
                            <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white" onClick={() => updateProposalStatus(p._id, 'rejected')}>Reject</Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default CreatedHackathons;
