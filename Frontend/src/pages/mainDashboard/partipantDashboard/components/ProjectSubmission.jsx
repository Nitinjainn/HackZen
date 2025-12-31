"use client";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { API_BASE_URL } from "../../../../lib/api";
import {
  ArrowLeft,
  Save,
  Upload,
  Github,
  Globe,
  Plus,
  X,
  Video,
  LinkIcon,
  Users,
  Calendar,
  Tag,
  Loader2,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { Button } from "../../../../components/CommonUI/button";
import { Input } from "../../../../components/CommonUI/input";
import { Badge } from "../../../../components/CommonUI/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../components/CommonUI/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/CommonUI/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/CommonUI/tabs";
import { Label } from "../../../../components/CommonUI/label";
import RichTextEditor from "./RichTextEditor";
import { Textarea } from "../../../../components/CommonUI/textarea";
import { useNavigate, useLocation } from "react-router-dom";

const categories = [
  "AI/ML",
  "Blockchain",
  "Fintech",
  "DevTools",
  "Education",
  "HealthTech",
  "Sustainability",
  "Gaming",
  "Productivity",
  "Other",
];

const FIELD_LIMITS = {
  title: 100,
  oneLineIntro: 150,
  description: 5000,
  teamIntro: 1000,
  githubLink: 200,
  websiteLink: 200,
  socialLink: 200,
  customCategory: 50,
  skill: 30,
  videoFile: 100 * 1024 * 1024, // 100MB
  logoFile: 2 * 1024 * 1024, // 2MB
};

export default function ProjectSubmission({
  onBack,
  onSave,
  mode = "create",
  initialData = {},
  projectId,
}) {
  const [formData, setFormData] = useState({
    title: initialData.title || "",
    oneLineIntro: initialData.oneLineIntro || "",
    description: initialData.description || "",
    teamIntro: initialData.teamIntro || "",
    skills: initialData.skills || [],
    logo: initialData.logo || null,
    githubLink: initialData.repoLink || "",
    websiteLink: initialData.websiteLink || "",
    demoVideoType: initialData.videoLink ? "link" : "upload",
    demoVideoFile: null,
    demoVideoLink: initialData.videoLink || "",
    socialLinks: initialData.socialLinks || [""],
    category: initialData.category || "",
    customCategory: initialData.customCategory || "",
    status: initialData.status || "draft",
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add this delete handler function
  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE_URL}/api/projects/${projectId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to delete");

      toast.success("🗑️ Project deleted successfully", {
        duration: 4000,
        icon: "✅",
      });

      setShowDeleteModal(false); // Close modal
      onBack?.(); // Redirect user after deletion
    } catch (err) {
      toast.error("❌ Delete failed: " + err.message, {
        duration: 5000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete Confirmation Modal Component
  const DeleteConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    projectTitle,
    isDeleting,
  }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Project
              </h3>
              <p className="text-sm text-gray-500">
                This action cannot be undone
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="mb-6">
            <p className="text-gray-700 mb-2">
              Are you sure you want to delete this project?
            </p>
            {projectTitle && (
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-sm text-gray-600">Project:</p>
                <p className="font-semibold text-gray-900 truncate">
                  {projectTitle}
                </p>
              </div>
            )}
            <p className="text-sm text-red-600 mt-3">
              This will permanently delete all project data, including images,
              videos, and associated information.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-6 flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Project
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const [logoPreview, setLogoPreview] = useState(
    initialData?.logo?.url || null
  );
  const [currentSkill, setCurrentSkill] = useState("");
  const [isSaving, setIsSaving] = useState(false); // Add loading state
  const navigate = useNavigate();
  const location = useLocation();

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > FIELD_LIMITS.logoFile) {
        toast.error("Logo file size must be less than 2MB");
        return;
      }
      setFormData((prev) => ({ ...prev, logo: file }));
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target?.result);
      reader.readAsDataURL(file);
    }
  };

  const addSkill = () => {
    if (currentSkill.trim() && !formData.skills.includes(currentSkill.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, currentSkill.trim()],
      }));
      setCurrentSkill("");
    }
  };

  const removeSkill = (skillToRemove) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== skillToRemove),
    }));
  };

  const handleSkillKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  const addSocialLink = () => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: [...prev.socialLinks, ""],
    }));
  };

  const removeSocialLink = (index) => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index),
    }));
  };

  const updateSocialLink = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.map((link, i) =>
        i === index ? value : link
      ),
    }));
  };

  const isIncomplete =
    !formData.title ||
    !formData.oneLineIntro ||
    !formData.description ||
    !formData.category ||
    formData.skills.length === 0;

  const getStatusBadge = () => {
    const statusConfig = {
      draft: { label: "Draft", className: "bg-gray-100 text-gray-800" },
      submitted: {
        label: "Submitted",
        className: "bg-yellow-100 text-yellow-800",
      },
      reviewed: {
        label: "Reviewed",
        className: "bg-purple-100 text-purple-800",
      },
    };
    const config = statusConfig[formData.status];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleSave = async () => {
    if (isSaving) return; // Prevent multiple clicks

    setIsSaving(true); // Start loading

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("You must be logged in.");
        return;
      }

      let logoData = initialData?.logo || null; // fallback to original if no new upload
      let videoLink = "";

      // Upload Logo if it's a File
      if (formData.logo instanceof File) {
        toast.loading("Uploading logo...", { id: "logo-upload" }); // Show loading toast

        const formLogo = new FormData();
        formLogo.append("file", formData.logo);
        formLogo.append("upload_preset", "hackzen_uploads");
        formLogo.append("folder", "project-logos");

        const res = await fetch(
          "https://api.cloudinary.com/v1_1/dg2q2tzbv/image/upload",
          {
            method: "POST",
            body: formLogo,
          }
        );
        const data = await res.json();

        toast.dismiss("logo-upload"); // Dismiss loading toast

        if (!data.secure_url) throw new Error("Logo upload failed");
        logoData = {
          url: data.secure_url,
          publicId: data.public_id,
        };

        toast.success("Logo uploaded successfully!"); // Show success toast
      }

      // Upload Demo Video if "upload" mode is selected
      if (
        formData.demoVideoType === "upload" &&
        formData.demoVideoFile instanceof File
      ) {
        toast.loading("Uploading video...", { id: "video-upload" }); // Show loading toast

        const formVideo = new FormData();
        formVideo.append("file", formData.demoVideoFile);
        formVideo.append("upload_preset", "hackzen_uploads");
        formVideo.append("folder", "project-videos");
        formVideo.append("resource_type", "video");

        const res = await fetch(
          "https://api.cloudinary.com/v1_1/dg2q2tzbv/video/upload",
          {
            method: "POST",
            body: formVideo,
          }
        );
        const data = await res.json();

        toast.dismiss("video-upload"); // Dismiss loading toast

        if (!data.secure_url) throw new Error("Video upload failed");
        videoLink = data.secure_url;

        toast.success("Video uploaded successfully!"); // Show success toast
      }

      if (formData.demoVideoType === "link") {
        videoLink = formData.demoVideoLink;
      }

      // Show saving toast
      toast.loading("Saving project...", { id: "project-save" });

      // Prepare backend payload
      const payload = {
        title: formData.title,
        oneLineIntro: formData.oneLineIntro,
        description: formData.description,
        teamIntro: formData.teamIntro,
        skills: formData.skills,
        repoLink: formData.githubLink,
        websiteLink: formData.websiteLink,
        videoLink,
        socialLinks: formData.socialLinks.filter((s) => s.trim() !== ""),
        logo: logoData,
        category: formData.category,
        customCategory: formData.customCategory,
        status: "draft",
      };

      const url =
        mode === "edit"
          ? `${API_BASE_URL}/api/projects/${projectId}`
          : "${API_BASE_URL}/api/projects";

      const method = mode === "edit" ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const created = await response.json();

      toast.dismiss("project-save"); // Dismiss saving toast

      if (!response.ok)
        throw new Error(created.message || "Failed to save project");

      // Show success toast
      toast.success("✅ Project saved successfully!", {
        duration: 4000,
        icon: "🎉",
      });

      onSave?.(created);

      // Redirect back to returnUrl if present
      const params = new URLSearchParams(location.search);
      const returnUrl = params.get("returnUrl");
      if (returnUrl && created && created.project && created.project._id) {
        navigate(
          `${decodeURIComponent(returnUrl)}&newProjectId=${created.project._id}`
        );
      } else {
        window.location.href = "/dashboard/my-hackathons";
      }
    } catch (error) {
      toast.dismiss(); // Dismiss any loading toasts
      toast.error("❌ Error: " + error.message, {
        duration: 5000,
      });
    } finally {
      setIsSaving(false); // Stop loading
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-purple-50 to-slate-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
        <Card className="shadow-none hover:shadow-none">
            <CardContent className="pt-8 pb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4 md:gap-0">
                <Button
                  variant="ghost"
                  onClick={onBack}
                  className="flex items-center gap-2 text-indigo-600 hover:bg-indigo-50 font-semibold text-base px-4 py-2 rounded-lg shadow-none"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <div className="flex items-center gap-3">
                  {getStatusBadge()}
                  {isIncomplete && (
                    <Badge variant="destructive">Incomplete Project</Badge>
                  )}
                </div>
              </div>
              <hr className="my-4 border-gray-200" />
              {/* Project Title and One-Line Intro - Full Width */}
              <div className="space-y-6">
                <div>
                  <Label
                    htmlFor="title"
                    className="text-sm font-medium text-gray-700"
                  >
                    Project Title *{" "}
                    <span className="text-xs text-gray-400">
                      ({formData.title.length}/{FIELD_LIMITS.title})
                    </span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Enter your project title"
                    value={formData.title}
                    onChange={(e) => {
                      if (e.target.value.length <= FIELD_LIMITS.title) {
                        handleInputChange("title", e.target.value);
                      }
                    }}
                    className="mt-1"
                    maxLength={FIELD_LIMITS.title}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    A concise, descriptive project name.
                  </p>
                </div>
                <div>
                  <Label
                    htmlFor="oneLineIntro"
                    className="text-sm font-medium text-gray-700"
                  >
                    One-Line Intro *{" "}
                    <span className="text-xs text-gray-400">
                      ({formData.oneLineIntro.length}/
                      {FIELD_LIMITS.oneLineIntro})
                    </span>
                  </Label>
                  <Input
                    id="oneLineIntro"
                    placeholder="A brief one-line description of your project"
                    value={formData.oneLineIntro}
                    onChange={(e) => {
                      if (e.target.value.length <= FIELD_LIMITS.oneLineIntro) {
                        handleInputChange("oneLineIntro", e.target.value);
                      }
                    }}
                    className="mt-1"
                    maxLength={FIELD_LIMITS.oneLineIntro}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Summarize your project in a single sentence.
                  </p>
                </div>
                <div>
                  <Label
                    htmlFor="description"
                    className="text-sm font-medium text-gray-700"
                  >
                    Project Description *
                  </Label>
                  <div className="mt-1">
                    <RichTextEditor
                      value={formData.description}
                      onChange={(value) =>
                        handleInputChange("description", value)
                      }
                      placeholder="Describe your project vision and what problem it solves..."
                      maxLength={FIELD_LIMITS.description}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Explain the purpose, goals, and impact of your project.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Skills */}
            <Card className="shadow-none hover:shadow-none">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Tech Stack *
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a skill (e.g., React, Python, AI)"
                      value={currentSkill}
                      onChange={(e) => {
                        if (e.target.value.length <= FIELD_LIMITS.skill) {
                          setCurrentSkill(e.target.value);
                        }
                      }}
                      onKeyPress={handleSkillKeyPress}
                      maxLength={FIELD_LIMITS.skill}
                    />
                    <Button
                      onClick={addSkill}
                      disabled={!currentSkill.trim()}
                      className="shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {formData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.skills.map((skill, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="flex items-center gap-1 px-3 py-1"
                        >
                          {skill}
                          <X
                            className="w-3 h-3 cursor-pointer hover:text-red-500"
                            onClick={() => removeSkill(skill)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400">
                    Press Enter or click + to add skills
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Project Logo */}
            <Card className="shadow-none hover:shadow-none">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Project Logo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <Upload className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <Label htmlFor="logo" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Upload className="w-4 h-4" />
                        Upload Logo
                      </div>
                    </Label>
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      PNG, JPG up to 2MB
                    </p>
                  </div>
                </div>
                {/* Preview */}
                {logoPreview && (
                  <div className="mt-4">
                    <Label className="text-sm text-gray-600 mb-2 block">
                      Preview:
                    </Label>
                    <img
                      src={logoPreview}
                      alt="Full Logo Preview"
                      className="w-full max-w-sm rounded-lg border border-gray-200 shadow-sm"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category */}
            <Card className="shadow-none hover:shadow-none">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Category *
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    handleInputChange("category", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.category === "Other" && (
                  <Input
                    placeholder="Enter custom category"
                    value={formData.customCategory}
                    onChange={(e) => {
                      if (
                        e.target.value.length <= FIELD_LIMITS.customCategory
                      ) {
                        handleInputChange("customCategory", e.target.value);
                      }
                    }}
                    maxLength={FIELD_LIMITS.customCategory}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Links */}
            <Card className="shadow-none hover:shadow-none">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Project Links
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label
                    htmlFor="github"
                    className="text-sm font-medium text-gray-700"
                  >
                    GitHub Repository *
                  </Label>
                  <div className="relative mt-1">
                    <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="github"
                      placeholder="https://github.com/username/repo"
                      value={formData.githubLink}
                      onChange={(e) => {
                        if (e.target.value.length <= FIELD_LIMITS.githubLink) {
                          handleInputChange("githubLink", e.target.value);
                        }
                      }}
                      className="pl-10"
                      maxLength={FIELD_LIMITS.githubLink}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Link to your public code repository.
                  </p>
                </div>
                <div>
                  <Label
                    htmlFor="website"
                    className="text-sm font-medium text-gray-700"
                  >
                    Website Link (Optional)
                  </Label>
                  <div className="relative mt-1">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="website"
                      placeholder="https://yourproject.com"
                      value={formData.websiteLink}
                      onChange={(e) => {
                        if (e.target.value.length <= FIELD_LIMITS.websiteLink) {
                          handleInputChange("websiteLink", e.target.value);
                        }
                      }}
                      className="pl-10"
                      maxLength={FIELD_LIMITS.websiteLink}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Project website or live demo (if available).
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Demo Video */}
            <Card className="shadow-none hover:shadow-none">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Demo Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs
                  value={formData.demoVideoType}
                  onValueChange={(value) =>
                    handleInputChange("demoVideoType", value)
                  }
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">Upload Video</TabsTrigger>
                    <TabsTrigger value="link">Paste Link</TabsTrigger>
                  </TabsList>
                  <TabsContent value="upload" className="mt-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Video className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <Label htmlFor="video" className="cursor-pointer">
                        <div className="text-sm text-gray-600">
                          Click to upload or drag and drop
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          MP4, MOV up to 100MB
                        </div>
                      </Label>
                      <Input
                        id="video"
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && file.size > FIELD_LIMITS.videoFile) {
                            toast.error(
                              "Video file size must be less than 100MB"
                            );
                            return;
                          }
                          handleInputChange("demoVideoFile", file);
                        }}
                        className="hidden"
                      />
                      {formData.demoVideoFile && (
                        <div className="mt-2 text-sm text-green-600">
                          ✓ {formData.demoVideoFile.name}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="link" className="mt-4">
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="https://youtube.com/watch?v=..."
                        value={formData.demoVideoLink}
                        onChange={(e) =>
                          handleInputChange("demoVideoLink", e.target.value)
                        }
                        className="pl-10"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Social Links */}
           <Card className="shadow-none hover:shadow-none">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Social Links
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {formData.socialLinks.map((link, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="https://twitter.com/username"
                      value={link}
                      onChange={(e) => {
                        if (e.target.value.length <= FIELD_LIMITS.socialLink) {
                          updateSocialLink(index, e.target.value);
                        }
                      }}
                      maxLength={FIELD_LIMITS.socialLink}
                    />
                    {formData.socialLinks.length > 1 && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeSocialLink(index)}
                        className="shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={addSocialLink}
                  className="w-full flex items-center gap-2 bg-transparent"
                >
                  <Plus className="w-4 h-4" />
                  Add Social Link
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Save Button - Updated with loading state */}
        <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-gray-200 pt-6">
          <div className="flex items-center gap-3">
            {getStatusBadge()}
            <span className="text-sm text-gray-500">
              Last saved: {new Date().toLocaleTimeString()}
            </span>
          </div>
          <div className="flex gap-4">
            {mode === "edit" && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2"
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4" />
                Delete Project
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving} // Disable button when saving
              size="lg"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg shadow-lg font-bold text-base transition-all duration-200"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Project
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        projectTitle={formData.title}
        isDeleting={isDeleting}
      />
    </div>
  );
}
