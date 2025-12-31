"use client";

import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../../lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/CommonUI/card";
import { Button } from "../../../components/CommonUI/button";
import { Input } from "../../../components/CommonUI/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/AdminUI/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/AdminUI/dropdown-menu";
import {
  Search,
  Filter,
  Eye,
  Check,
  X,
  Clock,
  Shuffle,
  AlertTriangle,
  Info,
  Calendar,
  Users,
  Trophy,
  MapPin,
  Loader2,
} from "lucide-react";
import ModalHackathonDetails from "../components/ModalHackathonDetails";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/DashboardUI/alert-dialog";
import { useToast } from "../../../hooks/use-toast";
import { Pagination } from "../../../components/CommonUI/Pagination";

export function HackathonRequest() {
  const [organizerRequests, setOrganizerRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [selectedHackathon, setSelectedHackathon] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/hackathons/all`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setOrganizerRequests(res.data);
      } catch (err) {
        console.error("Failed to fetch hackathon requests", err);
        toast({
          title: "Error",
          description: "Failed to fetch hackathon requests",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [toast]);

  const updateApprovalStatus = async (id, status) => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await axios.patch(
        `${API_BASE_URL}/api/hackathons/${id}/approval`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setOrganizerRequests((prev) =>
        prev.map((h) => (h._id === id ? { ...h, approvalStatus: status } : h))
      );

      toast({
        title: "Success",
        description: `Hackathon ${status === "approved" ? "approved" : "rejected"} successfully`,
        variant: status === "approved" ? "default" : "destructive",
      });
    } catch (err) {
      console.error("Failed to update approval status", err);
      toast({
        title: "Error",
        description: "Failed to update approval status",
        variant: "destructive",
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleAction = (hackathon, action) => {
    setPendingAction({ hackathon, action });
    setShowConfirmDialog(true);
  };

  const confirmAction = () => {
    if (pendingAction) {
      const { hackathon, action } = pendingAction;
      updateApprovalStatus(hackathon._id, action);
      setShowConfirmDialog(false);
      setPendingAction(null);
    }
  };

  // Sort requests by createdAt descending (recent first)
  const sortedRequests = [...organizerRequests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Memoize filtered requests to prevent unnecessary re-computation
  const filteredRequests = useMemo(() => {
    return sortedRequests.filter((request) => {
      const matchesSearch =
        request.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.organizer?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "All" || request.approvalStatus === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [sortedRequests, searchTerm, statusFilter]);

  // Reset page when filters change, but not when data is updated
  const [currentPage, setCurrentPage] = useState(1);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Manual pagination calculation
  const itemsPerPage = 5;
  const totalItems = filteredRequests.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + itemsPerPage);

  // Calculate statistics
  const stats = {
    total: organizerRequests.length,
    pending: organizerRequests.filter((r) => r.approvalStatus === "pending").length,
    approved: organizerRequests.filter((r) => r.approvalStatus === "approved").length,
    rejected: organizerRequests.filter((r) => r.approvalStatus === "rejected").length,
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "text-green-600 font-semibold";
      case "pending":
        return "text-yellow-600 font-semibold";
      case "rejected":
        return "text-red-600 font-semibold";
      default:
        return "text-gray-600 font-semibold";
    }
  };

  const getStatsColor = (type) => {
    switch (type) {
      case "pending":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "approved":
        return "text-green-600 bg-green-50 border-green-200";
      case "rejected":
        return "text-red-600 bg-red-50 border-red-200";
      case "total":
        return "text-indigo-600 bg-indigo-50 border-indigo-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

 

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-lg font-medium">Loading requests...</span>
      </div>
    );

  return (
    <div className="space-y-8 bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h1 className="text-3xl font-bold text-black">Hackathon Requests</h1>
        <div className="flex gap-2">
          <div className={`px-3 py-1 rounded-md border ${getStatsColor("pending")} flex items-center`}>
            <Clock className="w-4 h-4 mr-1" />
            <span className="font-semibold">{stats.pending} Pending</span>
          </div>
          <div className={`px-3 py-1 rounded-md border ${getStatsColor("approved")} flex items-center`}>
            <Check className="w-4 h-4 mr-1" />
            <span className="font-semibold">{stats.approved} Approved</span>
          </div>
          <div className={`px-3 py-1 rounded-md border ${getStatsColor("rejected")} flex items-center`}>
            <X className="w-4 h-4 mr-1" />
            <span className="font-semibold">{stats.rejected} Rejected</span>
          </div>
          <div className={`px-3 py-1 rounded-md border ${getStatsColor("total")} flex items-center`}>
            <Info className="w-4 h-4 mr-1" />
            <span className="font-semibold">{stats.total} Total</span>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row gap-4 items-center">
        {/* Search */}
        <div className="flex-1 w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black w-4 h-4" />
            <Input
              placeholder="Search by event or organizer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 bg-white text-black text-base"
            />
          </div>
        </div>
        {/* Filter Buttons */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="text-black">
              <Filter className="w-4 h-4 mr-2" />
              Status: {statusFilter}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Results Table */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-black text-lg">
            Requests ({totalItems})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalItems === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 text-lg">No requests found</div>
              <div className="text-gray-400 text-sm mt-1">
                Try adjusting your search or filter criteria
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-black w-12">#</TableHead>
                    <TableHead className="text-black">Organizer</TableHead>
                    <TableHead className="text-black">Event</TableHead>
                    <TableHead className="text-black">Status</TableHead>
                    <TableHead className="text-black">Quick Info</TableHead>
                    <TableHead className="text-black">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRequests.map((req, idx) => (
                      <TableRow key={req._id} className="hover:bg-gray-50">
                        <TableCell className="font-semibold">
                          {startIndex + idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="text-black font-medium">
                            {req.organizer?.name || "Unknown"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {req.organizer?.email || "No email"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-black font-medium">{req.title}</div>
                          <div className="text-sm text-gray-500">
                            {req.category} • {req.difficultyLevel}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`${getStatusColor(req.approvalStatus)} flex items-center gap-1`}>
                         
                            {req.approvalStatus || "pending"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(req.startDate).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Trophy className="w-3 h-3" />
                              ${req.prizePool?.amount?.toLocaleString() || "TBA"}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {req.maxParticipants || "Unlimited"}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {req.location || "N/A"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {/* Quick Preview Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedHackathon(req)}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Preview
                            </Button>
                            {/* Action Buttons for Pending Requests */}
                            {req.approvalStatus === "pending" && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleAction(req, "approved")}
                                  disabled={actionLoading[req._id]}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  {actionLoading[req._id] ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Check className="w-4 h-4 mr-1" />
                                      Approve
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleAction(req, "rejected")}
                                  disabled={actionLoading[req._id]}
                                >
                                  {actionLoading[req._id] ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <X className="w-4 h-4 mr-1" />
                                      Reject
                                    </>
                                  )}
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              
              {/* Pagination Component */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                className="mt-6"
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.action === "approved" ? "Approve Hackathon" : "Reject Hackathon"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {pendingAction?.action === "approved" ? "approve" : "reject"} "{pendingAction?.hackathon?.title}"?
              {pendingAction?.action === "rejected" && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">This action cannot be undone.</span>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={pendingAction?.action === "approved" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {pendingAction?.action === "approved" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal for viewing details */}
      {selectedHackathon && (
        <ModalHackathonDetails
          isOpen={!!selectedHackathon}
          onClose={() => setSelectedHackathon(null)}
          hackathon={selectedHackathon}
        />
      )}
    </div>
  );
}
