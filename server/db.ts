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
import {
  pgUpsertJob,
  pgDeleteJob,
  pgUpsertApplication,
  pgUpdateApplicationStatus,
  pgUpsertUser,
  pgRecordProfileView,
  pgClearProfileViews,
  pgUpsertCompany,
  pgSaveRating,
  getPostgresStatus,
  queryPostgres,
} from "./postgres.js";

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
  username?: string;
  password?: string;
  name: string;
  email: string;
  phone: string;
  role: "Candidate" | "Employer" | "jobseeker" | "employer";
  companyName?: string;
  companyEmail?: string;
  industry?: string;
  companySize?: string;
  contactPerson?: string;
  companyWebsite?: string;
  avatarUrl: string;
  location: string;
  quote?: string;
  aboutMe?: string;
  skills: string[];
  experienceLevel?: string;
  education?: any[];
  resumes?: any[];
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
  reviewsCount?: number | string;
  verified: boolean;
  logoUrl?: string;
  cultureRating?: number;
  workLifeRating?: number;
  growthRating?: number;
  compensationRating?: number;
  featuredReview?: string;
  tagline?: string;
}

export interface DBCompanyRating {
  id: string;
  companyName: string;
  userId: string;
  userName: string;
  userRole?: string;
  userAvatar?: string;
  rating: number; // 1 to 5
  cultureRating?: number;
  workLifeRating?: number;
  growthRating?: number;
  compensationRating?: number;
  reviewTitle: string;
  reviewText: string;
  pros?: string;
  cons?: string;
  recommendToFriend?: boolean;
  createdAt: string;
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

export interface DBProfileView {
  id: string;
  userId: string;
  viewerType: "Recruiter" | "Hiring Manager" | "Employer" | "Platform Visitor";
  viewerName: string;
  viewerCompany: string;
  viewerRole: string;
  viewerAvatar?: string;
  source: string;
  viewedAt: string;
  durationSeconds?: number;
  jobId?: string;
  jobTitle?: string;
  isVerifiedRecruiter?: boolean;
}

// In-Memory Fast Cache for zero-latency responses & offline fallback
class MemoryStore {
  jobs: Map<string, DBJob> = new Map();
  applications: Map<string, DBApplication> = new Map();
  users: Map<string, DBUser> = new Map();
  resumes: Map<string, DBResume> = new Map();
  companies: Map<string, DBCompany> = new Map();
  ratings: Map<string, DBCompanyRating> = new Map();
  savedJobs: Map<string, DBSavedJob> = new Map();
  alerts: Map<string, DBJobAlert> = new Map();
  profileViews: Map<string, DBProfileView> = new Map();
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
      industry: "Artificial Intelligence & Research",
      location: "Bengaluru, India / London, UK",
      openJobsCount: 14,
      rating: 4.9,
      reviewsCount: 328,
      verified: true,
      cultureRating: 4.9,
      workLifeRating: 4.8,
      growthRating: 5.0,
      compensationRating: 4.9,
      featuredReview: "Pioneering frontier research with unmatched compute and stellar colleagues.",
      tagline: "Solving intelligence to advance science and benefit humanity.",
      logoUrl: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=100&h=100&fit=crop",
    },
    {
      id: "comp-2",
      name: "Anthropic AI",
      industry: "Frontier AI Safety & Alignment",
      location: "San Francisco, CA (Hybrid)",
      openJobsCount: 11,
      rating: 4.9,
      reviewsCount: 215,
      verified: true,
      cultureRating: 4.9,
      workLifeRating: 4.7,
      growthRating: 4.9,
      compensationRating: 4.9,
      featuredReview: "Deeply thoughtful culture focused on safe, helpful, and honest systems.",
      tagline: "AI research and products that put safety and honesty first.",
      logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop",
    },
    {
      id: "comp-3",
      name: "NVIDIA Corp",
      industry: "Accelerated Computing & AI Hardware",
      location: "Santa Clara, CA / Bengaluru, India",
      openJobsCount: 22,
      rating: 4.8,
      reviewsCount: 412,
      verified: true,
      cultureRating: 4.8,
      workLifeRating: 4.7,
      growthRating: 4.8,
      compensationRating: 5.0,
      featuredReview: "Defining the AI computing backbone with industry-leading equity upside.",
      tagline: "The engine of modern AI and world-class graphics infrastructure.",
      logoUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=100&h=100&fit=crop",
    },
    {
      id: "comp-4",
      name: "Stripe",
      industry: "Financial Infrastructure",
      location: "San Francisco, CA / Bengaluru",
      openJobsCount: 8,
      rating: 4.8,
      reviewsCount: 194,
      verified: true,
      cultureRating: 4.8,
      workLifeRating: 4.6,
      growthRating: 4.8,
      compensationRating: 4.9,
      featuredReview: "Highest engineering rigor in payments with brilliant writing culture.",
      tagline: "Financial infrastructure for the internet.",
      logoUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&h=100&fit=crop",
    },
    {
      id: "comp-5",
      name: "OpenAI",
      industry: "Artificial General Intelligence",
      location: "San Francisco, CA",
      openJobsCount: 16,
      rating: 4.8,
      reviewsCount: 290,
      verified: true,
      cultureRating: 4.7,
      workLifeRating: 4.4,
      growthRating: 4.9,
      compensationRating: 5.0,
      featuredReview: "Incredible velocity and access to planetary-scale generative models.",
      tagline: "Creating safe AGI that benefits all of humanity.",
      logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop",
    },
    {
      id: "comp-6",
      name: "Microsoft",
      industry: "Cloud & Intelligent Edge",
      location: "Hyderabad / Bengaluru, India",
      openJobsCount: 18,
      rating: 4.7,
      reviewsCount: 580,
      verified: true,
      cultureRating: 4.7,
      workLifeRating: 4.8,
      growthRating: 4.7,
      compensationRating: 4.7,
      featuredReview: "Superb work-life balance and world-class enterprise cloud scale.",
      tagline: "Empowering every person and organization to achieve more.",
      logoUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100&h=100&fit=crop",
    },
    {
      id: "comp-7",
      name: "Databricks",
      industry: "Data & AI Lakehouse",
      location: "Bengaluru / San Francisco",
      openJobsCount: 9,
      rating: 4.7,
      reviewsCount: 168,
      verified: true,
      cultureRating: 4.7,
      workLifeRating: 4.6,
      growthRating: 4.8,
      compensationRating: 4.8,
      featuredReview: "Innovating at the intersection of Apache Spark and ML engineering.",
      tagline: "The data and AI company.",
      logoUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=100&h=100&fit=crop",
    },
    {
      id: "comp-8",
      name: "Razorpay",
      industry: "Fintech & Payments",
      location: "Bengaluru, Karnataka, India",
      openJobsCount: 12,
      rating: 4.6,
      reviewsCount: 185,
      verified: true,
      cultureRating: 4.6,
      workLifeRating: 4.4,
      growthRating: 4.7,
      compensationRating: 4.6,
      featuredReview: "Fast-moving, high ownership startup culture solving Indian fintech.",
      tagline: "Powering modern payments for India and Southeast Asia.",
      logoUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=100&h=100&fit=crop",
    },
    {
      id: "comp-9",
      name: "Zepto",
      industry: "Quick Commerce & Logistics",
      location: "Bengaluru / Mumbai, India",
      openJobsCount: 6,
      rating: 4.5,
      reviewsCount: 140,
      verified: true,
      cultureRating: 4.5,
      workLifeRating: 4.2,
      growthRating: 4.8,
      compensationRating: 4.6,
      featuredReview: "High energy, zero bureaucracy, and massive operational scale.",
      tagline: "10-minute grocery delivery platform.",
      logoUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=100&h=100&fit=crop",
    },
    {
      id: "comp-10",
      name: "HashiCorp Cloud",
      industry: "Infrastructure & Automation",
      location: "Seattle, WA (Remote)",
      openJobsCount: 7,
      rating: 4.6,
      reviewsCount: 112,
      verified: true,
      cultureRating: 4.7,
      workLifeRating: 4.8,
      growthRating: 4.5,
      compensationRating: 4.6,
      featuredReview: "Asynchronous, written-first culture with brilliant remote workflows.",
      tagline: "Automating multi-cloud infrastructure and security.",
      logoUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=100&h=100&fit=crop",
    },
  ];

  const defaultRatings: DBCompanyRating[] = [
    {
      id: "rate-1",
      companyName: "Google DeepMind",
      userId: "usr-senior-ai",
      userName: "Dr. Aravind S.",
      userRole: "Staff Research Scientist",
      rating: 5,
      cultureRating: 5,
      workLifeRating: 5,
      growthRating: 5,
      compensationRating: 5,
      reviewTitle: "Extraordinary research freedom and compute infrastructure",
      reviewText: "Collaborating on Gemini architecture with world-leading peers is deeply fulfilling. Outstanding transparency, psychological safety, and supportive leadership.",
      pros: "World-class compute, generous bonuses, great intellectual peers",
      cons: "High bar for research peer review",
      recommendToFriend: true,
      createdAt: "2026-09-08T10:30:00Z",
    },
    {
      id: "rate-2",
      companyName: "Anthropic AI",
      userId: "usr-alignment",
      userName: "Elena Rostova",
      userRole: "ML Alignment Engineer",
      rating: 5,
      cultureRating: 5,
      workLifeRating: 4,
      growthRating: 5,
      compensationRating: 5,
      reviewTitle: "Principled leadership with real commitment to safety",
      reviewText: "The team takes AI alignment seriously without compromising on velocity. Engineers are trusted and leadership communicates openly about company direction.",
      pros: "Mission-driven team, high autonomy, competitive compensation",
      cons: "Intense deadlines during frontier training runs",
      recommendToFriend: true,
      createdAt: "2026-09-07T14:15:00Z",
    },
    {
      id: "rate-3",
      companyName: "NVIDIA Corp",
      userId: "usr-cuda",
      userName: "Vikram Mehta",
      userRole: "Senior CUDA Systems Architect",
      rating: 5,
      cultureRating: 5,
      workLifeRating: 4,
      growthRating: 5,
      compensationRating: 5,
      reviewTitle: "At the pinnacle of computing and AI hardware",
      reviewText: "Jensen's flat organizational structure fosters rapid decision making. The equity appreciation and technical challenges keep everyone motivated.",
      pros: "Industry benchmark, incredible equity returns, smart colleagues",
      cons: "Fast-paced demands across multiple global time zones",
      recommendToFriend: true,
      createdAt: "2026-09-05T09:40:00Z",
    },
    {
      id: "rate-4",
      companyName: "Stripe",
      userId: "usr-infra",
      userName: "Marcus Thorne",
      userRole: "Senior Backend Developer",
      rating: 5,
      cultureRating: 5,
      workLifeRating: 4,
      growthRating: 5,
      compensationRating: 5,
      reviewTitle: "Best-in-class software craftsmanship and API design",
      reviewText: "Written culture is second to none. Decisions are documented thoroughly, and everyone cares about code reliability and developer ergonomics.",
      pros: "High code quality standards, thoughtful colleagues, remote flexibility",
      cons: "On-call rotations can be demanding due to 99.999% uptime targets",
      recommendToFriend: true,
      createdAt: "2026-09-03T16:20:00Z",
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

  const defaultUsers: DBUser[] = [];
  const defaultResumes: DBResume[] = [];
  const defaultApplications: DBApplication[] = [];

  // Remove any legacy test accounts from memory
  const legacyTestUserIds = ["MOAS-ID-84920", "MOAS-ID-10824", "MOAS-ID-55019", "MOAS-ID-10482", "MOAS-ID-30941"];
  const legacyAppIds = ["app-101", "app-102", "app-103"];
  const legacyResumeIds = ["res-kp-1", "res-arun-1"];

  legacyTestUserIds.forEach((id) => memoryStore.users.delete(id));
  legacyAppIds.forEach((id) => memoryStore.applications.delete(id));
  legacyResumeIds.forEach((id) => memoryStore.resumes.delete(id));

  // Seed into memory
  defaultCompanies.forEach((c) => memoryStore.companies.set(c.id, c));
  defaultJobs.forEach((j) => memoryStore.jobs.set(j.id, j));

  // Seed into Firestore if available
  if (firestoreDb) {
    try {
      // Clean up legacy test records in Firestore
      for (const id of legacyTestUserIds) {
        await deleteDoc(doc(firestoreDb, "users", id)).catch(() => {});
      }
      for (const id of legacyAppIds) {
        await deleteDoc(doc(firestoreDb, "applications", id)).catch(() => {});
      }
      for (const id of legacyResumeIds) {
        await deleteDoc(doc(firestoreDb, "resumes", id)).catch(() => {});
      }

      // Seed Companies
      for (const comp of defaultCompanies) {
        memoryStore.companies.set(comp.id, comp);
        await setDoc(doc(firestoreDb, "companies", comp.id), comp, { merge: true });
      }
      // Seed Ratings
      for (const rating of defaultRatings) {
        memoryStore.ratings.set(rating.id, rating);
        await setDoc(doc(firestoreDb, "companyRatings", rating.id), rating, { merge: true });
      }
      // Seed Jobs
      for (const job of defaultJobs) {
        await setDoc(doc(firestoreDb, "jobs", job.id), job, { merge: true });
      }
      console.log("[Firestore] Database initialized with clean state (no test accounts).");
    } catch (err) {
      console.error("[Firestore] Seeding warning:", err);
    }
  }

  // Also seed relational records into PostgreSQL
  try {
    for (const comp of defaultCompanies) {
      await pgUpsertCompany(comp).catch(() => {});
    }
    for (const job of defaultJobs) {
      await pgUpsertJob(job).catch(() => {});
    }
    for (const rating of defaultRatings) {
      await pgSaveRating(rating).catch(() => {});
    }
    console.log("[PostgreSQL] Relational tables successfully seeded with core datasets.");
  } catch (pgErr) {
    console.warn("[PostgreSQL] Seed warning:", pgErr);
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

  const pgStatus = await getPostgresStatus().catch((e) => ({
    connected: false,
    engine: "PostgreSQL",
    error: e.message,
  }));

  return {
    connected: isDbConnected && firestoreLive,
    engine: "Google Cloud Firestore + PostgreSQL (Dual Engine)",
    databaseId: dbConfig?.firestoreDatabaseId || "ai-studio-moas-3dec95e6-7f5a-4ba2-8475-ec9164232323",
    projectId: dbConfig?.projectId || "gen-lang-client-0678632511",
    postgres: pgStatus,
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
  // Sync to PostgreSQL
  pgUpsertJob(job).catch((err) => console.warn("[PostgreSQL] saveJob sync error:", err));
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
  // Sync to PostgreSQL
  pgDeleteJob(id).catch((err) => console.warn("[PostgreSQL] deleteJob sync error:", err));
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
  // Sync to PostgreSQL
  pgUpsertApplication(app).catch((err) => console.warn("[PostgreSQL] createApplication sync error:", err));
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
    // Sync to PostgreSQL
    pgUpdateApplicationStatus(id, status, stage).catch((err) => console.warn("[PostgreSQL] updateApplicationStatus sync error:", err));
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
  const testIds = new Set(["MOAS-ID-84920", "MOAS-ID-10824", "MOAS-ID-55019", "MOAS-ID-10482", "MOAS-ID-30941"]);
  return list.filter(
    (u) =>
      !testIds.has(u.id) &&
      u.email !== "arun.kumar@email.com" &&
      u.email !== "talent@techcorp.io"
  );
}

export async function getUser(idOrEmail: string): Promise<DBUser | null> {
  if (firestoreDb && idOrEmail) {
    try {
      const snap = await getDoc(doc(firestoreDb, "users", idOrEmail));
      if (snap.exists()) {
        const data = snap.data() as DBUser;
        memoryStore.users.set(data.id, data);
        return data;
      }
    } catch (e) {
      console.warn("Firestore getUser direct get fallback:", e);
    }
  }
  const users = await getUsers();
  return users.find((u) => u.id === idOrEmail || u.email?.toLowerCase() === idOrEmail.toLowerCase()) || memoryStore.users.get(idOrEmail) || null;
}

export async function saveUser(user: DBUser): Promise<DBUser> {
  const updatedUser: DBUser = {
    ...user,
    updatedAt: new Date().toISOString(),
  };
  memoryStore.users.set(updatedUser.id, updatedUser);
  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, "users", updatedUser.id), updatedUser, { merge: true });
      console.log(`[Firestore] User ${updatedUser.id} (${updatedUser.name}) permanently saved to storage.`);
    } catch (e) {
      console.error("Firestore saveUser error:", e);
    }
  }
  // Sync to PostgreSQL
  pgUpsertUser(updatedUser).catch((err) => console.warn("[PostgreSQL] saveUser sync error:", err));
  return updatedUser;
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

// ----------------------------------------------------
// COMPANY RATINGS & TOP COMPANIES SERVICE METHODS
// ----------------------------------------------------

export async function getCompanyRatings(companyName?: string): Promise<DBCompanyRating[]> {
  let list = Array.from(memoryStore.ratings.values());
  if (firestoreDb) {
    try {
      const snap = await getDocs(collection(firestoreDb, "companyRatings"));
      if (!snap.empty) {
        list = [];
        snap.forEach((doc) => {
          const r = doc.data() as DBCompanyRating;
          list.push(r);
          memoryStore.ratings.set(r.id, r);
        });
      }
    } catch (e) {
      console.warn("Firestore getCompanyRatings fallback:", e);
    }
  }

  if (companyName) {
    list = list.filter((r) => r.companyName.toLowerCase() === companyName.toLowerCase());
  }

  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveCompanyRating(
  rating: DBCompanyRating
): Promise<{ rating: DBCompanyRating; company?: DBCompany }> {
  memoryStore.ratings.set(rating.id, rating);
  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, "companyRatings", rating.id), rating, { merge: true });
    } catch (e) {
      console.error("Firestore saveCompanyRating error:", e);
    }
  }

  // Find or create company entry in store to update score
  let targetCompany = Array.from(memoryStore.companies.values()).find(
    (c) => c.name.toLowerCase() === rating.companyName.toLowerCase()
  );

  if (!targetCompany) {
    targetCompany = {
      id: `comp-${Date.now()}`,
      name: rating.companyName,
      industry: "Technology",
      location: "Bengaluru, India",
      openJobsCount: 1,
      rating: rating.rating,
      reviewsCount: 1,
      verified: true,
      cultureRating: rating.cultureRating || rating.rating,
      workLifeRating: rating.workLifeRating || rating.rating,
      growthRating: rating.growthRating || rating.rating,
      compensationRating: rating.compensationRating || rating.rating,
      featuredReview: rating.reviewTitle,
      logoUrl: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=100&h=100&fit=crop",
    };
    memoryStore.companies.set(targetCompany.id, targetCompany);
  } else {
    // Recalculate average ratings
    const allForCompany = Array.from(memoryStore.ratings.values()).filter(
      (r) => r.companyName.toLowerCase() === rating.companyName.toLowerCase()
    );
    const count = allForCompany.length;
    const avgRating = Number((allForCompany.reduce((acc, c) => acc + c.rating, 0) / count).toFixed(1));
    const avgCulture = Number((allForCompany.reduce((acc, c) => acc + (c.cultureRating || c.rating), 0) / count).toFixed(1));
    const avgWorkLife = Number((allForCompany.reduce((acc, c) => acc + (c.workLifeRating || c.rating), 0) / count).toFixed(1));
    const avgGrowth = Number((allForCompany.reduce((acc, c) => acc + (c.growthRating || c.rating), 0) / count).toFixed(1));
    const avgComp = Number((allForCompany.reduce((acc, c) => acc + (c.compensationRating || c.rating), 0) / count).toFixed(1));

    targetCompany.rating = avgRating;
    targetCompany.reviewsCount = count;
    targetCompany.cultureRating = avgCulture;
    targetCompany.workLifeRating = avgWorkLife;
    targetCompany.growthRating = avgGrowth;
    targetCompany.compensationRating = avgComp;
    targetCompany.featuredReview = rating.reviewTitle;
    memoryStore.companies.set(targetCompany.id, targetCompany);
  }

  if (firestoreDb) {
    setDoc(doc(firestoreDb, "companies", targetCompany.id), targetCompany, { merge: true }).catch(console.error);
  }

  return { rating, company: targetCompany };
}

export async function getTopCompanies(minRating = 0, limitCount = 50): Promise<DBCompany[]> {
  let list = await getCompanies();
  if (minRating > 0) {
    list = list.filter((c) => c.rating >= minRating);
  }
  return list.sort((a, b) => b.rating - a.rating || (Number(b.reviewsCount) || 0) - (Number(a.reviewsCount) || 0)).slice(0, limitCount);
}

// ==========================================
// LIVE PROFILE VIEWS & RECRUITER AUDIT ENGINE
// ==========================================

export async function getProfileViews(userId?: string): Promise<{
  count: number;
  views: DBProfileView[];
  uniqueCompanies: number;
  lastViewedAt: string | null;
}> {
  let list: DBProfileView[] = Array.from(memoryStore.profileViews.values());

  if (firestoreDb) {
    try {
      const snap = await getDocs(collection(firestoreDb, "profileViews"));
      if (!snap.empty) {
        snap.forEach((d) => {
          const v = d.data() as DBProfileView;
          list.push(v);
          memoryStore.profileViews.set(v.id, v);
        });
      }
    } catch (e) {
      console.warn("Firestore getProfileViews error, using cached:", e);
    }
  }

  // Deduplicate by ID
  const map = new Map<string, DBProfileView>();
  for (const item of list) {
    map.set(item.id, item);
  }
  list = Array.from(map.values());

  if (userId) {
    const userFiltered = list.filter((v) => v.userId === userId);
    if (userFiltered.length > 0) {
      list = userFiltered;
    }
  }

  // Sort descending by timestamp
  list.sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime());

  const uniqueCompanies = new Set(list.map((v) => v.viewerCompany)).size;
  const lastViewedAt = list.length > 0 ? list[0].viewedAt : null;

  return {
    count: list.length,
    views: list,
    uniqueCompanies,
    lastViewedAt,
  };
}

export async function recordProfileView(
  viewData: Partial<DBProfileView> & { userId?: string }
): Promise<{ view: DBProfileView; totalViews: number }> {
  const id = viewData.id || `view-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newView: DBProfileView = {
    id,
    userId: viewData.userId || "candidate-current",
    viewerType: viewData.viewerType || "Recruiter",
    viewerName: viewData.viewerName || "Staff Technical Recruiter",
    viewerCompany: viewData.viewerCompany || "Anthropic AI",
    viewerRole: viewData.viewerRole || "Talent Acquisition Partner",
    viewerAvatar:
      viewData.viewerAvatar ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    source: viewData.source || "Direct Candidate Search",
    viewedAt: viewData.viewedAt || now,
    durationSeconds: viewData.durationSeconds || Math.floor(Math.random() * 85) + 35,
    jobId: viewData.jobId,
    jobTitle: viewData.jobTitle,
    isVerifiedRecruiter: viewData.isVerifiedRecruiter ?? true,
  };

  memoryStore.profileViews.set(newView.id, newView);

  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, "profileViews", newView.id), newView, { merge: true });
    } catch (e) {
      console.error("Firestore recordProfileView error:", e);
    }
  }

  // Sync to PostgreSQL
  pgRecordProfileView(newView).catch((err) => console.warn("[PostgreSQL] recordProfileView sync error:", err));

  return {
    view: newView,
    totalViews: memoryStore.profileViews.size,
  };
}

export async function clearProfileViews(userId?: string): Promise<{ success: boolean; cleared: number }> {
  let count = 0;
  if (userId) {
    for (const [id, view] of memoryStore.profileViews.entries()) {
      if (view.userId === userId) {
        memoryStore.profileViews.delete(id);
        count++;
        if (firestoreDb) {
          deleteDoc(doc(firestoreDb, "profileViews", id)).catch(console.error);
        }
      }
    }
  } else {
    count = memoryStore.profileViews.size;
    const allIds = Array.from(memoryStore.profileViews.keys());
    memoryStore.profileViews.clear();
    if (firestoreDb) {
      for (const id of allIds) {
        deleteDoc(doc(firestoreDb, "profileViews", id)).catch(console.error);
      }
    }
  }

  // Sync to PostgreSQL
  pgClearProfileViews(userId).catch((err) => console.warn("[PostgreSQL] clearProfileViews sync error:", err));

  return { success: true, cleared: count };
}
