import json
import os
import urllib.request
import urllib.parse
from pathlib import Path

root = Path(__file__).resolve().parent.parent
env_file = root / ".env.local"

for line in env_file.read_text().splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        key, value = line.split("=", 1)
        os.environ[key.strip()] = value.strip().strip('"').strip("'")

api_key = os.getenv("TMDB_API_KEY", "")
if not api_key or api_key == "your_actual_tmdb_api_key":
    raise SystemExit("Please add your actual TMDB_API_KEY to .env.local first.")

catalog = json.loads((root / "src/movieCatalog.json").read_text())
poster_dir = root / "public/posters"

success = 0
failed = []

for movie in catalog:
    destination = root / "public" / movie["poster"].lstrip("/")

    if destination.exists() and destination.stat().st_size > 0:
        continue

    filename = destination.stem
    if not filename.startswith("tmdb-"):
        continue

    movie_id = filename.replace("tmdb-", "")

    try:
        params = urllib.parse.urlencode({"api_key": api_key})
        url = f"https://api.themoviedb.org/3/movie/{movie_id}?{params}"

        request = urllib.request.Request(
            url, headers={"User-Agent": "FRAME-LAB/1.0"}
        )

        with urllib.request.urlopen(request, timeout=20) as response:
            data = json.load(response)

        poster_path = data.get("poster_path")
        if not poster_path:
            raise ValueError("No poster available")

        image_url = f"https://image.tmdb.org/t/p/w500{poster_path}"

        urllib.request.urlretrieve(image_url, destination)

        print(f"Downloaded: {movie['name']}")
        success += 1

    except Exception as error:
        print(f"Failed: {movie['name']} ({error})")
        failed.append(movie["name"])

print(f"\nDownloaded {success} new posters.")
print(f"Failed: {len(failed)}")
print(f"Total poster files: {len(list(poster_dir.glob('*.jpg')))}")
