import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "../../../components/CommonUI/button";
import { API_BASE_URL } from "../../../lib/api";
import { Eye, Search, Users, Trophy, FolderCode, Calendar, Filter, Shuffle, ArrowLeft } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../../components/AdminUI/table";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/CommonUI/card";
import { Badge } from "../../../components/CommonUI/badge";
import { Input } from "../../../components/CommonUI/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/AdminUI/dropdown-menu";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const STATUS_OPTIONS = ["All", "Pending", "Accepted", "Rejected"];

export default function AdminHackathonSubmissionsPage({ hackathonId }) {
  const navigate = useNavigate();
  const [hackathon, setHackathon] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [submissionsError, setSubmissionsError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;
  const [loadingExport, setLoadingExport] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchHackathon = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/hackathons/${hackathonId}`
        );
        setHackathon(res.data);
      } catch {
        setHackathon(null);
      }
    };
    fetchHackathon();
  }, [hackathonId]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      setSubmissionsLoading(true);
      setSubmissionsError(null);
      try {
        const res = await axios.get(
          `/api/submission-form/admin/hackathon/${hackathonId}`,
          {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          }
        );
        setSubmissions(res.data.submissions || []);
      } catch {
        setSubmissionsError("Failed to fetch submissions");
      } finally {
        setSubmissionsLoading(false);
      }
    };
    fetchSubmissions();
  }, [hackathonId]);

  useEffect(() => {
    setCurrentPage(0); // reset pagination on search/filter change
  }, [searchTerm, selectedStatus]);

  const filteredSubmissions = submissions.filter((submission) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      (submission.projectId?.title || "").toLowerCase().includes(search) ||
      (submission.teamName || "").toLowerCase().includes(search) ||
      (submission.submittedByName || "").toLowerCase().includes(search);
    const matchesStatus =
      selectedStatus === "All" ||
      (submission.status || "").toLowerCase() === selectedStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const paginatedSubmissions = filteredSubmissions.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const handleExport = () => {
    setLoadingExport(true);
    const dataToExport = submissions.map((submission) => ({
      Project: submission.projectId?.title || "Untitled Project",
      Team: submission.teamName || "-",
      SubmittedBy: submission.submittedByName || "-",
      SubmittedAt: submission.submittedAt
        ? new Date(submission.submittedAt).toLocaleString()
        : "-",
      Status: submission.status || "-",
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Submissions");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, "submissions_export.xlsx");
    setTimeout(() => setLoadingExport(false), 1500);
  };

  return (
    <div className="space-y-6 bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 text-black min-h-screen">
      {/* Back Link styled like HackathonDetails */}
      <div className="mb-2">
        <button
          onClick={() => navigate("/admin/hackathons")}
          className="flex items-center gap-1 text-sm font-semibold text-gray-800 hover:text-black"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Submissions Management</h1>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700"
          onClick={handleExport}
          disabled={loadingExport}
        >
          {loadingExport ? "Exporting..." : "Export Submissions"}
        </Button>
      </div>

      {/* Summary Bar */}
      {hackathon && (
        <div className="flex flex-wrap gap-4 bg-white/70 rounded-xl px-4 py-2 shadow-sm border border-purple-100 mb-2">
          <span className="flex items-center gap-1 text-sm text-gray-700">
            <Calendar className="w-4 h-4 text-purple-500" />
            {formatDate(hackathon.startDate)} — {formatDate(hackathon.endDate)}
          </span>
          <span className="flex items-center gap-1 text-sm text-gray-700">
            <Users className="w-4 h-4 text-blue-500" />
            {hackathon.participants?.length || 0} participants
          </span>
          <span className="flex items-center gap-1 text-sm text-gray-700">
            <Trophy className="w-4 h-4 text-yellow-500" />
            {hackathon.prizePool?.amount
              ? `${hackathon.prizePool.amount} ${hackathon.prizePool.currency}`
              : "N/A"} pool
          </span>
          <span className="flex items-center gap-1 text-sm text-gray-700">
            <FolderCode className="w-4 h-4 text-yellow-500" />
            {submissions.length} submissions received
          </span>
        </div>
      )}

      {/* Card Container */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-700">Submissions Directory</CardTitle>
          <div className="pt-4 flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700 w-4 h-4" />
              <Input
                placeholder="Search by project, team, or submitter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-purple-500/20 text-black placeholder-gray-500"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border border-indigo-300 bg-white/50 hover:bg-indigo-50 text-gray-700 shadow-sm"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Status: {selectedStatus}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white/90 text-black shadow-md border border-indigo-200 backdrop-blur-md">
                {STATUS_OPTIONS.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className="hover:bg-indigo-100 text-indigo-700"
                  >
                    {status}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
      {submissionsLoading ? (
            <div className="p-10 text-center text-lg text-gray-600 animate-pulse">
              Loading submissions...
            </div>
      ) : submissionsError ? (
        <div className="p-10 text-center text-red-500">{submissionsError}</div>
          ) : paginatedSubmissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FolderCode className="w-12 h-12 text-purple-200 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Submissions Found
              </h3>
              <p className="text-gray-500 text-center">
                Try adjusting your search or check back later.
              </p>
            </div>
      ) : (
        <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-purple-500/20">
                    <TableHead className="text-gray-800">Project</TableHead>
                    <TableHead className="text-gray-800">Team</TableHead>
                    <TableHead className="text-gray-800">Submitted By</TableHead>
                    <TableHead className="text-gray-800">Submitted At</TableHead>
                    <TableHead className="text-gray-800">Status</TableHead>
                    <TableHead className="text-gray-800">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSubmissions.map((submission) => (
                    <TableRow
                      key={submission._id}
                      className="border-purple-500/20 hover:bg-white/5"
                    >
                      <TableCell className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {submission.projectId?.title?.slice(0, 2)?.toUpperCase() || "PR"}
                        </div>
                        <div>
                          <div className="text-gray-700 font-medium">
                            {submission.projectId?.title || "Untitled Project"}
                          </div>
                          <div className="text-gray-400 text-sm">
                            {submission.projectId?.description?.slice(0, 40) || ""}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{submission.teamName || "-"}</TableCell>
                      <TableCell>{submission.submittedByName || "-"}</TableCell>
                      <TableCell>
                        {submission.submittedAt
                          ? new Date(submission.submittedAt).toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            submission.status === "Accepted"
                              ? "bg-green-500 text-white border-green-500/30"
                              : submission.status === "Rejected"
                              ? "bg-red-500 text-white border-red-500/30"
                              : "bg-yellow-500 text-white border-yellow-500/30"
                          }
                        >
                        {submission.status || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-gray-400 hover:text-black"
                            >
                              <Shuffle className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-black/90 backdrop-blur-xl border-purple-500/20">
                            <DropdownMenuItem
                              className="text-white hover:bg-white/5"
                              onClick={() =>
                                navigate(
                                  `/admin/hackathons/${hackathonId}/submissions/${submission._id}`
                                )
                              }
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-end items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage + 1} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                size="sm"
                disabled={currentPage === totalPages - 1}
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                      >
                Next
                      </Button>
        </div>
      )}
        </CardContent>
      </Card>
    </div>
  );
} 
