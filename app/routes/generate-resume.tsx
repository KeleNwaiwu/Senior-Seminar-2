import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { usePuterStore } from "~/lib/puter";
import jsPDF from "jspdf";

export const meta = () => ([
    { title: 'CV Pilot | Generate Resume' },
    { name: 'description', content: 'Generate improved resume' },
])

const GenerateResume = () => {
    const { auth, isLoading, fs, kv, ai } = usePuterStore();
    const { id } = useParams();
    const navigate = useNavigate();
    const [generatedContent, setGeneratedContent] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(true);
    const [error, setError] = useState<string>('');
    const [originalResume, setOriginalResume] = useState<string>('');
    const [extractedName, setExtractedName] = useState<string>('');
    const [resumeMeta, setResumeMeta] = useState<{ name?: string; email?: string; lastUpdated?: string } | null>(null);

    useEffect(() => {
        if(!isLoading && !auth.isAuthenticated) {
            navigate(`/auth?next=/resume/${id}/generate`);
        }
    }, [isLoading, auth.isAuthenticated, id, navigate])

    useEffect(() => {
        const generateImprovedResume = async () => {
            try {
                setIsGenerating(true);
                setError('');

                // Get the resume data
                console.log('Fetching resume data for ID:', id);
                const resumeData = await kv.get(`resume:${id}`);
                if (!resumeData) {
                    console.error('Resume data not found for ID:', id);
                    setError('Resume data not found');
                    setIsGenerating(false);
                    return;
                }

                console.log('Resume data retrieved, parsing...');
                const data = JSON.parse(resumeData);
                console.log('Parsed resume data:', data);

                const resumeBlob = await fs.read(data.resumePath);
                if (!resumeBlob) {
                    console.error('Failed to read resume file at:', data.resumePath);
                    setError('Failed to read resume file');
                    setIsGenerating(false);
                    return;
                }

                console.log('Resume file read, extracting name...');
                // Extract name from the image using img2txt
                let extractedName = '';
                try {
                    const imageBlob = await fs.read(data.imagePath);
                    if (imageBlob) {
                        console.log('Image read, extracting text...');
                        const extractedText = await ai.img2txt(imageBlob);
                        if (extractedText) {
                            const lines = extractedText.split('\n').filter((line: string) => line.trim());
                            if (lines.length > 0) {
                                extractedName = lines[0].trim();
                                console.log('Extracted name:', extractedName);
                            }
                        }
                    }
                } catch (nameErr) {
                    console.warn('Could not extract name from image:', nameErr);
                }

                console.log('Preparing prompt...');
                // Convert PDF to text using Puter's img2txt (which works on images of text)
                // For now, we'll ask the AI to generate an improved resume based on feedback
                const feedback = data.feedback;

                if (!feedback) {
                    console.error('No feedback found in resume data');
                    setError('No feedback data available');
                    setIsGenerating(false);
                    return;
                }

                const improvePoints = [
                    ...(feedback.toneAndStyle?.tips?.filter((t: any) => t.type === 'improve') || []).map((t: any) => `- Tone & Style: ${t.tip} - ${t.explanation}`),
                    ...(feedback.content?.tips?.filter((t: any) => t.type === 'improve') || []).map((t: any) => `- Content: ${t.tip} - ${t.explanation}`),
                    ...(feedback.structure?.tips?.filter((t: any) => t.type === 'improve') || []).map((t: any) => `- Structure: ${t.tip} - ${t.explanation}`),
                    ...(feedback.skills?.tips?.filter((t: any) => t.type === 'improve') || []).map((t: any) => `- Skills: ${t.tip} - ${t.explanation}`),
                ];

                const prompt = `Based on the following feedback analysis of a resume, generate an improved resume that addresses all the improvement points. 

Feedback Summary:
- Overall Score: ${feedback.overallScore}/100
- Tone & Style Score: ${feedback.toneAndStyle?.score || 0}/100
- Content Score: ${feedback.content?.score || 0}/100
- Structure Score: ${feedback.structure?.score || 0}/100
- Skills Score: ${feedback.skills?.score || 0}/100

Areas to Improve:
${improvePoints.length > 0 ? improvePoints.join('\n') : 'No specific areas identified - maintain and enhance current strengths'}

Please generate a professional improved resume that:
1. Keeps or improves every relevant original work item
2. Builds clear sections: Summary, Experience, Education, Skills, Projects
3. Uses bullet points for responsibilities and achievements
4. Uses concrete metrics where possible (e.g., % improvements, team size, revenue impact)
5. Avoids any template instruction language such as: "If you share the exact details (names, dates, team sizes, precise metrics, and any missing project or role details), I can tailor this resume further..."
6. Is in clear, plain text format that can be directly copied and converted to PDF

Generate the resume now:`;

                console.log('Calling AI chat with prompt length:', prompt.length);
                const response = await ai.chat(prompt);
                console.log('AI response received:', response);

                if (!response) {
                    console.error('No response from AI');
                    setError('Failed to generate resume from AI - no response received');
                    setIsGenerating(false);
                    return;
                }

                console.log('Response message structure:', response.message);
                let generatedText = '';
                
                if (typeof response.message?.content === 'string') {
                    generatedText = response.message.content;
                } else if (Array.isArray(response.message?.content)) {
                    generatedText = response.message.content[0]?.text || 
                                   response.message.content[0] ||
                                   '';
                }

                console.log('Generated text length:', generatedText.length);

                if (!generatedText) {
                    console.error('No content generated - response structure:', JSON.stringify(response, null, 2));
                    setError('No content generated from AI response');
                    setIsGenerating(false);
                    return;
                }

                // Prepend the extracted name if available
                if (extractedName) {
                    generatedText = extractedName + '\n\n' + generatedText;
                    console.log('Added name to generated resume');
                }

                // Remove canned instruction sentences if present
                const blockedSentence = "If you share the exact details (names, dates, team sizes, precise metrics, and any missing project or role details), I can tailor this resume further with precise numbers and polished phrasing";
                if (generatedText.includes(blockedSentence)) {
                    generatedText = generatedText.replace(blockedSentence, '').trim();
                    console.log('Removed unwanted instruction sentence from generated text');
                }

                setExtractedName(extractedName);
                setResumeMeta({
                    name: extractedName || data.name || '',
                    email: data.email || '',
                    lastUpdated: new Date().toLocaleDateString(),
                });

                setGeneratedContent(generatedText);
                setOriginalResume(data.resumePath || 'resume');
                
                // Save the generated resume (optional, can fail without breaking functionality)
                try {
                    console.log('Saving generated resume to file system...');
                    const fileName = `improved-resume-${id}.txt`;
                    const fileBlob = new Blob([generatedText], { type: 'text/plain' });
                    await fs.write(`/improved-resumes/${fileName}`, fileBlob);
                    console.log('Resume saved successfully');
                } catch (saveErr) {
                    console.warn('Warning: Failed to save resume file, but generation succeeded:', saveErr);
                    // Don't fail the whole operation if save fails
                }

                console.log('Generation complete');
                setIsGenerating(false);
            } catch (err) {
                console.error('Error in generateImprovedResume:', err);
                const errorMsg = err instanceof Error ? err.message : 'An error occurred while generating the resume';
                console.error('Final error message:', errorMsg);
                setError(errorMsg);
                setIsGenerating(false);
            }
        };

        if (id) {
            generateImprovedResume();
        }
    }, [id, ai, fs, kv]);

    const handleDownload = () => {
        if (!generatedContent) return;

        const element = document.createElement('a');
        const file = new Blob([generatedContent], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `improved-resume-${id}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const handleDownloadPDF = () => {
        if (!generatedContent) return;

        try {
            const doc = new jsPDF();
            const pageHeight = doc.internal.pageSize.getHeight();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 16;
            const maxWidth = pageWidth - 2 * margin;
            const initialY = margin + 15;
            let yPosition = initialY;
            const lineHeight = 8; // strict spacing for readability
            const fontSize = 11;

            const personName = resumeMeta?.name || extractedName || 'Candidate Name';
            const personEmail = resumeMeta?.email || 'email@example.com';
            const lastUpdated = resumeMeta?.lastUpdated || new Date().toLocaleDateString();

            const addHeader = (pageNum: number, pageTotal: number) => {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(personName, margin, 12);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.text(`Email: ${personEmail}`, margin, 18);
                doc.text(`Updated: ${lastUpdated}`, pageWidth - margin, 18, { align: 'right' });
                doc.setLineWidth(0.2);
                doc.line(margin, 21, pageWidth - margin, 21);
                doc.setFontSize(fontSize);
                doc.setFont('helvetica', 'normal');
                doc.text(`Page ${pageNum}/${pageTotal}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
            };

            const lines = doc.splitTextToSize(generatedContent, maxWidth);

            const pages: string[][] = [];
            let currentPage: string[] = [];
            let currentY = initialY;

            for (const line of lines) {
                if (currentY + lineHeight > pageHeight - margin - 12) {
                    pages.push(currentPage);
                    currentPage = [];
                    currentY = initialY;
                }
                currentPage.push(line);
                currentY += lineHeight;
            }
            if (currentPage.length > 0) pages.push(currentPage);

            pages.forEach((pageLines, index) => {
                if (index > 0) doc.addPage();
                addHeader(index + 1, pages.length);
                let drawY = initialY;
                pageLines.forEach((line) => {
                    doc.text(line, margin, drawY);
                    drawY += lineHeight;
                });
            });

            doc.save(`improved-resume-${id}.pdf`);
        } catch (err) {
            console.error('Error generating PDF:', err);
            alert('Failed to generate PDF file');
        }
    };

    const handleDownloadAsMarkdown = () => {
        if (!generatedContent) return;

        const element = document.createElement('a');
        const file = new Blob([generatedContent], { type: 'text/markdown' });
        element.href = URL.createObjectURL(file);
        element.download = `improved-resume-${id}.md`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedContent);
    };

    return (
        <main className="!pt-0">
            <nav className="resume-nav">
                <Link to={`/resume/${id}`} className="back-button">
                    <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">Back to Resume Review</span>
                </Link>
            </nav>

            <section className="feedback-section bg-[url('/images/bg-small.svg')] bg-cover items-center justify-center">
                {isGenerating ? (
                    <div className="flex flex-col gap-4 items-center justify-center h-[100vh]">
                        <img src="/images/resume-scan-2.gif" className="w-24 h-24" />
                        <h2 className="text-2xl font-semibold">Generating your improved resume...</h2>
                        <p className="text-gray-600">Using AI to create an enhanced version based on feedback</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col gap-4 items-center justify-center h-[100vh] px-4 py-8">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl">
                            <h2 className="text-xl font-semibold text-red-800 mb-2">Error Generating Resume</h2>
                            <p className="text-red-700 mb-4 break-words whitespace-pre-wrap">{error}</p>
                            <p className="text-sm text-red-600 mb-4">
                                Check the browser console (F12) for more details about what went wrong.
                            </p>
                            <Link to={`/resume/${id}`} className="primary-button block text-center">
                                Back to Review
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 w-full px-4 py-8">
                        <h2 className="text-4xl font-bold">Your Improved Resume</h2>
                        
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleDownloadPDF}
                                className="primary-button"
                            >
                                Download as PDF
                            </button>
                            <button
                                onClick={handleDownload}
                                className="primary-button"
                            >
                                Download as .txt
                            </button>
                            <button
                                onClick={handleDownloadAsMarkdown}
                                className="primary-button"
                            >
                                Download as .md
                            </button>
                            <button
                                onClick={handleCopy}
                                className="primary-button"
                            >
                                Copy to Clipboard
                            </button>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 max-h-96 overflow-y-auto">
                            <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                                {generatedContent}
                            </pre>
                        </div>

                        <div className="flex gap-3">
                            <Link to={`/resume/${id}`} className="primary-button">
                                Back to Review
                            </Link>
                            <Link to="/" className="primary-button">
                                Upload Another Resume
                            </Link>
                        </div>
                    </div>
                )}
            </section>
        </main>
    )
}

export default GenerateResume
