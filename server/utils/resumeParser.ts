import zlib from "zlib";

/**
 * Standard list of tech, ML, and algorithmic skills recognized by MOAS.
 */
export const KNOWN_TECHNICAL_SKILLS = [
  "Python",
  "PyTorch",
  "TensorFlow",
  "Scikit-Learn",
  "Keras",
  "Machine Learning",
  "Deep Learning",
  "Computer Vision",
  "NLP",
  "Natural Language Processing",
  "LLMs",
  "Transformers",
  "LangChain",
  "vLLM",
  "Data Science",
  "Pandas",
  "NumPy",
  "OpenCV",
  "TypeScript",
  "JavaScript",
  "React",
  "Next.js",
  "Node.js",
  "Express",
  "HTML5",
  "CSS3",
  "TailwindCSS",
  "Redux",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "SQLite",
  "SQL",
  "Docker",
  "Kubernetes",
  "AWS",
  "GCP",
  "Azure",
  "Linux",
  "Git",
  "CI/CD",
  "GitHub Actions",
  "REST APIs",
  "GraphQL",
  "Microservices",
  "System Design",
  "Distributed Systems",
  "Algorithms",
  "Data Structures",
  "Java",
  "C++",
  "C#",
  "Go",
  "Rust",
  "Swift",
  "Kotlin",
];

/**
 * Extracts raw text from a PDF buffer.
 */
export function extractTextFromPdf(buffer: Buffer): string {
  try {
    const rawContent = buffer.toString("latin1");
    const textPieces: string[] = [];

    // 1. Look for stream blocks (often compressed or uncompressed)
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match: RegExpExecArray | null;

    while ((match = streamRegex.exec(rawContent)) !== null) {
      const streamData = match[1];
      // Try to inflate if FlateDecode
      let decoded = streamData;
      try {
        const streamBuffer = Buffer.from(streamData, "latin1");
        const inflated = zlib.inflateSync(streamBuffer);
        decoded = inflated.toString("utf8");
      } catch {
        // Not deflated or raw text
      }

      // Extract text in parenthesis: (Hello World) Tj or [(Hello) -10 (World)] TJ
      const parenRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
      let pMatch: RegExpExecArray | null;
      while ((pMatch = parenRegex.exec(decoded)) !== null) {
        textPieces.push(pMatch[1]);
      }

      const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
      let tjMatch: RegExpExecArray | null;
      while ((tjMatch = tjArrayRegex.exec(decoded)) !== null) {
        const inner = tjMatch[1];
        const innerParenRegex = /\(([^)]+)\)/g;
        let ipMatch: RegExpExecArray | null;
        while ((ipMatch = innerParenRegex.exec(inner)) !== null) {
          textPieces.push(ipMatch[1]);
        }
      }
    }

    // 2. If stream parsing didn't find much, extract readable ASCII words from the whole buffer
    if (textPieces.length < 5) {
      const words = rawContent.match(/[A-Za-z0-9+#.-]{3,}/g) || [];
      const filtered = words.filter(
        (w) =>
          !w.startsWith("obj") &&
          !w.startsWith("endobj") &&
          !w.startsWith("xref") &&
          !w.startsWith("trailer") &&
          !w.startsWith("FlateDecode") &&
          w.length < 30
      );
      return filtered.join(" ");
    }

    // Clean up escaped sequences
    return textPieces
      .join(" ")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\t/g, " ")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return "";
  }
}

/**
 * Extracts raw text from a DOCX buffer by unzipping word/document.xml.
 */
export function extractTextFromDocx(buffer: Buffer): string {
  try {
    // Basic ZIP entry search for word/document.xml
    // Local file header signature: 0x04034b50 (PK\x03\x04)
    let offset = 0;
    while (offset < buffer.length - 30) {
      if (
        buffer[offset] === 0x50 &&
        buffer[offset + 1] === 0x4b &&
        buffer[offset + 2] === 0x03 &&
        buffer[offset + 3] === 0x04
      ) {
        const compressionMethod = buffer.readUInt16LE(offset + 8);
        const compressedSize = buffer.readUInt32LE(offset + 18);
        const filenameLen = buffer.readUInt16LE(offset + 26);
        const extraLen = buffer.readUInt16LE(offset + 28);

        const filename = buffer
          .subarray(offset + 30, offset + 30 + filenameLen)
          .toString("utf8");

        const dataStart = offset + 30 + filenameLen + extraLen;

        if (filename === "word/document.xml") {
          const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);
          let xmlContent = "";
          if (compressionMethod === 8) {
            // Deflated
            xmlContent = zlib.inflateRawSync(compressedData).toString("utf8");
          } else if (compressionMethod === 0) {
            // Stored
            xmlContent = compressedData.toString("utf8");
          }

          // Strip XML tags, keeping text content
          const textMatches = xmlContent.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || [];
          const text = textMatches
            .map((t) => t.replace(/<[^>]+>/g, ""))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();

          if (text.length > 0) {
            return text;
          }
        }

        offset = dataStart + compressedSize;
      } else {
        offset++;
      }
    }

    // Fallback: extract XML-like words
    const content = buffer.toString("utf8");
    const tagMatches = content.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || [];
    return tagMatches
      .map((t) => t.replace(/<[^>]+>/g, ""))
      .join(" ")
      .trim();
  } catch {
    return "";
  }
}

/**
 * Extracts technical skills from text using regex boundary matching.
 */
export function extractSkillsFromText(text: string): string[] {
  if (!text) return [];

  const foundSkills = new Set<string>();
  const normalizedText = ` ${text} `.toLowerCase();

  for (const skill of KNOWN_TECHNICAL_SKILLS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Match with boundary or non-word symbols to support C++, C#, etc.
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9#+])${escaped}(?:$|[^a-zA-Z0-9#+])`, "i");
    if (regex.test(normalizedText)) {
      foundSkills.add(skill);
    }
  }

  return Array.from(foundSkills);
}

/**
 * Compares parsed resume skills with target job requirements or role.
 */
export function compareSkillsWithRequirements(
  resumeSkills: string[],
  requiredSkills: string[]
): {
  matchedSkills: string[];
  missingSkills: string[];
  matchScore: number;
} {
  if (!requiredSkills || requiredSkills.length === 0) {
    return {
      matchedSkills: resumeSkills,
      missingSkills: [],
      matchScore: 85,
    };
  }

  const normalizedResumeSkills = new Set(resumeSkills.map((s) => s.toLowerCase().trim()));
  const matched: string[] = [];
  const missing: string[] = [];

  for (const req of requiredSkills) {
    const norm = req.toLowerCase().trim();
    if (normalizedResumeSkills.has(norm)) {
      matched.push(req);
    } else {
      missing.push(req);
    }
  }

  const ratio = matched.length / requiredSkills.length;
  // Score between 65 and 98
  const matchScore = Math.min(98, Math.max(65, Math.round(ratio * 33 + 65)));

  return {
    matchedSkills: matched,
    missingSkills: missing,
    matchScore,
  };
}
