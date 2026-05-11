# 5S Action Tracker

工場・職場の5S改善活動を管理するWebアプリケーションです。

## 起動方法

### Windows
`START.bat` をダブルクリックするだけ！

### 前提条件
- [Node.js](https://nodejs.org/) v18以上がインストールされていること

### 手動起動（Mac/Linux）
```bash
npm install
node server/mock-server.js &
npx vite --host
```

ブラウザで http://localhost:5173 を開いてください。

## 機能

- 📷 写真アップロードによるアクションアイテム作成
- ✏️ タイトル入力によるアクションアイテム作成
- 🏷️ ステータス管理（未着手→作業中→作業完了→完了）
- 👥 POC（担当者）の複数名アサイン
- 📅 期限（Due）設定
- 💬 アイテム内チャット
- 🎉 完了済みアクションの成果表示
- 📊 ダッシュボード（改善効果の可視化）
- 🏭 DSサイト選択
