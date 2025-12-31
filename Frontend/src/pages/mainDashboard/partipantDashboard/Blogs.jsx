"use client";
import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { API_BASE_URL } from "../../../lib/api"; 
import {
  ArrowLeft,
  Search,
  Plus,
  Heart,
  Share2,
  BookOpen,
  Calendar,
  TrendingUp,
  Clock,
  Eye,
  Filter,
  Bookmark,
  Tag,
  CheckCircle,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import { Button } from "../../../components/CommonUI/button";
import { Input } from "../../../components/CommonUI/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
} from "../../../components/CommonUI/card";
import { Badge } from "../../../components/CommonUI/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../components/DashboardUI/avatar";
import { Separator } from "../../../components/CommonUI/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/DashboardUI/dialog";
import { FilterSidebar, FilterField, FilterToggleButton } from "../../../components/CommonUI/FilterSidebar";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../../../components/CommonUI/select";
import { WriteArticle } from "./components/WriteArticle";

export function Blogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState("list");
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [submittedArticle, setSubmittedArticle] = useState(null);
  const [categories, setCategories] = useState(["all"]);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);

  const navigate = useNavigate();
  const { id: blogId } = useParams();
  const location = useLocation();

  // Add markdown parsing function
  const parseMarkdownContent = (content) => {
    if (!content) return '';
    
    // Configure marked options for better rendering
    marked.setOptions({
      breaks: true, // Convert line breaks to <br>
      gfm: true,    // GitHub Flavored Markdown
      sanitize: false, // We'll use DOMPurify instead
    });
    
    // Parse markdown to HTML
    const rawHTML = marked(content);
    
    // Sanitize the HTML to prevent XSS attacks
    const cleanHTML = DOMPurify.sanitize(rawHTML);
    
    return cleanHTML;
  };

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/api/articles`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        setBlogs(data);

        const published = data.filter((b) => b.status === "published");
        const uniqueCategories = Array.from(
          new Set(published.map((b) => b.category))
        );
        setCategories(["all", ...uniqueCategories]);
      } catch (error) {
        console.error("Error fetching blogs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  useEffect(() => {
    if (location.pathname === "/dashboard/blogs/write") {
      setCurrentView("write");
    } else if (location.pathname === "/dashboard/blogs") {
      setCurrentView("list");
    }
  }, [location.pathname]);

  // Add scroll to top effect when blog post changes
  useEffect(() => {
    if (blogId) {
      // Scroll to top when a blog post is opened
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth' // Smooth scrolling animation
      });
    }
  }, [blogId]); // Trigger when blogId changes

  const handleWriteArticle = () => {
    navigate("/dashboard/blogs/write");
  };

  const handleArticleSubmit = (article) => {
    setSubmittedArticle(article);
    setShowApprovalDialog(true);
    navigate("/dashboard/blogs");
  };

  const publishedBlogs = blogs.filter((blog) => blog.status === "published");

  const filteredBlogs = publishedBlogs.filter((blog) => {
    const matchesSearch =
      blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      );
    const matchesCategory =
      selectedCategory === "all" || blog.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const selectedPost = blogId
    ? publishedBlogs.find((b) => b._id === blogId)
    : null;

  const handleBlogClick = (blog) => {
    navigate(`/dashboard/blogs/${blog._id}`);
  };

  const handleBackToBlogs = () => {
    navigate("/dashboard/blogs");
  };

  useEffect(() => {
    if (selectedPost) {
      setLikeCount(selectedPost.likes);
      setIsLiked(selectedPost.likedByUser);
    }
  }, [selectedPost]);

  const handleLike = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.error("User not logged in");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/articles/${selectedPost._id}/like`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Like error:", errorData.message);
        return;
      }

      const data = await res.json();
      setIsLiked(data.liked);
      setLikeCount(data.likes);
    } catch (error) {
      console.error("Like request failed:", error);
    }
  };

  const handleClearFilters = () => {
    setSelectedCategory("all");
    setSearchTerm("");
  };

  const hasActiveFilters = selectedCategory !== "all" || searchTerm !== "";

  if (currentView === "write") {
    return (
      <WriteArticle
        onBack={() => navigate("/dashboard/blogs")}
        onSubmit={handleArticleSubmit}
      />
    );
  }

  if (selectedPost) {
    return (
      <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50">
        {/* Back Button/Header */}
        <header className="bg-white/20 px-6 pt-2 sticky top-0 z-10 backdrop-blur-sm">
          <button
            variant="default"
            size="sm"
            onClick={handleBackToBlogs}
            className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-2 py-1 transition-all duration-100 ease-in-out"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </header>

        {/* Main Scrollable Area */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="mx-auto space-y-8 max-w-6xl">
            {/* Title */}
            <h1 className="text-4xl font-bold text-gray-900 leading-tight">
              {selectedPost.title}
            </h1>

            {/* Creator + Meta */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 ring-2 ring-indigo-100">
                  <AvatarImage src={selectedPost.author.avatar} />
                  <AvatarFallback className="bg-indigo-100 text-indigo-600 text-sm font-bold">
                    {selectedPost.author.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedPost.author.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(selectedPost.publishedAt).toLocaleDateString()} ·{" "}
                    {selectedPost.readTime} min read
                  </p>
                </div>
              </div>

              {/* Like & Share */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLike}
                  className={`flex items-center gap-1 px-3 py-1 transition ${
                    isLiked
                      ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${isLiked ? "fill-red-600" : ""}`}
                  />
                  <span className="text-sm">{likeCount}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard
                      .writeText(window.location.href)
                      .then(() => toast.success("🔗 Copied!"))
                      .catch(() => toast.error("❌ Copy failed"));
                  }}
                  className="flex items-center gap-1 px-3 py-1 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="text-sm">Share</span>
                </Button>
              </div>
            </div>

            {/* Cover Image */}
            {selectedPost.image && (
              <div className="overflow-hidden rounded-2xl shadow-sm">
                <img
                  src={selectedPost.image}
                  alt={selectedPost.title}
                  className="w-full h-80 object-cover"
                />
              </div>
            )}

            {/* Full Article Content with Markdown Support */}
            <Card className="prose prose-lg max-w-none text-gray-800 leading-relaxed p-8 shadow-sm hover:shadow-none border-gray-200">
              <div
                className="markdown-content prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: parseMarkdownContent(selectedPost.content) 
                }}
                style={{
                  lineHeight: '1.8',
                  fontSize: '16px'
                }}
              />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50">
      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="sm:max-w-md space-y-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Article Submitted Successfully!
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  Your article <strong>"{submittedArticle?.title}"</strong> has
                  been submitted for review.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-yellow-800">
                        Waiting for Admin Approval
                      </p>
                      <p className="text-sm text-yellow-700">
                        Your article will be reviewed and published once
                        approved. You'll receive a notification when the status
                        changes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowApprovalDialog(false)}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="px-1 pt-6">
  <div className="flex items-center justify-between ">
    <div className="flex items-center gap-5">
      <Separator orientation="vertical" className="h-6" />
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Blogs & Articles
          </h1>
          <p className="text-sm text-gray-500">
            Discover insights from the community
          </p>
        </div>
      </div>
    </div>
    <Button
      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-sm mr-10"
      onClick={handleWriteArticle}
    >
      <Plus className="w-4 h-4" />
      Write Article
    </Button>
  </div>
</header>


      {/* Content */}
      <div className="flex-1 overflow-auto ">
        <div className="max-w-7xl mx-auto space-y-10">
          {/* Search and Filters */}
          <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 pt-5 space-y-5">
            <div className="flex flex-col lg:flex-row gap-5">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search blogs, topics, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 text-base border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              {/* Filter Toggle Button */}
              <FilterToggleButton
                onClick={() => setIsFilterSidebarOpen(true)}
                hasActiveFilters={hasActiveFilters}
                activeFiltersCount={hasActiveFilters ? 1 : 0}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Filters
              </FilterToggleButton>
            </div>
          </div>

          {/* All Blogs Section - REMOVED TABS */}
          <div className="mt-8 px-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                  <Card
                    key={i}
                    className="animate-pulse border-gray-200 rounded-xl"
                  >
                    <div className="h-48 bg-gray-200 rounded-t-xl"></div>
                    <CardContent className="p-6 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                      <div className="flex justify-between">
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredBlogs.map((blog) => (
                  <Card
                    key={blog._id}
                    onClick={() => handleBlogClick(blog)}
                    className="group relative rounded-2xl border border-gray-200 bg-white/40 backdrop-blur-lg hover:shadow-none hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
                  >
                    {/* Image Section */}
                    <div className="relative h-48 overflow-hidden rounded-t-2xl">
                      <img
                        src={blog.image || "/placeholder.svg"}
                        alt={blog.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {blog.featured && (
                        <Badge className="absolute top-3 left-3 bg-yellow-400 text-white text-xs shadow-md">
                          ⭐ Featured
                        </Badge>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    {/* Content */}
                    <CardContent className="p-5 space-y-4 pt-2">
                      {/* Meta: Category + Read Time */}
                      <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                        <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-md">
                          {blog.category}
                        </span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{blog.readTime} min read</span>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-bold text-gray-900 line-clamp-1 leading-snug group-hover:text-indigo-700 transition-colors">
                        {blog.title}
                      </h3>

                      {/* Excerpt */}
                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-1">
                        {blog.excerpt}
                      </p>

                      {/* Tags */}
                      {blog.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {blog.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer: Author + Stats */}
                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
                        {/* Author */}
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9 ring-2 ring-white shadow-md">
                            <AvatarImage
                              src={blog.author.avatar || "/placeholder.svg"}
                              alt={blog.author.name}
                            />
                            <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-bold">
                              {blog.author.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {blog.author.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {blog.author.role}
                            </p>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            {blog.likes}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Sidebar */}
      <FilterSidebar
        isOpen={isFilterSidebarOpen}
        onClose={() => setIsFilterSidebarOpen(false)}
        title="Blog Filters"
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearFilters}
      >
        <FilterField label="Category">
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category === "all" ? "All Categories" : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Search">
          <Input
            type="text"
            placeholder="Search blogs, topics, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
          />
        </FilterField>
      </FilterSidebar>
    </div>
  );
}
