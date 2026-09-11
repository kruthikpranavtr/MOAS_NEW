import React, { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { NavigationState, Job, Application, JobAlert, Conversation, UserProfile, RegisteredUser, AppNotification, Company, CompanyRating, ProfileViewEvent } from "./types";
import { LanguageProvider } from "./context/LanguageContext";
import {
  initialJobs,
  initialApplications,
  initialJobAlerts,
  initialConversations,
  initialProfile,
  initialCompanies,
} from "./data/mockData";

// Components
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";

// Views
import { LoginView } from "./components/views/LoginView";
import { RegisterView, RegisterFormData } from "./components/views/RegisterView";
import { OtpView } from "./components/views/OtpView";
import { HomeView } from "./components/views/HomeView";
import { DashboardView } from "./components/views/DashboardView";
import { EmployerDashboardView } from "./components/views/EmployerDashboardView";
import { FindJobsView } from "./components/views/FindJobsView";
import { CompaniesView } from "./components/views/CompaniesView";
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
import { RateCompanyModal } from "./components/modals/RateCompanyModal";
import { LiveProfileViewsModal } from "./components/modals/LiveProfileViewsModal";

// Initial registered users list - empty for clean user registration & testing
const initialRegisteredUsers: RegisteredUser[] = [];

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
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>(() => {
    const saved = localStorage.getItem("moas_registered_users");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out legacy hardcoded test accounts
          const testUsernames = new Set(["arunkumar", "techcorp_hr"]);
          const testIds = new Set(["MOAS-ID-84920", "MOAS-ID-10482", "MOAS-ID-10824", "MOAS-ID-30941", "MOAS-ID-55019"]);
          return parsed.filter(
            (u: RegisteredUser) =>
              !testUsernames.has(u.username?.toLowerCase() || "") &&
              !testIds.has(u.id) &&
              u.email !== "arun.kumar@email.com" &&
              u.email !== "talent@techcorp.io" &&
              u.email !== "sarah.jenkins@techcorp.io"
          );
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });
  const [pendingUser, setPendingUser] = useState<RegisteredUser | null>(null);
  const [registrationNotice, setRegistrationNotice] = useState<string | undefined>(undefined);
  const [authEmail, setAuthEmail] = useState("");
  const [authPhone, setAuthPhone] = useState("");

  useEffect(() => {
    localStorage.setItem("moas_registered_users", JSON.stringify(registeredUsers));
  }, [registeredUsers]);

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
    return 0;
  });
  const [profileViewEvents, setProfileViewEvents] = useState<ProfileViewEvent[]>([]);
  const [isLiveViewsModalOpen, setIsLiveViewsModalOpen] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = localStorage.getItem("moas_companies");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return initialCompanies;
  });
  const [companyRatings, setCompanyRatings] = useState<CompanyRating[]>([]);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [targetRatingCompany, setTargetRatingCompany] = useState("");

  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("moas_user_profile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          parsed.email !== "arun.kumar@email.com" &&
          parsed.id !== "MOAS-ID-84920" &&
          parsed.username !== "arunkumar" &&
          parsed.name !== "Arun Kumar"
        ) {
          return parsed;
        }
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

  useEffect(() => {
    localStorage.setItem("moas_companies", JSON.stringify(companies));
  }, [companies]);

  // Resilient JSON fetch helper with retry for cold-start resilience
  const safeFetchJson = async <T,>(url: string, retries = 2, delayMs = 600): Promise<T | null> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          return data as T;
        }
      } catch (err: any) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        } else {
          // Graceful fallback to local cache without crashing the UI or polluting error logs
          console.warn(`[MOAS Sync] Network fetch for ${url} currently using local cache.`);
        }
      }
    }
    return null;
  };

  // Synchronize initial data from Backend and Cloud Firestore Database
  const fetchDataFromBackend = useCallback(async () => {
    try {
      // Execute fetches in parallel for fast initial load
      const [jobsData, appsData, usersData, compData, ratingsData, viewsData] = await Promise.all([
        safeFetchJson<{ success: boolean; jobs?: any[] }>("/api/jobs"),
        safeFetchJson<{ success: boolean; applications?: any[] }>("/api/applications"),
        safeFetchJson<{ success: boolean; users?: any[] }>("/api/moas/users"),
        safeFetchJson<{ success: boolean; companies?: any[] }>("/api/moas/top-companies"),
        safeFetchJson<{ success: boolean; ratings?: any[] }>("/api/moas/ratings"),
        safeFetchJson<{ success: boolean; count: number; views?: any[] }>("/api/moas/profile-views"),
      ]);

      // 1. Live jobs
      if (jobsData?.success && Array.isArray(jobsData.jobs) && jobsData.jobs.length > 0) {
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

      // 2. Applications
      if (appsData?.success && Array.isArray(appsData.applications) && appsData.applications.length > 0) {
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

      // 3. Registered users
      if (usersData?.success && Array.isArray(usersData.users)) {
        const testUsernames = new Set(["arunkumar"]);
        const filtered = usersData.users.filter(
          (u: any) => !testUsernames.has(u.username?.toLowerCase() || "")
        );
        setRegisteredUsers((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newFromBackend = filtered.filter((u: any) => !existingIds.has(u.id));
          return [...prev, ...newFromBackend];
        });
      }

      // 4. Companies & Ratings
      if (compData?.success && Array.isArray(compData.companies) && compData.companies.length > 0) {
        setCompanies(compData.companies);
      }

      if (ratingsData?.success && Array.isArray(ratingsData.ratings)) {
        setCompanyRatings(ratingsData.ratings);
      }

      // 5. Live profile views
      if (viewsData?.success) {
        setProfileViews(viewsData.count);
        if (Array.isArray(viewsData.views)) {
          setProfileViewEvents(viewsData.views);
        }
      }
    } catch (err: any) {
      console.warn("[MOAS Sync] Background sync note:", err?.message || err);
    }
  }, []);

  useEffect(() => {
    fetchDataFromBackend();
  }, [fetchDataFromBackend]);

  // Periodic real-time live sync for recruiter profile views
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const viewsRes = await fetch("/api/moas/profile-views");
        if (viewsRes.ok) {
          const viewsData = await viewsRes.json();
          if (viewsData.success) {
            setProfileViews(viewsData.count);
            if (Array.isArray(viewsData.views)) {
              setProfileViewEvents(viewsData.views);
            }
          }
        }
      } catch (e) {
        // silent background sync
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Live Profile Views Interactive Handlers
  const handleSimulateLiveProfileView = async (companyName?: string) => {
    try {
      const targetCompany = companyName || "Anthropic AI";
      const compObj = companies.find(
        (c) => c.name.toLowerCase() === targetCompany.toLowerCase()
      );

      const res = await fetch("/api/moas/profile-views/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id || "candidate-current",
          viewerType: "Recruiter",
          viewerName: `Talent Partner (${targetCompany.split(" ")[0]})`,
          viewerCompany: targetCompany,
          viewerRole: "Senior Technical Talent Acquisition",
          viewerAvatar:
            compObj?.logo ||
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
          source:
            applications.length > 0
              ? `Application Review (${applications[0].jobTitle})`
              : "Direct MOAS Candidate Discovery",
          isVerifiedRecruiter: true,
          durationSeconds: Math.floor(Math.random() * 90) + 40,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.view) {
          setProfileViewEvents((prev) => [data.view, ...prev]);
          setProfileViews((prev) => prev + 1);

          // Add live system alert notification
          const newNotif: AppNotification = {
            id: `notif-view-${Date.now()}`,
            title: `Live Recruiter Inspection: ${data.view.viewerCompany}`,
            description: `${data.view.viewerName} inspected your verified candidate profile via ${data.view.source}.`,
            time: "Just now",
            type: "system",
            read: false,
          };
          setNotifications((prev) => [newNotif, ...prev]);
        }
      }
    } catch (err) {
      console.error("Failed to record simulated view:", err);
    }
  };

  const handleResetProfileViews = async () => {
    try {
      const res = await fetch("/api/moas/profile-views/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id || undefined }),
      });
      if (res.ok) {
        setProfileViews(0);
        setProfileViewEvents([]);
        localStorage.removeItem("moas_profile_views");
      }
    } catch (err) {
      console.error("Failed to reset profile views:", err);
    }
  };

  const handleEmployerRecordCandidateView = async (
    candidateId: string,
    candName: string,
    roleTitle: string
  ) => {
    try {
      await fetch("/api/moas/profile-views/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: candidateId,
          viewerType: "Employer",
          viewerName: user.name || "Verified Enterprise Recruiter",
          viewerCompany: user.companyName || "Verified Tech Employer",
          viewerRole: "Hiring Manager & Talent Lead",
          viewerAvatar: user.avatarUrl,
          source: `Candidate Review (${roleTitle || "Applicant Pipeline"})`,
          isVerifiedRecruiter: true,
          durationSeconds: 110,
        }),
      });
      fetchDataFromBackend();
    } catch (e) {
      console.error("Employer candidate view record error:", e);
    }
  };

  // Rating Modal Handlers
  const handleOpenRateModal = (companyName?: string) => {
    setTargetRatingCompany(companyName || (companies[0]?.name ?? "Anthropic AI"));
    setIsRateModalOpen(true);
  };

  const handleCompanyRatingSubmitted = (newRating: CompanyRating) => {
    setCompanyRatings((prev) => [newRating, ...prev]);

    // Recalculate and update company record locally
    setCompanies((prev) =>
      prev.map((c) => {
        if (c.name.toLowerCase() === newRating.companyName.toLowerCase()) {
          const currentCount = parseInt(c.reviewsCount.replace(/\D/g, ""), 10) || 100;
          const newCount = currentCount + 1;
          const newAvg = Number(((c.rating * currentCount + newRating.rating) / newCount).toFixed(1));
          return {
            ...c,
            rating: newAvg,
            reviewsCount: `${newCount}`,
            cultureRating: newRating.cultureRating
              ? Number((((c.cultureRating || c.rating) * currentCount + newRating.cultureRating) / newCount).toFixed(1))
              : c.cultureRating,
            workLifeRating: newRating.workLifeRating
              ? Number((((c.workLifeRating || c.rating) * currentCount + newRating.workLifeRating) / newCount).toFixed(1))
              : c.workLifeRating,
            growthRating: newRating.growthRating
              ? Number((((c.growthRating || c.rating) * currentCount + newRating.growthRating) / newCount).toFixed(1))
              : c.growthRating,
            compensationRating: newRating.compensationRating
              ? Number((((c.compensationRating || c.rating) * currentCount + newRating.compensationRating) / newCount).toFixed(1))
              : c.compensationRating,
          };
        }
        return c;
      })
    );

    // Add alert notification
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: `Review Published: ${newRating.companyName}`,
      description: `Your ${newRating.rating}★ rating and review for ${newRating.companyName} has been verified and added to the leaderboard.`,
      time: "Just now",
      type: "system",
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Modals state
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);

  // Protected navigation handler with basic role-based route guarding
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

    const isEmployer = user.role?.toLowerCase() === "employer";

    // Route Guard 1: Job seeker trying to access employer dashboard
    if (nav === "dashboard/employer" && !isEmployer) {
      setNotifications((prev) => [
        {
          id: `guard-${Date.now()}`,
          title: "Access Restricted",
          message:
            "The Employer Dashboard is reserved for hiring organizations. You have been redirected to your Job Seeker Dashboard.",
          time: "Just now",
          read: false,
          type: "system",
        },
        ...prev,
      ]);
      setCurrentNav("dashboard/jobseeker");
      return;
    }

    // Route Guard 2: Employer trying to access job seeker dashboard
    if (nav === "dashboard/jobseeker" && isEmployer) {
      setNotifications((prev) => [
        {
          id: `guard-${Date.now()}`,
          title: "Access Restricted",
          message:
            "The Job Seeker Dashboard is reserved for candidates. You have been redirected to your Employer Dashboard.",
          time: "Just now",
          read: false,
          type: "system",
        },
        ...prev,
      ]);
      setCurrentNav("dashboard/employer");
      return;
    }

    // Generic "dashboard" route alias: dynamically redirects based on role
    if (nav === "dashboard") {
      setCurrentNav(isEmployer ? "dashboard/employer" : "dashboard/jobseeker");
      return;
    }

    setCurrentNav(nav);
  };

  // 1. Existing User enters credentials on login: route to appropriate dashboard based on stored role
  const handleDirectLoginSuccess = (existingUser: RegisteredUser) => {
    const isEmployer = existingUser.role?.toLowerCase() === "employer";

    setUser((prev) => ({
      ...prev,
      id: existingUser.id || prev.id,
      username: existingUser.username || prev.username,
      password: existingUser.password || prev.password,
      name: existingUser.name,
      email: existingUser.email,
      phone: existingUser.phone,
      role: isEmployer ? "Employer" : "Candidate",
      companyName: existingUser.companyName || prev.companyName,
      companyEmail: existingUser.companyEmail || prev.companyEmail,
      industry: existingUser.industry || prev.industry,
      companySize: existingUser.companySize || prev.companySize,
      contactPerson: existingUser.contactPerson || prev.contactPerson,
      companyWebsite: existingUser.companyWebsite || prev.companyWebsite,
      avatarUrl: existingUser.avatarUrl || prev.avatarUrl,
      location: existingUser.location || prev.location,
      resumes:
        existingUser.resumes && existingUser.resumes.length > 0
          ? existingUser.resumes
          : prev.resumes,
    }));
    setAuthEmail(existingUser.username || existingUser.id || existingUser.email);
    setAuthPhone(existingUser.phone);
    setRegistrationNotice(undefined);
    setPendingUser(null);
    setIsAuthenticated(true);

    // Conditional role-based redirection on login
    if (isEmployer) {
      setCurrentNav("dashboard/employer");
    } else {
      setCurrentNav("dashboard/jobseeker");
    }
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
  const handleRegisterSubmit = (data: RegisterFormData) => {
    const permanentId = `MOAS-ID-${Math.floor(10000 + Math.random() * 90000)}`;
    const isEmployer = data.role.toLowerCase() === "employer";

    const newRecord: RegisteredUser = {
      id: permanentId,
      username: data.username,
      password: data.password,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: isEmployer ? "Employer" : "Candidate",
      companyName: data.companyName,
      companyEmail: data.companyEmail,
      industry: data.industry,
      companySize: data.companySize,
      contactPerson: data.contactPerson,
      companyWebsite: data.companyWebsite,
      avatarUrl: isEmployer
        ? "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=faces"
        : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=faces",
      location: "Bangalore, India",
      createdAt: new Date().toISOString(),
      resumes:
        !isEmployer && data.resumeName
          ? [
              {
                id: `res-${Date.now()}`,
                name: data.resumeName,
                size: "240 KB",
                updatedAt: "Just now",
                type: "PDF",
                isPrimary: true,
              },
            ]
          : [],
    };

    setPendingUser(newRecord);
    setAuthEmail(data.email);
    setAuthPhone(data.phone);
    setCurrentNav("otp");
  };

  // 3. Verifying OTP: only after OTP is verified is the new account added, authenticated, and granted access
  const handleOtpVerifySuccess = () => {
    let targetNav: NavigationState = "dashboard/jobseeker";

    if (pendingUser) {
      const isEmployer = pendingUser.role?.toLowerCase() === "employer";
      targetNav = isEmployer ? "dashboard/employer" : "dashboard/jobseeker";

      setRegisteredUsers((prev) => {
        const updated = [
          pendingUser,
          ...prev.filter(
            (u) =>
              u.email.toLowerCase() !== pendingUser.email.toLowerCase() &&
              u.id.toLowerCase() !== pendingUser.id.toLowerCase() &&
              (u.username ? u.username.toLowerCase() !== pendingUser.username?.toLowerCase() : true)
          ),
        ];
        localStorage.setItem("moas_registered_users", JSON.stringify(updated));
        return updated;
      });

      setUser((prev) => ({
        ...prev,
        id: pendingUser.id,
        username: pendingUser.username,
        password: pendingUser.password,
        name: pendingUser.name,
        email: pendingUser.email,
        phone: pendingUser.phone,
        role: isEmployer ? "Employer" : "Candidate",
        companyName: pendingUser.companyName || prev.companyName,
        companyEmail: pendingUser.companyEmail || prev.companyEmail,
        industry: pendingUser.industry || prev.industry,
        companySize: pendingUser.companySize || prev.companySize,
        contactPerson: pendingUser.contactPerson || prev.contactPerson,
        companyWebsite: pendingUser.companyWebsite || prev.companyWebsite,
        avatarUrl: pendingUser.avatarUrl || prev.avatarUrl,
        location: pendingUser.location || prev.location,
        resumes: pendingUser.resumes || prev.resumes,
      }));

      // Synchronize permanent candidate or employer record to backend
      fetch("/api/moas/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingUser),
      }).catch((e) => console.warn("[MOAS User Sync]", e?.message || e));

      setPendingUser(null);
    }

    setRegistrationNotice(undefined);
    setIsAuthenticated(true);
    // Conditional role-based redirection post-registration
    setCurrentNav(targetNav);
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
    }).catch((e) => console.warn("[MOAS Save Job Sync]", e?.message || e));
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
    }).catch((e) => console.warn("[MOAS Publish Job Sync]", e?.message || e));

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
    }).catch((e) => console.warn("[MOAS Application Sync]", e?.message || e));

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
    }).catch((e) => console.warn("[MOAS App Status Sync]", e?.message || e));

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
    }).catch((e) => console.warn("[MOAS Delete App Sync]", e?.message || e));
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
    }).catch((e) => console.warn("[MOAS Delete Alert Sync]", e?.message || e));
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
    }).catch((e) => console.warn("[MOAS Create Alert Sync]", e?.message || e));
  };

  // Comprehensive profile persistence: updates React state, local storage, and Cloud Firestore
  const handleUpdateUser = async (updated: UserProfile) => {
    setUser(updated);

    // 1. Persist to local storage
    try {
      localStorage.setItem("moas_user_profile", JSON.stringify(updated));
    } catch (e) {
      console.warn("Local storage write warning:", e);
    }

    // 2. Synchronize registeredUsers list in state and local storage
    setRegisteredUsers((prev) => {
      const idx = prev.findIndex(
        (u) =>
          u.id.toLowerCase() === updated.id.toLowerCase() ||
          (u.email && u.email.toLowerCase() === updated.email.toLowerCase())
      );
      let nextList: RegisteredUser[];
      if (idx !== -1) {
        nextList = [...prev];
        nextList[idx] = {
          ...nextList[idx],
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          role: updated.role as any,
          companyName: updated.companyName,
          companyEmail: updated.companyEmail,
          industry: updated.industry,
          companySize: updated.companySize,
          contactPerson: updated.contactPerson,
          companyWebsite: updated.companyWebsite,
          avatarUrl: updated.avatarUrl,
          location: updated.location,
          skills: updated.skills,
          resumes: updated.resumes,
        };
      } else {
        nextList = [
          {
            id: updated.id,
            username: updated.username,
            name: updated.name,
            email: updated.email,
            phone: updated.phone,
            role: updated.role as any,
            companyName: updated.companyName,
            companyEmail: updated.companyEmail,
            industry: updated.industry,
            companySize: updated.companySize,
            contactPerson: updated.contactPerson,
            companyWebsite: updated.companyWebsite,
            avatarUrl: updated.avatarUrl,
            location: updated.location,
            skills: updated.skills,
            resumes: updated.resumes,
            createdAt: updated.memberSince || new Date().toISOString(),
          },
          ...prev,
        ];
      }
      try {
        localStorage.setItem("moas_registered_users", JSON.stringify(nextList));
      } catch (e) {
        console.warn(e);
      }
      return nextList;
    });

    // 3. Persist to backend and Google Cloud Firestore database
    try {
      await fetch(`/api/moas/users/${updated.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: updated.id,
          username: updated.username,
          password: updated.password,
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          role: updated.role,
          companyName: updated.companyName,
          companyEmail: updated.companyEmail,
          industry: updated.industry,
          companySize: updated.companySize,
          contactPerson: updated.contactPerson,
          companyWebsite: updated.companyWebsite,
          avatarUrl: updated.avatarUrl,
          location: updated.location,
          quote: updated.quote,
          aboutMe: updated.aboutMe,
          skills: updated.skills,
          experienceLevel: updated.experienceLevel,
          education: updated.education,
          resumes: updated.resumes,
        }),
      });
    } catch (e) {
      console.error("Backend user update error:", e);
    }
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
                  user={user}
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

                    {/* Job Seeker Dashboard */}
                    {(currentNav === "dashboard/jobseeker" ||
                      (currentNav === "dashboard" && user.role !== "Employer")) && (
                      <DashboardView
                        user={user}
                        applications={applications}
                        jobs={jobs}
                        alerts={alerts}
                        profileViews={profileViews}
                        viewEvents={profileViewEvents}
                        onNavigate={handleNavigate}
                        onSelectJob={(j) => setSelectedJob(j)}
                        onToggleSaveJob={handleToggleSaveJob}
                        onUpdateUser={handleUpdateUser}
                        onUpdateApplicationStatus={handleUpdateApplicationStatus}
                        onQuickApplySample={handleQuickApplySample}
                        onOpenLiveViewsModal={() => setIsLiveViewsModalOpen(true)}
                      />
                    )}

                    {/* Employer Dashboard */}
                    {(currentNav === "dashboard/employer" ||
                      (currentNav === "dashboard" && user.role === "Employer")) && (
                      <EmployerDashboardView
                        user={user}
                        jobs={jobs}
                        applications={applications}
                        registeredUsers={registeredUsers}
                        onNavigate={handleNavigate}
                        onSelectJob={(j) => setSelectedJob(j)}
                        onUpdateApplicationStatus={handleUpdateApplicationStatus}
                        onRecordCandidateView={handleEmployerRecordCandidateView}
                      />
                    )}

                    {currentNav === "find-jobs" && (
                      <FindJobsView
                        jobs={jobs}
                        companies={companies}
                        onSelectJob={(j) => setSelectedJob(j)}
                        onToggleSaveJob={handleToggleSaveJob}
                        onRateCompany={handleOpenRateModal}
                        onNavigateToTopCompanies={() => handleNavigate("top-companies")}
                      />
                    )}

                    {(currentNav === "top-companies" || currentNav === "companies") && (
                      <CompaniesView
                        companies={companies}
                        ratings={companyRatings}
                        onSelectCompany={() => handleNavigate("find-jobs")}
                        onNavigate={handleNavigate}
                        onFilterJobsByCompany={() => handleNavigate("find-jobs")}
                        onOpenRateModal={handleOpenRateModal}
                      />
                    )}

                    {currentNav === "post-job" && (
                      <PostJobView
                        onJobPublished={handleJobPublished}
                        defaultCompany={user.companyName || user.name}
                      />
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

                    {currentNav === "resume-cv" && (
                      <ResumeCvView user={user} onUpdateUser={handleUpdateUser} />
                    )}

                    {currentNav === "profile" && (
                      <ProfileView
                        user={user}
                        applications={applications}
                        jobs={jobs}
                        profileViews={profileViews}
                        viewEvents={profileViewEvents}
                        alertsCount={alerts.length}
                        onUpdateUser={handleUpdateUser}
                        onNavigate={handleNavigate}
                        onOpenLiveViewsModal={() => setIsLiveViewsModalOpen(true)}
                      />
                    )}

                    {currentNav === "settings" && (
                      <SettingsView user={user} onUpdateUser={handleUpdateUser} />
                    )}
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

      <RateCompanyModal
        isOpen={isRateModalOpen}
        companyName={targetRatingCompany}
        companiesList={companies.map((c) => c.name)}
        user={user}
        onClose={() => setIsRateModalOpen(false)}
        onRatingSubmitted={handleCompanyRatingSubmitted}
      />

      <LiveProfileViewsModal
        isOpen={isLiveViewsModalOpen}
        onClose={() => setIsLiveViewsModalOpen(false)}
        viewsCount={profileViews}
        viewEvents={profileViewEvents}
        user={user}
        onSimulateView={handleSimulateLiveProfileView}
        onResetViews={handleResetProfileViews}
      />
    </div>
    </LanguageProvider>
  );
}
