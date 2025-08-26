# Audio Input Fields Documentation

This document lists all the input fields where microphone buttons have been added throughout the IntelliProof application.

## 1. AI Copilot Chat Input
**Location:** `src/components/GraphCanvas/GraphCanvas.tsx` - AI Copilot panel
**Component:** Chat input form in the AI Copilot tab
**Button Position:** Left of the existing SparklesIcon (ask) button
**Styling:** Purple color (`text-purple-500 hover:text-purple-600`)
**Functionality:** Currently does nothing

## 2. Add Evidence Modal - Title Input
**Location:** `src/components/GraphCanvas/GraphCanvas.tsx` - Add Evidence modal
**Component:** Title input field in the evidence creation form
**Button Position:** Right side of the input field
**Styling:** Black color (`text-black hover:text-gray-700`)
**Functionality:** Currently does nothing

## 3. Add Evidence Modal - Excerpt/Lines Textarea (PDF Flow)
**Location:** `src/components/GraphCanvas/GraphCanvas.tsx` - Add Evidence modal
**Component:** Excerpt/Lines textarea when document type is PDF
**Button Position:** Top-right corner of the textarea
**Styling:** Black color (`text-black hover:text-gray-700`)
**Functionality:** Currently does nothing

## 4. Add Evidence Modal - Excerpt/Lines Textarea (Image Flow)
**Location:** `src/components/GraphCanvas/GraphCanvas.tsx` - Add Evidence modal
**Component:** Excerpt/Lines textarea when document type is Image
**Button Position:** Top-right corner of the textarea
**Styling:** Black color (`text-black hover:text-gray-700`)
**Functionality:** Currently does nothing

## 5. Claim Properties Modal - Claim Text Textarea
**Location:** `src/components/NodeProperties/NodeProperties.tsx` - Claim Properties panel
**Component:** Claim Text textarea in the node properties form
**Button Position:** Top-right corner of the textarea
**Styling:** Black color (`text-black hover:text-gray-700`)
**Functionality:** Currently does nothing

## 6. New Note Modal - Title Input
**Location:** `src/components/GraphCanvas/NoteEditorModal.tsx` - New Note modal
**Component:** Title input field in the note creation form
**Button Position:** Right side of the input field
**Styling:** Black color (`text-black hover:text-gray-700`)
**Functionality:** Currently does nothing

## 7. New Note Modal - Text Textarea
**Location:** `src/components/GraphCanvas/NoteEditorModal.tsx` - New Note modal
**Component:** Text textarea in the note creation form
**Button Position:** Top-right corner of the textarea
**Styling:** Black color (`text-black hover:text-gray-700`)
**Functionality:** Currently does nothing

## 8. Upload Supporting Document Modal - Name Input
**Location:** `src/components/GraphCanvas/SupportingDocumentUploadModal.tsx` - Upload modal
**Component:** Name input field in the document upload form
**Button Position:** Right side of the input field
**Styling:** Black color (`text-black hover:text-gray-700`)
**Functionality:** Currently does nothing

## Implementation Details

### Button Styling
- **Icon:** Microphone SVG icon with consistent styling
- **Size:** `w-4 h-4` for most inputs, `w-5 h-5` for AI Copilot
- **Padding:** `p-1.5` for most buttons, `p-2` for AI Copilot
- **Positioning:** Absolute positioning with appropriate right/top offsets

### Input Field Modifications
- **Container:** Wrapped in `relative` div for absolute button positioning
- **Padding:** Added `pr-12` to input fields to accommodate button space
- **Functionality:** All buttons currently have empty onClick handlers

### SVG Icon Path
All microphone buttons use the same SVG path:
```svg
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
```

## Future Implementation Notes
- All microphone buttons are currently placeholder implementations
- Audio recording functionality will need to be added to each button's onClick handler
- Consider implementing a shared audio recording service/component
- May need to handle different audio input requirements for different contexts
