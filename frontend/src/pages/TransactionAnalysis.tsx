// src/pages/TransactionAnalysis.tsx
import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Zap, Upload, TrendingUp, DollarSign, Download, BarChart3, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// recharts for histogram
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

interface TransactionData {
  amount: number;
  currency: string;
  location: string;
  merchantCategory?: string;
  paymentMethod?: string;
  timestamp?: string;
  [key: string]: any;
}

export default function TransactionAnalysis() {
  const API_BASE = (import.meta.env.VITE_API_BASE as string) || "http://127.0.0.1:5000";

  const [single, setSingle] = useState<TransactionData>({
    amount: 0,
    currency: "USD",
    location: "",
    timestamp: ""
  });

  const [batchData, setBatchData] = useState<string>("");
  const [batchResult, setBatchResult] = useState<any[]>([]);
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHistogram, setShowHistogram] = useState(true);
  const [minConfidence, setMinConfidence] = useState(0); // 0..100
  const [copied, setCopied] = useState(false);

  const { toast } = useToast();

  // ---------------- SINGLE ----------------
  const analyzeSingleTransaction = async () => {
    if (!single || Number(single.amount) <= 0) {
      toast({ title: "Invalid", description: "Enter a valid amount" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const fileId = localStorage.getItem("qtrack_last_file_id") || undefined;
      const payload = { transaction: single, file_id: fileId };
      const res = await fetch(`${API_BASE}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const j = await res.json();
      if (!res.ok) {
        toast({ title: "Analysis failed", description: j.error || "Server error" });
        setLoading(false);
        return;
      }
      setResult(j);
      toast({
        title: "Analysis complete",
        description: `Prediction: ${j.predicted} — Confidence ${(j.confidence * 100).toFixed(1)}%`
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Unexpected error" });
    }
    setLoading(false);
  };

  // ---------------- BATCH (REAL) ----------------
  const analyzeBatchTransactions = async () => {
    if (!batchData.trim()) return;
    setLoading(true);
    setBatchResult([]);
    try {
      const lines = batchData.trim().split("\n");
      const headers = lines[0].split(",").map(h => h.trim());

      const rows = lines.slice(1).map(line => {
        const parts = line.split(",");
        const obj: any = {};
        headers.forEach((h, i) => {
          let v = parts[i]?.trim();
          if (v === undefined) v = "";
          if (!isNaN(Number(v)) && v !== "") v = Number(v);
          obj[h] = v;
        });
        return obj;
      });

      const resp = await fetch(`${API_BASE}/batch-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows })
      });

      const json = await resp.json();
      if (!resp.ok) {
        toast({ title: "Batch Error", description: json.error });
        setLoading(false);
        return;
      }

      // backend returns results with predicted + confidence
      setBatchResult(json.results || []);
      toast({ title: "Batch Analysis Complete", description: `${json.rows} transactions analyzed` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message });
    }
    setLoading(false);
  };

  // ---------------- STATS / FILTERING ----------------
  const filteredBatch = useMemo(() => {
    return batchResult.filter(r => {
      const conf = Number(r.confidence || 0);
      return conf * 100 >= minConfidence;
    });
  }, [batchResult, minConfidence]);

  const stats = useMemo(() => {
    const total = batchResult.length;
    if (total === 0) return { total: 0, fraud: 0, normal: 0, fraudRate: "0.0", avgConfidence: "0.00" };
    const fraud = batchResult.filter(r => String(r.predicted).toLowerCase() === "fraud").length;
    const normal = total - fraud;
    const fraudRate = ((fraud / total) * 100).toFixed(1);
    const avgConfidence = (batchResult.reduce((s, r) => s + (Number(r.confidence) || 0), 0) / total).toFixed(2);
    return { total, fraud, normal, fraudRate, avgConfidence };
  }, [batchResult]);

  // histogram data using confidence * 100 (0..100)
  const histogramData = useMemo(() => {
    if (!batchResult.length) return [];
    const buckets = new Array(10).fill(0); // 10 buckets (0-10,...90-100)
    batchResult.forEach(r => {
      const c = Math.round((Number(r.confidence) || 0) * 100);
      const idx = Math.min(9, Math.floor(c / 10));
      buckets[idx] += 1;
    });
    return buckets.map((count, i) => ({
      bucket: `${i * 10}-${i * 10 + 9}`,
      count
    }));
  }, [batchResult]);

  // ---------------- EXPORT / COPY ----------------
  const downloadCSV = () => {
    if (!batchResult.length) {
      toast({ title: "No data", description: "Run batch analysis first." });
      return;
    }
    const keys = Object.keys(batchResult[0]);
    const csv = [
      keys.join(","),
      ...batchResult.map(r => keys.map(k => {
        const v = r[k];
        // escape quotes
        if (v === undefined || v === null) return "";
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch_results_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyJSON = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(batchResult, null, 2));
      setCopied(true);
      toast({ title: "Copied", description: "Batch results copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Unable to copy to clipboard." });
    }
  };

  // ---------------- UI ----------------
  return (
    <div className="space-y-8 animate-fade-in">
      {/* header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-3 p-6 bg-gradient-qtrack-secondary rounded-2xl">
          <Zap className="h-10 w-10 text-white" />
          <h1 className="text-4xl font-bold text-white text-shadow-glow">Transaction Analysis</h1>
        </div>
        <p className="text-xl text-neutral-300 max-w-4xl mx-auto leading-relaxed">
          Analyze transactions for fraud using real–time scoring and batch predictions.
        </p>
      </div>

      <Tabs defaultValue="batch">
        <TabsList className="grid w-full grid-cols-2 bg-neutral-900/50">
          <TabsTrigger value="single" className="data-[state=active]:bg-gradient-qtrack-primary">Single Transaction</TabsTrigger>
          <TabsTrigger value="batch" className="data-[state=active]:bg-gradient-qtrack-primary">Batch Analysis</TabsTrigger>
        </TabsList>

        {/* SINGLE TAB (kept minimal) */}
        <TabsContent value="single" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="qtrack-card">
              <CardHeader>
                <CardTitle className="text-2xl text-white flex items-center gap-2"><DollarSign className="h-6 w-6" /> Single Transaction</CardTitle>
                <CardDescription className="text-neutral-400">Enter values and click Analyze</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Amount</Label>
                    <Input type="number" value={single.amount} onChange={e => setSingle({ ...single, amount: Number(e.target.value) })} className="bg-neutral-900/50" />
                  </div>
                  <div>
                    <Label className="text-white">Currency</Label>
                    <Input value={single.currency} onChange={e => setSingle({ ...single, currency: e.target.value })} className="bg-neutral-900/50" />
                  </div>
                </div>
                <div>
                  <Label className="text-white">Location</Label>
                  <Input value={single.location} onChange={e => setSingle({ ...single, location: e.target.value })} className="bg-neutral-900/50" />
                </div>
                <Button onClick={analyzeSingleTransaction} className="bg-gradient-qtrack-secondary text-white" disabled={loading || single.amount <= 0}>
                  {loading ? "Analyzing..." : "Analyze Transaction"}
                </Button>
              </CardContent>
            </Card>

            <div>
              {result ? (
                <Card className="qtrack-card">
                  <CardHeader>
                    <CardTitle className="text-2xl text-white">Result</CardTitle>
                    <CardDescription className="text-neutral-400">Real-time single transaction scoring</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-white">Prediction: <b>{result.predicted}</b></div>
                    <div className="text-white">Confidence: <b>{(result.confidence * 100).toFixed(1)}%</b></div>
                    <div className="text-white">Score: <b>{(result.nscore ?? 0).toFixed(3)}</b></div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="qtrack-card">
                  <CardHeader>
                    <CardTitle className="text-xl text-white">No result yet</CardTitle>
                    <CardDescription className="text-neutral-400">Run a single transaction analysis to see output</CardDescription>
                  </CardHeader>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* BATCH TAB */}
        <TabsContent value="batch" className="space-y-6">
          <Card className="qtrack-card">
            <CardHeader>
              <CardTitle className="text-2xl text-white flex items-center gap-2"><Upload className="h-6 w-6" /> Batch Transaction Analysis</CardTitle>
              <CardDescription className="text-neutral-400">Paste CSV lines (header + rows) and run batch scoring</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Label className="text-white">Transaction Data (CSV)</Label>
              <Textarea value={batchData} onChange={e => setBatchData(e.target.value)} placeholder="amount,currency,location,merchant_category,payment_method\n150,USD,New York,Online Retail,Credit Card" className="min-h-[160px] bg-neutral-900/50 text-white font-mono" />
              <Alert className="bg-blue-500/10 border-blue-500/30">
                <AlertDescription className="text-blue-300">Include headers (e.g. amount,currency,location,merchant_category,payment_method)</AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button onClick={analyzeBatchTransactions} disabled={loading || !batchData.trim()} className="bg-gradient-qtrack-primary text-white">
                  {loading ? "Processing..." : "Analyze Batch Transactions"}
                </Button>

                <Button onClick={() => { setBatchData(""); setBatchResult([]); }} variant="outline">
                  Clear
                </Button>

                <Button onClick={() => { /* paste example */ setBatchData("amount,currency,location,merchant_category,payment_method\n150.00,USD,New York,Online Retail,Credit Card\n2500.00,EUR,London,Hotel,Debit Card"); }} variant="ghost">
                  Load Example
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* STATS + CONTROLS */}
          {batchResult.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="qtrack-card">
                <CardContent>
                  <div className="text-neutral-400">Total</div>
                  <div className="text-2xl font-bold text-white">{stats.total}</div>
                </CardContent>
              </Card>

              <Card className="qtrack-card">
                <CardContent>
                  <div className="text-neutral-400">Fraud</div>
                  <div className="text-2xl font-bold text-white">{stats.fraud}</div>
                  <div className="text-sm text-neutral-400">Rate: {stats.fraudRate}%</div>
                </CardContent>
              </Card>

              <Card className="qtrack-card">
                <CardContent>
                  <div className="text-neutral-400">Avg Confidence</div>
                  <div className="text-2xl font-bold text-white">{(Number(stats.avgConfidence) * 100).toFixed(1)}%</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* controls for results */}
          {batchResult.length > 0 && (
            <div className="flex items-center gap-3">
              <Button onClick={downloadCSV} className="bg-gradient-qtrack-secondary text-white">
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>

              <Button onClick={copyJSON} variant="outline">
                <Copy className="h-4 w-4 mr-2" /> {copied ? "Copied" : "Copy JSON"}
              </Button>

              <Button onClick={() => setShowHistogram(s => !s)} variant="ghost">
                <BarChart3 className="h-4 w-4 mr-2" /> {showHistogram ? "Hide Histogram" : "Show Histogram"}
              </Button>

              <div className="ml-auto flex items-center gap-2">
                <div className="text-sm text-neutral-400">Min Confidence</div>
                <input type="range" min={0} max={100} value={minConfidence} onChange={(e) => setMinConfidence(Number(e.target.value))} />
                <div className="text-sm text-white w-12 text-right">{minConfidence}%</div>
              </div>
            </div>
          )}

          {/* HISTOGRAM */}
          {showHistogram && batchResult.length > 0 && (
            <Card className="qtrack-card">
              <CardHeader>
                <CardTitle className="text-lg text-white">Confidence Distribution</CardTitle>
                <CardDescription className="text-neutral-400">Histogram of model confidence for batch results</CardDescription>
              </CardHeader>
              <CardContent style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histogramData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2b2b2b" />
                    <XAxis dataKey="bucket" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip />
                    <Bar dataKey="count" fill="#60a5fa" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* RESULTS TABLE */}
          {filteredBatch.length > 0 && (
            <Card className="qtrack-card">
              <CardHeader>
                <CardTitle className="text-xl text-white">Batch Results (filtered)</CardTitle>
                <CardDescription className="text-neutral-400">Showing rows with confidence ≥ {minConfidence}%</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-white">
                    <thead>
                      <tr>
                        {Object.keys(filteredBatch[0]).map(k => (
                          <th key={k} className="p-2 border-b border-neutral-700 text-left">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBatch.map((row, i) => (
                        <tr key={i} className="border-b border-neutral-800">
                          {Object.keys(row).map(k => (
                            <td key={k} className="p-2">{String(row[k])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  // helper functions (declared at bottom to keep JSX tidy)
  function getRiskBadgeColor(pred: string) {
    return pred === "Fraud"
      ? "bg-red-500/20 text-red-300 border-red-500/30"
      : "bg-green-500/20 text-green-300 border-green-500/30";
  }
}
