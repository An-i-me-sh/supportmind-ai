import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { api } from "../api";

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  
  const fetchDocuments = async () => {
    try {
      const data = await api.get("/documents");
      setDocuments(data);
    } catch (err) {
      console.error("Error fetching documents:", err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    // Poll documents status every 4 seconds to catch RAG pipeline completion
    const interval = setInterval(fetchDocuments, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post("/documents/upload", formData);
      fetchDocuments();
    } catch (err) {
      setUploadError(err.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this document? All vector chunks will be permanently purged.")) return;
    try {
      await api.delete(`/documents/${docId}`);
      setDocuments(documents.filter((d) => d.id !== docId));
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  const filteredDocs = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(search.toLowerCase())
  );

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Layout pageTitle="Document Management">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
        {/* Upload panel */}
        <div className="space-y-lg">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm">
            <h3 className="font-headline-md text-headline-md font-bold text-on-surface mb-xs">
              Upload Sources
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-xl">
              Add PDF, DOCX, or TXT documentation to SupportMind AI. The vector engine will index, chunk, and embed the text locally.
            </p>

            <form
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onSubmit={(e) => e.preventDefault()}
              className={`border-2 border-dashed rounded-xl p-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-outline-variant/60 hover:border-primary/50"
              }`}
            >
              <input
                type="file"
                id="file-upload-input"
                className="hidden"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center">
                <span className="material-symbols-outlined text-[48px] text-primary mb-md">
                  cloud_upload
                </span>
                <span className="font-label-md text-label-md text-on-surface font-semibold">
                  Drag & Drop files or <span className="text-primary underline">Browse</span>
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant mt-sm">
                  PDF, DOCX, TXT up to 10MB
                </span>
              </label>
            </form>

            {uploading && (
              <div className="mt-md flex items-center justify-center gap-sm text-primary">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="font-label-md text-label-md">Streaming and embedding document...</span>
              </div>
            )}

            {uploadError && (
              <div className="mt-md p-md bg-error-container/10 border border-error/20 text-error text-body-sm rounded-lg">
                {uploadError}
              </div>
            )}
          </div>
        </div>

        {/* List panel */}
        <div className="lg:col-span-2 space-y-lg">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md mb-xl">
              <div>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
                  Documentation Library
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Manage uploaded knowledge files used for customer support completions.
                </p>
              </div>

              {/* Search bar */}
              <div className="relative w-full md:w-[260px]">
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline-variant text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search files..."
                  className="w-full h-10 pl-10 pr-md bg-transparent border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface focus:border-primary input-halo transition-all outline-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Documents Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant uppercase font-semibold">
                    <th className="py-md px-sm">File Details</th>
                    <th className="py-md px-sm">File Size</th>
                    <th className="py-md px-sm">Indexing Status</th>
                    <th className="py-md px-sm">Date Added</th>
                    <th className="py-md px-sm text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-primary-container/5 transition-colors">
                      <td className="py-md px-sm">
                        <div className="flex items-center gap-sm">
                          <span className="material-symbols-outlined text-primary text-[24px]">
                            {doc.file_type === "PDF" ? "picture_as_pdf" : "description"}
                          </span>
                          <span className="font-label-md text-label-md font-bold text-on-surface truncate max-w-[200px]" title={doc.filename}>
                            {doc.filename}
                          </span>
                        </div>
                      </td>
                      <td className="py-md px-sm font-label-sm text-label-sm">
                        {formatBytes(doc.file_size)}
                      </td>
                      <td className="py-md px-sm">
                        <span
                          className={`px-sm py-[2px] rounded-full font-label-sm text-label-sm ${
                            doc.status === "completed"
                              ? "bg-primary-container/10 text-primary-container"
                              : doc.status === "processing"
                              ? "bg-secondary-container/10 text-secondary-container animate-pulse"
                              : "bg-error-container/10 text-error"
                          }`}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-md px-sm font-label-sm text-label-sm">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-md px-sm text-right">
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-sm text-error hover:bg-error-container/10 rounded-lg active:scale-95 duration-200 cursor-pointer"
                          title="Purge Document"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredDocs.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-xl text-center text-on-surface-variant font-label-md">
                        No documentation found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
