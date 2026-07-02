import asyncio
import os
import sys

# Add AI service to path
sys.path.append(os.path.abspath("."))
from services.image_service import image_service

async def main():
    img_url = await image_service.generate_cover_image("Hotel Royal Orchid Jaipur")
    print("Found URL:", img_url)

asyncio.run(main())
