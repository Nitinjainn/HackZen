"use client";
import { ArrowLeft, Heart, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../../../../components/CommonUI/button";
import { Badge } from "../../../../../../components/CommonUI/badge";
import { API_BASE_URL } from "../../../../../../lib/api";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "../../../../../../components/DashboardUI/alert-dialog";

export default function HeaderSection({
  hackathon,
  onBack,
  backButtonLabel,
  isSaved,
  setIsSaved,
  isRegistered,
  setShowRegistration,
  refreshRegistrationStatus,
}) {
  const [showUnregisterDialog, setShowUnregisterDialog] = useState(false);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/users/save-hackathon`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ hackathonId: hackathon._id }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsSaved(data.savedHackathons.some(h => h === hackathon._id || h._id === hackathon._id));
      }
    } catch (err) {
      console.error("Error saving hackathon:", err);
    }
  };

  const handleUnregister = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/registration/${hackathon._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        refreshRegistrationStatus();
        setShowUnregisterDialog(false);
      }
    } catch (err) {
      console.error("Failed to unregister:", err);
    }
  };

  return (
    <header>
      {/* Top Bar */}
      <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        {/* Left: Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-semibold text-gray-800 hover:text-black"
        >
          <ArrowLeft className="w-4 h-4" />
          {backButtonLabel || "Back"}
        </button>

        {/* Right: Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className={isSaved ? "text-red-500" : ""}
          >
            <Heart className={`w-4 h-4 mr-1 ${isSaved ? "fill-current" : ""}`} />
            {isSaved ? "Saved" : "Save"}
          </Button>
          <Button variant="ghost" size="sm">
            <Share2 className="w-4 h-4 mr-1" />
            Share
          </Button>

          {isRegistered ? (
            <>
              <Button
                size="sm"
                onClick={() => setShowRegistration(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                View Details
              </Button>
              <button
                onClick={() => setShowUnregisterDialog(true)}
                className="cursor-pointer"
                title="Click to unregister from hackathon"
              >
                <Badge variant="success">Registered</Badge>
              </button>

              <AlertDialog open={showUnregisterDialog} onOpenChange={setShowUnregisterDialog}>
                <AlertDialogTrigger asChild>
                  <span />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Unregister from Hackathon?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to unregister? You'll lose your spot.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleUnregister}>
                      Unregister
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => setShowRegistration(false)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Register
            </Button>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="pb-4 md:ml-20 ml-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {hackathon.name || "Hackathon Title"}
        </h1>
      </div>
    </header>
  );
}