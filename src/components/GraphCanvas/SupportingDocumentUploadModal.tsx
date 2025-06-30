import React, { useState } from "react";
import axios from "axios";

interface SupportingDocumentUploadModalProps {
  open: boolean;
  onClose: () => void;
  graphId: string;
  uploaderEmail: string;
  onSuccess: (doc: any) => void;
}

const SupportingDocumentUploadModal: React.FC<
  SupportingDocumentUploadModalProps
> = ({ open, onClose, graphId, uploaderEmail, onSuccess }) => {
  const [name, setName] = useState("");
  const [type, setType] = useState("document");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <h2 className="text-lg font-semibold mb-4">
          Upload Supporting Document
        </h2>
        {!isReady ? (
          <div className="text-center text-gray-500 py-8">
            Loading required information...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-base font-medium mb-1">Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7283D9]"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-base font-medium mb-1">Type</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7283D9]"
                value={type}
                onChange={(e) => setType(e.target.value)}
                required
              >
                <option value="document">Document</option>
                <option value="image">Image</option>
              </select>
            </div>
            <div>
              <label className="block text-base font-medium mb-1">File</label>
              <input
                type="file"
                className="w-full"
                accept={
                  type === "image"
                    ? "image/*"
                    : ".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                }
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
            </div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-[#232F3E] text-[#F3F4F6] hover:bg-[#1A2330]"
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
