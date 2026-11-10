#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
if ! command -v bwrap >/dev/null; then
  echo 'Bubblewrap is required. Do not run project code in an unisolated fallback.' >&2
  exit 1
fi
if [ "$#" -eq 0 ]; then
  echo 'Usage: bash scripts/run-isolated.sh COMMAND [ARGUMENTS...]' >&2
  exit 2
fi
arguments=(
  --unshare-all --die-with-parent --new-session
  --ro-bind /usr /usr
  --symlink usr/bin /bin --symlink usr/lib /lib --symlink usr/lib /lib64
  --proc /proc --dev /dev --tmpfs /tmp
  --dir /tmp/home --dir /workspace
  --bind "$project_root" /workspace
  --clearenv --setenv PATH /usr/bin:/bin --setenv HOME /tmp/home
  --setenv LANG C.UTF-8 --setenv CI 1
  --chdir /workspace
)
if [ -d /etc/fonts ]; then arguments+=(--ro-bind /etc/fonts /etc/fonts); fi
if [ -f /etc/ld.so.cache ]; then arguments+=(--ro-bind /etc/ld.so.cache /etc/ld.so.cache); fi
if [ -n "${OFFICE_PNPM_PACKAGE:-}" ]; then
  pnpm_package="$(realpath -- "$OFFICE_PNPM_PACKAGE")"
  test -f "$pnpm_package/bin/pnpm.mjs"
  arguments+=(--ro-bind "$pnpm_package" /toolchain/pnpm --dir /tools
    --symlink /toolchain/pnpm/bin/pnpm.mjs /tools/pnpm
    --setenv PATH /tools:/usr/bin:/bin)
fi
if [ -n "${OFFICE_BROWSER_EXECUTABLE:-}" ]; then
  browser_binary="$(realpath -- "$OFFICE_BROWSER_EXECUTABLE")"
  test -f "$browser_binary" && test -x "$browser_binary"
  arguments+=(--ro-bind "$(dirname -- "$browser_binary")" /browser
    --setenv OFFICE_BROWSER_EXECUTABLE "/browser/$(basename -- "$browser_binary")")
fi
exec bwrap "${arguments[@]}" -- "$@"
