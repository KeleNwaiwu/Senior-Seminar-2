import { useNavigate, useParams, Link } from "react-router";
import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";
import { extractJSON } from "~/lib/jsonParser";

export const meta = () => ([
    { title: 'CV Pilot | Interview Prep' },
    { name: 'description', content: 'Generate tailored interview questions based on your resume' },
])

interface InterviewQuestion {
    question: string;
    category: string;
    difficulty: "easy" | "medium" | "hard";
    tips: string[];
}

const InterviewPrep = () => {
    const { auth, isLoading, kv, ai } = usePuterStore();
    const { id } = useParams();
    const navigate = useNavigate();
    const [isGenerating, setIsGenerating] = useState(false);
    const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
    const [error, setError] = useState<string>('');
    const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

    useEffect(() => {
        if(!isLoading && !auth.isAuthenticated) {
            navigate(`/auth?next=/interview-prep/${id}`);
        }
    }, [isLoading, auth.isAuthenticated, id, navigate])

    useEffect(() => {
        const generateQuestions = async () => {
            setIsGenerating(true);
            setError('');
            
            try {
                const resume = await kv.get(`resume:${id}`);
                if(!resume) {
                    setError('Resume not found');
                    setIsGenerating(false);
                    return;
                }

                const data = JSON.parse(resume);
                const feedback = data.feedback as Feedback;

                const interviewPrompt = `Based on the following resume feedback and analysis, generate 8-10 targeted interview questions that would be asked for this profile. Consider strengths, skills, and areas for improvement.

Resume Feedback:
${JSON.stringify({
    overallScore: feedback.overallScore,
    skills: feedback.skills,
    content: feedback.content,
    toneAndStyle: feedback.toneAndStyle,
    structure: feedback.structure
}, null, 2)}

Generate interview questions as a JSON array with this format, with NO markdown formatting or explanations:
[
  {
    "question": "Tell me about...",
    "category": "behavioral|technical|situational|strengths|experience",
    "difficulty": "easy|medium|hard",
    "tips": ["tip1", "tip2", "tip3"]
  }
]`;

                console.log('Generating interview questions...');
                const response = await ai.chat(interviewPrompt);
                let questionsData: InterviewQuestion[];

                if (typeof response?.message?.content === 'string') {
                    questionsData = extractJSON(response.message.content);
                } else if (Array.isArray(response?.message?.content)) {
                    const content = response.message.content[0]?.text || '';
                    questionsData = extractJSON(content);
                } else {
                    throw new Error('Invalid AI response format');
                }

                setQuestions(questionsData);
                console.log('Generated questions:', questionsData);
            } catch (err) {
                console.error('Error generating questions:', err);
                setError('Failed to generate interview questions. Please try again.');
            } finally {
                setIsGenerating(false);
            }
        };

        if (id) {
            generateQuestions();
        }
    }, [id, kv, ai]);

    const getCategoryColor = (category: string) => {
        switch(category) {
            case 'behavioral':
                return 'bg-blue-50 border-blue-200 text-blue-700';
            case 'technical':
                return 'bg-purple-50 border-purple-200 text-purple-700';
            case 'situational':
                return 'bg-orange-50 border-orange-200 text-orange-700';
            case 'strengths':
                return 'bg-green-50 border-green-200 text-green-700';
            case 'experience':
                return 'bg-pink-50 border-pink-200 text-pink-700';
            default:
                return 'bg-gray-50 border-gray-200 text-gray-700';
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch(difficulty) {
            case 'easy':
                return 'text-green-600';
            case 'medium':
                return 'text-yellow-600';
            case 'hard':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };

    return (
        <main className="!pt-0">
            <nav className="resume-nav">
                <Link to={`/resume/${id}`} className="back-button">
                    <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">Back to Resume</span>
                </Link>
            </nav>
            <div className="flex flex-row w-full">
                <section className="feedback-section w-full">
                <div className="flex flex-col gap-2 mb-8">
                    <h2 className="text-4xl !text-black font-bold">Interview Preparation</h2>
                    <p className="text-gray-600">Tailored questions based on your resume and analysis</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
                        {error}
                    </div>
                )}

                {isGenerating ? (
                    <div className="space-y-4">
                        <p className="text-gray-700 text-center">Generating personalized interview questions...</p>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse"></div>
                        </div>
                    </div>
                ) : questions.length > 0 ? (
                    <div className="flex flex-col gap-4">
                        {questions.map((q, index) => (
                            <div
                                key={index}
                                className="border rounded-lg overflow-hidden transition-all hover:shadow-md"
                            >
                                <button
                                    onClick={() => setExpandedQuestion(expandedQuestion === index ? null : index)}
                                    className="w-full p-4 bg-white hover:bg-gray-50 flex items-start gap-4 text-left"
                                >
                                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-800">{q.question}</p>
                                        <div className="flex gap-2 mt-2 flex-wrap">
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getCategoryColor(q.category)}`}>
                                                {q.category}
                                            </span>
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${getDifficultyColor(q.difficulty)}`}>
                                                {q.difficulty}
                                            </span>
                                        </div>
                                    </div>
                                    <img
                                        src={expandedQuestion === index ? "/icons/check.svg" : "/icons/warning.svg"}
                                        alt="expand"
                                        className="w-5 h-5 text-gray-400 flex-shrink-0 transition-transform"
                                        style={{
                                            transform: expandedQuestion === index ? 'rotate(180deg)' : 'rotate(0deg)',
                                            filter: 'invert(0.5)'
                                        }}
                                    />
                                </button>
                                {expandedQuestion === index && (
                                    <div className="bg-gray-50 border-t p-4 space-y-3">
                                        <div>
                                            <h4 className="font-semibold text-gray-700 mb-2">Interview Tips:</h4>
                                            <ul className="space-y-2">
                                                {q.tips.map((tip, tipIndex) => (
                                                    <li key={tipIndex} className="flex gap-2 text-gray-700">
                                                        <span className="text-blue-500 font-bold flex-shrink-0">•</span>
                                                        <span>{tip}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : !isGenerating && (
                    <p className="text-gray-600 text-center">No questions generated yet</p>
                )}

                <div className="mt-8 pt-6 border-t">
                    <p className="text-sm text-gray-500">
                        💡 Pro tip: Practice answering these questions out loud to develop confident, articulate responses for your interviews.
                    </p>
                </div>
                </section>
            </div>
        </main>
    );
};

export default InterviewPrep;
