import React, { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { NavigationState, Job, Application, JobAlert, Conversation, UserProfile, RegisteredUser, AppNotification } from "./types";
import { LanguageProvider } from "./context/LanguageContext";
import {
  initialJobs,
  initialApplications,
  initialJobAlerts,
  initialConversations,
  initialProfile,
} from "./data/mockData";

// Components
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";

// Views
import { LoginView } from "./components/views/LoginView";
import { RegisterView } from "./components/views/RegisterView";
import { OtpView } from "./components/views/OtpView";
import { HomeView } from "./components/views/HomeView";
import { DashboardView } from "./components/views/DashboardView";
import { FindJobsView } from "./components/views/FindJobsView";
import { PostJobView } from "./components/views/PostJobView";
import { MyApplicationsView } from "./components/views/MyApplicationsView";
import { SavedJobsView } from "./components/views/SavedJobsView";
import { JobAlertsView } from "./components/views/JobAlertsView";
import { MessagesView } from "./components/views/MessagesView";
import { ResumeCvView } from "./components/views/ResumeCvView";
import { ProfileView } from "./components/views/ProfileView";
import { SettingsView } from "./components/views/SettingsView";

// Modals
import { JobDetailsModal } from "./components/modals/JobDetailsModal";
import { CreateAlertModal } from "./components/modals/CreateAlertModal";

// Initial registered users for seamless direct login bypass
const initialRegisteredUsers: RegisteredUser[] = [
  {
    id: "MOAS-ID-84920",
    name: "Arun Kumar",
    email: "arun.kumar@email.com",
    phone: "+91 98765 43210",
    role: "Candidate",
    avatarUrl: initialProfile.avatarUrl,
    location: initialProfile.location,
    createdAt: "2024-01-15T08:30:00.000Z",
    resumes: initialProfile.resumes,
  },
  {
    id: "MOAS-ID-10482",
    name: "Kruthik Pranav",
    email: "kruthikpranav02@gmail.com",
    phone: "+91 98450 12345",
    role: "Candidate",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=faces",
    location: "Bangalore, India",
    createdAt: "2024-02-10T11:20:00.000Z",
  },
];

// Animation Variants for smooth page transitions
const pageVariants = {
  initial: {
    opacity: 0,
    y: 12,
    scale: 0.995,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.28,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.995,
    transition: {
      duration: 0.18,
      ease: [0.7, 0, 0.84, 0],
    },
  },
};

export default function App() {
  // Authentication Guard: strictly protects the application
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentNav, setCurrentNav] = useState<NavigationState>("login");
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>(initialRegisteredUsers);
  const [pendingUser, setPendingUser] = useState<RegisteredUser | null>(null);
  const [registrationNotice, setRegistrationNotice] = useState<string | undefined>(undefined);
  const [authEmail, setAuthEmail] = useState("arun.kumar@email.com");
  const [authPhone, setAuthPhone] = useState("+91 98765 43210");

  // App Data State
  const [jobs, setJobs] = useState<Job[]>(() => {
    const saved = localStorage.getItem("moas_jobs");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return initialJobs;
  });

  const [applications, setApplications] = useState<Application[]>(() => {
    const saved = localStorage.getItem("moas_applications");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return initialApplications;
  });

  const [alerts, setAlerts] = useState<JobAlert[]>(() => {
    const saved = localStorage.getItem("moas_alerts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return initialJobAlerts;
  });

  const [profileViews, setProfileViews] = useState<number>(() => {
    const saved = localStorage.getItem("moas_profile_views");
    if (saved) {
      const num = parseInt(saved, 10);
      if (!isNaN(num)) return num;
    }
    return applications.length * 2;
  });

  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("moas_user_profile");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return initialProfile;
  });

  useEffect(() => {
    localStorage.setItem("moas_jobs", JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem("moas_applications", JSON.stringify(applications));
  }, [applications]);

  useEffect(() => {
    localStorage.setItem("moas_alerts", JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem("moas_profile_views", profileViews.toString());
  }, [profileViews]);

  useEffect(() => {
    localStorage.setItem("moas_user_profile", JSON.stringify(user));
  }, [user]);

  // Synchronize initial data from Backend and Cloud Firestore Database
  const fetchDataFromBackend = useCallback(async () => {
    try {
      // 1. Fetch live jobs from Cloud Firestore
      const jobsRes = await fetch("/api/jobs");
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        if (jobsData.success && Array.isArray(jobsData.jobs) && jobsData.jobs.length > 0) {
          const mappedJobs: Job[] = jobsData.jobs.map((dbJob: any, index: number) => {
            const fallbackLogo =
              initialJobs[index % initialJobs.length]?.logo ||
              "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop";
            return {
              id: dbJob.id,
              title: dbJob.title,
              company: dbJob.company,
              logo: dbJob.logo || fallbackLogo,
              verified: dbJob.isVerified ?? true,
              location: dbJob.location,
              employmentType: (dbJob.type as any) || "Full Time",
              workMode: (dbJob.workMode as any) || "Hybrid",
              experience: dbJob.experience || "1-3 years",
              salaryMin: 80000,
              salaryMax: 160000,
              salaryText: dbJob.salaryText || dbJob.salary || "Competitive",
              postedTime: dbJob.postedDate || "Recently",
              tags: dbJob.tags || ["Machine Learning", "Algorithms"],
              description: dbJob.description || "",
              requirements: dbJob.requirements || [],
              isFeatured: index < 2,
              isNew: true,
              isSaved: false,
              matchScore: 92,
            };
          });
          setJobs(mappedJobs);
        }
      }

      // 2. Fetch live applications from Cloud Firestore
      const appsRes = await fetch("/api/applications");
      if (appsRes.ok) {
        const appsData = await appsRes.json();
        if (appsData.success && Array.isArray(appsData.applications) && appsData.applications.length > 0) {
          const mappedApps: Application[] = appsData.applications.map((app: any) => ({
            id: app.id,
            jobId: app.jobId,
            jobTitle: app.jobTitle,
            company: app.company,
            logo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop",
            location: "Bangalore, India",
            type: "Full Time",
            appliedDate: app.appliedDate || "Just now",
            status: app.status || "Applied",
          }));
          setApplications(mappedApps);
        }
      }

      // 3. Fetch registered users from backend database
      const usersRes = await fetch("/api/moas/users");
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (usersData.success && Array.isArray(usersData.users)) {
          setRegisteredUsers(usersData.users);
        }
      }
    } catch (err) {
      console.error("Backend fetch error (using cache):", err);
    }
  }, []);

  useEffect(() => {
    fetchDataFromBackend();
  }, [fetchDataFromBackend]);

  // Modals state
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);

  // Protected navigation handler
  const handleNavigate = (nav: NavigationState) => {
    // If not authenticated, restrict strictly to auth views
    if (!isAuthenticated) {
      if (nav === "register" || nav === "otp") {
        setCurrentNav(nav);
      } else {
        setCurrentNav("login");
      }
      return;
    }

    setCurrentNav(nav);
  };

  // 1. Existing User enters credentials on login: BYPASS registration and log in directly
  const handleDirectLoginSuccess = (existingUser: RegisteredUser) => {
    setUser((prev) => ({
      ...prev,
      id: existingUser.id || prev.id,
      name: existingUser.name,
      email: existingUser.email,
      phone: existingUser.phone,
      avatarUrl: existingUser.avatarUrl || prev.avatarUrl,
      location: existingUser.location || prev.location,
      resumes: existingUser.resumes && existingUser.resumes.length > 0 ? existingUser.resumes : prev.resumes,
    }));
    setAuthEmail(existingUser.email);
    setAuthPhone(existingUser.phone);
    setRegistrationNotice(undefined);
    setPendingUser(null);
    setIsAuthenticated(true);
    setCurrentNav("dashboard");
  };

  // 2. New User enters credentials: recognize they do not have an account and trigger registration
  const handleNewUserDetected = (enteredEmail: string) => {
    setAuthEmail(enteredEmail);
    setRegistrationNotice(
      `No existing account found for "${enteredEmail}". Please provide your details below to create your account and complete OTP verification.`
    );
    setCurrentNav("register");
  };

  // Manual navigation to Register
  const handleNavigateRegister = (email?: string) => {
    if (email) setAuthEmail(email);
    setRegistrationNotice(undefined);
    setCurrentNav("register");
  };

  // Submitting account creation on RegisterView -> triggers Step 3: OTP
  const handleRegisterSubmit = (data: {
    name: string;
    email: string;
    phone: string;
    role: "Candidate" | "Employer";
  }) => {
    const permanentId = `MOAS-ID-${Math.floor(10000 + Math.random() * 90000)}`;
    const newRecord: RegisteredUser = {
      id: permanentId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      avatarUrl:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=faces",
      location: "Bangalore, India",
      createdAt: new Date().toISOString(),
      resumes: [
        {
          id: `res-${Date.now()}`,
          name: `${data.name.replace(/\s+/g, "_")}_Resume.pdf`,
          size: "240 KB",
          updatedAt: "Just now",
          type: "PDF",
          isPrimary: true,
        },
      ],
    };
    setPendingUser(newRecord);
    setAuthEmail(data.email);
    setAuthPhone(data.phone);
    setCurrentNav("otp");
  };

  // 3. Verifying OTP: only after OTP is verified is the new account added, authenticated, and granted access
  const handleOtpVerifySuccess = () => {
    if (pendingUser) {
      setRegisteredUsers((prev) => [
        pendingUser,
        ...prev.filter(
          (u) => u.email.toLowerCase() !== pendingUser.email.toLowerCase()
        ),
      ]);
      setUser((prev) => ({
        ...prev,
        id: pendingUser.id,
        name: pendingUser.name,
        email: pendingUser.email,
        phone: pendingUser.phone,
        avatarUrl: pendingUser.avatarUrl || prev.avatarUrl,
        location: pendingUser.location || prev.location,
        resumes: pendingUser.resumes || prev.resumes,
      }));

      // Synchronize permanent candidate record to backend
      fetch("/api/moas/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingUser),
      }).catch(console.error);

      setPendingUser(null);
    }
    setRegistrationNotice(undefined);
    setIsAuthenticated(true);
    setCurrentNav("dashboard");
  };

  // Logout handler
  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentNav("login");
  };

  const handleToggleSaveJob = (jobId: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, isSaved: !j.isSaved } : j))
    );

    // Persist saved job to database
    fetch("/api/saved-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, jobId }),
    }).catch(console.error);
  };

  const handleJobPublished = (newJob: Job) => {
    setJobs((prev) => [newJob, ...prev]);

    // Persist new job to Cloud Firestore database
    fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: newJob.id,
        title: newJob.title,
        company: newJob.company,
        location: newJob.location,
        type: newJob.employmentType,
        experience: newJob.experience,
        salary: newJob.salaryText,
        description: newJob.description,
        requirements: newJob.requirements,
        tags: newJob.tags,
        workMode: newJob.workMode,
      }),
    }).catch(console.error);

    // Real employer job alert notification
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: `New Position at ${newJob.company}`,
      description: `${newJob.company} published "${newJob.title}" in ${newJob.location}.`,
      time: "Just now",
      type: "job",
      company: newJob.company,
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const handleApplyToJob = (
    jobId: string,
    resumeName: string,
    coverLetter: string
  ) => {
    const targetJob = jobs.find((j) => j.id === jobId);
    if (!targetJob) return;

    const newApp: Application = {
      id: `app-${Date.now()}`,
      jobId: targetJob.id,
      jobTitle: targetJob.title,
      company: targetJob.company,
      logo: targetJob.logo,
      location: targetJob.location,
      type: targetJob.employmentType,
      appliedDate: "Just now",
      status: "Applied",
    };

    setApplications((prev) => [newApp, ...prev]);
    setProfileViews((prev) => prev + 2);

    // Persist job application to Cloud Firestore database
    fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: newApp.id,
        jobId: targetJob.id,
        jobTitle: targetJob.title,
        company: targetJob.company,
        candidateId: user.id,
        candidateName: user.name,
        candidateEmail: user.email,
        resumeName,
        matchScore: targetJob.matchScore || 92,
      }),
    }).catch(console.error);

    // Real employer application update notification
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: `Application Delivered to ${targetJob.company}`,
      description: `Your application for "${targetJob.title}" was submitted directly to ${targetJob.company}.`,
      time: "Just now",
      type: "application",
      company: targetJob.company,
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const handleQuickApplySample = (count: number) => {
    if (count === 0) {
      setApplications([]);
      setProfileViews(0);
      const newNotif: AppNotification = {
        id: `notif-${Date.now()}`,
        title: "Application Pipeline Cleared",
        description: "Your applications tracker was reset to 0.",
        time: "Just now",
        type: "application",
        company: "MOAS",
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev]);
      return;
    }

    if (count === 1) {
      const targetJob = jobs[0] || initialJobs[0];
      const singleApp: Application = {
        id: `app-sample-1`,
        jobId: targetJob.id,
        jobTitle: targetJob.title,
        company: targetJob.company,
        logo: targetJob.logo,
        location: targetJob.location,
        type: targetJob.employmentType,
        appliedDate: "Just now",
        status: "Applied",
      };
      setApplications([singleApp]);
      setProfileViews(2);
      const newNotif: AppNotification = {
        id: `notif-${Date.now()}`,
        title: `1 Application Active at ${targetJob.company}`,
        description: `Your application for "${targetJob.title}" is officially logged in Applied status.`,
        time: "Just now",
        type: "application",
        company: targetJob.company,
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev]);
      return;
    }

    if (count === 20) {
      // 20 applications with realistic status distribution across all 5 stages:
      // 10 Applied, 4 Under Review, 3 Shortlisted, 2 Interview Scheduled, 1 Rejected = 20 Total!
      const statuses: Application["status"][] = [
        "Applied", "Applied", "Applied", "Applied", "Applied",
        "Applied", "Applied", "Applied", "Applied", "Applied",
        "Under Review", "Under Review", "Under Review", "Under Review",
        "Shortlisted", "Shortlisted", "Shortlisted",
        "Interview Scheduled", "Interview Scheduled",
        "Rejected",
      ];

      const sample20: Application[] = statuses.map((status, index) => {
        const job = jobs[index % jobs.length];
        return {
          id: `app-sample-${index + 1}`,
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          logo: job.logo,
          location: job.location,
          type: job.employmentType,
          appliedDate: index < 5 ? "Just now" : `${(index % 6) + 1}d ago`,
          status,
        };
      });

      setApplications(sample20);
      setProfileViews(32);
      const newNotif: AppNotification = {
        id: `notif-${Date.now()}`,
        title: "20 Active Job Applications Synced",
        description: "Live distribution updated: 10 Applied, 4 Under Review, 3 Shortlisted, 2 Interview Scheduled, 1 Rejected.",
        time: "Just now",
        type: "application",
        company: "MOAS Pipeline",
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev]);
    }
  };

  const handleUpdateApplicationStatus = (
    appId: string,
    newStatus: Application["status"]
  ) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app))
    );

    // Persist status update to Cloud Firestore database
    fetch(`/api/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    }).catch(console.error);

    const targetApp = applications.find((a) => a.id === appId);
    if (targetApp) {
      const newNotif: AppNotification = {
        id: `notif-${Date.now()}`,
        title: `Status Update: ${newStatus}`,
        description: `Your application at ${targetApp.company} is now ${newStatus}.`,
        time: "Just now",
        type: "application",
        company: targetApp.company,
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev]);
    }
  };

  const handleDeleteApplication = (appId: string) => {
    setApplications((prev) => prev.filter((a) => a.id !== appId));

    // Remove from Cloud Firestore database
    fetch(`/api/applications/${appId}`, {
      method: "DELETE",
    }).catch(console.error);
  };

  const handleSendMessage = async (
    conversationId: string,
    text: string,
    chatLanguage?: string
  ) => {
    const targetConv = conversations.find((c) => c.id === conversationId);
    const existingMessages = targetConv ? targetConv.messages : [];

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: "user" as const,
      text,
      time: "Just now",
    };

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            messages: [...conv.messages, userMsg],
            lastMessage: text,
            lastMessageTime: "Just now",
          };
        }
        return conv;
      })
    );

    // If message is in MOAS AI conversation or target is AI, request AI response
    if (
      conversationId === "conv-moas-ai" ||
      targetConv?.recruiterName?.includes("AI") ||
      targetConv?.company?.includes("MOAS")
    ) {
      setIsBotTyping(true);
      try {
        const activeLang = chatLanguage || localStorage.getItem("moas_language") || "en";
        const res = await fetch("/api/moas/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            history: [...existingMessages, userMsg],
            language: activeLang,
          }),
        });
        const data = await res.json();
        const replyText =
          data.reply ||
          "I'm here to assist you with job discovery, resume optimization, and algorithmic mock interview prep. What would you like to explore next?";

        const botMsg = {
          id: `msg-${Date.now() + 1}`,
          sender: "recruiter" as const,
          text: replyText,
          time: "Just now",
        };

        setConversations((prev) =>
          prev.map((conv) => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                messages: [...conv.messages, botMsg],
                lastMessage:
                  replyText.length > 55 ? replyText.slice(0, 55) + "..." : replyText,
                lastMessageTime: "Just now",
              };
            }
            return conv;
          })
        );
      } catch (err) {
        console.error("AI Chatbot error:", err);
        const fallbackMsg = {
          id: `msg-${Date.now() + 1}`,
          sender: "recruiter" as const,
          text: "Thank you for your question. As your MOAS Career AI, I can help you prepare for technical interviews, format your resume for ATS screening, and find top algorithmic roles. Please feel free to ask about any specific role or topic!",
          time: "Just now",
        };
        setConversations((prev) =>
          prev.map((conv) => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                messages: [...conv.messages, fallbackMsg],
                lastMessage: fallbackMsg.text.slice(0, 55) + "...",
                lastMessageTime: "Just now",
              };
            }
            return conv;
          })
        );
      } finally {
        setIsBotTyping(false);
      }
    }
  };

  const handleClearConversation = (conversationId: string) => {
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            messages: [
              {
                id: `msg-welcome-${Date.now()}`,
                sender: "recruiter",
                text: "👋 Chat refreshed! Hello! I am your MOAS AI Career Assistant. How can I assist you today with your job search, algorithmic interview preparation, or resume review?",
                time: "Just now",
              },
            ],
            lastMessage: "Chat refreshed. How can I assist you?",
            lastMessageTime: "Just now",
          };
        }
        return conv;
      })
    );
  };

  const handleToggleAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, active: !a.active } : a))
    );
  };

  const handleDeleteAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));

    // Remove from database
    fetch(`/api/alerts/${alertId}`, {
      method: "DELETE",
    }).catch(console.error);
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const handleCreateAlert = (newAlert: JobAlert) => {
    setAlerts((prev) => [newAlert, ...prev]);

    // Persist alert to database
    fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        keyword: newAlert.title,
        location: newAlert.location,
        role: newAlert.type,
        frequency: newAlert.frequency,
      }),
    }).catch(console.error);
  };

  const isAuthScreen =
    !isAuthenticated || currentNav === "login" || currentNav === "register" || currentNav === "otp";

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans antialiased selection:bg-teal-500 selection:text-white">
        {/* Top Navigation Bar: ONLY rendered when authenticated */}
        {isAuthenticated && (
          <Navbar
            currentNav={currentNav}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            user={user}
            unreadMessagesCount={conversations.reduce((acc, c) => acc + c.unreadCount, 0)}
            unreadAlertsCount={notifications.length}
            notifications={notifications}
            onClearNotifications={handleClearNotifications}
            onDataSync={fetchDataFromBackend}
          />
        )}

      {/* Main App Container */}
      <div className="flex-1 flex flex-col">
        {isAuthScreen ? (
          /* Authentication Container (Single Screen Focus, Animated Transitions) */
          <main className="flex-1 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentNav}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full flex-1 flex flex-col justify-center"
              >
                {currentNav === "login" && (
                  <LoginView
                    initialEmail={authEmail}
                    registeredUsers={registeredUsers}
                    onDirectLoginSuccess={handleDirectLoginSuccess}
                    onNewUserDetected={handleNewUserDetected}
                    onNavigateRegister={handleNavigateRegister}
                  />
                )}

                {currentNav === "register" && (
                  <RegisterView
                    initialEmail={authEmail}
                    notice={registrationNotice}
                    onRegisterSubmit={handleRegisterSubmit}
                    onNavigateLogin={() => {
                      setRegistrationNotice(undefined);
                      setCurrentNav("login");
                    }}
                  />
                )}

                {currentNav === "otp" && (
                  <OtpView
                    email={authEmail}
                    phone={authPhone}
                    onVerifySuccess={handleOtpVerifySuccess}
                    onBackToRegister={() => setCurrentNav("register")}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        ) : (
          /* Dashboard & Inner App Layout with Left Sidebar */
          <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Navigation Sidebar */}
              <div className="hidden lg:block lg:col-span-3 xl:col-span-3 sticky top-24">
                <Sidebar
                  currentNav={currentNav}
                  onNavigate={handleNavigate}
                  onLogout={handleLogout}
                  savedJobsCount={jobs.filter((j) => j.isSaved).length}
                  unreadMessagesCount={conversations.reduce(
                    (acc, c) => acc + c.unreadCount,
                    0
                  )}
                  activeAlertsCount={alerts.filter((a) => a.active).length}
                />
              </div>

              {/* Main Content Area with Smooth Animation */}
              <main className="lg:col-span-9 xl:col-span-9 min-w-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentNav}
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="w-full"
                  >
                    {currentNav === "home" && (
                      <HomeView
                        user={user}
                        jobs={jobs}
                        onNavigate={handleNavigate}
                        onSelectJob={(j) => setSelectedJob(j)}
                        onToggleSaveJob={handleToggleSaveJob}
                      />
                    )}

                    {currentNav === "dashboard" && (
                      <DashboardView
                        user={user}
                        applications={applications}
                        jobs={jobs}
                        alerts={alerts}
                        profileViews={profileViews}
                        onNavigate={handleNavigate}
                        onSelectJob={(j) => setSelectedJob(j)}
                        onToggleSaveJob={handleToggleSaveJob}
                        onUpdateUser={setUser}
                        onUpdateApplicationStatus={handleUpdateApplicationStatus}
                        onQuickApplySample={handleQuickApplySample}
                      />
                    )}

                    {currentNav === "find-jobs" && (
                      <FindJobsView
                        jobs={jobs}
                        onSelectJob={(j) => setSelectedJob(j)}
                        onToggleSaveJob={handleToggleSaveJob}
                      />
                    )}

                    {currentNav === "post-job" && (
                      <PostJobView onJobPublished={handleJobPublished} />
                    )}

                    {currentNav === "my-applications" && (
                      <MyApplicationsView
                        applications={applications}
                        onNavigate={handleNavigate}
                        onSelectApplication={(app) => {
                          const targetJob = jobs.find((j) => j.id === app.jobId);
                          if (targetJob) setSelectedJob(targetJob);
                        }}
                        onUpdateStatus={handleUpdateApplicationStatus}
                        onDeleteApplication={handleDeleteApplication}
                        onQuickApplySample={handleQuickApplySample}
                      />
                    )}

                    {currentNav === "saved-jobs" && (
                      <SavedJobsView
                        jobs={jobs}
                        onSelectJob={(j) => setSelectedJob(j)}
                        onToggleSaveJob={handleToggleSaveJob}
                        onNavigate={handleNavigate}
                      />
                    )}

                    {currentNav === "job-alerts" && (
                      <JobAlertsView
                        alerts={alerts}
                        jobs={jobs}
                        notifications={notifications}
                        onToggleAlert={handleToggleAlert}
                        onOpenCreateAlert={() => setIsAlertModalOpen(true)}
                        onDeleteAlert={handleDeleteAlert}
                      />
                    )}

                    {currentNav === "messages" && (
                      <MessagesView
                        conversations={conversations}
                        onSendMessage={handleSendMessage}
                        isBotTyping={isBotTyping}
                        onClearConversation={handleClearConversation}
                        onOpenJobDetails={(jobId) => {
                          const targetJob = jobs.find((j) => j.id === jobId);
                          if (targetJob) setSelectedJob(targetJob);
                        }}
                        onNavigate={handleNavigate}
                        jobs={jobs}
                        user={user}
                      />
                    )}

                    {currentNav === "resume-cv" && <ResumeCvView user={user} />}

                    {currentNav === "profile" && (
                      <ProfileView
                        user={user}
                        applications={applications}
                        jobs={jobs}
                        profileViews={profileViews}
                        alertsCount={alerts.length}
                        onUpdateUser={setUser}
                        onNavigate={handleNavigate}
                      />
                    )}

                    {currentNav === "settings" && <SettingsView user={user} />}
                  </motion.div>
                </AnimatePresence>
              </main>
            </div>
          </div>
        )}
      </div>

      {/* Global Interactive Modals */}
      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          user={user}
          isOpen={Boolean(selectedJob)}
          onClose={() => setSelectedJob(null)}
          onApply={handleApplyToJob}
          onToggleSave={handleToggleSaveJob}
          onOpenDirectChat={() => {
            setSelectedJob(null);
            handleNavigate("messages");
          }}
        />
      )}

      <CreateAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        onCreateAlert={handleCreateAlert}
      />
    </div>
    </LanguageProvider>
  );
}
