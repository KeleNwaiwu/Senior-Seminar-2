

# AI Resume Analyzer

## Project Description

AI Resume Analyzer is a full-stack web application that evaluates resumes using a structured, algorithm-driven scoring system before generating AI-assisted feedback.

Unlike simple AI wrappers, this system does **not** upload raw resumes directly to a language model for scoring. Instead, it:

1. Parses and processes resume content algorithmically
2. Computes an ATS-style weighted score
3. Performs job matching and skill gap analysis
4. Passes structured results to an AI module for refinement and improvement suggestions

The goal is to simulate Applicant Tracking System (ATS) evaluation while maintaining transparency, deterministic scoring logic, and controlled AI integration.

---

## Core Features

* Secure user authentication
* Cloud-based resume upload and storage
* PDF-to-text processing pipeline
* Weighted ATS scoring model
* Job description matching
* Skill gap detection
* AI-assisted resume improvement
* Regenerated resume output (downloadable)

---

## User Flow

1. User signs in.
2. User uploads a resume (PDF).
3. Resume is stored in the cloud backend.
4. Text is extracted and parsed.
5. ATS score is computed using weighted criteria.
6. Skill gaps and keyword deficiencies are identified.
7. Structured results are passed to AI for feedback.
8. Improved resume version is generated.

---

## ATS Scoring Model (Simplified)

The ATS score is computed using a weighted formula:

```
ATS Score = 
0.40(Keyword Match) +
0.30(Skills Match) +
0.15(Experience Relevance) +
0.10(Formatting Quality) +
0.05(Education Match)
```

Each component is calculated using deterministic logic before AI feedback is generated.

---

## Technologies Used

* **Frontend:** JavaScript / TypeScript
* **Backend Services:** Puter.js
* **Authentication:** Puter Auth API
* **Cloud Storage:** Puter File System (fs)
* **Persistent Data:** Puter Key-Value Store (kv)
* **AI Integration:** Puter AI API
* **Document Processing:** PDF parsing and OCR pipeline

---

## Repository Structure

```
AI-Resume-Analyzer/
│
├── public/                  # Static assets
│
├── app/
│   ├── components/          # UI components
│   ├── routes/               # Page-level ROutes (Home, Upload, Results)
│   ├── utils/               # Resume parsing & scoring logic
│   ├── lib/
│   │     ├── puter.ts       # Puter backend integration (auth, fs, ai, kv)
│   │     ├── ats.ts         # ATS scoring algorithm
│   │     ├── matcher.ts     # Job matching logic
│   │     └── parser.ts      # Resume text extraction
│   │
│   └── index.ts              # Application entry point
│
├── package.json
├── README.md
└── tsconfig.json
```

This structure separates:

* UI logic
* Algorithmic processing
* Backend integrations
* AI interaction

to maintain modularity and scalability.

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ai-resume-analyzer.git
cd ai-resume-analyzer
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Ensure Puter services are properly initialized in your backend configuration file (`puter.ts`).

If environment variables are required, create a `.env` file and include necessary keys.

### 4. Start Development Server

```bash
npm run dev
```

The application should now be running locally.

---

## How to Run the Project

1. Start the development server.
2. Open the local host URL provided in the terminal.
3. Sign in using Puter authentication.
4. Upload a resume (PDF).
5. View ATS score, skill gap analysis, and AI-generated improvements.

---

## Architectural Design

The system follows a modular full-stack design:

* **Authentication Layer** – Manages user sessions
* **File System Layer** – Handles resume uploads and storage
* **Algorithm Engine** – Computes ATS scores and matching metrics
* **AI Refinement Layer** – Generates feedback using structured inputs


