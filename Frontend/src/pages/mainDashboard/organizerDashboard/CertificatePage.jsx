"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "../../../components/CommonUI/card";
import { Button } from "../../../components/CommonUI/button";
import { Badge } from "../../../components/CommonUI/badge";
import { Plus, Upload, Info, Eye, Edit, Trash2 } from "lucide-react";
import CertificateEditor from "./components/CertificateEditor";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../../../lib/api";

function replacePlaceholders(content, sampleData) {
  return content
    .replace(/\{\{HACKATHON_NAME\}\}/g, sampleData.hackathonName)
    .replace(/\{\{PARTICIPANT_NAME\}\}/g, sampleData.participantName)
    .replace(/\{\{DATE\}\}/g, sampleData.date);
}

export default function CertificatesPage() {
  const [templates, setTemplates] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch(`${API_BASE_URL}/api/certificate-pages`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setTemplates(data))
      .catch((err) => console.error("Failed to load templates:", err));
  }, []);

  const handleEdit = (template) => {
    setEditTemplate(template);
    setShowEditor(true);
  };

  const handlePreview = (template) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this certificate?")) return;
    const token = localStorage.getItem("token");
    try {
      await fetch(`${API_BASE_URL}/api/certificate-pages/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setTemplates((prev) => prev.filter((t) => t._id !== id));
    } catch {
      toast.error("Failed to delete certificate.");
    }
  };

  if (showEditor) {
    return (
      <CertificateEditor
        onBack={() => {
          setShowEditor(false);
          setEditTemplate(null);
        }}
        template={editTemplate}
        onDelete={handleDelete} // Pass delete function to editor
      />
    );
  }

  // Sample data for preview
  const sampleData = {
    hackathonName: "Sample Hackathon",
    participantName: "Jane Doe",
    date: new Date().toLocaleDateString(),
  };

  return (
    <div className="md:min-h-[91vh] flex flex-1 flex-col gap-6 p-6 bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Manage Certificates
        </h1>
        <p className="text-gray-600">
          Create, upload, or reuse certificates to share with participants or
          winners.
        </p>
      </div>

      {/* Certificate Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Upload New Template Card */}
        <Card className="group relative overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 transition-all duration-300 hover:border-indigo-400 hover:bg-indigo-50/50 hover:shadow-xl hover:scale-[1.02] cursor-pointer h-64"
           onClick={() => setShowEditor(true)}>
          <CardContent className="p-0 h-full">
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-6">
              <div className="rounded-full bg-white p-4 shadow-sm transition-all duration-300 group-hover:scale-110">
                <Plus className="h-8 w-8 text-gray-400 group-hover:text-indigo-600 transition-colors" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-700 group-hover:text-indigo-700 transition-colors">
                  Upload Your Own
                </h3>
                <p className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors">
                  Add a custom certificate template
                </p>
              </div>
              <Button
                variant="outline"
                className="border-gray-300 text-gray-700 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 transition-colors bg-transparent"
                size="sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {templates.map((template) => (
          <Card
            key={template._id}
            className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer h-64"
            onClick={() => handleEdit(template)} // Make entire card clickable for edit
          >
            <CardContent className="p-0 h-full relative">
              {/* Certificate Preview - Full Card Background */}
              <div className="absolute inset-0 h-full w-full">
                <img
                  src={template.preview || "/placeholder.svg"}
                  alt={template.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300" />
              </div>

              <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 z-10">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-white text-lg drop-shadow-lg">
                      {template.title}
                    </h3>
                    <p className="text-sm text-white/90 drop-shadow-md line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Modal */}
      {showPreview && previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              onClick={() => setShowPreview(false)}
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4">Certificate Preview</h2>
            <div className="relative w-full max-w-xl mx-auto border shadow rounded-md overflow-hidden">
              <img
                src={previewTemplate.preview}
                alt="Certificate Preview"
                className="w-full object-contain"
              />
              {/* Overlay text fields */}
              <div className="absolute inset-0">
                {previewTemplate.fields.map((field, idx) => {
                  let left = field.x;
                  if (field.textAlign === 'center') {
                    left = field.x + field.width / 2;
                  } else if (field.textAlign === 'right') {
                    left = field.x + field.width;
                  }
                  const top = field.y + field.fontSize * 0.2;
                  let transform = 'none';
                  if (field.textAlign === 'center') {
                    transform = 'translateX(-50%)';
                  } else if (field.textAlign === 'right') {
                    transform = 'translateX(-100%)';
                  }
                  return (
                    <div
                      key={idx}
                      className="absolute"
                      style={{
                        top,
                        left,
                        fontSize: field.fontSize,
                        color: field.color,
                        fontWeight: field.fontWeight,
                        fontFamily: field.fontFamily,
                        textAlign: field.textAlign,
                        pointerEvents: 'none',
                        whiteSpace: 'pre-wrap',
                        transform,
                      }}
                    >
                      {replacePlaceholders(field.content, sampleData)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
