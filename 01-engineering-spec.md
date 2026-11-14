# 音声文字起こしツール：エンジニア向け実装仕様書（実務版）

| 項目 | 内容 |
| :---- | :---- |
| 版 | 1.0（対象の版：リポジトリ v2.7.0 時点のソース） |
| 対象読者 | 実装・改修・試験・運用を担当するエンジニア |
| 範囲 | 音声の読み込み、分割（区間）、WAV 化、API 送信、再試行、結合、出力。開発環境、テスト、公式参考を含む |
| 前提の確認 | 音声のデコードと Azure 文字起こし API の仕様は、公式参考（第9章）で確認した範囲のみ事実として記す。確認していない点は「未確認」と書く |

---

## 0\. 読み方と記号

- **事実**：コードまたは試験で確認した内容。行番号はこの版の `src/` を指す  
- **仕様**：本書が定める振る舞い。変えるときは先に本書を変える（第 8 章の手順）  
- **未確認**：公式または実環境で確かめていない内容。未確定事項（OQ）に対応する  
- 記号：✅ 実装・試験済み／🟡 一部未確認／❌ 未達／⬜ 未着手

---

## 1\. Why（なぜ作るか）

業務で、録音や会議の音声を、人が手で文字にしている。音声は長く（1 時間以上になることがある）、ファイルは大きく、ブラウザだけで完結させたい。

- 目的：音声ファイルを選ぶだけで、文字起こしの結果を見出し付きで得て、保存できる  
- 制約：サーバーを持たない（配布は 1 つの HTML と設定ファイル）、APIキーをソースに書かない、4〜8 GB のPCで動く  
- 成功の基準：2 分の音声を 1 分単位で送って、2 区間の結果が見出し付きで得られること（AC-03）

## 2\. What（何を作るか）

| 区分 | 内容 | 状態 |
| :---- | :---- | :---- |
| 機能 | 音声の選択・ドロップ、区間への分割、16 kHz・モノラル WAV への変換、API 送信、再試行、中止、結合、表示、保存 | ✅（試験済み） |
| 機能 | 事前分割したピースの開始時刻の指定（FR-12） | ✅（AC-12a〜c で確認） |
| 非機能 | 3 時間の音声の処理（FR-04） | ❌ ブラウザ単体では未達。事前分割で運用（ADR-009） |
| 非機能 | Chrome・Edge での動作（NFR-01） | 🟡 Chromium で確認。Edge・Windows は未確認 |
| 非機能 | 4〜8 GB の PC でのメモリ（NFR-02） | ❌ 実測で、長い音声は増分が大きい（第 4 章） |

## 3\. How（どう作り、どう確かめるか）

1. 要求を、FR・NFR・AC に分けて、番号を振る（仕様表）  
2. 決定（ADR）と、未確定事項（OQ）を、別の箱に書く  
3. 画面（制御）と計算（純粋関数）を分け、計算を単体試験する  
4. 送信・失敗・中止を、模倣サーバーで試験する  
5. 試験の結果を、受け入れ基準の番号ごとに集計する（第 7 章）

---

## 4\. 開発環境の構成（構築から）

### 4.1 必要な道具

| 道具 | 版 | 用途 | 確認コマンド |
| :---- | :---- | :---- | :---- |
| Node.js | 22（LTS） | 単体試験、ビルド、模倣サーバー | `node -v` |
| npm | Node に付属 | スクリプトの実行 | `npm -v` |
| Python | 3.12 以上 | 画面の試験（Playwright）、模倣の試験 | `python3 --version` |
| Playwright（Python） | 1.63.0 に固定 | ブラウザの操作（ブラウザ版と組で動く） | `python3 -c "import playwright"` |
| Chromium | Playwright が導入 | 画面の試験 | `python3 -m playwright install chromium` |
| Git | 2.x | 版管理、差分、タグ | `git --version` |
| Docker（任意） | 最新 | 開発環境の再現 | `docker version` |
| ffmpeg（任意） | 6 以上 | 長い音声の事前分割（運用） | `ffmpeg -version` |

### 4.2 構築の手順（Ubuntu・WSL 2 の Ubuntu）

```sh
# 1) 基本の道具
sudo apt-get update && sudo apt-get install -y git python3 python3-venv curl ffmpeg
# 2) Node.js 22（nvm を使う。版は公式の nvm の案内で確認）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc && nvm install 22 && node -v
# 3) プロジェクト（WSL の中の、Linux 側のファイルシステムに置く）
mkdir -p ~/work && cd ~/work && unzip <zip のパス> -d ~/work && cd azure-speech-transcriber
# 4) 検証（APIキー不要）
npm run verify                     # build・単体試験・秘密情報の検査
# 5) 画面の試験に必要なブラウザ
python3 -m venv .venv && source .venv/bin/activate
pip install "playwright==1.63.0" && python -m playwright install --with-deps chromium
npm run e2e                        # 画面の試験（自動で模倣サーバーを起動）
```

- 手順 3 の理由：`/mnt/c` 配下は、読み書きが遅く、変更の検知も不安定になりやすい（第 4.5 節の参考を参照）  
- 手順 5 の `--with-deps`：Ubuntu で、ブラウザが必要とする共有ライブラリを OS から入れる

### 4.3 Windows（PowerShell）の場合

```
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Python.Python.3.12 -e
# 開き直したあと
node -v; python --version
```

- 仮想環境：`py -m venv .venv` → `.\.venv\Scripts\Activate.ps1`（実行できない場合は `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`）  
- **未確認**：Windows・PowerShell での上記の全手順は、この版の作業環境では実行していない

### 4.4 Docker（開発イメージ）

```sh
docker build -f docker/dev/Dockerfile -t web-dev:1.0 .
docker run --rm --shm-size=1g -v "$PWD:/work" -w /work web-dev:1.0 sh -c "npm run verify && npm run e2e"
```

- `-v "$PWD:/work"`：ホストのフォルダをコンテナに割り当てる（バインドマウント）。コンテナの中の変更は、ホストに残る  
- `--shm-size=1g`：ブラウザが共有メモリ不足で落ちるのを防ぐ（既定は 64 MB）  
- 基礎イメージは `ARG BASE_IMAGE` で差し替えられる。既定は `node:22-bookworm`。**未確認**：既定の基礎イメージからの作成（作業環境では代用の基礎イメージを使った）

### 4.5 環境構築の躓きやすい点

| 躓き | 原因 | 対処 | 難易度 |
| :---- | :---- | :---- | :---- |
| `Cannot connect to the Docker daemon` | Docker Desktop 未起動、または WSL 連携が無効 | Docker Desktop を起動し、Settings → Resources → WSL Integration で有効化 | ★★ |
| ブラウザが起動しない（Target closed） | 共有メモリ不足、ブラウザ版と Playwright 版の不一致 | `--shm-size=1g`、Playwright を 1.63.0 に固定、`install --with-deps` | ★★★ |
| `file://` で画面を開くと動かない | ブラウザの制限、設定の読み込みの失敗 | `python3 -m http.server 8000` で配信し、http\:// で開く | ★★ |
| WSL で遅い、変更が反映されない | プロジェクトが `/mnt/c` 配下 | WSL の `~/` 配下に置く | ★★ |
| PowerShell で ps1 が実行できない | 実行ポリシー | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` | ★ |
| `Ocp-Apim-Subscription-Key` のエラーが分からない | キーの誤り、リージョンの誤り | 401/403 の案内を見る。キーとエンドポイントを公式画面で確認 | ★★ |

参考（公式）：Docker のバインドマウント（[https\://docs.docker.com/engine/storage/bind-mounts/）、Docker](https://docs.docker.com/engine/storage/bind-mounts/）、Docker) Desktop の WSL 2 の推奨（[https\://docs.docker.com/desktop/features/wsl/best-practices/）、WSL](https://docs.docker.com/desktop/features/wsl/best-practices/）、WSL) のファイルシステム（[https\://learn.microsoft.com/en-us/windows/wsl/filesystems）、Playwright](https://learn.microsoft.com/en-us/windows/wsl/filesystems）、Playwright) の導入（[https\://playwright.dev/python/docs/intro）。](https://playwright.dev/python/docs/intro）。)

---

## 5\. 全体アーキテクチャ

### 5.1 構成（ページ図解）

```
flowchart LR
  U["利用者"] --> UI["index.html<br/>画面・制御"]
  UI --> LIB["lib.js（埋め込み）<br/>純粋関数"]
  UI --> AC["AudioContext<br/>decodeAudioData（16 kHz）"]
  UI --> OAC["OfflineAudioContext<br/>区間の描画"]
  UI --> FETCH["fetch（POST multipart）"]
  FETCH --> API["Azure Speech<br/>Fast transcription"]
  FETCH -. 試験 .-> MOCK["mock-server.js<br/>localhost:8787"]
  CFG["config.js<br/>window.APP_CONFIG"] --> UI
  BUILD["build.js"] -->|"src/index.html + src/lib.js を結合"| UI
```

### 5.2 配布と生成

| 対象 | 編集するファイル | 生成物 | 作るコマンド |
| :---- | :---- | :---- | :---- |
| 画面と制御 | `src/index.html` | `index.html`（配布） | `node build.js` |
| 計算（純粋関数） | `src/lib.js` | `index.html` の中に埋め込み | `node build.js` |
| 設定 | `config.example.js` を複製して `config.js` | なし（配布しない） | 手で作る |

`build.js` は、テンプレートの `<!--@INLINE lib-->` を、`src/lib.js` の内容で置き換える（関数形式の置換。`$` の解釈による誤りを防ぐ）。

### 5.3 ファイルの役割

| ファイル | 役割 | 行数（この版） |
| :---- | :---- | :---- |
| src/index.html | 画面、制御、通信、保存 | 782 |
| src/lib.js | 時刻・サイズの表示、WAV 生成、区間計算、見出し、入力検査、再試行の判定、文言 | 172 |
| build.js | 配布用 index.html の生成 | 29 |
| mock-server.js | Azure 風の模倣サーバー（試験用） | 98 |
| config.example.js | 設定の雛形（APIキーは書かない） | — |
| test/unit/\*.test.js | 単体試験（node:test） | — |
| test/browser/suite.py | 結合・壊しに行く・モンキー試験 | — |
| scripts/e2e\_smoke.py | 画面の総合試験（13 件） | — |
| scripts/run\_all\_tests.py | 全試験の実行と結果の集約 | — |

### 5.4 実行時の状態

| 変数（index.html） | 型 | 意味 | 変わるとき |
| :---- | :---- | :---- | :---- |
| `source` | AudioBuffer \| null | 展開済みの音声。メモリの大部分 | 読み込みの成功で入る。読み込みの開始で null |
| `fileName` | string | 保存名の元 | 読み込み時 |
| `busy` | boolean | 処理中。二重実行を防ぐ | run の開始・終了（finally） |
| `abortCtl` | AbortController \| null | 中止の信号 | run の開始で作り、終了で null |
| `loadSeq` | number | 読み込みの通し番号（古い結果を捨てる） | 読み込みの開始ごと |

### 5.5 画面の状態遷移

```
stateDiagram-v2
  [*] --> 初期
  初期 --> 読込中 : ファイルを選ぶ
  読込中 --> 準備完了 : デコード成功
  読込中 --> 初期 : デコード失敗（案内）
  準備完了 --> 処理中 : 開始（入力が有効）
  処理中 --> 完了 : 全区間が成功
  処理中 --> 中止 : 中止ボタン
  処理中 --> エラー : 失敗（完了分は残す）
  完了 --> 読込中 : 別のファイル
  中止 --> 準備完了 : 次の操作
  エラー --> 準備完了 : 次の操作
```

---

