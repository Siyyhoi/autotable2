# Migration Guide: Old → New Structure

## 🎯 สำหรับ AI Agents และ Developers

เอกสารนี้อธิบายวิธีการทำงานกับโครงสร้างใหม่ที่แยก Frontend/Backend อย่างชัดเจน

---

## 📁 Directory Mapping

### ไฟล์ที่ย้ายแล้ว

| Old Location                         | New Location                                             | Type     |
| ------------------------------------ | -------------------------------------------------------- | -------- |
| `components/DataPreview.tsx`         | `frontend/src/components/tables/DataPreview.tsx`         | Frontend |
| `components/MasterScheduleTable.tsx` | `frontend/src/components/tables/MasterScheduleTable.tsx` | Frontend |
| `components/ScheduleTable.tsx`       | `frontend/src/components/tables/ScheduleTable.tsx`       | Frontend |
| `components/TimetableClassic.tsx`    | `frontend/src/components/tables/TimetableClassic.tsx`    | Frontend |
| `components/aichatpanel.tsx`         | `frontend/src/components/ui/AIChatPanel.tsx`             | Frontend |
| `components/config/*`                | `frontend/src/components/config/*`                       | Frontend |
| `app/page.tsx`                       | `frontend/src/app/page.tsx`                              | Frontend |
| `app/layout.tsx`                     | `frontend/src/app/layout.tsx`                            | Frontend |
| `app/globals.css`                    | `frontend/src/app/globals.css`                           | Frontend |
| `app/api/*`                          | `backend/src/routes/api/*`                               | Backend  |
| `lib/mongodb.ts`                     | `backend/src/config/database.ts`                         | Backend  |
| `lib/excel-processor.ts`             | `backend/src/utils/excel-processor.ts`                   | Backend  |
| `prisma/*`                           | `backend/prisma/*`                                       | Backend  |
| `scripts/*`                          | `backend/scripts/*`                                      | Backend  |
| `data/*`                             | `backend/data/*`                                         | Backend  |
| `public/*`                           | `frontend/public/*`                                      | Frontend |

---

## 🔧 Import Path Updates

### Frontend Components

**เดิม**:

```typescript
import DataPreview from "../components/DataPreview";
import { someUtil } from "../lib/utils";
```

**ใหม่**:

```typescript
import DataPreview from "@/components/tables/DataPreview";
import { someUtil } from "@/lib/utils";
```

### Backend Modules

**เดิม**:

```typescript
import { processExcel } from "../lib/excel-processor";
import { connectDB } from "../lib/mongodb";
```

**ใหม่**:

```typescript
import { processExcel } from "@/utils/excel-processor";
import { connectDB } from "@/config/database";
```

### Shared Types

**Frontend**:

```typescript
import { Teacher, Subject, Schedule } from "@shared/types";
```

**Backend**:

```typescript
import { Teacher, Subject, Schedule } from "@shared/types";
```

---

## 🚀 Command Changes

### Development

**เดิม**:

```bash
npm run dev
```

**ใหม่** (รัน frontend + backend พร้อมกัน):

```bash
npm run dev
```

**ใหม่** (รันแยก):

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

### Installation

**เดิม**:

```bash
npm install
```

**ใหม่** (install ทุก workspace):

```bash
npm run install:all
```

---

## 🗂️ Working Directory Context

### สำหรับ AI Agents

เมื่อ AI Agent ทำงานกับโปรเจคนี้ ควรระบุ context ดังนี้:

#### 🎨 Frontend Work (UI, Components, Pages)

- **Working Directory**: `frontend/`
- **Import Alias**: `@/` → `frontend/src/`
- **Shared Types**: `@shared/types`
- **Focus**: React components, UI logic, client-side functionality

**ตัวอย่าง Task**:

> "อยู่ใน Frontend workspace - แก้ไข ScheduleTable component เพิ่ม filter functionality"

#### ⚙️ Backend Work (API, Database, Services)

- **Working Directory**: `backend/`
- **Import Alias**: `@/` → `backend/src/`
- **Shared Types**: `@shared/types`
- **Focus**: API routes, business logic, database operations, AI integration

**ตัวอย่าง Task**:

> "อยู่ใน Backend workspace - สร้าง schedule generation service ใช้ Groq AI"

#### 🔗 Shared Work (Types, Constants)

- **Working Directory**: `shared/`
- **Import**: `@shared/types`, `@shared/constants`
- **Focus**: Type definitions, shared utilities, constants

**ตัวอย่าง Task**:

> "อยู่ใน Shared workspace - เพิ่ม type definitions สำหรับ new feature"

---

## 📝 Best Practices

### สำหรับ Human Developers

1. **ทำงานในถูก workspace**
   - UI/Components → `frontend/`
   - API/Database → `backend/`
   - Types → `shared/`

2. **ใช้ path aliases**
   - Frontend: `@/components/...`, `@/lib/...`
   - Backend: `@/services/...`, `@/utils/...`
   - Shared: `@shared/types`

3. **Run tests ในแต่ละ workspace**
   ```bash
   cd frontend && npm test
   cd backend && npm test
   ```

### สำหรับ AI Agents

1. **ระบุ context ชัดเจน**
   - บอกว่ากำลังทำงานใน workspace ไหน
   - ใช้ path ที่ถูกต้องตาม workspace

2. **ตรวจสอบ imports**
   - ใช้ `@/` สำหรับ internal imports
   - ใช้ `@shared/` สำหรับ shared types

3. **อ้างอิง README**
   - Frontend: `frontend/README.md`
   - Backend: `backend/README.md`
   - Root: `README.md`

---

## 🔍 Quick Reference

### ต้องการแก้ UI?

→ `frontend/src/components/`

### ต้องการแก้ API?

→ `backend/src/routes/api/`

### ต้องการแก้ Business Logic?

→ `backend/src/services/`

### ต้องการแก้ Database?

→ `backend/prisma/schema.prisma`

### ต้องการเพิ่ม Type?

→ `shared/types/`

### ต้องการ run scripts?

→ `backend/scripts/`

---

## ⚠️ Important Notes

1. **อย่าทำงานข้าม workspace โดยตรง**
   - Frontend ไม่ควร import จาก `backend/src/` โดยตรง
   - ใช้ API calls แทน

2. **Shared types เท่านั้นที่ใช้ร่วมกันได้**
   - `@shared/types` - OK ✅
   - `backend/src/utils` จาก frontend - ❌

3. **Environment variables**
   - `.env` อยู่ที่ root level
   - ทั้ง frontend และ backend ใช้ร่วมกัน

---

## 🎓 Learning Resources

- **Frontend Guide**: [frontend/README.md](./frontend/README.md)
- **Backend Guide**: [backend/README.md](./backend/README.md)
- **API Reference**: [backend/docs/API.md](./backend/docs/API.md) (coming soon)
