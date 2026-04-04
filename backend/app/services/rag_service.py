import logging
import asyncio
import re
import json
from typing import List, Optional, Dict, Any, Tuple

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_cerebras import ChatCerebras
from langchain_groq import ChatGroq
from langchain_core.documents import Document
from qdrant_client import QdrantClient
from flashrank import Ranker, RerankRequest

from app.core.config import settings
from app.services.web_search_service import web_search_service
from app.services.qdrant_service import qdrant_service
from app.core.prompts import RAG_SYSTEM_PROMPT, FALLBACK_PROMPT

logger = logging.getLogger(__name__)

def _fix_merged_words(text: str) -> str:
    """
    Fix merged words from PDF extraction (e.g. "RequirementsTo" -> "Requirements To")
    Also fixes issues where header text runs into content like "## HeaderText" -> "## Header Text"
    """
    if not text:
        return text
    
    # Fix lowercase followed by uppercase (e.g., "RequirementsTo" -> "Requirements To")
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
    # Fix uppercase sequence followed by lowercase (e.g., "SYSTEMSIf" -> "SYSTEMS If")
    text = re.sub(r'([A-Z])([A-Z][a-z])', r'\1 \2', text)
    
    # Fix Markdown headers that run into content without space
    # ##HeaderText -> ## Header Text
    text = re.sub(r'(#{1,6})([A-Z])', r'\1 \2', text)
    
    # Fix case where lowercase word runs into uppercase (e.g., "andUniversity" -> "and University")
    text = re.sub(r'([a-z])([A-Z][a-z]+)', r'\1 \2', text)
    
    # Collapse multiple spaces into single space
    text = re.sub(r' {2,}', ' ', text)
    
    return text

def _clean_markdown_headers(text: str) -> str:
    """
    Clean and normalize Markdown headers from document chunks.
    Converts header syntax to cleaner text format to prevent them
    from appearing in AI responses.
    """
    if not text:
        return text
    
    # Define the header replacement pattern
    # #### Header -> **Header:** (bold with colon)
    # ### Header -> **Header:** (bold with colon)
    # ## Header -> **Header** (bold without colon)
    # # Header -> **Header** (bold without colon)
    
    # Completely remove lines that look like a Markdown header (likely redundant names/titles)
    # This prevents the LLM from seeing "Header" then "Body" with the same name.
    text = re.sub(r'^#{1,6}\s*(.+?)$', r'', text, flags=re.MULTILINE)
    
    # Remove leading/trailing whitespace after removing headers
    text = text.strip()
    
    return text

def _format_document_context(docs: list) -> str:
    """
    Format document chunks with proper separation to prevent words running together.
    Ensures each chunk ends with proper punctuation before joining.
    """
    if not docs:
        return ""
    
    formatted_chunks = []
    for doc in docs:
        content = doc.page_content.strip()
        # Fix merged words from PDF extraction
        content = _fix_merged_words(content)
        # Clean Markdown headers to prevent them appearing in AI responses
        content = _clean_markdown_headers(content)
        # Ensure each chunk ends with proper punctuation
        if content and content[-1] not in '.!?。':
            content = content + '.'
        formatted_chunks.append(content)
    
    # Join with double newlines and separator for clear separation
    return "\n\n---\n\n".join(formatted_chunks)

class RagService:
    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(model_name=settings.EMBEDDING_MODEL)
        self.client = QdrantClient(url=settings.QDRANT_URL)
        
        # Ensure collection exists
        try:
            # all-MiniLM-L6-v2 uses 384 dimensions
            qdrant_service.create_collection_if_not_exists(vector_size=384)
        except Exception as e:
            logger.warning(f"Could not ensure Qdrant collection in RagService init: {e}")

        self.vector_store = QdrantVectorStore(
            client=self.client,
            collection_name=settings.COLLECTION_NAME,
            embedding=self.embeddings,
        )
        
        # Initialize LLMs in order of priority
        self.llms = self._initialize_llms()
        # Primary LLM for quick access
        self.llm = self.llms[0] if self.llms else None
        
        # Initialize FlashRank for reranking
        # Uses a lightweight model (e.g., ms-marco-TinyBERT-L-2-v2)
        try:
            self.ranker = Ranker()
        except Exception as e:
            logger.warning(f"Failed to initialize FlashRank: {e}. Reranking will be disabled.")
            self.ranker = None

        # Use centralized prompt from prompts.py
        self.system_prompt = RAG_SYSTEM_PROMPT

    def _initialize_llms(self) -> List[Any]:
        """Initialize all configured LLMs and return them in priority order"""
        llms = []
        
        # Priority order based on user preference or availability
        providers = ["groq", "cerebras", "gemini"]
        
        # Reorder if a default is set
        default = settings.DEFAULT_LLM.lower()
        if default in providers:
            providers.remove(default)
            providers.insert(0, default)
            
        for provider in providers:
            try:
                if provider == "groq" and settings.GROQ_API_KEY:
                    logger.info("Initializing Groq LLM (llama-3.3-70b-versatile)")
                    llms.append(ChatGroq(
                        model="llama-3.3-70b-versatile",
                        groq_api_key=settings.GROQ_API_KEY,
                        temperature=0.3,
                    ))
                elif provider == "cerebras" and settings.CEREBRAS_API_KEY:
                    logger.info("Initializing Cerebras LLM (llama3.1-8b)")
                    llms.append(ChatCerebras(
                        model="llama3.1-8b",
                        cerebras_api_key=settings.CEREBRAS_API_KEY,
                        temperature=0.3,
                    ))
                elif provider == "gemini" and settings.GOOGLE_API_KEY:
                    logger.info("Initializing Gemini LLM (gemini-1.5-flash)")
                    llms.append(ChatGoogleGenerativeAI(
                        model="gemini-1.5-flash",
                        google_api_key=settings.GOOGLE_API_KEY,
                        temperature=0.3,
                    ))
            except Exception as e:
                logger.error(f"Failed to initialize {provider} LLM: {e}")
                
        return llms

    def search_with_scores(self, query: str, k: int = 4):
        """Retrieve relevant documents from vector store with similarity scores"""
        try:
            if hasattr(self.vector_store, 'similarity_search_with_score'):
                results = self.vector_store.similarity_search_with_score(query, k=k)
                return results
            else:
                docs = self.vector_store.similarity_search(query, k=k)
                return [(doc, 1.0) for doc in docs]
        except Exception as e:
            logger.error(f"Error during vector search: {e}")
            return []

    def hybrid_search(self, query: str, k: int = 5, fetch_k: int = 20):
        """
        Perform hybrid search with reranking.
        1. Retrieve a larger set of candidates (fetch_k) using vector search.
        2. Rerank the candidates using FlashRank.
        3. Return the top k results.
        """
        try:
            # 1. Retrieve candidates
            candidates = self.search_with_scores(query, k=fetch_k)
            if not candidates:
                return []
            
            if not self.ranker:
                # Fallback to standard vector search if ranker not available
                return [doc for doc, score in candidates[:k]]

            # 2. Prepare for reranking
            passages = [
                {"id": str(i), "text": doc.page_content, "meta": doc.metadata} 
                for i, (doc, score) in enumerate(candidates)
            ]
            
            rerank_request = RerankRequest(query=query, passages=passages)
            
            # 3. Rerank
            reranked_results = self.ranker.rerank(rerank_request)
            
            # 4. Format results
            final_results = []
            for result in reranked_results[:k]:
                # Reconstruct document
                doc = Document(page_content=result['text'], metadata=result['meta'])
                final_results.append(doc)
            
            logger.info(f"Hybrid search returned {len(final_results)} reranked documents")
            return final_results

        except Exception as e:
            logger.error(f"Error during hybrid search: {e}")
            # Fallback
            return [doc for doc, score in self.search_with_scores(query, k=k)]

    def search(self, query: str, k: int = 5):
        """Retrieve relevant documents using hybrid search"""
        # We can now use hybrid search as the default
        return self.hybrid_search(query, k=k)

    def _evaluate_relevance(self, query: str, search_results: List[Tuple[Document, float]], threshold: float = 0.3) -> bool:
        """Internal helper to determine if search results are relevant enough for RAG"""
        if not search_results:
            return False
            
        # Check if query looks like a name search - be more lenient
        is_name_search = bool(re.search(r'^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$', query.strip())) or \
                         bool(re.search(r'\bcontact\b|\bphone\b|\bemail\b', query.lower()))
        
        effective_threshold = 0.10 if is_name_search else threshold
        
        # Check top result score
        best_score = search_results[0][1]
        
        if best_score >= effective_threshold:
            if is_name_search:
                logger.info(f"Name-based match found with score {best_score}")
            return True
            
        # For name searches, always use RAG if we have any results
        if is_name_search:
            logger.info(f"Name search '{query}' - using RAG with best effort")
            return True
            
        # If no results meet threshold, but we have some, still use RAG as best effort
        logger.info(f"Using RAG with best effort - best score: {best_score}")
        return True

    def should_use_rag(self, query: str, relevance_threshold: float = 0.3) -> bool:
        """Check if query should use RAG based on document relevance scores"""
        try:
            results = self.search_with_scores(query, k=5)
            return self._evaluate_relevance(query, results, relevance_threshold)
        except Exception as e:
            logger.error(f"Error checking relevance: {e}")
            return False

    def search_web(self, query: str, num_results: int = 3) -> str:
        """
        Search the web and return formatted results
        
        Args:
            query: Search query
            num_results: Number of results to return
            
        Returns:
            Formatted web search results string
        """
        try:
            results = web_search_service.search_web(query, num_results)
            
            if not results:
                return ""
            
            formatted_results = []
            for i, result in enumerate(results, 1):
                formatted_results.append(f"{i}. {result.get('title', 'No title')}")
                formatted_results.append(f"   URL: {result.get('url', '')}")
                if result.get('snippet'):
                    formatted_results.append(f"   Summary: {result['snippet'][:150]}...")
                formatted_results.append("")
            
            logger.info(f"Web search returned {len(results)} results for '{query}'")
            return "\n".join(formatted_results)
            
        except Exception as e:
            logger.error(f"Web search failed: {e}")
            return ""

    def _should_search_web(self, query: str) -> bool:
        """
        Determine if a query should trigger web search
        
        Args:
            query: User query
            
        Returns:
            True if web search should be performed
        """
        # Keywords that suggest current/real-time information is needed
        current_keywords = [
            'news', 'latest', 'recent', 'current', 'today', 'tomorrow',
            '2024', '2025', '2023', 'deadline', 'announcement',
            'update', 'status', 'now', 'this week', 'this month'
        ]
        
        query_lower = query.lower()
        
        # Check for current information keywords
        for keyword in current_keywords:
            if keyword in query_lower:
                return True
        
        # Check for question marks suggesting information seeking
        if '?' in query and len(query.split()) > 4:
            return True
        
        return False

    def _extract_key_topics(self, text: str) -> list:
        """Extract key topics/entities from text that might be referenced later"""
        # Common KCA-related keywords to look for
        kca_keywords = [
            "kca", "kca university", "university", "admission", "admissions",
            "course", "courses", "program", "programs", "degree", "degrees",
            "fee", "fees", "tuition", "payment", "scholarship", "scholarships",
            "exam", "exams", "examination", "timetable", "schedule", "semester",
            "student", "students", "faculty", "department", "school", "institute",
            "campus", "library", "hostel", "accommodation", "graduation", "alumni"
        ]
        
        text_lower = text.lower()
        found_topics = []
        
        # 1. Check for predefined keywords
        for keyword in kca_keywords:
            if keyword in text_lower:
                found_topics.append(keyword)
        
        # 2. Extract specific subjects from user queries in history
        # Look for patterns like "about [Subject]", "is [Subject]", "for [Subject]"
        # We use a more inclusive regex and prioritize these over generic keywords
        subject_patterns = [
            r'about\s+([a-z0-9\s\-]+?)(?:\s+info|\s+information|\?|$)',
            r'is\s+([a-z0-9\s\-]+?)(?:\?|$)',
            r'for\s+([a-z0-9\s\-]+?)(?:\?|$)',
            r'date\s+of\s+([a-z0-9\s\-]+?)(?:\?|$)',
            r'who\s+is\s+([a-z\s]+?)(?:\?|$)'
        ]
        
        specific_subjects = []
        for pattern in subject_patterns:
            matches = re.finditer(pattern, text_lower)
            for match in matches:
                subject = match.group(1).strip()
                # Avoid very long strings or generic keywords or very short ones
                if 3 < len(subject) < 50 and subject not in kca_keywords:
                    specific_subjects.append(subject)
        
        # Combine topics, prioritizing specific subjects at the end (for key_topics[-1])
        return found_topics + specific_subjects

    def _contextualize_query(self, query: str, history: list) -> str:
        """Enhance query with context from conversation history"""
        if not history or len(history) == 0:
            return query
        
        # Check if query contains ambiguous references
        ambiguous_patterns = [
            r'\bit\b', r'\bits\b', r'\bthey\b', r'\bthem\b', r'\btheir\b',
            r'\bthis\b', r'\bthat\b', r'\bthese\b', r'\bthose\b',
            r'\bhe\b', r'\bshe\b', r'\bhim\b', r'\bher\b',
            r'\bhere\b', r'\bthere\b', r'\bthe\b',  # "the university", "the course"
        ]
        
        has_ambiguous_reference = any(re.search(pattern, query, re.IGNORECASE) for pattern in ambiguous_patterns)
        
        # Also check for very short queries (likely follow-ups)
        is_short_query = len(query.split()) <= 3
        
        if not has_ambiguous_reference and not is_short_query:
            return query
        
        # Build context from history
        context_parts = []
        recent_history = history[-4:]  # Use last 4 messages for context
        
        for msg in recent_history:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            if content.strip():
                context_parts.append(f"{role}: {content}")
        
        # Extract key topics from history
        all_history_text = " ".join([msg.get('content', '') for msg in history])
        key_topics = self._extract_key_topics(all_history_text)
        
        # If we have key topics and ambiguous query, try to expand it
        if key_topics and (has_ambiguous_reference or is_short_query):
            # Create an expanded query that includes context
            history_context = " ".join(context_parts[-2:])  # Last 2 messages for immediate context
            
            # Check if query is asking about history
            if re.search(r'\bhistory\b', query, re.IGNORECASE):
                # Look for university/institution mentions in history
                if 'kca' in all_history_text.lower() or 'university' in all_history_text.lower():
                    expanded = f"KCA University history"
                    logger.info(f"Contextualized query: '{query}' -> '{expanded}'")
                    return expanded
            
            # Check if query is asking about fees/costs
            if re.search(r'\bfee[s]?\b|\bcost\b|\bprice\b|\bpayment\b', query, re.IGNORECASE):
                if 'course' in all_history_text.lower() or 'program' in all_history_text.lower():
                    expanded = f"KCA University course fees"
                    logger.info(f"Contextualized query: '{query}' -> '{expanded}'")
                    return expanded
            
            # Check if query is asking about requirements/admission
            if re.search(r'\brequirement[s]?\b|\badmission[s]?\b|\bapply\b|\bapplication\b', query, re.IGNORECASE):
                expanded = f"KCA University admission requirements"
                logger.info(f"Contextualized query: '{query}' -> '{expanded}'")
                return expanded
            
            # For other ambiguous queries, prepend key topics
            if key_topics and is_short_query:
                # Prioritize the most recent topic found in the history
                main_topic = key_topics[-1]
                expanded = f"{main_topic} {query}"
                logger.info(f"Contextualized query: '{query}' -> '{expanded}' using topic '{main_topic}'")
                return expanded
        
        return query

    async def _evaluate_answer(self, question: str, answer: str, context: str) -> dict:
        """
        Self-reflection: Evaluate the answer quality using the LLM.
        Returns a score (0-1) and feedback.
        """
        if not self.llm:
            return {"score": 1.0, "feedback": "LLM not available for evaluation."}

        try:
            prompt = f"""Evaluate the quality of the following answer to the user's question, based on the provided context.
            
            Question: {question}
            Context: {context[:2000]}... (truncated)
            Answer: {answer}
            
            Rate the answer on a scale from 0 to 1 (1 being perfect). Consider:
            1. Accuracy: Does it answer the question using the context?
            2. Groundedness: Is it supported by the context?
            3. Completeness: Does it address the full question?
            
            Return ONLY a valid JSON object: {{"score": float, "feedback": "string", "needs_rewrite": bool}}
            """
            
            response = await self.llm.ainvoke(prompt)
            content = response.content if hasattr(response, 'content') else str(response)
            
            # Extract JSON
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
            else:
                return {"score": 0.5, "feedback": "Could not parse evaluation", "needs_rewrite": False}
                
        except Exception as e:
            logger.error(f"Error during self-reflection: {e}")
            return {"score": 1.0, "feedback": "Evaluation failed", "needs_rewrite": False}

    def get_answer(self, query: str, history: Optional[List[Dict[str, str]]] = None) -> str:
        """Get answer using RAG pipeline with conversation context"""
        try:
            # Contextualize the query using conversation history
            original_query = query
            if history:
                query = self._contextualize_query(query, history)
            
            # Format history for the prompt
            history_text = ""
            if history:
                history_text = "\n".join([
                    f"{'User' if msg.get('role') == 'user' else 'Assistant'}: {msg.get('content', '')}"
                    for msg in history[-6:]
                ])
            
            # Check if we should search the web
            should_search_web = self._should_search_web(original_query)
            web_context = ""
            if should_search_web:
                web_context = self.search_web(query)
            
            # 1. Fetch documents for RAG (Search once)
            # Increase k for name searches to ensure we get both role and contact info
            k = 8 if any(word in original_query.lower() for word in ["contact", "phone", "email"]) else 5
            
            # Get candidates with scores to evaluate relevance
            candidates_with_scores = self.search_with_scores(query, k=max(k, 5))
            use_rag = self._evaluate_relevance(query, candidates_with_scores)
            
            # If not relevant enough and we have web context, use that instead
            if not use_rag:
                if not web_context:
                    web_context = self.search_web(query)
                
                # Fallback mechanism for LLM calls
                for i, current_llm in enumerate(self.llms):
                    try:
                        prompt = FALLBACK_PROMPT.format(
                            history=history_text,
                            web_context=web_context if web_context else 'No web search results available.',
                            question=original_query
                        )
                        response = current_llm.invoke(prompt)
                        if hasattr(response, 'content'):
                            return response.content
                        return str(response)
                    except Exception as e:
                        # Fallback if quota exceeded OR if this is a secondary LLM that failed for any reason
                        if i < len(self.llms) - 1:
                            if "RESOURCE_EXHAUSTED" in str(e) or "429" in str(e):
                                logger.warning(f"LLM {i} quota exceeded, trying fallback...")
                                continue
                            else:
                                logger.error(f"LLM {i} failed with error: {e}. Trying fallback...")
                                continue
                        raise e
                return "I couldn't find any relevant information."

            # 2. Proceed with RAG using hybrid search (reuse candidates if possible, but hybrid_search does fetch_k)
            # Actually, hybrid_search calls search_with_scores internally. 
            # To be truly efficient, we should refactor hybrid_search to accept candidates.
            # For now, let's just use the hybrid search which is already better than multiple separate searches.
            docs = self.hybrid_search(query, k=k)
            context = _format_document_context(docs)
            
            # Fallback mechanism for RAG LLM calls
            for i, current_llm in enumerate(self.llms):
                try:
                    prompt = self.system_prompt.format(
                        context=context,
                        web_context=web_context if web_context else "No web search results available.",
                        history=history_text,
                        question=original_query
                    )
                    response = current_llm.invoke(prompt)
                    if hasattr(response, 'content'):
                        return response.content
                    return str(response)
                except Exception as e:
                    # Fallback if quota exceeded OR if this is a secondary LLM that failed for any reason
                    if i < len(self.llms) - 1:
                        if "RESOURCE_EXHAUSTED" in str(e) or "429" in str(e):
                            logger.warning(f"LLM {i} quota exceeded, trying fallback...")
                            continue
                        else:
                            logger.error(f"LLM {i} failed with error: {e}. Trying fallback...")
                            continue
                    raise e
            
            # If all LLMs fail, but we have context, show context as a fallback
            return f"Based on the available information from your documents:\n\n{context}\n\n(Note: AI is currently at its limit, showing raw info.)"
                
        except Exception as e:
            logger.error(f"Error generating answer: {e}")
            if "RESOURCE_EXHAUSTED" in str(e) or "429" in str(e):
                return "The AI is currently at its limit (Quota Exceeded). Please try again in a moment."
            return "I encountered an error while processing your question. Please try again later."

    async def get_answer_stream(self, query: str, history: Optional[List[Dict[str, str]]] = None):
        """Get answer using RAG pipeline with streaming support and conversation context"""
        try:
            # Contextualize the query using conversation history
            original_query = query
            if history:
                query = self._contextualize_query(query, history)
            
            # Format history for the prompt
            history_text = ""
            if history:
                history_text = "\n".join([
                    f"{'User' if msg.get('role') == 'user' else 'Assistant'}: {msg.get('content', '')}"
                    for msg in history[-6:]
                ])
            
            # Check if we should search the web
            should_search_web = self._should_search_web(original_query)
            web_context = ""
            if should_search_web:
                web_context = self.search_web(query)
            
            # Fetch for relevance check
            candidates_with_scores = self.search_with_scores(query, k=5)
            use_rag = self._evaluate_relevance(query, candidates_with_scores)
            
            if not use_rag:
                if not web_context:
                    web_context = self.search_web(query)
                
                # Fallback mechanism for streaming
                for i, current_llm in enumerate(self.llms):
                    try:
                        prompt = FALLBACK_PROMPT.format(
                            history=history_text,
                            web_context=web_context if web_context else 'No web search results available.',
                            question=original_query
                        )
                        async for chunk in current_llm.astream(prompt):
                            content = ""
                            if hasattr(chunk, 'content'):
                                content = chunk.content
                            elif isinstance(chunk, str):
                                content = chunk
                            else:
                                content = str(chunk)
                            
                            for char in content:
                                yield char
                                await asyncio.sleep(0.01)
                        return # Successfully streamed
                    except Exception as e:
                        if i < len(self.llms) - 1:
                            if "RESOURCE_EXHAUSTED" in str(e) or "429" in str(e):
                                logger.warning(f"LLM {i} quota exceeded, trying fallback for stream...")
                                continue
                            else:
                                logger.error(f"LLM {i} failed with error: {e}. Trying fallback for stream...")
                                continue
                        raise e
                yield "I couldn't find any relevant information."
                return

            k = 8 if any(word in original_query.lower() for word in ["contact", "phone", "email"]) else 5
            docs = self.hybrid_search(query, k=k)
            context = _format_document_context(docs)
            
            # Fallback mechanism for RAG streaming
            for i, current_llm in enumerate(self.llms):
                try:
                    prompt = self.system_prompt.format(
                        context=context,
                        web_context=web_context if web_context else "No web search results available.",
                        history=history_text,
                        question=original_query
                    )
                    
                    async for chunk in current_llm.astream(prompt):
                        content = ""
                        if hasattr(chunk, 'content'):
                            content = chunk.content
                        elif isinstance(chunk, str):
                            content = chunk
                        else:
                            content = str(chunk)
                        
                        for char in content:
                            yield char
                            await asyncio.sleep(0.01)
                    return # Successfully streamed
                except Exception as e:
                    if i < len(self.llms) - 1:
                        if "RESOURCE_EXHAUSTED" in str(e) or "429" in str(e):
                            logger.warning(f"LLM {i} quota exceeded, trying fallback for RAG stream...")
                            continue
                        else:
                            logger.error(f"LLM {i} failed with error: {e}. Trying fallback for RAG stream...")
                            continue
                    raise e
            
            # Final fallback
            fallback_text = f"Based on the available information from your documents:\n\n{context}\n\n(Note: AI is currently at its limit, showing raw info.)"
            for char in fallback_text:
                yield char
                await asyncio.sleep(0.01)
                
        except Exception as e:
            logger.error(f"Error generating streaming answer: {e}")
            if "RESOURCE_EXHAUSTED" in str(e) or "429" in str(e):
                yield "The AI is currently at its limit (Quota Exceeded). Please try again in a moment."
            else:
                yield "I encountered an error while processing your question. Please try again later."
                
def _enforce_formatting(text: str) -> str:
    """
    Force clean spacing and prevent block paragraphs
    """
    if not text:
        return text

    # Ensure space after headings
    text = re.sub(r'([A-Za-z])\n-', r'\1\n\n-', text)

    # Break long paragraphs (3+ lines)
    # text = re.sub(r'(.{200,})', lambda m: m.group(0) + "\n\n", text)

    # Fix merged list items
    text = re.sub(r'-\s*([^\n-]+)-', r'- \1\n-', text)

    # Ensure newline before lists
    text = re.sub(r'([^\n])\n-', r'\1\n\n-', text)

    return text.strip()

rag_service = RagService()
