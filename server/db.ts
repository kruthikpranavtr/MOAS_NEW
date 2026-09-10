import { initializeApp, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  limit,
} from "firebase/firestore";
import fs from "fs";
import path from "path";

export interface DBJob {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  experience: string;
  salary: string;
  salaryText?: string;
  description: string;
  requirements: string[];
  department: string;
  tags: string[];
  isVerified: boolean;
  postedDate: string;
  workMode?: string;
  logoUrl?: string;
  applicantCount?: number;
}

export interface DBApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  appliedDate: string;
  status: "Applied" | "Under Review" | "Shortlisted" | "Interview Scheduled" | "Rejected" | "Offered";
  stage: string;
  matchScore: number;
  resumeName: string;
  notes?: string;
}

export interface DBUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "Candidate" | "Employer";
  avatarUrl: string;
  location: string;
  quote?: string;
  aboutMe?: string;
  skills: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface DBResume {
  id: string;
  userId: string;
  name: string;
  size: string;
  updatedAt: string;
  type: "PDF" | "DOCX";
  isPrimary: boolean;
  content?: string;
}

export interface DBCompany {
  id: string;
  name: string;
  industry: string;
  location: string;
  openJobsCount: number;
  rating: number;
  verified: boolean;
  logoUrl?: string;
}

export interface DBSavedJob {
  id: string;
  userId: string;
  jobId: string;
  savedDate: string;
}

export interface DBJobAlert {
  id: string;
  userId: string;
  keyword: string;
  location: string;
  role: string;
  frequency: "Daily" | "Weekly" | "Instant";
  active: boolean;
  createdAt: string;
}

// In-Memory Fast Cache for zero-latency responses & offline fallback
class MemoryStore {
  jobs: Map<string, DBJob> = new Map();
  applications: Map<string, DBApplication> = new Map();
  users: Map<string, DBUser> = new Map();
  resumes: Map<string, DBResume> = new Map();
  companies: Map<string, DBCompany> = new Map();
  savedJobs: Map<string, DBSavedJob> = new Map();
  alerts: Map<string, DBJobAlert> = new Map();
}

const memoryStore = new MemoryStore();

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let isDbConnected = false;
let dbConfig: any = null;

// Initialize Firestore
export function initFirestore(): { connected: boolean; dbId?: string; projectId?: string } {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (!fs.existsSync(configPath)) {
      console.warn("firebase-applet-config.json not found on disk");
      return { connected: false };
    }

    dbConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    firebaseApp = initializeApp(dbConfig);
    const dbId = dbConfig.firestoreDatabaseId || "(default)";
    firestoreDb = getFirestore(firebaseApp, dbId);
    isDbConnected = true;

    console.log(`[Firestore] Initialized instance ${dbId} for project ${dbConfig.projectId}`);
    return { connected: true, dbId, projectId: dbConfig.projectId };
  } catch (error) {
    console.error("[Firestore] Initialization error:", error);
    isDbConnected = false;
    return { connected: false };
  }
}

// Ensure DB is initialized
initFirestore();

export function getDB(): Firestore | null {
  return firestoreDb;
}

export function isConnected(): boolean {
  return isDbConnected;
}

// Seed initial verified datasets
export async function seedInitialData(force = false) {
  const defaultCompanies: DBCompany[] = [
    {
      id: "comp-1",
      name: "Google DeepMind",
      industry: "Artificial Intelligence & Robotics",
      location: "Bengaluru, India / London, UK",
      openJobsCount: 14,
      rating: 4.9,
      verified: true,
      logoUrl: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=100&h=100&fit=crop",
    },
    {
      id: "comp-2",
      name: "Stripe",
      industry: "Financial Infrastructure",
      location: "San Francisco, CA / Bengaluru",
      openJobsCount: 8,
      rating: 4.8,
      verified: true,
      logoUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&h=100&fit=crop",
    },
    {
      id: "comp-3",
      name: "Razorpay",
      industry: "Fintech & Payments",
      location: "Bengaluru, Karnataka, India",
      openJobsCount: 12,
      rating: 4.7,
      verified: true,
      logoUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=100&h=100&fit=crop",
    },
    {
      id: "comp-4",
      name: "Zepto",
      industry: "Quick Commerce & Logistics",
      location: "Bengaluru / Mumbai, India",
      openJobsCount: 6,
      rating: 4.6,
      verified: true,
      logoUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=100&h=100&fit=crop",
    },
    {
      id: "comp-5",
      name: "Microsoft",
      industry: "Cloud & Intelligent Edge",
      location: "Hyderabad / Bengaluru, India",
      openJobsCount: 18,
      rating: 4.8,
      verified: true,
      logoUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100&h=100&fit=crop",
    },
  ];

  const defaultJobs: DBJob[] = [
    {
      id: "job-1",
      title: "Senior Full Stack Engineer",
      company: "Stripe",
      location: "San Francisco, CA (Hybrid)",
      type: "Full-time",
      experience: "3-5 years",
      salary: "$165,000 - $210,000",
      salaryText: "$165,000 - $210,000 / yr",
      description: "Architect high-throughput payment infrastructure, build resilient React micro-frontends, and optimize distributed transaction workflows with sub-100ms latency.",
      requirements: ["React", "TypeScript", "Node.js", "Distributed Systems", "SQL"],
      department: "Engineering",
      tags: ["React", "TypeScript", "Node.js", "Distributed Systems"],
      isVerified: true,
      postedDate: "2 days ago",
      workMode: "Hybrid",
      applicantCount: 24,
    },
    {
      id: "job-2",
      title: "Machine Learning / AI Systems Engineer",
      company: "Google DeepMind",
      location: "Bengaluru, India (Hybrid)",
      type: "Full-time",
      experience: "2-4 years",
      salary: "₹38,00,000 - ₹55,00,000",
      salaryText: "₹38,00,000 - ₹55,00,000 / yr",
      description: "Design low-latency neural inference pipelines, fine-tune Gemini family LLMs, build RAG systems, and optimize vector retrieval at planetary scale.",
      requirements: ["Python", "PyTorch", "RAG", "Vector Databases", "TypeScript", "Algorithms"],
      department: "AI Research",
      tags: ["Python", "PyTorch", "RAG", "LLMs", "Vector DB"],
      isVerified: true,
      postedDate: "1 day ago",
      workMode: "Hybrid",
      applicantCount: 42,
    },
    {
      id: "job-3",
      title: "Senior Frontend Platform Developer",
      company: "Razorpay",
      location: "Bengaluru, Karnataka, India",
      type: "Full-time",
      experience: "2-5 years",
      salary: "₹24,00,000 - ₹34,00,000",
      salaryText: "₹24,00,000 - ₹34,00,000 / yr",
      description: "Own core checkout modules, optimize Web Vitals, implement state machines, and architect modular UI components for 10M+ daily transactions.",
      requirements: ["React.js", "TypeScript", "Next.js", "Tailwind CSS", "Redux/Zustand"],
      department: "Frontend Core",
      tags: ["React.js", "TypeScript", "Next.js", "Performance"],
      isVerified: true,
      postedDate: "Just now",
      workMode: "Onsite",
      applicantCount: 16,
    },
    {
      id: "job-4",
      title: "Distributed Backend Architect",
      company: "Zepto",
      location: "Bengaluru, India",
      type: "Full-time",
      experience: "3-6 years",
      salary: "₹30,00,000 - ₹45,00,000",
      salaryText: "₹30,00,000 - ₹45,00,000 / yr",
      description: "Design hyper-scalable order dispatch engines, optimize route planning algorithms, and maintain high concurrency microservices in Go and Node.",
      requirements: ["Go", "Node.js", "Redis", "Kafka", "PostgreSQL", "Microservices"],
      department: "Logistics Engineering",
      tags: ["Go", "Node.js", "Kafka", "PostgreSQL"],
      isVerified: true,
      postedDate: "3 days ago",
      workMode: "Onsite",
      applicantCount: 31,
    },
    {
      id: "job-5",
      title: "Cloud Infrastructure & DevOps Engineer",
      company: "Microsoft",
      location: "Hyderabad, India (Remote)",
      type: "Full-time",
      experience: "3-5 years",
      salary: "₹28,00,000 - ₹40,00,000",
      salaryText: "₹28,00,000 - ₹40,00,000 / yr",
      description: "Deploy automated Kubernetes clusters, build zero-trust security pipelines, and manage hybrid cloud infrastructure spanning Azure and GCP.",
      requirements: ["Kubernetes", "Docker", "Terraform", "CI/CD", "Linux", "Azure"],
      department: "Cloud Operations",
      tags: ["Kubernetes", "Docker", "Terraform", "Cloud"],
      isVerified: true,
      postedDate: "4 days ago",
      workMode: "Remote",
      applicantCount: 19,
    },
  ];

  const defaultUsers: DBUser[] = [
    {
      id: "MOAS-ID-84920",
      name: "Kruthik Pranav",
      email: "kruthikpranav02@gmail.com",
      phone: "+91 98450 12345",
      role: "Candidate",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=faces",
      location: "Bangalore, India",
      quote: "Building algorithmic frontiers and intelligent AI systems.",
      aboutMe: "Senior Machine Learning & Full Stack Software Engineer focused on high-throughput ML pipelines, distributed architectures, and modern web applications.",
      skills: ["TypeScript", "Python", "React.js", "PyTorch", "Node.js", "Machine Learning", "RAG", "Algorithms"],
      createdAt: "2024-01-15T08:00:00.000Z",
    },
    {
      id: "MOAS-ID-10824",
      name: "Arun Kumar",
      email: "arun.kumar@email.com",
      phone: "+91 98765 43210",
      role: "Candidate",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400",
      location: "Bangalore, Karnataka, India",
      quote: "Dream big, work smart, achieve more.",
      aboutMe: "Passionate software developer with experience in building scalable web applications, machine learning workflows, and interactive user interfaces.",
      skills: ["HTML", "CSS", "JavaScript", "React.js", "Node.js", "MySQL", "MongoDB", "Git", "REST API", "Python", "TypeScript"],
      createdAt: "2024-07-01T10:00:00.000Z",
    },
  ];

  const defaultResumes: DBResume[] = [
    {
      id: "res-kp-1",
      userId: "MOAS-ID-84920",
      name: "Kruthik_Pranav_ML_AI_Engineer_CV.pdf",
      size: "320 KB",
      updatedAt: "Permanent Verified",
      type: "PDF",
      isPrimary: true,
      content: "Verified profile CV for ML & Full Stack Software Engineer",
    },
    {
      id: "res-arun-1",
      userId: "MOAS-ID-10824",
      name: "Arun Kumar - Software Developer.docx",
      size: "245 KB",
      updatedAt: "20 May 2024, 10:30 AM",
      type: "DOCX",
      isPrimary: true,
    },
  ];

  const defaultApplications: DBApplication[] = [
    {
      id: "app-101",
      jobId: "job-2",
      jobTitle: "Machine Learning / AI Systems Engineer",
      company: "Google DeepMind",
      candidateId: "MOAS-ID-84920",
      candidateName: "Kruthik Pranav",
      candidateEmail: "kruthikpranav02@gmail.com",
      appliedDate: "Sep 07, 2026",
      status: "Interview Scheduled",
      stage: "Technical Deep-Dive",
      matchScore: 95,
      resumeName: "Kruthik_Pranav_ML_AI_Engineer_CV.pdf",
      notes: "Passed coding assessment; interview scheduled with Tech Lead.",
    },
    {
      id: "app-102",
      jobId: "job-1",
      jobTitle: "Senior Full Stack Engineer",
      company: "Stripe",
      candidateId: "MOAS-ID-84920",
      candidateName: "Kruthik Pranav",
      candidateEmail: "kruthikpranav02@gmail.com",
      appliedDate: "Sep 08, 2026",
      status: "Shortlisted",
      stage: "Resume Review",
      matchScore: 92,
      resumeName: "Kruthik_Pranav_ML_AI_Engineer_CV.pdf",
    },
    {
      id: "app-103",
      jobId: "job-3",
      jobTitle: "Senior Frontend Platform Developer",
      company: "Razorpay",
      candidateId: "MOAS-ID-84920",
      candidateName: "Kruthik Pranav",
      candidateEmail: "kruthikpranav02@gmail.com",
      appliedDate: "Sep 08, 2026",
      status: "Under Review",
      stage: "Initial Screening",
      matchScore: 89,
      resumeName: "Kruthik_Pranav_ML_AI_Engineer_CV.pdf",
    },
  ];

  // Seed into memory
  defaultCompanies.forEach((c) => memoryStore.companies.set(c.id, c));
  defaultJobs.forEach((j) => memoryStore.jobs.set(j.id, j));
  defaultUsers.forEach((u) => memoryStore.users.set(u.id, u));
  defaultResumes.forEach((r) => memoryStore.resumes.set(r.id, r));
  defaultApplications.forEach((a) => memoryStore.applications.set(a.id, a));

  // Seed into Firestore if available
  if (firestoreDb) {
    try {
      // Seed Companies
      for (const comp of defaultCompanies) {
        await setDoc(doc(firestoreDb, "companies", comp.id), comp, { merge: true });
      }
      // Seed Jobs
      for (const job of defaultJobs) {
        await setDoc(doc(firestoreDb, "jobs", job.id), job, { merge: true });
      }
      // Seed Users
      for (const user of defaultUsers) {
        await setDoc(doc(firestoreDb, "users", user.id), user, { merge: true });
      }
      // Seed Resumes
      for (const res of defaultResumes) {
        await setDoc(doc(firestoreDb, "resumes", res.id), res, { merge: true });
      }
      // Seed Applications
      for (const app of defaultApplications) {
        await setDoc(doc(firestoreDb, "applications", app.id), app, { merge: true });
      }
      console.log("[Firestore] Database successfully synchronized with seed records!");
    } catch (err) {
      console.error("[Firestore] Seeding warning:", err);
    }
  }

  return {
    seededJobs: memoryStore.jobs.size,
    seededCompanies: memoryStore.companies.size,
    seededUsers: memoryStore.users.size,
    seededApplications: memoryStore.applications.size,
  };
}

// Initial seed
seedInitialData(false).catch(console.error);

// ----------------------------------------------------
// DATABASE SERVICE METHODS
// ----------------------------------------------------

export async function getDatabaseStatus() {
  let firestoreLive = false;
  let errorMsg = null;

  if (firestoreDb) {
    try {
      // Test read from Firestore
      const snap = await getDocs(query(collection(firestoreDb, "jobs"), limit(1)));
      firestoreLive = true;
    } catch (e: any) {
      errorMsg = e.message;
    }
  }

  return {
    connected: isDbConnected && firestoreLive,
    engine: "Google Cloud Firestore",
    databaseId: dbConfig?.firestoreDatabaseId || "ai-studio-moas-3dec95e6-7f5a-4ba2-8475-ec9164232323",
    projectId: dbConfig?.projectId || "gen-lang-client-0678632511",
    collections: {
      jobs: memoryStore.jobs.size,
      applications: memoryStore.applications.size,
      users: memoryStore.users.size,
      resumes: memoryStore.resumes.size,
      companies: memoryStore.companies.size,
      savedJobs: memoryStore.savedJobs.size,
      alerts: memoryStore.alerts.size,
    },
    error: errorMsg,
  };
}

// Jobs
export async function getAllJobs(search?: string, department?: string, location?: string): Promise<DBJob[]> {
  let list = Array.from(memoryStore.jobs.values());

  // If connected, sync from Firestore
  if (firestoreDb) {
    try {
      const snap = await getDocs(collection(firestoreDb, "jobs"));
      if (!snap.empty) {
        list = [];
        snap.forEach((doc) => {
          const data = doc.data() as DBJob;
          list.push(data);
          memoryStore.jobs.set(data.id, data);
        });
      }
    } catch (e) {
      console.warn("Firestore jobs fetch fallback to memory store:", e);
    }
  }

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        j.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  if (department && department !== "All") {
    list = list.filter((j) => j.department.toLowerCase() === department.toLowerCase());
  }

  if (location && location !== "All") {
    list = list.filter((j) => j.location.toLowerCase().includes(location.toLowerCase()));
  }

  return list;
}

export async function getJobById(id: string): Promise<DBJob | null> {
  if (firestoreDb) {
    try {
      const snap = await getDoc(doc(firestoreDb, "jobs", id));
      if (snap.exists()) {
        return snap.data() as DBJob;
      }
    } catch (e) {
      console.warn("Firestore getJobById fallback:", e);
    }
  }
  return memoryStore.jobs.get(id) || null;
}

export async function saveJob(job: DBJob): Promise<DBJob> {
  memoryStore.jobs.set(job.id, job);
  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, "jobs", job.id), job, { merge: true });
    } catch (e) {
      console.error("Firestore saveJob error:", e);
    }
  }
  return job;
}

export async function deleteJob(id: string): Promise<boolean> {
  memoryStore.jobs.delete(id);
  if (firestoreDb) {
    try {
      await deleteDoc(doc(firestoreDb, "jobs", id));
    } catch (e) {
      console.error("Firestore deleteJob error:", e);
    }
  }
  return true;
}

// Applications
export async function getApplications(candidateId?: string): Promise<DBApplication[]> {
  let list = Array.from(memoryStore.applications.values());

  if (firestoreDb) {
    try {
      const snap = await getDocs(collection(firestoreDb, "applications"));
      if (!snap.empty) {
        list = [];
        snap.forEach((doc) => {
          const data = doc.data() as DBApplication;
          list.push(data);
          memoryStore.applications.set(data.id, data);
        });
      }
    } catch (e) {
      console.warn("Firestore getApplications fallback:", e);
    }
  }

  if (candidateId) {
    list = list.filter((a) => a.candidateId === candidateId);
  }

  return list;
}

export async function createApplication(app: DBApplication): Promise<DBApplication> {
  memoryStore.applications.set(app.id, app);
  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, "applications", app.id), app, { merge: true });
    } catch (e) {
      console.error("Firestore createApplication error:", e);
    }
  }
  return app;
}

export async function updateApplicationStatus(id: string, status: DBApplication["status"], stage?: string): Promise<DBApplication | null> {
  const existing = memoryStore.applications.get(id);
  if (existing) {
    existing.status = status;
    if (stage) existing.stage = stage;
    memoryStore.applications.set(id, existing);
    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, "applications", id), { status, ...(stage ? { stage } : {}) }, { merge: true });
      } catch (e) {
        console.error("Firestore updateApplicationStatus error:", e);
      }
    }
    return existing;
  }
  return null;
}

export async function deleteApplication(id: string): Promise<boolean> {
  memoryStore.applications.delete(id);
  if (firestoreDb) {
    try {
      await deleteDoc(doc(firestoreDb, "applications", id));
    } catch (e) {
      console.error("Firestore deleteApplication error:", e);
    }
  }
  return true;
}

// Users / Candidates
export async function getUsers(): Promise<DBUser[]> {
  let list = Array.from(memoryStore.users.values());
  if (firestoreDb) {
    try {
      const snap = await getDocs(collection(firestoreDb, "users"));
      if (!snap.empty) {
        list = [];
        snap.forEach((doc) => {
          const u = doc.data() as DBUser;
          list.push(u);
          memoryStore.users.set(u.id, u);
        });
      }
    } catch (e) {
      console.warn("Firestore getUsers fallback:", e);
    }
  }
  return list;
}

export async function getUser(idOrEmail: string): Promise<DBUser | null> {
  const users = await getUsers();
  return users.find((u) => u.id === idOrEmail || u.email === idOrEmail) || null;
}

export async function saveUser(user: DBUser): Promise<DBUser> {
  memoryStore.users.set(user.id, user);
  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, "users", user.id), user, { merge: true });
    } catch (e) {
      console.error("Firestore saveUser error:", e);
    }
  }
  return user;
}

export async function updateUserPhoto(userId: string, avatarUrl: string): Promise<DBUser | null> {
  const u = memoryStore.users.get(userId);
  if (u) {
    u.avatarUrl = avatarUrl;
    u.updatedAt = new Date().toISOString();
    memoryStore.users.set(userId, u);
    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, "users", userId), { avatarUrl, updatedAt: u.updatedAt }, { merge: true });
      } catch (e) {
        console.error("Firestore updateUserPhoto error:", e);
      }
    }
    return u;
  }
  return null;
}

// Resumes
export async function getUserResumes(userId: string): Promise<DBResume[]> {
  let list = Array.from(memoryStore.resumes.values()).filter((r) => r.userId === userId);
  if (firestoreDb) {
    try {
      const q = query(collection(firestoreDb, "resumes"), where("userId", "==", userId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        list = [];
        snap.forEach((doc) => {
          const r = doc.data() as DBResume;
          list.push(r);
          memoryStore.resumes.set(r.id, r);
        });
      }
    } catch (e) {
      console.warn("Firestore getUserResumes fallback:", e);
    }
  }
  return list;
}

export async function saveResume(resume: DBResume): Promise<DBResume> {
  memoryStore.resumes.set(resume.id, resume);
  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, "resumes", resume.id), resume, { merge: true });
    } catch (e) {
      console.error("Firestore saveResume error:", e);
    }
  }
  return resume;
}

export async function deleteResume(id: string): Promise<boolean> {
  memoryStore.resumes.delete(id);
  if (firestoreDb) {
    try {
      await deleteDoc(doc(firestoreDb, "resumes", id));
    } catch (e) {
      console.error("Firestore deleteResume error:", e);
    }
  }
  return true;
}

// Companies
export async function getCompanies(): Promise<DBCompany[]> {
  let list = Array.from(memoryStore.companies.values());
  if (firestoreDb) {
    try {
      const snap = await getDocs(collection(firestoreDb, "companies"));
      if (!snap.empty) {
        list = [];
        snap.forEach((doc) => {
          const c = doc.data() as DBCompany;
          list.push(c);
          memoryStore.companies.set(c.id, c);
        });
      }
    } catch (e) {
      console.warn("Firestore getCompanies fallback:", e);
    }
  }
  return list;
}

// Saved Jobs
export async function getSavedJobs(userId: string): Promise<DBSavedJob[]> {
  return Array.from(memoryStore.savedJobs.values()).filter((s) => s.userId === userId);
}

export async function toggleSavedJob(userId: string, jobId: string): Promise<{ saved: boolean }> {
  const key = `${userId}_${jobId}`;
  if (memoryStore.savedJobs.has(key)) {
    memoryStore.savedJobs.delete(key);
    if (firestoreDb) {
      deleteDoc(doc(firestoreDb, "savedJobs", key)).catch(console.error);
    }
    return { saved: false };
  } else {
    const item: DBSavedJob = {
      id: key,
      userId,
      jobId,
      savedDate: new Date().toISOString(),
    };
    memoryStore.savedJobs.set(key, item);
    if (firestoreDb) {
      setDoc(doc(firestoreDb, "savedJobs", key), item, { merge: true }).catch(console.error);
    }
    return { saved: true };
  }
}

// Job Alerts
export async function getJobAlerts(userId: string): Promise<DBJobAlert[]> {
  return Array.from(memoryStore.alerts.values()).filter((a) => a.userId === userId);
}

export async function saveJobAlert(alert: DBJobAlert): Promise<DBJobAlert> {
  memoryStore.alerts.set(alert.id, alert);
  if (firestoreDb) {
    setDoc(doc(firestoreDb, "jobAlerts", alert.id), alert, { merge: true }).catch(console.error);
  }
  return alert;
}

export async function deleteJobAlert(id: string): Promise<boolean> {
  memoryStore.alerts.delete(id);
  if (firestoreDb) {
    deleteDoc(doc(firestoreDb, "jobAlerts", id)).catch(console.error);
  }
  return true;
}
