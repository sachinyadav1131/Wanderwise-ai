import logging
import urllib.parse
import httpx
import os

logger = logging.getLogger("services.image_service")

class ImageService:
    async def generate_cover_image(self, destination: str) -> str:
        """
        Fetches authentic landmark/destination cover photos using:
          1. Wikipedia REST Summary API (fastest & most accurate for authentic landmarks)
          2. Pexels Image API
          3. Curated Unsplash topic fallbacks
        """
        clean_query = destination.replace("Visit ", "").replace("Explore ", "").replace("Discover ", "").strip()
        query_lower = clean_query.lower()

        # Category Fallbacks
        fallback_url = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80"
        if any(k in query_lower for k in ["temple", "mandir", "ghat", "imambara", "mosque", "tomb", "church", "cathedral", "monument"]):
            fallback_url = "https://images.unsplash.com/photo-1604580864964-0462f5d5b1a8?w=1200&q=80"
        elif any(k in query_lower for k in ["fort", "palace", "castle", "heritage", "kothi", "residency", "ruin", "arch"]):
            fallback_url = "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200&q=80"
        elif any(k in query_lower for k in ["zoo", "safari", "animal", "wildlife"]):
            fallback_url = "https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=1200&q=80"
        elif any(k in query_lower for k in ["park", "garden", "sanctuary", "forest", "vihar", "lawn"]):
            fallback_url = "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80"
        elif any(k in query_lower for k in ["valley", "hill", "nature", "trail", "pass", "mountain", "peak"]):
            fallback_url = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80"
        elif any(k in query_lower for k in ["market", "street", "mall", "bazaar", "road", "shop"]):
            fallback_url = "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=1200&q=80"
        elif any(k in query_lower for k in ["water", "lake", "river", "spring", "falls", "waterfall", "beach", "sea"]):
            fallback_url = "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80"
        elif any(k in query_lower for k in ["museum", "exhibition", "gallery", "university", "college"]):
            fallback_url = "https://images.unsplash.com/photo-1566121318599-79a0cfdd50af?w=1200&q=80"
        elif any(k in query_lower for k in ["cafe", "restaurant", "food", "dinner", "lunch", "breakfast", "sweet"]):
            fallback_url = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80"

        headers = {"User-Agent": "WanderwiseTravelApp/1.0 (contact@wanderwise.com)"}

        # ── 1. Wikipedia Summary REST API ──────────────────────────────────────
        try:
            wiki_api = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(clean_query)}"
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(wiki_api, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    img_src = data.get("originalimage", {}).get("source") or data.get("thumbnail", {}).get("source")
                    if img_src and img_src.startswith("http"):
                        logger.info(f"Found Wikipedia cover photo for '{clean_query}': {img_src}")
                        return img_src
        except Exception as e:
            logger.warning(f"Wikipedia REST API lookup failed for '{clean_query}': {e}")

        # ── 2. Pexels API ──────────────────────────────────────────────────────
        pexels_key = os.getenv("PEXELS_API_KEY", "WrSsfxXTP2bzx3nartEgbBMBfIfkkiI2vct2NYu1SiKm8ZMkTJGC7JUV")
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                search_url = f"https://api.pexels.com/v1/search?query={urllib.parse.quote(clean_query)}&per_page=3"
                px_headers = {"Authorization": pexels_key}
                response = await client.get(search_url, headers=px_headers)
                if response.status_code == 200:
                    photos = response.json().get("photos", [])
                    if photos:
                        img_url = photos[0]["src"]["landscape"]
                        logger.info(f"Found Pexels cover image for '{clean_query}': {img_url}")
                        return img_url
        except Exception as e:
            logger.warning(f"Pexels API search failed: {e}")

        return fallback_url

image_service = ImageService()
