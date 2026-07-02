import asyncio
import httpx
import re
import urllib.parse
import json

async def main():
    query_ddg = "Hotel Royal Orchid Jaipur"
    ddg_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    async with httpx.AsyncClient(headers=ddg_headers, follow_redirects=True, timeout=10.0) as client:
        search_url = f"https://duckduckgo.com/?q={urllib.parse.quote(query_ddg)}"
        response = await client.get(search_url)
        
        vqd_match = re.search(r'vqd=([0-9-]+)', response.text)
        if not vqd_match:
            vqd_match = re.search(r'vqd=["\']?([a-zA-Z0-9-]+)["\']?', response.text)
            
        if vqd_match:
            vqd = vqd_match.group(1)
            api_url = f"https://duckduckgo.com/d.js?q={urllib.parse.quote(query_ddg)}&vqd={vqd}&s=0&o=json&api=d.js"
            print("Fetching api_url:", api_url)
            api_response = await client.get(api_url)
            print("API Status:", api_response.status_code)
            
            try:
                data = api_response.json()
                results = data.get("results", [])
                if results:
                    print("Found images:", len(results))
                    print("First image:", results[0].get("image"))
                else:
                    print("No images found in JSON")
            except Exception as e:
                print("Error parsing JSON:", e)
                print("Response text:", api_response.text[:200])

asyncio.run(main())
