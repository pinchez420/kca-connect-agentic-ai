"""
Web Search Service for KCA Connect AI
Provides web search and URL fetching capabilities to enhance AI responses
"""
import logging
import requests
from bs4 import BeautifulSoup
from typing import Optional, List, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class WebSearchService:
    def __init__(self):
        self.tavily_api_key = settings.TAVILY_API_KEY
        self.search_enabled = bool(self.tavily_api_key) or True  # Enable even without API for basic search
    
    def search_web(self, query: str, num_results: int = 5) -> List[Dict[str, str]]:
        """
        Search the web using Tavily API or fallback to basic search
        
        Args:
            query: Search query
            num_results: Number of results to return
            
        Returns:
            List of dictionaries containing 'title', 'url', and 'snippet'
        """
        # Try Tavily API first if available
        if self.tavily_api_key:
            try:
                return self._search_tavily(query, num_results)
            except Exception as e:
                logger.error(f"Tavily search failed: {e}")
        
        # Fallback to DuckDuckGo (free, no API key needed)
        return self._search_duckduckgo(query, num_results)
    
    def _search_tavily(self, query: str, num_results: int = 5) -> List[Dict[str, str]]:
        """Search using Tavily API"""
        import json
        
        url = "https://api.tavily.com/search"
        payload = {
            "api_key": self.tavily_api_key,
            "query": query,
            "num_results": num_results,
            "include_answer": True,
            "include_raw_content": False,
            "include_images": False
        }
        
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        results = []
        
        for item in data.get('results', []):
            results.append({
                'title': item.get('title', ''),
                'url': item.get('url', ''),
                'snippet': item.get('content', item.get('snippet', ''))
            })
        
        return results
    
    def _search_duckduckgo(self, query: str, num_results: int = 5) -> List[Dict[str, str]]:
        """Search using DuckDuckGo HTML (free, no API key)"""
        results = []
        
        try:
            url = "https://html.duckduckgo.com/html/"
            params = {
                'q': query,
                'kl': 'us-en'
            }
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            response = requests.get(url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find search results
            for result in soup.select('.result')[:num_results]:
                link_elem = result.select_one('.result__a')
                snippet_elem = result.select_one('.result__snippet')
                
                if link_elem:
                    url = link_elem.get('href', '')
                    title = link_elem.get_text(strip=True)
                    snippet = snippet_elem.get_text(strip=True) if snippet_elem else ''
                    
                    if url and title:
                        results.append({
                            'title': title,
                            'url': url,
                            'snippet': snippet
                        })
            
            logger.info(f"DuckDuckGo search returned {len(results)} results for '{query}'")
            
        except Exception as e:
            logger.error(f"DuckDuckGo search failed: {e}")
        
        return results
    
    def fetch_url_content(self, url: str, max_length: int = 5000) -> Dict[str, Any]:
        """
        Fetch and parse content from a URL
        
        Args:
            url: URL to fetch
            max_length: Maximum characters to return
            
        Returns:
            Dictionary containing 'title', 'content', and 'success' status
        """
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            response = requests.get(url, headers=headers, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove scripts and styles
            for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
                tag.decompose()
            
            # Get title
            title = ''
            if soup.title:
                title = soup.title.get_text(strip=True)
            else:
                title_elem = soup.find('h1')
                if title_elem:
                    title = title_elem.get_text(strip=True)
            
            # Get main content
            content = ''
            
            # Try to find main content areas
            main_elem = soup.find('main') or soup.find('article') or soup.find('div', class_='content')
            
            if main_elem:
                content = main_elem.get_text(separator=' ', strip=True)
            else:
                # Get all paragraph text
                paragraphs = soup.find_all('p')
                content = ' '.join(p.get_text(strip=True) for p in paragraphs)
            
            # Truncate if too long
            if len(content) > max_length:
                content = content[:max_length] + '... (content truncated)'
            
            # Clean up extra whitespace
            content = ' '.join(content.split())
            
            return {
                'success': True,
                'title': title,
                'url': url,
                'content': content
            }
            
        except Exception as e:
            logger.error(f"Failed to fetch URL {url}: {e}")
            return {
                'success': False,
                'title': '',
                'url': url,
                'content': '',
                'error': str(e)
            }
    
    def search_and_summarize(self, query: str) -> str:
        """
        Search the web and provide a summary of results
        
        Args:
            query: Search query
            
        Returns:
            Formatted summary string
        """
        results = self.search_web(query, num_results=3)
        
        if not results:
            return "No search results found."
        
        summary_parts = [f"Search results for '{query}':\n"]
        
        for i, result in enumerate(results, 1):
            summary_parts.append(f"{i}. {result['title']}")
            summary_parts.append(f"   URL: {result['url']}")
            if result['snippet']:
                summary_parts.append(f"   Snippet: {result['snippet'][:200]}...")
            summary_parts.append("")
        
        return '\n'.join(summary_parts)


# Singleton instance
web_search_service = WebSearchService()

