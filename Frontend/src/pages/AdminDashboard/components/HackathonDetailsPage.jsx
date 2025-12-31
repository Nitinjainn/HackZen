"use client"

import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import axios from "axios"
import { HackathonDetails } from "./HackathonDetails"
import { Loader2 } from "lucide-react"
import { API_BASE_URL } from "../../../lib/api"

export default function HackathonDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [hackathon, setHackathon] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchHackathon = async () => {
      try {
        const token = localStorage.getItem("token")
        const res = await axios.get(`${API_BASE_URL}/api/hackathons/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        setHackathon(res.data)
      } catch (err) {
        setError("Failed to fetch hackathon")
      } finally {
        setLoading(false)
      }
    }

    fetchHackathon()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-black">
        <Loader2 className="w-6 h-6 mr-2 animate-spin" />
        Loading hackathon...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-8">
        <p>{error}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 underline">
          Go Back
        </button>
      </div>
    )
  }

  return (
    <HackathonDetails hackathon={hackathon} onBack={() => navigate(-1)} />
  )
}
