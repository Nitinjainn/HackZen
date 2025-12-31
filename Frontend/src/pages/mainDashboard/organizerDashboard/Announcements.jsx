"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  MessageSquare,
  Send,
  Eye,
  Clock,
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
  RCard,
  RCardContent,
  RCardDescription,
  RCardHeader,
  RCardTitle,
} from "../../../components/CommonUI/RippleCard";
import { Button } from "../../../components/CommonUI/button";
import { Badge } from "../../../components/CommonUI/badge";
import { Textarea } from "../../../components/CommonUI/textarea";
import { Input } from "../../../components/CommonUI/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/CommonUI/select";
import toast from "react-hot-toast";

export function Announcements() {

  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("");
  const [priority, setPriority] = useState("");
  const [hackathon, setHackathon] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("${API_BASE_URL}/api/announcements", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setAnnouncements(data.announcements);
    } catch (err) {
      console.error("Error fetching announcements", err);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleQuickSend = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("${API_BASE_URL}/api/announcements/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          message,
          audience,
          hackathonId: hackathon === "all" ? undefined : hackathon,
          type: priority || "general",
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to send announcement");
      toast.success("Announcement sent!");
      setTitle("");
      setMessage("");
      setAudience("");
      setPriority("");
      setHackathon("");
      setShowPreview(false);
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getAudienceVariant = (aud) => {
    switch (aud) {
      case "all":
        return "outline";
      case "organizers":
        return "secondary";
      case "participants":
        return "outline";
      case "mentors":
        return "secondary";
      default:
        return "dark";
    }
  };

  const sent = announcements;

  return (
    <div className="space-y-6 bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 min-h-screen p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
      
          <div>
            <h1 className="text-3xl font-bold text-black">Announcements</h1>
          </div>
        </div>
      
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RCard>
          <RCardHeader>
            <RCardTitle className="text-lg text-black flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-green-600" />
              Total Announcements
            </RCardTitle>
          </RCardHeader>
          <RCardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">All Time</span>
              <span className="font-medium text-black text-2xl">{sent.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">This Month</span>
              <span className="font-medium text-black">
                {sent.filter(a => {
                  const monthAgo = new Date();
                  monthAgo.setMonth(monthAgo.getMonth() - 1);
                  return new Date(a.createdAt) > monthAgo;
                }).length}
              </span>
            </div>
          </RCardContent>
        </RCard>

        <RCard>
          <RCardHeader>
            <RCardTitle className="text-lg text-black flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              Activity Overview
            </RCardTitle>
          </RCardHeader>
          <RCardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Last Sent</span>
              <span className="font-medium text-black text-sm">
                {sent[0] ? new Date(sent[0].createdAt).toLocaleDateString() : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Avg. per Week</span>
              <span className="font-medium text-black">
                {sent.length > 0 ? Math.round(sent.length / Math.max(1, Math.ceil((Date.now() - new Date(sent[sent.length - 1]?.createdAt || Date.now())) / (1000 * 60 * 60 * 24 * 7)))) : 0}
              </span>
            </div>
          </RCardContent>
        </RCard>

        <RCard>
          <RCardHeader>
            <RCardTitle className="text-lg text-black flex items-center">
              <Send className="w-5 h-5 mr-2 text-indigo-600" />
              Audience Reach
            </RCardTitle>
          </RCardHeader>
          <RCardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">All Users</span>
              <span className="font-medium text-black">
                {sent.filter(a => a.audience === 'all').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Targeted</span>
              <span className="font-medium text-black">
                {sent.filter(a => a.audience !== 'all').length}
              </span>
            </div>
          </RCardContent>
        </RCard>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Static Send Announcement Form */}
        <div className="w-full lg:w-1/2 flex-shrink-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-black flex items-center">
                <Send className="w-5 h-5 mr-2 text-indigo-700" />
                Send New Announcement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-gray-700 text-sm font-medium mb-2 block">
                  Title
                </label>
                <Input
                  placeholder="Enter announcement title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-white/5 border-indigo-500/20 text-black placeholder-gray-600"
                />
              </div>

              <div>
                <label className="text-gray-700 text-sm font-medium mb-2 block">
                  Message
                </label>
                <Textarea
                  placeholder="Write your announcement message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="bg-white/5 border-indigo-500/20 text-black placeholder-gray-600 resize-none"
                />
              </div>

              <div>
                <label className="text-gray-700 text-sm font-medium mb-2 block">
                  Hackathon
                </label>
                <Select value={hackathon} onValueChange={setHackathon}>
                  <SelectTrigger className="bg-white/5 border-indigo-500/20 text-black">
                    <SelectValue placeholder="Select hackathon" />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 backdrop-blur-xl border-indigo-500/20">
                    <SelectItem
                      value="all"
                      className="text-white hover:bg-white/5"
                    >
                      All Events
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-gray-700 text-sm font-medium mb-2 block">
                  Priority
                </label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="bg-white/5 border-indigo-500/20 text-black">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 backdrop-blur-xl border-indigo-500/20">
                    <SelectItem
                      value="alert"
                      className="text-white hover:bg-white/5"
                    >
                      High (Alert)
                    </SelectItem>
                    <SelectItem
                      value="reminder"
                      className="text-white hover:bg-white/5"
                    >
                      Medium (Reminder)
                    </SelectItem>
                    <SelectItem
                      value="general"
                      className="text-white hover:bg-white/5"
                    >
                      Low (General)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-gray-700 text-sm font-medium mb-2 block">
                  Audience
                </label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger className="bg-white/5 border-indigo-500/20 text-black">
                    <SelectValue placeholder="Select target audience" />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 backdrop-blur-xl border-indigo-500/20">
                    <SelectItem
                      value="all"
                      className="text-white hover:bg-white/5"
                    >
                      All Users
                    </SelectItem>
                    <SelectItem
                      value="organizers"
                      className="text-white hover:bg-white/5"
                    >
                      Organizers
                    </SelectItem>
                    <SelectItem
                      value="participants"
                      className="text-white hover:bg-white/5"
                    >
                      Participants
                    </SelectItem>
                    <SelectItem
                      value="mentors"
                      className="text-white hover:bg-white/5"
                    >
                      Mentors
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex space-x-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex-1 border-indigo-500 text-black hover:bg-indigo-600 hover:text-white"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button
                  onClick={handleQuickSend}
                  disabled={!title || !message || !audience}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Now
                </Button>
              </div>

              {showPreview && title && message && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-gray-600 font-semibold">{title}</h3>
                      <div className="flex gap-2">
                        {priority && (
                          <Badge
                            className={`text-white ${
                              priority === "alert"
                                ? "bg-red-500"
                                : priority === "reminder"
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                          >
                            {priority}
                          </Badge>
                        )}
                        <Badge variant={getAudienceVariant(audience)}>
                          {audience}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500 text-sm">{message}</p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Fixed Height Recent Announcements with Scroll */}
        <div className="w-full lg:w-1/2 flex-grow">
          <Card>
            <CardHeader>
              <CardTitle className="text-black flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                Recent Announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="h-full">
              {/* Fixed height container with scroll */}
              <div className="max-h-[500px] overflow-y-auto pr-2 -mr-2 scrollbar-hide">
                <div className="space-y-4">
                  {sent.length > 0 ? (
                    sent.map((announcement) => (
                      <div
                        key={announcement._id}
                        className="p-4 bg-white/5 rounded-lg border border-indigo-500/20 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-black font-medium text-sm leading-tight">
                            {announcement.title}
                          </h4>
                          <div className="flex gap-2 flex-shrink-0 ml-2">
                            <Badge
                              className={`text-white ${
                                announcement.type === "alert"
                                  ? "bg-red-500"
                                  : announcement.type === "reminder"
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                            >
                              {announcement.type}
                            </Badge>
                            <Badge
                              variant={getAudienceVariant(
                                announcement.audience
                              )}
                            >
                              {announcement.audience}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-gray-600 text-xs mb-3 line-clamp-3 leading-relaxed">
                          {announcement.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700 text-xs">
                            {new Date(announcement.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <Clock className="w-12 h-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No announcements yet
                      </h3>
                      <p className="text-gray-500 text-sm">
                        Send your first announcement to see it appear here
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {/* Scroll indicator */}
              {sent.length > 0 && (
                <div className="text-center mt-2 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Scroll to see more announcements
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
