import { Dialog } from "@headlessui/react";
import { useState } from "react";
import CreateHackathon from "../Create-hackathon";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../../../../lib/api";

export default function HackathonEditModal({ hackathon, onClose, onUpdated }) {
  // Handler for updating hackathon
  const handleUpdate = async (formData) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/hackathons/${hackathon._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
          toast.success("Hackathon updated successfully!");
        onUpdated && onUpdated();
        onClose && onClose();
      } else {
        toast.error("Failed to update hackathon. Please try again.");
      }
    } catch (err) {
      toast.error("Error updating hackathon: " + err.message);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-6 relative">
          <h2 className="text-xl font-bold mb-4">Edit Hackathon</h2>
          <CreateHackathon initialData={hackathon} onSubmit={handleUpdate} onBack={onClose} />
        </div>
      </div>
    </Dialog>
  );
}
