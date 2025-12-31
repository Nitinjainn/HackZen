"use client";

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { API_BASE_URL } from "../../../lib/api";
import {
  FileText,
  Award,
  Upload,
} from "lucide-react";
import {
  ACard,
  ACardContent,
} from "../../../components/DashboardUI/AnimatedCard";
import {
  Card,
  CardContent,
} from "../../../components/CommonUI/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../components/CommonUI/tabs";
import { ProjectCard } from "../../../components/CommonUI/ProjectCard";

export function MySubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const socketRef = useRef(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const user = JSON.parse(localStorage.getItem("user"));
        const userId = user?._id;
        if (!userId) return setSubmissions([]);
        const res = await axios.get(
          `${API_BASE_URL}/api/submission-form/submissions?userId=${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSubmissions(res.data.submissions || []);
      } catch (err) {
        setSubmissions([]);
        console.error("Error fetching submissions:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  // Real-time updates with socket.io for like/view counts
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(`${API_BASE_URL}`);
    }
    const socket = socketRef.current;
    socket.on("project-like-update", ({ projectId, likes, likedBy }) => {
      setSubmissions((prev) =>
        prev.map((s) =>
          s.projectId && s.projectId._id === projectId
            ? { ...s, projectId: { ...s.projectId, likes, likedBy } }
            : s
        )
      );
    });
    socket.on("project-view-update", ({ projectId, views }) => {
      setSubmissions((prev) =>
        prev.map((s) =>
          s.projectId && s.projectId._id === projectId
            ? { ...s, projectId: { ...s.projectId, views } }
            : s
        )
      );
    });
    return () => {
      socket.off("project-like-update");
      socket.off("project-view-update");
    };
  }, []);

  // Only show submissions with a project (ignore PPT-only, unless you want to show those too)
  const projectSubmissions = submissions.filter((s) => s.projectId);
  const judgedSubmissions = projectSubmissions.filter((s) => s.status === "reviewed");
  const pendingSubmissions = projectSubmissions.filter((s) => s.status === "submitted");

  const renderSubmissionCard = (submission) => (
    <ProjectCard
      key={submission._id}
      project={submission.projectId}
      onClick={() => navigate(`/dashboard/project-archive/${submission.projectId._id}`)}
      showActions={true}
      highlightAuthor={true}
      compact={false}
    />
  );

  return (
    <div className="flex-1 space-y-6 p-6 bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 md:min-h-screen">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Submissions</h1>
          <p className="text-sm text-gray-500">
            Track your project submissions and results
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <ACard>
          <ACardContent className="pt-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{projectSubmissions.length}</p>
                <p className="text-sm text-gray-500">Total Submissions</p>
              </div>
            </div>
          </ACardContent>
        </ACard>
        <ACard>
          <ACardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{judgedSubmissions.length}</p>
                <p className="text-sm text-gray-500">Judged</p>
              </div>
            </div>
          </ACardContent>
        </ACard>
        <ACard>
          <ACardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Upload className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">
                  {pendingSubmissions.length}
                </p>
                <p className="text-sm text-gray-500">Pending Review</p>
              </div>
            </div>
          </ACardContent>
        </ACard>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All ({projectSubmissions.length})</TabsTrigger>
          <TabsTrigger value="judged">Judged ({judgedSubmissions.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingSubmissions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {projectSubmissions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {projectSubmissions.map(renderSubmissionCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 pt-12">
                <FileText className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Submissions Yet
                </h3>
                <p className="text-gray-500 text-center">
                  You haven't submitted any projects yet.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="judged">
          {judgedSubmissions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {judgedSubmissions.map(renderSubmissionCard)}
            </div>
          ) : (
            <Card>
             <CardContent className="flex flex-col items-center justify-center py-12 pt-12">
                <Award className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Judged Submissions
                </h3>
                <p className="text-gray-500 text-center">
                  None of your submissions have been reviewed yet.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pending">
          {pendingSubmissions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {pendingSubmissions.map(renderSubmissionCard)}
            </div>
          ) : (
            <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 pt-12">
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Pending Submissions
                </h3>
                <p className="text-gray-500 text-center">
                  All your submissions have been reviewed.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}