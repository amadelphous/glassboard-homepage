// Local Python proxy endpoint
const PROXY = "http://localhost:8787/rss?url=";

// News Sources Configuration
const SOURCES = [
  { name: 'AC Milan', url: 'https://sempremilan.com/feed', color: '#e53935', icon: 'svg\\acmilan.svg' },
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', color: '#2196f3', icon: 'svg\\bbc.svg' },
  { name: 'European Western Balkans', url: 'https://europeanwesternbalkans.com/feed/', color: '#fb8c00', icon: 'svg\\ewb.svg' },
  { name: 'N1 Info', url: 'https://n1info.rs/vesti/feed/', color: '#8600bf', icon: 'svg\\n1.svg' },
];


/**
 * Converts a date string into a relative time phrase (e.g. "45m ago", "2h ago").
 */
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const timestamp = new Date(dateStr).getTime();
  if (isNaN(timestamp)) return '';

  const mins = Math.floor((Date.now() - timestamp) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  
  return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * Strips HTML tags and decodes entities from titles and snippets.
 */
function cleanText(htmlStr) {
  if (!htmlStr) return '';
  const doc = new DOMParser().parseFromString(htmlStr, 'text/html');
  return doc.body.textContent.trim() || "";
}

/**
 * Safely fetches inner text from XML nodes without triggering CSS pseudo-selector errors on colons.
 */
function getXmlTagText(itemElement, tagName) {
  const nodes = itemElement.getElementsByTagName(tagName);
  return (nodes && nodes.length > 0) ? nodes[0].textContent || '' : '';
}

/**
 * Fetches and parses a single RSS or Atom feed via the Python proxy.
 */
async function fetchSingleFeed(source) {
  try {
    const res = await fetch(PROXY + encodeURIComponent(source.url));
    if (!res.ok) return [];

    const xmlText = await res.text();
    const xml = new DOMParser().parseFromString(xmlText, "text/xml");

    // Support standard RSS <item> or Atom <entry>
    const items = Array.from(
      xml.getElementsByTagName("item").length 
        ? xml.getElementsByTagName("item") 
        : xml.getElementsByTagName("entry")
    );

    return items.map(item => {
      const rawTitle = getXmlTagText(item, "title");

      // Extract link (handles RSS <link> text and Atom <link href="...">)
      let rawLink = getXmlTagText(item, "link");
      if (!rawLink) {
        const linkNode = item.getElementsByTagName("link")[0];
        if (linkNode) rawLink = linkNode.getAttribute("href") || "";
      }

      // Extract pubDate/published/updated tags
      const rawPubDate = getXmlTagText(item, "pubDate") || 
                         getXmlTagText(item, "dc:date") || 
                         getXmlTagText(item, "published") || 
                         getXmlTagText(item, "updated");

      // Extract description or full content fallback
      const rawDesc = getXmlTagText(item, "description") || 
                      getXmlTagText(item, "content:encoded") || 
                      getXmlTagText(item, "summary");

      return {
        title: cleanText(rawTitle),
        link: rawLink.trim(),
        pubDate: rawPubDate,
        snippet: cleanText(rawDesc),
        sourceName: source.name,
        color: source.color,
        icon: source.icon
      };
    });
  } catch (err) {
    console.warn(`[News Feed] Could not load ${source.name}:`, err);
    return [];
  }
}

/**
 * Main function: loads all feeds concurrently, de-duplicates, sorts, and renders HTML cards.
 */
async function loadCombinedNewsFeed() {
  const container = document.getElementById('news-feed-grid');
  if (!container) return;

  const results = await Promise.all(SOURCES.map(fetchSingleFeed));
  const allArticles = results.flat();

  if (!allArticles.length) {
    container.innerHTML = '<div style="opacity:0.7; padding: 2rem; text-align: center;">Unable to load news feed. Ensure local Python server is running on port 8787.</div>';
    return;
  }

  // Deduplicate articles across overlapping feeds by unique URL
  const seenLinks = new Set();
  const uniqueArticles = allArticles.filter(article => {
    if (!article.link || seenLinks.has(article.link)) return false;
    seenLinks.add(article.link);
    return true;
  });

  // Sort by published date descending (newest first)
  uniqueArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  // Render top 30 articles
  container.innerHTML = uniqueArticles.slice(0, 30).map(article => `
    <a class="news-card" href="${article.link}" target="_blank" rel="noopener noreferrer" style="--source-color: ${article.color}" draggable="false">
      <div class="card-meta-row">
        <div class="card-badge-group">
          <span class="card-badge">${article.sourceName}</span>
          ${article.icon ? `<img class="card-icon" src="${article.icon}" alt="${article.sourceName}">` : ''}
        </div>
        <span class="card-time">${timeAgo(article.pubDate)}</span>
      </div>
      <div class="card-content-wrap">
        <div class="card-title">${article.title}</div>
        ${article.snippet ? `<div class="card-snippet">${article.snippet}</div>` : ''}
      </div>
    </a>
  `).join('');
}

// Initial feed trigger & set 5-minute background refresh interval
loadCombinedNewsFeed();
setInterval(loadCombinedNewsFeed, 5 * 60 * 1000);