import fs from "fs";
import path from "path";
import crypto from "crypto";
import { logger } from "./logger.js";

// Storage root directories
const ROOT_DIR = process.cwd();
const STORAGE_BASE = path.join(ROOT_DIR, "uploads");
export const RESUMES_STORAGE_DIR = path.join(STORAGE_BASE, "resumes");
export const AVATARS_STORAGE_DIR = path.join(STORAGE_BASE, "avatars");

// Ensure storage directories exist with restricted permissions
export function initStorageDirectories(): void {
  try {
    if (!fs.existsSync(STORAGE_BASE)) {
      fs.mkdirSync(STORAGE_BASE, { recursive: true, mode: 0o700 });
    }
    if (!fs.existsSync(RESUMES_STORAGE_DIR)) {
      fs.mkdirSync(RESUMES_STORAGE_DIR, { recursive: true, mode: 0o700 });
    }
    if (!fs.existsSync(AVATARS_STORAGE_DIR)) {
      fs.mkdirSync(AVATARS_STORAGE_DIR, { recursive: true, mode: 0o700 });
    }
  } catch (err) {
    logger.error("[Storage] Failed to initialize storage directories:", err);
  }
}

// Ensure directories are initialized on load
initStorageDirectories();

// File size limits
export const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export type AllowedResumeType = "PDF" | "DOCX";
export type AllowedImageType = "JPEG" | "PNG" | "WEBP";

export interface FileValidationResult {
  valid: boolean;
  detectedType?: AllowedResumeType | AllowedImageType;
  mimeType?: string;
  error?: string;
}

/**
 * Validates a resume file buffer: checks size, magic bytes, and disallows dangerous content.
 */
export function validateResumeBuffer(buffer: Buffer, originalFilename: string): FileValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Empty file provided." };
  }

  if (buffer.length > MAX_RESUME_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 5 MB limit (file size: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  // Sanitize filename and check extension
  const ext = path.extname(originalFilename || "").toLowerCase();
  if (ext !== ".pdf" && ext !== ".docx") {
    return {
      valid: false,
      error: "Invalid file format. Only PDF (.pdf) and Microsoft Word (.docx) documents are supported.",
    };
  }

  // Check Magic Bytes
  // PDF Magic Bytes: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
  const isPdfMagic =
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d;

  // DOCX Magic Bytes: PK\x03\x04 (0x50, 0x4B, 0x03, 0x04) - ZIP container header
  const isZipMagic =
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04;

  if (ext === ".pdf") {
    if (!isPdfMagic) {
      return {
        valid: false,
        error: "File content does not match a valid PDF document (magic bytes verification failed).",
      };
    }
    return {
      valid: true,
      detectedType: "PDF",
      mimeType: "application/pdf",
    };
  }

  if (ext === ".docx") {
    if (!isZipMagic) {
      return {
        valid: false,
        error: "File content does not match a valid DOCX document (zip header verification failed).",
      };
    }
    // Verify it is a Word document ZIP by searching for "[Content_Types].xml" or "word/"
    const bufferSlice = buffer.subarray(0, Math.min(buffer.length, 4096)).toString("latin1");
    if (!bufferSlice.includes("[Content_Types].xml") && !bufferSlice.includes("word/")) {
      return {
        valid: false,
        error: "File is a zip container but not a valid Word (.docx) document.",
      };
    }
    return {
      valid: true,
      detectedType: "DOCX",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }

  return { valid: false, error: "Unsupported file type." };
}

/**
 * Validates an avatar image buffer: checks size and image magic bytes.
 */
export function validateAvatarBuffer(buffer: Buffer): FileValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Empty image file provided." };
  }

  if (buffer.length > MAX_AVATAR_SIZE_BYTES) {
    return {
      valid: false,
      error: `Image size exceeds the 2 MB limit (size: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  // Magic Bytes:
  // JPEG: FF D8 FF
  const isJpeg =
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  // WEBP: "RIFF" .... "WEBP"
  const isWebp =
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  if (isJpeg) {
    return { valid: true, detectedType: "JPEG", mimeType: "image/jpeg" };
  }
  if (isPng) {
    return { valid: true, detectedType: "PNG", mimeType: "image/png" };
  }
  if (isWebp) {
    return { valid: true, detectedType: "WEBP", mimeType: "image/webp" };
  }

  return {
    valid: false,
    error: "Invalid image format. Only JPEG, PNG, and WebP images are allowed (SVG and scripts are blocked).",
  };
}

/**
 * Saves a validated resume buffer to private storage using a random UUID key.
 */
export async function saveResumeFile(
  buffer: Buffer,
  userId: string,
  extension: string
): Promise<{ storageKey: string; filePath: string }> {
  initStorageDirectories();

  const safeExt = extension.startsWith(".") ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
  const randomUuid = crypto.randomUUID();
  const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const storageKey = `resume_${sanitizedUserId}_${randomUuid}${safeExt}`;

  // Prevent path traversal
  const resolvedPath = path.resolve(RESUMES_STORAGE_DIR, storageKey);
  if (!resolvedPath.startsWith(RESUMES_STORAGE_DIR)) {
    throw new Error("Security Violation: Path traversal detected.");
  }

  await fs.promises.writeFile(resolvedPath, buffer, { mode: 0o600 });
  return { storageKey, filePath: resolvedPath };
}

/**
 * Saves a validated avatar buffer to avatar storage using a random UUID key.
 */
export async function saveAvatarFile(
  buffer: Buffer,
  userId: string,
  imageType: AllowedImageType
): Promise<{ storageKey: string; filePath: string }> {
  initStorageDirectories();

  const extMap: Record<AllowedImageType, string> = {
    JPEG: ".jpg",
    PNG: ".png",
    WEBP: ".webp",
  };
  const ext = extMap[imageType] || ".jpg";
  const randomUuid = crypto.randomUUID();
  const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const storageKey = `avatar_${sanitizedUserId}_${randomUuid}${ext}`;

  const resolvedPath = path.resolve(AVATARS_STORAGE_DIR, storageKey);
  if (!resolvedPath.startsWith(AVATARS_STORAGE_DIR)) {
    throw new Error("Security Violation: Path traversal detected.");
  }

  await fs.promises.writeFile(resolvedPath, buffer, { mode: 0o600 });
  return { storageKey, filePath: resolvedPath };
}

/**
 * Reads a resume file from private storage.
 */
export async function readResumeFile(storageKeyOrPath: string): Promise<Buffer | null> {
  const filename = path.basename(storageKeyOrPath);
  const resolvedPath = path.resolve(RESUMES_STORAGE_DIR, filename);

  if (!resolvedPath.startsWith(RESUMES_STORAGE_DIR)) {
    throw new Error("Security Violation: Path traversal detected.");
  }

  if (!fs.existsSync(resolvedPath)) {
    return null;
  }

  return await fs.promises.readFile(resolvedPath);
}

/**
 * Reads an avatar file from avatar storage.
 */
export async function readAvatarFile(storageKeyOrPath: string): Promise<Buffer | null> {
  const filename = path.basename(storageKeyOrPath);
  const resolvedPath = path.resolve(AVATARS_STORAGE_DIR, filename);

  if (!resolvedPath.startsWith(AVATARS_STORAGE_DIR)) {
    throw new Error("Security Violation: Path traversal detected.");
  }

  if (!fs.existsSync(resolvedPath)) {
    return null;
  }

  return await fs.promises.readFile(resolvedPath);
}

/**
 * Deletes a file from storage.
 */
export async function deleteStorageFile(storageDir: string, storageKeyOrPath: string): Promise<boolean> {
  if (!storageKeyOrPath) return false;
  try {
    const filename = path.basename(storageKeyOrPath);
    const resolvedPath = path.resolve(storageDir, filename);

    if (!resolvedPath.startsWith(storageDir)) {
      throw new Error("Security Violation: Path traversal detected.");
    }

    if (fs.existsSync(resolvedPath)) {
      await fs.promises.unlink(resolvedPath);
      return true;
    }
  } catch (err) {
    logger.warn(`[Storage] Failed to delete file ${storageKeyOrPath}:`, err);
  }
  return false;
}
