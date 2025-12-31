"use client"

import { useEffect, useState, useMemo } from "react"
import axios from "axios"
import { API_BASE_URL } from "../../../lib/api"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "../../../components/CommonUI/card"
import { Button } from "../../../components/CommonUI/button"
import { Input } from "../../../components/CommonUI/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../../../components/AdminUI/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "../../../components/AdminUI/dropdown-menu"
import { Search, Filter, Eye, Check, Clock, FileText, ActivityIcon } from "lucide-react"

import ModalBlogDetails from "../components/ModalBlogDetails"
import { Pagination } from "../../../components/CommonUI/Pagination";

export function BlogManage() {
  const [articles, setArticles] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [loading, setLoading] = useState(true)
  const [selectedBlog, setSelectedBlog] = useState(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/articles/all`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        })
        setArticles(res.data)
      } catch (err) {
        console.error("Error fetching articles", err)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  const updateStatus = async (id, status) => {
    try {
      const res = await axios.patch(
        `${API_BASE_URL}/api/articles/status/${id}`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      )
      setArticles(prev => prev.map(a => (a._id === id ? { ...a, status } : a)))
    } catch (err) {
      console.error("Error updating article status", err)
    }
  }

  // Memoize filtered articles to prevent unnecessary re-computation
  const filteredArticles = useMemo(() => {
    return articles.filter(a => {
      const matchesSearch =
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.author?.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus =
        statusFilter === "All" || a.status === statusFilter.toLowerCase()
      return matchesSearch && matchesStatus
    })
  }, [articles, searchTerm, statusFilter])

  // Reset page when filters change, but not when data is updated
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Manual pagination calculation
  const totalItems = filteredArticles.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedArticles = filteredArticles.slice(startIndex, startIndex + itemsPerPage);

  // Ensure current page is valid
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const getStatusColor = status => {
    switch (status) {
      case "published":
        return "text-green-600 font-semibold"
      case "pending":
        return "text-yellow-600 font-semibold"
      case "draft":
        return "text-gray-600 font-semibold"
      default:
        return "text-gray-600 font-semibold"
    }
  }

  if (loading)
    return (
      <p className="text-center text-black font-semibold">
        Loading articles...
      </p>
    )

  return (
    <div className="space-y-6 bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-bold text-black">Manage Blogs</h1>
        <span className="flex items-center text-yellow-600 font-semibold">
          <Clock className="w-4 h-4 mr-2" />
          {articles.filter(a => a.status === "pending").length} Pending
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black w-4 h-4" />
          <Input
            placeholder="Search by title or author..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 bg-white text-black"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="text-black">
              <Filter className="w-4 h-4 mr-2" />
              Status: {statusFilter}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {["All", "Pending", "Published", "Draft"].map(status => (
              <DropdownMenuItem
                key={status}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="border shadow-sm min-h-[550px]">
        <CardHeader>
          <CardTitle className="text-black text-lg">
            Articles ({totalItems})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col justify-between min-h-[500px]">
          {totalItems === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 text-lg">No articles found</div>
              <div className="text-gray-400 text-sm mt-1">
                Try adjusting your search or filter criteria
              </div>
            </div>
          ) : (
            <>
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-black w-12">#</TableHead>
                      <TableHead className="text-black">Author</TableHead>
                      <TableHead className="text-black">Title</TableHead>
                      <TableHead className="text-black">Status</TableHead>
                      <TableHead className="text-black">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedArticles.map((article, idx) => (
                      <TableRow key={article._id} className="hover:bg-gray-50">
                        <TableCell className="font-semibold">
                          {startIndex + idx + 1}
                        </TableCell>
                        <TableCell className="text-black font-medium">
                          {article.author?.name || "Anonymous"}
                        </TableCell>
                        <TableCell className="text-black font-medium">
                          {article.title}
                        </TableCell>
                        <TableCell>
                          <span className={getStatusColor(article.status)}>
                            {article.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <ActivityIcon className="w-4 h-4 text-black" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={() => setSelectedBlog(article)}
                              >
                                <Eye className="w-4 h-4 mr-2" /> View
                              </DropdownMenuItem>
                              {article.status !== "published" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateStatus(article._id, "published")
                                  }
                                  className="text-green-600"
                                >
                                  <Check className="w-4 h-4 mr-2" /> Publish
                                </DropdownMenuItem>
                              )}
                              {article.status !== "draft" && (
                                <DropdownMenuItem
                                  onClick={() => updateStatus(article._id, "draft")}
                                  className="text-gray-600"
                                >
                                  <Clock className="w-4 h-4 mr-2" /> Mark Draft
                                </DropdownMenuItem>
                              )}
                              {article.status !== "pending" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateStatus(article._id, "pending")
                                  }
                                  className="text-yellow-600"
                                >
                                  <Clock className="w-4 h-4 mr-2" /> Mark Pending
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-auto flex justify-center pt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {selectedBlog && (
        <ModalBlogDetails
          isOpen={!!selectedBlog}
          onClose={() => setSelectedBlog(null)}
          blog={selectedBlog}
        />
      )}
    </div>
  )
}
