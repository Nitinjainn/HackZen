"use client";
import { useState } from "react";
import { useNavigate } from "react-router-dom"; // Add this import
import { useAuth } from "../../../../context/AuthContext";
import { API_BASE_URL } from "../../../../lib/api";
import { ArrowLeft, Plus, X, Upload, Save, Send, Clock } from "lucide-react";
import { Button } from "../../../../components/CommonUI/button";
import { Input } from "../../../../components/CommonUI/input";
import { Card, CardContent } from "../../../../components/CommonUI/card";
import { Badge } from "../../../../components/CommonUI/badge";
import { Separator } from "../../../../components/CommonUI/separator";
import { Textarea } from "../../../../components/CommonUI/textarea";
import { Label } from "../../../../components/CommonUI/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/CommonUI/select";
import toast from "react-hot-toast";

export function WriteArticle({ onBack, onSubmit }) {
  const navigate = useNavigate(); // Add this hook
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: "",
    tags: "",
    image: null,
    readTime: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const categories = [
    "Web Development",
    "AI/ML",
    "Blockchain",
    "Cybersecurity",
    "Mobile",
    "DevOps",
  ];

  // Add this handler for the back button
  const handleBackToBlog = () => {
    if (onBack) {
      onBack(); // Call the onBack prop if provided
    } else {
      navigate('/dashboard/blogs'); // Navigate to blogs page
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("File size exceeds 5MB limit.");
      return;
    }

    const formDataCloud = new FormData();
    formDataCloud.append("file", file);
    formDataCloud.append("upload_preset", "hackzen_uploads");
    formDataCloud.append("folder", "hackzen");

    try {
      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dg2q2tzbv/image/upload",
        {
          method: "POST",
          body: formDataCloud,
        }
      );
      const data = await response.json();
      if (data.secure_url) {
        setFormData((prev) => ({ ...prev, image: data.secure_url }));
      } else {
        toast.error("Image upload failed.");
      }
    } catch (error) {
      console.error("Cloudinary error", error);
      toast.error("Error uploading image.");
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.excerpt.trim()) newErrors.excerpt = "Excerpt is required";
    if (!formData.content.trim()) newErrors.content = "Content is required";
    if (!formData.category) newErrors.category = "Category is required";
    if (!formData.tags.trim()) newErrors.tags = "Tags are required";
    if (!formData.readTime.trim()) newErrors.readTime = "Read time is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const { token } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/articles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(",").map((tag) => tag.trim()),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error("Article submission failed");

      console.log("Submitted:", data);
      setIsSubmitting(false);
      if (onSubmit) onSubmit(data);
    } catch (error) {
      console.error("Submit error:", error);
      setIsSubmitting(false);
      toast.error("Submission failed. Try again.");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50">
      <header className="bg-white/20 border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Updated the onClick handler */}
            <button variant="default" size="sm" onClick={handleBackToBlog} className="flex items-center gap-1 text-sm font-semibold text-gray-800 hover:text-black">
              <ArrowLeft className="w-4 h-4" />
              Back to Blogs
            </button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900">Write New Article</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Publish Article
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="w-full mx-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Image Upload */}
            <Card className="bg-white/20 border-gray-200 shadow-none hover:shadow-none">
              <CardContent className="pt-6">
                <Label className="text-base font-semibold text-gray-900 mb-4 block">Cover Image</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 relative">
                  {formData.image ? (
                    <div className="relative">
                      <img
                        src={formData.image || "/placeholder.svg"}
                        alt="Cover"
                        className="w-full h-64 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2 bg-white"
                        onClick={() => setFormData((prev) => ({ ...prev, image: null }))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">Click to upload cover image</p>
                      <p className="text-sm text-gray-500">PNG, JPG up to 10MB</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Article Fields */}
            <Card className="bg-white/20 border-gray-200 shadow-none hover:shadow-none">
              <CardContent className="pt-6 space-y-6">
                {/* Title */}
                <div>
                  <Label htmlFor="title" className="font-semibold text-gray-900 mb-2 block">Article Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter your article title..."
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    className={`h-12 ${errors.title ? "border-red-500" : ""}`}
                  />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                </div>

                {/* Excerpt */}
                <div>
                  <Label htmlFor="excerpt" className="font-semibold text-gray-900 mb-2 block">Article Excerpt *</Label>
                  <Textarea
                    id="excerpt"
                    value={formData.excerpt}
                    onChange={(e) => handleInputChange("excerpt", e.target.value)}
                    rows={3}
                    placeholder="Brief description of your article..."
                    className={errors.excerpt ? "border-red-500" : ""}
                  />
                  {errors.excerpt && <p className="text-red-500 text-sm mt-1">{errors.excerpt}</p>}
                </div>

                {/* Category & Read Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="category" className="font-semibold text-gray-900 mb-2 block">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => handleInputChange("category", value)}
                    >
                      <SelectTrigger className={`h-12 ${errors.category ? "border-red-500" : ""}`}>
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
                    {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
                  </div>

                  <div>
                    <Label htmlFor="readTime" className="font-semibold text-gray-900 mb-2 block">
                      Read Time (minutes) *
                    </Label>
                    <Input
                      id="readTime"
                      type="number"
                      placeholder="5"
                      value={formData.readTime}
                      onChange={(e) => handleInputChange("readTime", e.target.value)}
                      className={`h-12 ${errors.readTime ? "border-red-500" : ""}`}
                    />
                    {errors.readTime && <p className="text-red-500 text-sm mt-1">{errors.readTime}</p>}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <Label htmlFor="tags" className="font-semibold text-gray-900 mb-2 block">Tags *</Label>
                  <Input
                    id="tags"
                    placeholder="React, JavaScript (comma separated)"
                    value={formData.tags}
                    onChange={(e) => handleInputChange("tags", e.target.value)}
                    className={`h-12 ${errors.tags ? "border-red-500" : ""}`}
                  />
                  {errors.tags && <p className="text-red-500 text-sm mt-1">{errors.tags}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Content */}
            <Card className="bg-white/20 border-gray-200 shadow-none hover:shadow-none">
              <CardContent className="pt-6">
                <Label htmlFor="content" className="font-semibold text-gray-900 mb-4 block">
                  Article Content *
                </Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => handleInputChange("content", e.target.value)}
                  rows={20}
                  placeholder="Write your article here using Markdown..."
                  className={`resize-none ${errors.content ? "border-red-500" : ""}`}
                />
                {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content}</p>}
              </CardContent>
            </Card>

            {/* Preview */}
            {formData.title && (
              <Card className="bg-white/20 border-gray-200 shadow-none hover:shadow-none">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
                  <div className="border border-gray-200 rounded-lg p-6 bg-white">
                    {formData.image && (
                      <img
                        src={formData.image}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg mb-4"
                      />
                    )}
                    <h4 className="text-xl font-bold text-gray-900 mb-2">{formData.title}</h4>
                    {formData.excerpt && (
                      <div className="text-gray-600 mb-4">{formData.excerpt}</div>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {formData.category && <Badge variant="outline">{formData.category}</Badge>}
                      {formData.readTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formData.readTime} min read
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
