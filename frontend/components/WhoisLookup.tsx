"use client";

import React, { useState } from "react";

export default function WhoisLookup() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleLookup = async () => {
    if (!domain.includes(".")) {
      setError("Please enter a valid domain.");
      return;
    }

    setError("");
    setResult(null);

    try {
        const response = await fetch("http://127.0.0.1:5000/api/whois-lookup", {
        method: "POST",
            headers: {
        "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain }),
        });
        console.log("WHOIS lookup sent to backend with:", domain);

      const data = await response.json();

      if (data.success) {
        setResult(data.result);
      } else {
        setError("WHOIS lookup failed.");
      }
    } catch (err) {
      setError("Error contacting backend.");
    }
  };

  return (
    <div className="bg-gray-900 text-white p-6 mt-10 rounded shadow-lg max-w-xl mx-auto">
      <h3 className="text-xl font-semibold mb-4">🌐 WHOIS Lookup</h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          className="flex-1 px-4 py-2 bg-gray-800 text-white rounded border border-gray-700"
        />
        <button
          onClick={handleLookup}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
        >
          Lookup
        </button>
      </div>

      {error && <p className="text-red-400 mt-4">{error}</p>}

      {result && (
        <div className="mt-4 bg-black/30 p-4 rounded text-sm whitespace-pre-wrap text-left">
        {Object.entries(result).map(([key, val]) => (
        <div key={key}>
         <strong>{key}</strong>: {Array.isArray(val) ? val.join(", ") : (val ?? "N/A")}
        </div>
        ))}
        </div>
      )}
    </div>
  );
}
