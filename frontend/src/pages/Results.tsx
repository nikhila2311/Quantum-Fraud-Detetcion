// src/pages/Results.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, AlertTriangle, CheckCircle, Filter, BarChart3 } from "lucide-react";

type ResultRow = {
  [key: string]: any;
  transaction_id?: string;
  id?: string;
  amount?: number;
  predicted?: "Fraud" | "Normal" | string;
  confidence?: number;
  timestamp?: string;
  merchant_category?: string;
  merchantCategory?: string;
  location?: string;
  _anomaly_score?: number;
};

const API_BASE = (import.meta.env.VITE_API_BASE as string) || "http://127.0.0.1:5000";

export default function Results() {
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "fraud" | "normal">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [stats, setStats] = useState<{ total: number; fraud: number; normal: number; fraudRate: string; avgConfidence: string } | null>(null);
  const [meta, setMeta] = useState<{ rows: number; score_min?: number; score_max?: number; threshold?: number } | null>(null);

  useEffect(() => {
    const fileId = localStorage.getItem("qtrack_last_file_id");
    if (fileId) fetchResults(fileId);
  }, []);

  async function fetchResults(fileId: string) {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/results/${encodeURIComponent(fileId)}`);
      const j = await res.json();
      if (!res.ok) {
        console.error("Results API error", j);
        setRows([]);
        setStats(null);
        setMeta(null);
        setLoading(false);
        return;
      }
      const fetched: ResultRow[] = j.results || [];
      // normalize keys: prefer transaction_id, amount, confidence, predicted, timestamp, merchantCategory, location
      const normalized = fetched.map(r => ({
        ...r,
        transaction_id: r.transaction_id ?? r.id ?? r.transactionId ?? r.txn_id,
        amount:
          typeof (r.amount ?? r.Amount) === "string"
            ? Number(r.amount ?? r.Amount)
            : (r.amount ?? r.Amount),
        confidence: typeof r.confidence === "string" ? Number(r.confidence) : r.confidence,
        predicted: r.predicted ?? r.prediction ?? (r._anomaly_score !== undefined ? (r._anomaly_score < (j.threshold ?? 0.3) ? "Fraud" : "Normal") : "Unknown"),
        timestamp: r.timestamp ?? r.time ?? r.date,
        merchantCategory: r.merchant_category ?? r.merchantCategory ?? r.category,
        location: r.location ?? r.place,
        _anomaly_score: r._anomaly_score
      }));
      setRows(normalized);
      setMeta({ rows: j.rows, score_min: j.score_min, score_max: j.score_max, threshold: j.threshold });

      // compute stats
      const total = normalized.length;
      const fraud = normalized.filter(t => String(t.predicted).toLowerCase() === "fraud").length;
      const normal = total - fraud;
      const fraudRate = total > 0 ? ((fraud / total) * 100).toFixed(1) : "0.0";
      const avgConfidence = total > 0 ? (normalized.reduce((s, t) => s + (Number(t.confidence) || 0), 0) / total).toFixed(2) : "0.00";
      setStats({ total, fraud, normal, fraudRate, avgConfidence });

    } catch (e) {
      console.error(e);
      setRows([]);
      setStats(null);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }

  const filteredTransactions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return rows.filter(transaction => {
      const matchesSearch =
        !term ||
        String(transaction.transaction_id ?? transaction.id ?? "").toLowerCase().includes(term) ||
        String(transaction.merchantCategory ?? transaction.merchant_category ?? "").toLowerCase().includes(term) ||
        String(transaction.location ?? "").toLowerCase().includes(term);
      const matchesFilter =
        filterType === "all" ||
        (filterType === "fraud" && String(transaction.predicted).toLowerCase() === "fraud") ||
        (filterType === "normal" && String(transaction.predicted).toLowerCase() === "normal");
      return matchesSearch && matchesFilter;
    });
  }, [rows, searchTerm, filterType]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage));
  const displayed = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null || Number.isNaN(Number(amount))) return "-";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(amount));
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const exportCSV = () => {
    const fileId = localStorage.getItem("qtrack_last_file_id");
    if (!fileId) return alert("No file ID found. Run analysis first.");
    const assumed = `${fileId}_pred.csv`;
    window.open(`${API_BASE}/download/${encodeURIComponent(assumed)}`, "_blank");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-3 p-4 bg-gradient-qtrack-secondary rounded-2xl">
          <BarChart3 className="h-8 w-8 text-white" />
          <h1 className="text-3xl font-bold text-white text-shadow-glow">
            Analysis Results
          </h1>
        </div>
        <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
          Quantum SVM fraud detection results with confidence scores and detailed transaction analysis.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="qtrack-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.total ?? "-"}</p>
                <p className="text-sm text-neutral-400">Total Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="qtrack-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.fraud ?? "-"}</p>
                <p className="text-sm text-neutral-400">Fraud Detected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="qtrack-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.normal ?? "-"}</p>
                <p className="text-sm text-neutral-400">Normal Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="qtrack-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Filter className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.fraudRate ?? "-"}%</p>
                <p className="text-sm text-neutral-400">Fraud Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="qtrack-card">
        <CardHeader>
          <CardTitle className="text-xl text-white">Transaction Analysis</CardTitle>
          <CardDescription className="text-neutral-400">
            Search and filter transaction results. Average model confidence: {stats?.avgConfidence ?? "-"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search by ID, category, or location..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-10 bg-neutral-900/50 border-neutral-700 text-white"
              />
            </div>
            <Select value={filterType} onValueChange={(v) => { setFilterType(v as any); setCurrentPage(1); }}>
              <SelectTrigger className="w-full sm:w-48 bg-neutral-900/50 border-neutral-700 text-white">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700">
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="fraud">Fraud Only</SelectItem>
                <SelectItem value="normal">Normal Only</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-gradient-qtrack-accent hover-glow-accent text-white" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card className="qtrack-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-700 hover:bg-neutral-800/50">
                  <TableHead className="text-neutral-300">Transaction ID</TableHead>
                  <TableHead className="text-neutral-300">Amount</TableHead>
                  <TableHead className="text-neutral-300">Prediction</TableHead>
                  <TableHead className="text-neutral-300">Confidence</TableHead>
                  <TableHead className="text-neutral-300">Category</TableHead>
                  <TableHead className="text-neutral-300">Location</TableHead>
                  <TableHead className="text-neutral-300">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-6 text-center">Loading results...</TableCell>
                  </TableRow>
                ) : displayed.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-6 text-center text-neutral-400">No results found.</TableCell>
                  </TableRow>
                ) : (
                  displayed.map((transaction, idx) => (
                    <TableRow key={idx} className="border-neutral-700 hover:bg-neutral-800/50 transition-colors">
                      <TableCell className="font-mono text-white">
                        {transaction.transaction_id ?? transaction.id ?? `row-${(currentPage - 1) * itemsPerPage + idx + 1}`}
                      </TableCell>
                      <TableCell className="font-semibold text-white">{formatCurrency(transaction.amount)}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            String(transaction.predicted).toLowerCase() === "fraud"
                              ? "bg-red-500/20 text-red-300 border-red-500/30"
                              : "bg-green-500/20 text-green-300 border-green-500/30"
                          }
                        >
                          {String(transaction.predicted)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 bg-neutral-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                (transaction.confidence || 0) > 0.8
                                  ? "bg-green-500"
                                  : (transaction.confidence || 0) > 0.6
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${Math.round((transaction.confidence || 0) * 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-neutral-300">{Math.round((transaction.confidence || 0) * 100)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-neutral-300">{transaction.merchantCategory ?? transaction.merchant_category ?? "-"}</TableCell>
                      <TableCell className="text-neutral-300">{transaction.location ?? "-"}</TableCell>
                      <TableCell className="text-neutral-300">{formatDate(transaction.timestamp)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-4">
            <div className="text-sm text-neutral-400">Showing {displayed.length} of {filteredTransactions.length} filtered</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
              <div className="text-sm text-neutral-300 px-4">Page {currentPage} / {totalPages}</div>
              <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
