"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "../../../components/CommonUI/card";
import { Input } from "../../../components/CommonUI/input";
import { Button } from "../../../components/CommonUI/button";
import { Textarea } from "../../../components/CommonUI/textarea";
import { API_BASE_URL } from "../../../lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/CommonUI/select";
import { Send, Eye, Mail, Megaphone, Clock, Users, Activity, TrendingUp, MessageCircle } from "lucide-react";

export default function CommunicationCenter() {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [audienceType, setAudienceType] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [recentCommunications, setRecentCommunications] = useState([]);

  const fetchRecentCommunications = async () => {
    try {
      const token = localStorage.getItem("token");
      const [newsletterRes, announcementRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/newsletter/recent`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ ok: false })),
        fetch(`${API_BASE_URL}/api/announcements`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ ok: false }))
      ]);

      let communications = [];
      
      if (newsletterRes.ok) {
        const newsletterData = await newsletterRes.json();
        const newsletters = (newsletterData.newsletters || []).map(item => ({
          ...item,
          type: 'newsletter',
          audience: 'subscribed'
        }));
        communications = [...communications, ...newsletters];
      }

      if (announcementRes.ok) {
        const announcementData = await announcementRes.json();
        const announcements = (announcementData.announcements || []).map(item => ({
          ...item,
          type: 'announcement'
        }));
        communications = [...communications, ...announcements];
      }

      communications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRecentCommunications(communications.slice(0, 10));
    } catch (err) {
      console.error("Failed to fetch recent communications", err);
    }
  };

  useEffect(() => {
    fetchRecentCommunications();
  }, []);

  const getAudienceColor = (audience) => {
    switch (audience) {
      case "subscribed":
        return "text-emerald-600 font-semibold";
      case "all":
        return "text-indigo-600 font-semibold";
      case "organizers":
        return "text-purple-600 font-semibold";
      case "participants":
        return "text-orange-600 font-semibold";
      case "mentors":
        return "text-blue-600 font-semibold";
      default:
        return "text-gray-600 font-semibold";
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "newsletter":
        return "text-indigo-600 font-semibold";
      case "announcement":
        return "text-purple-600 font-semibold";
      case "both":
        return "text-emerald-600 font-semibold";
      default:
        return "text-gray-600 font-semibold";
    }
  };

  const sendCommunication = async () => {
    if (!subject || !content || !deliveryMethod || !audienceType) {
      setStatus("All fields are required.");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      let results = [];
      const token = localStorage.getItem("token");

      if (deliveryMethod === "email" || deliveryMethod === "both") {
        try {
          const newsletterRes = await fetch(`${API_BASE_URL}/api/newsletter/send-newsletter`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ 
              subject, 
              content,
              audienceType
            }),
          });
          const newsletterData = await newsletterRes.json();
          if (newsletterRes.ok) {
            results.push("Newsletter sent successfully!");
          } else {
            results.push(`Newsletter failed: ${newsletterData.message}`);
          }
        } catch {
          results.push("Newsletter failed: Network error");
        }
      }

      if (deliveryMethod === "announcement" || deliveryMethod === "both") {
        try {
          const announcementRes = await fetch(`${API_BASE_URL}/api/announcements/send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: subject,
              message: content,
              audience: audienceType === "subscribed" ? "all" : audienceType,
            }),
          });
          const announcementData = await announcementRes.json();
          if (announcementRes.ok) {
            results.push("Announcement sent successfully!");
          } else {
            results.push(`Announcement failed: ${announcementData.message}`);
          }
        } catch  {
          results.push("Announcement failed: Network error");
        }
      }

      setStatus(results.join(" | "));
      
      if (results.some(result => result.includes("successfully"))) {
        setSubject("");
        setContent("");
        setDeliveryMethod("");
        setAudienceType("");
        setShowPreview(false);
        fetchRecentCommunications();
      }
    } catch {
      setStatus("Error sending communication.");
    } finally {
      setLoading(false);
    }
  };

  const statsData = [
    {
      title: "Total Sent",
      value: recentCommunications.length.toString(),
      icon: TrendingUp,
      color: "text-indigo-600 bg-indigo-50 border-indigo-200"
    },
    {
      title: "Newsletters",
      value: recentCommunications.filter(c => c.type === 'newsletter').length.toString(),
      icon: Mail,
      color: "text-blue-600 bg-blue-50 border-blue-200"
    },
    {
      title: "Announcements",
      value: recentCommunications.filter(c => c.type === 'announcement').length.toString(),
      icon: Megaphone,
      color: "text-purple-600 bg-purple-50 border-purple-200"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Communication Center</h1>
              <p className="text-lg text-gray-600">Broadcast messages to your community</p>
            </div>
            <div className="flex items-center bg-white/70 backdrop-blur-sm rounded-xl px-4 py-2 border border-indigo-200 mt-4 md:mt-0">
              <Activity className="w-5 h-5 mr-2 text-indigo-600" />
              <span className="text-indigo-700 font-semibold">Broadcast Hub</span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {statsData.map((stat, index) => (
              <div key={index} className={`bg-white/70 backdrop-blur-sm rounded-xl p-4 border ${stat.color.split(' ')[2]}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Send Communication Form - Takes 2 columns */}
          <div className="xl:col-span-2">
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg shadow-indigo-100/50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-xl font-bold text-gray-900">
                  <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                    <Send className="w-5 h-5 text-indigo-600" />
                  </div>
                  Compose Message
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Subject Input */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Subject Line</label>
                  <Input
                    placeholder="Enter a compelling subject or title..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="h-12 bg-white/80 border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400/20 text-gray-900 placeholder-gray-500"
                  />
                </div>

                {/* Content Textarea */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Message Content</label>
                  <Textarea
                    placeholder="Write your message content here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    className="bg-white/80 border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400/20 text-gray-900 placeholder-gray-500 resize-none"
                  />
                </div>

                {/* Delivery Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Delivery Method</label>
                    <Select value={deliveryMethod} onValueChange={setDeliveryMethod}>
                      <SelectTrigger className="h-12 bg-white/80 border-indigo-200 focus:border-indigo-400 text-gray-900">
                        <SelectValue placeholder="Choose delivery method" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-indigo-200 shadow-lg">
                        <SelectItem value="email" className="text-gray-900 hover:bg-indigo-50">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-indigo-600" />
                            Email Newsletter
                          </div>
                        </SelectItem>
                        <SelectItem value="announcement" className="text-gray-900 hover:bg-indigo-50">
                          <div className="flex items-center">
                            <Megaphone className="w-4 h-4 mr-2 text-purple-600" />
                            In-App Announcement
                          </div>
                        </SelectItem>
                        <SelectItem value="both" className="text-gray-900 hover:bg-indigo-50">
                          <div className="flex items-center">
                            <Send className="w-4 h-4 mr-2 text-emerald-600" />
                            Both Channels
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Target Audience</label>
                    <Select value={audienceType} onValueChange={setAudienceType}>
                      <SelectTrigger className="h-12 bg-white/80 border-indigo-200 focus:border-indigo-400 text-gray-900">
                        <SelectValue placeholder="Select your audience" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-indigo-200 shadow-lg">
                        <SelectItem value="subscribed" className="text-gray-900 hover:bg-indigo-50">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-emerald-600" />
                            Newsletter Subscribers
                          </div>
                        </SelectItem>
                        <SelectItem value="all" className="text-gray-900 hover:bg-indigo-50">
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2 text-indigo-600" />
                            All Platform Users
                          </div>
                        </SelectItem>
                        <SelectItem value="organizers" className="text-gray-900 hover:bg-indigo-50">
                          Event Organizers
                        </SelectItem>
                        <SelectItem value="participants" className="text-gray-900 hover:bg-indigo-50">
                          Participants
                        </SelectItem>
                        <SelectItem value="mentors" className="text-gray-900 hover:bg-indigo-50">
                          Mentors & Judges
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex-1 h-12 border-indigo-300 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400"
                    disabled={!subject || !content}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
                  </Button>
                  <Button
                    onClick={sendCommunication}
                    disabled={loading || !subject || !content || !deliveryMethod || !audienceType}
                    className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg"
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </div>

                {/* Preview Card */}
                {showPreview && subject && content && (
                  <Card className="border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">{subject}</h3>
                        <div className="flex items-center gap-3">
                          {deliveryMethod && (
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(deliveryMethod)} bg-white/70`}>
                              {deliveryMethod}
                            </span>
                          )}
                          {audienceType && (
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getAudienceColor(audienceType)} bg-white/70`}>
                              {audienceType}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{content}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Status Message */}
                {status && (
                  <div className={`p-4 rounded-lg border text-center font-medium ${
                    status.includes('successfully') 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    {status}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Communications Sidebar */}
          <div className="xl:col-span-1">
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg shadow-indigo-100/50 md:h-[620px]">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-xl font-bold text-gray-900">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
                  <div className="space-y-4">
                    {recentCommunications.length > 0 ? (
                      recentCommunications.map((comm) => (
                        <div
                          key={comm._id}
                          className="group p-4 bg-white/60 hover:bg-white/80 rounded-lg border border-indigo-100 hover:border-indigo-200 transition-all duration-200"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-900 leading-tight pr-2">
                              {comm.title || comm.subject}
                            </h4>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(comm.type)} bg-white/70`}>
                                {comm.type}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                            {comm.message || comm.content}
                          </p>
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-medium ${getAudienceColor(comm.audience)}`}>
                              {comm.audience}
                            </span>
                            <span className="text-gray-500">
                              {new Date(comm.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No communications yet</p>
                        <p className="text-sm text-gray-400">Your sent messages will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
