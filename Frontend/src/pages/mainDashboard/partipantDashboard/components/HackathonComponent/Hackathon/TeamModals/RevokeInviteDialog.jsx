"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../../../../../components/DashboardUI/alert-dialog";
import { useToast } from "../../../../../../../hooks/use-toast";
import { API_BASE_URL } from "../../../../../../../lib/api";

export default function RevokeInviteDialog({ open, invite, onClose, onRevoked }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleRevoke = async () => {
    if (!invite?._id) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE_URL}/api/team-invites/${invite._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to revoke invite");
      }

      toast({
        title: "Invite Revoked",
        description: `The invite to ${invite.invitedEmail} has been revoked.`,
      });

      // Call both callbacks to ensure UI updates
      if (onRevoked) {
        console.log("Calling onRevoked callback");
        onRevoked();
      }
      if (onClose) {
        console.log("Calling onClose callback");
        onClose();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong while revoking.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke Invite</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to revoke the invite sent to{" "}
            <strong>{invite?.invitedEmail}</strong>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRevoke}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? "Revoking..." : "Revoke Invite"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
