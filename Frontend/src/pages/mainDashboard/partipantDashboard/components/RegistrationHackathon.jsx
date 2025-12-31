"use client"
import { useState, useEffect } from "react"
import { useAuth } from "../../../../context/AuthContext"
import { API_BASE_URL } from "../../../../lib/api"
import {
  ArrowLeft,
  Upload,
  Github,
  Linkedin,
  User,
  Mail,
  Phone,
  Calendar,
  Building,
  GraduationCap,
  Users,
  Lightbulb,
  FileText,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Clock,
  Award,
  Shield
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/CommonUI/card"
import { Button } from "../../../../components/CommonUI/button"
import { Input } from "../../../../components/CommonUI/input"
import { Label } from "../../../../components/CommonUI/label"
import { Textarea } from "../../../../components/CommonUI/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../../../components/CommonUI/select"
import { Checkbox } from "../../../../components/DashboardUI/checkbox"
import { Badge } from "../../../../components/CommonUI/badge"
import { Progress } from "../../../../components/DashboardUI/progress"
import { useToast } from "../../../../hooks/use-toast"

function generateTeamCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function HackathonRegistration({ hackathon, onBack, onSuccess, editMode = false, startStep = 1, initialData, inviteMode = false }) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(editMode ? startStep : 1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState(() => {
    if (editMode && initialData) {
      return {
        ...initialData,
        teamCode: initialData.teamCode || generateTeamCode(),
      };
    }
    return {
      fullName: "",
      email: "",
      phone: "",
      age: "",
      gender: "",
      collegeOrCompany: "",
      degreeOrRole: "",
      yearOfStudyOrExperience: "",
      teamName: "",
      teamDescription: "",
      teamCode: generateTeamCode(),
      projectIdea: "",
      github: "",
      linkedin: "",
      resumeURL: "",
      heardFrom: "",
      acceptedTerms: false
    };
  });

  const [errors, setErrors] = useState({})
  const [hasAutoFilled, setHasAutoFilled] = useState(false)
  const { toast } = useToast()

  // Auto-fill form with user profile data when not in edit mode
  useEffect(() => {
    if (editMode && initialData) return; // In edit mode, skip auto-fill effect
    const fetchAndAutoFill = async () => {
      if (user) {
        try {
          const token = localStorage.getItem("token");
          // Fetch complete user profile data
          const profileResponse = await fetch("${API_BASE_URL}/api/users/me", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          let profileData = {};
          if (profileResponse.ok) {
            profileData = await profileResponse.json();
          }
          // Start with user profile data as primary source
          let autoFillData = {
            fullName: profileData.name || user.name || "",
            email: profileData.email || user.email || "",
            phone: profileData.phone || "",
            age: profileData.age || "", // Now age can be auto-filled from user profile
            gender: profileData.gender ? profileData.gender.charAt(0).toUpperCase() + profileData.gender.slice(1) : "",
            collegeOrCompany: profileData.collegeName || profileData.companyName || "",
            degreeOrRole: profileData.course || profileData.jobTitle || "",
            yearOfStudyOrExperience: profileData.currentYear || profileData.yearsOfExperience || "",
            github: profileData.github || "",
            linkedin: profileData.linkedin || "",
            teamName: "",
            teamDescription: "",
            projectIdea: "",
            resumeURL: "",
            heardFrom: ""
          };
          setFormData(prev => ({
            ...prev,
            ...autoFillData
          }));
          if (profileData.profileCompleted) {
            setHasAutoFilled(true);
            toast({
              title: "Profile Data Applied",
              description: "Your profile information has been auto-filled. You can modify any field if needed.",
              duration: 3000
            });
          }
        } catch (error) {
          console.log("Could not fetch profile data:", error);
        }
      }
    };
    fetchAndAutoFill();
  }, [user, editMode, initialData]);

  // If editMode or initialData changes, update formData and currentStep
  useEffect(() => {
    if (editMode && initialData) {
      setFormData({
        ...initialData,
        teamCode: initialData.teamCode || generateTeamCode(),
      });
      setCurrentStep(startStep || 3);
    }
  }, [editMode, initialData, startStep]);

  const totalSteps = 4
  const progress = (currentStep / totalSteps) * 100



  const steps = [
    { id: 1, title: "Personal Info", icon: User, description: "Basic information" },
    { id: 2, title: "Background", icon: GraduationCap, description: "Academic & professional" },
    { id: 3, title: "Team & Project", icon: Users, description: "Team details & ideas" },
    { id: 4, title: "Review", icon: CheckCircle, description: "Final confirmation" }
  ]

  const validateStep = step => {
    const newErrors = {}

    switch (step) {
      case 1:
        if (!formData.fullName.trim())
          newErrors.fullName = "Full name is required"
        if (!formData.email.trim()) newErrors.email = "Email is required"
        if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = "Please enter a valid email"
        }
        if (!formData.collegeOrCompany.trim())
          newErrors.collegeOrCompany = "College/Company is required"
        break
      case 2:
        // Optional fields, no validation needed
        break
      case 3:
        if (!inviteMode) {
          if (!formData.teamName.trim())
            newErrors.teamName = "Team name is required"
        }
        break
      case 4:
        if (!formData.acceptedTerms)
          newErrors.acceptedTerms = "You must accept the terms and conditions"
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      if (!user || !token) {
        console.error("You must be logged in to register.");
        return;
      }

      let submitFormData = { ...formData };
      if (inviteMode) {
        // Remove team fields for invite registration
        delete submitFormData.teamName;
        delete submitFormData.teamDescription;
      }

      const endpoint = editMode 
        ? `${API_BASE_URL}/api/registration/${hackathon._id}/update`
        : inviteMode
          ? null // handled by parent
          : "${API_BASE_URL}/api/registration";
      const method = editMode ? "PUT" : "POST";

      if (inviteMode) {
        // Call parent onSuccess with filtered formData
        onSuccess(submitFormData);
        setIsSubmitting(false);
        return;
      }

      console.log(`${editMode ? "Updating" : "Submitting"} registration with data:`, {
        hackathonId: hackathon._id,
        formData: submitFormData
      });

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          hackathonId: hackathon._id,
          formData: submitFormData
        })
      });

      const data = await response.json();
      console.log("Registration response:", data);

      if (!response.ok) {
        if (!editMode && data.message && data.message.includes("Already registered")) {
          console.log("Already registered, treating as success");
          onSuccess();
          return;
        }
        throw new Error(data.message || `Failed to ${editMode ? 'update' : 'register'}`);
      }

      // Show success message
      if (editMode) {
        toast({
          title: "Changes Saved!",
          description: "Your registration details have been updated successfully!",
          duration: 3000
        });
      } else {
        if (data.team) {
          console.log("Team created successfully:", data.team);
          toast({
            title: "Registration Successful!",
            description: `Your team \"${data.team.name}\" has been created. Team code: ${data.team.teamCode}`,
            duration: 3000
          });
        } else {
          console.log("No team data in response");
          toast({
            title: "Registration Successful!",
            description: "You have successfully registered in the hackathon!",
            duration: 3000
          });
        }
      }

      onSuccess();
    } catch (error) {
      console.error(`${editMode ? 'Update' : 'Registration'} failed:`, error);
      toast({
        title: editMode ? "Update Failed" : "Registration Failed",
        description: error.message,
        duration: 3000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8 py-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Personal Information
              </h2>
              <p className="text-gray-600 text-lg">Let's start with your basic details</p>
              {hasAutoFilled && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Your profile information has been pre-filled. You can edit any field as needed.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="fullName" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name *
                </Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={e => handleInputChange("fullName", e.target.value)}
                  placeholder="Enter your full name"
                  className={`h-12 text-base ${errors.fullName ? "border-red-500 focus:border-red-500" : ""} ${hasAutoFilled && formData.fullName ? "border-green-300 bg-green-50" : ""}`}
                />
                {errors.fullName && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.fullName}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={e => handleInputChange("email", e.target.value)}
                  placeholder="Enter your email"
                  className={`h-12 text-base ${errors.email ? "border-red-500 focus:border-red-500" : ""} ${hasAutoFilled && formData.email ? "border-green-300 bg-green-50" : ""}`}
                />
                {errors.email && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={e => handleInputChange("phone", e.target.value)}
                  placeholder="Enter your phone number"
                  className={`h-12 text-base ${hasAutoFilled && formData.phone ? "border-green-300 bg-green-50" : ""}`}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="age" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Age
                </Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={e => handleInputChange("age", e.target.value)}
                  placeholder="Enter your age"
                  className={`h-12 text-base ${hasAutoFilled && formData.age ? "border-green-300 bg-green-50" : ""}`}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="gender" className="text-sm font-semibold text-gray-700">
                  Gender
                </Label>
                <Select
                  value={formData.gender}
                  onValueChange={value => handleInputChange("gender", value)}
                >
                  <SelectTrigger className={`h-12 text-base ${hasAutoFilled && formData.gender ? "border-green-300 bg-green-50" : ""}`}>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="collegeOrCompany" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  College/Company *
                </Label>
                <Input
                  id="collegeOrCompany"
                  value={formData.collegeOrCompany}
                  onChange={e => handleInputChange("collegeOrCompany", e.target.value)}
                  placeholder="Enter your college or company"
                  className={`h-12 text-base ${errors.collegeOrCompany ? "border-red-500 focus:border-red-500" : ""} ${hasAutoFilled && formData.collegeOrCompany ? "border-green-300 bg-green-50" : ""}`}
                />
                {errors.collegeOrCompany && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.collegeOrCompany}
                  </p>
                )}
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-8 py-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <GraduationCap className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Academic & Professional Background
              </h2>
              <p className="text-gray-600 text-lg">Help us understand your experience level</p>
              {hasAutoFilled && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Your profile information has been pre-filled. You can edit any field as needed.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="degreeOrRole" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Degree/Role
                </Label>
                <Input
                  id="degreeOrRole"
                  value={formData.degreeOrRole}
                  onChange={e => handleInputChange("degreeOrRole", e.target.value)}
                  placeholder="e.g., Computer Science, Software Engineer"
                  className={`h-12 text-base ${hasAutoFilled && formData.degreeOrRole ? "border-green-300 bg-green-50" : ""}`}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="yearOfStudyOrExperience" className="text-sm font-semibold text-gray-700">
                  Year of Study/Experience
                </Label>
                <Input
                  id="yearOfStudyOrExperience"
                  type="number"
                  value={formData.yearOfStudyOrExperience}
                  onChange={e => handleInputChange("yearOfStudyOrExperience", e.target.value)}
                  placeholder="e.g., 2 (years)"
                  className={`h-12 text-base ${hasAutoFilled && formData.yearOfStudyOrExperience ? "border-green-300 bg-green-50" : ""}`}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="github" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Github className="w-4 h-4" />
                  GitHub Profile
                </Label>
                <Input
                  id="github"
                  value={formData.github}
                  onChange={e => handleInputChange("github", e.target.value)}
                  placeholder="https://github.com/username"
                  className={`h-12 text-base ${hasAutoFilled && formData.github ? "border-green-300 bg-green-50" : ""}`}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="linkedin" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Linkedin className="w-4 h-4" />
                  LinkedIn Profile
                </Label>
                <Input
                  id="linkedin"
                  value={formData.linkedin}
                  onChange={e => handleInputChange("linkedin", e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  className={`h-12 text-base ${hasAutoFilled && formData.linkedin ? "border-green-300 bg-green-50" : ""}`}
                />
              </div>
            </div>
          </div>
        )

      case 3:
        if (inviteMode) {
          // Skip team fields, just show a message or nothing
          return (
            <div className="space-y-8 py-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full mb-6 shadow-lg">
                  <Users className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-4xl font-bold text-gray-900 mb-3">
                  Team Details
                </h2>
                <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                  You are joining a team by invitation. Team details are managed by your team leader.
                </p>
              </div>
            </div>
          );
        }
        return (
          <div className="space-y-8 py-4">
            {/* Enhanced Header */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full mb-6 shadow-lg">
                <Users className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-3">
                Team & Project Details
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Tell us about your team and share your innovative project idea. This helps organizers understand your goals and match you with the right opportunities.
              </p>
            </div>

            <div className="space-y-8">
              {/* Team Name Section */}
              <Card className="border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    Team Name *
                  </CardTitle>
                  <p className="text-sm text-gray-600">Choose a creative and memorable name for your team</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Input
                      id="teamName"
                      value={formData.teamName}
                      onChange={e => handleInputChange("teamName", e.target.value)}
                      placeholder="e.g., CodeCrafters, InnovateHub, TechPioneers"
                      className={`h-14 text-lg ${errors.teamName ? "border-red-500 focus:border-red-500" : "focus:border-blue-500"}`}
                    />
                    {errors.teamName && (
                      <p className="text-sm text-red-500 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {errors.teamName}
                      </p>
                    )}
                    {formData.teamName && !errors.teamName && (
                      <p className="text-sm text-green-600 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Great team name!
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

            

              {/* Team Description Section */}
              <Card className="border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    Team Description
                  </CardTitle>
                  <p className="text-sm text-gray-600">Tell us about your team's skills, goals, and what you hope to achieve</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Textarea
                      id="teamDescription"
                      value={formData.teamDescription}
                      onChange={e => handleInputChange("teamDescription", e.target.value)}
                      placeholder="Describe your team's expertise, background, and what makes you unique. What skills do you bring to the table?"
                      maxLength={300}
                      rows={4}
                      className="text-base resize-none focus:border-purple-500"
                    />
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">
                        {formData.teamDescription.length > 0 ? `${formData.teamDescription.length}/300 characters` : "Optional"}
                      </p>
                      {formData.teamDescription.length > 200 && (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">Great description!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Project Idea Section */}
              <Card className="border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Lightbulb className="w-5 h-5 text-yellow-600" />
                    </div>
                    Project Idea
                  </CardTitle>
                  <p className="text-sm text-gray-600">Share your innovative project concept (optional but recommended)</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Textarea
                      id="projectIdea"
                      value={formData.projectIdea}
                      onChange={e => handleInputChange("projectIdea", e.target.value)}
                      placeholder="Describe your project idea, the problem it solves, and the technology you plan to use. Be creative and innovative!"
                      maxLength={500}
                      rows={5}
                      className="text-base resize-none focus:border-yellow-500"
                    />
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">
                        {formData.projectIdea.length > 0 ? `${formData.projectIdea.length}/500 characters` : "Optional"}
                      </p>
                      {formData.projectIdea.length > 300 && (
                        <div className="flex items-center gap-1 text-yellow-600">
                          <Lightbulb className="w-4 h-4" />
                          <span className="text-sm">Innovative idea!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* How did you hear about us */}
              <Card className="border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Mail className="w-5 h-5 text-indigo-600" />
                    </div>
                    How did you hear about us?
                  </CardTitle>
                  <p className="text-sm text-gray-600">This helps us improve our outreach and connect with the right communities</p>
                </CardHeader>
                <CardContent>
                  <Select
                    value={formData.heardFrom}
                    onValueChange={value => handleInputChange("heardFrom", value)}
                  >
                    <SelectTrigger className="h-14 text-lg focus:border-indigo-500">
                      <SelectValue placeholder="Select how you discovered this hackathon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Social Media">📱 Social Media</SelectItem>
                      <SelectItem value="Friends">👥 Friends & Colleagues</SelectItem>
                      <SelectItem value="College">🎓 College/University</SelectItem>
                      <SelectItem value="Website">🌐 Website/Online Search</SelectItem>
                      <SelectItem value="Email">📧 Email Newsletter</SelectItem>
                      <SelectItem value="Other">🔍 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Progress Indicator */}
              <div className="flex items-center justify-center gap-2 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                </div>
                <span className="text-sm text-gray-600 ml-2">Step 3 of 4</span>
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-8 py-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Review & Submit
              </h2>
              <p className="text-gray-600 text-lg">Please review your information before submitting</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-2 border-gray-100 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="w-5 h-5 text-blue-600" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{formData.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{formData.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">College/Company:</span>
                    <span className="font-medium">{formData.collegeOrCompany}</span>
                  </div>
                  {formData.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{formData.phone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Only show Team & Project card if not inviteMode */}
              {!inviteMode && (
                <Card className="border-2 border-gray-100 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="w-5 h-5 text-green-600" />
                      Team & Project
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Team Name:</span>
                      <span className="font-medium">{formData.teamName}</span>
                    </div>

                    {formData.teamDescription && (
                      <div>
                        <span className="text-gray-600">Description:</span>
                        <p className="font-medium text-xs mt-1">{formData.teamDescription}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-800 text-lg mb-3">
                      Important Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        <span className="text-yellow-700">Registration deadline: {hackathon.registrationDeadline}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-yellow-600" />
                        <span className="text-yellow-700">Team size: {hackathon.teamSize?.min || 1} to {hackathon.teamSize?.max || 4} members</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-yellow-600" />
                        <span className="text-yellow-700">Confirmation email will be sent</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-yellow-600" />
                        <span className="text-yellow-700">Team will be created automatically</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
              <Checkbox
                id="acceptedTerms"
                checked={formData.acceptedTerms}
                onCheckedChange={checked => handleInputChange("acceptedTerms", checked)}
                className={`${errors.acceptedTerms ? "border-red-500" : ""} data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 data-[state=checked]:text-white`}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="acceptedTerms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  I accept the terms and conditions *
                </Label>
                <p className="text-xs text-gray-600">
                  By registering, you agree to the hackathon rules and code of conduct.
                </p>
              </div>
            </div>
            {errors.acceptedTerms && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.acceptedTerms}
              </p>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 z-50 overflow-auto">
      <div className="min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 z-10">
          <div className="max-w-6xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="flex items-center gap-2 hover:bg-gray-100"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {editMode ? "Edit Registration" : "Register"} for {hackathon.name}
                  </h1>
                  <p className="text-xs text-gray-500">
                    {editMode ? "Update your registration details" : `Step ${currentStep} of ${totalSteps}`}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50">
                {hackathon.status}
              </Badge>
            </div>

            {/* Simple Progress Bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-600 min-w-[60px]">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">{renderStep()}</CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center gap-2 px-6 py-3 h-12"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            {currentStep < totalSteps ? (
              <Button 
                onClick={handleNext} 
                className="flex items-center gap-2 px-6 py-3 h-12 bg-indigo-600 hover:bg-indigo-700"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-8 py-3 h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {editMode ? "Saving..." : "Submitting..."}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    {editMode ? "Save Changes" : "Submit Registration"}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}