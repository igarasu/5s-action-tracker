# 5S Action Tracker - デプロイ手順書

## 前提条件

- AWS アカウント（Amplify, Lambda, DynamoDB の権限が必要）
- AWS CLI がインストール済み
- Git リポジトリ（GitHub, CodeCommit, etc.）

## 方法1: AWS Amplify Hosting（推奨・最も簡単）

### ステップ1: GitHubリポジトリにプッシュ

```bash
git init
git add .
git commit -m "Initial commit: 5S Action Tracker"
git remote add origin https://github.com/YOUR_ORG/5s-action-tracker.git
git push -u origin main
```

### ステップ2: AWS Amplify でアプリを作成

1. AWS Console → Amplify を開く
2. 「New app」→「Host web app」を選択
3. GitHub を選択し、リポジトリを接続
4. ブランチ: `main` を選択
5. ビルド設定:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install
    build:
      commands:
        - cd client && npm run build
  artifacts:
    baseDirectory: client/dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

6. 「Save and deploy」をクリック

### ステップ3: バックエンド（モックサーバー）のデプロイ

#### オプションA: AWS Lambda + API Gateway（サーバーレス）

1. `server/mock-server.js` を Lambda 用に変換（serverless-http パッケージを使用）
2. API Gateway で REST API を作成
3. フロントエンドの `VITE_API_BASE_URL` を API Gateway の URL に設定

#### オプションB: EC2 にデプロイ

1. EC2 インスタンスを起動（t3.micro で十分）
2. Node.js をインストール
3. `server/mock-server.js` を PM2 で起動
4. Nginx でリバースプロキシを設定

### ステップ4: カスタムドメイン（オプション）

1. Amplify Console → Domain management
2. カスタムドメインを追加（例: 5s-tracker.your-team.amazon.com）
3. SSL証明書は自動発行

## 方法2: 簡易デプロイ（フロントエンドのみ）

フロントエンドだけを S3 + CloudFront にデプロイする方法:

```bash
# ビルド
cd client
npm run build

# S3にアップロード
aws s3 sync dist/ s3://your-bucket-name/ --delete

# CloudFront のキャッシュを無効化
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

## PWA としてスマホに追加

デプロイ後、スマホのブラウザで URL にアクセスし:

### iPhone (Safari)
1. 共有ボタン（□↑）をタップ
2. 「ホーム画面に追加」を選択
3. 「追加」をタップ

### Android (Chrome)
1. メニュー（⋮）をタップ
2. 「ホーム画面に追加」を選択
3. 「追加」をタップ

## 環境変数

### フロントエンド（Amplify の環境変数に設定）
- `VITE_API_BASE_URL`: バックエンドの URL（例: https://api.your-domain.com/api）

### バックエンド
- `PORT`: サーバーポート（デフォルト: 3000）
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: PostgreSQL（本番用）
- `OPENAI_API_KEY`: AI タイトル生成用
- `AWS_REGION`, `AWS_S3_BUCKET`: 写真ストレージ用

## コード修正後の再デプロイ

```bash
# コードを修正
git add .
git commit -m "Fix: description of change"
git push origin main
# → Amplify が自動的に再ビルド＆デプロイ（約2-3分）
```

GitHub 連携の場合、`git push` するだけで自動デプロイされます。

## トラブルシューティング

| 問題 | 解決策 |
|------|--------|
| ビルドエラー | Amplify Console のビルドログを確認 |
| API接続エラー | VITE_API_BASE_URL が正しいか確認 |
| PWAが更新されない | Service Worker のキャッシュバージョンを更新（`CACHE_NAME` を変更） |
| スマホでカメラが起動しない | HTTPS が必須（HTTP では動作しない） |

## PWA アイコンについて

現在 SVG アイコン（`client/public/icons/icon.svg`）を使用しています。
本番環境では、以下のサイズの PNG アイコンを追加することを推奨します:

- `icon-192.png` (192x192) - Android ホーム画面用
- `icon-512.png` (512x512) - スプラッシュスクリーン用

PNG を追加した場合は `client/public/manifest.json` の `icons` 配列も更新してください。
