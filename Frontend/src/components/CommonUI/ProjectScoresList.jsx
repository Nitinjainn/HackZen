import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./card";
import { Badge } from "./badge";
import { Skeleton } from "../DashboardUI/skeleton";
import { Star, User } from "lucide-react";
import { API_BASE_URL } from "../../lib/api";

const CRITERIA = [
  { key: "innovation", label: "Innovation", tooltip: "How novel is the idea?" },
  { key: "impact", label: "Impact", tooltip: "Potential effect or value." },
  { key: "technicality", label: "Technicality", tooltip: "Technical depth and execution." },
  { key: "presentation", label: "Presentation", tooltip: "Clarity and quality of presentation." },
];

function getInitials(nameOrEmail) {
  if (!nameOrEmail) return "?";
  const parts = nameOrEmail.split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProjectScoresList({ submissionId }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!submissionId) return;
    setLoading(true);
    setError("");
    fetch(`${API_BASE_URL}/api/scores/submission/${submissionId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setScores(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load scores");
        setLoading(false);
      });
  }, [submissionId]);

  // Calculate average score (across all criteria and judges)
  const averageScore =
    scores.length > 0
      ? (
          scores.reduce((sum, s) => {
            const total = CRITERIA.reduce((acc, c) => acc + (s.scores?.[c.key] || 0), 0);
            return sum + total / CRITERIA.length;
          }, 0) / scores.length
        ).toFixed(2)
      : null;

  return (
    <Card className="mb-6 border shadow-lg rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-4">
          <span>Judging Scores</span>
          {averageScore && (
            <Badge className="bg-yellow-400 text-white text-lg px-4 py-2 flex items-center gap-2 rounded-full shadow-md">
              <Star className="w-5 h-5 mr-1 text-white fill-yellow-500" />
              <span className="font-bold">{averageScore}</span>/10
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : scores.length === 0 ? (
          <div className="text-gray-500">No scores yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
            <table className="min-w-full text-sm rounded-2xl overflow-hidden">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr>
                  <th className="p-3 border-b font-semibold text-left rounded-tl-2xl">Judge</th>
                  {CRITERIA.map((c) => (
                    <th
                      key={c.key}
                      className="p-3 border-b font-semibold text-center"
                    >
                      <span className="relative group cursor-help">
                        {c.label}
                        <span className="absolute left-1/2 -translate-x-1/2 mt-2 w-40 bg-black text-white text-xs rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition pointer-events-none z-20">
                          {c.tooltip}
                        </span>
                      </span>
                    </th>
                  ))}
                  <th className="p-3 border-b font-semibold text-left">Feedback</th>
                  <th className="p-3 border-b font-semibold text-left rounded-tr-2xl">Date</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((score, idx) => (
                  <tr
                    key={score._id}
                    className={
                      `transition-all ${idx % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-yellow-50`}
                  >
                    <td className="p-3 border-b flex items-center gap-2 min-w-[120px]">
                      {/* Avatar or initials */}
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-base shadow">
                        <User className="w-4 h-4 mr-1 text-indigo-400" />
                        {getInitials(score.judge?.name || score.judge?.email)}
                      </span>
                      <span className="ml-2 font-medium">
                        {score.judge?.name || score.judge?.email || "-"}
                      </span>
                    </td>
                    {CRITERIA.map((c) => (
                      <td key={c.key} className="p-3 border-b text-center font-semibold">
                        {score.scores?.[c.key] ?? <span className="text-gray-400">-</span>}
                      </td>
                    ))}
                    <td className="p-3 border-b max-w-xs truncate" title={score.feedback}>
                      {score.feedback || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="p-3 border-b whitespace-nowrap">
                      {score.createdAt ? new Date(score.createdAt).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 