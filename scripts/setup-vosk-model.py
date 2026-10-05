"""Download the official Hindi model and package static assets for vosk-browser.

Run from any directory: python scripts/setup-vosk-model.py
No training, credentials, or inventory access is required. Re-run before deployment.
"""
import hashlib
import io
import json
import struct
from pathlib import Path
import tarfile
import tempfile
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public' / 'models' / 'vosk-hi'
NAME = 'vosk-model-small-hi-0.22'
URL = f'https://alphacephei.com/vosk/models/{NAME}.zip'


def embedded_words(data):
    """Read OpenFST's embedded symbol table (small models omit words.txt)."""
    offset = data.find(struct.pack('<i', 2125658996))
    if offset < 0:
        raise RuntimeError('No OpenFST symbol table found')
    stream = io.BytesIO(data[offset + 4:])

    def number(fmt):
        return struct.unpack(fmt, stream.read(struct.calcsize(fmt)))[0]

    def string():
        length = number('<i')
        if not 0 <= length <= 100000:
            raise RuntimeError('Invalid OpenFST string')
        return stream.read(length).decode('utf-8')

    string()  # table name
    number('<q')  # next available key
    size = number('<q')
    if not 1 <= size <= 2000000:
        raise RuntimeError('Invalid OpenFST symbol count')
    words = []
    for _ in range(size):
        words.append(string())
        number('<q')
    if '[unk]' not in words or not any('\u0900' <= c <= '\u097f' for w in words for c in w):
        raise RuntimeError('Expected Hindi vocabulary with unknown-word support')
    return words


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='retlex-vosk-') as temp:
        archive = Path(temp) / 'model.zip'
        print(f'Downloading {URL}', flush=True)
        urllib.request.urlretrieve(URL, archive)
        with zipfile.ZipFile(archive) as source:
            # Build a tar without extracting untrusted paths to the filesystem.
            entries = {entry.filename: entry for entry in source.infolist() if not entry.is_dir()}
            for required in ['am/final.mdl', 'conf/mfcc.conf', 'graph/HCLr.fst', 'graph/Gr.fst']:
                if f'{NAME}/{required}' not in entries:
                    raise RuntimeError(f'Model missing {required}; dynamic grammar cannot be verified')
            output = DEST / 'model.tar.gz'
            temporary = Path(temp) / 'model.tar.gz'
            with tarfile.open(temporary, 'w:gz') as target:
                for path, entry in sorted(entries.items()):
                    relative = Path(path)
                    if relative.is_absolute() or '..' in relative.parts or not path.startswith(NAME + '/'):
                        raise RuntimeError('Unexpected archive path')
                    data = source.read(entry)
                    info = tarfile.TarInfo('model/' + path[len(NAME) + 1:])
                    info.size = len(data)
                    info.mode = 0o644
                    target.addfile(info, io.BytesIO(data))
            if f'{NAME}/graph/words.txt' in entries:
                words = source.read(f'{NAME}/graph/words.txt').decode('utf-8')
                vocabulary = [line.rsplit(' ', 1)[0] for line in words.splitlines() if line.strip()]
            else:
                vocabulary = embedded_words(source.read(f'{NAME}/graph/Gr.fst'))
            # Copy after a successful build so a failed download cannot replace working assets.
            data = temporary.read_bytes()
            output.write_bytes(data)
            (DEST / 'words.json').write_text(json.dumps(vocabulary, ensure_ascii=False), encoding='utf-8')
            manifest = {'name': NAME, 'source': URL, 'license': 'Apache-2.0',
                        'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
                        'archive': 'model.tar.gz', 'vocabulary': 'words.json'}
            (DEST / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
            print(f'Ready: {output} ({len(data):,} bytes), {len(vocabulary):,} vocabulary entries', flush=True)


if __name__ == '__main__':
    main()
