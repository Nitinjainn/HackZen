import React, { useEffect, useState } from "react";
import { Button } from "../../../../components/CommonUI/button";
import { Eye, Send, X } from "lucide-react";
import { API_BASE_URL } from "../../../../lib/api";

function replacePlaceholders(content, sampleData) {
  return content
    .replace(/\{\{HACKATHON_NAME\}\}/g, sampleData.hackathonName)
    .replace(/\{\{PARTICIPANT_NAME\}\}/g, sampleData.participantName)
    .replace(/\{\{DATE\}\}/g, sampleData.date);
}

export default function SendCertificateModal({ hackathonId, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch certificate templates
    const token = localStorage.getItem("token");
    fetch(`${API_BASE_URL}/api/certificate-pages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setTemplates(data))
      .catch((err) => setError("Failed to load templates"));
  }, [hackathonId]);

  const handleSend = async () => {
    if (!selectedTemplate) return;
    setSending(true);
    setResult(null);
    setError("");
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/hackathons/${hackathonId}/send-certificates`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ templateId: selectedTemplate._id }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setResult(data.message || "Certificates sent!");
      } else {
        setError(data.error || "Failed to send certificates");
      }
    } catch (err) {
      setError("Failed to send certificates");
    } finally {
      setSending(false);
    }
  };

  // Remove sample data for preview; just show the field content as-is

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full relative">
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </button>
        <h2 className="text-2xl font-bold mb-4">Send Certificates</h2>
        {error && <div className="mb-4 text-red-600">{error}</div>}
        {result && <div className="mb-4 text-green-600">{result}</div>}
        <div className="mb-4">
          <label className="block font-medium mb-2">Choose Certificate Template:</label>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={selectedTemplate?._id || ""}
            onChange={e => {
              const t = templates.find(t => t._id === e.target.value);
              setSelectedTemplate(t);
            }}
          >
            <option value="">Select a template</option>
            {templates.map(t => (
              <option key={t._id} value={t._id}>{t.title}</option>
            ))}
          </select>
        </div>
        {/* Certificate Preview */}
        {selectedTemplate && (
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Certificate Preview</h3>
            <div className="relative w-full max-w-xl mx-auto border shadow rounded-md overflow-hidden">
              <img
                src={selectedTemplate.preview}
                alt="Certificate Preview"
                className="w-full object-contain"
              />
              {/* No overlay text fields or placeholders */}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} variant="outline">Cancel</Button>
          <Button
            onClick={handleSend}
            disabled={!selectedTemplate || sending}
            className="bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Send className="h-4 w-4 mr-1" />
            {sending ? "Sending..." : "Send Certificates"}
          </Button>
        </div>
      </div>
    </div>
  );
} 