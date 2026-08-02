# ApiPay — Design Tokens

> Nguồn: https://apipay.vn/ · Trích xuất ngày 02/08/2026
> Stack: **Tailwind CSS v4 + shadcn/ui** (Next.js App Router)
> Quy ước màu: semantic token lưu dạng **HSL channel** (`H S% L%`), wrap bằng `hsl()` trong `@theme inline`.

---

## 1. Color — Semantic (Light)

| Token | HSL channels | Hex |
|---|---|---|
| `--background` | `210 40% 99%` | `#FBFCFD` |
| `--foreground` | `0 0% 3.9%` | `#0A0A0A` |
| `--card` | `0 0% 100%` | `#FFFFFF` |
| `--card-foreground` | `0 0% 3.9%` | `#0A0A0A` |
| `--primary` | `0 0% 9%` | `#171717` |
| `--primary-foreground` | `0 0% 98%` | `#FAFAFA` |
| `--secondary` | `210 30% 96%` | `#F2F5F8` |
| `--secondary-foreground` | `0 0% 9%` | `#171717` |
| `--muted` | `210 30% 96%` | `#F2F5F8` |
| `--muted-foreground` | `210 15% 35%` | `#4C5967` |
| `--accent` | `210 30% 96%` | `#F2F5F8` |
| `--accent-foreground` | `0 0% 9%` | `#171717` |
| `--destructive` | `0 84.2% 60.2%` | `#EF4444` |
| `--destructive-foreground` | `0 0% 98%` | `#FAFAFA` |
| `--border` | `210 20% 92%` | `#E7EBEF` |
| `--input` | `0 0% 89.8%` | `#E5E5E5` |
| `--ring` | `0 0% 3.9%` | `#0A0A0A` |

**Ghi chú:** nền và border có hue `210` (xanh lạnh rất nhạt) trong khi text/primary là neutral thuần `0°`. Đây là cách tạo cảm giác "sạch, kỹ thuật" mà vẫn không bị xám phẳng.

## 2. Color — Semantic (Dark, `.dark`)

| Token | HSL channels |
|---|---|
| `--background` | `0 5% 8%` |
| `--foreground` | `0 0% 95%` |
| `--card` | `0 8% 9%` |
| `--card-foreground` | `0 0% 95%` |
| `--primary` | `0 0% 98%` |
| `--primary-foreground` | `0 0% 10%` |
| `--secondary` | `0 7% 12%` |
| `--secondary-foreground` | `0 0% 95%` |
| `--muted` | `0 7% 12%` |
| `--muted-foreground` | `0 0% 65%` |
| `--accent` | `0 8% 16%` |
| `--accent-foreground` | `0 0% 95%` |
| `--destructive` | `0 62.8% 30.6%` |
| `--destructive-foreground` | `0 0% 98%` |
| `--border` | `0 6% 20%` |
| `--input` | `0 6% 20%` |
| `--ring` | `0 0% 75%` |

Ở dark mode hue chuyển sang `0°` với saturation 5–8% → sắc nâu/đỏ cực nhẹ, ấm hơn dark mode xám trung tính.

## 3. Color — Palette phụ (dùng trực tiếp từ Tailwind)

Neutral (border, text phụ, surface):

| Token | Hex |
|---|---|
| `neutral-50` | `#FAFAFA` |
| `neutral-100` | `#F5F5F5` |
| `neutral-200` | `#E5E5E5` |
| `neutral-300` | `#D4D4D4` |
| `neutral-400` | `#A1A1A1` |
| `neutral-500` | `#737373` |
| `neutral-700` | `#404040` |
| `neutral-900` | `#171717` |

Accent trạng thái (terminal demo, badge, status dot):

| Token | Hex |
|---|---|
| `red-50` | `#FEF2F2` |
| `red-200` | `#FFCACA` |
| `red-400` | `#FF6568` |
| `red-500` | `#FB2C36` |
| `red-600` | `#E40014` |
| `red-800` | `#9F0712` |
| `red-900` | `#82181A` |
| `orange-400` | `#FF8B1A` |
| `orange-600` | `#F05100` |
| `amber-300` | `#FFD236` |
| `amber-400` | `#FCBB00` |
| `amber-500` | `#F99C00` |
| `amber-600` | `#DD7400` |

Ngoài ra dùng `emerald-600` và `cyan-700` cho dòng log thành công, `green-400 / yellow-400 / red-400` cho 3 nút giả lập cửa sổ terminal.

## 4. Typography

```css
--font-display: "Space Grotesk", system-ui, sans-serif;
--font-mono: "JetBrains Mono", "SFMono-Regular", Menlo, Monaco,
             Consolas, "Liberation Mono", "Courier New", monospace;
```

`Space Grotesk` cho heading/UI, `JetBrains Mono` cho code, badge, nav label và micro-copy — đây là đặc trưng nhận diện chính của site.

### Type scale

| Token | Size | Line-height |
|---|---|---|
| `--text-xs` | `0.75rem` | `calc(1 / .75)` |
| `--text-sm` | `0.875rem` | `calc(1.25 / .875)` |
| `--text-base` | `1rem` | `calc(1.5 / 1)` |
| `--text-lg` | `1.125rem` | `calc(1.75 / 1.125)` |
| `--text-xl` | `1.25rem` | `calc(1.75 / 1.25)` |
| `--text-2xl` | `1.5rem` | `calc(2 / 1.5)` |
| `--text-3xl` | `1.875rem` | `calc(2.25 / 1.875)` |
| `--text-4xl` | `2.25rem` | `calc(2.5 / 2.25)` |
| `--text-5xl` | `3rem` | `1` |
| `--text-6xl` | `3.75rem` | `1` |

### Letter spacing

| Token | Value |
|---|---|
| `--tracking-tight` | `-0.025em` |
| `--tracking-normal` | `0em` |
| `--tracking-wider` | `0.05em` |
| `--tracking-widest` | `0.1em` |

### Line height

| Token | Value |
|---|---|
| `--leading-tight` | `1.25` |
| `--leading-snug` | `1.375` |
| `--leading-normal` | `1.5` |
| `--leading-relaxed` | `1.625` |

### Giá trị đo thực tế — Hero `h1`

| Thuộc tính | Giá trị |
|---|---|
| font-family | `Space Grotesk` |
| font-size | `48px` |
| font-weight | `600` |
| line-height | `64.8px` (≈1.35) |
| letter-spacing | `-1.2px` (`-0.025em`) |

## 5. Radius

```css
--radius: 0.25rem;
```

| Token | Computed |
|---|---|
| `--radius-sm` | `calc(var(--radius) - 4px)` → `0px` |
| `--radius-md` | `calc(var(--radius) - 2px)` → `2px` |
| `--radius-lg` | `var(--radius)` → `4px` |
| `--radius-xl` | `0.75rem` → `12px` |
| `--radius-2xl` | `1rem` → `16px` |
| `--radius-3xl` | `1.5rem` → `24px` |

Base radius chỉ `4px` — góc gần vuông, đúng tinh thần developer-tool. Các giá trị `xl`+ chỉ dùng cho card lớn và pill badge.

## 6. Spacing & Layout

```css
--spacing: 0.25rem;   /* base unit = 4px, scale Tailwind chuẩn */
```

Các bước spacing thực tế xuất hiện trên trang: `0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8, 10, 12, 16, 20`.
Section padding dọc chủ đạo: `py-16` / `py-20`. Gap grid: `gap-4` → `gap-8`, gap section `gap-12` / `gap-16`.

Có xử lý safe-area cho mobile: `pt-[env(safe-area-inset-top,0px)]`, `pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]`.

### Container

| Token | Value |
|---|---|
| `--container-sm` | `24rem` |
| `--container-md` | `28rem` |
| `--container-xl` | `36rem` |
| `--container-2xl` | `42rem` |
| `--container-3xl` | `48rem` |
| `--container-4xl` | `56rem` |
| `--container-5xl` | `64rem` |
| `--container-6xl` | `72rem` |
| `--container-7xl` | `80rem` |

Breakpoint không được override — dùng mặc định Tailwind (`sm 40rem`, `md 48rem`, `lg 64rem`, `xl 80rem`, `2xl 96rem`).

## 7. Shadow

Shadow **không** được token hoá riêng, dùng preset Tailwind. Một biến thể custom đáng chú ý cho card nổi:

```css
/* soft lift — spread âm lớn, rất mềm */
box-shadow: 0 10px 35px -24px rgb(0 0 0 / 0.18);
```

Các preset còn lại đang dùng: `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`.

## 8. Blog theme (tách biệt, luôn dark)

```css
--blog-bg:           #0F0F0F;
--blog-text:         #F5F5F5;
--blog-muted:        #9CA3AF;
--blog-border:       #2A2A2A;
--blog-code-bg:      #1A1A1A;
--blog-heading-font: var(--font-display), ui-sans-serif, system-ui, sans-serif;
--blog-body-font:    var(--font-mono), ui-monospace, monospace;
```

Blog dùng **mono cho toàn bộ body text** — khác hẳn phần landing.

## 9. Pattern hiệu ứng thường gặp

Alpha overlay cho navbar/header dạng glass: `bg-background/80`, `/88`, `/90`, `/95` kết hợp backdrop blur.
Border mờ dần theo tầng: `border-border/40`, `/60`, `/70`.
Fade gradient nền: `bg-linear-to-b from-transparent via-background/20 to-background/65`.
Tint nhẹ: `bg-foreground/6`, `bg-primary/10`, `bg-card/30`, `bg-muted/30`.
Animation custom: `animate-custom-blink` cho con trỏ typewriter ở hero (`h-[2px] md:h-[4px] bg-primary`).

---

## 10. File copy-paste sẵn (`globals.css`)

```css
@import "tailwindcss";

:root {
  --background: 210 40% 99%;
  --foreground: 0 0% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 98%;
  --secondary: 210 30% 96%;
  --secondary-foreground: 0 0% 9%;
  --muted: 210 30% 96%;
  --muted-foreground: 210 15% 35%;
  --accent: 210 30% 96%;
  --accent-foreground: 0 0% 9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 210 20% 92%;
  --input: 0 0% 89.8%;
  --ring: 0 0% 3.9%;
  --radius: 0.25rem;
}

.dark {
  --background: 0 5% 8%;
  --foreground: 0 0% 95%;
  --card: 0 8% 9%;
  --card-foreground: 0 0% 95%;
  --primary: 0 0% 98%;
  --primary-foreground: 0 0% 10%;
  --secondary: 0 7% 12%;
  --secondary-foreground: 0 0% 95%;
  --muted: 0 7% 12%;
  --muted-foreground: 0 0% 65%;
  --accent: 0 8% 16%;
  --accent-foreground: 0 0% 95%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 6% 20%;
  --input: 0 6% 20%;
  --ring: 0 0% 75%;
}

@theme inline {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));

  --font-display: "Space Grotesk", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "SFMono-Regular", Menlo, Monaco,
               Consolas, "Liberation Mono", "Courier New", monospace;

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  --radius-3xl: 1.5rem;

  --tracking-tight: -0.025em;
  --tracking-wider: 0.05em;
  --tracking-widest: 0.1em;

  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
}
```