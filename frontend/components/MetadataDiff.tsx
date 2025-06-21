"use client";

import React from "react";

type MetaResult = {
  filename: string;
  metadata: Record<string, any>;
  threats: string[];
  score: "Low" | "Medium" | "High";
  note?: string;
};

type MetadataDiffProps = {
  file1: MetaResult;
  file2: MetaResult;
};

const MetadataDiff: React.FC<MetadataDiffProps> = ({ file1, file2 }) => {
  const categories = ["author", "title", "created", "modified", "subject", "creator", "producer"];

  return (
    <div className="mt-6 p-4 border rounded-lg">
      <h3 className="text-xl font-semibold mb-2">Metadata Diff View</h3>
      <div className="grid grid-cols-3 gap-4 font-mono text-sm">
        <div className="font-bold">Field</div>
        <div className="font-bold">{file1.filename}</div>
        <div className="font-bold">{file2.filename}</div>
        {categories.map((category) => (
          <React.Fragment key={category}>
            <div>{category}</div>
            <div className={file1.metadata[category] !== file2.metadata[category] ? "text-red-600" : ""}>
              {file1.metadata[category] || "No result found"}
            </div>
            <div className={file1.metadata[category] !== file2.metadata[category] ? "text-red-600" : ""}>
              {file2.metadata[category] || "No result found"}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default MetadataDiff;