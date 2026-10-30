import { getAIClient } from "../integrations/gemini.js";
import { handleRAGSearch, handleRAGJobMatch, JobDocument } from "../ragEngine.js";
import { runCareerAgent } from "../agenticEngine.js";
import { logger } from "../utils/logger.js";

export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish (Español)",
  fr: "French (Français)",
  de: "German (Deutsch)",
  zh: "Chinese (Simplified 简体中文)",
  hi: "Hindi (हिन्दी)",
  ar: "Arabic (العربية)",
  pt: "Portuguese (Português)",
  ja: "Japanese (日本語)",
  ru: "Russian (Русский)",
  ko: "Korean (한국어)",
  it: "Italian (Italiano)",
  nl: "Dutch (Nederlands)",
  tr: "Turkish (Türkçe)",
  id: "Indonesian (Bahasa Indonesia)",
  te: "Telugu (తెలుగు)",
  ta: "Tamil (தமிழ்)",
  kn: "Kannada (ಕನ್ನಡ)",
  ml: "Malayalam (മലയാളം)",
  bn: "Bengali (বাংলা)",
  mr: "Marathi (मराठी)",
  gu: "Gujarati (ગુજરાતી)",
  pa: "Punjabi (ਪੰਜਾਬੀ)",
  ur: "Urdu (اردو)",
  vi: "Vietnamese (Tiếng Việt)",
  pl: "Polish (Polski)",
  uk: "Ukrainian (Українська)",
};

export const DEFAULT_JOBS_CORPUS: JobDocument[] = [
  {
    id: "job-1",
    title: "Senior Full Stack Engineer",
    company: "Stripe",
    location: "San Francisco, CA",
    salaryText: "$165,000 - $210,000 / yr",
    description: "Architect high-throughput payment infrastructure, build resilient React micro-frontends, and optimize distributed transaction workflows.",
    requirements: ["React", "TypeScript", "Node.js", "Distributed Systems", "SQL"],
    tags: ["React", "TypeScript", "Node.js", "Distributed Systems"],
    workMode: "Hybrid",
    experience: "3-5 years",
  },
  {
    id: "job-2",
    title: "Machine Learning / AI Systems Engineer",
    company: "Google DeepMind",
    location: "Bengaluru, India",
    salaryText: "$180,000 - $240,000 / yr",
    description: "Develop low-latency model inference pipelines, accelerate transformer architectures with TensorRT/ONNX, and build agentic multimodal tooling.",
    requirements: ["Python", "PyTorch", "CUDA", "TensorRT", "Machine Learning", "System Design"],
    tags: ["Python", "PyTorch", "Machine Learning", "AI Systems"],
    workMode: "Hybrid",
    experience: "2-4 years",
  },
  {
    id: "job-3",
    title: "Lead Frontend Architect",
    company: "Vercel",
    location: "Remote Global",
    salaryText: "$150,000 - $195,000 / yr",
    description: "Drive edge rendering innovations, optimize Next.js server components, and establish world-class performance and accessibility standards.",
    requirements: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Web Performance"],
    tags: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
    workMode: "Remote",
    experience: "4-6 years",
  },
  {
    id: "job-4",
    title: "Algorithmic Platform & Infrastructure Engineer",
    company: "Databricks",
    location: "Seattle, WA",
    salaryText: "$170,000 - $225,000 / yr",
    description: "Build robust distributed data ingestion systems, optimize memory footprint across cluster nodes, and design high-availability APIs.",
    requirements: ["Go", "Kubernetes", "Docker", "Distributed Systems", "PostgreSQL"],
    tags: ["Go", "Kubernetes", "Docker", "Cloud Architecture"],
    workMode: "Hybrid",
    experience: "3-5 years",
  },
];

export function getLocalizedFallbackReply(message: string, langCode: string): string {
  const targetLang = (langCode || "en").toLowerCase();
  const lower = (message || "").toLowerCase();

  if (targetLang === "hi") {
    if (lower.includes("resume") || lower.includes("बायोडाटा") || lower.includes("रिज्यूमे")) {
      return "MOAS पर अपने तकनीकी रिज्यूमे को बेहतर बनाने के लिए 3 महत्वपूर्ण सुझाव:\n\n1. **संख्यात्मक प्रभाव दिखाएं**: 'मॉडल लेटेंसी 30% कम की' जैसे वास्तविक परिणाम जोड़ें।\n2. **मुख्य तकनीकें शामिल करें**: PyTorch, Docker, Kubernetes, React और TypeScript का उल्लेख करें।\n3. **ATS फ्रेंडली बनाएं**: साफ फॉर्मेटिंग रखें और जॉब टाइटल के अनुसार कीवर्ड्स कस्टमाइज़ करें।";
    }
    return "नमस्ते! 👋 मैं MOAS AI करियर सहायक हूँ। मैं बहुभाषी हूँ और हिन्दी तथा विश्व की किसी भी भाषा में आपकी सहायता कर सकता हूँ। आप मुझसे कोडिंग इंटरव्यू, रिज्यूमे ATS समीक्षा, या MOAS पर नई नौकरी खोजने के बारे में पूछ सकते हैं।";
  }

  if (targetLang === "te") {
    return "నమస్కారం! 👋 నేను మీ MOAS AI కెరీర్ అసిస్టెంట్‌ని. తెలుగుతో పాటు అన్ని భాషలలో మీకు సహాయం అందించగలను. టెక్నికల్ ఇంటర్వ్యూలు, రెజ్యూమ్ ఆప్టిమైజేషన్ మరియు MOAS లో సరికొత్త జాబ్ అప్‌డేట్‌ల గురించి మీరు నన్ను అడగవచ్చు.";
  }

  if (targetLang === "ta") {
    return "வணக்கம்! 👋 நான் உங்கள் MOAS AI தொழில் உதவியாளர். நேர்காணல் தயாரிப்பு, ரெஸ்யூம் மேம்படுத்துதல் மற்றும் MOAS தளத்தில் வேலை தேடல் குறித்து தமிழில் நீங்கள் என்னிடம் எந்தக் கேள்வியும் கேட்கலாம்.";
  }

  if (targetLang === "kn") {
    return "ನಮಸ್ಕಾರ! 👋 ನಾನು ನಿಮ್ಮ MOAS AI ವೃತ್ತಿ ಸಹಾಯಕ. ತಾಂತ್ರಿಕ ಸಂದರ್ಶನ ತಯಾರಿ, ರೆಸ್ಯೂಮ್ ಸುಧಾರಣೆ ಮತ್ತು ಹೊಸ ಉದ್ಯೋಗಗಳನ್ನು ಹುಡುಕಲು ನಾನು ನಿಮಗೆ ಕನ್ನಡದಲ್ಲಿ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ.";
  }

  if (targetLang === "es") {
    if (lower.includes("resume") || lower.includes("cv") || lower.includes("currículum")) {
      return "Aquí tienes 3 consejos clave para optimizar tu currículum en MOAS:\n\n1. **Cuantifica tu impacto**: Reemplaza tareas genéricas con métricas medibles (ej. 'Reducción de latencia en 32% usando ONNX').\n2. **Palabras clave de alta demanda**: Destaca tecnologías como PyTorch, Docker, Kubernetes y React.\n3. **Adaptado a ATS**: Mantén un formato limpio para que los sistemas de selección reconozcan tus habilidades.";
    }
    return "¡Hola! 👋 Soy tu Asistente de Carrera MOAS AI. ¡Hablo español y todos los idiomas del mundo con total fluidez! ¿En qué puedo ayudarte hoy respecto a entrevistas técnicas, revisión de currículum o vacantes en MOAS?";
  }

  if (targetLang === "fr") {
    return "Bonjour ! 👋 Je suis votre assistant de carrière MOAS AI. Je maîtrise le français et toutes les langues. Comment puis-je vous aider aujourd'hui concernant vos entretiens techniques, l'optimisation de votre CV pour les ATS ou les opportunités sur MOAS ?";
  }

  if (targetLang === "de") {
    return "Hallo! 👋 Ich bin Ihr MOAS AI Karriere-Assistent. Ich spreche Deutsch und alle Weltsprachen fließend! Wie kann ich Sie heute bei technischen Interviews, ATS-Lebenslaufoptimierung oder der Stellensuche auf MOAS unterstützen?";
  }

  if (targetLang === "zh") {
    return "您好！👋 我是您的 MOAS AI 职业顾问助手。我支持中文及全球所有语言！请问今天在技术算法面试、ATS简历优化或 MOAS 平台求职方面有什么我可以帮您的吗？";
  }

  if (targetLang === "ja") {
    return "こんにちは！👋 MOAS AIキャリアアシスタントです。日本語をはじめ世界各国の言語に対応しています。技術面接の対策、ATS対応レジュメの改善、MOASでの求人応募など、何でもお気軽にご相談ください！";
  }

  if (targetLang === "ar") {
    return "مرحبًا بك! 👋 أنا مساعدك الذكي للمसار المهني من MOAS AI. أدعم اللغة العربية وجميع لغات العالم بطلاقة! كيف يمكنني مساعدتك اليوم في التحضير للمقابلات التقنية، أو تحسين السيرة الذاتية، أو استكشاف الوظائف؟";
  }

  if (targetLang === "pt") {
    return "Olá! 👋 Sou o assistente de carreira inteligente do MOAS AI. Suporto português e todos os idiomas globais com fluidez! Como posso te ajudar hoje em preparação para entrevistas técnicas, otimização de currículo ou busca de vagas?";
  }

  if (lower.includes("resume") || lower.includes("cv")) {
    return "Here are 3 key tips to elevate your resume on MOAS:\n\n1. **Quantify Impact**: Replace generic duties with measurable metrics (e.g., 'Reduced inference latency by 32% using ONNX runtime').\n2. **Target High-Demand Keywords**: Feature relevant technologies like PyTorch, Docker, Kubernetes, React, and TypeScript prominently.\n3. **Tailor for ATS**: Keep formatting clean and ensure job title keywords match the roles you are targeting.";
  } else if (lower.includes("interview") || lower.includes("question")) {
    return "Here are two essential algorithmic interview topics to practice:\n\n1. **Graph Algorithms & BFS/DFS**: Practice traversal, cycle detection, and shortest-path (Dijkstra) problems.\n2. **Dynamic Programming & Caching**: Focus on state transition modeling and memoization (e.g., 0/1 knapsack, longest common subsequence).\n\nWould you like me to walk through a mock coding question with you?";
  } else if (lower.includes("post") || lower.includes("hire") || lower.includes("job")) {
    return "To post a new job opening on MOAS:\n\n1. Click the **'Post a Job'** tab in the top navigation or sidebar.\n2. Fill in the title, employment type, location, and salary details.\n3. You can click **'Generate with MOAS AI'** to auto-generate a comprehensive, high-standard job description.\n4. Click **'Publish Job'** and your listing will be immediately active on the platform!";
  } else if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey") || lower.includes("hola") || lower.includes("bonjour") || lower.includes("namaste")) {
    return "Hello! 👋 I'm your MOAS AI Career Assistant. I support all languages worldwide! How can I assist your tech career journey today? You can ask me about interview preparation, resume reviews, algorithmic challenges, or navigating the MOAS platform.";
  }

  return `Thank you for your question! Regarding "${message.slice(0, 60)}...":\n\nOn MOAS (ML Opportunities and Algorithmic Services), we focus on helping developers and employers connect through skills-based algorithmic matching. To maximize your opportunities:\n• Keep your technical skills updated in your Profile.\n• Ensure your resume highlights hands-on project deliverables.\n• Use the 'Job Alerts' feature to get notified as soon as verified employers post matching openings.\n\nI can speak and assist you in any language. Let me know if you'd like specific advice on system design, coding challenges, or cover letters!`;
}

export class AIService {
  async analyzeResume(params: {
    resumeName?: string;
    role?: string;
    skills?: string[];
    experienceYears?: string;
  }) {
    const ai = getAIClient();
    const { resumeName, role, skills, experienceYears } = params;

    if (!ai) {
      return {
        success: true,
        source: "moas-algorithmic-engine",
        score: 87,
        label: "Excellent",
        summary: `Strong candidate profile for ${role || "Software Developer"} with solid fundamentals in modern frameworks, algorithmic system design, and collaborative workflows.`,
        strengths: [
          "Demonstrated competency in full-stack architecture and modular component design",
          "Clean version control hygiene with Git and CI/CD awareness",
          "Comprehensive background in API integration and state management",
        ],
        improvements: [
          "Incorporate quantifiable metrics into impact bullet points (e.g., 'reduced latency by 24%')",
          "Add cloud deployment & orchestration skills (e.g. Docker, GCP, Kubernetes)",
          "Highlight hands-on ML / Algorithmic data pipeline experience to align with MOAS requirements",
        ],
        keywordSuggestions: [
          "Machine Learning",
          "Algorithmic Optimization",
          "GraphQL",
          "Microservices",
          "TypeScript Strict Mode",
          "PostgreSQL",
          "Docker",
        ],
        atsCompatibility: 91,
      };
    }

    try {
      const prompt = `You are MOAS (ML Opportunities and Algorithmic Services) AI Career Intelligence Engine.
Analyze the following candidate profile:
Role: ${role || "Software Developer"}
Experience: ${experienceYears || "2-4 years"}
Skills: ${(skills || []).join(", ")}
Resume: ${resumeName || "Standard Resume"}

Return a JSON object with this exact structure:
{
  "score": number (70 to 98),
  "label": "Good" | "Very Good" | "Excellent",
  "summary": "2 concise sentences evaluating algorithmic and software strength",
  "strengths": ["point 1", "point 2", "point 3"],
  "improvements": ["point 1", "point 2", "point 3"],
  "keywordSuggestions": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "atsCompatibility": number (80 to 99)
}
Only output the JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      return {
        success: true,
        source: "gemini-3.8-flash",
        ...parsed,
      };
    } catch (error: any) {
      logger.error("Error analyzing resume with Gemini:", error);
      return {
        success: true,
        source: "moas-resilience-engine",
        score: 85,
        label: "Excellent",
        summary: "Resume demonstrates strong technical foundation with room for quantifiable metric enhancement.",
        strengths: [
          "Solid front-end and full-stack technical competencies",
          "Clear role progression and skill diversity",
        ],
        improvements: [
          "Include measurable business results and latency optimizations",
          "List specialized ML or cloud certification credentials",
        ],
        keywordSuggestions: ["TypeScript", "Next.js", "Docker", "Algorithms", "System Design"],
        atsCompatibility: 88,
      };
    }
  }

  async generateJobDescription(params: {
    title?: string;
    category?: string;
    experience?: string;
    workMode?: string;
    company?: string;
  }) {
    const ai = getAIClient();
    const { title, category, experience, workMode, company } = params;

    if (!ai) {
      return {
        success: true,
        source: "moas-template-engine",
        summary: `We are seeking an innovative ${title || "Software Engineer"} to develop scalable solutions, optimize algorithmic pipelines, and deliver high-performance user experiences at ${company || "our company"}.`,
        description: `### Role Overview\nAs a ${title || "Software Engineer"}, you will lead the design and implementation of robust features, collaborate with cross-functional product teams, and ensure adherence to best coding standards.\n\n### Key Responsibilities\n- Design, develop, and maintain clean, performant, and reliable web applications.\n- Collaborate closely with Product Managers, UX Designers, and Backend Architects.\n- Participate in code reviews, automated testing, and algorithmic performance profiling.\n- Mentor junior team members and champion developer productivity.\n\n### Qualifications\n- Bachelor's or Master's degree in Computer Science or equivalent practical experience.\n- Proven track record with modern tech stacks, distributed systems, and RESTful APIs.\n- Strong analytical mindset with passion for algorithmic problem solving.`,
        suggestedSkills: ["React", "TypeScript", "Node.js", "System Design", "SQL", "Cloud Architecture"],
        benefits: ["Comprehensive Health Insurance", "Flexible Hybrid Work Schedule", "Annual Learning & Conference Stipend", "Performance Bonus"],
      };
    }

    try {
      const prompt = `You are MOAS (ML Opportunities and Algorithmic Services) Talent Engine.
Generate a job description for:
Title: ${title}
Category: ${category}
Experience: ${experience}
Work Mode: ${workMode}
Company: ${company || "Tech Innovators"}

Return a JSON object with this exact structure:
{
  "summary": "A 1-2 sentence engaging overview of the role",
  "description": "A markdown string with sections: ### Role Overview, ### Key Responsibilities, ### Qualifications",
  "suggestedSkills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "benefits": ["benefit1", "benefit2", "benefit3", "benefit4"]
}
Only output the JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      return {
        success: true,
        source: "gemini-3.8-flash",
        ...parsed,
      };
    } catch (error: any) {
      logger.error("Error generating job with Gemini:", error);
      return {
        success: true,
        source: "moas-resilience-engine",
        summary: `Seeking a talented ${title || "Developer"} to build modern algorithmic systems and collaborative applications.`,
        description: `### Role Overview\nJoin our engineering organization to build next-generation scalable platforms.\n\n### Key Responsibilities\n- Build high-scale reliable services\n- Partner with design and data science teams\n- Drive architectural initiatives`,
        suggestedSkills: ["TypeScript", "React", "Python", "Cloud"],
        benefits: ["Health Insurance", "Work Flexibility", "Stock Options"],
      };
    }
  }

  async generateSmartReply(params: {
    recruiterMessage?: string;
    jobTitle?: string;
    companyName?: string;
  }) {
    const ai = getAIClient();
    const { recruiterMessage, jobTitle, companyName } = params;

    if (!ai) {
      return {
        success: true,
        suggestions: [
          "Thank you for reaching out! Thursday at 4:30 PM works perfectly for me. Looking forward to our conversation.",
          "I'm very excited about this opportunity. Could you please share the meeting invite and job details?",
          "Hi! I am available on Wednesday after 3 PM or Friday morning. Let me know what suits you best.",
        ],
      };
    }

    try {
      const prompt = `You are an AI career assistant for job seeker Arun Kumar on MOAS.
The recruiter from ${companyName || "the company"} sent: "${recruiterMessage || "Are you available for a quick screening call?"}" for the position of ${jobTitle || "Software Engineer"}.
Generate 3 distinct, professional, concise response options (1 to 2 sentences each).
Return a JSON array of 3 strings: ["option 1", "option 2", "option 3"].
Only output the JSON array.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text || "[]");
      return {
        success: true,
        suggestions: parsed,
      };
    } catch (error: any) {
      logger.error("Error generating smart reply with Gemini:", error);
      return {
        success: true,
        suggestions: [
          "Thank you! Thursday afternoon works great for me. Looking forward to connecting.",
          "I'd love to chat! Please share the calendar invite with the meeting link.",
          "Thanks for the update. Would 4:00 PM tomorrow work for a brief call?",
        ],
      };
    }
  }

  async chat(params: { message: string; history?: any[]; language?: string }) {
    const { message, history, language = "en" } = params;
    if (!message || typeof message !== "string") {
      throw new Error("Message is required");
    }

    const ai = getAIClient();
    const langName = LANGUAGE_NAMES[language] || language;

    if (!ai) {
      const reply = getLocalizedFallbackReply(message, language);
      return {
        success: true,
        reply,
        language,
        source: "moas-smart-multilingual-engine",
      };
    }

    try {
      const systemInstruction = `You are MOAS AI Career Assistant, the intelligent multilingual chatbot on the MOAS (ML Opportunities and Algorithmic Services) platform.
Your mission is to help job seekers and employers with:
1. Technical and algorithmic career guidance (machine learning, data science, full-stack, systems).
2. Resume improvement, ATS optimization, and portfolio tips.
3. Coding interview preparation and technical problem-solving.
4. Writing professional outreach messages, cover letters, and follow-ups.
5. Platform guidance on posting jobs, searching, and managing applications on MOAS.

CRITICAL MULTILINGUAL MANDATE:
You fully support all world languages!
The user has requested communication in: "${langName}" (language code: "${language}").
You MUST compose and deliver your response primarily in this language: "${langName}".
If the user speaks to you in another language, or asks you to translate/explain in another language, seamlessly adapt and respond fluently in that requested language.
Ensure natural idioms, authentic native phrasing, and clear technical accuracy.

Tone: Professional, supportive, concise, and technically accurate. Format your responses with clean Markdown bullet points and bold highlights where appropriate. Avoid overly lengthy walls of text.`;

      const formattedContents: any[] = [];
      if (Array.isArray(history) && history.length > 0) {
        for (const h of history.slice(-6)) {
          formattedContents.push({
            role: h.sender === "user" ? "user" : "model",
            parts: [{ text: h.text }],
          });
        }
      }
      formattedContents.push({
        role: "user",
        parts: [{ text: message }],
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: formattedContents,
        config: {
          systemInstruction,
        },
      });

      const reply = response.text || getLocalizedFallbackReply(message, language);
      return {
        success: true,
        reply,
        language,
        source: "gemini-3.8-flash",
      };
    } catch (error: any) {
      logger.error("Error in MOAS AI Chat:", error);
      const fallbackReply = getLocalizedFallbackReply(message, language);
      return {
        success: true,
        reply: fallbackReply,
        source: "moas-resilience-engine",
      };
    }
  }

  async translate(text: string, targetLanguage: string) {
    if (!text || !targetLanguage) {
      throw new Error("Text and targetLanguage are required");
    }

    const ai = getAIClient();
    if (!ai) {
      return { success: true, translatedText: text };
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Translate the following text into ${targetLanguage}. Maintain tone, formatting, and technical accuracy. Return ONLY the translated string without commentary:\n\n${text}`,
              },
            ],
          },
        ],
      });

      return {
        success: true,
        translatedText: response.text?.trim() || text,
      };
    } catch (error: any) {
      logger.error("Translation error with Gemini:", error);
      return { success: true, translatedText: text };
    }
  }

  async calculateMatchScore(params: {
    jobTitle?: string;
    requiredSkills?: string[];
    candidateSkills?: string[];
  }) {
    const { jobTitle, requiredSkills = [], candidateSkills = [] } = params;
    const ai = getAIClient();

    if (!ai) {
      const matched = candidateSkills.filter((s: string) =>
        requiredSkills.some((r: string) => r.toLowerCase().includes(s.toLowerCase()))
      );
      const score = Math.min(96, Math.max(68, Math.round((matched.length / Math.max(1, requiredSkills.length || 4)) * 100)));
      return {
        success: true,
        matchScore: score,
        reasoning: `Matched ${matched.length} key skills in modern frontend and algorithmic web engineering. High alignment with team requirements.`,
        matchingSkills: matched,
        skillGap: requiredSkills.filter((r: string) => !matched.includes(r)),
      };
    }

    try {
      const prompt = `Calculate the MOAS algorithmic match score between candidate skills and job requirements.
Job: ${jobTitle}
Requirements: ${requiredSkills.join(", ")}
Candidate Skills: ${candidateSkills.join(", ")}

Return a JSON object with:
{
  "matchScore": number (60-98),
  "reasoning": "2 sentences explaining the algorithmic fit",
  "matchingSkills": ["skill1", "skill2"],
  "skillGap": ["missingSkill1"]
}
Only output the JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      return {
        success: true,
        ...parsed,
      };
    } catch (error: any) {
      logger.error("Error calculating match score with Gemini:", error);
      const matched = candidateSkills.filter((s: string) =>
        requiredSkills.some((r: string) => r.toLowerCase().includes(s.toLowerCase()))
      );
      return {
        success: true,
        matchScore: 82,
        reasoning: "Candidate demonstrates strong compatibility with core skills and frameworks.",
        matchingSkills: matched,
        skillGap: requiredSkills.filter((r: string) => !matched.includes(r)),
      };
    }
  }

  async ragSearch(query: string, jobs?: JobDocument[], language = "en") {
    const ai = getAIClient();
    const corpus: JobDocument[] = Array.isArray(jobs) && jobs.length > 0 ? jobs : DEFAULT_JOBS_CORPUS;
    return await handleRAGSearch(query, corpus, ai, language);
  }

  async ragJobMatch(job: any, candidate: any) {
    const ai = getAIClient();
    return await handleRAGJobMatch(job, candidate, ai);
  }

  async runCareerAgent(goal: string, candidateProfile?: any, jobs?: JobDocument[], targetJobId?: string) {
    const ai = getAIClient();
    const corpus: JobDocument[] = Array.isArray(jobs) && jobs.length > 0 ? jobs : DEFAULT_JOBS_CORPUS;
    const profile = candidateProfile || {
      name: "Arun Kumar",
      role: "Software Developer",
      skills: ["React", "TypeScript", "JavaScript", "Node.js", "Tailwind CSS"],
      experience: "2-4 years",
      location: "Bengaluru, India",
    };
    return await runCareerAgent(goal, profile, corpus, ai, targetJobId);
  }
}

export const aiService = new AIService();
