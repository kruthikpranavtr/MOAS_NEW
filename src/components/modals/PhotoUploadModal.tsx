import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Upload,
  Image as ImageIcon,
  X,
  Check,
  RotateCcw,
  AlertCircle,
  Sparkles,
  Video,
  VideoOff,
} from "lucide-react";

interface PhotoUploadModalProps {
  isOpen: boolean;
  currentPhotoUrl: string;
  onClose: () => void;
  onPhotoSelected: (photoUrl: string) => void;
}

// Curated professional tech avatars for quick library selection
const PRESET_LIBRARY_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=faces",
];

export const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  isOpen,
  currentPhotoUrl,
  onClose,
  onPhotoSelected,
}) => {
  const [activeTab, setActiveTab] = useState<"library" | "camera">("library");
  const [selectedPhoto, setSelectedPhoto] = useState<string>(currentPhotoUrl);
  const [isDragging, setIsDragging] = useState(false);

  // Live Camera states
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera helper
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  // Start live camera
  const startCamera = async () => {
    setCameraError(null);
    setCapturedPhoto(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Live camera is not supported on this browser or device.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 640 },
          facingMode: "user",
        },
        audio: false,
      });

      setCameraStream(stream);
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      let errorMsg = "Unable to access the camera.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMsg = "Camera access was denied. Please allow camera permissions in your browser.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorMsg = "No camera found on this device.";
      } else if (err.message) {
        errorMsg = err.message;
      }
      setCameraError(errorMsg);
      setIsCameraActive(false);
    }
  };

  // Switch tabs
  const handleTabChange = (tab: "library" | "camera") => {
    setActiveTab(tab);
    if (tab === "camera") {
      startCamera();
    } else {
      stopCamera();
      setCapturedPhoto(null);
    }
  };

  // Clean up camera on close / unmount
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedPhoto(null);
      setCountdown(null);
    } else {
      setSelectedPhoto(currentPhotoUrl);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Connect stream to video element when it becomes available
  useEffect(() => {
    if (isCameraActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch((e) => console.warn("Auto-play error:", e));
    }
  }, [isCameraActive, cameraStream]);

  // Capture photo from live video feed
  const takeSnapshot = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const size = Math.min(video.videoWidth, video.videoHeight) || 480;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Center crop square
    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;

    // Flip horizontally for natural mirror feel
    ctx.translate(size, 0);
    ctx.scale(-1, 1);

    ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedPhoto(dataUrl);
    setSelectedPhoto(dataUrl);
    stopCamera();
  };

  // Countdown capture
  const handleCaptureWithTimer = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          takeSnapshot();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // File upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please choose a valid image file (PNG, JPG, JPEG, WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setSelectedPhoto(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === "string") {
          setSelectedPhoto(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApply = () => {
    if (selectedPhoto) {
      onPhotoSelected(selectedPhoto);
      stopCamera();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Update Profile Photo</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose an image from your library or capture one live
            </p>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => handleTabChange("library")}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "library"
                  ? "bg-white text-teal-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Photo Library / Upload</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("camera")}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "camera"
                  ? "bg-white text-teal-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Live Camera</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === "library" ? (
            /* TAB 1: Library & File Upload */
            <div className="space-y-5">
              {/* Drag and drop upload zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                  isDragging
                    ? "border-teal-500 bg-teal-50/50"
                    : "border-slate-200 hover:border-teal-400 bg-slate-50/70"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mx-auto mb-3 text-teal-700">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  Click to browse or drag & drop your photo
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Supports PNG, JPG, JPEG, WEBP (Max 5MB)
                </p>
                <button
                  type="button"
                  className="mt-3 px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors pointer-events-none"
                >
                  Choose From Device
                </button>
              </div>

              {/* Preset Avatar Gallery */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>Or Select from Library Presets</span>
                  </label>
                </div>
                <div className="grid grid-cols-6 gap-2.5">
                  {PRESET_LIBRARY_AVATARS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedPhoto(url)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                        selectedPhoto === url
                          ? "border-teal-600 ring-2 ring-teal-500/30 scale-105"
                          : "border-slate-200 hover:border-teal-300"
                      }`}
                    >
                      <img
                        src={url}
                        alt={`Preset ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      {selectedPhoto === url && (
                        <div className="absolute inset-0 bg-teal-800/40 flex items-center justify-center text-white">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: Live Camera */
            <div className="space-y-4">
              {cameraError ? (
                <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">Camera Unavailable</h4>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">{cameraError}</p>
                  </div>
                  <div className="pt-2 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Try Again
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabChange("library")}
                      className="px-3.5 py-1.5 bg-white border border-amber-300 text-amber-800 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                      Use Library Instead
                    </button>
                  </div>
                </div>
              ) : capturedPhoto ? (
                /* Captured Frame Preview */
                <div className="text-center space-y-4">
                  <div className="relative w-56 h-56 mx-auto rounded-3xl overflow-hidden border-4 border-teal-600 shadow-lg">
                    <img
                      src={capturedPhoto}
                      alt="Captured snapshot"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-teal-600 text-white text-[10px] font-bold rounded-full shadow-xs">
                      Photo Captured
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retake Photo</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Live Camera Stream */
                <div className="space-y-4">
                  <div className="relative w-full aspect-square max-w-[280px] mx-auto rounded-3xl overflow-hidden bg-slate-900 border-2 border-slate-800 shadow-inner flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover -scale-x-100"
                    />

                    {/* Circular Avatar Framing Guide */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-48 rounded-full border-2 border-dashed border-teal-400/70 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]" />
                    </div>

                    {/* Countdown Overlay */}
                    {countdown !== null && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-20">
                        <span className="text-6xl font-black text-white animate-ping">
                          {countdown}
                        </span>
                      </div>
                    )}

                    {/* Live Indicator */}
                    <div className="absolute top-3 left-3 px-2 py-0.5 bg-red-600 text-white rounded-full text-[10px] font-bold tracking-wider flex items-center gap-1.5 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span>LIVE CAM</span>
                    </div>
                  </div>

                  {/* Camera Controls */}
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={takeSnapshot}
                      className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Snap Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCaptureWithTimer}
                      disabled={countdown !== null}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      3s Timer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Current Selection Live Preview */}
          <div className="pt-4 border-t border-slate-100 flex items-center gap-4 bg-slate-50 p-3.5 rounded-2xl">
            <div className="relative shrink-0">
              <img
                src={selectedPhoto}
                alt="Selected preview"
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-xs"
              />
              <span className="absolute -bottom-1 -right-1 p-0.5 bg-teal-600 text-white rounded-full">
                <Check className="w-3 h-3" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800">Preview Profile Photo</p>
              <p className="text-[11px] text-slate-500 truncate">
                This image will appear across your applications, resume, and dashboard
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Photo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
