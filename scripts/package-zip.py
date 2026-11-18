"""Write an OpenCloud store archive from the validated release staging directory."""

import stat
import sys
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

root = Path(sys.argv[1])
archive = Path(sys.argv[2])
timestamp = datetime.fromtimestamp(int(sys.argv[3]), timezone.utc).timetuple()[:6]
paths = [root, *sorted(root.rglob("*"))]
entries = []

with ZipFile(archive, "x", compression=ZIP_DEFLATED) as output:
    for path in paths:
        name = path.relative_to(root.parent).as_posix()
        if path.is_dir():
            entries.append(f"{name}/")
            entry = ZipInfo(entries[-1], timestamp)
            entry.external_attr = (stat.S_IFDIR | 0o755) << 16 | 0x10
            output.writestr(entry, b"")
        else:
            entries.append(name)
            entry = ZipInfo(name, timestamp)
            entry.external_attr = (stat.S_IFREG | 0o644) << 16
            output.writestr(entry, path.read_bytes(), compress_type=ZIP_DEFLATED)

with ZipFile(archive) as packaged:
    if packaged.namelist() != entries or packaged.testzip() is not None:
        raise ValueError("Release ZIP verification failed")
