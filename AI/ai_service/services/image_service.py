import logging
import urllib.parse
import re
import httpx

logger = logging.getLogger("services.image_service")

class ImageService:
    async def generate_cover_image(self, destination: str) -> str:
        """
        Searches Wikimedia Commons Page/File search first (for authentic landmark photos),
        falls back to DuckDuckGo search, and finally falls back to curated Unsplash categories.
        """
        clean_query = destination.replace("Visit ", "").replace("Explore ", "").replace("Discover ", "").strip()
        
        # 1. Curated Fallbacks based on query keywords to prevent generic beach/backpack placeholders
        query_lower = clean_query.lower()
        fallback_url = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80" # Default travel backpack
        
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

        # 2. Try Wikimedia Commons search first (Authentic, Fast & Open API)
        headers = {
            "User-Agent": "WanderwiseTravelApp/1.0 (contact@wanderwise.com)"
        }
        try:
            wiki_url = f"https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&generator=search&gsrnamespace=6&gsrsearch={urllib.parse.quote(clean_query)}&gsrlimit=1&prop=imageinfo&iiprop=url"
            logger.info(f"Checking Wikimedia Commons for authentic image of '{clean_query}'...")
            
            async with httpx.AsyncClient(timeout=8.0) as client:
                wiki_res = await client.get(wiki_url, headers=headers)
                if wiki_res.status_code == 200:
                    wiki_data = wiki_res.json()
                    pages = wiki_data.get("query", {}).get("pages", [])
                    if pages and "imageinfo" in pages[0]:
                        img_url = pages[0]["imageinfo"][0]["url"]
                        if img_url.startswith("http") and img_url.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                            logger.info(f"Found authentic Wikimedia image for '{clean_query}': {img_url}")
                            return img_url
        except Exception as e:
            logger.warning(f"Wikimedia Commons API query failed: {e}")

        # 3. Fallback to DuckDuckGo Image Search
        ddg_headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        query_ddg = clean_query
        try:
            async with httpx.AsyncClient(headers=ddg_headers, follow_redirects=True, timeout=10.0) as client:
                logger.info(f"Searching DuckDuckGo Images for: '{query_ddg}'")
                search_url = f"https://duckduckgo.com/?q={urllib.parse.quote(query_ddg)}"
                response = await client.get(search_url)
                
                if response.status_code == 200:
                    vqd_match = re.search(r'vqd=([0-9-]+)', response.text)
                    if not vqd_match:
                        vqd_match = re.search(r'vqd=["\']?([a-zA-Z0-9-]+)["\']?', response.text)
                    
                    if vqd_match:
                        vqd = vqd_match.group(1)
                        api_url = f"https://duckduckgo.com/d.js?q={urllib.parse.quote(query_ddg)}&vqd={vqd}&s=0&o=json&api=d.js"
                        api_response = await client.get(api_url)
                        
                        if api_response.status_code == 200:
                            data = api_response.json()
                            results = data.get("results", [])
                            for item in results[:5]:
                                img_url = item.get("image")
                                if img_url and img_url.startswith("http") and img_url.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                                    logger.info(f"Found DuckDuckGo image for '{clean_query}': {img_url}")
                                    return img_url
        except Exception as e:
            logger.warning(f"DuckDuckGo search failed: {e}")

        # 4. Return curated, beautiful Unsplash fallback matching the category
        logger.info(f"All image search APIs failed. Returning curated category fallback: {fallback_url}")
        return fallback_url

image_service = ImageService()
