"use client"
import { useState, useRef } from "react"
import { useAuth } from "../../../context/AuthContext"
import { API_BASE_URL } from "../../../lib/api"
import { Plus, Trash2, Calendar, Users, FileText, Save, X, Upload, Loader2, Check, AlertCircle, Info } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/CommonUI/card"
import { Button } from "../../../components/CommonUI/button"
import { Input } from "../../../components/CommonUI/input"
import { Label } from "../../../components/CommonUI/label"
import { Textarea } from "../../../components/CommonUI/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/CommonUI/select"
import { Badge } from "../../../components/CommonUI/badge"
import { Separator } from "../../../components/CommonUI/separator"
import { Alert, AlertDescription } from "../../../components/DashboardUI/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../components/CommonUI/tooltip";

export function CreateHackathon({ onBack }) {
  const { user, token } = useAuth() // Using AuthContext instead of localStorage

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    teamSize: {
      min: 1,
      max: 1,
      allowSolo: true,
    }, // Replace the simple teamSize field with this structure
    problemStatements: [{ statement: "", type: "" }], // Combined structure
    status: "upcoming",
    maxParticipants: 100,
    registrationDeadline: "",
    submissionDeadline: "",
    category: "",
    difficultyLevel: "Beginner", // Match schema field name
    location: "",
    mode: "online",
    prizePool: {
      amount: "",
      currency: "USD",
      breakdown: "",
    },
    requirements: [""],
    perks: [""],
    tags: [],
    images: {
      banner: null,
      logo: null,
      gallery: [],
    },
    judges: [""],
    mentors: [""],
    participants: [],
    rounds: [
      {
        name: "",
        type: "project", // Default round type
        description: "",
        startDate: "",
        endDate: "",
      },
    ],
    submissionType: "single-project", // new field
    roundType: "single-round", // new field
  })

  const [currentTag, setCurrentTag] = useState("")
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadStates, setUploadStates] = useState({
    banner: { uploading: false, error: null },
    logo: { uploading: false, error: null },
    gallery: { uploading: false, error: null },
  })
  const [invalidComboError, setInvalidComboError] = useState("");

  const formTopRef = useRef(null)

  const categories = [
    "Artificial Intelligence",
    "Blockchain",
    "Cybersecurity",
    "Fintech",
    "Gaming",
    "Healthcare",
    "Sustainability",
    "Mobile Development",
    "Web Development",
    "IoT",
    "Data Science",
    "DevOps",
    "EdTech",
  ]

  const modes = ["online", "offline", "hybrid"]

  const problemStatementTypes = [
    "Sponsored",
    "Industrialized",
    "Open Innovation",
    "Social Impact",
    "Technical Challenge",
    "Business Case",
    "Research Based",
    "Community Driven",
  ]

  const validateForm = () => {
    const newErrors = {}

    // Step 0: Basic Info
    if (step === 0) {
      if (!formData.title.trim()) newErrors.title = "Title is required"
      if (!formData.teamSize.min || !formData.teamSize.max) {
        newErrors.teamSize = "Team size limits are required"
      } else if (formData.teamSize.min > formData.teamSize.max) {
        newErrors.teamSize = "Minimum team size cannot be greater than maximum"
      } else if (formData.teamSize.min < 1 || formData.teamSize.max > 10) {
        newErrors.teamSize = "Team size must be between 1 and 10 members"
      }
    }

    // Step 1: Dates & Media
    if (step === 1) {
      if (!formData.startDate) newErrors.startDate = "Start date is required"
      if (!formData.endDate) newErrors.endDate = "End date is required"
      if (!formData.registrationDeadline) newErrors.registrationDeadline = "Registration deadline is required"
    }

    // Step 2: Details
    if (step === 2) {
      // At least one problem statement with both fields filled
      if (
        !formData.problemStatements.length ||
        formData.problemStatements.some((ps) => !ps.statement.trim() || !ps.type.trim())
      ) {
        newErrors.problemStatements = "All problem statements and types are required"
      }
    }

    // Step 3: Requirements & Perks
    if (step === 3) {
      // At least one requirement and one perk
      if (!formData.requirements.length || formData.requirements.some((r) => !r.trim())) {
        newErrors.requirements = "At least one requirement is required"
      }
      if (!formData.perks.length || formData.perks.some((p) => !p.trim())) {
        newErrors.perks = "At least one perk is required"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Image upload function from first file
  const handleFileSelect = async (file, type) => {
    if (!file) return

    setUploadStates((prev) => ({
      ...prev,
      [type]: { uploading: true, error: null },
    }))

    const uploadFormData = new FormData()
    uploadFormData.append("image", file)

    try {
      const res = await fetch(`${API_BASE_URL}/api/uploads/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadFormData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Upload failed")
      }

      // Update formData.images
      setFormData((prev) => ({
        ...prev,
        images: {
          ...prev.images,
          [type]: data, // { url, publicId, width, height }
        },
      }))

      setUploadStates((prev) => ({
        ...prev,
        [type]: { uploading: false, error: null },
      }))
    } catch (err) {
      console.error("Upload error:", err)
      setUploadStates((prev) => ({
        ...prev,
        [type]: { uploading: false, error: err.message },
      }))
    }
  }

  const removeImage = (type, index = null) => {
    if (type === "gallery" && index !== null) {
      setFormData((prev) => ({
        ...prev,
        images: {
          ...prev.images,
          gallery: prev.images.gallery.filter((_, i) => i !== index),
        },
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        images: {
          ...prev.images,
          [type]: null,
        },
      }))
    }
  }

  // Updated submit function with proper backend integration
  const handleSubmit = async (isDraft = false) => {
    setIsSubmitting(true)

    try {
      if (!token) {
        alert("You must be logged in to create a hackathon.")
        return
      }

      // Extract valid problem statements and types
      const validProblems = formData.problemStatements.filter((ps) => ps.statement.trim() && ps.type.trim())

      const submitData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        difficultyLevel: formData.difficultyLevel,
        teamSize: formData.teamSize, // This now includes min, max, and allowSolo
        location: formData.location,
        mode: formData.mode,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        registrationDeadline: formData.registrationDeadline
          ? new Date(formData.registrationDeadline).toISOString()
          : null,
        submissionDeadline: formData.submissionDeadline ? new Date(formData.submissionDeadline).toISOString() : null,
        maxParticipants: Number(formData.maxParticipants) || 100,
        problemStatements: validProblems.map((ps) => ps.statement),
        problemStatementTypes: validProblems.map((ps) => ps.type),
        rounds: formData.rounds
          .filter((r) => r.name.trim())
          .map((r) => ({
            name: r.name,
            type: r.type, // Include round type
            description: r.description,
            startDate: r.startDate ? new Date(r.startDate).toISOString() : null,
            endDate: r.endDate ? new Date(r.endDate).toISOString() : null,
          })),
        requirements: formData.requirements.filter((r) => r.trim()),
        perks: formData.perks.filter((p) => p.trim()),
        tags: formData.tags,
        prizePool: {
          amount: formData.prizePool.amount ? Number(formData.prizePool.amount) : null,
          currency: formData.prizePool.currency || "USD",
          breakdown: formData.prizePool.breakdown,
        },
        images: formData.images,
        status: isDraft ? "upcoming" : formData.status,
        judges: formData.judges, // ✅ Include this
        mentors: formData.mentors, // ✅ Include this
        participants: [],
      }

      const response = await fetch(`${API_BASE_URL}/api/hackathons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create hackathon")
      }

      const data = await response.json()
      if (isDraft) {
        alert("✅ Hackathon saved as draft!")
      } else {
        alert("✅ Hackathon created successfully! It will be reviewed by admin before appearing in the explore section.")
      }
      onBack() // Redirect to CreatedHackathons
    } catch (error) {
      console.error("❌ Submission failed:", error)
      alert(`Error: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Combined Problem Statement handlers
  const addProblemStatement = () => {
    setFormData({
      ...formData,
      problemStatements: [...formData.problemStatements, { statement: "", type: "" }],
    })
  }

  const removeProblemStatement = (index) => {
    setFormData({
      ...formData,
      problemStatements: formData.problemStatements.filter((_, i) => i !== index),
    })
  }

  const updateProblemStatement = (index, field, value) => {
    const updated = [...formData.problemStatements]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, problemStatements: updated })
  }

  const addRequirement = () => {
    setFormData({
      ...formData,
      requirements: [...formData.requirements, ""],
    })
  }

  const removeRequirement = (index) => {
    setFormData({
      ...formData,
      requirements: formData.requirements.filter((_, i) => i !== index),
    })
  }

  const updateRequirement = (index, value) => {
    const updated = [...formData.requirements]
    updated[index] = value
    setFormData({ ...formData, requirements: updated })
  }

  const addPerk = () => {
    setFormData({
      ...formData,
      perks: [...formData.perks, ""],
    })
  }

  const removePerk = (index) => {
    setFormData({
      ...formData,
      perks: formData.perks.filter((_, i) => i !== index),
    })
  }

  const updatePerk = (index, value) => {
    const updated = [...formData.perks]
    updated[index] = value
    setFormData({ ...formData, perks: updated })
  }

  // Judge/Mentor handlers
  const addJudge = () => {
    setFormData({
      ...formData,
      judges: [...formData.judges, ""],
    })
  }

  const removeJudge = (index) => {
    setFormData({
      ...formData,
      judges: formData.judges.filter((_, i) => i !== index),
    })
  }

  const updateJudge = (index, value) => {
    const updated = [...formData.judges]
    updated[index] = value
    setFormData({ ...formData, judges: updated })
  }

  // Mentor handlers
  const addMentor = () => {
    setFormData({
      ...formData,
      mentors: [...formData.mentors, ""],
    })
  }

  const removeMentor = (index) => {
    setFormData({
      ...formData,
      mentors: formData.mentors.filter((_, i) => i !== index),
    })
  }

  const updateMentor = (index, value) => {
    const updated = [...formData.mentors]
    updated[index] = value
    setFormData({ ...formData, mentors: updated })
  }

  // Rounds handlers
  const addRound = () => {
    setFormData({
      ...formData,
      rounds: [
        ...formData.rounds,
        {
          name: "",
          type: "project", // Default round type
          description: "",
          startDate: "",
          endDate: "",
        },
      ],
    })
  }

  const removeRound = (index) => {
    setFormData({
      ...formData,
      rounds: formData.rounds.filter((_, i) => i !== index),
    })
  }

  const updateRound = (index, field, value) => {
    const updated = [...formData.rounds]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, rounds: updated })
  }

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, currentTag.trim()],
      })
      setCurrentTag("")
    }
  }

  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    })
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addTag()
    }
  }

  // Image upload component
  const ImageUploadCard = ({ title, description, type, currentImage, multiple = false }) => (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Upload Area */}
        <div className="space-y-3">
          <label
            htmlFor={`upload-${type}`}
            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
              uploadStates[type]?.uploading
                ? "border-purple-500 bg-purple-50"
                : "border-gray-300 hover:border-purple-400 hover:bg-gray-50"
            }`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {uploadStates[type]?.uploading ? (
                <Loader2 className="w-8 h-8 mb-2 text-purple-400 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 mb-2 text-gray-400" />
              )}
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-400">PNG, JPG, GIF up to 5MB</p>
            </div>
            <input
              id={`upload-${type}`}
              type="file"
              className="hidden"
              accept="image/*"
              multiple={multiple}
              onChange={(e) => {
                const file = e.target.files[0]
                if (file) handleFileSelect(file, type)
              }}
              disabled={uploadStates[type]?.uploading}
            />
          </label>

          {/* Error Display */}
          {uploadStates[type]?.error && (
            <div className="flex items-center text-red-500 text-sm">
              <AlertCircle className="w-4 h-4 mr-2" />
              {uploadStates[type].error}
            </div>
          )}

          {/* Current Image Display */}
          {type !== "gallery" && currentImage && (
            <div className="relative">
              <img
                src={currentImage.url || "/placeholder.svg"}
                alt={title}
                className="w-full h-32 object-cover rounded-lg border"
              />
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2 h-6 w-6 p-0"
                onClick={() => removeImage(type)}
              >
                <X className="w-3 h-3" />
              </Button>
              {/* Edit button overlay */}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="absolute top-2 right-10 h-6 w-6 p-0"
                onClick={() => document.getElementById(`edit-upload-${type}`).click()}
                title="Edit image"
              >
                <Upload className="w-3 h-3" />
              </Button>
              <input
                id={`edit-upload-${type}`}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) handleFileSelect(file, type);
                }}
                disabled={uploadStates[type]?.uploading}
              />
              <div className="absolute bottom-2 left-2 bg-green-500 rounded-full p-1">
                <Check className="w-3 h-3 text-white" />
              </div>
            </div>
          )}

          {/* Gallery Images Display */}
          {type === "gallery" && formData.images.gallery.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {formData.images.gallery.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={image.url || "/placeholder.svg"}
                    alt={`Gallery ${index + 1}`}
                    className="w-full h-20 object-cover rounded border"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="absolute top-1 right-1 h-5 w-5 p-0"
                    onClick={() => removeImage("gallery", index)}
                  >
                    <X className="w-2 h-2" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  // Stepper state
  const [step, setStep] = useState(0)
  const steps = ["Basic Info", "Dates & Media", "Details", "Requirements & Perks"]

  // Scroll to top helper
  const scrollToTop = () => {
    if (formTopRef.current) {
      formTopRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  // Navigation handlers with scroll
  const goToStep = (idx) => {
    if (idx > step) {
      // Check if current step is valid before allowing navigation
      if (!validateForm()) {
        setErrors((prev) => ({
          ...prev,
          stepError: "Please fill all required fields before proceeding.",
        }))
        return
      }
    }
    setErrors((prev) => ({ ...prev, stepError: undefined }))
    setStep(idx)
    scrollToTop()
  }

  const nextStep = () => {
    if (!validateForm()) {
      setErrors((prev) => ({
        ...prev,
        stepError: "Please fill all required fields before proceeding.",
      }))
      return
    }
    setErrors((prev) => ({ ...prev, stepError: undefined }))
    setStep((s) => {
      const next = Math.min(s + 1, steps.length - 1)
      setTimeout(scrollToTop, 0)
      return next
    })
  }

  const prevStep = () => {
    setErrors((prev) => ({ ...prev, stepError: undefined }))
    setStep((s) => {
      const prev = Math.max(s - 1, 0)
      setTimeout(scrollToTop, 0)
      return prev
    })
  }

  return (
    <div
      ref={formTopRef}
      className="flex-1 space-y-6 p-6 bg-gradient-to-br from-white via-purple-50 to-purple-100 min-h-screen"
    >
      {/* Stepper Header */}
      <div className="flex items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Create New Hackathon</h1>
          <p className="text-sm text-gray-500">Set up your hackathon event with all the necessary details</p>
        </div>
      </div>
      
      {/* Admin Approval Notice */}
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <strong>Admin Review Required:</strong> Your hackathon will be reviewed by admin before appearing in the explore section. You'll receive a notification once it's approved or rejected.
        </AlertDescription>
      </Alert>
      {/* Stepper Tabs */}
      <div className="flex gap-2 mb-6">
        {steps.map((label, idx) => (
          <button
            key={label}
            type="button"
            onClick={() => goToStep(idx)}
            className={`flex-1 text-center py-2 rounded transition-all duration-150 font-medium border
              ${
                step === idx
                  ? "bg-purple-600 text-white border-purple-600 shadow"
                  : "bg-white text-purple-700 border-purple-200 hover:bg-purple-50"
              }
              ${idx > step ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
            `}
            disabled={idx > step}
          >
            {label}
          </button>
        ))}
      </div>
      {/* Error message for step navigation */}
      {errors.stepError && <div className="mb-2 text-red-600 text-sm font-medium px-2">{errors.stepError}</div>}
      <div className="space-y-6">
        {step === 0 && (
          <>
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Basic Information
                </CardTitle>
                <CardDescription>Essential details about your hackathon</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Hackathon Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter hackathon title..."
                    className={errors.title ? "border-red-500" : ""}
                  />
                  {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your hackathon, its goals, and what participants can expect..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Removed category selection */}
                  <div>
                    <Label htmlFor="difficultyLevel">Difficulty Level</Label>
                    <Select
                      value={formData.difficultyLevel}
                      onValueChange={(value) => setFormData({ ...formData, difficultyLevel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-black shadow-lg rounded-md border">
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="mode">Mode</Label>
                    <Select value={formData.mode} onValueChange={(value) => setFormData({ ...formData, mode: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-black shadow-lg rounded-md border">
                        {modes.map((mode) => (
                          <SelectItem key={mode} value={mode} className="capitalize">
                            {mode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Virtual, San Francisco, CA, etc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="prizeAmount">Prize Amount</Label>
                    <Input
                      id="prizeAmount"
                      type="number"
                      value={formData.prizePool.amount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          prizePool: {
                            ...formData.prizePool,
                            amount: e.target.value,
                          },
                        })
                      }
                      placeholder="10000"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="prizeBreakdown">Prize Breakdown</Label>
                  <Textarea
                    id="prizeBreakdown"
                    value={formData.prizePool.breakdown}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        prizePool: {
                          ...formData.prizePool,
                          breakdown: e.target.value,
                        },
                      })
                    }
                    placeholder="1st Place: $5000, 2nd Place: $3000, 3rd Place: $2000..."
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="teamSizeMin">Minimum Team Size *</Label>
                    <Select
                      value={formData.teamSize.min.toString()}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          teamSize: {
                            ...formData.teamSize,
                            min: Number.parseInt(value),
                            allowSolo: Number.parseInt(value) === 1,
                          },
                        })
                      }
                    >
                      <SelectTrigger className={errors.teamSize ? "border-red-500" : ""}>
                        <SelectValue placeholder="Min size" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-black shadow-lg rounded-md border">
                        {[1, 2, 3, 4, 5].map((size) => (
                          <SelectItem key={size} value={size.toString()}>
                            {size} {size === 1 ? "member (Solo)" : "members"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="teamSizeMax">Maximum Team Size *</Label>
                    <Select
                      value={formData.teamSize.max.toString()}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          teamSize: {
                            ...formData.teamSize,
                            max: Number.parseInt(value),
                          },
                        })
                      }
                    >
                      <SelectTrigger className={errors.teamSize ? "border-red-500" : ""}>
                        <SelectValue placeholder="Max size" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-black shadow-lg rounded-md border">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((size) => (
                          <SelectItem key={size} value={size.toString()} disabled={size < formData.teamSize.min}>
                            {size} {size === 1 ? "member" : "members"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col justify-end">
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      <p className="text-sm font-medium text-gray-700">Team Size Range</p>
                      <p className="text-lg font-bold text-purple-600">
                        {formData.teamSize.min === formData.teamSize.max
                          ? `${formData.teamSize.min} ${formData.teamSize.min === 1 ? "member" : "members"}`
                          : `${formData.teamSize.min} - ${formData.teamSize.max} members`}
                      </p>
                      {formData.teamSize.allowSolo && (
                        <p className="text-xs text-green-600 mt-1">✓ Solo participation allowed</p>
                      )}
                    </div>
                  </div>
                </div>
                {errors.teamSize && <p className="text-sm text-red-500 mt-1">{errors.teamSize}</p>}

                {/* 1. Move the Dates & Deadlines card (with startDate, endDate, registrationDeadline, submissionDeadline) to appear before the Submission Type and Hackathon Rounds sections. */}
                {/* 2. The order should be: Basic Info -> Dates & Deadlines -> Submission Type -> Hackathon Rounds -> ... */}
                {/* Dates and Deadlines */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      Dates & Deadlines
                    </CardTitle>
                    <CardDescription>Set important dates for your hackathon</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startDate">
                          Hackathon Start Date *
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="ml-1 cursor-pointer"><Info size={16} /></span>
                              </TooltipTrigger>
                              <TooltipContent>
                                The date and time when the hackathon officially begins. Participants can start working on their projects from this moment.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <Input
                          id="startDate"
                          type="datetime-local"
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                          className={errors.startDate ? "border-red-500" : ""}
                        />
                        {errors.startDate && <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>}
                      </div>

                      <div>
                        <Label htmlFor="endDate">
                          Hackathon End Date *
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="ml-1 cursor-pointer"><Info size={16} /></span>
                              </TooltipTrigger>
                              <TooltipContent>
                                The date and time when the hackathon ends. All activities, including submissions and judging, should be completed by this time.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <Input
                          id="endDate"
                          type="datetime-local"
                          value={formData.endDate}
                          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                          className={errors.endDate ? "border-red-500" : ""}
                        />
                        {errors.endDate && <p className="text-sm text-red-500 mt-1">{errors.endDate}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="registrationDeadline">
                          Registration Deadline *
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="ml-1 cursor-pointer"><Info size={16} /></span>
                              </TooltipTrigger>
                              <TooltipContent>
                                The last date and time for participants to register for the hackathon. Registrations will be closed after this deadline. (Can be after the hackathon starts if you allow late registrations.)
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <Input
                          id="registrationDeadline"
                          type="datetime-local"
                          value={formData.registrationDeadline}
                          onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                          className={errors.registrationDeadline ? "border-red-500" : ""}
                        />
                        {errors.registrationDeadline && (
                          <p className="text-sm text-red-500 mt-1">{errors.registrationDeadline}</p>
                        )}
                      </div>
                      {/* Only show Final Submission Deadline if not multi-round */}
                      {formData.roundType !== "multi-round" && (
                        <div>
                          <Label htmlFor="submissionDeadline">
                            Final Submission Deadline
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="ml-1 cursor-pointer"><Info size={16} /></span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  The last date and time for submitting projects if there is only one round. If your hackathon has multiple rounds, use the round-specific deadlines below.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Label>
                          <Input
                            id="submissionDeadline"
                            type="datetime-local"
                            value={formData.submissionDeadline}
                            onChange={(e) => setFormData({ ...formData, submissionDeadline: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Submission Type *</Label>
                    <Select
                      value={formData.submissionType}
                      onValueChange={(value) => {
                        setFormData((prev) => ({ ...prev, submissionType: value }));
                        // Removed restriction: allow all combinations
                        setInvalidComboError("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single-project">Single Project</SelectItem>
                        <SelectItem value="multi-project">Multiple Projects</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Round Type *</Label>
                    <Select
                      value={formData.roundType}
                      onValueChange={(value) => {
                        setFormData((prev) => ({ ...prev, roundType: value }));
                        // Removed restriction: allow all combinations
                        setInvalidComboError("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single-round">Single Round</SelectItem>
                        <SelectItem value="multi-round">Multi Round</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {invalidComboError && (
                  <div className="text-red-600 text-sm font-medium mt-2">{invalidComboError}</div>
                )}
                {/* Show rounds section if roundType is 'single-round' or 'multi-round', regardless of submissionType */}
                {(formData.roundType === "single-round" || formData.roundType === "multi-round") && (
                  <div className="mt-4">
                 
                    <Card>
                      <CardHeader>
                        <CardTitle>Hackathon Rounds</CardTitle>
                        <CardDescription>Define the round(s) of your hackathon</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {formData.roundType === "multi-round" && (
                          <div className="mb-2 text-blue-700 text-sm flex items-center gap-2">
                            <Info size={16} />
                            Since your hackathon has multiple rounds, please specify the start/end/submission deadlines for each round below.
                          </div>
                        )}
                        {(formData.roundType === "single-round"
                          ? [formData.rounds[0] || { name: "", description: "", startDate: "", endDate: "" }]
                          : formData.rounds
                        ).map((round, index) => (
                          <div key={index} className="p-4 border rounded-lg space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">Round {index + 1}</h4>
                              {formData.roundType === "multi-round" && formData.rounds.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeRound(index)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor={`round-name-${index}`}>Round Name</Label>
                                <Input
                                  id={`round-name-${index}`}
                                  value={round.name}
                                  onChange={e => {
                                    const rounds = [...formData.rounds];
                                    rounds[index] = { ...rounds[index], name: e.target.value };
                                    setFormData({ ...formData, rounds });
                                  }}
                                  placeholder="e.g., Ideation Phase, Prototype Development..."
                                />
                              </div>
                              <div>
                                <Label htmlFor={`round-type-${index}`}>Round Type</Label>
                                <Select
                                  value={round.type || ""}
                                  onValueChange={value => {
                                    const rounds = [...formData.rounds];
                                    rounds[index] = { ...rounds[index], type: value };
                                    setFormData({ ...formData, rounds });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select round type" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white text-black shadow-lg rounded-md border">
                                    <SelectItem value="quiz">Quiz</SelectItem>
                                    <SelectItem value="ppt">PPT Submission</SelectItem>
                                    <SelectItem value="idea">Idea Submission</SelectItem>
                                    <SelectItem value="pitch">Pitch</SelectItem>
                                    <SelectItem value="project">Project Submission</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="md:col-span-2">
                                <Label htmlFor={`round-description-${index}`}>Description</Label>
                                <Textarea
                                  id={`round-description-${index}`}
                                  value={round.description}
                                  onChange={e => {
                                    const rounds = [...formData.rounds];
                                    rounds[index] = { ...rounds[index], description: e.target.value };
                                    setFormData({ ...formData, rounds });
                                  }}
                                  placeholder="Describe what happens in this round..."
                                  rows={2}
                                />
                              </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor={`round-start-${index}`}>
                                  Round Start Date
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="ml-1 cursor-pointer"><Info size={16} /></span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        When this round begins. Only participants who advance to this round can participate from this date.
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </Label>
                                <Input
                                  id={`round-start-${index}`}
                                  type="datetime-local"
                                  value={round.startDate}
                                  onChange={e => {
                                    const rounds = [...formData.rounds];
                                    rounds[index] = { ...rounds[index], startDate: e.target.value };
                                    setFormData({ ...formData, rounds });
                                  }}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`round-end-${index}`}>
                                  Round End Date
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="ml-1 cursor-pointer"><Info size={16} /></span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        When this round ends. All submissions for this round must be completed by this date.
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </Label>
                                <Input
                                  id={`round-end-${index}`}
                                  type="datetime-local"
                                  value={round.endDate}
                                  onChange={e => {
                                    const rounds = [...formData.rounds];
                                    rounds[index] = { ...rounds[index], endDate: e.target.value };
                                    setFormData({ ...formData, rounds });
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        {formData.roundType === "multi-round" && (
                          <Button type="button" variant="outline" onClick={addRound} className="w-full bg-transparent">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Round
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                    {/* Validation messages */}
                    {formData.roundType === "single-round" && (!formData.rounds[0]?.name || !formData.rounds[0]?.description || !formData.rounds[0]?.startDate || !formData.rounds[0]?.endDate) && (
                      <div className="text-red-600 text-xs mt-1">All round fields are required.</div>
                    )}
                    {formData.roundType === "multi-round" && formData.rounds.length === 0 && (
                      <div className="text-red-600 text-xs mt-1">At least one round is required.</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
        {step === 1 && (
          <>
            {/* Images & Media */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-purple-600" />
                  Images & Media
                </CardTitle>
                <CardDescription>Upload images to make your hackathon more attractive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ImageUploadCard
                    title="Banner Image"
                    description="Main banner (1200x600px recommended)"
                    type="banner"
                    currentImage={formData.images.banner}
                  />
                  <ImageUploadCard
                    title="Logo"
                    description="Hackathon logo (400x400px recommended)"
                    type="logo"
                    currentImage={formData.images.logo}
                  />
                </div>
                {/* Gallery image upload removed */}
              </CardContent>
            </Card>

            
          </>
        )}
        {step === 2 && (
          <>
            {/* Problem Statements - Combined */}
            <Card>
              <CardHeader>
                <CardTitle>Problem Statements</CardTitle>
                <CardDescription>Define the challenges participants will work on and their types</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.problemStatements.map((ps, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Problem Statement {index + 1}</h4>
                      {formData.problemStatements.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeProblemStatement(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div>
                      <Label htmlFor={`statement-${index}`}>Statement</Label>
                      <Textarea
                        id={`statement-${index}`}
                        value={ps.statement}
                        onChange={(e) => updateProblemStatement(index, "statement", e.target.value)}
                        placeholder="Describe the problem participants need to solve..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`type-${index}`}>Type</Label>
                      <Select value={ps.type} onValueChange={(value) => updateProblemStatement(index, "type", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select problem statement type" />
                        </SelectTrigger>
                        <SelectContent className="bg-white text-black shadow-lg rounded-md border">
                          {problemStatementTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addProblemStatement} className="w-full bg-transparent">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Problem Statement
                </Button>
                {errors.problemStatements && <p className="text-sm text-red-500 mt-1">{errors.problemStatements}</p>}
              </CardContent>
            </Card>

            {/* Judges */}
            <Card>
              <CardHeader>
                <CardTitle>Judges</CardTitle>
                <CardDescription>Add judges by their email addresses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.judges.map((judge, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="email"
                      value={judge}
                      onChange={(e) => updateJudge(index, e.target.value)}
                      placeholder={`Judge email ${index + 1}...`}
                      className="flex-1"
                    />
                    {formData.judges.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeJudge(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addJudge} className="w-full bg-transparent">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Judge
                </Button>
              </CardContent>
            </Card>

            {/* Mentors */}
            <Card>
              <CardHeader>
                <CardTitle>Mentors</CardTitle>
                <CardDescription>Add mentors by their email addresses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.mentors.map((mentor, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="email"
                      value={mentor}
                      onChange={(e) => updateMentor(index, e.target.value)}
                      placeholder={`Mentor email ${index + 1}...`}
                      className="flex-1"
                    />
                    {formData.mentors.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeMentor(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addMentor} className="w-full bg-transparent">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Mentor
                </Button>
              </CardContent>
            </Card>

            
          </>
        )}
        {step === 3 && (
          <>
            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
                <CardDescription>What participants need to know or have</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.requirements.map((requirement, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={requirement}
                      onChange={(e) => updateRequirement(index, e.target.value)}
                      placeholder={`Requirement ${index + 1}...`}
                      className="flex-1"
                    />
                    {formData.requirements.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeRequirement(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addRequirement} className="w-full bg-transparent">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Requirement
                </Button>
              </CardContent>
            </Card>

            {/* Perks */}
            <Card>
              <CardHeader>
                <CardTitle>Perks & Benefits</CardTitle>
                <CardDescription>What participants will get from joining</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.perks.map((perk, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={perk}
                      onChange={(e) => updatePerk(index, e.target.value)}
                      placeholder={`Perk ${index + 1}...`}
                      className="flex-1"
                    />
                    {formData.perks.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removePerk(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addPerk} className="w-full bg-transparent">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Perk
                </Button>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
                <CardDescription>Add relevant tags to help participants find your hackathon</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter a tag and press Enter..."
                    className="flex-1"
                  />
                  <Button type="button" onClick={addTag} disabled={!currentTag.trim()}>
                    Add Tag
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-red-600">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
        {/* Navigation */}
        <div className="flex justify-between mt-4">
          <Button onClick={prevStep} disabled={step === 0} variant="outline">
            Previous
          </Button>
          {step < steps.length - 1 ? <Button onClick={nextStep}>Next</Button> : null}
        </div>
      </div>
      {/* Sidebar */}
      <div className="space-y-6">
        {/* Only show on last step */}
        {step === 3 && (
          <>
            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="maxParticipants">Max Participants</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    value={formData.maxParticipants}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxParticipants: Number.parseInt(e.target.value) || 0,
                      })
                    }
                    min="1"
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-black shadow-lg rounded-md border">
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="ended">Ended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>How your hackathon will appear to participants</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <h3 className="font-medium">{formData.title || "Hackathon Title"}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {formData.description || "Hackathon description will appear here..."}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {formData.category && <Badge variant="outline">{formData.category}</Badge>}
                    <Badge variant="outline">{formData.difficultyLevel}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting}
                  className="w-full bg-purple-500 hover:bg-purple-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Creating..." : "Create Hackathon"}
                </Button>
                <Button onClick={() => handleSubmit(true)} disabled={isSubmitting} variant="outline" className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  Save as Draft
                </Button>
                <Separator />
                <Button onClick={onBack} variant="outline" className="w-full bg-transparent">
                  Cancel
                </Button>
                
                {/* Admin Approval Notice */}
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 text-sm">
                    <strong>Note:</strong> Your hackathon will be reviewed by admin before appearing in the explore section.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Help */}
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <strong>Tip:</strong> You can save your hackathon as a draft and continue editing later. Required fields
                are marked with an asterisk (*).
              </AlertDescription>
            </Alert>
          </>
        )}
      </div>
    </div>
  )
}
