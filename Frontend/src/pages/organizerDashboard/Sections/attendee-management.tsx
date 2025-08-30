"use client";

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSolanaWallet } from "@web3auth/modal/react/solana";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Badge } from "../../../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import { Checkbox } from "../../../ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../ui/dropdown-menu";
import { getOrganizerEvents, subscribeToOrganizerAttendees } from "../../../lib/dashboard";
import type { OrderDoc, EventDoc } from "../../../types/ticketing";
import { CheckSquare, EyeOffIcon, TimerOffIcon, User2Icon, Filter, X, Search, ChevronRight } from "lucide-react";

interface AttendeeManagementProps {
  setActiveSection: (section: string) => void;
  eventId: string | null;
}

export function AttendeeManagement({ setActiveSection, eventId: propEventId }: AttendeeManagementProps) {
  const params = useParams();
  const urlEventId = params.eventId || null;
  // Use the eventId from URL params if available, otherwise fall back to props
  const eventId = urlEventId || propEventId;
  const { accounts } = useSolanaWallet();
  const organizerWallet = accounts?.[0] || "";
  const isConnected = !!organizerWallet;

  const [searchTerm, setSearchTerm] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);
  
  const [attendees, setAttendees] = useState<OrderDoc[]>([]);
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Map event IDs to event titles for display
  const eventTitleMap = new Map(events.map(e => [e.id, e.title]));

  useEffect(() => {
    if (!isConnected || !organizerWallet) {
      setDataLoading(false);
      return;
    }

    let unsubscribe: () => void = () => {};

    const fetchData = async () => {
      setDataLoading(true);
      try {
        const fetchedEvents = await getOrganizerEvents(organizerWallet);
        setEvents(fetchedEvents as EventDoc[]);

        const eventIdsToSubscribe = eventId ? [eventId] : fetchedEvents.map(e => e.id);
        
        unsubscribe = subscribeToOrganizerAttendees(eventIdsToSubscribe, (fetchedAttendees) => {
          setAttendees(fetchedAttendees);
          setDataLoading(false);
        });
      } catch (e) {
        console.error("Failed to fetch attendee data:", e);
        setDataLoading(false);
      }
    };

    fetchData();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isConnected, organizerWallet, eventId]);

  const handleCheckboxChange = (attendeeId: string) => {
    setSelectedAttendees(prev => 
      prev.includes(attendeeId)
        ? prev.filter(id => id !== attendeeId)
        : [...prev, attendeeId]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "checked-in":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "not-checked-in":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "no-show":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const attendeesForEvent = attendees.filter(a => eventId ? a.eventId === eventId : true);

  const filteredAttendees = attendeesForEvent.filter((attendee) => {
    if (!attendee || !attendee.buyerWallet) {
      return false;
    }
    const matchesSearch = attendee.buyerWallet.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEvent = eventFilter === "all" || attendee.eventId === eventFilter;
    const matchesStatus = statusFilter === "all" || (attendee.checkInStatus || "not-checked-in") === statusFilter;
    return matchesSearch && matchesEvent && matchesStatus;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAttendees(filteredAttendees.map((a) => a.id));
    } else {
      setSelectedAttendees([]);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setEventFilter("all");
    setStatusFilter("all");
  };
  
  const attendeeStats = {
    total: attendeesForEvent.length,
    checkedIn: attendeesForEvent.filter((a) => a.checkInStatus === "checked-in").length,
    notCheckedIn: attendeesForEvent.filter((a) => a.checkInStatus === "not-checked-in" || !a.checkInStatus).length,
    noShow: attendeesForEvent.filter((a) => a.checkInStatus === "no-show").length,
  };

  if (dataLoading) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-400">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-3"></div>
        <p>Loading attendees...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-2 sm:p-3 md:p-4 lg:p-6 space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Attendee Management
          </h1>
          <p className="text-gray-400 mt-1 sm:mt-2 text-xs sm:text-sm md:text-base">
            Manage your event attendees and track check-ins.
          </p>
        </div>
        <div className="relative group w-full sm:w-auto">
          <div className="absolute transition-all duration-200 rounded-full -inset-px bg-gradient-to-r from-cyan-500 to-blue-500"></div>
          <Link
            to="/dashboard/scanner"
            className="cursor-pointer relative inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium text-white bg-black border border-transparent rounded-full w-full sm:w-auto"
            role="button"
          >
            QR Code Scanner
          </Link>
        </div>
      </div>
      
      <hr className="border-gray-800" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm hover:bg-gray-900/70 transition-all duration-300">
          <CardContent className="p-2 sm:p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Attendees</p>
                <p className="text-base sm:text-lg md:text-2xl font-bold text-white">{attendeeStats.total}</p>
              </div>
              <div className="p-1.5 sm:p-2 rounded-full bg-blue-500/20">
                <User2Icon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm hover:bg-gray-900/70 transition-all duration-300">
          <CardContent className="p-2 sm:p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Checked In</p>
                <p className="text-base sm:text-lg md:text-2xl font-bold text-green-400">{attendeeStats.checkedIn}</p>
              </div>
              <div className="p-1.5 sm:p-2 rounded-full bg-green-500/20">
                <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm hover:bg-gray-900/70 transition-all duration-300">
          <CardContent className="p-2 sm:p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Pending</p>
                <p className="text-base sm:text-lg md:text-2xl font-bold text-yellow-400">{attendeeStats.notCheckedIn}</p>
              </div>
              <div className="p-1.5 sm:p-2 rounded-full bg-yellow-500/20">
                <TimerOffIcon className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm hover:bg-gray-900/70 transition-all duration-300">
          <CardContent className="p-2 sm:p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">No Show</p>
                <p className="text-base sm:text-lg md:text-2xl font-bold text-red-400">{attendeeStats.noShow}</p>
              </div>
              <div className="p-1.5 sm:p-2 rounded-full bg-red-500/20">
                <EyeOffIcon className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <hr className="border-gray-800" />

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by wallet address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 bg-gray-900/60 backdrop-blur-md border border-gray-700/50 rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-sm sm:text-base"
          />
        </div>
        
        {/* Filter Button */}
        <Button
          onClick={() => setFilterSidebarOpen(true)}
          variant="outline"
          className="px-3 sm:px-4 py-2 sm:py-3 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800/50 hover:border-gray-600 transition-all duration-300 text-sm sm:text-base"
        >
          <Filter className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Filters</span>
          <span className="sm:hidden">Filter</span>
        </Button>
      </div>
      
      <hr className="border-gray-800" />

      {/* Attendees Table */}
      <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-lg sm:text-xl text-white">Attendees List</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-gray-400">
                {filteredAttendees.length} of {attendeesForEvent.length} attendees
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4">
                    <Checkbox
                      checked={selectedAttendees.length === filteredAttendees.length && filteredAttendees.length > 0}
                      onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                    />
                  </th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-gray-400 font-medium">Attendee Wallet</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-gray-400 font-medium hidden md:table-cell">Event</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-gray-400 font-medium hidden lg:table-cell">Purchase Date</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendees.map((attendee) => (
                  <tr key={attendee.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors duration-200">
                    <td className="py-3 sm:py-4 px-2 sm:px-4">
                      <Checkbox
                        checked={selectedAttendees.includes(attendee.id)}
                        onCheckedChange={() => handleCheckboxChange(attendee.id)}
                      />
                    </td>
                    <td className="py-3 sm:py-4 px-2 sm:px-4 font-mono text-xs sm:text-sm text-gray-300 max-w-[120px] sm:max-w-[200px] truncate">
                      {attendee.buyerWallet}
                    </td>
                    <td className="py-3 sm:py-4 px-2 sm:px-4 text-white max-w-[100px] sm:max-w-[150px] truncate hidden md:table-cell">
                      {eventTitleMap.get(attendee.eventId) || 'Unknown Event'}
                    </td>
                    <td className="py-3 sm:py-4 px-2 sm:px-4 text-white hidden lg:table-cell">
                      {new Date(attendee.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 sm:py-4 px-2 sm:px-4">
                      <div className="space-y-1">
                        <Badge className={`text-xs ${getStatusColor(attendee.checkInStatus || "not-checked-in")}`}> 
                          {attendee.checkInStatus === "checked-in" ? "Checked In"
                           : attendee.checkInStatus === "no-show" ? "No Show"
                           : "Not Checked In"}
                        </Badge>
                        {attendee.checkInTime && (
                          <p className="text-xs text-gray-400">
                            {new Date(attendee.checkInTime).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 sm:py-4 px-2 sm:px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700/50 h-8 w-8 p-0">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-gray-800 border-gray-700">
                          <DropdownMenuItem className="text-white hover:bg-gray-700">View Details</DropdownMenuItem>
                          <DropdownMenuItem className="text-white hover:bg-gray-700">
                            {attendee.checkInStatus === "checked-in" ? "Undo Check-in" : "Check In"}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-400 hover:bg-red-500/10">Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {filteredAttendees.length === 0 && (
        <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
          <CardContent className="p-6 sm:p-8 md:p-12 text-center">
            <div className="text-3xl sm:text-4xl md:text-6xl mb-4">👥</div>
            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-white mb-2">No attendees found</h3>
            <p className="text-gray-400 text-xs sm:text-sm md:text-base">
              {searchTerm || eventFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your search or filter criteria."
                : "No attendees have registered for this event yet."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filter Sidebar */}
      <div className={`fixed inset-0 z-50 ${filterSidebarOpen ? 'block' : 'hidden'}`}>
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out"
          onClick={() => setFilterSidebarOpen(false)}
        />
        
        {/* Sidebar */}
        <div className={`absolute right-0 top-0 h-full w-full sm:w-80 bg-gray-900/95 backdrop-blur-sm border-l border-gray-800 transform transition-all duration-500 ease-out ${filterSidebarOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}`}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-800 bg-gray-900/50">
              <h3 className="text-base sm:text-lg font-semibold text-white">Filters</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterSidebarOpen(false)}
                className="text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors duration-200"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
            
            {/* Filter Content */}
            <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
              {/* Event Filter */}
              {!eventId && (
                <div className="space-y-2 sm:space-y-3">
                  <label className="text-sm font-medium text-gray-300">Event</label>
                  <Select value={eventFilter} onValueChange={setEventFilter}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700/50 transition-colors duration-200">
                      <SelectValue placeholder="Select event" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all">All Events</SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Status Filter */}
              <div className="space-y-2 sm:space-y-3">
                <label className="text-sm font-medium text-gray-300">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700/50 transition-colors duration-200">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="checked-in">Checked In</SelectItem>
                    <SelectItem value="not-checked-in">Not Checked In</SelectItem>
                    <SelectItem value="no-show">No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 sm:p-6 border-t border-gray-800 space-y-2 sm:space-y-3 bg-gray-900/30">
              <Button
                onClick={clearFilters}
                variant="outline"
                className="w-full border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 transition-all duration-200"
              >
                Clear All Filters
              </Button>
              <Button
                onClick={() => setFilterSidebarOpen(false)}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white transition-all duration-200 shadow-lg"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}