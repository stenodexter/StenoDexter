"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Document, Page, pdfjs } from "react-pdf";
import {
  IconSun,
  IconMoon,
  IconChevronUp,
  IconChevronDown,
  IconMinus,
  IconPlus,
} from "@tabler/icons-react";
import { useThemeContext } from "~/providers/theme-provider";

// @ts-ignore
import "react-pdf/dist/Page/AnnotationLayer.css";

// @ts-ignore
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function SecurePdfViewer() {
  const searchParams = useSearchParams();
  const fileUrl = searchParams.get("file") || "";
  const { theme, toggleTheme } = useThemeContext();
  const isDark = theme === "dark";

  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [containerWidth, setContainerWidth] = useState(800);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Theme-driven tokens
  const t = isDark
    ? {
        bg: "#0c0c0f",
        toolbar: "rgba(12,12,15,0.92)",
        border: "#1e1e28",
        text: "#e8e8f0",
        muted: "#8888a8",
        faint: "#44445a",
        cardBg: "#13131a",
        pageBorder: "#1e1e28",
        shadow: "0 8px 48px rgba(0,0,0,0.7)",
        skeletonA: "#1a1a22",
        skeletonB: "#22222e",
        statusDot: "#44cc88",
        statusDotGlow: "#44cc8866",
        statusText: "#33334a",
        badgeBg: "rgba(12,12,15,0.75)",
      }
    : {
        bg: "#f4f4f0",
        toolbar: "rgba(244,244,240,0.92)",
        border: "#ddddd5",
        text: "#1a1a22",
        muted: "#555568",
        faint: "#9999aa",
        cardBg: "#ebebE6",
        pageBorder: "#ddddd5",
        shadow: "0 8px 48px rgba(0,0,0,0.12)",
        skeletonA: "#e4e4de",
        skeletonB: "#d8d8d2",
        statusDot: "#22aa66",
        statusDotGlow: "#22aa6644",
        statusText: "#aaaabc",
        badgeBg: "rgba(244,244,240,0.85)",
      };

  useEffect(() => {
    const measure = () => {
      if (containerRef.current)
        setContainerWidth(Math.min(containerRef.current.clientWidth - 48, 900));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const blockKeys = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "s", "p", "a", "u"].includes(e.key.toLowerCase())
      )
        e.preventDefault();
      if (e.key === "PrintScreen") e.preventDefault();
    };
    const blockContext = (e: MouseEvent) => e.preventDefault();
    const blockDrag = (e: DragEvent) => e.preventDefault();
    document.addEventListener("keydown", blockKeys);
    document.addEventListener("contextmenu", blockContext);
    document.addEventListener("dragstart", blockDrag);
    return () => {
      document.removeEventListener("keydown", blockKeys);
      document.removeEventListener("contextmenu", blockContext);
      document.removeEventListener("dragstart", blockDrag);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = pageRefs.current.indexOf(
              entry.target as HTMLDivElement,
            );
            if (idx !== -1) setCurrentPage(idx + 1);
          }
        });
      },
      { threshold: 0.5 },
    );
    pageRefs.current.forEach((ref) => ref && observer.observe(ref));
    return () => observer.disconnect();
  }, [numPages]);

  const scrollToPage = (p: number) =>
    pageRefs.current[p - 1]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');

        *, *::before, *::after {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          user-select: none !important;
          box-sizing: border-box;
        }
        html, body { margin: 0; padding: 0; }
        .react-pdf__Page__textContent { display: none !important; }
        .react-pdf__Page__annotations { display: none !important; }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${t.bg}; }
        ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 3px; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .skeleton {
          background: linear-gradient(90deg, ${t.skeletonA} 25%, ${t.skeletonB} 50%, ${t.skeletonA} 75%);
          background-size: 400px 100%;
          animation: shimmer 1.4s ease infinite;
          border-radius: 8px;
        }
        .page-wrapper { animation: fadeUp 0.4s ease both; }

        .tb-btn {
          background: none;
          border: 1px solid ${t.border};
          color: ${t.muted};
          border-radius: 8px;
          padding: 6px 10px;
          cursor: pointer;
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
          display: flex; align-items: center; gap: 6px;
          line-height: 1;
        }
        .tb-btn:hover {
          background: ${isDark ? "#1e1e2a" : "#e4e4de"};
          border-color: ${isDark ? "#3a3a50" : "#c8c8c0"};
          color: ${t.text};
        }
        .tb-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .theme-btn {
          background: none;
          border: 1px solid ${t.border};
          color: ${t.muted};
          border-radius: 8px;
          width: 34px; height: 34px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }
        .theme-btn:hover {
          background: ${isDark ? "#1e1e2a" : "#e4e4de"};
          border-color: ${isDark ? "#3a3a50" : "#c8c8c0"};
          color: ${t.text};
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: t.bg,
          display: "flex",
          flexDirection: "column",
          fontFamily: "'DM Mono', monospace",
          transition: "background 0.3s",
        }}
      >
        {/* ── Toolbar ─────────────────────────────────────────────────── */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: t.toolbar,
            backdropFilter: "blur(20px)",
            borderBottom: `1px solid ${t.border}`,
            padding: "0 20px",
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            transition: "background 0.3s, border-color 0.3s",
          }}
        >
          {/* Left: icon + title + page count */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                flexShrink: 0,
                background: isDark ? "#4444ff18" : "#4444ff12",
                border: `1px solid ${isDark ? "#3333aa44" : "#3333aa22"}`,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
              }}
            >
              📄
            </div>
            <span
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 19,
                color: t.text,
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
              }}
            >
              Document Viewer
            </span>
            {!loading && numPages > 0 && (
              <span
                style={{
                  fontSize: 11,
                  color: t.faint,
                  background: isDark ? "#16161e" : "#e8e8e2",
                  border: `1px solid ${t.border}`,
                  borderRadius: 20,
                  padding: "2px 10px",
                  flexShrink: 0,
                }}
              >
                {numPages} pages
              </span>
            )}
          </div>

          {/* Center: page nav */}
          {!loading && numPages > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                className="tb-btn"
                onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
              >
                <IconChevronUp size={14} />
              </button>
              <span
                style={{
                  color: t.muted,
                  fontSize: 12,
                  minWidth: 60,
                  textAlign: "center",
                }}
              >
                {currentPage} / {numPages}
              </span>
              <button
                className="tb-btn"
                onClick={() =>
                  scrollToPage(Math.min(numPages, currentPage + 1))
                }
                disabled={currentPage >= numPages}
              >
                <IconChevronDown size={14} />
              </button>
            </div>
          )}

          {/* Right: zoom + theme toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!loading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  background: isDark ? "#13131a" : "#eaeae4",
                  border: `1px solid ${t.border}`,
                  borderRadius: 10,
                  padding: "3px 6px",
                }}
              >
                <button
                  className="tb-btn"
                  style={{
                    border: "none",
                    padding: "4px 6px",
                    borderRadius: 6,
                  }}
                  onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
                >
                  <IconMinus size={13} />
                </button>
                <span
                  style={{
                    color: t.faint,
                    fontSize: 11,
                    minWidth: 36,
                    textAlign: "center",
                  }}
                >
                  {Math.round(scale * 100)}%
                </span>
                <button
                  className="tb-btn"
                  style={{
                    border: "none",
                    padding: "4px 6px",
                    borderRadius: 6,
                  }}
                  onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
                >
                  <IconPlus size={13} />
                </button>
              </div>
            )}

            {/* Theme toggle — syncs with app theme */}
            <button
              className="theme-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              <IconSun
                size={16}
                style={{
                  position: "absolute",
                  transition: "opacity 0.25s, transform 0.25s",
                  opacity: isDark ? 0 : 1,
                  transform: isDark
                    ? "rotate(90deg) scale(0.4)"
                    : "rotate(0deg) scale(1)",
                }}
              />
              <IconMoon
                size={16}
                style={{
                  position: "absolute",
                  transition: "opacity 0.25s, transform 0.25s",
                  opacity: isDark ? 1 : 0,
                  transform: isDark
                    ? "rotate(0deg) scale(1)"
                    : "rotate(-90deg) scale(0.4)",
                }}
              />
            </button>
          </div>
        </div>

        {/* ── PDF Content ──────────────────────────────────────────────── */}
        <div
          ref={containerRef}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "32px 24px 64px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
          }}
        >
          {loading && (
            <div
              style={{
                width: "100%",
                maxWidth: 900,
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              <div className="skeleton" style={{ height: 560 }} />
              <div className="skeleton" style={{ height: 420 }} />
            </div>
          )}

          <Document
            file={fileUrl}
            onLoadSuccess={({ numPages }) => {
              setNumPages(numPages);
              setLoading(false);
              pageRefs.current = new Array(numPages).fill(null);
            }}
            onLoadError={() => setLoading(false)}
            loading={null}
          >
            {Array.from({ length: numPages }, (_, i) => (
              <div
                key={i}
                ref={(el) => {
                  pageRefs.current[i] = el;
                }}
                className="page-wrapper"
                style={{
                  animationDelay: `${i * 60}ms`,
                  position: "relative",
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: t.shadow,
                  border: `1px solid ${t.pageBorder}`,
                  width: containerWidth * scale,
                  maxWidth: "100%",
                  transition: "box-shadow 0.3s",
                }}
              >
                {/* Page badge */}
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    zIndex: 10,
                    background: t.badgeBg,
                    backdropFilter: "blur(8px)",
                    border: `1px solid ${t.border}`,
                    borderRadius: 6,
                    padding: "2px 8px",
                    fontSize: 10,
                    color: t.faint,
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {i + 1}
                </div>

                <Page
                  pageNumber={i + 1}
                  width={containerWidth * scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />

                {/* Interaction shield */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 5,
                    cursor: "default",
                  }}
                />
              </div>
            ))}
          </Document>
        </div>

        {/* ── Status bar ───────────────────────────────────────────────── */}
        {!loading && (
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              height: 32,
              background: t.toolbar,
              borderTop: `1px solid ${t.border}`,
              display: "flex",
              alignItems: "center",
              padding: "0 24px",
              gap: 10,
              zIndex: 100,
              transition: "background 0.3s",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: t.statusDot,
                boxShadow: `0 0 8px ${t.statusDotGlow}`,
              }}
            />
            <span
              style={{
                fontSize: 10,
                color: t.statusText,
                letterSpacing: "0.08em",
              }}
            >
              PROTECTED · READ ONLY · COPYING DISABLED
            </span>
          </div>
        )}
      </div>
    </>
  );
}
