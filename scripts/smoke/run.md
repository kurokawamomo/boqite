# 通しスモークE2E 手順書

playwright-cli（`~/.claude/CLAUDE.md` の PW スニペット、SESSIONユニーク化）で
「マップ → レッスン開始 → 誤答/正答 → クリア → マップ帰還 → ストリーク」を通しで叩く手順。
アプリコードは変更しない。DB汚れはスモーク後に自分が作った行だけ削除して原状回復する。

## 前提

- Postgres が起動していて `DATABASE_URL=postgres://localhost:5432/boqite` が有効
- 既存の dev サーバーを流用可（無ければ新規起動）。他 pane も同じ DB を共有しているため
  **スモーク前に必ず現在の DB 内容をスナップショットしておくこと**（後述）

```bash
psql postgres://localhost:5432/boqite -t -A -c "
select json_build_object(
  'attempts', (select coalesce(json_agg(row_to_json(t)), '[]') from attempts t),
  'node_progress', (select coalesce(json_agg(row_to_json(t)), '[]') from node_progress t),
  'streak_logs', (select coalesce(json_agg(row_to_json(t)), '[]') from streak_logs t),
  'user_state', (select coalesce(json_agg(row_to_json(t)), '[]') from user_state t)
);" > /tmp/boqite-pre-smoke.json
```

## dev サーバー

既存ポート流用可。無ければ:

```bash
cd /path/to/boqite
(rtk pnpm dev > /tmp/boqite-dev-smoke.log 2>&1 &) ; sleep 4; cat /tmp/boqite-dev-smoke.log
```

起動ログの `Local: http://localhost:<PORT>/` を控える。

## playwright-cli 起動

```bash
PW=~/.claude/plugins/cache/farmnote-claude-plugins/playwright-qa/1.0.0/skills/playwright-qa/scripts/pw
S="boqite-smoke-$$"
# .playwright/cli.config.json が無ければ bundled chromium で作成（Step 0 は playwright-qa skill 参照）
$PW -s=$S open "http://localhost:<PORT>/"
```

**重要な運用ノウハウ（今回の実行で判明）**:

- `.playwright-cli/` はリポジトリ直下の共有ディレクトリ。他 pane が同時に playwright-cli を
  実行していると `ls -t .playwright-cli/*.yml|png` で **他セッションの最新ファイルを誤って掴む**
  （実際に発生: 別ペインのスクショを誤取得した）。
  **必ず各コマンドの標準出力に含まれる `.playwright-cli/page-....yml` / `....png` の
  厳密パスを `grep -oE` で抜き出して使うこと。`ls -t | head -1` に頼らない。**
- 同じ dev サーバーを他 pane が同時に編集していると Vite の HMR full-reload が飛び、
  Svelte コンポーネントのローカル state（例: `/lesson` の `started`）がリセットされて
  スナップショットの ref が失効することがある（`Ref eN not found` エラー）。
  発生したら該当ステップを snapshot → click を間を空けずに撮り直す。

## シナリオ

1. **マップ表示確認**: `/` を開き、ストリークヘッダ（🔥/❄️）とノード一覧、色分けされた
   Unit バナーが表示されることを screenshot で確認。
2. **現在地ノードへ遷移**: snapshot から `status: current` のノード（星アイコン）の
   `link` ref を取得して click → `/lesson/<nodeId>` に遷移することを確認。
3. **レッスン開始**: 「レッスンをはじめる」ボタンを click。
4. **1問目回答**:
   - `choice` / `match` / `form_fill` は Phase 1 未実装のため `UnsupportedTaskNotice`
     （「◯◯はこの版では準備中です」＋スキップボタン）が出る。スキップは
     `advanceQueue(true)` を直接呼び、**attempts に記録されない**点に注意
     （後述バグ参照）。
   - `journal` は科目チップ→金額（Numpad）の順で入力する。
     **チップの advance() は「借方科目→貸方科目→借方金額→貸方金額」の順で進む**
     （行内で科目→金額と進むわけではない）。金額スロットは直接 click してフォーカスしてから
     Numpad を叩くのが確実。
   - `calc` は Numpad の `=` で確定した値がそのまま解答になる。
5. **誤答→赤シート→再出題**: journal 問題にわざと不正解の科目（正解と違う勘定）を入れて
   `こたえる`。赤い JudgmentSheet（「ざんねん…」＋解説）が出ることを確認し「つづける」。
   その問題は即座に再出題されず **キューの末尾に回る**（仕様書決定#12通り）。
   他の問題を消化して一周した後、同じ問題が再出題されることを確認する。
6. **全問消化→クリア画面→マップ帰還→?cleared**: 最後の問題をクリアすると ClearScreen
   （「済 LESSON CLEAR」）が出る。「地図にもどる」で `/` に戻り、該当ノードが
   チェックマーク（cleared）になっていること、次のノードが解放されていることを確認。
   `?cleared=<nodeId>` は `SnakeMap.svelte` が mount 時に読み取って即座に URL から
   `history.replaceState` で消す一回限りの合図なので、戻った直後の URL には残らない
   （バグではない）。
7. **/streak カレンダー確認**: `/streak` を開き、当日セルに 🔥、フリーズ残数、
   最長ストリークが表示されることを確認。
8. **console エラー0件**: 各ページ遷移後に `$PW -s=$S console error` を実行し、
   `Errors: 0` であることを確認。

## 後始末（DB原状回復）

**共有 DB**（他 pane も同じ `boqite` DB を同時に使っている）なので、スモーク前後の
差分から **自分が作った行だけ** を特定して削除する。スモーク前スナップショットに
無かった `node_progress.node_id` / `attempts.id` のうち、自分が実際に叩いた nodeId /
questionId に一致する行のみ削除し、それ以外（他 pane が同時に書き込んだ行を含む）は
一切触らない。

```bash
# 例（実行時の値に置き換える）
psql postgres://localhost:5432/boqite -c "delete from node_progress where node_id in ('b3-u01-n1','b3-u01-n2');"
psql postgres://localhost:5432/boqite -c "delete from attempts where id in (10,11);"
```

`streak_logs` / `user_state` はスモーク前後で値が変化していなければ触らない
（今回は変化なしだった）。

## dev サーバー・ブラウザの後始末

```bash
$PW -s=$S close
lsof -ti tcp:<PORT> | xargs -r kill   # 自分が起動した dev サーバーのみ。既存流用時は何もしない
```

**絶対にやらないこと**: `pkill -f "vite dev"`（他 pane の dev サーバーを巻き込む。
実際に過去このミスが起きた）、`.playwright-cli` / `.playwright` の一括 `rm -rf`
（他 pane が使用中の可能性）。
