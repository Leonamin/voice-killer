#!/bin/sh
# /opt/voice-killer/releases/<UTC>에 소스 스냅샷을 만들고 current 링크를 바꾼 뒤 서비스를 재시작한다.
# venv는 절대 경로에 묶여 있어 복사하지 않고, 무거운 환경(.venv-seedvc, models, vendor)은 원본 저장소를 링크한다.
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo ./scripts/deploy.sh" >&2
  exit 1
fi

project_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
root="${VK_DEPLOY_ROOT:-/opt/voice-killer}"
keep_releases="${VK_KEEP_RELEASES:-5}"
run_user="${SUDO_USER:-leonamin}"
release_dir="${root}/releases/$(date -u +%Y%m%dT%H%M%SZ)"

trap 'status=$?; if [ "$status" -ne 0 ]; then echo "Deploy failed (exit $status). Release kept: $release_dir" >&2; fi' EXIT

test -f "$project_dir/web/dist/index.html" || { echo "web/dist 없음: cd web && npm run build" >&2; exit 1; }

install -d -m 0755 "$release_dir"
tar \
  --exclude='.git' --exclude='.env*' --exclude='.venv*' --exclude='node_modules' \
  --exclude='models' --exclude='vendor' --exclude='data' --exclude='outputs' \
  --exclude='experiments' --exclude='.cache' --exclude='__pycache__' --exclude='*.egg-info' \
  -C "$project_dir" -cf - . | tar -C "$release_dir" -xf -
for shared in .venv-seedvc models vendor; do
  ln -sfn "$project_dir/$shared" "$release_dir/$shared"
done
chown -R "$run_user" "$release_dir"

ln -sfn "$release_dir" "$root/current.new"
mv -Tf "$root/current.new" "$root/current"
systemctl restart voice-killer-web

attempt=0
while [ "$attempt" -lt 30 ]; do
  if curl -fs -o /dev/null http://127.0.0.1:8000/; then
    ls -1dt "$root"/releases/* | tail -n +"$((keep_releases + 1))" | xargs -r rm -rf
    echo "Deployment complete: $release_dir"
    exit 0
  fi
  attempt=$((attempt + 1))
  sleep 2
done
echo "서버가 시간 안에 응답하지 않음: journalctl -u voice-killer-web" >&2
exit 1
