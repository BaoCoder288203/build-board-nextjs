"use client";

import {
  Download,
  FileText,
  Film,
  ImageIcon,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  deleteAttachment,
  fetchAttachments,
  formatBytes,
  uploadAttachment,
  type TaskAttachment,
} from "@/lib/attachments";
import { toastFromError, toastSuccess } from "@/lib/toast";

type Props = {
  taskId: string;
  onCountChange?: (count: number) => void;
};

function typeIcon(fileType: TaskAttachment["fileType"]) {
  if (fileType === "IMAGE") return ImageIcon;
  if (fileType === "VIDEO") return Film;
  return FileText;
}

function typeTint(fileType: TaskAttachment["fileType"]) {
  if (fileType === "IMAGE") return "bg-sky-100 text-sky-700";
  if (fileType === "VIDEO") return "bg-violet-100 text-violet-700";
  return "bg-amber-100 text-amber-800";
}

export function TaskAttachmentPanel({ taskId, onCountChange }: Props) {
  const [items, setItems] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;

  const load = useCallback(async () => {
    try {
      const { items: next } = await fetchAttachments(taskId);
      setItems(next);
      onCountChangeRef.current?.(next.length);
    } catch (error) {
      toastFromError(error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading(true);
    try {
      for (const file of list) {
        await uploadAttachment(taskId, file);
      }
      toastSuccess(list.length === 1 ? "File attached" : "Files attached");
      await load();
    } catch (error) {
      toastFromError(error);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Remove this attachment?")) return;
    setBusyId(id);
    try {
      await deleteAttachment(id);
      toastSuccess("Attachment removed");
      await load();
    } catch (error) {
      toastFromError(error);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-bb-border bg-bb-sky/40 px-3 py-4 text-sm text-bb-muted">
        Loading attachments...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-bb-muted" aria-hidden />
          <h3 className="text-sm font-bold text-bb-ink">
            Attachments
            {items.length > 0 ? (
              <span className="ml-1 font-semibold text-bb-muted">
                ({items.length})
              </span>
            ) : null}
          </h3>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" aria-hidden />
          {uploading ? "Uploading..." : "Add"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          onChange={(e) => {
            if (e.target.files) void uploadFiles(e.target.files);
          }}
        />
      </div>

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) {
            void uploadFiles(e.dataTransfer.files);
          }
        }}
        className={`rounded-xl border border-dashed px-3 py-4 text-center transition ${
          dragOver
            ? "border-bb-blue bg-bb-sky"
            : "border-bb-border bg-[#F8F9FB]"
        }`}
      >
        <p className="text-sm font-semibold text-bb-ink">
          Drop files here, or{" "}
          <button
            type="button"
            className="text-bb-blue underline-offset-2 hover:underline"
            onClick={() => inputRef.current?.click()}
          >
            browse
          </button>
        </p>
        <p className="mt-1 text-[11px] text-bb-muted">
          Images & docs up to 10MB · Videos up to 100MB
        </p>
      </div>

      {items.length === 0 ? (
        <p className="px-1 text-center text-sm text-bb-muted">
          No attachments yet
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const Icon = typeIcon(item.fileType);
            const isImage = item.fileType === "IMAGE";
            const href = item.fileUrl || item.url;
            return (
              <li
                key={item.id}
                className="group flex gap-3 rounded-xl border border-bb-border bg-white p-2.5 shadow-sm transition hover:border-bb-blue/30"
              >
                {isImage ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-bb-sky ring-1 ring-bb-border/60"
                    title="Preview"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.thumbnailUrl || href}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </a>
                ) : (
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg ${typeTint(item.fileType)}`}
                  >
                    <Icon className="h-6 w-6" aria-hidden />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-bb-ink">
                    {item.originalName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-bb-muted">
                    {item.fileType.toLowerCase()} · {formatBytes(item.size)}
                    {item.uploader ? ` · ${item.uploader.fullName}` : ""}
                    {" · "}
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-3">
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-bb-blue hover:underline"
                    >
                      Open
                    </a>
                    <a
                      href={href}
                      download={item.originalName}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-bb-muted hover:text-bb-ink"
                    >
                      <Download className="h-3 w-3" aria-hidden />
                      Download
                    </a>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => void onDelete(item.id)}
                  className="self-start rounded-lg p-1.5 text-bb-muted opacity-70 transition hover:bg-bb-danger-bg hover:text-bb-danger group-hover:opacity-100"
                  aria-label="Delete attachment"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
