# app.py
# Flask API with Classical + Quantum Kernel Mode
# Compatible with Qiskit 0.45.x

import os
import uuid
import warnings
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

from sklearn.preprocessing import StandardScaler, PowerTransformer
from sklearn.decomposition import PCA
from sklearn.ensemble import IsolationForest

warnings.filterwarnings("ignore")

TMP = "tmp"
os.makedirs(TMP, exist_ok=True)
RNG_SEED = 42

app = Flask(__name__)
CORS(app)

# ---------------- Quantum Imports ----------------
try:
    from qiskit import Aer
    from qiskit.utils import QuantumInstance
    from qiskit.circuit.library import ZZFeatureMap
    from qiskit_machine_learning.kernels import QuantumKernel

    QISKIT_AVAILABLE = True
    print("✅ Quantum imports successful")

except Exception as e:
    print("❌ Quantum import failed:", e)
    QISKIT_AVAILABLE = False


# ---------------- Quantum Helper ----------------
def run_quantum_kernel_on_numeric(X_train, X_test, n_qubits=6):
    if not QISKIT_AVAILABLE:
        raise RuntimeError("Qiskit not available")

    # Limit size
    X_train = X_train[:200]
    X_test = X_test[:500]

    # PCA reduction
    pca = PCA(n_components=min(n_qubits, X_train.shape[1]), random_state=RNG_SEED)
    Xtr = pca.fit_transform(X_train)
    Xte = pca.transform(X_test)

    feature_map = ZZFeatureMap(feature_dimension=Xtr.shape[1], reps=1)

    backend = Aer.get_backend("aer_simulator_statevector")
    qi = QuantumInstance(backend)

    qkernel = QuantumKernel(
        feature_map=feature_map,
        quantum_instance=qi
    )

    K_test = qkernel.evaluate(x_vec=Xte, y_vec=Xtr)

    test_sim = K_test.mean(axis=1)

    mn, mx = float(test_sim.min()), float(test_sim.max())
    denom = mx - mn if mx - mn > 1e-12 else 1.0
    norm = (test_sim - mn) / denom

    return norm


# ---------------- Routes ----------------

@app.route("/", methods=["GET"])
def home():
    return "Backend is running", 200


@app.route("/upload", methods=["POST"])
def upload():
    f = request.files.get("file")
    if not f:
        return jsonify({"error": "No file uploaded"}), 400

    df = pd.read_csv(f)

    file_id = str(uuid.uuid4())
    path = os.path.join(TMP, f"{file_id}.csv")
    df.to_csv(path, index=False)

    return jsonify({
        "file_id": file_id,
        "rows": len(df),
        "cols": len(df.columns)
    })


@app.route("/run", methods=["POST"])
def run():
    body = request.json or {}
    file_id = body.get("file_id")
    mode = body.get("mode", "unsupervised")

    if not file_id:
        return jsonify({"error": "file_id required"}), 400

    path = os.path.join(TMP, f"{file_id}.csv")
    if not os.path.exists(path):
        return jsonify({"error": "file not found"}), 404

    df = pd.read_csv(path)

    X = df.select_dtypes(include=[np.number]).fillna(0).values

    if X.shape[1] == 0:
        return jsonify({"error": "no numeric features"}), 400

    # ---------- Quantum Mode ----------
    if mode == "quantum":
        try:
            scores = run_quantum_kernel_on_numeric(X, X)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

        df["_anomaly_score"] = scores

        out_name = f"{file_id}_pred_quantum.csv"
        df.to_csv(os.path.join(TMP, out_name), index=False)

        return jsonify({
            "mode": "quantum",
            "rows": len(df),
            "out_file": out_name
        })

    # ---------- Classical Fallback ----------
    iso = IsolationForest(n_estimators=150, contamination=0.01, random_state=RNG_SEED)
    iso.fit(X)
    scores = iso.decision_function(X)

    df["_anomaly_score"] = scores

    out_name = f"{file_id}_pred.csv"
    df.to_csv(os.path.join(TMP, out_name), index=False)

    return jsonify({
        "mode": "unsupervised",
        "rows": len(df),
        "out_file": out_name
    })


@app.route("/results/<file_id>", methods=["GET"])
def results(file_id):

    candidates = [
        f"{file_id}_pred_quantum.csv",
        f"{file_id}_pred.csv"
    ]

    path = None
    for c in candidates:
        p = os.path.join(TMP, c)
        if os.path.exists(p):
            path = p
            break

    if not path:
        return jsonify({"error": "file not found"}), 404

    df = pd.read_csv(path)

    scores = df["_anomaly_score"].values
    mn, mx = float(scores.min()), float(scores.max())
    denom = mx - mn if mx - mn > 1e-12 else 1.0
    norm = (scores - mn) / denom

    THRESH = 0.3

    preds = []
    confs = []

    for s in norm:
        if s < THRESH:
            preds.append("Fraud")
            conf = (THRESH - s) / THRESH
        else:
            preds.append("Normal")
            conf = (s - THRESH) / (1 - THRESH)

        confs.append(round(float(max(0.0, min(conf, 1.0))), 4))

    df["predicted"] = preds
    df["confidence"] = confs

    return jsonify({
        "rows": len(df),
        "mode_used": "quantum" if "quantum" in path else "unsupervised",
        # 🔥 ONLY CHANGE HERE — random 500 instead of first 500
        "results": df.sample(n=min(500, len(df)), random_state=RNG_SEED).to_dict(orient="records")
    })


@app.route("/download/<filename>", methods=["GET"])
def download(filename):
    path = os.path.join(TMP, filename)
    if not os.path.exists(path):
        return jsonify({"error": "file not found"}), 404
    return send_file(path, as_attachment=True)


if __name__ == "__main__":
    app.run(debug=True, port=5000)