'use client';
import { useEffect, useState } from 'react';

interface IntelEntry {
  id: number;
  indicator: string;
  type: string;
  source: string;
  tags: string;
  timestamp: string;
}

export default function IntelViewer() {
  const [intel, setIntel] = useState<IntelEntry[]>([]);

  useEffect(() => {
    fetch('/api/get-intel')
      .then(res => res.json())
      .then(data => setIntel(data))
      .catch(err => console.error('Error fetching threat intel:', err));
  }, []);

  return (
    <div className="p-4 bg-white rounded-xl shadow-xl mt-4">
      <h2 className="text-2xl font-bold mb-4">Threat Intelligence Feed</h2>
      {intel.length === 0 ? (
        <p className="text-gray-500">No intelligence data submitted yet.</p>
      ) : (
        <div className="space-y-3">
          {intel.map(entry => (
            <div key={entry.id} className="border p-3 rounded-lg bg-gray-100">
              <p><strong>Indicator:</strong> {entry.indicator}</p>
              <p><strong>Type:</strong> {entry.type}</p>
              <p><strong>Source:</strong> {entry.source}</p>
              <p><strong>Tags:</strong> {entry.tags}</p>
              <p className="text-sm text-gray-600"><strong>Timestamp:</strong> {entry.timestamp}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
