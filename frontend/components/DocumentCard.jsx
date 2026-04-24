"use client";

import React, { useMemo } from "react";
import { generatePDF } from "@/lib/generatePDF";

const SECTION_ORDER = [
  "Title",
  "Abstract",
  "Introduction",
  "Problem Statement",
  "Solution",
  "Technology Stack",
  "Implementation",
  "Conclusion",
];

function normalizeText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function parseDocument(documentData) {
  const rawTitle = documentData?.title ? String(documentData.title).trim() : "";
  const rawContent = normalizeText(documentData?.content);
  const fullText = rawContent || (rawTitle ? `Title:\n${rawTitle}` : "");

  const sections = {};
  let detectedTitle = rawTitle;

  for (let index = 0; index < SECTION_ORDER.length; index += 1) {
    const sectionName = SECTION_ORDER[index];
    const nextSection = SECTION_ORDER[index + 1];

    const sectionRegex = nextSection
      ? new RegExp(`${sectionName}:\\s*([\\s\\S]*?)\\n${nextSection}:`, "i")
      : new RegExp(`${sectionName}:\\s*([\\s\\S]*)$`, "i");

    const match = fullText.match(sectionRegex);

    if (match) {
      sections[sectionName] = normalizeText(match[1]);
    }
  }

  if (!detectedTitle && sections.Title) {
    detectedTitle = sections.Title.split("\n")[0].trim();
  }

  return {
    title: detectedTitle || "Generated Document",
    content: fullText,
    sections,
  };
}

export default function DocumentCard({ documentData }) {
  const parsed = useMemo(() => parseDocument(documentData), [documentData]);

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1 inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
            Document Generator
          </div>
          <h2 className="break-words text-lg font-semibold text-gray-900 dark:text-white">
            {parsed.title}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => generatePDF(parsed.content)}
          className="shrink-0 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          Download Document
        </button>
      </div>

      <div className="space-y-5">
        {SECTION_ORDER.map((section) => {
          if (section === "Title") {
            return null;
          }

          const value = parsed.sections[section];
          if (!value) {
            return null;
          }

          return (
            <section
              key={section}
              className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/40"
            >
              <h3 className="mb-2 text-sm font-semibold tracking-wide text-gray-900 dark:text-white">
                {section}
              </h3>
              <div className="whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-gray-300">
                {value}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
