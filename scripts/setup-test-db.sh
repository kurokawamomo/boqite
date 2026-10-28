#!/bin/sh
# 検証用DB(boqite_test)のセットアップ。各自のローカル環境で1回実行する。
# 既存なら createdb は失敗するが無視して db:push だけ流す(スキーマ変更後の再実行にも使える)。
#
# 使い方: sh scripts/setup-test-db.sh
set -eu

DB_NAME="${1:-boqite_test}"
DB_URL="postgres://localhost:5432/${DB_NAME}"

createdb "$DB_NAME" 2>/dev/null || echo "(${DB_NAME} は既に存在します。db:push のみ実行します)"

DATABASE_URL="$DB_URL" pnpm run db:push

echo "OK: ${DB_URL} にスキーマを反映しました。"
echo "検証時は DATABASE_URL=${DB_URL} pnpm run dev で起動してください（.env は書き換えない）。"
