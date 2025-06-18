"use client";

import React from "react";

interface MetadataDiffProps {
  file1: {
    filename: string;
    metadata: { [key: string]: any };
  };
  file2: {
    filename: string;
    metadata: { [key: string]: any };
  };
}

const MetadataDiff: React.FC<MetadataDiffProps> = ({ file1, file2 }) => {
  const keys = Array.from(new Set([...Object.keys(file1.metadata), ...Object.keys(file2.metadata)]));

  return (
    <div className="mt-6 p-4 border rounded-lg">
      <h3 className="text-xl font-semibold mb-2">Metadata Diff View</h3>
      <div className="grid grid-cols-3 gap-4 font-mono text-sm">
        <div className="font-bold">Field</div>
        <div className="font-bold">{file1.filename}</div>
        <div className="font-bold">{file2.filename}</div>

        {keys.map((key) => (
          <React.Fragment key={key}>
            <div>{key}</div>
            <div className={file1.metadata[key] !== file2.metadata[key] ? "text-red-600" : ""}>
              {file1.metadata[key] ?? "-"}
            </div>
            <div className={file1.metadata[key] !== file2.metadata[key] ? "text-red-600" : ""}>
              {file2.metadata[key] ?? "-"}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default MetadataDiff;
