import httpx
from bs4 import BeautifulSoup

from app.config import settings

USER_AGENT = "LinkLibraryBot/1.0 (+https://github.com/; academic link manager)"

# Google Scholar's "citation_*" meta tag convention, used by most academic
# publishers and preprint servers (arXiv, IEEE, ACM, Springer, ...).
CITATION_FIELDS = {
    "citation_title": "title",
    "citation_author": "authors",
    "citation_journal_title": "journal",
    "citation_publisher": "publisher",
    "citation_publication_date": "year",
    "citation_date": "year",
    "citation_year": "year",
    "citation_doi": "doi",
}

OG_FALLBACK_FIELDS = {
    "og:title": "title",
    "og:site_name": "publisher",
}


def extract_year(value: str) -> str:
    for token in value.replace("-", "/").split("/"):
        if token.isdigit() and len(token) == 4:
            return token
    return value


async def fetch_metadata(url: str) -> dict:
    headers = {"User-Agent": USER_AGENT}
    async with httpx.AsyncClient(follow_redirects=True, timeout=settings.scrape_timeout_seconds) as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        html = response.text

    soup = BeautifulSoup(html, "html.parser")
    result: dict = {"authors": []}

    for meta in soup.find_all("meta"):
        name = meta.get("name") or meta.get("property")
        content = meta.get("content")
        if not name or not content:
            continue

        if name in CITATION_FIELDS:
            field = CITATION_FIELDS[name]
            if field == "authors":
                result["authors"].append(content.strip())
            elif field == "year":
                result.setdefault("year", extract_year(content.strip()))
            else:
                result.setdefault(field, content.strip())
        elif name in OG_FALLBACK_FIELDS:
            field = OG_FALLBACK_FIELDS[name]
            result.setdefault(field, content.strip())

    if "title" not in result and soup.title:
        result["title"] = soup.title.get_text(strip=True)

    if not result["authors"]:
        result["authors"] = None

    result["source_url"] = url
    return result
