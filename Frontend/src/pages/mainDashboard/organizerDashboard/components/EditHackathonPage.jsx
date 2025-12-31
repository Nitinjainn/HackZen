import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast"; 
import { Loader2 } from "lucide-react"; 
import CreateHackathon from "../Create-hackathon";
import { API_BASE_URL } from "../../../../lib/api";

export default function EditHackathonPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hackathon, setHackathon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false); 

  useEffect(() => {
    async function fetchHackathon() {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/api/hackathons/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch hackathon");
        const data = await res.json();
        setHackathon(data);
      } catch (err) {
        setError(err.message);
        toast.error("Failed to load hackathon: " + err.message); 
      } finally {
        setLoading(false);
      }
    }
    fetchHackathon();
  }, [id]);

  const handleUpdate = async (formData) => {
    if (isUpdating) return; // Prevent multiple clicks

    setIsUpdating(true); // Start loading

    // Ensure wantsSponsoredProblems and sponsoredPSConfig are always present
    const dataToSend = {
      ...formData,
      wantsSponsoredProblems: formData.wantsSponsoredProblems !== undefined ? formData.wantsSponsoredProblems : false,
      sponsoredPSConfig: formData.sponsoredPSConfig || undefined,
    };
    
    console.log('Updating hackathon with data:', dataToSend); // Debug
    
    // Show loading toast
    toast.loading("Updating hackathon...", { id: "hackathon-update" });
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/hackathons/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dataToSend),
      });
      
      toast.dismiss("hackathon-update"); // Dismiss loading toast
      
      if (res.ok) {
        // Show success toast
        toast.success("🎉 Hackathon updated successfully!", {
          duration: 4000,
          icon: "✅",
        });
        
        // Small delay to let user see the success message
        setTimeout(() => {
          navigate("/dashboard/created-hackathons");
        }, 1000);
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update hackathon");
      }
    } catch (err) {
      toast.dismiss("hackathon-update"); // Dismiss loading toast
      toast.error("❌ Error updating hackathon: " + err.message, {
        duration: 5000,
      });
    } finally {
      setIsUpdating(false); // Stop loading
    }
  };

  // Enhanced loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
          <p className="text-lg text-gray-700">Loading hackathon...</p>
        </div>
      </div>
    );
  }

  // Enhanced error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4 p-8 bg-white rounded-xl shadow-lg max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Error Loading Hackathon</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Enhanced not found state
  if (!hackathon) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4 p-8 bg-white rounded-xl shadow-lg max-w-md">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl">🔍</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Hackathon Not Found</h2>
          <p className="text-gray-600">The hackathon you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate("/dashboard/created-hackathons")}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50">
      <CreateHackathon
        initialData={hackathon}
        onSubmit={handleUpdate}
        onBack={() => navigate("/dashboard/created-hackathons")}
        isUpdating={isUpdating} // Pass loading state to child component
      />
    </div>
  );
}
