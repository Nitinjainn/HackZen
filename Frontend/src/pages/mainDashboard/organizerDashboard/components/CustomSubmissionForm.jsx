"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "../../../../components/CommonUI/button";
import { API_BASE_URL } from "../../../../lib/api";
import { Input } from "../../../../components/CommonUI/input";
import { Label } from "../../../../components/CommonUI/label";
import { Textarea } from "../../../../components/CommonUI/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/CommonUI/card";
import { Separator } from "../../../../components/CommonUI/separator";
import { Plus, Trash2, ArrowLeft, Save, FileText, HelpCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function CustomSubmissionForm({ hackathon, onCancel }) {
  const [questions, setQuestions] = useState([]);
  const [terms, setTerms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const addQuestion = () => {
    setQuestions([...questions, { id: Date.now().toString(), text: "", required: true }]);
  };

  const removeQuestion = (id) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id, value) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, text: value } : q)));
  };

  const toggleRequired = (id) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, required: !q.required } : q)));
  };

  const addTermsCondition = () => {
    setTerms([...terms, { id: Date.now().toString(), text: "" }]);
  };

  const removeTermsCondition = (id) => {
    setTerms(terms.filter((t) => t.id !== id));
  };

  const updateTermsCondition = (id, value) => {
    setTerms(terms.map((t) => (t.id === id ? { ...t, text: value } : t)));
  };

  const handleSave = async () => {
    if (!hackathon?._id) return alert("Invalid hackathon ID");
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API_BASE_URL}/api/submission-form/hackathon/${hackathon._id}`, {
        questions,
        terms,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
         toast.success("Submission form saved successfully!");
      setQuestions([]);
      setTerms([]);
    } catch (err) {
      console.error("Save form error:", err);
        toast.error("Failed to save form. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if ((questions.length || terms.length) && !window.confirm("Discard all changes?")) return;
    setQuestions([]);
    setTerms([]);
    if (onCancel) onCancel();
  };

  const hasUnsavedChanges = questions.length > 0 || terms.length > 0;

  return (
    <div className="flex-1 min-h-screen bg-slate-50">
      <div className="container max-w-5xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleCancel} className="gap-2 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="h-8 w-px bg-slate-300" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Submission Form Builder</h1>
              <p className="text-slate-600 mt-1">{hackathon?.title ? `For ${hackathon.title}` : "Create custom questions and terms"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-sm">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" /> Unsaved changes
              </div>
            )}
            <Button onClick={handleSave} disabled={isLoading || (!questions.length && !terms.length)} className="gap-2 bg-blue-600 hover:bg-blue-700">
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save Form
                </>
              )}
            </Button>
          </div>
        </div>

        <Separator className="bg-slate-200" />

        {/* Questions */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex gap-2 items-center">
                <HelpCircle className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-xl font-medium">Custom Questions</CardTitle>
              </div>
              <Button onClick={addQuestion} className="gap-2" size="sm">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.length === 0 && (
              <p className="text-slate-500 italic text-sm">No questions added yet.</p>
            )}
            {questions.map((q, index) => (
              <div key={q.id} className="border border-slate-200 p-4 rounded-lg space-y-2">
                <Input
                  value={q.text}
                  onChange={(e) => updateQuestion(q.id, e.target.value)}
                  placeholder={`Question ${index + 1}`}
                />
                <label className="flex gap-2 items-center text-sm text-slate-600">
                  <input type="checkbox" checked={q.required} onChange={() => toggleRequired(q.id)} />
                  Required
                </label>
                <Button variant="ghost" size="sm" onClick={() => removeQuestion(q.id)} className="text-red-600">
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Terms */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex gap-2 items-center">
                <FileText className="h-5 w-5 text-green-500" />
                <CardTitle className="text-xl font-medium">Terms & Conditions</CardTitle>
              </div>
              <Button onClick={addTermsCondition} className="gap-2" size="sm">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {terms.length === 0 && (
              <p className="text-slate-500 italic text-sm">No terms added yet.</p>
            )}
            {terms.map((t, index) => (
              <div key={t.id} className="border border-slate-200 p-4 rounded-lg space-y-2">
                <Textarea
                  value={t.text}
                  onChange={(e) => updateTermsCondition(t.id, e.target.value)}
                  placeholder={`Term ${index + 1}`}
                  rows={3}
                />
                <Button variant="ghost" size="sm" onClick={() => removeTermsCondition(t.id)} className="text-red-600">
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
