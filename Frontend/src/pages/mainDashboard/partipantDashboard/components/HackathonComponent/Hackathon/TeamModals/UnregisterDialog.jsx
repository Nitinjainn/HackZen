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
import { API_BASE_URL } from "../../../../../../../lib/api";

export default function UnregisterDialog({
  open,
  onClose,
  hackathonId,
  onUnregister,
}) {
  const [loading, setLoading] = useState(false);

  const handleUnregister = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/registration/${hackathonId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        onUnregister?.();
        onClose();
      } else {
        const data = await res.json();
        console.error("Unregister failed:", data.message);
      }
    } catch (err) {
      console.error("Error unregistering:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unregister from Hackathon?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to unregister from this hackathon? Your team data and submissions will be lost, and you’ll need to register again to participate.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleUnregister}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? "Unregistering..." : "Unregister"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
