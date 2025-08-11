import React, { useState } from "react";
import axios from "axios";

interface SupportingDocumentUploadModalProps {
  open: boolean;
  onClose: () => void;
  graphId: string;
  uploaderEmail: string;
  onSuccess: (doc: any) => void;
  onUploadStart?: () => void;
}

const SupportingDocumentUploadModal: React.FC<
  SupportingDocumentUploadModalProps
> = ({ open, onClose, graphId, uploaderEmail, onSuccess, onUploadStart }) => {
  const [name, setName] = useState("");
  const [type, setType] = useState("document");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const [confidence, setConfidence] = useState(0.5);

  if (!open) return null;

  // If required fields are missing, show loading or disable Save
  const isReady = Boolean(graphId && uploaderEmail);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name || !type || !file) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    try {
      // 1. Upload file
      const formData = new FormData();
      formData.append("file", file);
      const accessToken = localStorage.getItem("access_token");
      if (!accessToken) {
        throw new Error("No access token found");
      }

      // Notify parent that upload is starting (right before the actual API call)
      onUploadStart?.();

      const uploadRes = await axios.post(
        "/api/supporting-documents/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const url = uploadRes.data.url;
      // 2. Save metadata
      const metaRes = await axios.post(
        "/api/supporting-documents",
        {
          graph_id: graphId,
          name,
          type,
          url,
          uploader_email: uploaderEmail,
          // confidence,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      onSuccess(metaRes.data.document);
      setName("");
      setType("document");
      setFile(null);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div
        className="bg-white rounded-lg shadow-lg w-full max-w-md p-8 relative"
        style={{ fontFamily: "DM Sans, sans-serif" }}
      >
        <h2 className="text-2xl font-bold mb-2 text-black">
          Upload Supporting Document
        </h2>
        <p className="text-black text-lg mb-6 font-normal">
          Add a document or image
        </p>

        {!isReady ? (
          <div className="text-center text-gray-600 py-8">
            <p className="text-lg font-normal">
              Loading required information...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col gap-4">
              <label
                className="text-black text-base font-medium"
                htmlFor="name"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-md placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ color: "#000000", fontWeight: 500 }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Research Paper"
                required
              />
            </div>

            <div className="flex flex-col gap-4">
              <label
                className="text-black text-base font-medium"
                htmlFor="type"
              >
                Type
              </label>
              <select
                id="type"
                className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ color: "#000000", fontWeight: 500 }}
                value={type}
                onChange={(e) => setType(e.target.value)}
                required
              >
                <option value="document">Document</option>
                <option value="image">Image</option>
              </select>
            </div>

            <div className="flex flex-col gap-4">
              <label
                className="text-black text-base font-medium"
                htmlFor="file"
              >
                File
              </label>
              <input
                id="file"
                type="file"
                className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ color: "#000000", fontWeight: 500 }}
                accept={
                  type === "image"
                    ? ".jpg,.jpeg,.png,.gif,.bmp,.webp,.tiff,.svg,image/*"
                    : ".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.bmp,.webp,.tiff,.svg"
                }
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0] || null;
                  setFile(selectedFile);
                  if (selectedFile) {
                    // Auto-detect type based on file extension/mimetype
                    const ext = selectedFile.name
                      .split(".")
                      .pop()
                      ?.toLowerCase();
                    const imageExts = [
                      "jpg",
                      "jpeg",
                      "png",
                      "gif",
                      "bmp",
                      "webp",
                      "tiff",
                      "svg",
                    ];
                    if (
                      selectedFile.type.startsWith("image/") ||
                      (ext && imageExts.includes(ext))
                    ) {
                      setType("image");
                    } else {
                      setType("document");
                    }
                  }
                }}
                required
              />
            </div>

            {/* <div className="flex flex-col gap-4">
              <label
                className="text-black text-base font-medium"
                htmlFor="confidence"
              >
                Confidence
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="confidence"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={confidence}
                  onChange={(e) => setConfidence(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#7283D9]"
                />
                <span className="text-base text-gray-600 w-12 text-right font-medium">
                  {Math.round(confidence * 100)}%
                </span>
              </div>
            </div> */}

            {error && (
              <div className="text-red-500 text-sm font-medium">{error}</div>
            )}

            <div className="flex gap-4 justify-end">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-medium"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#232F3E] text-white rounded-md hover:bg-[#1A2330] transition-colors font-medium"
                disabled={loading || !isReady}
              >
                {loading ? "Uploading..." : "Save"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SupportingDocumentUploadModal;
