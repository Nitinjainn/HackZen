"use client"

import { useState } from "react"
import { Input } from "../../../components/CommonUI/input"
import { Button } from "../../../components/CommonUI/button"
import { Textarea } from "../../../components/CommonUI/textarea"
import { Label } from "../../../components/CommonUI/label"
import { Upload, ImageIcon, CheckCircle, AlertCircle, X } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/CommonUI/card"
import { API_BASE_URL } from "../../../lib/api"

export default function AddCertificateForm() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    preview: "", // can be Cloudinary or manual link
    isDefault: false,
  })

  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [uploading, setUploading] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleImageUpload = async (file) => {
    setUploading(true)
    const data = new FormData()
    data.append("file", file)
    data.append("upload_preset", "hackzen_uploads")
    data.append("folder", "hackzen")

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dg2q2tzbv/image/upload", {
        method: "POST",
        body: data,
      })
      const json = await res.json()
      if (json.secure_url) {
        setFormData((prev) => ({
          ...prev,
          preview: json.secure_url,
        }))
      }
    } catch (err) {
      setError("Image upload failed. Try again.", err)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setSuccess(false);

  try {
    const token = localStorage.getItem("token"); // or use context if using AuthProvider

    const res = await fetch(`${API_BASE_URL}/api/certificate-pages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // ✅ Add this header
      },
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      const errRes = await res.json();
      throw new Error(errRes.error || "Failed to add certificate.");
    }

    setSuccess(true);
    setFormData({
      title: "",
      description: "",
      preview: "",
      isDefault: false,
    });
  } catch (err) {
    setError(err.message || "Something went wrong.");
  }
};


  const removePreviewImage = () => {
    setFormData((prev) => ({
      ...prev,
      preview: "",
    }))
  }

  return (
    <div className="min-h-screen">
      <div className="w-full mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1 text-left">Add New Certificate Template</h1>
        <p className="text-gray-600 text-base font-normal mt-1 text-left">
          Create a beautiful certificate template for your events and competitions
        </p>
      </div>
      <div className="w-full">
        <Card className="w-full py-5">
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8 w-full">
              {/* Basic Information Section */}
              <div className="space-y-6">
                <div className="pb-2">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Basic Information</h3>
                  <p className="text-gray-500 text-sm">Provide the essential details for your certificate template</p>
                </div>
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                    Certificate Title *
                  </Label>
                  <Input
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="h-12 text-base border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg w-full"
                    placeholder="e.g., Achievement Certificate, Winner's Award"
                  />
                </div>
                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                    Description
                  </Label>
                  <Textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="text-base border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg resize-none w-full"
                    placeholder="Describe when and how this certificate template should be used..."
                  />
                </div>
              </div>
              {/* Image Section */}
              <div className="space-y-6">
                <div className="pb-2">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Certificate Preview</h3>
                  <p className="text-gray-500 text-sm">Upload an image or provide a URL for the certificate template</p>
                </div>
                {/* Manual Image URL */}
                <div className="space-y-2">
                  <Label htmlFor="preview" className="text-sm font-medium text-gray-700">
                    Preview Image URL
                  </Label>
                  <Input
                    name="preview"
                    value={formData.preview}
                    onChange={handleChange}
                    className="h-12 text-base border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg w-full"
                    placeholder="https://example.com/certificate-template.jpg"
                  />
                </div>
                {/* OR Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500 font-medium">OR</span>
                  </div>
                </div>
                {/* Enhanced Upload Section */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-gray-700">Upload Certificate Image</Label>
                  {!formData.preview ? (
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0]
                          if (file) handleImageUpload(file)
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        disabled={uploading}
                      />
                      <div
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                          uploading
                            ? "border-indigo-300 bg-indigo-50"
                            : "border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer"
                        }`}
                      >
                        <div className="flex flex-col items-center space-y-4">
                          <div
                            className={`rounded-full p-4 transition-colors ${
                              uploading ? "bg-indigo-100" : "bg-gray-100 group-hover:bg-indigo-100"
                            }`}
                          >
                            {uploading ? (
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            ) : (
                              <Upload className="h-8 w-8 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-base font-medium text-gray-700">
                              {uploading ? "Uploading your image..." : "Drop your certificate image here"}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {uploading
                                ? "Please wait while we process your file"
                                : "or click to browse files (PNG, JPG, JPEG)"}
                            </p>
                          </div>
                          {!uploading && (
                            <Button
                              type="button"
                              variant="outline"
                              className="border-indigo-300 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 bg-transparent"
                            >
                              <ImageIcon className="h-4 w-4 mr-2" />
                              Choose File
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 w-full">
                        <div className="flex items-start space-x-4">
                          <img
                            src={formData.preview || "/placeholder.svg"}
                            alt="Certificate Preview"
                            className="h-32 w-48 object-cover rounded-lg shadow-sm border border-gray-200"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 mb-1">Preview Image</p>
                            <p className="text-xs text-gray-500 break-all">{formData.preview}</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={removePreviewImage}
                              className="mt-3 text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 bg-transparent"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Remove Image
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Settings Section */}
              <div className="space-y-6">
                <div className="pb-2">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Template Settings</h3>
                  <p className="text-gray-500 text-sm">Configure additional options for this certificate template</p>
                </div>
                {/* Is Default Checkbox */}
                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={formData.isDefault}
                    onChange={handleChange}
                    className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mt-0.5"
                  />
                  <div>
                    <Label htmlFor="isDefault" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Set as Default Template
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      This template will be automatically selected when creating new certificates
                    </p>
                  </div>
                </div>
              </div>
              {/* Submit Button */}
              <div className="pt-6 border-t border-gray-200">
                <Button
                  type="submit"
                  className="w-full h-14 text-lg font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploading}
                >
                  {uploading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5" />
                      <span>Create Certificate Template</span>
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        {/* Success/Error Messages */}
        {success && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl text-center">
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-green-800 font-medium">Certificate template added successfully!</p>
            </div>
          </div>
        )}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-center">
            <div className="flex items-center justify-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
