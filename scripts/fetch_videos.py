"""
Fetches latest video data from YouTube Data API v3 and writes data/videos.json.
Runs inside GitHub Actions — API key comes from secrets, never from code.
"""

import os, json, requests
from datetime import datetime, timezone
from pathlib import Path

API_KEY    = os.environ['YOUTUBE_API_KEY']
CHANNEL_ID = os.environ.get('CHANNEL_ID', 'UCBDisZXo_jR3PXOSBZesVSw')
BASE       = 'https://www.googleapis.com/youtube/v3'
OUT_FILE   = Path(__file__).parent.parent / 'data' / 'videos.json'

PLAYLIST_KEYWORDS = {
    'options-academy': ['cash-secured put', 'covered call', 'options combination',
                        'theta', 'time decay', 'options clock', 'csp', 'cc roll'],
    'wealth-academy':  ['wealth', 'investing', 'inflation', 'compounding', 'earnings',
                        'revenue', 'portfolio', 'value chain', 'crypto', 'digital asset',
                        'moat', 'lump-sum', 'dca'],
    'indian-radar':    ['india', 'indian', 'nifty', 'sensex', 'rupee', 'cbdc',
                        'indianradar', 'bharat', 'reliance', 'tcs', 'hindi', 'marathi',
                        'tamil', 'telugu', 'gujarati', 'kannada', 'bengali', 'punjabi',
                        'malayalam', 'urdu'],
}

INDIAN_LANG_SCRIPTS = (
    'ऀ', 'ঀ', '਀', '઀', '଀', '஀',
    'ఀ', 'ಀ', 'ഀ', '฀', '؀',
)


def classify_video(title: str, description: str) -> tuple[str, bool]:
    combined = (title + ' ' + description).lower()
    # detect Indian-language scripts in title
    india_script = any(ord(c) >= 0x0900 for c in title)
    india = india_script or any(k in combined for k in PLAYLIST_KEYWORDS['indian-radar'])

    if any(k in combined for k in PLAYLIST_KEYWORDS['options-academy']):
        return 'options-academy', india
    if india:
        return 'indian-radar', True
    if any(k in combined for k in PLAYLIST_KEYWORDS['wealth-academy']):
        return 'wealth-academy', False
    return 'wealth-academy', False


def fetch_all_videos() -> list[dict]:
    videos = []
    page_token = None
    while True:
        params = {
            'key':        API_KEY,
            'channelId':  CHANNEL_ID,
            'part':       'snippet',
            'order':      'date',
            'maxResults': 50,
            'type':       'video',
        }
        if page_token:
            params['pageToken'] = page_token

        r = requests.get(f'{BASE}/search', params=params, timeout=15)
        r.raise_for_status()
        data = r.json()

        video_ids = [item['id']['videoId'] for item in data.get('items', [])]
        if video_ids:
            videos.extend(enrich_videos(video_ids))

        page_token = data.get('nextPageToken')
        if not page_token:
            break

    return videos


def enrich_videos(video_ids: list[str]) -> list[dict]:
    r = requests.get(f'{BASE}/videos', params={
        'key':   API_KEY,
        'id':    ','.join(video_ids),
        'part':  'snippet,statistics,contentDetails',
    }, timeout=15)
    r.raise_for_status()

    result = []
    for item in r.json().get('items', []):
        snip  = item['snippet']
        stats = item.get('statistics', {})
        vid_id = item['id']
        title  = snip.get('title', '')
        desc   = snip.get('description', '')[:300]

        playlist, india = classify_video(title, desc)

        thumbs = snip.get('thumbnails', {})
        thumb  = (thumbs.get('maxres') or thumbs.get('high') or thumbs.get('medium') or {}).get('url', '')

        pub = snip.get('publishedAt', '')
        result.append({
            'id':        vid_id,
            'title':     title,
            'thumb':     thumb,
            'playlist':  playlist,
            'lang':      detect_lang(title),
            'views':     stats.get('viewCount', '0'),
            'published': pub[:10],
            'india':     india,
        })
    return result


def detect_lang(title: str) -> str:
    ranges = {
        'Devanagari': (0x0900, 0x097F),  # Hindi, Marathi
        'Bengali':    (0x0980, 0x09FF),
        'Gurmukhi':   (0x0A00, 0x0A7F),  # Punjabi
        'Gujarati':   (0x0A80, 0x0AFF),
        'Oriya':      (0x0B00, 0x0B7F),
        'Tamil':      (0x0B80, 0x0BFF),
        'Telugu':     (0x0C00, 0x0C7F),
        'Kannada':    (0x0C80, 0x0CFF),
        'Malayalam':  (0x0D00, 0x0D7F),
        'Arabic':     (0x0600, 0x06FF),   # Urdu
    }
    LANG_MAP = {
        'Devanagari': 'Hindi',
        'Arabic':     'Urdu',
        'Gurmukhi':   'Punjabi',
    }
    for char in title:
        cp = ord(char)
        for name, (lo, hi) in ranges.items():
            if lo <= cp <= hi:
                return LANG_MAP.get(name, name)
    return 'English'


PLAYLISTS = [
    {'id': 'news-radar',      'label': 'NewsRadar.AI',      'ytId': 'PLZEDE8n1EZ0RsCQiYsyKsClEivyHjhrvy', 'color': '#ef4444',
     'desc': 'Real-time market intelligence — earnings, macro events, and breaking financial news decoded for investors.'},
    {'id': 'knowledge-radar', 'label': 'KnowledgeRadar.AI', 'ytId': 'PLZEDE8n1EZ0QbpBD3ZaqYWVDu9wEpvHxZ', 'color': '#c9a84c',
     'desc': 'Research-backed frameworks from top universities — behavioral finance, investor psychology, and market principles.'},
    {'id': 'wealth-academy',  'label': 'WealthAcademy.AI',  'ytId': 'PLZEDE8n1EZ0QYxsDHtj-kb2xX10OLAttN', 'color': '#c9a84c',
     'desc': 'Long-term wealth building strategies — compounding, valuation, portfolio construction, zero hype.'},
    {'id': 'options-academy', 'label': 'OptionsAcademy.AI', 'ytId': 'PLZEDE8n1EZ0T5DVUGEnpxe0GXXcQapTlP', 'color': '#22c55e',
     'desc': 'Covered Calls, Cash-Secured Puts, rolls, theta decay — income strategies for the disciplined investor.'},
    {'id': 'indian-radar',    'label': 'IndianRadar.AI',    'ytId': 'PLZEDE8n1EZ0QFan242PpKNi7PodQX55ot', 'color': '#ff9933',
     'desc': 'Indian market intelligence in 10+ languages — Hindi, Tamil, Telugu, Marathi, Gujarati and more.'},
    {'id': 'infomercials',    'label': 'Infomercials',      'ytId': 'PLZEDE8n1EZ0SLtrPqYRrEtSL92aprflh9', 'color': '#8b5cf6',
     'desc': 'Short motivational videos and platform announcements from OTS Ullu.'},
]


def fetch_playlist_thumbnails() -> dict:
    """Returns {ytId: thumbnail_url} for all playlists."""
    yt_ids = [p['ytId'] for p in PLAYLISTS]
    r = requests.get(f'{BASE}/playlists', params={
        'key':  API_KEY,
        'id':   ','.join(yt_ids),
        'part': 'snippet',
    }, timeout=15)
    r.raise_for_status()
    result = {}
    for item in r.json().get('items', []):
        thumbs = item['snippet'].get('thumbnails', {})
        thumb  = (thumbs.get('maxres') or thumbs.get('high') or thumbs.get('medium') or {}).get('url', '')
        result[item['id']] = thumb
    return result


def build_json(videos: list[dict], playlist_thumbs: dict) -> dict:
    playlists = []
    for p in PLAYLISTS:
        entry = dict(p)
        entry['thumb'] = playlist_thumbs.get(p['ytId'], '')
        playlists.append(entry)

    return {
        'channel': {
            'id':      CHANNEL_ID,
            'title':   'OTS Ullu',
            'handle':  '@otsullu',
            'url':     'https://www.youtube.com/@otsullu',
            'tagline': 'AI-System-Driven Options Income For the Disciplined Investor',
            'updated': datetime.now(timezone.utc).isoformat(),
        },
        'playlists': playlists,
        'videos':    videos,
    }


if __name__ == '__main__':
    print('Fetching videos from YouTube API…')
    videos = fetch_all_videos()
    print(f'Fetched {len(videos)} videos')
    playlist_thumbs = fetch_playlist_thumbnails()
    print(f'Fetched thumbnails for {len(playlist_thumbs)} playlists')
    data = build_json(videos, playlist_thumbs)
    OUT_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Written to {OUT_FILE}')
