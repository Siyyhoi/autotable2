# Frontend - AutoTable2

Frontend application สำหรับระบบสร้างตารางสอนอัตโนมัติ

## 🏗️ Structure

```
src/
├── @types/           # TypeScript types
├── app/              # Next.js App Router pages
├── components/       # React components
│   ├── config/      # Configuration UI
│   ├── tables/      # Table display components
│   └── ui/          # Reusable UI components
├── hooks/           # Custom React hooks
├── lib/             # Utilities
├── styles/          # Global styles
└── utils/           # Helper functions
```

## 🚀 Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## 📦 Components

### Config Components

- `ConfigRoom.tsx` - Room management
- `ConfigStudentGroup.tsx` - Student group management
- `ConfigSubject.tsx` - Subject management
- `ConfigTeacher.tsx` - Teacher management
- `ConfigTeach.tsx` - Teaching assignment
- `ConfigStudentRes.tsx` - Student registration

### Table Components

- `DataPreview.tsx` - Preview imported data
- `MasterScheduleTable.tsx` - Master schedule view
- `ScheduleTable.tsx` - Individual schedule view
- `TimetableClassic.tsx` - Classic timetable format

### UI Components

- `AIChatPanel.tsx` - AI chat interface

## 🎨 Styling

ใช้ **TailwindCSS 4** สำหรับ styling:

- Utility-first CSS
- Custom theme configuration
- Responsive design
- Dark mode support (future)

## 🔗 API Integration

Frontend เชื่อมต่อกับ Backend API ผ่าน:

- `/api/generate` - Schedule generation
- `/api/export-schedule` - Export to PDF/Excel
- `/api/import-schedule` - Import from CSV
- `/api/master-data` - CRUD operations

## 📝 Notes

- ใช้ Next.js App Router (ไม่ใช่ Pages Router)
- Component ทั้งหมดเป็น TypeScript
- ใช้ `@/` path alias สำหรับ imports
