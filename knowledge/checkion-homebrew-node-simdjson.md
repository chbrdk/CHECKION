# macOS: Node startet nicht (`libsimdjson.XX.dylib` fehlt)

**Symptom:** `dyld: Library not loaded: .../opt/simdjson/lib/libsimdjson.29.dylib` beim Aufruf von `/opt/homebrew/bin/node`.

**Ursache:** `brew upgrade simdjson` (oder andere Updates) haben die Symlinks unter `/opt/homebrew/opt/simdjson` auf eine neue ABI (z. B. `.33`) umgestellt; eine **ältere** Node-Bottle erwartet noch `.29`.

**Fix:** Node gegen die aktuelle Formel neu ausrichten:

```bash
brew reinstall node
```

Danach prüfen: `node -v` und `otool -L "$(which node)" | grep simdjson` — Version sollte zur installierten `simdjson` passen.
