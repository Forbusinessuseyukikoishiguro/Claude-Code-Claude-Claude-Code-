# 01 初回準備（Windows）

> **この手順の注意**：インストールには、数分から数十分かかります。再起動を求められたら、作業中のファイルを保存してから再起動してください。

## 1-1 PC の確認
1. スタートボタンを押し、「設定」→「システム」→「バージョン情報」を開く
2. 「Windows の仕様」の「バージョン」と「エディション」を確認する
3. 確認：Windows 10（バージョン 2004 以降）または Windows 11 であること

> 古い Windows の場合は、先に Windows Update を行ってください。

## 1-2 Windows Update を最新にする
1. スタート →「設定」→「Windows Update」→「更新プログラムのチェック」
2. 更新が出たら、インストールして再起動する
3. 確認：更新が「最新の状態です」になっていること

## 1-3 仮想化の確認（Docker を使う場合）
1. スタートで「タスクマネージャー」を開く →「パフォーマンス」→「CPU」
2. 右下の「仮想化」が「有効」になっているか確認する
3. 確認：「無効」と出る場合は、PC の BIOS/UEFI の設定で仮想化（Intel VT-x または AMD-V）を有効にする（PC の製造元の説明を参照。社内の PC は情報システム部門に依頼）

## 1-4 WSL 2 を入れる（管理者の PowerShell）
1. スタートボタンを右クリック →「ターミナル（管理者）」または「Windows PowerShell（管理者）」を開く
2. 次のコマンドを貼り付けて、Enter を押す
   ```powershell
   wsl --install -d Ubuntu
   ```
3. 再起動を求められたら、再起動する
4. 再起動後、Ubuntu が自動で開き、「ユーザー名」と「パスワード」を聞かれる。**ユーザー名は英数字で、パスワードは忘れないものにする**（パスワードは画面に表示されないのが正常）
5. 確認：PowerShell で次を実行する
   ```powershell
   wsl --list --verbose
   ```
   「Ubuntu」の行で、VERSION が **2** になっていること

## 1-5 Ubuntu の初回更新
Ubuntu のターミナルで、次を1行ずつ実行する。
```bash
sudo apt-get update
sudo apt-get upgrade -y
```
- `sudo` を使うとき、パスワードを聞かれたら、1-4 で決めたパスワードを入力する（入力しても画面に何も出ないのが正常）
- 確認：エラーで止まらず、最後に行が戻ってくること

## 1-6 Git を入れる（Windows 側）
PowerShell で、次を実行する。
```powershell
winget install --id Git.Git -e
```
- 途中の質問は、基本の選択（Next、既定値）のままでよい
- インストール後、**PowerShell を開き直す**
- 確認：`git --version` で、`git version 2.x` と表示されること

## 1-7 Node.js（LTS）を入れる
```powershell
winget install --id OpenJS.NodeJS.LTS -e
```
- 開き直したあと、次で確認する
  ```powershell
  node -v
  npm -v
  ```
- 確認：`v22.` などの番号が出ること（LTS の版）

## 1-8 Python を入れる
```powershell
winget install --id Python.Python.3.12 -e
```
- **注意**：インストーラーの画面で「Add python.exe to PATH」にチェックを入れる（winget の場合は自動で設定されることが多いが、確認する）
- 開き直したあと、次で確認する
  ```powershell
  python --version
  ```
- 確認：`Python 3.12.x` と出ること
- もし Microsoft Store の画面が開いたら、上のインストールをもう一度行い、表示される Python のコマンドを使う（`py --version` でも確認できる）

## 1-9 VS Code を入れる
```powershell
winget install --id Microsoft.VisualStudioCode -e
```
- 確認：スタートメニューから「Visual Studio Code」を開けること

## 1-10 Docker Desktop を入れる（任意だが推奨）
1. `winget install --id Docker.DockerDesktop -e` を実行する
2. インストール時の設定で「Use WSL 2 instead of Hyper-V」（WSL 2 を使う）が選ばれていることを確認する
3. 再起動し、Docker Desktop を起動する。利用条件に同意する
4. 画面の下の表示が「Engine running」（緑）になるまで待つ
5. 確認：PowerShell で `docker version` を実行し、Client と Server の両方が表示されること

> Docker Desktop の設定 →「Resources」→「WSL Integration」で、Ubuntu が有効になっていることを確認する。

## 1-11 インストールの確認（まとめ）
次の命令を、1行ずつ実行する（PowerShell）。
```powershell
git --version
node -v
python --version
code --version
wsl --list --verbose
docker version
```
- 確認：どの行もエラーが出ないこと。`code` が見つからない場合は、VS Code を開いて「Ctrl + Shift + P」→「Shell Command: Install 'code' command in PATH」を実行する
