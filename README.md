#Quantum Fraud Detection using Quantum Machine Learning (QML)

A Flask-based fraud detection system that combines Classical Machine Learning and Quantum Machine Learning (QML) techniques for anomaly detection on financial transaction datasets.

The project supports:

Classical anomaly detection using Isolation Forest
Experimental quantum similarity scoring using Qiskit Quantum Kernels
REST API-based backend architecture
CSV-based batch fraud analysis
Features
Upload transaction datasets using REST APIs
Fraud detection using:
Classical ML mode
Quantum ML mode
Anomaly score generation
Fraud/Normal classification
Confidence score calculation
CSV result export
Quantum kernel similarity analysis using Qiskit
Tech Stack
Backend
Flask
REST APIs
Python
Machine Learning
Scikit-learn
Isolation Forest
PCA
NumPy
Pandas
Quantum Machine Learning
Qiskit
Quantum Kernels
ZZFeatureMap
Project Architecture
Client
   |
   v
Flask REST API
   |
   +---- Upload CSV Dataset
   |
   +---- Preprocessing Pipeline
   |         |
   |         +---- Numeric Feature Selection
   |         +---- Missing Value Handling
   |         +---- PCA Dimensionality Reduction
   |
   +---- Detection Mode
             |
             +---- Classical Isolation Forest
             |
             +---- Quantum Kernel Similarity Scoring
   |
   +---- Fraud Prediction + Confidence Score
   |
   +---- JSON Response + CSV Export
API Endpoints
1. Upload Dataset
Endpoint
POST /upload
Description

Uploads a CSV transaction dataset.

Response
{
  "file_id": "generated_uuid"
}
2. Run Fraud Detection
Endpoint
POST /run
Request Body
{
  "file_id": "uuid",
  "mode": "classical"
}

or

{
  "file_id": "uuid",
  "mode": "quantum"
}
Description

Runs fraud detection using the selected mode.

3. Get Results
Endpoint
GET /results/<file_id>
Description

Returns processed fraud detection results.

Classical Machine Learning Mode

The classical pipeline uses:

Isolation Forest

Isolation Forest is an unsupervised anomaly detection algorithm.

Why Isolation Forest?
Fraud datasets are highly imbalanced
Does not require labeled fraud data
Efficient for anomaly detection
Scalable for large datasets
Working Principle
Randomly partitions data
Anomalies are easier to isolate
Suspicious transactions receive lower anomaly scores
Quantum Machine Learning Mode

The quantum pipeline uses Quantum Kernel-based Similarity Scoring.

Quantum Feature Encoding

Classical transaction vectors are encoded into quantum states using:

ZZFeatureMap

ZZFeatureMap:

Encodes feature values into quantum rotations
Introduces entanglement between qubits
Captures feature interactions
PCA Dimensionality Reduction

Quantum circuits have dimensional limitations.

PCA is applied to:

Reduce feature dimensions
Preserve important variance
Improve quantum processing feasibility
Quantum Kernel Matrix

The system computes similarity between quantum-encoded transaction states.

Workflow
Encode transactions into quantum states
Compute pairwise similarity
Build quantum kernel matrix
Generate anomaly scores

Lower similarity indicates higher anomaly probability.

Data Preprocessing

The preprocessing pipeline includes:

Numeric feature extraction
Missing value handling
NumPy array conversion
Feature engineering
PCA dimensionality reduction
Fraud Classification

The generated anomaly scores are:

Normalized between 0 and 1
Compared against a threshold
Classified as:
Fraud
Normal

Confidence scores are also generated.

Installation
Clone Repository
git clone https://github.com/nikhila2311/Quantum-Fraud-Detetcion.git
cd Quantum-Fraud-Detetcion
Create Virtual Environment
python -m venv venv
Activate Environment
Windows
venv\Scripts\activate
Linux / Mac
source venv/bin/activate
Install Dependencies
pip install -r requirements.txt
Run Application
python app.py
