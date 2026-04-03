import asyncio
import sys
import os
import argparse

# Add the parent directory to sys.path to allow importing app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.ingest_service import ingest_service
from app.core.config import settings

async def list_sources():
    print("Fetching unique sources from knowledge base...")
    result = await ingest_service.get_unique_sources()
    if result["success"]:
        sources = result["sources"]
        print(f"\nFound {len(sources)} unique sources:")
        for idx, src in enumerate(sorted(sources), 1):
            print(f"{idx}. {src}")
    else:
        print(f"Error: {result['message']}")

async def delete_source(source_url: str):
    print(f"Deleting all records for source: {source_url}...")
    result = await ingest_service.delete_by_source(source_url)
    if result["success"]:
        print(f"Successfully deleted records for: {source_url}")
    else:
        print(f"Error: {result['message']}")

async def show_stats():
    print("Knowledge Base Statistics:")
    result = await ingest_service.get_stats()
    if result["success"]:
        print(f"  Collection: {settings.COLLECTION_NAME}")
        print(f"  Points Count: {result['points_count']}")
        print(f"  Status: {result['status']}")
    else:
        print(f"Error: {result['message']}")

async def main():
    parser = argparse.ArgumentParser(description="Manage KCA Connect Knowledge Base (Qdrant)")
    subparsers = parser.add_subparsers(dest="command", help="Management commands")

    # Stats command
    subparsers.add_parser("stats", help="Show collection statistics")

    # List command
    subparsers.add_parser("list", help="List all unique document sources")

    # Delete command
    delete_parser = subparsers.add_parser("delete", help="Delete a specific source from the collection")
    delete_parser.add_argument("source", help="The source URL or filename to delete")

    args = parser.parse_args()

    if args.command == "stats":
        await show_stats()
    elif args.command == "list":
        await list_sources()
    elif args.command == "delete":
        await delete_source(args.source)
    else:
        parser.print_help()

if __name__ == "__main__":
    asyncio.run(main())
