import { useState } from "react";
import axios from "axios";

interface ScreenshotResponse {
  success: boolean;
  image?: string;
  error?: string;
}

export default function ScreenshotTool() {
  const [url, setUrl] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleScreenshot = async () => {
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setImage(null);

    try {
      const response = await axios.post<ScreenshotResponse>("http://localhost:5000/api/screenshot", {
        url,
      });

      if (response.data.success && response.data.image) {
        setImage(`data:image/png;base64,${response.data.image}`);
      } else {
        setError(response.data.error || "Failed to take screenshot");
      }
    } catch (err: any) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-800 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Website Screenshot</h2>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter URL"
        className="w-full px-4 py-2 mb-4 rounded bg-zinc-700 text-white"
      />
      <button
        onClick={handleScreenshot}
        className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? "Capturing..." : "Capture Screenshot"}
      </button>

      {/* FEEDBACK */}
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {image && !error && (
        <p className="text-green-500 mt-4">✅ Screenshot captured successfully!</p>
      )}
      {image && (
        <div className="mt-6">
          <img src={image} alt="Website Screenshot" className="rounded border" />
        </div>
      )}
    </div>
  );
}
