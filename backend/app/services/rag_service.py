from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_cerebras import ChatCerebras
from langchain_groq import ChatGroq
from qdrant_client import QdrantClient
from app.core.config import settings
from app.services.web_search_service import web_search_service
import logging
import asyncio
import re

logger = logging.getLogger(__name__)

class RagService:
    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(model_name=settings.EMBEDDING_MODEL)
        self.client = QdrantClient(url=settings.QDRANT_URL)
        self.vector_store = QdrantVectorStore(
            client=self.client,
            collection_name=settings.COLLECTION_NAME,
            embedding=self.embeddings,
        )
        
        self.llm = self._initialize_llm()

        # Create custom prompt template
        self.system_prompt = """You are KCA Connect AI, the official AI assistant of KCA University. Use the following context from documents, web search results, and conversation history to answer the student's question.

Context from documents:
{context}

Web Search Results:
{web_context}

Conversation History:
{history}

Current Question: {question}

Instructions:
1. You are KCA Connect AI, the official AI assistant of KCA University
2. If asked about your name, identify yourself as "KCA Connect AI"
3. Use the context above to provide accurate information about KCA University
4. If the question refers to previous topics (using words like "it", "its", "they", "them", "this", "that"), use the conversation history to understand what is being referred to
5. If you cannot find the answer in the context, say so honestly and suggest they contact the university administration
6. For current events or real-time information, use the web search results provided
7. Always maintain context from the conversation history when answering follow-up questions"""

    def _initialize_llm(self):
        """Initialize the preferred LLM based on configuration and preference"""
        # 1. Try Groq if configured OR if it's the default preference
        if settings.GROQ_API_KEY and (settings.DEFAULT_LLM == "groq" or not settings.CEREBRAS_API_KEY):
            try:
                logger.info("Initializing Groq LLM (llama-3.3-70b-versatile)")
                return ChatGroq(
                    model="llama-3.3-70b-versatile",
                    groq_api_key=settings.GROQ_API_KEY,
                    temperature=0.3,
                )
            except Exception as e:
                logger.error(f"Failed to initialize Groq LLM: {e}")
        
        # 2. Try Cerebras only if it's the configured default AND Groq failed
        if settings.DEFAULT_LLM == "cerebras" and settings.CEREBRAS_API_KEY:
            try:
                logger.info("Initializing Cerebras LLM (llama-3.3-70b)")
                return ChatCerebras(
                    model="llama-3.3-70b",
                    cerebras_api_key=settings.CEREBRAS_API_KEY,
                    temperature=0.3,
                )
            except Exception as e:
                logger.error(f"Failed to initialize Cerebras LLM: {e}")

        # 3. Try Gemini only if it's the configured default AND Groq/Cerebras failed
        if settings.DEFAULT_LLM == "gemini" and settings.GOOGLE_API_KEY:
            try:
                logger.info("Initializing Gemini LLM (gemini-2.0-flash)")
                return ChatGoogleGenerativeAI(
                    model="gemini-2.0-flash",
                    google_api_key=settings.GOOGLE_API_KEY,
                    temperature=0.3,
                )
            except Exception as e:
                logger.error(f"Failed to initialize Gemini LLM: {e}")
        
        logger.warning("No LLM provider available or configured. Operating in retrieval-only mode.")
        return None

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

    def search(self, query: str, k: int = 4):
        """Retrieve relevant documents from vector store"""
        try:
            results = self.search_with_scores(query, k=k)
            return [doc for doc, score in results]
        except Exception as e:
            logger.error(f"Error during vector search: {e}")
            return []

    def should_use_rag(self, query: str, relevance_threshold: float = 0.5) -> bool:
        """Check if query should use RAG based on document relevance scores"""
        try:
            results = self.search_with_scores(query, k=1)
            if not results:
                return False
            
            best_doc, best_score = results[0]
            logger.info(f"Best relevance score for query '{query}': {best_score}")
            
            return best_score >= relevance_threshold
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
        
        for keyword in kca_keywords:
            if keyword in text_lower:
                found_topics.append(keyword)
        
        return found_topics

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
                main_topic = key_topics[-1]  # Most recent topic
                expanded = f"{main_topic} {query}"
                logger.info(f"Contextualized query: '{query}' -> '{expanded}'")
                return expanded
        
        return query

    def get_answer(self, query: str, history: list = None):
        """Get answer using RAG pipeline with conversation context"""
        try:
            # Contextualize the query using conversation history
            original_query = query
            if history:
                query = self._contextualize_query(query, history)
                if query != original_query:
                    logger.info(f"Query enhanced from '{original_query}' to '{query}'")
            
            # Format history for the prompt
            history_text = ""
            if history:
                history_text = "\n".join([
                    f"{'User' if msg.get('role') == 'user' else 'Assistant'}: {msg.get('content', '')}"
                    for msg in history[-6:]  # Last 6 messages
                ])
            
            # Check if we should search the web
            should_search = self._should_search_web(original_query)
            web_context = ""
            
            if not self.should_use_rag(query) or should_search:
                logger.info(f"Query '{query}' doesn't match documents well. Searching the web...")
                web_context = self.search_web(query)
            
            if not self.should_use_rag(query):
                if self.llm:
                    try:
                        # Include history and web context in the prompt
                        if history_text or web_context:
                            contextual_prompt = f"""You are KCA Connect AI, the official AI assistant of KCA University.

Conversation History:
{history_text}

Web Search Results:
{web_context if web_context else 'No web search results available.'}

Current Question: {original_query}

You are KCA Connect AI. Please answer based on the conversation context and web search results above."""
                            response = self.llm.invoke(contextual_prompt)
                        else:
                            contextual_prompt = """You are KCA Connect AI, the official AI assistant of KCA University. If asked about your name, identify yourself as KCA Connect AI."""
                            response = self.llm.invoke(contextual_prompt)
                        
                        if hasattr(response, 'content'):
                            return response.content
                        else:
                            return str(response)
                    except Exception as e:
                        logger.error(f"Error calling LLM for general question: {e}")
                        return "I encountered an error while processing your question. Please try again later."
                else:
                    return "I couldn't find any relevant information."
            
            docs = self.search(query)
            context = "\n\n".join([d.page_content for d in docs])
            
            if self.llm:
                try:
                    prompt = self.system_prompt.format(
                        context=context,
                        web_context=web_context if web_context else "No web search results available.",
                        history=history_text,
                        question=original_query
                    )
                    response = self.llm.invoke(prompt)
                    
                    if hasattr(response, 'content'):
                        return response.content
                    else:
                        return str(response)
                except Exception as e:
                    logger.error(f"Error calling LLM provider: {e}")
                    if isinstance(self.llm, ChatGoogleGenerativeAI) and ("RESOURCE_EXHAUSTED" in str(e) or "429" in str(e)):
                        return f"The AI is currently at its limit (Quota Exceeded). Here is the relevant information retrieved from our documents:\n\n{context}"
                    return f"I had trouble summarizing the information, but here is what I found in our records:\n\n{context}"
            else:
                return f"Based on the available information from your documents:\n\n{context}\n\n(Note: LLM is currently disabled for summarizing.)"
                
        except Exception as e:
            logger.error(f"Error generating answer: {e}")
            return "I encountered an error while processing your question. Please try again later."

    async def get_answer_stream(self, query: str, history: list = None):
        """Get answer using RAG pipeline with streaming support and conversation context"""
        try:
            # Contextualize the query using conversation history
            original_query = query
            if history:
                query = self._contextualize_query(query, history)
                if query != original_query:
                    logger.info(f"Query enhanced from '{original_query}' to '{query}'")
            
            # Format history for the prompt
            history_text = ""
            if history:
                history_text = "\n".join([
                    f"{'User' if msg.get('role') == 'user' else 'Assistant'}: {msg.get('content', '')}"
                    for msg in history[-6:]  # Last 6 messages
                ])
            
            # Check if we should search the web
            should_search = self._should_search_web(original_query)
            web_context = ""
            
            if not self.should_use_rag(query) or should_search:
                logger.info(f"Query '{query}' doesn't match documents well. Searching the web...")
                web_context = self.search_web(query)
                
                if web_context:
                    logger.info(f"Web search found results, enriching context")
            
            if not self.should_use_rag(query):
                if self.llm:
                    try:
                        # Include history and web context in the prompt
                        if history_text or web_context:
                            contextual_prompt = f"""You are KCA Connect AI, the official AI assistant of KCA University.

Conversation History:
{history_text}

Web Search Results:
{web_context if web_context else 'No web search results available.'}

Current Question: {original_query}

You are KCA Connect AI. Please answer based on the conversation context and web search results above."""
                            async for chunk in self.llm.astream(contextual_prompt):
                                if hasattr(chunk, 'content'):
                                    text = chunk.content
                                else:
                                    text = str(chunk)
                                
                                for char in text:
                                    yield char
                                    await asyncio.sleep(0.03)
                        else:
                            contextual_prompt = """You are KCA Connect AI, the official AI assistant of KCA University. If asked about your name, identify yourself as KCA Connect AI."""
                            async for chunk in self.llm.astream(contextual_prompt):
                                if hasattr(chunk, 'content'):
                                    text = chunk.content
                                else:
                                    text = str(chunk)
                                
                                for char in text:
                                    yield char
                                    await asyncio.sleep(0.03)
                        return
                    except Exception as e:
                        logger.error(f"Error calling LLM for general question: {e}")
                        yield "I encountered an error while processing your question. Please try again later."
                        return
                else:
                    yield "I couldn't find any relevant information."
                    return
            
            docs = self.search(query)
            context = "\n\n".join([d.page_content for d in docs])
            
            if self.llm:
                try:
                    prompt = self.system_prompt.format(
                        context=context,
                        web_context=web_context if web_context else "No web search results available.",
                        history=history_text,
                        question=original_query
                    )
                    
                    async for chunk in self.llm.astream(prompt):
                        if hasattr(chunk, 'content'):
                            text = chunk.content
                        else:
                            text = str(chunk)
                        
                        for char in text:
                            yield char
                            await asyncio.sleep(0.03)
                except Exception as e:
                    logger.error(f"Error calling LLM provider: {e}")
                    if isinstance(self.llm, ChatGoogleGenerativeAI) and ("RESOURCE_EXHAUSTED" in str(e) or "429" in str(e)):
                        yield f"The AI is currently at its limit (Quota Exceeded). Here is the relevant information retrieved from our documents:\n\n{context}"
                    else:
                        yield f"I had trouble summarizing the information, but here is what I found in our records:\n\n{context}"
            else:
                fallback_text = f"Based on the available information from your documents:\n\n{context}\n\n(Note: LLM is currently disabled for summarizing.)"
                for char in fallback_text:
                    yield char
                    await asyncio.sleep(0.03)
                
        except Exception as e:
            logger.error(f"Error generating streaming answer: {e}")
            yield "I encountered an error while processing your question. Please try again later."

rag_service = RagService()
