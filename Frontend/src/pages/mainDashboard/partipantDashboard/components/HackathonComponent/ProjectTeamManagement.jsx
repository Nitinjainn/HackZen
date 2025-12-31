"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../../../../lib/api";
import { Button } from "../../../../components/CommonUI/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../components/CommonUI/card";
import { AlertCircle, Users, UserPlus, Copy, Edit, LogOut } from "lucide-react";
import { Badge } from "../../../../components/CommonUI/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../../components/DashboardUI/avatar";

import InviteModal from "./Hackathon/TeamModals/InviteModal";
import JoinTeamModal from "./Hackathon/TeamModals/JoinTeamModal";
import EditDescriptionModal from "./Hackathon/TeamModals/EditDescriptionModal";
import RevokeInviteDialog from "./Hackathon/TeamModals/RevokeInviteDialog";

export default function ProjectTeamManagement({
  project,
  user,
  toast,
  onTeamUpdate,
}) {
  const [userTeams, setUserTeams] = useState([]);
  const [teamInvites, setTeamInvites] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [copiedTeamId, setCopiedTeamId] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showJoinTeam, setShowJoinTeam] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [revokeInviteData, setRevokeInviteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch teams for this project
  const fetchUserTeams = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE_URL}/api/teams/project/${project._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserTeams(res.data);
    } catch (err) {
      setError("Failed to fetch teams. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch invites for this project
  const fetchTeamInvites = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE_URL}/api/team-invites/project/${project._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTeamInvites(res.data);
    } catch (err) {
      setError("Failed to fetch invites. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (project && project._id) {
      fetchUserTeams();
      fetchTeamInvites();
    }
  }, [project._id]);

  // Join team by code
  const handleJoinTeam = async (teamCode) => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE_URL}/api/teams/join/${teamCode}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { projectId: project._id },
        }
      );
      toast({ title: "Joined!", description: `You joined team: ${res.data.team.name}` });
      setShowJoinTeam(false);
      fetchUserTeams();
      fetchTeamInvites();
      onTeamUpdate?.();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to join team");
      toast({ title: "Error", description: err?.response?.data?.error || "Failed to join team" });
    } finally {
      setLoading(false);
    }
  };

  // Edit team description
  const handleEditDescription = async (teamId, newDescription) => {
    setLoading(true);
    setError("");
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
      onTeamUpdate?.();
    } catch (err) {
      setError("Failed to update team description");
      toast({ title: "Error", description: "Failed to update team description" });
    } finally {
      setLoading(false);
    }
  };

  // Delete team
  const handleDeleteTeam = async (teamId) => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/api/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: "Deleted", description: "Team has been deleted" });
      fetchUserTeams();
      fetchTeamInvites();
      onTeamUpdate?.();
    } catch (err) {
      setError("Could not delete team");
      toast({ title: "Error", description: err?.response?.data?.message || "Could not delete team" });
    } finally {
      setLoading(false);
    }
  };

  // Leave team
  const handleLeaveTeam = async (teamId) => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/api/teams/${teamId}/leave`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: "Left Team", description: "You have left the team." });
      fetchUserTeams();
      fetchTeamInvites();
      onTeamUpdate?.();
    } catch (err) {
      setError("Could not leave team");
      toast({ title: "Error", description: "Could not leave team" });
    } finally {
      setLoading(false);
    }
  };

  // UI rendering
  return (
    <div className="space-y-6">
      {error && <div className="text-red-600 text-center font-semibold">{error}</div>}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Project Team Management
            </span>
            {userTeams.length === 0 && (
              <Button
                onClick={() => setShowJoinTeam(true)}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Join Team
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : userTeams.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Team Yet</h3>
              <p className="text-gray-600 mb-4">
                Join or create a team to collaborate on this project.
              </p>
              <Button
                onClick={() => setShowJoinTeam(true)}
                className="flex-1 sm:flex-none"
                disabled={loading}
              >
                <Users className="w-4 h-4 mr-2" />
                Join Team
              </Button>
            </div>
          ) : (
            userTeams.map((team) => {
              const isLeader = team.leader && user && String(team.leader._id) === String(user._id);
              const teamFull = team.members.length >= team.maxMembers;
              return (
                <div
                  key={team._id}
                  className="mb-4 p-4 border rounded-lg bg-gray-50"
                >
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h4 className="font-semibold text-lg flex items-center gap-2">
                        {team.name}
                        {isLeader && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="ml-2"
                            disabled={loading}
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
                                handleDeleteTeam(team._id);
                              }
                            }}
                          >
                            Delete Team
                          </Button>
                        )}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Code: {" "}
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {team.teamCode}
                        </span>
                      </p>
                    </div>
                    <Badge variant="default">
                      {team.members.length}/{team.maxMembers}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {team.members.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border"
                      >
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>{member.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{member.name}</span>
                        {member._id === team.leader._id && (
                          <Badge variant="secondary">Leader</Badge>
                        )}
                      </div>
                    ))}
                  </div>

                  {team.description && (
                    <p className="text-sm text-gray-700 mt-2">
                      <span className="font-medium text-gray-600">
                        Description:
                      </span>{" "}
                      {team.description}
                    </p>
                  )}

                  <div className="flex gap-2 mt-3 flex-wrap">
                    {!teamFull && isLeader && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTeam(team);
                          setShowInviteModal(true);
                        }}
                        disabled={loading}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(team.teamCode);
                        setCopiedTeamId(team._id);
                        toast({
                          title: "Copied",
                          description: "Team code copied",
                        });
                        setTimeout(() => setCopiedTeamId(null), 1500);
                      }}
                      disabled={loading}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Code
                    </Button>

                    {isLeader ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingTeam(team)}
                          disabled={loading}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-orange-600 border-orange-600 hover:bg-orange-50"
                          onClick={() => handleLeaveTeam(team._id)}
                          disabled={loading}
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Leave
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-orange-600 border-orange-600 hover:bg-orange-50"
                        onClick={() => handleLeaveTeam(team._id)}
                        disabled={loading}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Leave
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {teamInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invites</CardTitle>
          </CardHeader>
          <CardContent>
            {teamInvites.map((invite) => (
              <div
                key={invite._id}
                className="flex justify-between items-center border p-3 rounded-lg mb-2"
              >
                <div>
                  <p className="font-medium">{invite.invitedEmail}</p>
                  <p className="text-sm text-gray-500">
                    Invited by <strong>{invite.invitedBy.name}</strong> to{" "}
                    <strong>{invite.team.name}</strong>
                  </p>
                  <div className="mt-1">
                    <Badge
                      variant={
                        invite.status === "pending"
                          ? "default"
                          : invite.status === "accepted"
                          ? "success"
                          : "destructive"
                      }
                    >
                      {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                    </Badge>
                  </div>
                </div>

                {invite.status === "pending" ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setRevokeInviteData(invite)}
                    disabled={loading}
                  >
                    Revoke
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled>
                    {invite.status === "accepted" ? "Joined" : "Declined"}
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <InviteModal
        show={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        team={selectedTeam}
        project={project}
        onInvite={() => {
          fetchTeamInvites();
          fetchUserTeams();
        }}
      />

      <JoinTeamModal
        open={showJoinTeam}
        onClose={() => setShowJoinTeam(false)}
        onJoin={handleJoinTeam}
        loading={loading}
      />

      <EditDescriptionModal
        team={editingTeam}
        open={!!editingTeam}
        onClose={() => setEditingTeam(null)}
        onSave={(desc) => handleEditDescription(editingTeam._id, desc)}
        loading={loading}
      />

      <RevokeInviteDialog
        open={!!revokeInviteData}
        invite={revokeInviteData}
        onClose={() => setRevokeInviteData(null)}
        onRevoked={() => {
          fetchTeamInvites();
          fetchUserTeams();
        }}
      />
    </div>
  );
} 