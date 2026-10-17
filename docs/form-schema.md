# 様式データスキーマ設計 — form_fill / Document — 2026-08-22

> **結論**: `Document` を様式ごとの判別共用体に確定した。共通するのは「ヘッダ・明細行・繰越行・合計行・締切線」の5点だけで、それを `BookHeader` / `FormRow` / `RowRole` / `RuleLine` として一度だけ定義し、各様式は**自分の欄名を持った cells 型**を詰める。空欄は「値が null のセル」、答えは `FormFillTask.blanks` だけが持つ。参照は行キー起点なので、行を差し込んでも既存の ref は壊れない。

- 型定義: `src/lib/content/documents.ts`（`src/lib/content/types.ts` から re-export）
- 参照した実様式: 試験で使われる帳簿・伝票・証ひょうの一般的な記入例

---

## 1. 何を目指しているか

Phase 3–4 は「帳簿と決算の様式に記入する」問題群です。ここでコンテンツ量産（JSON を書く人）とレンダラ実装（Svelte を書く人）が同時に走るため、**両者の間の契約＝様式データの形**を先に固定する必要がありました。

契約が満たすべき条件は4つでした。

| # | 要件 | 満たし方 |
|---|------|----------|
| 1 | 様式の意味を失わない | 汎用セルグリッドにしない。「収入」「払出」「修正記入・借方」は**列名として型に残す** |
| 2 | ref が行追加で壊れない | 参照は**行番号ではなく行キー起点**（`r-0503.expense`） |
| 3 | 共通パターンは型で共有 | ヘッダ／明細行／合計行／締切線を共通型に括り出し、各様式が**合成**する |
| 4 | 実様式に忠実 | 一般的な記入例を1つずつ読み、欄をそのまま写した |

---

## 2. こう分析した — 汎用グリッドが失うもの

最初に否定した案が「全様式 = `string[][]` のセルグリッド」です。実装は一瞬で終わりますが、**`cells[3][2]` が何の欄なのかコードから消えます**。商品有高帳の「払出・単価」も精算表の「修正記入・貸方」も、ただの `[3][2]` になる。レンダラは意味を知らないまま罫線を引くことになり、採点も「どのセルが金額でどれが科目か」を JSON の外側の暗黙知に頼ります。

逆の極端は「様式ごとに全部バラバラの型」。これは意味を保ちますが、24種の様式それぞれに繰越行・合計行・締切線のロジックが重複します。記入例を並べて見ると、現金出納帳・当座預金出納帳・買掛金元帳・売掛金元帳・総勘定元帳（残高式）は**末尾の構造が完全に同じ**でした。

```
… 明細行 …
次月繰越 350        ← role: 'carryforward'
──────────
合計 700  700       ← role: 'total' / ruledAfter: 'double'
══════════
前月繰越 350        ← role: 'opening'
```

そこで**縦（行の役割）を共通化し、横（欄）を様式固有にする**という分け方に落としました。行の役割は次の1本の union です。

| role | 現れる場所 | レンダラの扱い |
|------|-----------|---------------|
| `entry` | 通常の明細行（既定） | 標準 |
| `sub_entry` | 仕入帳の品名行、仕訳の2行目以降 | 字下げ |
| `narration` | 仕訳帳の小書き | 字下げ・細字 |
| `opening` | 前月繰越・前期繰越・前週繰越 | 標準 |
| `carryforward` | 次月繰越・次期繰越 | 標準（試験では黒字） |
| `replenishment` | 小口現金出納帳の「本日補給」 | 標準 |
| `subtotal` | 内訳の合計 | 太字 |
| `total` | 貸借合計（締切） | 太字＋締切二重線 |
| `summary` | 総仕入高・仕入戻し高・純仕入高 | 太字 |
| `net_income` | 当期純利益・当期純損失 | 太字 |
| `continued` | 照合表などの「⋮」（行がまだ続く） | 標準 |

締切線は行の属性 `ruledAfter: 'single' | 'double'` です。「合計行だから二重線」とレンダラが推測するのではなく、データが宣言します（19章の締め切りでは、合計行のない資産勘定にも二重線が引かれるため）。

---

## 3. こう対処した — 3つの決めごと

### 3-1. 空欄 = null のセル

`Document` は**出題用と解答表示用で同じ型**です。くり抜いた欄は値を `null` にするだけで、答えは `FormFillTask.blanks` にしかありません。

```json
{
  "kind": "form_fill",
  "document": { "type": "cash_book", "data": { "...": "..." } },
  "blanks": [
    { "ref": "r-0510.income", "input": "numpad", "answer": 100 },
    {
      "ref": "r-0510.summary",
      "input": "chips",
      "answer": "きりしま(株)から売掛金回収",
      "options": ["きりしま(株)から売掛金回収", "ひだまり(株)に仕入代金支払い", "消耗品の購入"]
    }
  ]
}
```

不変条件は2つです。

1. **ref は実在するセルを指し、そのセルの値は null である**
2. **選択肢は answer を必ず含む**（ダミーを混ぜてよい）

解説画面では blanks の answer を流し込んだ完成様式をそのまま描けます。章末ボスの「全欄記入」は、様式データ側を全部 null にして blanks を全欄ぶん並べるだけで、通常レッスンの小問と同じ仕組みで動きます。

#### 選択肢の出どころは input ごとに違う — FormBlank は判別共用体

`input` によって必要な選択肢の出どころが変わるため、`FormBlank` は `input` を判別子とする共用体です。「`choice` なのに選択肢がない」という状態が**型として表現できない**ので、レンダラは既定値へのフォールバック（`['借', '貸']` 等）を持つ必要がありません。

| input | 必須プロパティ | answer の型 | 用途 |
|-------|--------------|------------|------|
| `numpad` | なし | `number` | 金額・数量。電卓兼テンキーで直接入力 |
| `account_picker` | `accountOptions: string[]` | `string` | 勘定科目欄。配列がそのままプルダウン（ダミー科目を含む） |
| `choice` | `options: string[]` | `string` | 「借/貸」「〃」等の択一。2〜4 個程度 |
| `chips` | `options: (string \| number)[]` | `string \| number` | 摘要文・金額を Word Bank 形式で選ぶ |

`account_picker` の選択肢を「既習の勘定科目マスタ全体」から自動生成する案は採りませんでした。進捗状態への実行時依存が生まれるうえ、ダミーの質が問題ごとに調整できなくなるためです。`JournalTask.accountOptions` が必須なのと同じ規約に揃えています。

選択肢プールを input で分岐せずに取り出したいときは `blankOptions(blank)` を使います（`numpad` は `null`）。

### 3-2. ref の文法

```
<rowKey>                              行キー（様式内で一意）
<rowKey>.<column>                     r-0503.expense
<rowKey>.<column>.<field>             r-shiire.incomeStatement.debit
<rowKey>.<column>.<index>.<field>     r-1112.shipped.1.amount
```

`rowKey` は**コンテンツ作成時に採番した ID** です。日付ベース（`r-0503`）でも連番（`r3`）でもよく、行を差し込んでも既存 ref に影響しません。T勘定や勘定式財務諸表のように行が借方・貸方に分かれる様式でも、キーは**様式全体で一意**にします（`d1` / `c1`）。これで「ref の第1セグメントは常に行キー」という規則が全様式で成立します。

### 3-3. レンダラは type で分岐、data は確定する

```ts
// 様式ごとに1コンポーネント。data の型は type から確定する
function render(doc: Document) {
  switch (doc.type) {
    case 'cash_book':        // doc.data は CashBookData
    case 'inventory_ledger': // doc.data は InventoryLedgerData
  }
}
```

`Document<TData = unknown>` のジェネリクスは廃止しました。様式が確定した以上、消費側が型を注入する必要はなく、判別共用体のほうが強い契約になります。`Question` / `FormFillTask` / `Stimulus` の型引数も同時に削除（既存の利用箇所はすべて型引数なしだったため影響なし）。

実行時検証用に `DOCUMENT_TYPES` 配列を用意し、`Document` union との一致をコンパイル時に保証しています（漏れがあれば `_DocumentTypesAreExhaustive` が型エラーになる）。

### 3-4. 画面に出る列は `formColumns.ts` だけが決める

様式ごとの列定義（見出し・並び・揃え）は `src/lib/components/forms/formColumns.ts` に 1 か所だけ置きます。描画部品 `ColumnTable.svelte` と、コンテンツ検査（`check-content.ts` の `form-fill-ref-not-rendered`）、解答可能性テスト（`src/lib/content/solvable.test.ts`）が同じ定義を読みます。

- セル型（`*Cells`）のフィールドを列に書き忘れると `defineColumns` がコンパイルエラーにする
- 空欄の `ref` が画面に出ない列を指すと、入力欄が出ず判定に進めない。`renderedCellRefs(doc)` に含まれない ref は検査で落ちる
- 新しい様式や列を足すときは、レンダラではなく列定義を直す

---

## 4. 様式別サンプル JSON

数値は代表的な記入例の素の値です。

### 4-1. 仕訳帳 `journal_book`

```json
{
  "type": "journal_book",
  "data": {
    "header": { "title": "仕訳帳", "folio": "1" },
    "rows": [
      { "key": "r1", "cells": { "date": "×年 4月1日", "summary": "（現 金）", "folio": "1", "debit": 500, "credit": null } },
      { "key": "r2", "role": "sub_entry", "cells": { "date": null, "summary": "（資本金）", "folio": "18", "debit": null, "credit": 500 } },
      { "key": "r3", "role": "narration", "ruledAfter": "single", "cells": { "date": null, "summary": "株式の発行", "folio": null, "debit": null, "credit": null } },
      { "key": "r4", "cells": { "date": "4月10日", "summary": "（仕 入）", "folio": "20", "debit": 200, "credit": null } },
      { "key": "r5", "role": "sub_entry", "cells": { "date": null, "summary": "諸 口", "folio": null, "debit": null, "credit": null } }
    ]
  }
}
```

### 4-2. 総勘定元帳（略式・T字）`t_account`

```json
{
  "type": "t_account",
  "data": {
    "header": { "subject": "現 金", "folio": "1" },
    "debit":  [{ "key": "d1", "cells": { "date": "4/1", "counterAccount": "資本金", "amount": 500 } }],
    "credit": [{ "key": "c1", "cells": { "date": "4/10", "counterAccount": "仕入", "amount": 50 } }]
  }
}
```

19章の締め切りでは `role: 'carryforward'`（次期繰越）＋ `role: 'total'` ＋ `ruledAfter: 'double'` ＋ `role: 'opening'`（前期繰越）を並べます。

### 4-3. 総勘定元帳（標準式）`general_ledger`

```json
{
  "type": "general_ledger",
  "data": {
    "layout": "bilateral",
    "header": { "subject": "現金", "folio": "1" },
    "debit":  [{ "key": "d1", "cells": { "date": "×年 4/1", "summary": "資本金", "folio": "1", "amount": 500 } }],
    "credit": [{ "key": "c1", "cells": { "date": "×年 4/10", "summary": "仕 入", "folio": "1", "amount": 50 } }]
  }
}
```

17章（仕訳日計表からの転記）の残高式は `"layout": "running_balance"` を使い、`rows` に `{date, summary, folio, debit, credit, side, balance}` を並べます。

### 4-4. 現金出納帳 `cash_book`

```json
{
  "type": "cash_book",
  "data": {
    "header": { "title": "現金出納帳" },
    "rows": [
      { "key": "r-0501", "role": "opening", "cells": { "date": "×年 5/1", "summary": "前月繰越", "income": null, "expense": null, "balance": 200 } },
      { "key": "r-0503", "cells": { "date": "5/3", "summary": "ひだまり(株)に仕入代金支払い", "income": null, "expense": 80, "balance": 120 } },
      { "key": "r-0531", "role": "carryforward", "cells": { "date": "5/31", "summary": "次月繰越", "income": null, "expense": 170, "balance": null } },
      { "key": "r-total", "role": "total", "ruledAfter": "double", "cells": { "date": null, "summary": null, "income": 300, "expense": 300, "balance": null } },
      { "key": "r-0601", "role": "opening", "cells": { "date": "6/1", "summary": "前月繰越", "income": 170, "expense": null, "balance": 170 } }
    ]
  }
}
```

### 4-5. 当座預金出納帳 `checking_book`

`{date, summary, checkNo, deposit, withdrawal, side, balance}`。`side` は借方残高「借」／当座借越「貸」／前日と同じ「〃」。

```json
{ "key": "r-0619", "cells": { "date": "6/19", "summary": "ひだまり(株)に買掛金支払い", "checkNo": "001", "deposit": null, "withdrawal": 150, "side": "借", "balance": 650 } }
```

### 4-6. 小口現金出納帳 `petty_cash_book`

内訳の費目列は問題ごとに変わるため `columns` で宣言し、セルは `breakdown` に費目名キーで持ちます。ref は `r-0402.breakdown.旅費交通費`。

```json
{
  "type": "petty_cash_book",
  "data": {
    "header": { "title": "小口現金出納帳" },
    "columns": ["旅費交通費", "消耗品費", "雑費"],
    "rows": [
      { "key": "r-0401", "cells": { "receipt": 1000, "date": "×年 4/1", "summary": "小口現金受け入れ", "payment": null, "breakdown": {} } },
      { "key": "r-0402", "cells": { "receipt": null, "date": "4/2", "summary": "電車代", "payment": 200, "breakdown": { "旅費交通費": 200 } } },
      { "key": "r-sub", "role": "subtotal", "cells": { "receipt": null, "date": null, "summary": "合 計", "payment": 750, "breakdown": { "旅費交通費": 350, "消耗品費": 300, "雑費": 100 } } },
      { "key": "r-cf", "role": "carryforward", "cells": { "receipt": null, "date": "4/5", "summary": "次週繰越", "payment": 250, "breakdown": {} } },
      { "key": "r-total", "role": "total", "ruledAfter": "double", "cells": { "receipt": 1000, "date": null, "summary": null, "payment": 1000, "breakdown": {} } }
    ]
  }
}
```

### 4-7. 仕入帳・売上帳 `purchase_book` / `sales_book`

取引先＋条件の行（`entry`）と品名・数量・単価の行（`sub_entry`）に分かれ、末尾に集計3行（`summary`）が付きます。

```json
{
  "type": "purchase_book",
  "data": {
    "header": { "title": "仕入帳" },
    "rows": [
      { "key": "r-0912", "cells": { "date": "9/12", "summary": "ひだまり(株) 掛け", "detail": null, "amount": null } },
      { "key": "r-0912a", "role": "sub_entry", "cells": { "date": null, "summary": "ガラスコップ 5個 @20円", "detail": 100, "amount": null } },
      { "key": "r-0912b", "role": "sub_entry", "cells": { "date": null, "summary": "ティーポット 10個 @30円", "detail": 300, "amount": 400 } },
      { "key": "r-gross", "role": "summary", "cells": { "date": "9/30", "summary": "総仕入高", "detail": null, "amount": 600 } },
      { "key": "r-return", "role": "summary", "cells": { "date": null, "summary": "仕入戻し高", "detail": null, "amount": 50 } },
      { "key": "r-net", "role": "summary", "ruledAfter": "double", "cells": { "date": null, "summary": "純仕入高", "detail": null, "amount": 550 } }
    ]
  }
}
```

### 4-8. 買掛金元帳・売掛金元帳 `supplier_ledger` / `customer_ledger`

残高式（`{date, summary, folio, debit, credit, side, balance}`）。`header.subject` に取引先名。

```json
{ "key": "r-0917", "cells": { "date": "9/17", "summary": "返品", "folio": null, "debit": 50, "credit": null, "side": "貸", "balance": 650 } }
```

### 4-9. 商品有高帳 `inventory_ledger`

受入・払出・残高がそれぞれ「数量／単価／金額」のレイヤ配列です。先入先出法では1行に複数レイヤが並ぶため配列で持ちます（ref は `r-1112.shipped.1.amount`）。`method` で合計行の意味とレイヤの畳み方が変わります。

```json
{
  "type": "inventory_ledger",
  "data": {
    "method": "fifo",
    "header": { "title": "商品有高帳", "subject": "コーヒーカップ" },
    "rows": [
      { "key": "r-1101", "role": "opening", "cells": { "date": "11/1", "summary": "前月繰越", "received": [], "shipped": [], "balance": [{ "quantity": 10, "unitPrice": 10, "amount": 100 }] } },
      { "key": "r-1105", "cells": { "date": "11/5", "summary": "仕 入", "received": [{ "quantity": 20, "unitPrice": 13, "amount": 260 }], "shipped": [], "balance": [{ "quantity": 10, "unitPrice": 10, "amount": 100 }, { "quantity": 20, "unitPrice": 13, "amount": 260 }] } },
      { "key": "r-1112", "cells": { "date": "11/12", "summary": "売 上", "received": [], "shipped": [{ "quantity": 10, "unitPrice": 10, "amount": 100 }, { "quantity": 5, "unitPrice": 13, "amount": 65 }], "balance": [{ "quantity": 15, "unitPrice": 13, "amount": 195 }] } }
    ]
  }
}
```

### 4-10. 手形記入帳 `bills_receivable_book` / `bills_payable_book`

固定欄が多い一覧です。`counterparty` は受取手形なら支払人、支払手形なら受取人。てん末は `settlementDate` / `settlementSummary`。

```json
{ "key": "r1", "cells": { "date": "10/3", "billType": "約手", "billNo": "12", "summary": "売上", "counterparty": "きりしま(株)", "drawer": "きりしま(株)", "issueDate": "10/3", "dueDate": "12/3", "payingBank": "北東銀行", "amount": 200, "settlementDate": "12/3", "settlementSummary": "当座預金口座に入金" } }
```

### 4-11. 固定資産台帳 `fixed_asset_ledger`

```json
{ "key": "r1", "cells": { "acquiredOn": "×1年 4/1", "name": "備品A", "quantity": 2, "method": "定額法", "usefulLife": "5年", "cost": 1000, "openingAccumulated": 200, "openingBookValue": 800, "depreciation": 200, "closingBookValue": 600 } }
```

### 4-12. 試算表 `trial_balance`

`variant` で列構成が決まります（`total` 合計試算表／`balance` 残高試算表／`total_balance` 合計残高試算表）。使わない欄は `null`。

```json
{
  "type": "trial_balance",
  "data": {
    "variant": "total_balance",
    "header": { "title": "合計残高試算表" },
    "rows": [
      { "key": "r-cash", "cells": { "debitBalance": 240, "debitTotal": 350, "accountName": "現金", "creditTotal": 110, "creditBalance": null } },
      { "key": "r-total", "role": "total", "ruledAfter": "double", "cells": { "debitBalance": 580, "debitTotal": 970, "accountName": "合 計", "creditTotal": 970, "creditBalance": 580 } }
    ]
  }
}
```

### 4-13. 仕訳日計表 `daily_journal_summary`

17章 CASE 101 で使う様式です。試算表の一種ですが元丁欄を持ち、伝票→集計→総勘定元帳転記の流れで出題されるため独立させました（**仕様書3章の様式リストに対する追加**）。

```json
{ "key": "r-cash", "cells": { "debit": 550, "debitFolio": "1", "accountName": "現 金", "creditFolio": "1", "credit": 250 } }
```

### 4-14. 精算表 `worksheet`

4ブロック × 借貸の8欄。ref は `r-shiire.incomeStatement.debit` のように「行キー・ブロック・借貸」。

```json
{
  "type": "worksheet",
  "data": {
    "header": { "title": "精算表" },
    "rows": [
      { "key": "r-kurikoshi", "cells": { "accountName": "繰越商品", "trialBalance": { "debit": 100, "credit": null }, "adjustment": { "debit": 50, "credit": 100 }, "incomeStatement": { "debit": null, "credit": null }, "balanceSheet": { "debit": 50, "credit": null } } },
      { "key": "r-shiire", "cells": { "accountName": "仕 入", "trialBalance": { "debit": 900, "credit": null }, "adjustment": { "debit": 100, "credit": 50 }, "incomeStatement": { "debit": 950, "credit": null }, "balanceSheet": { "debit": null, "credit": null } } },
      { "key": "r-ni", "role": "net_income", "ruledAfter": "double", "cells": { "accountName": "当期純利益", "trialBalance": { "debit": null, "credit": null }, "adjustment": { "debit": null, "credit": null }, "incomeStatement": { "debit": 430, "credit": null }, "balanceSheet": { "debit": null, "credit": 430 } } }
    ]
  }
}
```

### 4-15. 損益計算書・貸借対照表 `pl` / `bs`

勘定式（左右2面）。B/S の控除内書き（売掛金の下の貸倒引当金、建物の下の減価償却累計額）は `deduction` ＋ `netAmount` で表します。純額だけを持たせると「600 − 12 = 588」という**問題そのものが消える**ため、総額・控除額・純額の3つを別々のセルとして持ちます。

```json
{
  "type": "bs",
  "data": {
    "header": { "title": "貸借対照表", "company": "こもれび株式会社", "period": "×2年3月31日", "unit": "(単位：円)" },
    "debit": [
      { "key": "d-cash", "cells": { "label": "現金", "amount": 300 } },
      { "key": "d-ar", "cells": { "label": "売掛金", "amount": 600, "deduction": { "label": "貸倒引当金", "amount": 12 }, "netAmount": 588 } },
      { "key": "d-total", "role": "total", "ruledAfter": "double", "cells": { "label": "計", "amount": 2688 } }
    ],
    "credit": [
      { "key": "c-ap", "cells": { "label": "買掛金", "amount": 578 } },
      { "key": "c-re", "cells": { "label": "繰越利益剰余金", "amount": 630 } },
      { "key": "c-total", "role": "total", "ruledAfter": "double", "cells": { "label": "計", "amount": 2688 } }
    ]
  }
}
```

P/L も同じ `StatementData`。当期純利益は借方側に `role: 'net_income'` で置きます。表示名の言い換え（売上→売上高、繰越商品→商品）は**コンテンツ側で解決済みの `label` を書く**規約とし、レンダラは変換しません。

### 4-16. 伝票 `slip`

`slipType` で入金・出金（相手科目のみ）と振替（仕訳の形）が分かれます。

```json
{ "type": "slip", "data": { "slipType": "receipt", "slipNo": "101", "header": { "title": "入金伝票", "period": "×1年10月6日" }, "rows": [{ "key": "r1", "cells": { "account": "売掛金", "amount": 100 } }] } }
```

```json
{ "type": "slip", "data": { "slipType": "transfer", "header": { "title": "振替伝票", "period": "×1年10月12日" }, "rows": [{ "key": "r1", "cells": { "debitAccount": "売掛金", "debitAmount": 100, "creditAccount": "売上", "creditAmount": 100 } }] } }
```

### 4-17. 請求書 `invoice`

```json
{
  "type": "invoice",
  "data": {
    "header": { "title": "請求書" },
    "issuer": "ひだまり株式会社",
    "addressee": "こもれび株式会社 御中",
    "dueDate": "×2年9月30日",
    "rows": [
      { "key": "r1", "cells": { "name": "コーヒーカップ（白）", "quantity": 10, "unitPrice": 600, "amount": 6000 } },
      { "key": "r2", "cells": { "name": "マグカップ（ストライプ）", "quantity": 10, "unitPrice": 400, "amount": 4000 } }
    ],
    "taxAmount": 1000,
    "total": 11000,
    "note": "お支払いは、北山銀行 本町支店の口座へお願いします。"
  }
}
```

### 4-18. 当座勘定照合表 `bank_statement`

`issuedOn`（発行日）と `addressee`（宛名）は任意。続きがある表は最後に `role: 'continued'` の行（摘要 `⋮`）を置きます。

```json
{ "key": "r1", "cells": { "date": "12.5", "description": "お振込み ひだまり(株)", "payment": 10000, "deposit": null, "balance": null } }
```

### 4-19. 納付書 `tax_notice`

`filingType` が「中間申告」なら仮払法人税等、「確定申告」なら未払法人税等の取り崩し、という判断材料そのものになります。
`fiscalPeriod`（納期等の区分欄の事業年度）と `paidOn`（納付年月日）は任意です。

```json
{ "type": "tax_notice", "data": { "header": { "title": "領収済通知書" }, "taxType": "法人税", "filingType": "確定申告", "rows": [{ "key": "r1", "cells": { "label": "本税", "amount": 200000 } }], "total": 200000 } }
```

### 4-20. 仕訳フォーム `journal_form`

解答用の空の仕訳枠（伝票起票や決算整理仕訳の記入）。複合仕訳は行を増やします。

```json
{ "type": "journal_form", "data": { "header": {}, "rows": [{ "key": "r1", "cells": { "debitAccount": null, "debitAmount": null, "creditAccount": null, "creditAmount": null } }] } }
```

### 4-21. 領収書 `receipt`

内訳は `description`（但し書き）と `amount` の行。`issuer` が代金を受け取った側、`addressee` が支払った側です。

```json
{ "type": "receipt", "data": { "header": { "title": "領収書" }, "issuer": "フジ事務機株式会社", "addressee": "ミナト商事株式会社 様", "issuedOn": "×7年8月20日", "rows": [{ "key": "r1", "cells": { "description": "コピー機トナー代として", "amount": 13200 } }], "taxAmount": 1200, "total": 13200 } }
```

### 4-22. 振込依頼書 `transfer_request`

取引先が内訳と振込先口座を知らせる書類。`account` は口座の表記を 1 つの文字列で持ちます。

```json
{ "type": "transfer_request", "data": { "header": { "title": "振込依頼書" }, "requester": "株式会社サクラ不動産", "addressee": "ミナト商事株式会社 様", "rows": [{ "key": "r1", "cells": { "description": "敷金", "amount": 160000 } }], "total": 160000, "account": "緑山銀行 駅前支店 当座 7654321 カ)サクラフドウサン" } }
```

### 4-23. 旅費交通費支払報告書 `expense_report`

明細（`rows`）と、添付された領収書（`receipts`）が別の表になります。同じ支出が両方に載るため、合計に二重に足さない判断が問われます。

```json
{ "type": "expense_report", "data": { "header": { "title": "旅費交通費支払報告書" }, "submitter": "総務部 従業員", "rows": [{ "key": "r1", "cells": { "date": "9/2", "item": "タクシー", "amount": 2700, "receipt": "あり" } }], "receipts": [{ "key": "c1", "cells": { "issuer": "空港タクシー(株)", "amount": 2700 } }], "total": 2700 } }
```

---

## 5. まとめ — 物語として

- 汎用セルグリッドは実装が速いが、`cells[3][2]` が何の欄か消える。**欄名は型に残す**と決めた
- 逆に全様式バラバラでは繰越・合計・締切が24回重複する。記入例を並べると**末尾の構造は同じ**だった
- そこで縦（行の役割）を `RowRole` に共通化し、横（欄）を様式固有の cells 型にした
- 締切線はレンダラの推測ではなくデータの宣言（`ruledAfter`）にした。19章に合計行のない締切があるため
- 空欄は「値が null のセル」に統一。出題用と解答用で型が変わらず、章末ボスの全欄記入は「全部 null」で自然に表せる
- ref は行キー起点にしたので、コンテンツ作成者が行を差し込んでも既存の問題が壊れない
- 様式が確定したので `Document<TData>` のジェネリクスは役目を終え、判別共用体に置き換えた。レンダラは `switch (doc.type)` だけで正確な型を得る
- 17章の仕訳日計表だけは仕様書3章のリストになかったため `daily_journal_summary` を追加した

---

## 6. 未決事項

| # | 論点 | 現状 |
|---|------|------|
| 1 | ref のランタイム解決 | 文法は確定。`getCell(document, ref)` の実装は Phase 3 レンダラ側で行う |
| 2 | blanks の不変条件検査 | 「選択肢が answer を含む」は `loader.ts` で検証済。「ref が実在し、値が null」は ref 解決器が要るため未実装（Phase 3 レンダラの `getCell` と同時に入れる） |
| 3 | 商品有高帳の合計行 | `method` によって合計欄の意味が変わる。レンダラ実装時に確認 |
| 4 | 証ひょうのレイアウト | 請求書・納付書は表ではなく帳票レイアウト。CSS 側の忠実度は実装時に詰める |

---

## 7. 用語ミニ辞典

- **様式（Document）**: 帳簿・財務諸表・伝票・証ひょうのグラフィカルな表現
- **行キー（rowKey）**: 様式内で一意な行の ID。ref の第1セグメント
- **締切線**: 帳簿を締め切ったことを示す二重線（`ruledAfter: 'double'`）
- **控除内書き**: B/S で売掛金の下に貸倒引当金を書き、差引純額を示す表示形式
- **残高式 / 標準式**: 元帳のレイアウト。残高式は1行ごとに残高を持ち、標準式は借方・貸方が左右に分かれる
