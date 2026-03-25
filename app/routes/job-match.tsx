import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { usePuterStore } from "~/lib/puter";
import { extractJSON } from "~/lib/jsonParser";

export const meta = () => ([
    { title: 'CV Pilot | Job Match Analysis' },
    { name: 'description', content: 'Analyze resume match against job description' },
])

const JobMatch = () => {
    const { auth, isLoading, fs, kv, ai } = usePuterStore();
    const { id } = useParams();
    const navigate = useNavigate();
    const [jobDescription, setJobDescription] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        if(!isLoading && !auth.isAuthenticated) {
            navigate(`/auth?next=/job-match/${id}`);
        }
    }, [isLoading, auth.isAuthenticated, id, navigate])

    const handleAnalyze = async () => {
        if (!jobDescription.trim()) {
            setError('Please enter a job description');
            return;
        }

        setIsAnalyzing(true);
        setError('');
        setAnalysis(null);

        try {
            const jobAnalysisPrompt = `Analyze this job description and extract key information:

1. Required skills (technical and soft skills)
2. Key qualifications and experience requirements
3. Important keywords for ATS
4. Job level (entry, mid, senior)
5. Industry/domain focus

Job Description:
${jobDescription}

Format response as JSON with no markdown formatting:
{
  "skills": ["skill1", "skill2"],
  "qualifications": ["qual1", "qual2"],
  "keywords": ["keyword1", "keyword2"],
  "level": "mid|senior|entry",
  "industry": "industry name",
  "requirements": ["req1", "req2"]
}`;

            console.log('Analyzing job description...');
            const jobAnalysis = await ai.chat(jobAnalysisPrompt);
            let jobData;

            if (typeof jobAnalysis?.message?.content === 'string') {
                jobData = extractJSON(jobAnalysis.message.content);
            } else if (Array.isArray(jobAnalysis?.message?.content)) {
                const content = jobAnalysis.message.content[0]?.text || '';
                jobData = extractJSON(content);
            } else {
                throw new Error('Invalid AI response format');
            }

            console.log('Job analysis result:', jobData);

            const comparisonPrompt = `Compare this resume against job requirements and provide analysis:

Job Requirements:
${JSON.stringify(jobData, null, 2)}

Respond with ONLY this JSON format, no markdown or extra text:
{
  "matchScore": 75,
  "strengths": ["strength1", "strength2"],
  "gaps": ["gap1", "gap2"],
  "missingSkills": ["skill1", "skill2"],
  "tailoringSuggestions": ["suggestion1", "suggestion2"]
}`;

            console.log('Comparing with resume...');
            const comparison = await ai.chat(comparisonPrompt);
            let comparisonData;

            if (typeof comparison?.message?.content === 'string') {
                comparisonData = extractJSON(comparison.message.content);
            } else if (Array.isArray(comparison?.message?.content)) {
                const content = comparison.message.content[0]?.text || '';
                comparisonData = extractJSON(content);
            } else {
                throw new Error('Invalid AI response format');
            }

            console.log('Comparison result:', comparisonData);

            setAnalysis({
                jobData,
                comparison: comparisonData,
                jobDescription
            });

        } catch (err) {
            console.error('Error in job analysis:', err);
            const errorMsg = err instanceof Error ? err.message : 'An error occurred while analyzing the job description';
            
            if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('connect')) {
                setError('Unable to connect to AI service. Please try again in a moment.');
            } else {
                setError(errorMsg);
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getMatchScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-50';
        if (score >= 60) return 'text-yellow-600 bg-yellow-50';
        return 'text-red-600 bg-red-50';
    };

    const getMatchScoreLabel = (score: number) => {
        if (score >= 80) return 'Excellent Match';
        if (score >= 60) return 'Good Match';
        if (score >= 40) return 'Fair Match';
        return 'Poor Match';
    };

    return (
        <main className="!pt-0">
            <nav className="resume-nav">
                <Link to={`/resume/${id}`} className="back-button">
                    <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">Back to Resume Review</span>
                </Link>
            </nav>

            <section className="full-width-section bg-[url('/images/bg-small.svg')] bg-cover">
                <div className="flex flex-col gap-6 w-full">
                    <h2 className="text-4xl font-bold">Job Description Match Analysis</h2>

                    {!analysis && (
                        <div className="flex flex-col gap-4">
                            <div className="form-div">
                                <label htmlFor="job-description">Job Description</label>
                                <textarea
                                    id="job-description"
                                    rows={12}
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                    placeholder="Paste the job description here..."
                                    className="w-full p-4 inset-shadow rounded-2xl focus:outline-none bg-white resize-vertical"
                                />
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-red-700">{error}</p>
                                </div>
                            )}

                            <button
                                onClick={handleAnalyze}
                                disabled={isAnalyzing || !jobDescription.trim()}
                                className="primary-button disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isAnalyzing ? 'Analyzing...' : 'Analyze Job Match'}
                            </button>
                        </div>
                    )}

                    {isAnalyzing && (
                        <div className="flex flex-col gap-4 items-center justify-center py-12">
                            <img src="/images/resume-scan-2.gif" className="w-24 h-24" />
                            <h3 className="text-2xl font-semibold">Analyzing job description...</h3>
                            <p className="text-gray-600">Comparing your resume against job requirements</p>
                        </div>
                    )}

                    {analysis && (
                        <div className="flex flex-col gap-6">
                            {/* Match Score */}
                            <div className="bg-white rounded-lg p-6 border border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-2xl font-bold">Job Match Score</h3>
                                    <div className={`px-4 py-2 rounded-full text-lg font-semibold ${getMatchScoreColor(analysis.comparison.matchScore)}`}>
                                        {analysis.comparison.matchScore}/100 - {getMatchScoreLabel(analysis.comparison.matchScore)}
                                    </div>
                                </div>

                                <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                                    <div
                                        className={`h-4 rounded-full transition-all duration-500 ${
                                            analysis.comparison.matchScore >= 80 ? 'bg-green-500' :
                                            analysis.comparison.matchScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${analysis.comparison.matchScore}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Job Requirements */}
                            <div className="bg-white rounded-lg p-6 border border-gray-200">
                                <h3 className="text-xl font-bold mb-4">Job Requirements</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="font-semibold text-gray-700 mb-2">Required Skills</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {analysis.jobData.skills?.map((skill: string, index: number) => (
                                                <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-700 mb-2">Key Keywords</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {analysis.jobData.keywords?.map((keyword: string, index: number) => (
                                                <span key={index} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                                                    {keyword}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Strengths */}
                            {analysis.comparison.strengths && analysis.comparison.strengths.length > 0 && (
                                <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                                    <h3 className="text-xl font-bold text-green-800 mb-4">Your Strengths</h3>
                                    <ul className="space-y-2">
                                        {analysis.comparison.strengths.map((strength: string, index: number) => (
                                            <li key={index} className="flex items-start gap-2">
                                                <span className="text-green-600 mt-1">✓</span>
                                                <span className="text-green-700">{strength}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Gaps */}
                            {analysis.comparison.gaps && analysis.comparison.gaps.length > 0 && (
                                <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
                                    <h3 className="text-xl font-bold text-yellow-800 mb-4">Areas to Address</h3>
                                    <ul className="space-y-2">
                                        {analysis.comparison.gaps.map((gap: string, index: number) => (
                                            <li key={index} className="flex items-start gap-2">
                                                <span className="text-yellow-600 mt-1">⚠</span>
                                                <span className="text-yellow-700">{gap}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Missing Skills */}
                            {analysis.comparison.missingSkills && analysis.comparison.missingSkills.length > 0 && (
                                <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                                    <h3 className="text-xl font-bold text-red-800 mb-4">Missing Skills</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.comparison.missingSkills.map((skill: string, index: number) => (
                                            <span key={index} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tailoring Suggestions */}
                            {analysis.comparison.tailoringSuggestions && analysis.comparison.tailoringSuggestions.length > 0 && (
                                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                                    <h3 className="text-xl font-bold text-blue-800 mb-4">Tailoring Suggestions</h3>
                                    <ul className="space-y-3">
                                        {analysis.comparison.tailoringSuggestions.map((suggestion: string, index: number) => (
                                            <li key={index} className="flex items-start gap-2">
                                                <span className="text-blue-600 font-bold mt-1">{index + 1}.</span>
                                                <span className="text-blue-700">{suggestion}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 flex-wrap">
                                <Link to={`/resume/${id}/generate`} className="primary-button">
                                    Generate Optimized Resume
                                </Link>
                                <button
                                    onClick={() => {
                                        setAnalysis(null);
                                        setJobDescription('');
                                    }}
                                    className="primary-button"
                                >
                                    Analyze Another Job
                                </button>
                                <Link to={`/resume/${id}`} className="primary-button">
                                    Back to Review
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </main>
    )
}

export default JobMatch
