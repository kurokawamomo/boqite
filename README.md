# Boqite

日商簿記3級のストリーク学習アプリ。個人用。

蛇行マップ・ライフ無制限・ストリーク(クリア時点日付判定・フリーズ2個自動消費)・仕訳/様式穴埋め/マッチング/択一/計算の5種問題タイプで試験第1〜3問(100点分)をカバーする。

![Boqite のスクリーンショット](docs/screenshot.jpeg)

## セットアップ

```sh
pnpm install
```

Postgres 17 に `boqite` DB を用意する。

```sh
createdb boqite
```

`.env` を用意し `DATABASE_URL` を設定する(`.env.example` 参照)。

```
DATABASE_URL=postgres://localhost:5432/boqite
```

スキーマを反映する。

```sh
pnpm run db:push
```

## 起動

```sh
pnpm run dev
```

iPhone実機(同一LAN)から確認する場合は `--host` で待ち受ける。

```sh
pnpm run dev -- --host
```

表示された `http://<Macのローカルアドレス>:<port>/` にiPhone Safariからアクセスする。

## スクリプト一覧

| コマンド | 内容 |
|---|---|
| `pnpm run dev` | 開発サーバー起動 |
| `pnpm run build` | 本番ビルド |
| `pnpm run preview` | 本番ビルドのプレビュー |
| `pnpm run check` | 型チェック(svelte-check) |
| `pnpm run check:watch` | 型チェック(watch) |
| `pnpm run check:sanitize` | コンテンツJSONの `sanitized: false` 残存検査 |
| `pnpm run check:content` | コンテンツJSONの構造・整合性検査 |
| `pnpm run gen:content` | 生成器（`src/lib/generators`）のシードから問題を作り、`content/boki3/*.json` に書き出す。`-- --check` で最新か確認 |
| `pnpm run check:public -- <語リスト.txt>` | 公開前チェック。語リストはリポジトリ外のファイルを渡す。`--history` で履歴も調べる |
| `node scripts/run-ts.mjs scripts/migrate-progress.ts <対応表.json>` | 旧コースの進捗を新ノードへ引き継ぐ（既定は予定の表示のみ。`--apply` で書き込み。`_test` 以外のDBは `--allow-production` が必要） |
| `pnpm run db:push` | Drizzleスキーマ反映 |
| `pnpm run db:studio` | Drizzle Studio起動 |
| `sh scripts/setup-test-db.sh` | 検証用DB(`boqite_test`)の作成+スキーマ反映(冪等・スキーマ変更後の再実行可) |

## アーキテクチャ概要

コンテンツ(問題本体)と進捗(ユーザー状態)を分離する。

- **コンテンツ**: `content/boki3/*.json`。リポジトリ内JSONで差分レビュー可能。様式(帳簿・証ひょう)は24種類、`src/lib/content/documents.ts` に型定義。問題データモデル全体は `src/lib/content/types.ts`(確定型・変更時要合意)。
- **追加コース**: 環境変数 `COURSE_DIR` で追加コースを読める。コロン区切りで複数指定できる（例: `COURSE_DIR=/a/c1:/a/c2`）。コース ID・Unit・ノード・問題の ID は、本体や他の追加コースと重ねない。
- **進捗**: Postgres + Drizzle(`src/lib/server/db/schema.ts`)。単一ユーザー・認証なし。`user_state` / `streak_logs` / `node_progress` / `attempts` の4テーブル。
- **コンテンツパイプライン**: 学習設計図 → 生成器(`pnpm run gen:content`)・下書きの取り込み(`pnpm run import:drafts`) → 検査(`pnpm run check:content`)。問題は `source` + `sanitized` フラグ必須。

設計ドキュメントは `docs/` 配下:

- [`docs/form-schema.md`](./docs/form-schema.md) — 様式スキーマ

## 開発規約

複数ペインでの並行開発を前提とし、担当ディレクトリを厳守する。

- 各ペインは割り当てられたディレクトリのみ編集する(例: `src/lib/components/tasks/` / `src/lib/components/cards/` / `src/lib/components/mascot/` 等)。他領域は担当外なら触らない。
- `git add` は必ず明示パス指定。`git add -A` / `git add .` は禁止(共有ブランチでの巻き込み事故の原因になる)。
- ステージ〜コミットの間隔を空けない(`git add <path> && git commit -m "..."` を1コマンドで連結、または共有indexに他ペインのstaged内容がある場合は `git commit -- <path>` でスコープ限定)。
- commit前に `git status` で担当領域外がステージされていないか確認する。
- 確定済み型定義(`src/lib/content/types.ts` 等)の変更は要合意。
- スモークテスト・DB書き込みを伴う動作検証は、共有中の `boqite` (dev用) を直接汚さず検証用DB `boqite_test` を使う。`createdb boqite_test && DATABASE_URL=postgres://localhost:5432/boqite_test pnpm run db:push` で初回セットアップ(スキーマ変更時は都度 `db:push` し直す)。検証時は `DATABASE_URL=postgres://localhost:5432/boqite_test pnpm run dev` のように起動時だけ環境変数を上書きし、`.env` 自体は書き換えない(`.env.example` の `DATABASE_URL_TEST` 参照)。検証が終わったら通常の `pnpm run dev`(`.env` の `DATABASE_URL`)に戻す。
