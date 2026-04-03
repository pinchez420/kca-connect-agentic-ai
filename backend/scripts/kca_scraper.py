import asyncio
import httpx
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import os
import sys
import tempfile
import logging
import re
from typing import Set, List, Dict, Any

# Add the parent directory to sys.path to allow importing app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.ingest_service import ingest_service
from app.services.web_search_service import web_search_service
from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("kca_scraper")

class KCAScraper:
    def __init__(self, base_url: str = "https://www.kca.ac.ke/", max_depth: int = 3, max_pages: int = 100):
        self.base_url = base_url
        self.max_depth = max_depth
        self.max_pages = max_pages
        self.visited_urls: Set[str] = set()
        self.queued_urls: List[tuple] = [(base_url, 0)] # (url, depth)
        self.client = httpx.AsyncClient(timeout=30.0, follow_redirects=True, verify=False)
        self.pages_processed = 0

    async def is_valid_url(self, url: str) -> bool:
        """Check if URL is within the target domain and not already visited."""
        parsed = urlparse(url)
        # Allow any kca.ac.ke or kcau.ac.ke subdomain
        is_kca = parsed.netloc.endswith("kca.ac.ke") or parsed.netloc.endswith("kcau.ac.ke")
        
        # Exclude dynamic/noise URLs
        exclude_patterns = [
            r"add-to-cart=",
            r"wp-json",
            r"\?replytocom",
            r"xmlrpc\.php",
            r"/cart/",
            r"/checkout/",
            r"/my-account/",
            r"logout",
            r"login"
        ]
        is_noisy = any(re.search(pattern, url) for pattern in exclude_patterns)
        
        return is_kca and not is_noisy and url not in self.visited_urls

    async def extract_links(self, html: str, current_url: str, current_depth: int):
        """Extract all internal links from the page."""
        if current_depth >= self.max_depth:
            return

        soup = BeautifulSoup(html, 'html.parser')
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']
            url = urljoin(current_url, href)
            # Remove fragments
            url = url.split('#')[0]
            
            if await self.is_valid_url(url):
                self.queued_urls.append((url, current_depth + 1))

    async def process_html(self, url: str, html: str):
        """Extract text from HTML and ingest."""
        logger.info(f"Processing HTML: {url}")
        soup = BeautifulSoup(html, 'html.parser')
        
        # Remove scripts and styles
        for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
            tag.decompose()
            
        title = soup.title.string if soup.title else url
        content = soup.get_text(separator=' ', strip=True)
        
        if content:
            result = await ingest_service.process_text(
                text=content,
                source=url,
                metadata={"title": title, "type": "web_page"}
            )
            return result
        return None

    async def process_file(self, url: str, content: bytes, extension: str):
        """Download remote file to temp and process using IngestService logic."""
        logger.info(f"Processing {extension.upper()} file: {url}")
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
            
        try:
            from langchain_community.document_loaders import PyPDFLoader
            from langchain_core.documents import Document
            
            extracted_text = ""
            if extension == ".pdf":
                loader = PyPDFLoader(tmp_path)
                docs = loader.load()
                extracted_text = "\n\n".join([d.page_content for d in docs])
            elif extension == ".xlsx":
                # Reuse IngestService's internal method
                extracted_text = ingest_service._extract_xlsx_text(tmp_path)
                
            if extracted_text:
                result = await ingest_service.process_text(
                    text=extracted_text,
                    source=url,
                    metadata={"filename": os.path.basename(url), "type": "document"}
                )
                return result
        except Exception as e:
            logger.error(f"Error extracting from {url}: {e}")
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        return None

    async def run(self):
        """Main loop for the crawler."""
        logger.info(f"Starting crawl of {self.base_url} (Max Depth: {self.max_depth}, Max Pages: {self.max_pages})")
        
        while self.queued_urls and self.pages_processed < self.max_pages:
            url, depth = self.queued_urls.pop(0)
            
            if url in self.visited_urls:
                continue
                
            self.visited_urls.add(url)
            self.pages_processed += 1
            
            try:
                response = await self.client.get(url)
                if response.status_code != 200:
                    continue
                    
                content_type = response.headers.get("content-type", "").lower()
                
                # Check extension from URL if content-type is generic
                is_pdf = "application/pdf" in content_type or url.lower().endswith(".pdf")
                is_xlsx = "spreadsheet" in content_type or "excel" in content_type or url.lower().endswith(".xlsx")
                
                if is_pdf:
                    await self.process_file(url, response.content, ".pdf")
                elif is_xlsx:
                    await self.process_file(url, response.content, ".xlsx")
                elif "text/html" in content_type:
                    html_content = response.text
                    await self.process_html(url, html_content)
                    await self.extract_links(html_content, url, depth)
                
                # Small delay to be polite
                await asyncio.sleep(0.5)
                
            except Exception as e:
                logger.error(f"Failed to process {url}: {e}")

        logger.info(f"Crawl complete. Processed {self.pages_processed} pages.")
        await self.client.aclose()

if __name__ == "__main__":
    # Get max_pages and max_depth from args if provided
    depth = int(sys.argv[1]) if len(sys.argv) > 1 else 2
    pages = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    
    scraper = KCAScraper(max_depth=depth, max_pages=pages)
    asyncio.run(scraper.run())
