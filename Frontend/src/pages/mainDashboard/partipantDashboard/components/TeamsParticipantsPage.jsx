import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../../components/AdminUI/table";
import { API_BASE_URL } from "../../../../lib/api";

export default function TeamsParticipantsPage() {
  const { hackathonId, teamId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teams, setTeams] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const [teamsRes, submissionsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/teams/hackathon/${hackathonId}/all`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/api/projects/hackathon/${hackathonId}`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const teamsData = await teamsRes.json();
        const submissionsData = await submissionsRes.json();
        setTeams(Array.isArray(teamsData) ? teamsData : []);
        setSubmissions(Array.isArray(submissionsData) ? submissionsData : []);
      } catch (err) {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    if (hackathonId) fetchData();
  }, [hackathonId]);

  // Build a map of userId to submission status
  const userSubmissionMap = {};
  submissions.forEach(sub => {
    if (sub.submittedBy && sub.submittedBy._id) {
      userSubmissionMap[sub.submittedBy._id] = sub.status || "Draft";
    }
  });

  // Find the selected team if teamId is present
  const selectedTeam = teamId ? teams.find(team => team._id === teamId) : null;

  // --- CSS classes ---
  const card = "bg-white rounded-xl shadow-md p-6 mb-6 hover:shadow-lg transition cursor-pointer border border-gray-100";
  const cardTitle = "text-lg font-bold text-indigo-700 mb-2";
  const cardSubtitle = "text-sm text-gray-500 mb-1";
  const grid = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6";
  const backBtn = "mb-6 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm font-medium";

  if (loading) return <div className="p-8 text-center text-lg">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600 font-bold">{error}</div>;

  // --- Team Details View ---
  if (teamId && selectedTeam) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <button className={backBtn} onClick={() => navigate(`/dashboard/created-hackathons/${hackathonId}/teams`)}>
          ← Back to All Teams
        </button>
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <div className="text-2xl font-bold text-indigo-800">{selectedTeam.name}</div>
              <div className="text-gray-600 text-sm mt-1">Team Leader: <span className="font-semibold">{selectedTeam.leader?.name}</span></div>
            </div>
            <div className="mt-2 sm:mt-0 text-sm text-gray-500">Members: {selectedTeam.members.length}</div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Submission Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedTeam.members.map((member) => (
                <TableRow key={member._id}>
                  <TableCell>{member.name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>{selectedTeam.leader._id === member._id ? "Team Leader" : "Member"}</TableCell>
                  <TableCell>{userSubmissionMap[member._id] || "Not Started"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // --- Teams List View ---
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-indigo-900 mb-8 text-center">Teams & Leaders</h1>
      {teams.length === 0 ? (
        <div className="text-center text-gray-500">No teams found for this hackathon.</div>
      ) : (
        <div className={grid}>
          {teams.map((team) => (
            <div
              key={team._id}
              className={card}
              onClick={() => navigate(`/dashboard/created-hackathons/${hackathonId}/teams/${team._id}`)}
            >
              <div className={cardTitle}>{team.name}</div>
              <div className={cardSubtitle}>Team Leader: <span className="font-semibold text-gray-700">{team.leader?.name}</span></div>
              <div className="text-xs text-gray-400 mt-2">Click to view members</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 