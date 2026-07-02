/**
 * Hugging Face Service Proxy
 * Delegates cover image generation to the FastAPI AI microservice.
 */
export const huggingFaceService = {
  generateDestinationImage: async (destination) => {
    const aiBaseUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    try {
      const response = await fetch(`${aiBaseUrl}/api/v1/ai/cover-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination }),
      });
      
      if (!response.ok) {
        throw new Error(`FastAPI returned HTTP ${response.status}`);
      }

      const json = await response.json();
      return json?.data?.coverImage || "";
    } catch (error) {
      console.error("[Backend Cover Proxy] Failed to fetch cover image from FastAPI:", error.message);
      // Fallback search cover
      return `https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80&sig=${encodeURIComponent(destination)}`;
    }
  }
};
