import { NextRequest, NextResponse } from "next/server"

interface SearchResult {
  title: string
  snippet: string
  url: string
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    })

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`)
    }

    const html = await response.text()
    const results = parseSearchResults(html)

    return NextResponse.json({
      query,
      resultCount: results.length,
      results: results.slice(0, 6),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function parseSearchResults(html: string): SearchResult[] {
  const results: SearchResult[] = []

  const resultRegex = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi
  const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/a>/gi

  const titleMatches = [...html.matchAll(resultRegex)]
  const snippetMatches = [...html.matchAll(snippetRegex)]

  for (let i = 0; i < Math.min(titleMatches.length, 6); i++) {
    const titleMatch = titleMatches[i]
    const snippetMatch = snippetMatches[i]

    if (titleMatch) {
      let url = titleMatch[1]
      const title = decodeHtmlEntities(titleMatch[2].trim())

      if (url.includes("uddg=")) {
        const urlMatch = url.match(/uddg=([^&]+)/)
        if (urlMatch) {
          url = decodeURIComponent(urlMatch[1])
        }
      }

      let snippet = ""
      if (snippetMatch) {
        snippet = decodeHtmlEntities(
          snippetMatch[1].replace(/<[^>]+>/g, "").trim()
        )
      }

      if (title && url && !url.includes("duckduckgo.com")) {
        results.push({ title, snippet, url })
      }
    }
  }

  return results
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
}
