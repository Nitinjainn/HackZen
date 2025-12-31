"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../../../../../lib/api";
import { Button } from "../../../../../../components/CommonUI/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../../../components/CommonUI/card";
import { AlertCircle, Users, UserPlus, Copy, Edit, LogOut, Plus, UserCheck, X } from "lucide-react";
import { Badge } from "../../../../../../components/CommonUI/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../../../../components/DashboardUI/avatar";

import InviteModal from "./TeamModals/InviteModal";
import JoinTeamModal from "./TeamModals/JoinTeamModal";
import EditDescriptionModal from "./TeamModals/EditDescriptionModal";
import UnregisterDialog from "./TeamModals/UnregisterDialog";
import RevokeInviteDialog from "./TeamModals/RevokeInviteDialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "../../../../../../components/DashboardUI/alert-dialog";
import { Trash2 } from "lucide-react";
import { HackathonRegistration } from "../../../components/RegistrationHackathon";
import { Input } from "../../../../../../components/CommonUI/input";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import EditTeamNameModal from "./TeamModals/EditTeamNameModal";

export default function TeamManagementSection({
  hackathon,
  isRegistered,
  setIsRegistered,
  refreshRegistrationStatus,
  sectionRef,
  user,
  toast,
  setShowRegistration,
}) {
  // All hooks at the very top
  const [userTeams, setUserTeams] = useState([]);
  const [teamInvites, setTeamInvites] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [copiedTeamId, setCopiedTeamId] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showJoinTeam, setShowJoinTeam] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [showUnregisterDialog, setShowUnregisterDialog] = useState(false);
  const [revokeInviteData, setRevokeInviteData] = useState(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showJoinByCodeModal, setShowJoinByCodeModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joiningTeam, setJoiningTeam] = useState(false);
  const [pendingTeam, setPendingTeam] = useState(null);
  const [showJoinRegistration, setShowJoinRegistration] = useState(false);
  const [joinError, setJoinError] = useState("");
  const navigate = useNavigate();
  const [editingTeamName, setEditingTeamName] = useState(null);
  const [updatingTeamName, setUpdatingTeamName] = useState(false);

  // Add this handler at the top with other handlers
  const handleShowInviteModal = (team) => {
    if (team.leader._id?.toString() !== user?._id?.toString()) return;
    setSelectedTeam(team);
    setShowInviteModal(true);
  };

  useEffect(() => {
    if (hackathon && hackathon._id) {
      fetchUserTeams();
      fetchTeamInvites();
    }
  }, [hackathon && hackathon._id]);

  useEffect(() => {
    if (!hackathon || !hackathon._id) return;
    const interval = setInterval(() => {
      fetchTeamInvites();
    }, 10000);
    return () => clearInterval(interval);
  }, [hackathon && hackathon._id]);

  // Handler for joining by code
  const handleJoinByCode = async () => {
    setJoiningTeam(true);
    setJoinError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE_URL}/api/teams/join/${joinCode}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingTeam(res.data.team);
      setShowJoinByCodeModal(false);
      setShowJoinRegistration(true);
    } catch (err) {
      setJoinError(err?.response?.data?.error || "Invalid or expired team code");
    } finally {
      setJoiningTeam(false);
    }
  };

  // Handler for registration after joining by code
  const handleJoinRegistration = async (formData) => {
    console.log("handleJoinRegistration called", formData);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "${API_BASE_URL}/api/registration",
        {
          hackathonId: hackathon._id,
          formData,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: "Registered!", description: "You have joined the team and registered for the hackathon." });
      setShowJoinRegistration(false);
      fetchUserTeams();
      refreshRegistrationStatus();
      navigate("/dashboard/my-hackathons");
    } catch (err) {
      toast({ title: "Error", description: err?.response?.data?.message || "Registration failed" });
      navigate("/dashboard/my-hackathons");
    }
  };

  // Handler for deleting a team (with UI update/redirect)
  const handleDeleteTeam = async (teamId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/api/teams/${teamId}`,
        { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: "Deleted", description: "Team has been deleted" });
      await fetchUserTeams();
      await refreshRegistrationStatus();
      setUserTeams([]);
      setTimeout(() => {
        toast({ title: "No Team", description: "You are no longer part of any team for this hackathon." });
      }, 500);
    } catch (err) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Could not delete team",
      });
    }
  };

  const handleLeaveTeam = async (teamId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/api/teams/${teamId}/leave`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: "Left Team", description: "You have left the team." });
      fetchUserTeams();
      refreshRegistrationStatus();
    } catch (err) {
      toast({ title: "Error", description: "Could not leave team" });
    }
  };

  // Add handler for removing a member (leader only)
  const handleRemoveMember = async (teamId, memberId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/api/teams/${teamId}/members/${memberId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: "Removed", description: "Member removed from team." });
      fetchUserTeams();
      refreshRegistrationStatus();
    } catch (err) {
      toast({ title: "Error", description: err?.response?.data?.error || "Could not remove member" });
    }
  };

  const fetchUserTeams = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE_URL}/api/teams/hackathon/${hackathon._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Fetched teams:", res.data);
      setUserTeams(res.data);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        toast({ title: "Session expired", description: "Please log in again." });
      } else {
        console.error("Error fetching teams", err);
      }
    }
  };

  const fetchTeamInvites = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE_URL}/api/team-invites/hackathon/${hackathon._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Fetched team invites:", res.data);
      setTeamInvites(res.data);
    } catch (err) {
      console.error("Error fetching invites", err);
    }
  };
  
  const handleJoinTeam = async (teamCode) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE_URL}/api/teams/join/${teamCode}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { projectId: hackathon._id },
        }
      );
      toast({
        title: "Joined!",
        description: `You joined team: ${res.data.name}`,
      });
      setShowJoinTeam(false);
      fetchUserTeams();
      refreshRegistrationStatus();
    } catch (err) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to join team",
      });
    }
  };

  const handleEditDescription = async (teamId, newDescription) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE_URL}/api/teams/${teamId}/description`,
        { description: newDescription },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: "Updated", description: "Team description updated" });
      setEditingTeam(null);
      fetchUserTeams();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update team description",
      });
    }
  };

  // Use the same simple logic as the old working system
  const pendingInvites = teamInvites.filter(invite => invite.status === "pending");

  // Debug logging
  console.log("Team Management Debug:", {
    userTeams: userTeams.length,
    myTeam: userTeams[0]?._id,
    myTeamLeader: userTeams[0]?.leader?._id,
    currentUser: user?._id,
    isLeader: userTeams[0]?.leader._id?.toString() === user?._id?.toString(),
    teamInvites: teamInvites.length,
    pendingInvites: pendingInvites.length,
    pendingInvitesData: pendingInvites.map(invite => ({
      id: invite._id,
      email: invite.invitedEmail,
      status: invite.status,
      teamId: invite.team._id,
      teamLeader: invite.team.leader?._id,
      canRevoke: invite.team.leader?._id?.toString() === user?._id?.toString()
    }))
  });

  return (
    <>
      <section ref={sectionRef} className="space-y-6 max-w-5xl mx-auto">
        {/* Main Container Card */}
        <Card className="shadow-none hover:shadow-none">
          {/* Section Header */}
          <CardHeader className="border-b border-gray-100 bg-gray-50/50">
            <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <div className="w-1 h-8 bg-indigo-500 rounded-full"></div>
              Team Management
            </CardTitle>
          </CardHeader>

          <CardContent className="p-8 space-y-8">
            {!isRegistered ? (
              // Unregistered User Section
              <div className="space-y-4">
                <div className="flex items-center gap-3 my-4">
                  <h3 className="text-xl font-semibold text-gray-900">Get Started</h3>
                </div>
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-6 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Users className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h4 className="text-2xl font-bold text-gray-800 mb-3">Team Up for Success!</h4>
                  <p className="text-gray-700 leading-relaxed text-lg mb-8 max-w-2xl mx-auto">
                    Hackathons are better with a team. Collaborate, share ideas, and build something amazing together. You can either create a new team or join an existing one using a team code.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700"
                      onClick={() => setShowRegistration(false)}
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Create a Team
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => setShowJoinByCodeModal(true)}
                    >
                      <UserPlus className="w-5 h-5 mr-2" />
                      Join with a Code
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              // Registered User Section
              <>
                {/* Team Creation Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 my-4">
                    <h3 className="text-xl font-semibold text-gray-900">Your Team</h3>
                  </div>
                  
                  {userTeams.length > 0 ? (
                    // Show existing team
                    userTeams.map((team) => (
                      <div key={team._id} className="space-y-6">
                        {/* Team Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <h4 className="text-lg font-semibold text-gray-900">
                              {team.name}
                            </h4>
                            {team.leader._id?.toString() === user?._id?.toString() && (
                              <Button size="sm" variant="ghost" onClick={() => setEditingTeamName(team)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setShowUnregisterDialog(true)}
                          >
                            Cancel Team
                          </Button>
                        </div>

                        {/* Team Members */}
                        <div>
                          <div className="flex items-center gap-3 mb-4">
                            <Users className="w-5 h-5 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">
                              Team Members ({team.members.length}/{team.maxMembers})
                            </span>
                          </div>
                          
                          <ul className="space-y-3">
                            {/* Team Leader */}
                            <li className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-indigo-600 font-semibold text-sm">
                                  {team.leader.name?.[0]?.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h5 className="font-medium text-gray-900">{team.leader.name}</h5>
                                    <p className="text-sm text-gray-600">{team.leader.email}</p>
                                  </div>
                                  <Badge variant="outline">
                                    Leader
                                  </Badge>
                                </div>
                              </div>
                            </li>

                            {/* Other Members */}
                            {team.members
                              .filter(member => member._id !== team.leader._id)
                              .map((member) => (
                                <li key={member._id} className="flex items-start gap-3">
                                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-gray-600 font-semibold text-sm">
                                      {member.name?.[0]?.toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h5 className="font-medium text-gray-900">{member.name}</h5>
                                        <p className="text-sm text-gray-600">{member.email}</p>
                                      </div>
                                      {team.leader._id?.toString() === user?._id?.toString() && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => handleRemoveMember(team._id, member._id)}
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </li>
                              ))}

                            {/* Add Member Button */}
                            {team.leader._id?.toString() === user?._id?.toString() && team.members.length < team.maxMembers && (
                              <li className="flex items-start gap-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full border-dashed border-2 border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600"
                                  onClick={() => handleShowInviteModal(team)}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add Team Member
                                </Button>
                              </li>
                            )}
                          </ul>
                        </div>

                        {/* Team Actions */}
                        <div className="flex flex-wrap gap-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (navigator.clipboard && navigator.clipboard.writeText) {
                                navigator.clipboard.writeText(team.teamCode).then(() => {
                                  setCopiedTeamId(team._id);
                                  toast.success("Team code copied to clipboard!");
                                  setTimeout(() => setCopiedTeamId(null), 1500);
                                }).catch(() => {
                                  const textArea = document.createElement("textarea");
                                  textArea.value = team.teamCode;
                                  document.body.appendChild(textArea);
                                  textArea.select();
                                  document.execCommand('copy');
                                  document.body.removeChild(textArea);
                                  setCopiedTeamId(team._id);
                                  toast.success("Team code copied to clipboard!");
                                  setTimeout(() => setCopiedTeamId(null), 1500);
                                });
                              }
                            }}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            {copiedTeamId === team._id ? "Copied!" : "Copy Team Code"}
                          </Button>
                          
                          {team.leader._id?.toString() !== user?._id?.toString() && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-orange-600 border-orange-600 hover:bg-orange-50"
                                >
                                  <LogOut className="w-4 h-4 mr-2" />
                                  Leave Team
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Leave Team?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to leave the team <span className="font-semibold">{team.name}</span>? You will be removed from the team and the hackathon.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleLeaveTeam(team._id)}
                                    className="bg-orange-600 hover:bg-orange-700 text-white"
                                  >
                                    Yes, Leave
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    // Show create team options
                    <div className="text-center py-8">
                      <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-600 text-lg mb-6">You haven't created or joined a team yet.</p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                          onClick={() => setShowCreateTeam(true)}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create New Team
                        </Button>
                        <Button
                          onClick={() => setShowJoinTeam(true)}
                          variant="outline"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Join Existing Team
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <hr />

                {/* Pending Invitations Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 my-4">
                    <h3 className="text-xl font-semibold text-gray-900">Pending Invitations</h3>
                  </div>
                  
                  {pendingInvites.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <UserCheck className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500 text-lg">No pending invitations</p>
                      <p className="text-gray-400 text-sm mt-2">Invited members will appear here</p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {pendingInvites.map((invite) => (
                        <li key={invite._id} className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-yellow-600 font-semibold text-sm">
                              {invite.invitedEmail[0].toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-medium text-gray-900">
                                  {invite.invitedEmail.split('@')[0]}
                                </h5>
                                <p className="text-sm text-gray-600">{invite.invitedEmail}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                                  Pending
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => setRevokeInviteData(invite)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Join by code modal */}
      {showJoinByCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Join Team by Code</h2>
            <Input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              placeholder="Enter team code"
              className="mb-4"
            />
            {joinError && <div className="text-red-600 mb-2">{joinError}</div>}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowJoinByCodeModal(false)}>Cancel</Button>
              <Button
                variant="blue"
                onClick={handleJoinByCode}
                disabled={joiningTeam || !joinCode.trim()}
              >
                {joiningTeam ? "Joining..." : "Join"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Registration form after joining by code */}
      {showJoinRegistration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-2xl">
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <p className="text-lg font-semibold text-blue-900">
                You are joining team <span className="font-bold">{pendingTeam?.name}</span> for hackathon <span className="font-bold">{hackathon?.title}</span>!
              </p>
            </div>
            <HackathonRegistration
              hackathon={hackathon}
              onBack={() => setShowJoinRegistration(false)}
              onSuccess={handleJoinRegistration}
              inviteMode={true}
            />
          </div>
        </div>
      )}

      {/* --- MODALS AND DIALOGS (Remain Unchanged) --- */}
      <InviteModal
        show={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        team={selectedTeam}
        hackathon={hackathon}
        onInviteSent={fetchTeamInvites}
      />
      <JoinTeamModal
        open={showJoinTeam}
        onClose={() => setShowJoinTeam(false)}
        onJoin={handleJoinTeam}
      />
      <EditDescriptionModal
        team={editingTeam}
        open={!!editingTeam}
        onClose={() => setEditingTeam(null)}
        onSave={(desc) => handleEditDescription(editingTeam._id, desc)}
      />
      <EditTeamNameModal
        open={!!editingTeamName}
        onClose={() => setEditingTeamName(null)}
        defaultValue={editingTeamName?.name || ""}
        loading={updatingTeamName}
        onSave={async (newName) => {
          setUpdatingTeamName(true);
          try {
            const token = localStorage.getItem("token");
            await axios.put(
              `${API_BASE_URL}/api/teams/${editingTeamName._id}/name`,
              { name: newName },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            setEditingTeamName(null);
            fetchUserTeams();
            toast({ title: "Team name updated!", description: "Your team name has been updated.", variant: "success" });
          } catch  {
            toast({ title: "Error", description: "Failed to update team name.", variant: "destructive" });
          } finally {
            setUpdatingTeamName(false);
          }
        }}
      />
      <RevokeInviteDialog
        open={!!revokeInviteData}
        invite={revokeInviteData}
        onClose={() => setRevokeInviteData(null)}
        onRevoked={fetchTeamInvites}
      />
      <AlertDialog open={showUnregisterDialog} onOpenChange={setShowUnregisterDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Team?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your team? This will delete the team and remove all members.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Team</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (userTeams[0]) {
                  handleDeleteTeam(userTeams[0]._id);
                }
                setShowUnregisterDialog(false);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, Cancel Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
