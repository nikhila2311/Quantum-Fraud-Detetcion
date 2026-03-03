// src/pages/Upload.tsx
import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Mode = "auto" | "unsupervised" | "ocsvm" | "quantum";

interface UploadState {
  file: File | null;
  uploading: boolean;
  progress: number;
  uploaded: boolean;
  error: string | null;
  fileId?: string | null;
  mode?: Mode;
}

export default function Upload() {
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    uploading: false,
    progress: 0,
    uploaded: false,
    error: null,
    fileId: null,
    mode: "auto"
  });
  const { toast } = useToast();

  // API base - change via environment if needed
  const API_BASE = (import.meta.env.VITE_API_BASE as string) || "http://127.0.0.1:5000";

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.name.endsWith('.csv'));
    
    if (csvFile) {
      setUploadState(prev => ({ 
        ...prev, 
        file: csvFile, 
        error: null, 
        uploaded: false,
        fileId: null
      }));
    } else {
      setUploadState(prev => ({ 
        ...prev, 
        error: "Please upload a CSV file" 
      }));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (file.name.endsWith('.csv')) {
        setUploadState(prev => ({ 
          ...prev, 
          file, 
          error: null, 
          uploaded: false,
          fileId: null
        }));
      } else {
        setUploadState(prev => ({ 
          ...prev, 
          error: "Please select a CSV file" 
        }));
      }
    }
  };

  // Upload file to backend and then trigger run
  const startAnalysis = async () => {
    if (!uploadState.file) return setUploadState(prev => ({ ...prev, error: "No file selected" }));

    try {
      setUploadState(prev => ({ ...prev, uploading: true, progress: 5, error: null }));

      // 1) Upload file
      const fd = new FormData();
      fd.append("file", uploadState.file);

      const uplResp = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: fd
      });

      const uplJson = await uplResp.json();
      if (!uplResp.ok) {
        setUploadState(prev => ({ ...prev, uploading: false, error: uplJson.error || "Upload failed" }));
        toast({ title: "Upload failed", description: uplJson.error || "See console." });
        return;
      }

      const fileId = uplJson.file_id;
      setUploadState(prev => ({ ...prev, progress: 30, fileId }));

      // persist fileId now so Results can find it even if run fails later
      try { localStorage.setItem("qtrack_last_file_id", fileId); } catch (e) { /* ignore */ }

      // 2) Run analysis (selected mode)
      setUploadState(prev => ({ ...prev, progress: 40 }));
      const mode = uploadState.mode || "auto";
      const runResp = await fetch(`${API_BASE}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: fileId, mode })
      });
      const runJson = await runResp.json();
      if (!runResp.ok) {
        setUploadState(prev => ({ ...prev, uploading: false, error: runJson.error || "Analysis failed", fileId }));
        toast({ title: "Analysis failed", description: runJson.error || "See console." });
        return;
      }

      // progress simulation while backend finishes heavy jobs (keeps UI responsive)
      for (let p = 50; p <= 95; p += 15) {
        await new Promise(r => setTimeout(r, 300));
        setUploadState(prev => ({ ...prev, progress: p }));
      }

      // 3) Handle results
      setUploadState(prev => ({ ...prev, uploading: false, uploaded: true, progress: 100, fileId }));
      toast({ title: "Analysis complete", description: "Results ready." });

      // If backend returned an out_file -> open download in new tab
      if (runJson.out_file) {
        const downloadUrl = `${API_BASE}/download/${encodeURIComponent(runJson.out_file)}`;
        window.open(downloadUrl, "_blank");
      }

      // keep fileId in localStorage (again)
      try { localStorage.setItem("qtrack_last_file_id", fileId); } catch (e) { /* ignore */ }

    } catch (err: any) {
      console.error(err);
      setUploadState(prev => ({ ...prev, uploading: false, error: err.message || "Unexpected error" }));
      toast({ title: "Error", description: err.message || "Unexpected error" });
    }
  };

  const resetUpload = () => {
    setUploadState({
      file: null,
      uploading: false,
      progress: 0,
      uploaded: false,
      error: null,
      fileId: null,
      mode: "auto"
    });
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-3 p-4 bg-gradient-qtrack-primary rounded-2xl">
          <UploadIcon className="h-8 w-8 text-white" />
          <h1 className="text-3xl font-bold text-white text-shadow-glow">
            Transaction Data Upload
          </h1>
        </div>
        <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
          Upload your CSV file containing transaction data for fraud detection analysis using our Quantum SVM model.
        </p>
      </div>

      {/* Upload Card */}
      <Card className="qtrack-card">
        <CardHeader>
          <CardTitle className="text-xl text-white flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Data Upload
          </CardTitle>
          <CardDescription className="text-neutral-400">
            Drag and drop your CSV file or click to browse. Maximum file size: 50MB
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
              ${uploadState.file 
                ? "border-green-500/50 bg-green-500/5" 
                : "border-neutral-600 hover:border-neutral-500 bg-neutral-900/50"
              }
            `}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            <div className="space-y-4">
              {uploadState.file ? (
                <div className="space-y-3">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-white">{uploadState.file.name}</p>
                    <p className="text-sm text-neutral-400">
                      {(uploadState.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                    Ready for Upload
                  </Badge>
                </div>
              ) : (
                <div className="space-y-3">
                  <UploadIcon className="h-12 w-12 text-neutral-400 mx-auto" />
                  <div>
                    <p className="text-lg text-white">Drop your CSV file here</p>
                    <p className="text-sm text-neutral-400">or click to browse</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {uploadState.error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <span className="text-red-400">{uploadState.error}</span>
            </div>
          )}

          {/* Progress Bar */}
          {uploadState.uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">Uploading and processing...</span>
                <span className="text-white">{uploadState.progress}%</span>
              </div>
              <Progress value={uploadState.progress} className="h-2" />
            </div>
          )}

          {/* Mode Selector */}
          <div className="flex items-center justify-center gap-3">
            <label className="text-neutral-400">Mode:</label>
            <select
              value={uploadState.mode}
              onChange={(e) => setUploadState(prev => ({ ...prev, mode: e.target.value as Mode }))}
              className="bg-neutral-900/50 text-white p-2 rounded"
            >
              <option value="auto">auto</option>
              <option value="unsupervised">unsupervised</option>
              <option value="ocsvm">ocsvm (needs Class)</option>
              <option value="quantum">quantum (Qiskit kernel)</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            {uploadState.file && !uploadState.uploading && !uploadState.uploaded && (
              <Button
                onClick={startAnalysis}
                className="bg-gradient-qtrack-primary hover-glow-primary text-white px-8"
              >
                Start Analysis
              </Button>
            )}
            
            {uploadState.uploaded && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={resetUpload}
                  className="border-neutral-600 text-neutral-300 hover:bg-neutral-800"
                >
                  Upload Another File
                </Button>
                <Button
                  className="bg-gradient-qtrack-secondary hover-glow-secondary text-white"
                  onClick={() => {
                    // open Results page (it reads qtrack_last_file_id from localStorage)
                    window.location.href = "/results";
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  View Results
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File Format Info */}
      <Card className="qtrack-card">
        <CardHeader>
          <CardTitle className="text-lg text-white">Expected CSV Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-neutral-400 text-sm">
              Your CSV file should contain transaction data with the following columns:
            </p>
            <div className="bg-neutral-900/50 rounded-lg p-4 font-mono text-sm">
              <div className="text-neutral-300">
                transaction_id, amount, merchant_category, location, timestamp, user_id, payment_method
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-white mb-2">Required Columns:</h4>
                <ul className="space-y-1 text-neutral-400">
                  <li>• transaction_id (unique identifier)</li>
                  <li>• amount (numeric value)</li>
                  <li>• timestamp (ISO format)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-white mb-2">Optional Columns:</h4>
                <ul className="space-y-1 text-neutral-400">
                  <li>• merchant_category</li>
                  <li>• location</li>
                  <li>• payment_method</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
