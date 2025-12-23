import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import msalInstance from "@/lib/msalInstance";


// ✅ Helper function to get auth headers
async function getAuthHeaders(): Promise<Record<string, string>> {
  const accounts = msalInstance.getAllAccounts();
  let headers: Record<string, string> = {};

  if (accounts && accounts.length > 0) {
    try {
      const response = await msalInstance.acquireTokenSilent({
        account: accounts[0],
        scopes: ["api://5b21943f-59c2-4cf9-ad62-056b6302e168/access"],
      } as any);

      if (response?.accessToken) {
        headers["Authorization"] = `Bearer ${response.accessToken}`;
      }
    } catch (err) {
      console.error("[BulkUpload] Token acquisition failed:", err);
      try {
        const popupResponse = await msalInstance.acquireTokenPopup({
          account: accounts[0],
          scopes: ["api://5b21943f-59c2-4cf9-ad62-056b6302e168/access"],
        } as any);

        if (popupResponse?.accessToken) {
          headers["Authorization"] = `Bearer ${popupResponse.accessToken}`;
        }
      } catch (popupErr) {
        console.error("[BulkUpload] Popup token acquisition also failed:", popupErr);
      }
    }
  }

  return headers;
}

export default function BulkUpload() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Filter criteria state
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [skillsMatchMode, setSkillsMatchMode] = useState<'AND' | 'OR'>('AND');
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [position, setPosition] = useState('');
  const [minExperience, setMinExperience] = useState(0);
  const [maxExperience, setMaxExperience] = useState(50);

  // Common tech skills database
  const commonSkills = [
    'Java', 'JavaScript', 'TypeScript', 'Python', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby',
    'Spring Boot', 'Spring', 'Spring MVC', 'Spring Security', 'Spring Data JPA',
    'React', 'React Native', 'Vue.js', 'Angular', 'Svelte', 'Next.js', 'Nuxt.js',
    'Node.js', 'Express.js', 'Nest.js', 'Django', 'Flask', 'FastAPI', 'Laravel',
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle', 'SQL Server', 'SQLite',
    'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins', 'GitLab CI',
    'REST API', 'GraphQL', 'Microservices', 'API Development', 'Web Services',
    'HTML', 'CSS', 'Sass', 'Tailwind CSS', 'Bootstrap', 'Material UI',
    'Git', 'GitHub', 'Bitbucket', 'Jira', 'Confluence',
    'JUnit', 'Jest', 'Mocha', 'Selenium', 'Cypress', 'Postman',
    'Agile', 'Scrum', 'Kanban', 'CI/CD', 'DevOps',
    'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy',
    'Android', 'iOS', 'Swift', 'Kotlin', 'Flutter', 'Xamarin',
    'Testing', 'QA', 'Test Automation', 'Manual Testing', 'API Testing',
    'Linux', 'Unix', 'Windows Server', 'Bash', 'PowerShell',
  ].sort();
  
  // Upload state
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any>(null);
  
  // ✅ NEW: State for managing rejected resumes
  const [rejectedResumes, setRejectedResumes] = useState<any[]>([]);
  const [expandedRejected, setExpandedRejected] = useState<string | null>(null);

  const handleAddSkill = (skill?: string) => {
    const skillToAdd = skill || skillInput.trim();
    if (skillToAdd && !skills.includes(skillToAdd)) {
      setSkills([...skills, skillToAdd]);
      setSkillInput('');
      setShowSuggestions(false);
    }
  };

  const handleSkillInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSkillInput(value);
    
    if (value.trim()) {
      const filtered = commonSkills.filter(skill => 
        skill.toLowerCase().includes(value.toLowerCase()) &&
        !skills.includes(skill)
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  // ✅ UPDATED: handleUpload with rejection tracking
  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select PDF files to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const headers = await getAuthHeaders();

      const formData = new FormData();
      
      files.forEach(file => {
        formData.append('files', file);
      });

      formData.append('skills', JSON.stringify(skills));
      formData.append('skillsMatchMode', skillsMatchMode);
      formData.append('position', position);
      formData.append('minExperience', minExperience.toString());
      formData.append('maxExperience', maxExperience.toString());

      const response = await fetch('/api/candidates/bulk-upload-filter', {
        method: 'POST',
        headers,
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || `Upload failed: ${response.status}`);
      }

      const data = await response.json();
      
      // ✅ Separate rejected resumes with reasons
      const rejected = data.results?.filter((r: any) => r.status === 'rejected') || [];
      setRejectedResumes(rejected);
      
      setResults(data);

      toast({
        title: "✅ Upload Complete",
        description: `${data.matched} candidates matched, ${rejected.length} need review`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "❌ Upload Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // ✅ NEW: Handler to save rejected resume anyway
  const handleSaveRejected = async (rejectedItem: any) => {
  try {
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";

    // ✅ Extract fullName from displayed text if candidate is missing
    const fullName = rejectedItem.candidate?.fullName 
      || rejectedItem.displayName 
      || "Unknown Candidate";

    const response = await fetch('/api/candidates/save-force', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        candidate: {
          fullName: fullName,
          emails: rejectedItem.candidate?.emails || [],
          phones: rejectedItem.candidate?.phones || [],
          skills: rejectedItem.candidate?.skills || [],
          experience: rejectedItem.candidate?.experience || [],
          education: rejectedItem.candidate?.education || [],
          summary: rejectedItem.candidate?.summary || rejectedItem.reason,
          sourceFile: rejectedItem.filename,
          rawText: rejectedItem.candidate?.rawText || "",
          extractionMode: "bulk",
        },
        reason: rejectedItem.reason,
        saveAnyway: true,
      }),
      credentials: "include",
    });

    if (!response.ok) throw new Error('Failed to save');

    setRejectedResumes(rejectedResumes.filter(r => r.filename !== rejectedItem.filename));
    
    toast({
      title: "✅ Saved",
      description: `${fullName} has been saved`,
    });
  } catch (error) {
    toast({
      title: "❌ Save Failed",
      description: error instanceof Error ? error.message : "Could not save resume",
      variant: "destructive",
    });
  }
};


  // ✅ NEW: Handler to permanently delete rejected resume
  const handleDeleteRejected = (rejectedItem: any) => {
    if (!window.confirm(`Delete ${rejectedItem.filename}?`)) return;

    setRejectedResumes(rejectedResumes.filter(r => r.filename !== rejectedItem.filename));
    
    if (results) {
      setResults({
        ...results,
        results: results.results.filter((r: any) => r.filename !== rejectedItem.filename),
        rejected: results.rejected - 1,
        total: results.total - 1,
      });
    }

    toast({
      title: "✅ Deleted",
      description: `${rejectedItem.filename} has been deleted`,
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Bulk Resume Upload with Filter</h1>
        <p className="text-muted-foreground">
          Upload multiple resumes and filter them based on your requirements
        </p>
      </div>

      {!results ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Filter Criteria Card */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Criteria (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Skills */}
              <div className="relative">
                <Label>Required Skills</Label>

                <div className="flex gap-2 mb-2 relative">
                  <Input
                    value={skillInput}
                    onChange={handleSkillInputChange}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="Type a skill..."
                  />
                  <Button type="button" onClick={() => handleAddSkill()}>
                    Add
                  </Button>
                </div>

                {/* 🔽 Suggestions Dropdown */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute bg-white border rounded shadow w-full max-h-48 overflow-y-auto z-20 mt-1">
                    {filteredSuggestions.map((skill, index) => (
                      <div
                        key={index}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleAddSkill(skill)}
                      >
                        {skill}
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Skill Chips */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {skills.map(skill => (
                    <span
                      key={skill}
                      className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {skill}
                      <button onClick={() => handleRemoveSkill(skill)}>×</button>
                    </span>
                  ))}
                </div>

                {skills.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant={skillsMatchMode === "AND" ? "default" : "outline"}
                      onClick={() => setSkillsMatchMode("AND")}
                    >
                      Match ALL
                    </Button>
                    <Button
                      size="sm"
                      variant={skillsMatchMode === "OR" ? "default" : "outline"}
                      onClick={() => setSkillsMatchMode("OR")}
                    >
                      Match ANY
                    </Button>
                  </div>
                )}
              </div>

              {/* Position */}
              <div>
                <Label>Position/Role</Label>
                <Select value={position} onValueChange={setPosition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a position or leave empty for all" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    <SelectItem value="Software Engineer">Software Engineer</SelectItem>
                    <SelectItem value="Senior Software Engineer">Senior Software Engineer</SelectItem>
                    <SelectItem value="Full Stack Developer">Full Stack Developer</SelectItem>
                    <SelectItem value="Frontend Developer">Frontend Developer</SelectItem>
                    <SelectItem value="Backend Developer">Backend Developer</SelectItem>
                    <SelectItem value="DevOps Engineer">DevOps Engineer</SelectItem>
                    <SelectItem value="QA Engineer">QA Engineer</SelectItem>
                    <SelectItem value="Test Engineer">Test Engineer</SelectItem>
                    <SelectItem value="Quality Analyst">Quality Analyst</SelectItem>
                    <SelectItem value="Data Engineer">Data Engineer</SelectItem>
                    <SelectItem value="Data Scientist">Data Scientist</SelectItem>
                    <SelectItem value="Machine Learning Engineer">Machine Learning Engineer</SelectItem>
                    <SelectItem value="UI/UX Designer">UI/UX Designer</SelectItem>
                    <SelectItem value="Product Manager">Product Manager</SelectItem>
                    <SelectItem value="Solutions Architect">Solutions Architect</SelectItem>
                    <SelectItem value="Tech Lead">Tech Lead</SelectItem>
                    <SelectItem value="Engineering Manager">Engineering Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Experience Range */}
              <div>
                <Label>Experience Range (years)</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label className="text-xs">Min Years</Label>
                    <Input
                      type="number"
                      value={minExperience}
                      onChange={(e) => setMinExperience(parseInt(e.target.value) || 0)}
                      min={0}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max Years</Label>
                    <Input
                      type="number"
                      value={maxExperience}
                      onChange={(e) => setMaxExperience(parseInt(e.target.value) || 50)}
                      min={0}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Upload Card */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Resumes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <input
                  type="file"
                  multiple
                  accept=".pdf,.eml,.doc,.docx,.zip"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <Button 
                  variant="outline" 
                  className="mb-2"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  type="button"
                >
                  Select Files (PDF, EML, DOC/DOCX, ZIP)
                </Button>
                <p className="text-sm text-muted-foreground">
                  {files.length > 0 ? `${files.length} files selected` : 'No files selected'}
                </p>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Files:</Label>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {files.map((file, idx) => (
                      <div key={idx} className="text-sm bg-muted p-2 rounded">
                        {file.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={uploading || files.length === 0}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing {files.length} files...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload and Filter
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Upload Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Processed</p>
                  <p className="text-2xl font-bold">{results.total}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Matched & Saved</p>
                  <p className="text-2xl font-bold text-green-600">{results.matched}</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Needs Review</p>
                  <p className="text-2xl font-bold text-amber-600">{rejectedResumes.length}</p>
                </div>
              </div>

              {/* ✅ NEW: Rejected Resumes Section */}
              {rejectedResumes.length > 0 && (
                <Card className="bg-amber-50 border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-900">
                      Resumes Needing Review ({rejectedResumes.length})
                    </CardTitle>
                    <p className="text-sm text-amber-700 mt-2">
                      These resumes didn't match your criteria, but you can save them for future reference
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {rejectedResumes.map((rejectedItem: any, idx: number) => (
                        <div key={idx} className="bg-white border border-amber-200 rounded-lg p-4">
                          {/* Header with expand/collapse */}
                          <div 
                            className="flex items-center justify-between cursor-pointer hover:bg-amber-50 p-2 rounded"
                            onClick={() => setExpandedRejected(
                              expandedRejected === rejectedItem.filename ? null : rejectedItem.filename
                            )}
                          >
                            <div className="flex-1">
                              <p className="font-medium flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-amber-600" />
                                {rejectedItem.filename}
                              </p>
                              {rejectedItem.candidate && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {rejectedItem.candidate.fullName}
                                </p>
                              )}
                            </div>
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                              {expandedRejected === rejectedItem.filename ? '▼' : '▶'}
                            </span>
                          </div>

                          {/* Expanded Details */}
                          {expandedRejected === rejectedItem.filename && (
                            <div className="mt-3 pt-3 border-t border-amber-200 space-y-3">
                              {/* Rejection Reason */}
                              <div>
                                <p className="text-sm font-semibold text-amber-900 mb-1">Why Not Matched:</p>
                                <p className="text-sm text-amber-800 bg-amber-100 p-2 rounded">
                                  {rejectedItem.reason || "Doesn't meet criteria"}
                                </p>
                              </div>

                              {/* Match Analysis */}
                              {rejectedItem.analysis && (
                                <div>
                                  <p className="text-sm font-semibold text-amber-900 mb-1">Match Analysis:</p>
                                  <div className="space-y-1 text-sm text-amber-800">
                                    {rejectedItem.analysis.skills && (
                                      <div className="bg-amber-100 p-2 rounded">
                                        <span className="font-medium">Skills:</span> {rejectedItem.analysis.skills}
                                      </div>
                                    )}
                                    {rejectedItem.analysis.experience && (
                                      <div className="bg-amber-100 p-2 rounded">
                                        <span className="font-medium">Experience:</span> {rejectedItem.analysis.experience}
                                      </div>
                                    )}
                                    {rejectedItem.analysis.position && (
                                      <div className="bg-amber-100 p-2 rounded">
                                        <span className="font-medium">Position:</span> {rejectedItem.analysis.position}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Candidate Info */}
                              {rejectedItem.candidate && (
                                <div>
                                  <p className="text-sm font-semibold text-amber-900 mb-1">Candidate Info:</p>
                                  <div className="space-y-1 text-sm text-amber-800">
                                    <div>Email: {rejectedItem.candidate.emails?.[0] || 'N/A'}</div>
                                    <div>Skills: {rejectedItem.candidate.skills?.join(', ') || 'N/A'}</div>
                                  </div>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex gap-2 pt-2 border-t border-amber-200">
                                <Button
                                  size="sm"
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                  onClick={() => handleSaveRejected(rejectedItem)}
                                >
                                  ✅ Save Anyway
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="flex-1"
                                  onClick={() => handleDeleteRejected(rejectedItem)}
                                >
                                  🗑️ Delete
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Matched Results */}
              <div>
                <CardTitle className="text-lg mb-3">✅ Matched Resumes ({results.matched})</CardTitle>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {results.results?.filter((r: any) => r.status === 'matched').map((result: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3"
                    >
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">{result.filename}</p>
                        {result.candidate && (
                          <p className="text-sm text-muted-foreground">
                            {result.candidate.fullName} - {result.candidate.skills?.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <Button onClick={() => {
                  setResults(null);
                  setFiles([]);
                  setRejectedResumes([]);
                }} variant="outline">
                  Upload More
                </Button>
                <Button onClick={() => {
                  // ✅ INVALIDATE CACHE to refresh Home page data
                  queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
                  setLocation('/');
                }}>
                  View All Candidates
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}