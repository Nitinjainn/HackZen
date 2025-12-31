"use client";

import { useState, useEffect } from "react";
import { Input } from "../../../../../../../components/CommonUI/input";
import { Button } from "../../../../../../../components/CommonUI/button";
import BaseModal from "./BaseModal";
import { Copy, X } from "lucide-react"; 
import { useToast } from "../../../../../../../hooks/use-toast";
import { Loader2 } from "lucide-react";
import { API_BASE_URL } from "../../../../../../../lib/api";

export default function InviteModal({ onInvite, team, hackathon, project, show, onClose }) {
  const [email, setEmail] = useState("");
  const [inviteLink, setInviteLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (show) {
      setSuccessMessage("");
      setErrorMessage("");
      setInviteLink(null);
      setEmail("");
    }
  }, [show]);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setSuccessMessage("");
    setErrorMessage("");
    // Robust null checks
    if (!team || !team._id) {
      toast({
        title: "Error",
        description: "Team not loaded. Please try again later.",
        variant: "destructive",
      });
      setErrorMessage("Team not loaded. Please try again later.");
      return;
    }
    if (!hackathon && !project) {
      toast({
        title: "Error",
        description: "Context not loaded. Please try again later.",
        variant: "destructive",
      });
      setErrorMessage("Context not loaded. Please try again later.");
      return;
    }
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const inviteData = {
        invitedEmail: email,
        teamId: team._id,
      };
      // Add context-specific ID
      if (hackathon) {
        inviteData.hackathonId = hackathon._id;
      } else if (project) {
        inviteData.projectId = project._id;
      }
      const res = await fetch("${API_BASE_URL}/api/team-invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(inviteData),
      });
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = { message: "Invalid server response." };
      }
      if (res.ok && data.invite && data.invite._id) {
        onInvite?.(); // callback to refresh invite list
        const link = `${window.location.origin}/invite/${data.invite._id}`;
        setInviteLink(link);
        setEmail("");
        setSuccessMessage("Invite sent successfully!");
        toast({
          title: "Invite Sent",
          description: "The invitation was sent successfully.",
        });
      } else {
        let errorMsg = data.error || data.message || "Could not send invite";
        if (
          errorMsg.toLowerCase().includes("already sent") ||
          errorMsg.toLowerCase().includes("already invited")
        ) {
          errorMsg = "You have already sent an invite to this email.";
        }
        setErrorMessage(errorMsg);
        toast({
          title: "Invite Failed",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error sending invite:", err);
      setErrorMessage(err.message || "Something went wrong while sending the invite");
      toast({
        title: "Error",
        description: err.message || "Something went wrong while sending the invite",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast({ title: "Copied", description: "Invite link copied to clipboard" });
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClose = () => {
    setEmail("");
    setInviteLink(null);
    onClose();
  };

  return (
    <BaseModal
      title={
        <div className="flex items-center justify-between w-full">
          <span>Invite Team Member</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-6 w-6 p-0 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      }
      description="Enter the email address of the person you want to invite to your team. They will receive an email and, if they already have an account, an in-app notification."
      open={show}
      onOpenChange={handleClose}
      content={
        <div className="space-y-4">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            disabled={loading}
          />
          <Button onClick={handleInvite} disabled={!email.trim() || loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...
              </>
            ) : (
              "Send Invite"
            )}
          </Button>

          {successMessage && !loading && (
            <div className="text-green-700 font-medium text-center">{successMessage}</div>
          )}
          {errorMessage && !loading && (
            <div className="text-red-600 font-medium text-center">{errorMessage}</div>
          )}

          {inviteLink && !loading && (
            <div className="text-sm text-gray-600">
              Share this invite link:
              <div className="bg-gray-100 mt-2 px-3 py-2 rounded flex items-center justify-between">
                <span className="break-all">{inviteLink}</span>
                <Button size="icon" variant="ghost" onClick={handleCopy}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {copied && <p className="text-green-600 mt-1">Link copied!</p>}
            </div>
          )}
        </div>
      }
    />
  );
}
