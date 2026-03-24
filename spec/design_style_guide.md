**IntelliProof UI Design Style Guide**

---

## 🎭 Visual Design Goals

The IntelliProof UI should feel:

* **Minimal** – Clean spacing, whitespace, no visual clutter
* **Crisp** – High contrast, sharp component outlines
* **Professional** – Balanced use of color and typography
* **Structured** – Clear visual hierarchy and affordances

---

## 🖌️ Fonts

### Main Font: **Josefin Sans (Light)**

* Source: [Google Fonts – Josefin Sans](https://fonts.google.com/specimen/Josefin+Sans)
* Use for: Headings, labels, primary UI text
* Characteristics: Tall, elegant, geometric, highly legible

### Main Alternative: **Century Gothic**

* Purpose: Fallback font when Josefin Sans unavailable

### Secondary Font: **PT Serif (Regular)**

* Source: [Google Fonts – PT Serif](https://fonts.google.com/specimen/PT+Serif?query=PT+SERIF)
* Use for: Long-form text (e.g., evidence previews, reports)
* Characteristics: Humanist serif for contrast and readability

---

## 🎨 Color Palette

### **Primary Colors**

* **Black**
  HEX: `#000000`
  RGB: (0, 0, 0)
  Use for: Text, borders, default graph lines, high contrast elements

* **Yellow**
  HEX: `#FDD000`
  RGB: (253, 208, 0)
  Use for: Highlights, call-to-action buttons, alerts

* **Teal**
  HEX: `#4FD9BD`
  RGB: (79, 217, 189)
  Use for: Node fill (factual), accent lines, badges

* **Indigo**
  HEX: `#7283D9`
  RGB: (114, 131, 217)
  Use for: Node fill (value), secondary action buttons

### Optional Secondary Background

* Very light gray or white: `#FAFAFA` or `#FFFFFF`
* Use generous spacing and large paddings

---

## 📄 Component Styling Guidelines

### Graph Nodes

* Font: Josefin Sans, size 14–16px
* Fill color by claim type:

  * Factual → Teal `#4FD9BD`
  * Value → Indigo `#7283D9`
  * Policy → Yellow `#FDD000`
* Text color: Black or very dark gray `#000000`
* Border: 1px solid black

### Evidence Cards

* Font: Josefin Sans 14px bold for title, PT Serif 13px for content
* Border: Light gray, rounded corners
* Confidence Badge: Yellow border + label text
* Drag handle: Custom icon (3-line handle or evidence icon)

### Buttons

* Primary: Yellow background with black text, hover darkens yellow
* Secondary: Outline buttons using indigo or teal
* Font: Josefin Sans, 13–14px, uppercase

### Chat Panel

* Message bubbles:

  * User → Right-aligned, black text on light gray
  * AI → Left-aligned, black text on white, border: `#DDD`
* Font: Josefin Sans, max-width: 80ch

### Toasts / Alerts

* Background: Yellow `#FDD000`
* Text: Black
* Font: Josefin Sans bold 13px

---

## 🔄 Layout + Spacing

* Base unit: 8px spacing grid
* Container max-width: 1200–1400px
* Component padding: 16–24px
* Mobile responsiveness with collapsible sidebars

---

## ✏️ Additional Notes

* Use **transitions** for hover/focus (150–250ms ease-out)
* Avoid box shadows unless layering is needed
* Use **iconography** sparingly and with purpose
* Visual affordance for draggable elements (handles or glow on hover)


