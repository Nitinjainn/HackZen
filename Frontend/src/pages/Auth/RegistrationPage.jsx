"use client"
import { useState, useEffect } from "react"
import { Button } from "../../components/CommonUI/button"
import { Card, CardContent } from "../../components/CommonUI/card"
import { Input } from "../../components/CommonUI/input"
import { Label } from "../../components/CommonUI/label"
import { Textarea } from "../../components/CommonUI/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../components/CommonUI/select"
import {
  ArrowLeft,
  ArrowRight,
  Users,
  Trophy,
  Gavel,
  Code,
  Zap,
  Sparkles,
  Rocket,
  Brain,
  Check
} from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import axios from "axios"
import { useAuth } from "../../context/AuthContext"
import { API_BASE_URL } from "../../lib/api"
import Swal from "sweetalert2"
import withReactContent from "sweetalert2-react-content"
import RoleSelection from "./components/RoleSelection"
import BasicInformationForm from "./components/BasicInformationForm"
import AcademicDetailsForm from "./components/participant/AcademicDetailsForm"
import CourseSpecializationForm from "./components/participant/CourseSpecializationForm"
import SkillsInterestsForm from "./components/participant/SkillsInterestsForm"
import ProfessionalDetailsForm from "./components/participant/ProfessionalDetailsForm"
import SocialLinksForm from "./components/participant/SocialLinksForm"
import HackathonPreferencesForm from "./components/participant/HackathonPreferencesForm"
import OrganizationDetailsForm from "./components/organizer/OrganizationDetailsForm"
import ExperienceMotivationForm from "./components/organizer/ExperienceMotivationForm"
import JudgeProfessionalDetailsForm from "./components/judge/ProfessionalDetailsForm"
import ExpertiseBioForm from "./components/judge/ExpertiseBioForm"
import ProgressBar from "./components/ProgressBar"
import StepFooter from "./components/StepFooter"

export default function SignupPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedRole, setSelectedRole] = useState(null)
  const [formData, setFormData] = useState({
    // Basic Information
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    gender: "prefer-not-to-say",
    country: "",
    city: "",
    bio: "",

    // Academic/Educational Information
    userType: "",
    domain: "",
    course: "",
    courseDuration: "",
    collegeName: "",
    courseSpecialization: "",
    currentYear: "",

    // Professional Information
    companyName: "",
    jobTitle: "",
    yearsOfExperience: "",

    // Skills & Interests (arrays)
    skills: "",
    interests: "",

    // Social Media & Professional Links
    website: "",
    linkedin: "",
    github: "",
    githubUsername: "",
    githubProfile: "",
    twitter: "",
    instagram: "",
    portfolio: "",
    telegram: "",
    discord: "",

    // Hackathon Preferences
    preferredHackathonTypes: [],
    teamSizePreference: "",

    // Organizer specific
    organization: "",
    position: "",
    experience_years: "",
    previous_events: "",
    motivation: "",

    // Judge specific
    company: "",
    job_title: "",
    expertise_areas: "",
    judging_experience: "",
    linkedin_judge: "",
    bio_judge: ""
  })

  const roles = [
    {
      id: "participant",
      title: "Join as Participant",
      description:
        "Compete in hackathons, build amazing projects, and win prizes",
      icon: Code,
      color: "bg-[#4F46E5]"
    },
    {
      id: "organizer",
      title: "Become an Organizer",
      description: "Host hackathons, manage events, and build communities",
      icon: Users,
      color: "bg-[#10B981]"
    },
    {
      id: "judge",
      title: "Serve as Judge",
      description:
        "Evaluate projects, mentor participants, and shape the future",
      icon: Gavel,
      color: "bg-[#8B5CF6]"
    }
  ]

  const getMaxSteps = () => {
    switch (selectedRole) {
      case "participant":
        return 8 // Role + 7 steps
      case "organizer":
        return 4 // Role + 3 steps
      case "judge":
        return 4 // Role + 3 steps
      default:
        return 2
    }
  }

  const getStepTitle = () => {
    if (currentStep === 1) return "Choose Your Role"

    const stepTitles = {
      participant: {
        2: "Basic Information",
        3: "Academic Details",
        4: "Course & Specialization",
        5: "Skills & Interests",
        6: "Professional Details",
        7: "Social & Professional Links",
        8: "Hackathon Preferences & Bio"
      },
      organizer: {
        2: "Basic Information",
        3: "Organization Details",
        4: "Experience & Motivation"
      },
      judge: {
        2: "Basic Information",
        3: "Professional Details",
        4: "Expertise & Bio"
      }
    }

    return stepTitles[selectedRole]?.[currentStep] || "Complete Profile"
  }

  const handleRoleSelect = role => {
    setSelectedRole(role)
  }

  const [validationErrors, setValidationErrors] = useState({})

  const getValidationErrors = () => {
    const errors = {}

    if (currentStep === 2) {
      if (!formData.firstName.trim())
        errors.firstName = "First name is required"
      if (!formData.lastName.trim()) errors.lastName = "Last name is required"
      if (!formData.email.trim()) errors.email = "Email is required"
      if (selectedRole === 'organizer') {
        const domain = formData.email.split('@')[1];
        if (disallowedDomains.includes(domain)) {
          errors.email = "Please use an official organization email address (not Gmail, Yahoo, etc).";
        }
      }
      
      // Check if user is OAuth (no password required) or email (password required)
      const isOAuthUser = user?.authProvider && user.authProvider !== "email";
      
      if (!isOAuthUser) {
        // Only validate passwords for non-OAuth users
        if (!formData.password.trim()) errors.password = "Password is required"
        if (!formData.confirmPassword.trim())
          errors.confirmPassword = "Please confirm your password"
        if (formData.password !== formData.confirmPassword)
          errors.confirmPassword = "Passwords do not match"
      }
      
      if (!formData.phone.trim()) errors.phone = "Phone number is required"
      if (!formData.country.trim()) errors.country = "Country is required"
    }

    if (currentStep === 3) {
      switch (selectedRole) {
        case "participant":
          if (!formData.collegeName.trim())
            errors.collegeName = "College name is required"
          if (!formData.userType.trim())
            errors.userType = "User type is required"
          break
        case "organizer":
          if (!formData.organization.trim())
            errors.organization = "Organization is required"
          if (!formData.position.trim())
            errors.position = "Position is required"
          break
        case "judge":
          if (!formData.company.trim()) errors.company = "Company is required"
          if (!formData.job_title.trim())
            errors.job_title = "Job title is required"
          if (!formData.yearsOfExperience.trim())
            errors.yearsOfExperience = "Experience is required"
          break
      }
    }

    if (currentStep === 4) {
      switch (selectedRole) {
        case "participant":
          if (!formData.course.trim()) errors.course = "Course is required"
          if (!formData.courseDuration.trim())
            errors.courseDuration = "Course duration is required"
          if (!formData.courseSpecialization.trim())
            errors.courseSpecialization = "Course specialization is required"
          break
        case "organizer":
          if (!formData.experience_years.trim())
            errors.experience_years = "Experience is required"
          if (!formData.motivation.trim())
            errors.motivation = "Motivation is required"
          break
        case "judge":
          if (!formData.expertise_areas.trim())
            errors.expertise_areas = "Expertise areas are required"
          if (!formData.judging_experience.trim())
            errors.judging_experience = "Judging experience is required"
          if (!formData.bio_judge.trim())
            errors.bio_judge = "Professional bio is required"
          break
      }
    }

    if (currentStep === 5) {
      switch (selectedRole) {
        case "participant":
          if (!formData.skills.trim()) errors.skills = "Skills are required"
          break
      }
    }

    if (currentStep === 8 && selectedRole === "participant") {
      if (!formData.preferredHackathonTypes || formData.preferredHackathonTypes.length === 0) {
        errors.preferredHackathonTypes = "Please select at least one preferred hackathon type"
      }
      if (!formData.teamSizePreference.trim()) {
        errors.teamSizePreference = "Team size preference is required"
      }
      if (!formData.bio.trim()) {
        errors.bio = "Bio is required"
      }
    }

    return errors
  }

  const handleNext = () => {
    const errors = getValidationErrors()
    setValidationErrors(errors)

    if (Object.keys(errors).length === 0 && canProceed()) {
      const maxSteps = getMaxSteps()
      if (currentStep < maxSteps) {
        setCurrentStep(currentStep + 1)
        setValidationErrors({})
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const renderParticipantStep = step => {
    switch (step) {
      case 3: // Academic Details
        return (
          <AcademicDetailsForm
            formData={formData}
            errors={validationErrors}
            onChange={handleInputChange}
          />
        )

      case 4: // Course & Specialization
        return (
          <CourseSpecializationForm
            formData={formData}
            errors={validationErrors}
            onChange={handleInputChange}
          />
        )

      case 5: // Skills & Interests
        return (
          <SkillsInterestsForm
            formData={formData}
            errors={validationErrors}
            onChange={handleInputChange}
          />
        )

      case 6: // Professional Details
        return (
          <ProfessionalDetailsForm
            formData={formData}
            errors={validationErrors}
            onChange={handleInputChange}
          />
        )

      case 7: // Social & Professional Links
        return (
          <SocialLinksForm
            formData={formData}
            errors={validationErrors}
            onChange={handleInputChange}
          />
        )

      case 8: // Hackathon Preferences & Bio
        return (
          <HackathonPreferencesForm
            formData={formData}
            errors={validationErrors}
            onChange={handleInputChange}
          />
        )

      default:
        return null
    }
  }

  const renderOrganizerStep = step => {
    switch (step) {
      case 3: // Organization Details
        return (
          <OrganizationDetailsForm
            formData={formData}
            errors={validationErrors}
            onChange={handleInputChange}
          />
        )

      case 4: // Experience & Motivation
        return (
          <ExperienceMotivationForm
            formData={formData}
            errors={validationErrors}
            onChange={handleInputChange}
          />
        )

      default:
        return null
    }
  }

  const renderJudgeStep = step => {
    switch (step) {
      case 3: // Professional Details
        return (
          <JudgeProfessionalDetailsForm
            formData={formData}
            errors={validationErrors}
            onChange={handleInputChange}
          />
        )

      case 4: // Expertise & Bio
        return (
          <ExpertiseBioForm
            formData={formData}
            errors={validationErrors}
            onChange={handleInputChange}
          />
        )

      default:
        return null
    }
  }

  const renderStepContent = () => {
    if (currentStep === 1) {
      return (
        <RoleSelection
          roles={roles}
          selectedRole={selectedRole}
          onSelect={handleRoleSelect}
        />
      )
    }

    if (currentStep === 2) {
      // Check if user is OAuth (no password required) or email (password required)
      const isOAuthUser = user?.authProvider && user.authProvider !== "email";
      
      return (
        <BasicInformationForm
          formData={formData}
          errors={validationErrors}
          onChange={handleInputChange}
          emailReadOnly={!!(user && user.email)}
          isOAuthUser={isOAuthUser}
          user={user}
        />
      )
    }

    switch (selectedRole) {
      case "participant":
        return renderParticipantStep(currentStep)
      case "organizer":
        return renderOrganizerStep(currentStep)
      case "judge":
        return renderJudgeStep(currentStep)
      default:
        return null
    }
  }

  const canProceed = () => {
    if (currentStep === 1) return selectedRole !== null

    if (currentStep === 2) {
      // Check if user is OAuth (no password required) or email (password required)
      const isOAuthUser = user?.authProvider && user.authProvider !== "email";
      
      const basicFieldsValid = 
        formData.firstName.trim() !== "" &&
        formData.lastName.trim() !== "" &&
        formData.email.trim() !== "" &&
        formData.phone.trim() !== "" &&
        formData.country.trim() !== "";
      
      if (isOAuthUser) {
        // For OAuth users, only check basic fields (no password required)
        return basicFieldsValid;
      } else {
        // For email users, check password fields as well
        return basicFieldsValid &&
          formData.password.trim() !== "" &&
          formData.confirmPassword.trim() !== "" &&
          formData.password === formData.confirmPassword;
      }
    }

    if (currentStep === 3) {
      switch (selectedRole) {
        case "participant":
          return (
            formData.collegeName.trim() !== "" &&
            formData.userType.trim() !== ""
          )
        case "organizer":
          return (
            formData.organization.trim() !== "" &&
            formData.position.trim() !== ""
          )
        case "judge":
          return (
            formData.company.trim() !== "" &&
            formData.job_title.trim() !== "" &&
            formData.yearsOfExperience.trim() !== ""
          )
        default:
          return true
      }
    }

    if (currentStep === 4) {
      switch (selectedRole) {
        case "participant":
          return (
            formData.course.trim() !== "" &&
            formData.courseDuration.trim() !== "" &&
            formData.courseSpecialization.trim() !== ""
          )
        case "organizer":
          return (
            formData.experience_years.trim() !== "" &&
            formData.motivation.trim() !== ""
          )
        case "judge":
          return (
            formData.expertise_areas.trim() !== "" &&
            formData.judging_experience.trim() !== "" &&
            formData.bio_judge.trim() !== ""
          )
        default:
          return true
      }
    }

    if (currentStep === 5 && selectedRole === "participant") {
      return formData.skills.trim() !== ""
    }

    return true
  }

  const isLastStep = () => {
    return currentStep === getMaxSteps()
  }

  const navigate = useNavigate()
  const { login, user } = useAuth()
  const [step, setStep] = useState(1) // 1: form, 2: verify code
  const [code, setCode] = useState("")
  const [emailForCode, setEmailForCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const MySwal = withReactContent(Swal)

  const disallowedDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "protonmail.com"];

  useEffect(() => {
    // If user is logged in (OAuth), pre-fill email and make it read-only
    if (user && user.email) {
      setFormData(prev => ({ ...prev, email: user.email }));
    }
  }, [user]);

  // On last step, handle registration
  const handleRegister = async () => {
    setErrorMsg("")
    setSuccessMsg("")
    setLoading(true)
    try {
      // If OAuth user, skip OTP and directly complete profile
      if (user && (user.authProvider === 'google' || user.authProvider === 'github')) {
        // Prepare profile fields
        const profileFields = {
          ...formData,
          role: selectedRole === 'organizer' ? 'organizer' : selectedRole,
          profileCompleted: true
        };
        await axios.put(
          `${API_BASE_URL}/api/users/${user._id}/complete-profile`,
          profileFields,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        // Update AuthContext and redirect
        const updatedUserData = { 
          ...user, 
          profileCompleted: true, 
          role: selectedRole === 'organizer' ? 'organizer' : selectedRole 
        };
        console.log("🔍 OAuth Registration - Updated user data:", updatedUserData);
        await login(updatedUserData, localStorage.getItem('token'));
        
        // Force refresh user data to ensure role is properly set
        setTimeout(() => {
          navigate("/dashboard");
        }, 100);
        return;
      }
      // 1. Register user (name, email, password)
      const name = `${formData.firstName} ${formData.lastName}`.trim()
      const res = await axios.post(`${API_BASE_URL}/api/users/register`, {
        name,
        email: formData.email,
        password: formData.password,
        role: selectedRole === 'organizer' ? 'organizer' : selectedRole
      })
      setEmailForCode(formData.email)
      setSuccessMsg(res.data.message || "Verification code sent to your email.")
      // Show SweetAlert2 popup for code entry
      await showVerificationPopup()
    } catch (err) {
      // If the error is 'Verification code already sent', show the popup anyway
      const msg = err.response?.data?.message || "Registration failed. Please try again."
      setErrorMsg(msg)
      if (msg.includes("Verification code already sent")) {
        setEmailForCode(formData.email)
        await showVerificationPopup()
      }
    } finally {
      setLoading(false)
    }
  }

  // Show SweetAlert2 popup for code entry
  const showVerificationPopup = async () => {
    let verified = false
    let error = ""
    while (!verified) {
      const { value: code } = await MySwal.fire({
        title: "Enter Verification Code",
        input: "text",
        inputLabel: "A 6-digit code was sent to your email.",
        inputPlaceholder: "000000",
        inputAttributes: {
          maxlength: 6,
          autocapitalize: "off",
          autocorrect: "off",
        },
        showCancelButton: true,
        confirmButtonText: "Verify & Create Account",
        cancelButtonText: "Cancel",
        inputValidator: (value) => {
          if (!value || value.length !== 6) {
            return "Please enter the 6-digit code."
          }
        },
        didOpen: () => {
          if (error) {
            MySwal.showValidationMessage(error)
          }
        }
      })
      if (!code) break // User cancelled
      setLoading(true)
      try {
        await handleVerifyCode(code)
        verified = true
      } catch (err) {
        error = err?.message || "Verification failed. Please try again."
        MySwal.showValidationMessage(error)
      } finally {
        setLoading(false)
      }
    }
  }

  // Handle verification code (now takes code as argument)
  const handleVerifyCode = async (code) => {
    setErrorMsg("")
    setSuccessMsg("")
    // setLoading(true) // handled in showVerificationPopup
    try {
      // 2. Verify code
      const res = await axios.post(`${API_BASE_URL}/api/users/verify-registration`, {
        email: emailForCode?.trim() || formData.email?.trim(),
        code: String(code).trim().padStart(6, "0")
      })
      // 3. Complete profile
      const user = res.data.user
      const token = res.data.token
      // Prepare profile fields
      const profileFields = {
        phone: formData.phone,
        gender: formData.gender,
        userType: formData.userType,
        domain: formData.domain,
        course: formData.course,
        courseDuration: formData.courseDuration,
        collegeName: formData.collegeName,
        country: formData.country,
        city: formData.city,
        courseSpecialization: formData.courseSpecialization,
        companyName: formData.companyName,
        jobTitle: formData.jobTitle,
        yearsOfExperience: formData.yearsOfExperience,
        currentYear: formData.currentYear,
        skills: formData.skills,
        interests: formData.interests,
        github: formData.github,
        linkedin: formData.linkedin,
        twitter: formData.twitter,
        instagram: formData.instagram,
        portfolio: formData.portfolio,
        telegram: formData.telegram,
        preferredHackathonTypes: formData.preferredHackathonTypes,
        teamSizePreference: formData.teamSizePreference || "any",
        bio: formData.bio,
        // Add any other fields as needed
        profileCompleted: true
      }
      await axios.put(
        `${API_BASE_URL}/api/users/${user._id}/complete-profile`,
        profileFields,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      // 4. Update AuthContext and redirect
      await login({ ...user, profileCompleted: true }, token)
      navigate("/dashboard")
    } catch (err) {
      throw new Error(err.response?.data?.message || "Verification failed. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-2 sm:px-6">
      <Card className="w-full max-w-5xl bg-white shadow-2xl rounded-3xl overflow-hidden h-auto mx-auto">
        <div className="flex flex-col md:flex-row h-full">
          {/* Left Column - Branding */}
          <div className="w-full md:w-1/2 bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-500 relative overflow-hidden hidden md:flex">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative z-10 flex flex-col justify-center items-center h-full p-8 lg:p-12 text-white w-full">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <Zap className="w-7 h-7" />
                  </div>
                  <h1 className="text-4xl font-bold">HackZen</h1>
                </div>
                <p className="text-xl text-white/90 mb-2">
                  Where Innovation Meets Opportunity
                </p>
                <p className="text-white/80">
                  Join the ultimate hackathon platform and turn your ideas into
                  reality
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 max-w-sm w-full">
                <div className="flex items-center gap-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Rocket className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Build & Innovate</h3>
                    <p className="text-sm text-white/80">
                      Create groundbreaking projects
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Compete & Win</h3>
                    <p className="text-sm text-white/80">
                      Earn recognition and prizes
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Learn & Grow</h3>
                    <p className="text-sm text-white/80">
                      Connect with brilliant minds
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="w-full md:w-1/2 bg-white flex flex-col">
            <div className="h-full flex flex-col p-4 sm:p-8 md:max-h-[650px] md:min-h-[650px] md:overflow-y-auto">
              {/* Header */}
              <div className="mb-6 flex-shrink-0">
                {currentStep > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="p-2 hover:bg-gray-100 rounded-lg mb-4"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                )}
                <h2 className="text-2xl sm:text-3xl font-bold text-[#111827] mb-2">
                  {currentStep === 1 ? "Create a new account" : getStepTitle()}
                </h2>
                <p className="text-[#6B7280]">
                  {currentStep === 1
                    ? "Join HackZen and choose your role to get started"
                    : `Complete your ${selectedRole} profile`}
                </p>
              </div>

              {/* Progress Bar */}
              <ProgressBar currentStep={currentStep} getMaxSteps={getMaxSteps} />

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-6">
                {renderStepContent()}
              </div>

              {/* Footer */}
              <StepFooter
                validationErrors={validationErrors}
                errorMsg={errorMsg}
                successMsg={successMsg}
                step={step}
                currentStep={currentStep}
                isLastStep={isLastStep()}
                loading={loading}
                canProceed={canProceed()}
                handleRegister={handleRegister}
                handleNext={handleNext}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
