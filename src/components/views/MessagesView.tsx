import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Send,
  Sparkles,
  Bot,
  RotateCcw,
  Zap,
  Check,
  Briefcase,
  HelpCircle,
  ExternalLink,
  BrainCircuit,
  MessageSquare,
  Globe,
  Languages,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Copy,
  ChevronDown,
  BookOpen,
  Layers,
  ArrowRight,
  FileText,
  TrendingUp,
  CheckCircle,
  Play,
} from "lucide-react";
import { Conversation, LanguageCode, Job, UserProfile, RAGSearchResult, AgentRunResult } from "../../types";
import { useLanguage, SUPPORTED_LANGUAGES, LanguageOption } from "../../context/LanguageContext";

interface MessagesViewProps {
  conversations: Conversation[];
  onSendMessage: (conversationId: string, text: string, chatLanguage?: string) => void;
  isBotTyping?: boolean;
  onClearConversation?: (conversationId: string) => void;
  onOpenJobDetails?: (jobId: string) => void;
  onNavigate?: (nav: any) => void;
  jobs?: Job[];
  user?: UserProfile;
}

// Multilingual Quick Prompts Dictionary
const MULTILINGUAL_PROMPTS: Record<string, string[]> = {
  en: [
    "📝 Review my technical resume & give ATS tips",
    "🧠 Practice a machine learning interview question",
    "⚡ Explain Time vs Space complexity tradeoffs",
    "💼 How do I publish or search jobs on MOAS?",
  ],
  hi: [
    "📝 मेरे तकनीकी रेज़्यूमे की समीक्षा करें और ATS टिप्स दें",
    "🧠 मशीन लर्निंग इंटरव्यू के सवालों का अभ्यास कराएं",
    "⚡ टाइम बनाम स्पेस कॉम्प्लेक्सिटी विस्तार से समझाएं",
    "💼 MOAS पर नई नौकरी कैसे खोजें या पोस्ट करें?",
  ],
  te: [
    "📝 నా టెక్నికల్ రెజ్యూమ్‌ను సమీక్షించి ATS చిట్కాలు ఇవ్వండి",
    "🧠 మెషిన్ లెర్నింగ్ ఇంటర్వ్యూ ప్రశ్నను ప్రాక్టీస్ చేయండి",
    "⚡ సమయం మరియు స్పేస్ కాంప్లెక్సిటీని వివరించండి",
    "💼 MOAS లో కొత్త ఉద్యోగాన్ని ఎలా శోధించాలి?",
  ],
  ta: [
    "📝 எனது ரெஸ்யூமை ஆய்வு செய்து ATS குறிப்புகளை வழங்கவும்",
    "🧠 மெஷின் லேர்னிங் நேர்காணல் கேள்விகளைப் பயிற்சி செய்யுங்கள்",
    "⚡ நேர மற்றும் இட சிக்கலை (Time vs Space) விளக்குங்கள்",
    "💼 MOAS தளத்தில் வேலைகளை எவ்வாறு தேடுவது?",
  ],
  kn: [
    "📝 ನನ್ನ ತಾಂತ್ರಿಕ ರೆಸ್ಯೂಮ್ ಪರಿಶೀಲಿಸಿ ATS ಸಲಹೆಗಳನ್ನು ನೀಡಿ",
    "🧠 ಮೆಷಿನ್ ಲರ್ನಿಂಗ್ ಸಂದರ್ಶನ ಪ್ರಶ್ನೆಗಳನ್ನು ಅಭ್ಯಾಸ ಮಾಡಿ",
    "⚡ ಸಮಯ ಮತ್ತು ಸ್ಥಳ ಸಂಕೀರ್ಣತೆಯನ್ನು ವಿವರಿಸಿ",
    "💼 MOAS ನಲ್ಲಿ ಹೊಸ ಉದ್ಯೋಗ ಹುಡುಕುವುದು ಹೇಗೆ?",
  ],
  ml: [
    "📝 എന്റെ ടെക്നിക്കൽ റെസ്യൂമെ പരിശോധിച്ച് ATS നുറുങ്ങുകൾ നൽകുക",
    "🧠 മെഷീൻ ലേണിംഗ് ഇന്റർവ്യൂ ചോദ്യങ്ങൾ പരിശീലിക്കുക",
    "⚡ സമയം വേഴ്സസ് സ്പേസ് സങ്കീർണ്ണത വിശദീകരിക്കുക",
    "💼 MOAS-ൽ ജോലി എങ്ങനെ തിരയാം അല്ലെങ്കിൽ പോസ്റ്റ് ചെയ്യാം?",
  ],
  es: [
    "📝 Revisar mi currículum técnico y dar consejos ATS",
    "🧠 Practicar una pregunta de entrevista de machine learning",
    "⚡ Explicar compensaciones de complejidad temporal y espacial",
    "💼 ¿Cómo postular o publicar una oferta de empleo en MOAS?",
  ],
  fr: [
    "📝 Optimiser mon CV technique pour les filtres ATS",
    "🧠 Simuler un entretien technique en machine learning",
    "⚡ Expliquer le compromis complexité temps vs espace",
    "💼 Comment rechercher ou publier un emploi sur MOAS ?",
  ],
  de: [
    "📝 Meinen Lebenslauf überprüfen und ATS-Tipps geben",
    "🧠 Machine-Learning-Interviewfragen üben",
    "⚡ Zeit- und Speicherkomplexität verständlich erklären",
    "💼 Wie finde oder erstelle ich Jobs auf MOAS?",
  ],
  zh: [
    "📝 帮我优化技术简历并提供ATS筛选建议",
    "🧠 模拟机器学习算法技术面试问题",
    "⚡ 详细解析时间复杂度与空间复杂度的权衡",
    "💼 如何在MOAS平台上浏览或发布职位？",
  ],
  ja: [
    "📝 レジュメを添削してATS対策のアドバイスをください",
    "🧠 機械学習の面接質問を練習したいです",
    "⚡ 時間計算量と空間計算量のトレードオフを解説",
    "💼 MOASで求人を検索・応募する方法を教えて",
  ],
  ar: [
    "📝 مراجعة سيرتي الذاتية وتقديم نصائح لأنظمة ATS",
    "🧠 التدريب على أسئلة مقابلات تعلم الآلة والذكاء الاصطناعي",
    "⚡ شرح التعقيد الزمني والمكاني للخوارزميات",
    "💼 كيف أبحث عن وظائف أو أنشر وظيفة على MOAS؟",
  ],
  pt: [
    "📝 Revisar meu currículo técnico e dar dicas de ATS",
    "🧠 Praticar uma pergunta de entrevista de machine learning",
    "⚡ Explicar complexidade de tempo vs espaço",
    "💼 Como encontrar ou publicar vagas no MOAS?",
  ],
  ru: [
    "📝 Проверить мое резюме и дать советы для прохождения ATS",
    "🧠 Попрактиковаться в вопросах для собеседования по ML",
    "⚡ Объяснить компромисс между временной и пространственной сложностью",
    "💼 Как искать или публиковать вакансии на MOAS?",
  ],
  bn: [
    "📝 আমার প্রযুক্তিগত জীবনবৃত্তান্ত পর্যালোচনা করে ATS টিপস দিন",
    "🧠 মেশিন লার্নিং ইন্টারভিউ প্রশ্নের অনুশীলন করুন",
    "⚡ সময় বনাম স্থান জটিলতার পার্থক্য ব্যাখ্যা করুন",
    "💼 MOAS প্ল্যাটফর্মে কীভাবে চাকরি খুঁজবেন?",
  ],
  mr: [
    "📝 माझ्या तांत्रिक रेझ्युमेचे परीक्षण करा आणि ATS टिप्स द्या",
    "🧠 मशीन लर्निंग मुलाखतीच्या प्रश्नांचा सराव करा",
    "⚡ वेळ आणि जागा जटिलतेचा फरक समजावून सांगा",
    "💼 MOAS वर नोकरी कशी शोधावी किंवा पोस्ट करावी?",
  ],
  gu: [
    "📝 મારા ટેકનિકલ રેઝ્યુમીની સમીક્ષા કરો અને ATS ટિપ્સ આપો",
    "🧠 મશીન લર્નિંગ ઇન્ટરવ્યુ પ્રશ્નોનો અભ્યાસ કરો",
    "⚡ સમય વિરુદ્ધ જગ્યા જટિલતા સમજાવો",
    "💼 MOAS પર નવી નોકરી કેવી રીતે શોધવી?",
  ],
  pa: [
    "📝 ਮੇਰੇ ਤਕਨੀਕੀ ਰੈਜ਼ਿਊਮੇ ਦੀ ਸਮੀਖਿਆ ਕਰੋ ਅਤੇ ATS ਸੁਝਾਅ ਦਿਓ",
    "🧠 ਮਸ਼ੀਨ ਲਰਨਿੰਗ ਇੰਟਰਵਿਊ ਸਵਾਲਾਂ ਦਾ ਅਭਿਆਸ ਕਰੋ",
    "⚡ ਸਮਾਂ ਅਤੇ ਸਪੇਸ ਜਟਿਲਤਾ ਬਾਰੇ ਦੱਸੋ",
    "💼 MOAS 'ਤੇ ਨੌਕਰੀ ਕਿਵੇਂ ਲੱਭੀਏ?",
  ],
  ur: [
    "📝 میرے تکنیکی ریزیومے کا جائزہ لیں اور ATS ٹپس دیں",
    "🧠 مشین لرننگ انٹرویو کے سوالات کی مشق کروائیں",
    "⚡ وقت اور جگہ کی پیچیدگی کے توازن کی وضاحت کریں",
    "💼 MOAS پر ملازمت کیسے تلاش یا پوسٹ کریں؟",
  ],
};

// Popular quick selection languages for the chatbot bar
const POPULAR_CHAT_LANGS: { code: LanguageCode; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "te", label: "తెలుగు", flag: "🇮🇳" },
  { code: "ta", label: "தமிழ்", flag: "🇮🇳" },
  { code: "kn", label: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
];

export const MessagesView: React.FC<MessagesViewProps> = ({
  conversations,
  onSendMessage,
  isBotTyping = false,
  onClearConversation,
  onOpenJobDetails,
  onNavigate,
  jobs = [],
  user,
}) => {
  const { currentLanguage, t } = useLanguage();

  const [selectedConvId, setSelectedConvId] = useState<string>(
    conversations[0]?.id || "conv-moas-ai"
  );
  const [activeTab, setActiveTab] = useState<"All" | "Unread">("All");
  const [inputText, setInputText] = useState("");
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // AI Mode: "llm" (Conversational LLM) | "rag" (RAG Job Knowledge Retrieval) | "agent" (Autonomous Career Copilot)
  const [aiMode, setAiMode] = useState<"llm" | "rag" | "agent">("llm");

  // RAG Search State
  const [ragQuery, setRagQuery] = useState("");
  const [isRagLoading, setIsRagLoading] = useState(false);
  const [ragResult, setRagResult] = useState<RAGSearchResult | null>(null);

  // Agentic AI State
  const [agentGoal, setAgentGoal] = useState(
    "Autonomously find roles matching my profile, benchmark compensation, craft tailored recruiter outreach, and generate technical interview challenges"
  );
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentResult, setAgentResult] = useState<AgentRunResult | null>(null);
  const [copiedPitch, setCopiedPitch] = useState(false);

  // Chatbot specific language state
  const [chatLanguage, setChatLanguage] = useState<LanguageCode>(currentLanguage);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [langSearch, setLangSearch] = useState("");
  const [autoDetect, setAutoDetect] = useState(true);

  // Message translations & speech state
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});
  const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const currentConv =
    conversations.find((c) => c.id === selectedConvId) || conversations[0];

  // Handler for RAG Search
  const handleRunRAGSearch = async (overrideQuery?: string) => {
    const queryToUse = (overrideQuery || ragQuery || inputText).trim();
    if (!queryToUse) return;
    setIsRagLoading(true);
    try {
      const res = await fetch("/api/moas/rag-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryToUse,
          jobs: jobs.length > 0 ? jobs : undefined,
          language: chatLanguage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRagResult(data);
      }
    } catch (err) {
      console.error("RAG search error:", err);
      showToast("RAG Search failed. Please retry.");
    } finally {
      setIsRagLoading(false);
    }
  };

  // Handler for Autonomous Agent Execution
  const handleRunAgenticCopilot = async (overrideGoal?: string) => {
    const goalToUse = (overrideGoal || agentGoal).trim();
    if (!goalToUse) return;
    setIsAgentRunning(true);
    try {
      const res = await fetch("/api/moas/agent-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: goalToUse,
          candidateProfile: user
            ? {
                name: user.name,
                role: user.role,
                skills: user.skills,
                experience: user.experienceLevel,
                location: user.location,
              }
            : undefined,
          jobs: jobs.length > 0 ? jobs : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAgentResult(data);
      }
    } catch (err) {
      console.error("Agentic run error:", err);
      showToast("Autonomous agent execution failed.");
    } finally {
      setIsAgentRunning(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2500);
    showToast("Copied to clipboard!");
  };

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentConv?.messages, isBotTyping]);

  // Sync with global platform language if user changes it
  useEffect(() => {
    setChatLanguage(currentLanguage);
  }, [currentLanguage]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleSelectLanguage = (code: LanguageCode) => {
    setChatLanguage(code);
    setIsLangDropdownOpen(false);
    const selectedOption = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    showToast(`Chatbot language set to ${selectedOption?.name} ${selectedOption?.flag}`);
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !currentConv) return;
    onSendMessage(currentConv.id, inputText.trim(), chatLanguage);
    setInputText("");
  };

  const handleSendPrompt = (promptText: string) => {
    if (!currentConv) return;
    onSendMessage(currentConv.id, promptText, chatLanguage);
  };

  // Translate specific message to selected language or user's preference
  const handleTranslateMessage = async (msgId: string, text: string) => {
    if (translatedMessages[msgId]) {
      // Toggle off if already translated
      const updated = { ...translatedMessages };
      delete updated[msgId];
      setTranslatedMessages(updated);
      return;
    }

    setTranslatingMessageId(msgId);
    try {
      const activeLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === chatLanguage);
      const targetLangName = activeLangObj?.name || "English";

      const res = await fetch("/api/moas/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          targetLanguage: targetLangName,
        }),
      });
      const data = await res.json();
      if (data.success && data.translatedText) {
        setTranslatedMessages((prev) => ({
          ...prev,
          [msgId]: data.translatedText,
        }));
        showToast(`Translated to ${targetLangName}`);
      }
    } catch (err) {
      console.error("Translation error:", err);
      showToast("Unable to translate at this moment");
    } finally {
      setTranslatingMessageId(null);
    }
  };

  // Text-to-speech audio playback in target language
  const handleSpeak = (msgId: string, text: string) => {
    if (!("speechSynthesis" in window)) {
      showToast("Speech synthesis not supported in this browser");
      return;
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = chatLanguage;
    utterance.rate = 1.0;

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Voice speech-to-text recognition
  const handleToggleVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast("Voice input is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = chatLanguage;
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        showToast(`Listening in ${activeLanguageOption?.name}...`);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText((prev) => (prev ? prev + " " + transcript : transcript));
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        showToast("Voice recognition error or microphone denied");
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
      showToast("Could not access microphone");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard");
  };

  const filteredConvs = conversations.filter((c) => {
    if (activeTab === "Unread") return c.unreadCount > 0;
    return true;
  });

  const isAiAssistant =
    currentConv?.id === "conv-moas-ai" ||
    currentConv?.recruiterName?.toLowerCase().includes("ai") ||
    currentConv?.company?.includes("MOAS");

  const activeLanguageOption =
    SUPPORTED_LANGUAGES.find((l) => l.code === chatLanguage) || SUPPORTED_LANGUAGES[0];

  // Pick prompt list for active language or fallback to English
  const currentPrompts =
    MULTILINGUAL_PROMPTS[chatLanguage] || MULTILINGUAL_PROMPTS["en"];

  const filteredLanguages = SUPPORTED_LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(langSearch.toLowerCase())
  );

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden min-h-[740px] flex flex-col lg:grid lg:grid-cols-12 relative">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="absolute top-4 right-4 z-50 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Column 1: Conversations List (3.5 cols) */}
      <div className="lg:col-span-4 border-r border-slate-200/80 flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-slate-200/80 space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-teal-700" />
              <h2 className="text-base font-bold text-slate-900">Messages & AI</h2>
            </div>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
              {conversations.reduce((acc, c) => acc + c.unreadCount, 0)} Active
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("All")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeTab === "All"
                  ? "bg-teal-700 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Channels
            </button>
            <button
              onClick={() => setActiveTab("Unread")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeTab === "Unread"
                  ? "bg-teal-700 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Unread
            </button>
          </div>
        </div>

        {/* List of Conversations */}
        <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
          {filteredConvs.map((conv) => {
            const isSelected = conv.id === currentConv?.id;
            return (
              <div
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={`p-4 transition-colors cursor-pointer flex gap-3 items-start ${
                  isSelected ? "bg-teal-50/70 border-l-4 border-teal-600" : "hover:bg-white"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-teal-100/80 text-teal-800 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs border border-teal-200/50">
                  <Bot className="w-5 h-5 text-teal-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                      <span>{conv.company}</span>
                      <span className="px-1.5 py-0.2 bg-teal-100 text-teal-800 text-[10px] font-bold rounded">
                        AI
                      </span>
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      {conv.lastMessageTime}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-teal-800 truncate mt-0.5">
                    {conv.recruiterName}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-1">
                    {conv.lastMessage}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Column 2: Active Chat Window (5.5 cols) */}
      <div className="lg:col-span-5 flex flex-col justify-between border-r border-slate-200/80 bg-white min-h-[580px]">
        {currentConv ? (
          <>
            {/* Chat Top Header */}
            <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100/80 text-teal-800 flex items-center justify-center shrink-0 shadow-2xs border border-teal-200/50">
                  <Bot className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      {currentConv.recruiterName}
                    </h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Online" />
                  </div>
                  <p className="text-xs text-slate-500">
                    {currentConv.role} • {currentConv.company}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onClearConversation && (
                  <button
                    onClick={() => {
                      onClearConversation(currentConv.id);
                      setTranslatedMessages({});
                      showToast("Conversation cleared");
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-teal-700 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                    title="Clear conversation and reset context"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                )}
              </div>
            </div>

            {/* AI Architecture Selector: LLM Assistant | RAG Search | Agentic Copilot */}
            {currentConv.isBot && (
              <div className="px-4 py-2 bg-slate-100/80 border-b border-slate-200/80 flex items-center justify-between gap-2 overflow-x-auto">
                <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAiMode("llm")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      aiMode === "llm"
                        ? "bg-white text-teal-800 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>LLM Chat</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded-md font-extrabold">
                      Gemini 3.8
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAiMode("rag")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      aiMode === "rag"
                        ? "bg-white text-teal-800 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    <span>RAG Search</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-md font-extrabold">
                      Grounding
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAiMode("agent")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      aiMode === "agent"
                        ? "bg-white text-teal-800 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5 text-teal-700" />
                    <span>Agentic Copilot</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-cyan-100 text-cyan-800 rounded-md font-extrabold">
                      Autonomous
                    </span>
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    {aiMode === "llm" && "Real-time Multilingual Reasoning"}
                    {aiMode === "rag" && "Grounded Retrieval over Job Knowledge"}
                    {aiMode === "agent" && "Autonomous Multi-Step Goal Execution"}
                  </span>
                </div>
              </div>
            )}

            {/* MULTILINGUAL CHATBOT BAR: Prominent Language Selector (Active in LLM & RAG) */}
            <div className="px-4 py-2.5 bg-gradient-to-r from-teal-50/90 via-slate-50 to-teal-50/70 border-b border-teal-100/80 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-teal-700 text-white shadow-2xs">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    Chatbot Language:
                  </span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-teal-200 rounded-xl shadow-2xs text-xs font-semibold text-teal-900">
                    <span>{activeLanguageOption.flag}</span>
                    <span>{activeLanguageOption.nativeName}</span>
                    <span className="text-[11px] text-slate-500">({activeLanguageOption.name})</span>
                  </div>
                </div>

                {/* Dropdown for All 27+ Languages */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                    className="px-2.5 py-1 rounded-xl bg-white hover:bg-teal-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-teal-900 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    <Languages className="w-3.5 h-3.5 text-teal-700" />
                    <span>All Languages</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {isLangDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 text-xs">
                      <div className="p-1.5 border-b border-slate-100 mb-1">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                          <input
                            type="text"
                            value={langSearch}
                            onChange={(e) => setLangSearch(e.target.value)}
                            placeholder="Search language..."
                            className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="max-h-56 overflow-y-auto space-y-0.5">
                        {filteredLanguages.map((lang) => (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => handleSelectLanguage(lang.code)}
                            className={`w-full px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between transition-colors cursor-pointer ${
                              lang.code === chatLanguage
                                ? "bg-teal-50 text-teal-800 font-bold"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span>{lang.flag}</span>
                              <span>{lang.nativeName}</span>
                              <span className="text-[10px] text-slate-400">({lang.name})</span>
                            </span>
                            {lang.code === chatLanguage && <Check className="w-3.5 h-3.5 text-teal-700" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Language Switcher Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                <span className="text-[11px] font-medium text-slate-500 shrink-0">Quick:</span>
                {POPULAR_CHAT_LANGS.map((lang) => {
                  const isSelected = lang.code === chatLanguage;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleSelectLanguage(lang.code)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? "bg-teal-700 text-white shadow-2xs font-bold"
                          : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80"
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* MAIN PANE: Conditioned on aiMode (LLM, RAG, or Agentic Copilot) */}
            {aiMode === "llm" && (
              <>
                {/* Chat Messages Stream */}
                <div className="p-4 overflow-y-auto flex-1 space-y-4 bg-slate-50/40">
                  {currentConv.messages.map((msg) => {
                    const isMe = msg.sender === "user";
                    const isTranslated = !!translatedMessages[msg.id];
                    const displayText = isTranslated ? translatedMessages[msg.id] : msg.text;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"} group`}
                      >
                        <div
                          className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed shadow-2xs ${
                            isMe
                              ? "bg-teal-700 text-white rounded-br-xs"
                              : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs"
                          }`}
                        >
                          {displayText}

                          {/* Translation Tag if active */}
                          {isTranslated && (
                            <div className="mt-2 pt-2 border-t border-slate-100/30 flex items-center gap-1.5 text-[10px] font-semibold text-teal-600">
                              <Globe className="w-3 h-3" />
                              <span>Translated to {activeLanguageOption.name}</span>
                              <button
                                onClick={() => handleTranslateMessage(msg.id, msg.text)}
                                className="ml-auto underline text-[10px] cursor-pointer"
                              >
                                Show Original
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Action Bar Beneath Message */}
                        <div className="flex items-center gap-2 mt-1 px-1 text-[11px] text-slate-400">
                          <span>{msg.time}</span>

                          {/* Read aloud / TTS button */}
                          <button
                            onClick={() => handleSpeak(msg.id, displayText)}
                            className={`hover:text-teal-700 p-1 rounded-md transition-colors cursor-pointer ${
                              speakingMsgId === msg.id ? "text-teal-600 bg-teal-50" : ""
                            }`}
                            title={speakingMsgId === msg.id ? "Stop voice" : "Read aloud in active language"}
                          >
                            {speakingMsgId === msg.id ? (
                              <VolumeX className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Translate button */}
                          <button
                            onClick={() => handleTranslateMessage(msg.id, msg.text)}
                            disabled={translatingMessageId === msg.id}
                            className="hover:text-teal-700 p-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                            title="Translate message"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">
                              {translatingMessageId === msg.id
                                ? "Translating..."
                                : isTranslated
                                ? "Original"
                                : "Translate"}
                            </span>
                          </button>

                          {/* Copy button */}
                          <button
                            onClick={() => handleCopy(displayText)}
                            className="hover:text-teal-700 p-1 rounded-md transition-colors cursor-pointer"
                            title="Copy text"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Bot Typing Indicator */}
                  {isBotTyping && (
                    <div className="flex flex-col items-start">
                      <div className="rounded-2xl px-4 py-3 bg-white border border-slate-200/80 rounded-bl-xs flex items-center gap-2.5 shadow-2xs">
                        <Sparkles className="w-4 h-4 text-teal-600 animate-spin" />
                        <span className="text-xs text-slate-600 font-medium">
                          MOAS AI is crafting response in {activeLanguageOption.name} ({activeLanguageOption.nativeName})...
                        </span>
                        <div className="flex items-center gap-1 ml-1">
                          <span className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-bounce delay-100" />
                          <span className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-bounce delay-200" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Action Chips in Active Language */}
                <div className="p-3 bg-teal-50/50 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-900">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Suggested Prompts ({activeLanguageOption.nativeName}):</span>
                    </div>
                    <span className="text-[10px] text-teal-700 font-medium flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Auto-adapts to language
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendPrompt(prompt)}
                        className="text-left text-[11px] bg-white hover:bg-teal-100/70 border border-teal-200/80 text-slate-700 hover:text-teal-900 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs font-medium"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Input Box with Voice and Language Support */}
                <form
                  onSubmit={handleSend}
                  className="p-3 border-t border-slate-200/80 flex items-center gap-2 bg-white"
                >
                  {/* Voice Speech-to-Text Button */}
                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className={`p-2.5 rounded-xl transition-all cursor-pointer border ${
                      isListening
                        ? "bg-red-500 text-white border-red-600 animate-pulse"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                    title={isListening ? "Listening... Click to stop" : `Voice input in ${activeLanguageOption.name}`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Ask in ${activeLanguageOption.name} (${activeLanguageOption.nativeName}) or any language...`}
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim() || isBotTyping}
                    className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </form>
              </>
            )}

            {/* RAG KNOWLEDGE RETRIEVAL VIEW */}
            {aiMode === "rag" && (
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
                {/* RAG Search Bar Header */}
                <div className="p-4 bg-white border-b border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-bold text-slate-900">
                        RAG Knowledge Retrieval & Grounding
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      BM25 + TF-IDF Grounded
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={ragQuery}
                        onChange={(e) => setRagQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRunRAGSearch()}
                        placeholder="Search jobs using natural language (e.g., 'Remote React and TypeScript roles with high pay')..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRunRAGSearch()}
                      disabled={isRagLoading || !ragQuery.trim()}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {isRagLoading ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5 animate-spin" />
                          <span>Searching...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-3.5 h-3.5" />
                          <span>Retrieve</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Preset RAG Quick Queries */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <span className="text-[11px] font-semibold text-slate-400 shrink-0">Popular:</span>
                    {[
                      "Remote React & TypeScript engineering roles",
                      "Machine Learning & PyTorch production systems",
                      "Distributed Systems with Go and Kubernetes",
                      "Full-Stack Node.js and PostgreSQL positions",
                    ].map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setRagQuery(q);
                          handleRunRAGSearch(q);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-600 shrink-0 transition-colors cursor-pointer"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* RAG Results Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {isRagLoading ? (
                    <div className="p-8 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto animate-pulse border border-emerald-100">
                        <BookOpen className="w-6 h-6 animate-spin" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Retrieving & Grounding Evidence...
                      </h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                        Vectorizing job corpus, computing weighted term frequencies, and synthesizing citations with Gemini.
                      </p>
                    </div>
                  ) : ragResult ? (
                    <div className="space-y-4">
                      {/* Grounded Answer Banner */}
                      <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-2xs space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-600" />
                            <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                              Grounded AI Synthesis
                            </h4>
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Source: {ragResult.source}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                          {ragResult.groundedAnswer}
                        </p>
                      </div>

                      {/* Retrieved Documents / Job Cards */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Retrieved Corpus Evidence ({ragResult.retrievedJobs.length} Jobs)</span>
                          </h5>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Ranked by BM25 Relevance
                          </span>
                        </div>

                        {ragResult.retrievedJobs.map((chunk) => (
                          <div
                            key={chunk.id}
                            className="p-4 bg-white rounded-xl border border-slate-200/80 hover:border-emerald-300 transition-all space-y-2 shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h6 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                  <span>{chunk.jobTitle}</span>
                                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-md border border-emerald-200">
                                    {chunk.similarityScore}% Match
                                  </span>
                                </h6>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {chunk.company} • {chunk.location} • {chunk.salaryText}
                                </p>
                              </div>

                              {onOpenJobDetails && (
                                <button
                                  type="button"
                                  onClick={() => onOpenJobDetails(chunk.jobId)}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                                >
                                  <span>Deep Match</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {/* Keywords Matched */}
                            <div className="flex flex-wrap gap-1">
                              {chunk.matchedKeywords.map((kw, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-medium rounded"
                                >
                                  #{kw}
                                </span>
                              ))}
                            </div>

                            {/* Citation snippet */}
                            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic leading-relaxed">
                              "{chunk.citationSnippet}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center space-y-3 bg-white rounded-2xl border border-dashed border-slate-200">
                      <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-700">
                        Query the MOAS Verified Knowledge Corpus
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Type any job requirement or click one of the popular search prompts above to run TF-IDF and BM25 grounded retrieval.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AGENTIC COPILOT VIEW */}
            {aiMode === "agent" && (
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
                {/* Agent Prompt Header */}
                <div className="p-4 bg-white border-b border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-teal-700" />
                      <h4 className="text-xs font-bold text-slate-900">
                        Autonomous Career Copilot
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">
                      Multi-Step Autonomous Agent
                    </span>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      value={agentGoal}
                      onChange={(e) => setAgentGoal(e.target.value)}
                      rows={2}
                      placeholder="Specify your career goal for the autonomous agent..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                    />

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                        <span className="text-[11px] font-semibold text-slate-400 shrink-0">Goals:</span>
                        {[
                          "Find top fitting roles & draft outreach",
                          "Benchmark compensation & negotiation",
                          "Generate technical mock interview",
                        ].map((g, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setAgentGoal(g);
                              handleRunAgenticCopilot(g);
                            }}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-cyan-50 hover:text-cyan-800 border border-slate-200 rounded-lg text-[10px] font-medium text-slate-600 shrink-0 transition-colors cursor-pointer"
                          >
                            {g}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRunAgenticCopilot()}
                        disabled={isAgentRunning || !agentGoal.trim()}
                        className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        {isAgentRunning ? (
                          <>
                            <Sparkles className="w-3.5 h-3.5 animate-spin" />
                            <span>Executing Pipeline...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Run Agent</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Agent Execution Trace & Deliverables */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {isAgentRunning ? (
                    <div className="p-8 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto animate-pulse border border-teal-100">
                        <Bot className="w-6 h-6 animate-spin" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Autonomous Career Agent is Running...
                      </h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                        Executing 5-step autonomous loop: RAG corpus retrieval, candidate fit matrix, compensation benchmarking, recruiter pitch synthesis, and technical interview simulation.
                      </p>
                    </div>
                  ) : agentResult ? (
                    <div className="space-y-4">
                      {/* Agent Final Synthesis */}
                      <div className="p-4 bg-white rounded-2xl border border-teal-100 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-teal-600" />
                            <span>Agent Synthesis & Strategy</span>
                          </h4>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Source: {agentResult.source}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                          {agentResult.finalSynthesis}
                        </p>
                      </div>

                      {/* Actionable Artifacts */}
                      {agentResult.actionableArtifacts && (
                        <div className="space-y-3">
                          {/* Compensation Benchmark */}
                          {agentResult.actionableArtifacts.marketInsights && (
                            <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                              <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <TrendingUp className="w-4 h-4 text-emerald-600" />
                                <span>Market Compensation Benchmark</span>
                              </h5>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                  <span className="text-[10px] text-slate-400 font-semibold block">Median Salary</span>
                                  <span className="text-xs font-bold text-emerald-700">
                                    {agentResult.actionableArtifacts.marketInsights.medianSalary}
                                  </span>
                                </div>
                                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                  <span className="text-[10px] text-slate-400 font-semibold block">Market Demand</span>
                                  <span className="text-xs font-bold text-teal-700">
                                    {agentResult.actionableArtifacts.marketInsights.demandLevel}
                                  </span>
                                </div>
                                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 col-span-2 sm:col-span-1">
                                  <span className="text-[10px] text-slate-400 font-semibold block">Top Hubs</span>
                                  <span className="text-[11px] font-bold text-slate-700">
                                    {agentResult.actionableArtifacts.marketInsights.topHiringLocations.join(", ")}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Recruiter Outreach Pitch */}
                          {agentResult.actionableArtifacts.tailoredPitch && (
                            <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                              <div className="flex items-center justify-between">
                                <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                  <FileText className="w-4 h-4 text-teal-600" />
                                  <span>Agent-Synthesized Recruiter Pitch</span>
                                </h5>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(agentResult.actionableArtifacts?.tailoredPitch || "")}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  {copiedPitch ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                  <span>{copiedPitch ? "Copied" : "Copy"}</span>
                                </button>
                              </div>
                              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed whitespace-pre-wrap">
                                {agentResult.actionableArtifacts.tailoredPitch}
                              </p>
                            </div>
                          )}

                          {/* Mock Interview Questions */}
                          {agentResult.actionableArtifacts.mockQuestions && (
                            <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5">
                              <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <BrainCircuit className="w-4 h-4 text-purple-600" />
                                <span>Agent-Generated Technical Interview Challenges</span>
                              </h5>
                              <div className="space-y-2">
                                {agentResult.actionableArtifacts.mockQuestions.map((q, idx) => (
                                  <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded">
                                        {q.category}
                                      </span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-800">{q.question}</p>
                                    <p className="text-[11px] text-slate-500 italic">
                                      Tip: {q.sampleAnswerHint}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 5-Step Execution Trace */}
                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-slate-700">
                          Autonomous Execution Trace ({agentResult.steps.length} Steps Completed)
                        </h5>
                        <div className="space-y-2">
                          {agentResult.steps.map((step) => (
                            <div
                              key={step.stepNumber}
                              className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold flex items-center justify-center">
                                    {step.stepNumber}
                                  </span>
                                  <span>{step.title}</span>
                                </span>
                                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                                  tool: {step.tool} ({step.durationMs}ms)
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 italic pl-5">
                                Thought: {step.thought}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center space-y-3 bg-white rounded-2xl border border-dashed border-slate-200">
                      <Bot className="w-8 h-8 text-slate-300 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-700">
                        Autonomous Career Copilot Standing By
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Click "Run Agent" or choose one of the predefined goals to trigger the 5-step autonomous agent workflow.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
            Select a conversation to start chatting
          </div>
        )}
      </div>

      {/* Column 3: Right Details Sidebar (3 cols) */}
      <div className="lg:col-span-3 p-5 bg-slate-50/50 flex flex-col justify-between space-y-6">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            AI Architecture & Engine
          </h3>

          {/* AI Architecture 3-Tier Cards */}
          <div className="space-y-3">
            {/* Tier 1: LLM Engine */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              aiMode === "llm" ? "bg-teal-50/70 border-teal-300 shadow-2xs" : "bg-white border-slate-200/80"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <h4 className="text-xs font-bold text-slate-900">LLM Reasoning</h4>
                </div>
                <span className="px-1.5 py-0.2 bg-teal-100 text-teal-800 text-[10px] font-bold rounded">
                  Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Gemini 3.8 Flash • Real-time multilingual ATS guidance & chat
              </p>
            </div>

            {/* Tier 2: RAG Corpus */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              aiMode === "rag" ? "bg-emerald-50/70 border-emerald-300 shadow-2xs" : "bg-white border-slate-200/80"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-900">RAG Job Corpus</h4>
                </div>
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                  BM25 + Vector
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Grounded semantic retrieval across verified job database
              </p>
            </div>

            {/* Tier 3: Agentic Copilot */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              aiMode === "agent" ? "bg-cyan-50/70 border-cyan-300 shadow-2xs" : "bg-white border-slate-200/80"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-teal-700" />
                  <h4 className="text-xs font-bold text-slate-900">Agentic Orchestrator</h4>
                </div>
                <span className="px-1.5 py-0.2 bg-cyan-100 text-cyan-800 text-[10px] font-bold rounded">
                  Autonomous
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                5-step autonomous chain: RAG, fit scoring, salary, pitch & mock
              </p>
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 space-y-2.5 text-xs">
            <h4 className="text-xs font-bold text-slate-900">Engine Telemetry</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Active Language:</span>
                <span className="font-semibold text-teal-800 flex items-center gap-1">
                  <span>{activeLanguageOption.flag}</span>
                  <span>{activeLanguageOption.nativeName}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Jobs In Corpus:</span>
                <span className="font-semibold text-slate-800">{jobs.length || 24} Verified</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Voice Synthesis:</span>
                <span className="font-semibold text-emerald-700">Enabled 🔊</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Speech-to-Text:</span>
                <span className="font-semibold text-emerald-700">Active 🎙️</span>
              </div>
            </div>
          </div>

          {/* Quick Platform Shortcuts */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Quick Shortcuts
            </h4>

            {onNavigate && (
              <>
                <button
                  onClick={() => onNavigate("find-jobs")}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:text-teal-900 hover:bg-white rounded-xl border border-slate-200/70 transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-teal-600" />
                    Browse Fresh Jobs
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  onClick={() => onNavigate("post-job")}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:text-teal-900 hover:bg-white rounded-xl border border-slate-200/70 transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    Publish a Job
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Security and Privacy badge */}
        <div className="p-3 bg-teal-50/60 rounded-2xl border border-teal-100 text-[11px] text-teal-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-teal-700" />
            Multilingual & Private
          </p>
          <p className="text-slate-600 leading-normal">
            MOAS AI understands all languages naturally. Conversations are encrypted and private.
          </p>
        </div>
      </div>
    </div>
  );
};
