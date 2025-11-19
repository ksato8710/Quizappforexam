# クイズアプリ AI Ready Design System (Draft)

## 1. Overview

### プロダクト概要
中学受験の学習をするためのWebベースクイズアプリケーション。ユーザー認証、クイズ回答、進捗追跡、統計表示の機能を提供。

### デザインの印象・特徴
- **グラデーション重視**: 青からインディゴへの滑らかなグラデーションをブランドアイデンティティとして使用
- **高コントラスト**: 読みやすさを重視した明確なテキストコントラスト
- **柔らかい印象**: 角丸、ソフトシャドウ、淡い背景色で教育的かつ親しみやすいUI
- **セマンティックカラー**: 正解=緑、不正解=赤、難易度レベル=段階的な色分けで直感的な理解を促進

### このデザインシステムのゴール
AIコード生成ツールやUI生成ツールが、プロンプトから一貫性のあるUIコンポーネントを自動生成できるよう、**曖昧さを排除した数値ベースの仕様**として整理。トークン名、カラーコード、スペーシング値、コンポーネントバリエーションを明確に定義。

---

## 2. Design Tokens

### 2.1 Color

#### プライマリカラーパレット

| トークン名 | 用途 | 値 (HEX/OKLCH) | 備考 |
|----------|------|---------------|------|
| `primary` | 主要アクション、強調 | `#030213` | ほぼ黒、テキストやアイコンに使用 |
| `primary-foreground` | primary背景上のテキスト | `#ffffff` | 白 |
| `secondary` | 副次的な要素 | `oklch(0.95 0.0058 264.53)` | 非常に淡いグレー |
| `secondary-foreground` | secondary背景上のテキスト | `#030213` | primary と同じ |
| `background` | ページ背景 | `#ffffff` | 白 |
| `foreground` | 通常テキスト | `oklch(0.145 0 0)` | 濃いグレー |
| `muted` | 非活性・補助背景 | `#ececf0` | 淡いグレー |
| `muted-foreground` | 非活性テキスト | `#717182` | 中間グレー |
| `accent` | ホバー背景などアクセント | `#e9ebef` | 淡いグレー青 |
| `accent-foreground` | accent背景上のテキスト | `#030213` | 黒に近い |
| `destructive` | エラー、削除アクション | `#d4183d` | 赤 |
| `destructive-foreground` | destructive背景上のテキスト | `#ffffff` | 白 |
| `border` | 境界線 | `rgba(0, 0, 0, 0.1)` | 10%黒、半透明 |
| `input-background` | 入力欄背景 | `#f3f3f5` | 淡いグレー |

#### ブランドグラデーション

| トークン名 | 用途 | 値 | 備考 |
|----------|------|-----|------|
| `brand-gradient-from` | グラデーション開始色 | `blue-500` = `oklch(0.623 0.214 259.815)` | 鮮やかな青 |
| `brand-gradient-to` | グラデーション終了色 | `indigo-600` = `oklch(0.511 0.262 276.966)` | 濃いインディゴ |
| `brand-gradient-hover-from` | ホバー時グラデーション開始 | `blue-600` = `oklch(0.546 0.245 262.881)` | より濃い青 |
| `brand-gradient-hover-to` | ホバー時グラデーション終了 | `indigo-700` = `oklch(0.457 0.24 277.023)` | さらに濃いインディゴ |

**使用例**: `bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700`

#### セマンティックカラー（状態別）

**成功 (Success)**

| 階層 | 値 | 用途 |
|-----|-----|------|
| `success-50` | `oklch(.982 .018 155.826)` | 極淡い背景 |
| `success-100` | `oklch(.962 .044 156.743)` | 淡い背景 |
| `success-200` | `oklch(.925 .084 155.995)` | ボーダー |
| `success-600` | `oklch(.627 .194 149.214)` | テキスト（強調） |
| `success-700` | `oklch(.527 .154 150.069)` | テキスト（濃い） |
| `success-900` | `oklch(.393 .095 152.535)` | 最も濃いテキスト |

**エラー (Error)**

| 階層 | 値 | 用途 |
|-----|-----|------|
| `error-50` | `oklch(.971 .013 17.38)` | 極淡い背景 |
| `error-100` | `oklch(.936 .032 17.717)` | 淡い背景 |
| `error-200` | `oklch(.885 .062 18.334)` | ボーダー |
| `error-600` | `oklch(.577 .245 27.325)` | テキスト（強調） |
| `error-700` | `oklch(.505 .213 27.518)` | テキスト（濃い） |
| `error-900` | `oklch(.396 .141 25.723)` | 最も濃いテキスト |

**警告 (Warning)**

| 階層 | 値 | 用途 |
|-----|-----|------|
| `warning-50` | `oklch(.98 .016 73.684)` | 極淡い背景 |
| `warning-100` | `oklch(.954 .038 75.164)` | 淡い背景 |
| `warning-200` | `oklch(.901 .076 70.697)` | ボーダー |
| `warning-700` | `oklch(.553 .195 38.402)` | テキスト |

**情報 (Info)**

| 階層 | 値 | 用途 |
|-----|-----|------|
| `info-50` | `oklch(.97 .014 254.604)` | 極淡い背景 |
| `info-100` | `oklch(.932 .032 255.585)` | 淡い背景 |
| `info-200` | `oklch(.882 .059 254.128)` | ボーダー |
| `info-600` | `oklch(.546 .245 262.881)` | テキスト（強調） |
| `info-700` | `oklch(.488 .243 264.376)` | テキスト（濃い） |

#### 難易度レベル専用カラー

| レベル | 背景 | テキスト | ボーダー | 用途 |
|-------|-----|---------|---------|------|
| Level 2 (やさしい) | `green-100` | `green-700` | `green-200` | 最も簡単 |
| Level 3 (ふつう) | `blue-100` | `blue-700` | `blue-200` | 標準 |
| Level 4 (むずかしい) | `orange-100` | `orange-700` | `orange-200` | 難しい |
| Level 5 (とてもむずかしい) | `red-100` | `red-700` | `red-200` | 最難関 |
| Default | `gray-100` | `gray-700` | `gray-200` | 難易度未設定 |

**星アイコン**: レベル2=⭐、レベル3=⭐⭐、レベル4=⭐⭐⭐、レベル5=⭐⭐⭐⭐

#### 背景グラデーション

| パターン名 | 値 | 用途 |
|----------|-----|------|
| `bg-main` | `bg-gradient-to-br from-blue-50 to-indigo-100` | メインページ背景 |
| `bg-success` | `bg-gradient-to-br from-green-50 to-emerald-50` | 正解表示エリア |
| `bg-error` | `bg-gradient-to-br from-red-50 to-orange-50` | 不正解表示エリア |
| `bg-info` | `bg-gradient-to-r from-indigo-50 to-blue-50` | 情報ボックス背景 |

---

### 2.2 Typography

#### フォントファミリ

| トークン名 | 値 |
|----------|-----|
| `font-sans` | `ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"` |
| `font-mono` | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace` |

**デフォルト**: `font-sans`

#### フォントサイズとラインハイト

| トークン名 | サイズ (px/rem) | Line Height | 用途 |
|----------|---------------|-------------|------|
| `text-xs` | `12px / 0.75rem` | `1.5` | 極小テキスト、ラベル補助 |
| `text-sm` | `14px / 0.875rem` | `1.43` | 小テキスト、補助情報 |
| `text-base` | `16px / 1rem` | `1.5` | 本文、標準テキスト |
| `text-lg` | `18px / 1.125rem` | `1.5` | 中見出し |
| `text-xl` | `20px / 1.25rem` | `1.5` | 大見出し |
| `text-2xl` | `24px / 1.5rem` | `1.5` | ページタイトル |

#### フォントウェイト

| トークン名 | 値 | 用途 |
|----------|-----|------|
| `font-normal` | `400` | 本文 |
| `font-medium` | `500` | ラベル、ボタン |
| `font-semibold` | `600` | 小見出し、強調 |
| `font-bold` | `700` | 大見出し、数値強調 |

#### タイポグラフィスタイルセット

| スタイル名 | クラス構成 | 用途 |
|----------|-----------|------|
| `heading-1` | `text-2xl font-medium text-indigo-900` | ページタイトル |
| `heading-2` | `text-xl font-semibold text-gray-900` | セクションタイトル |
| `heading-3` | `text-lg font-semibold text-gray-900` | サブセクション |
| `body-default` | `text-base font-normal text-gray-900 leading-relaxed` | 本文 |
| `body-secondary` | `text-sm font-normal text-gray-700` | 補助本文 |
| `label-primary` | `text-sm font-medium text-indigo-900` | フォームラベル |
| `label-secondary` | `text-xs font-medium text-gray-600` | 補助ラベル |
| `muted-text` | `text-sm text-muted-foreground` | 非活性・補助テキスト |

---

### 2.3 Spacing

#### スペーシングスケール（4px刻み）

| トークン名 | 値 (px/rem) | 用途例 |
|----------|------------|--------|
| `spacing-1` | `4px / 0.25rem` | 極小余白 |
| `spacing-1.5` | `6px / 0.375rem` | アイコン間など |
| `spacing-2` | `8px / 0.5rem` | 小余白 |
| `spacing-3` | `12px / 0.75rem` | 中小余白 |
| `spacing-4` | `16px / 1rem` | 標準余白 |
| `spacing-5` | `20px / 1.25rem` | 中余白 |
| `spacing-6` | `24px / 1.5rem` | 大余白 |
| `spacing-8` | `32px / 2rem` | 特大余白 |
| `spacing-10` | `40px / 2.5rem` | セクション間 |
| `spacing-12` | `48px / 3rem` | ページセクション間 |

#### よく使われる余白パターン

**カード内余白**:
- 小カード: `p-4` (16px)
- 標準カード: `p-6` (24px)
- 大カード: `p-8` (32px)

**セクション間余白**:
- 小: `space-y-2` (8px)
- 標準: `space-y-4` (16px)
- 大: `space-y-6` (24px)
- 特大: `space-y-8` (32px)

**ボタン内余白**:
- 小: `px-3 py-1.5` (12px × 6px)
- 標準: `px-4 py-2` (16px × 8px)
- 大: `px-6 py-3` (24px × 12px)

**テーブルセル余白**:
- ヘッダー: `h-12 px-4` (高さ48px、左右16px)
- セル: `px-4 py-4` (16px全方向)

**フォーム要素間隔**:
- グリッドギャップ: `gap-4` (16px)
- 縦方向スタック: `space-y-3` (12px)

---

### 2.4 Radius

#### 角丸トークン

| トークン名 | 値 (px) | 用途 |
|----------|---------|------|
| `radius-sm` | `6px` | 小要素（バッジなど） |
| `radius-md` | `8px` | 標準要素（ボタン、入力） |
| `radius-lg` | `10px` | 大要素（選択ボックスなど） |
| `radius-xl` | `14px` | カード |
| `radius-2xl` | `16px` | 大型カード |
| `radius-full` | `9999px` | 円形、ピル型 |

#### コンポーネント別角丸指針

| コンポーネント | 角丸トークン | 実際のクラス |
|-------------|-----------|------------|
| Button | `radius-md` | `rounded-md` |
| Input | `radius-md` | `rounded-md` |
| Select | `radius-lg` | `rounded-lg` |
| Badge (難易度) | `radius-md` | `rounded-md` |
| Badge (タグ) | `radius-full` | `rounded-full` |
| Card (小) | `radius-xl` | `rounded-xl` |
| Card (大) | `radius-2xl` | `rounded-2xl` |
| Progress Bar | `radius-full` | `rounded-full` |
| Choice Button | `radius-lg` | `rounded-lg` |
| Info Box | 左角丸なし、右側のみ`radius-lg` | `rounded-r-lg` |

---

### 2.5 Shadow & Border

#### シャドウトークン

| トークン名 | 値 | 用途 |
|----------|-----|------|
| `shadow-sm` | `0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)` | ヘッダー、ナビゲーション |
| `shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)` | カード、フィルターパネル |
| `shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)` | モーダル、ポップオーバー |
| `shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)` | メインカード（クイズカード、認証カード） |

#### ボーダーパターン

| パターン名 | クラス | 用途 |
|----------|--------|------|
| `border-default` | `border border-gray-200` | 標準境界線 |
| `border-input` | `border border-input` | 入力欄（10%黒） |
| `border-thick` | `border-2 border-gray-200` | 太めの境界線 |
| `border-focus` | `border-2 border-indigo-500` | フォーカス時 |
| `border-left-accent` | `border-l-4 border-{color}-500` | 左側アクセント境界線（情報ボックス） |

**境界線の色**:
- デフォルト: `border-gray-200`
- ホバー: `border-indigo-300`
- フォーカス: `border-indigo-500`
- エラー: `border-red-200` / `border-destructive`
- 成功: `border-green-200`

---

## 3. Components

### 3.1 Button

#### 役割
ユーザーのアクション実行トリガー。クイズ回答送信、ログイン、ナビゲーション、状態リセットなど。

#### バリエーション

**1. Primary (default)**
```tsx
className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
```
- 背景: `bg-primary` (#030213)
- テキスト: `text-primary-foreground` (白)
- ホバー: `hover:bg-primary/90` (90%不透明度)
- 用途: 主要アクション（ログイン、回答送信）

**2. Gradient (ブランド専用)**
```tsx
className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-9 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md disabled:opacity-50"
```
- グラデーション: 青500→インディゴ600
- ホバー: 青600→インディゴ700
- 用途: ブランド強調アクション（クイズ開始、次へ進む）

**3. Outline**
```tsx
className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-9 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
```
- 背景: 透明→ホバーで`bg-accent`
- ボーダー: `border-input`
- 用途: 二次アクション（戻る、キャンセル）

**4. Ghost**
```tsx
className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-9 px-4 py-2 hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
```
- 背景: なし→ホバーで`bg-accent`
- 用途: 軽いアクション、アイコンボタン

**5. Destructive**
```tsx
className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-9 px-4 py-2 bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50"
```
- 背景: `bg-destructive` (#d4183d 赤)
- 用途: 削除、リセットなど破壊的アクション

#### サイズバリエーション

| サイズ名 | クラス | 高さ | パディング |
|---------|--------|------|----------|
| `sm` | `h-8 px-3 gap-1.5` | 32px | 左右12px |
| `default` | `h-9 px-4 py-2` | 36px | 左右16px、上下8px |
| `lg` | `h-10 px-6` | 40px | 左右24px |
| `icon` | `size-9` | 36px×36px | アイコンのみ |

#### 状態

| 状態 | クラス | 外観 |
|------|--------|------|
| Default | - | 通常表示 |
| Hover | `hover:bg-{variant}/90` または `hover:from-{color}` | 背景色が10%暗くなるかグラデーション変化 |
| Focus | `focus-visible:ring-[3px] focus-visible:ring-ring/50` | 3pxのフォーカスリング表示 |
| Disabled | `disabled:opacity-50 disabled:pointer-events-none` | 50%不透明度、クリック不可 |

#### 簡易インターフェース例

```tsx
type ButtonProps = {
  variant?: 'default' | 'gradient' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
};

// 使用例
<Button variant="gradient" size="lg" onClick={handleSubmit}>
  回答する
</Button>
```

---

### 3.2 Input / Form Controls

#### テキスト入力

**ベーススタイル**:
```tsx
className="flex h-9 w-full min-w-0 rounded-md border border-input px-3 py-1 text-base bg-input-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50 md:text-sm"
```

- 高さ: `h-9` (36px)
- 背景: `bg-input-background` (#f3f3f5)
- ボーダー: `border border-input` (10%黒)
- フォーカス: 3px青リング、ボーダー色変更
- レスポンシブ: モバイル`text-base`、デスクトップ`md:text-sm`

**エラーステート**:
```tsx
className="... aria-invalid:border-destructive aria-invalid:ring-destructive/20"
```
- ボーダー: 赤に変化
- リング: 赤20%

**プレースホルダー**:
- 色: `placeholder:text-muted-foreground` (#717182)

#### セレクトボックス

```tsx
className="border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
```

- 太めのボーダー: `border-2`
- フォーカス: インディゴボーダー＋リング
- 角丸: `rounded-lg` (10px)

#### フォームラベル

```tsx
className="text-sm text-gray-700 flex flex-col font-medium text-indigo-900 mb-2"
```

- サイズ: `text-sm` (14px)
- カラー: `text-indigo-900`
- ウェイト: `font-medium`
- マージン: `mb-2` (8px下)

#### ヘルプテキスト・エラーメッセージ

**エラーメッセージボックス**:
```tsx
className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
```

---

### 3.3 Card / Panel

#### 役割
情報のグルーピング、視覚的な分離。統計カード、クイズカード、認証カード、詳細ビューなど。

#### ベースカードスタイル

```tsx
className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border shadow-md"
```

- 背景: `bg-card` (白)
- 角丸: `rounded-xl` (14px)
- シャドウ: `shadow-md`
- ボーダー: デフォルト境界線
- 内部ギャップ: `gap-6` (24px)

#### カードバリエーション

**1. 標準カード（統計、リストなど）**:
```tsx
className="bg-white rounded-xl shadow-md p-6"
```

**2. 大型カード（クイズメイン、認証）**:
```tsx
className="bg-white shadow-xl rounded-2xl p-8"
```
- シャドウ: `shadow-xl`（より大きな影）
- 角丸: `rounded-2xl` (16px)
- パディング: `p-8` (32px)

**3. テーブルラップカード**:
```tsx
className="p-0 overflow-hidden shadow-md rounded-xl"
```
- パディング: `p-0`（テーブルが直接収まる）
- オーバーフロー制御: `overflow-hidden`

**4. インタラクティブカード（リスト行など）**:
```tsx
className="p-5 cursor-pointer hover:shadow-lg hover:border-indigo-300 transition-all active:scale-[0.98] shadow-md border-2 border-gray-100"
```
- ホバー: 影拡大、ボーダー色変更
- アクティブ: 98%にスケールダウン（押下感）

#### カード内サブコンポーネント

**CardHeader**:
```tsx
className="px-6 pt-6 gap-1.5"
```

**CardTitle**:
```tsx
<h4 className="leading-none">タイトル</h4>
```

**CardDescription**:
```tsx
className="text-muted-foreground"
```

**CardContent**:
```tsx
className="px-6 [&:last-child]:pb-6"
```
- 最後の要素の場合のみ下パディング追加

**CardFooter**:
```tsx
className="flex items-center px-6 pb-6"
```

---

### 3.4 Navigation

#### ヘッダー構造

**ベースレイアウト**:
```tsx
<div className="flex justify-between items-center mb-8">
  <h1 className="text-indigo-900">ページタイトル</h1>
  <div className="flex gap-2">
    {/* ボタン類 */}
  </div>
</div>
```

**レスポンシブヘッダー**:
```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <h1 className="text-indigo-900">クイズ一覧</h1>
  <div className="flex gap-2 flex-wrap">
    {/* アクションボタン */}
  </div>
</div>
```
- モバイル: 縦並び
- デスクトップ: 横並び、両端配置

#### アイコン付きヘッダー要素

```tsx
<div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
  <BookOpen className="w-6 h-6 text-indigo-600" />
  <span className="text-indigo-900 font-medium">要素名</span>
</div>
```

---

### 3.5 Table

#### 役割
クイズ一覧、履歴データなど構造化データの表示。

#### テーブル構造

**ベース**:
```tsx
<Table className="w-full caption-bottom text-sm" />
```

**ヘッダー行**:
```tsx
<TableRow className="bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-50 hover:to-indigo-50">
  <TableHead className="h-12 px-4 font-semibold text-indigo-900 whitespace-normal">列名</TableHead>
</TableRow>
```

- 背景: 青50→インディゴ50のグラデーション
- 高さ: `h-12` (48px)
- パディング: `px-4` (左右16px)
- テキスト: `text-indigo-900 font-semibold`

**データ行**:
```tsx
<TableRow className="cursor-pointer hover:bg-indigo-50 transition-colors border-b border-gray-100">
  <TableCell className="px-4 py-4 whitespace-normal">内容</TableCell>
</TableRow>
```

- ホバー: `hover:bg-indigo-50`
- ボーダー: 下側のみ `border-b border-gray-100`
- セル余白: `px-4 py-4` (全方向16px)

#### レスポンシブ列幅パターン（クイズ一覧の例）

| 列名 | 幅 | 最小幅 | テキスト処理 |
|-----|-----|--------|------------|
| クイズ内容 | `w-[23%]` | `min-w-[170px]` | `whitespace-normal break-words` |
| 難易度 | `w-[12%]` | `min-w-[110px]` | `whitespace-nowrap` |
| 教科 | `w-[15%]` | `min-w-[110px]` | `whitespace-normal break-words` |
| 単元 | `w-[32%]` | `min-w-[240px]` | `whitespace-normal break-words` |
| 過去の回答数 | `w-[9%]` | `min-w-[80px]` | `whitespace-nowrap` |
| 過去の正答率 | `w-[9%]` | `min-w-[80px]` | `whitespace-nowrap` |

**合計100%、テキスト折り返し対応、最小幅保証**

---

### 3.6 Badge

#### 役割
難易度表示、カテゴリタグ、問題番号、状態インジケータなど小さな情報ラベル。

#### 難易度バッジ（星アイコン付き）

**レベル2（やさしい）**:
```tsx
<div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-100 text-green-700 font-medium text-sm">
  <span>⭐</span>
  <span>やさしい</span>
</div>
```

**レベル3（ふつう）**:
```tsx
<div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-100 text-blue-700 font-medium text-sm">
  <span>⭐⭐</span>
  <span>ふつう</span>
</div>
```

**レベル4（むずかしい）**:
```tsx
<div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-orange-100 text-orange-700 font-medium text-sm">
  <span>⭐⭐⭐</span>
  <span>むずかしい</span>
</div>
```

**レベル5（とてもむずかしい）**:
```tsx
<div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-100 text-red-700 font-medium text-sm">
  <span>⭐⭐⭐⭐</span>
  <span>とてもむずかしい</span>
</div>
```

#### カテゴリバッジ

```tsx
<span className="inline-block bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1 rounded-full text-sm">
  カテゴリ名
</span>
```

#### 問題番号バッジ

```tsx
<span className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-1 rounded-full">
  問題 {number}
</span>
```

#### 成功・エラーバッジ

**成功**:
```tsx
<span className="inline-block text-white px-3 py-1 rounded-full bg-green-600">
  正解
</span>
```

**エラー**:
```tsx
<span className="inline-block text-white px-3 py-1 rounded-full bg-red-600">
  不正解
</span>
```

---

### 3.7 Progress Bar

#### 役割
クイズ進捗の視覚化。

#### 構造

**コンテナ**:
```tsx
<div className="h-2 bg-gray-200 rounded-full overflow-hidden">
  <div
    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
    style={{ width: `${progress}%` }}
  />
</div>
```

- コンテナ高さ: `h-2` (8px)
- 背景: `bg-gray-200`
- 角丸: `rounded-full`
- バー: ブランドグラデーション、トランジション300ms

---

### 3.8 Modal / Dialog (推定)

**注**: 現在のコードには明示的なモーダルはないが、Radix UI Dialogコンポーネントが利用可能。

**推定スタイル**:
```tsx
<Dialog>
  <DialogContent className="bg-white rounded-2xl shadow-xl p-8 max-w-md">
    <DialogTitle className="text-xl font-semibold text-gray-900">
      タイトル
    </DialogTitle>
    <DialogDescription className="text-gray-700">
      説明文
    </DialogDescription>
    {/* コンテンツ */}
  </DialogContent>
</Dialog>
```

---

### 3.9 Info Box（アプリ固有）

#### 役割
クイズ詳細画面での情報ブロック（問題、解答、解説、選択肢）。

#### バリエーション

**問題ボックス**:
```tsx
<div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-l-4 border-indigo-500 p-5 rounded-r-lg">
  <p className="text-indigo-900 font-semibold mb-2 text-sm">問題</p>
  <p className="text-gray-900 whitespace-pre-wrap leading-relaxed text-lg">{question}</p>
</div>
```

**解答ボックス**:
```tsx
<div className="bg-green-50 border-l-4 border-green-500 p-5 rounded-r-lg">
  <p className="text-green-900 font-semibold mb-2 text-sm">解答</p>
  <p className="text-gray-900 whitespace-pre-wrap leading-relaxed font-medium">{answer}</p>
</div>
```

**解説ボックス**:
```tsx
<div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-lg">
  <p className="text-blue-900 font-semibold mb-2 text-sm">解説</p>
  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{explanation}</p>
</div>
```

**選択肢ボックス**:
```tsx
<div className="bg-purple-50 border-l-4 border-purple-500 p-5 rounded-r-lg">
  <p className="text-purple-900 font-semibold mb-2 text-sm">選択肢</p>
  <ul className="space-y-2">
    {choices.map((c, i) => (
      <li key={i} className="flex items-start gap-2">
        <span className="font-semibold text-purple-600 min-w-[1.5rem]">{String.fromCharCode(65 + i)}.</span>
        <span className="text-gray-800">{c}</span>
      </li>
    ))}
  </ul>
</div>
```

---

### 3.10 Answer Result Box（アプリ固有）

#### 正解ボックス

```tsx
<div className="border-2 rounded-xl p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
  <div className="flex items-center gap-2 mb-4">
    <CheckCircle2 className="w-6 h-6 text-green-600" />
    <span className="text-green-600 font-semibold text-lg">正解！</span>
  </div>
  <div className="border-t pt-4 mt-4 border-green-200">
    {/* 解説など */}
  </div>
</div>
```

#### 不正解ボックス

```tsx
<div className="border-2 rounded-xl p-6 bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
  <div className="flex items-center gap-2 mb-4">
    <XCircle className="w-6 h-6 text-red-600" />
    <span className="text-red-600 font-semibold text-lg">不正解</span>
  </div>
  <div className="border-t pt-4 mt-4 border-red-200">
    {/* 正解と解説 */}
  </div>
</div>
```

---

## 4. Layout & Patterns

### 4.1 ページレイアウト

#### ベースページ構造

**全画面背景**:
```tsx
<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
  <div className="max-w-{size} mx-auto space-y-6">
    {/* コンテンツ */}
  </div>
</div>
```

- 最小高さ: `min-h-screen`（100vh）
- 背景グラデーション: 青50→インディゴ100、右下方向
- 外側余白: 上下32px、左右16px
- コンテンツ幅制限: `max-w-{size}`（サイズは用途による）
- 内部縦スタック: `space-y-6` (24px)

#### コンテナサイズ別用途

| サイズ | クラス | 用途 |
|-------|--------|------|
| 小 | `max-w-md` (448px) | 認証画面 |
| 中 | `max-w-3xl` (768px) | クイズ画面、詳細ビュー |
| 大 | `max-w-5xl` (1024px) | 一覧画面、統計ダッシュボード |

#### センタリングレイアウト（認証など）

```tsx
<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
  <div className="max-w-md w-full">
    {/* 認証カードなど */}
  </div>
</div>
```

- Flexbox中央配置: `flex items-center justify-center`
- 全幅だが最大幅制限: `max-w-md w-full`

#### ブレークポイント

- **モバイルファースト**: デフォルトでモバイル向けスタイル
- **md**: `768px` 以上でタブレット・デスクトップ向けスタイル適用

**例**:
```tsx
className="text-base md:text-sm"  // モバイル16px、デスクトップ14px
className="grid grid-cols-1 md:grid-cols-3"  // モバイル1列、デスクトップ3列
```

---

### 4.2 よくあるUIパターン

#### パターン1: 認証画面

**構成**:
- 全画面センタリングレイアウト
- 大型カード（shadow-xl, rounded-2xl, p-8）
- ロゴ・タイトル（中央揃え）
- フォーム（入力×2〜3、ボタン）
- フッターリンク（切り替え用）

**コンポーネント組み合わせ**:
```
Container (min-h-screen, flex, center) >
  Card (max-w-md, shadow-xl) >
    Logo Icon (gradient circle, mb-6)
    Heading (text-2xl, mb-6)
    Form (space-y-4) >
      Input (email)
      Input (password, with toggle)
      Button (gradient, w-full)
    Link (text-center, mt-4)
```

---

#### パターン2: クイズ回答画面

**構成**:
- コンテンツ幅制限レイアウト（max-w-3xl）
- ヘッダー（戻るボタン＋問題番号バッジ＋進捗バー）
- メインカード（shadow-xl, p-8）
  - 難易度バッジ
  - カテゴリバッジ
  - 問題文
  - 入力欄または選択肢ボタン
  - 回答ボタン
- 結果表示（正解・不正解ボックス）

**コンポーネント組み合わせ**:
```
Container (min-h-screen, bg-gradient) >
  Content Wrapper (max-w-3xl, mx-auto) >
    Header (flex, justify-between, items-center) >
      Button (outline, back)
      Badge (question number, gradient)
      Progress Bar
    Card (shadow-xl, rounded-2xl) >
      Badge Group (difficulty, category)
      Question Text
      Input / Choice Buttons
      Button (gradient, submit)
    Result Box (conditional, gradient bg) >
      Icon + Status Text
      Explanation
```

---

#### パターン3: 一覧＋フィルタ

**構成**:
- コンテンツ幅制限レイアウト（max-w-5xl）
- ヘッダー（タイトル＋アクションボタン）
- フィルターカード（shadow-md, p-6）
  - セレクトボックス群（グリッド配置）
  - 件数表示
  - クリアボタン
- テーブルカード（shadow-md, p-0）
  - テーブルヘッダー（グラデーション背景）
  - テーブル行（ホバーハイライト）

**コンポーネント組み合わせ**:
```
Container (min-h-screen, bg-gradient) >
  Content Wrapper (max-w-5xl, mx-auto, space-y-6) >
    Header (flex, justify-between) >
      Heading
      Button Group (outline)
    Filter Card (shadow-md, p-6) >
      Grid (md:grid-cols-5, gap-4) >
        Select × N
      Result Count + Clear Button
    Table Card (shadow-md, p-0, overflow-hidden) >
      Table >
        TableHeader (gradient bg)
        TableBody (hover rows)
```

---

#### パターン4: 統計ダッシュボード

**構成**:
- コンテンツ幅制限レイアウト（max-w-5xl）
- ヘッダー（タイトル＋アクションボタン）
- 統計カードグリッド（3列、md:grid-cols-3）
  - 各カード: アイコン＋ラベル＋数値
- アクションボタングループ（中央揃え）

**コンポーネント組み合わせ**:
```
Container (min-h-screen, bg-gradient) >
  Content Wrapper (max-w-5xl, mx-auto, space-y-6) >
    Header (flex, justify-between)
    Grid (md:grid-cols-3, gap-4) >
      Card × 3 (shadow-md, p-6) >
        Icon + Label + Value
    Button Group (flex, gap-3, justify-center) >
      Button (gradient) × N
```

---

#### パターン5: 詳細ビュー

**構成**:
- コンテンツ幅制限レイアウト（max-w-3xl）
- ヘッダー（タイトル＋複数アクションボタン）
- 大型カード（shadow-lg, p-8, space-y-6）
  - 情報ボックス群（縦スタック）
  - 情報グリッド（2列、grid-cols-2）

**コンポーネント組み合わせ**:
```
Container (min-h-screen, bg-gradient) >
  Content Wrapper (max-w-3xl, mx-auto, space-y-6) >
    Header (flex, justify-between) >
      Heading
      Button Group (flex, gap-2)
    Card (shadow-lg, p-8, space-y-6) >
      Info Box × N (border-l-4, gradient bg)
      Grid (grid-cols-2, gap-4) >
        Info Item × N
```

---

## 5. Accessibility & States (簡易)

### コントラスト

- **本文テキスト**: 濃いグレー（#030213など）on 白背景 → 高コントラスト
- **セマンティック色**: 各レベル（600, 700, 900）で十分なコントラスト確保
- **バッジ**: 淡い背景（100）＋濃いテキスト（700）で可読性確保

### フォーカスインジケータ

- **フォーカスリング**: `focus-visible:ring-[3px] focus-visible:ring-ring/50`
  - 3px幅、50%不透明度の青リング
  - `focus-visible`でキーボードフォーカス時のみ表示
- **ボーダー変化**: `focus:border-indigo-500` でボーダー色変更

### ARIA属性

- `aria-label`: 入力欄、選択ボックスに明示的ラベル
- `aria-invalid`: エラー状態の入力欄にtrue設定
- セマンティックHTMLタグ使用（h1〜h4, button, input, labelなど）

### エラー表示

**インライン入力エラー**:
```tsx
<input aria-invalid="true" className="... aria-invalid:border-destructive aria-invalid:ring-destructive/20" />
```

**エラーメッセージボックス**:
```tsx
<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
  エラーメッセージ
</div>
```

### ローディング表示

**テキストローディング**:
```tsx
<div className="text-indigo-600">読み込み中...</div>
```

**ボタンローディング**:
```tsx
<Button disabled={loading}>
  {loading ? '処理中...' : '送信'}
</Button>
```

---

## 6. AIから利用する際のガイド

### 6.1 コード生成AIへの指示例

#### 例1: 新しいクイズ設定画面を作成

```
江戸時代クイズアプリのデザインシステムに従って、クイズ設定画面のReactコンポーネントを生成してください。

要件:
- レイアウト: 全画面背景グラデーション（bg-gradient-to-br from-blue-50 to-indigo-100）、コンテンツ幅max-w-3xl
- ヘッダー: 「クイズ設定」（text-indigo-900）と「戻る」ボタン（outline variant）
- カード: shadow-xl, rounded-2xl, p-8
- フォーム要素:
  - セレクトボックス×3（教科、単元、難易度）、スタイル: border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200
  - ラベル: text-sm font-medium text-indigo-900 mb-2
  - ボタン: gradient variant（bg-gradient-to-r from-blue-500 to-indigo-600）、全幅
- スペーシング: space-y-4 でフォーム要素を縦スタック

使用トークン:
- color.brand-gradient-from, color.brand-gradient-to
- spacing-4, spacing-6, spacing-8
- radius-xl, radius-2xl
- shadow-xl
```

#### 例2: 統計カードコンポーネント生成

```
江戸時代クイズアプリのデザインシステムに従って、統計カードのReactコンポーネントを生成してください。

要件:
- カード: bg-white rounded-xl shadow-md p-6
- レイアウト: 縦スタック space-y-3
- アイコン: Lucide React、w-8 h-8、text-indigo-600
- ラベル: text-gray-600 text-sm
- 数値: text-indigo-700 font-bold text-2xl
- 単位: text-base ml-1

Props:
- icon: LucideIcon型
- label: string
- value: number
- unit: string

使用トークン:
- color.indigo-600, color.indigo-700, color.gray-600
- spacing-3, spacing-6
- radius-xl
- shadow-md
```

#### 例3: エラーメッセージ表示

```
江戸時代クイズアプリのデザインシステムに従って、エラーメッセージボックスを生成してください。

要件:
- 背景: bg-red-50
- ボーダー: border border-red-200
- テキスト: text-red-700
- パディング: px-4 py-3
- 角丸: rounded-lg
- アイコン: XCircle from lucide-react, w-5 h-5
- レイアウト: flex items-start gap-2

使用トークン:
- color.error-50, color.error-200, color.error-700
- spacing-2, spacing-3, spacing-4
- radius-lg
```

---

### 6.2 モデリングの注意点

#### トークン命名の厳守

**指示例**:
```
このデザインシステムで定義されたトークン名を厳密に守ってください。
- 色: primary, secondary, destructive, success-*, error-*, info-*, warning-*
- スペーシング: spacing-1 〜 spacing-12（4px刻み）
- 角丸: radius-sm, radius-md, radius-lg, radius-xl, radius-2xl, radius-full
- シャドウ: shadow-sm, shadow-md, shadow-lg, shadow-xl

新しいトークン値を勝手に作成しないでください。必ず既定のトークンから選択してください。
```

#### スペーシングの一貫性

**指示例**:
```
スペーシング値は必ず4の倍数を使用してください（4px, 8px, 12px, 16px, 24px, 32px...）。
カスタム値（例: px-5, py-7など）は使用しないでください。
カード内余白はp-6またはp-8、ボタン内余白はpx-4 py-2を標準とします。
```

#### グラデーションの使用

**指示例**:
```
ブランドグラデーションは必ず以下の組み合わせを使用:
- デフォルト: bg-gradient-to-r from-blue-500 to-indigo-600
- ホバー: hover:from-blue-600 hover:to-indigo-700

背景グラデーションは以下から選択:
- メインページ: bg-gradient-to-br from-blue-50 to-indigo-100
- 成功: bg-gradient-to-br from-green-50 to-emerald-50
- エラー: bg-gradient-to-br from-red-50 to-orange-50
- 情報: bg-gradient-to-r from-indigo-50 to-blue-50

これ以外のグラデーション組み合わせは作成しないでください。
```

#### コンポーネントバリエーションの選択

**指示例**:
```
Buttonコンポーネントのvariantは以下から選択してください:
- default: 通常のプライマリアクション
- gradient: ブランド強調アクション（クイズ開始、次へ、送信など）
- outline: 二次アクション（戻る、キャンセル）
- ghost: 軽量アクション
- destructive: 削除・リセット

主要アクションには必ずgradient variantを使用してください。
```

#### レスポンシブデザイン

**指示例**:
```
モバイルファーストで実装してください。
ブレークポイントは md (768px) のみ使用。

グリッドレイアウト例:
- モバイル: grid grid-cols-1
- デスクトップ: md:grid-cols-3

フォントサイズ例:
- モバイル: text-base
- デスクトップ: md:text-sm

フレックスレイアウト例:
- モバイル: flex flex-col
- デスクトップ: sm:flex-row sm:items-center
```

#### アクセシビリティ確保

**指示例**:
```
すべての入力要素にaria-labelを付与してください。
フォーカス可能な要素には必ずfocus-visible:ring-[3px] focus-visible:ring-ring/50を追加。
エラー状態の入力にはaria-invalid="true"を設定。
ボタンのdisabled状態ではopacity-50とpointer-events-noneを適用。
```

---

## 7. 未確定事項・仮説

### 7.1 ダークモード

**状況**: CSS変数にダークモード定義が存在するが、現在のアプリでは使用されていない。

**仮説**: 将来的にダークモード対応が計画されている可能性。

**確認事項**:
- ダークモード実装の優先度
- ダークモード時のグラデーション色の調整方針
- ダークモード切り替えUIの配置

**AIへの指示**:
```
現時点ではライトモードのみを実装してください。
ダークモードクラス（dark:）は使用しないでください。
```

---

### 7.2 アニメーション・トランジション詳細

**状況**: `transition-all`や`duration-300`などの記述はあるが、複雑なアニメーションパターンは限定的。

**仮説**: シンプルなフェード・スライドインのみで、派手なアニメーションは意図的に避けている。

**確認事項**:
- ページ遷移時のアニメーション方針
- モーダル表示時のアニメーション
- ローディング中のアニメーション（スピナーなど）

**AIへの指示**:
```
トランジションは以下に限定してください:
- duration-300: 0.3秒（標準）
- transition-all: すべてのプロパティ
- transition-colors: 色のみ
- fade-in: フェードイン効果

派手なアニメーション（バウンス、スピン、複雑なキーフレーム）は使用しないでください。
```

---

### 7.3 モバイル専用UI

**状況**: レスポンシブ対応はあるが、モバイル専用の大幅なレイアウト変更は見られない。

**仮説**: デスクトップ体験を優先し、モバイルではスクロール・縮小で対応する方針。

**確認事項**:
- モバイルでのハンバーガーメニュー要否
- モバイル専用のスワイプジェスチャー対応
- タブレット専用レイアウトの要否

**AIへの指示**:
```
モバイルでは以下の調整を行ってください:
- コンテンツ幅: 左右px-4で余白確保
- グリッド: 1列表示に変更（md:で複数列）
- テーブル: 横スクロール可能にする（overflow-x-auto）
- フォントサイズ: text-base（デスクトップでmd:text-sm）

モバイル専用の大幅なレイアウト変更は行わないでください。
```

---

### 7.4 多言語対応

**状況**: すべてのテキストが日本語でハードコード。

**仮説**: 現時点では日本語のみ対応、国際化は未計画。

**確認事項**:
- 将来的な英語対応の予定
- i18nライブラリ導入の可能性

**AIへの指示**:
```
テキストはすべて日本語で生成してください。
多言語対応のための抽象化層（i18nなど）は実装しないでください。
```

---

### 7.5 アイコンセットの拡張

**状況**: Lucide Reactから限定的なアイコンのみ使用。

**仮説**: 必要最小限のアイコンセットで統一、カスタムアイコンは不使用。

**確認事項**:
- カスタムSVGアイコンの追加可否
- 他のアイコンライブラリ（Heroicons, Phosphorなど）の併用可否

**AIへの指示**:
```
アイコンはLucide Reactのみ使用してください。
以下のアイコンが利用可能:
- BookOpen, LogIn, UserPlus, Eye, EyeOff, RotateCcw, BarChart3, Settings, LogOut, ChevronRight, CheckCircle2, XCircle

新しいアイコンが必要な場合は、Lucide Reactから選択してください。
サイズは w-4 h-4（16px）、w-5 h-5（20px）、w-6 h-6（24px）、w-8 h-8（32px）から選んでください。
```

---

### 7.6 複雑なフォーム検証

**状況**: 基本的なエラーステート（aria-invalid）はあるが、複雑なバリデーションUIは未実装。

**仮説**: シンプルな検証メッセージ表示のみで、リアルタイム検証やインラインヘルプは最小限。

**確認事項**:
- リアルタイムバリデーションの要否
- フィールド別エラーメッセージの詳細度
- ツールチップやポップオーバーでのヘルプ表示

**AIへの指示**:
```
フォーム検証は以下の方法で実装してください:
- エラー入力: aria-invalid="true" + border-destructive
- エラーメッセージ: bg-red-50 border border-red-200 text-red-700 のボックスをフォーム下部に表示
- リアルタイム検証は行わず、送信時のみチェック

複雑なツールチップやポップオーバーは使用しないでください。
```

---

### 7.7 データテーブルの高度な機能

**状況**: 基本的なソート・フィルタはあるが、ページネーション・仮想スクロール・列リサイズなどは未実装。

**仮説**: データ量が限定的（10〜100件程度）で、高度な機能は不要。

**確認事項**:
- 今後のデータ量増加の見込み
- ページネーション実装の優先度
- CSVエクスポートなどの機能要否

**AIへの指示**:
```
テーブルは以下の機能のみ実装してください:
- ソート: クリックで昇順・降順切り替え
- フィルタ: セレクトボックスで絞り込み
- ホバーハイライト: hover:bg-indigo-50

ページネーション、仮想スクロール、列リサイズ、CSVエクスポートは実装しないでください。
全データを一度に表示する前提で設計してください。
```

---

## 8. 補足: 実装技術スタック

このデザインシステムは以下の技術で構築されています。AIコード生成時はこれらに準拠してください。

| 技術 | バージョン/詳細 |
|-----|--------------|
| **React** | 18.x |
| **TypeScript** | 最新安定版 |
| **Tailwind CSS** | v4（CSS変数ベース） |
| **Radix UI** | コンポーネントプリミティブライブラリ |
| **Lucide React** | アイコンライブラリ |
| **Vite** | ビルドツール |
| **カラースペース** | OKLCH（知覚的に均一な色空間） |

**AIへの指示**:
```
生成するコードは以下の形式に従ってください:
- React関数コンポーネント（TypeScript）
- Tailwind CSSクラス名のみ使用（インラインスタイルやCSS-in-JSは不可）
- Radix UIコンポーネントを基盤とする（Button, Card, Input, Tableなど）
- Lucide Reactからアイコンをインポート
- OKLCH色空間の色定義を尊重（カスタムHEX色の追加禁止）
```

---

以上が、江戸時代クイズアプリのAI Ready デザインシステム（Draft版）です。このドキュメントをプロンプトとして参照することで、一貫性のあるUIコンポーネントを自動生成できます。
