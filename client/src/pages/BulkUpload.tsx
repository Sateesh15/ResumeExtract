import { useState } from 'react';
import { useLocation } from 'wouter'; // ✅ FIXED: Changed from useNavigate to useLocation
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function BulkUpload() {
  const [, setLocation] = useLocation(); // ✅ FIXED: Use useLocation instead of useNavigate
  const { toast } = useToast();
  
  // Filter criteria state
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [skillsMatchMode, setSkillsMatchMode] = useState<'AND' | 'OR'>('AND');
  const [position, setPosition] = useState('');
  const [minExperience, setMinExperience] = useState(0);
  const [maxExperience, setMaxExperience] = useState(50);
  
  // Upload state
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleAddSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
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
      const formData = new FormData();
      
      // Add files
      files.forEach(file => {
        formData.append('files', file);
      });

      // Add filter criteria
      formData.append('skills', JSON.stringify(skills));
      formData.append('skillsMatchMode', skillsMatchMode);
      formData.append('position', position);
      formData.append('minExperience', minExperience.toString());
      formData.append('maxExperience', maxExperience.toString());

      const response = await fetch('/api/candidates/bulk-upload-filter', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setResults(data);

      toast({
        title: "✅ Upload Complete",
        description: `${data.matched} candidates matched and saved, ${data.rejected} rejected`,
      });
    } catch (error) {
      toast({
        title: "❌ Upload Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
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
              <div>
                <Label>Required Skills</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                    placeholder="Type a skill..."
                  />
                  <Button onClick={handleAddSkill}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
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
                      variant={skillsMatchMode === 'AND' ? 'default' : 'outline'}
                      onClick={() => setSkillsMatchMode('AND')}
                    >
                      Match ALL
                    </Button>
                    <Button
                      size="sm"
                      variant={skillsMatchMode === 'OR' ? 'default' : 'outline'}
                      onClick={() => setSkillsMatchMode('OR')}
                    >
                      Match ANY
                    </Button>
                  </div>
                )}
              </div>

              {/* Position */}
              <div>
                <Label>Position/Role</Label>
                <Input
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g., Software Engineer"
                />
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
                  accept=".pdf"
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
                  Select PDF Files
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
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Processed</p>
                  <p className="text-2xl font-bold">{results.total}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Matched</p>
                  <p className="text-2xl font-bold text-green-600">{results.matched}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{results.rejected}</p>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {results.results.map((result: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg flex items-center gap-3 ${
                      result.status === 'matched'
                        ? 'bg-green-50'
                        : result.status === 'rejected'
                        ? 'bg-red-50'
                        : 'bg-gray-50'
                    }`}
                  >
                    {result.status === 'matched' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{result.filename}</p>
                      {result.candidate && (
                        <p className="text-sm text-muted-foreground">
                          {result.candidate.fullName} - {result.candidate.skills?.join(', ')}
                        </p>
                      )}
                      {result.reason && (
                        <p className="text-sm text-red-600">{result.reason}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <Button onClick={() => {
                  setResults(null);
                  setFiles([]);
                }} variant="outline">
                  Upload More
                </Button>
                <Button onClick={() => setLocation('/')}>
                  View Candidates
                </Button>
              </div>
              </div>
            </CardContent>
          </Card>
      )} 
      {/* ✅ FIXED: Added closing brace for ternary and closing </div> */}
    </div>
  );
}