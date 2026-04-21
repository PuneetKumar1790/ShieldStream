# 🛡️ ShieldStream — Secure Video Streaming Platform

ShieldStream is a security-focused video streaming backend built to help protect premium content through encrypted delivery, authenticated access, and backend-controlled streaming.

Built as a hackathon prototype, it explores practical protection models for creators and growing platforms that cannot easily adopt enterprise DRM systems.

---

## 🌍 Why ShieldStream?

Digital piracy continues to create major business challenges across media and education.

Industry estimates often cite:

- **$75B+** annual global losses linked to digital piracy  
- **₹2,000 Cr** estimated losses impacting Indian EdTech ecosystems  
- **62%** of premium courses facing unauthorized sharing within weeks of launch  

(Indicative public industry estimates used to highlight market demand.)

ShieldStream is designed to reduce common abuse paths such as exposed links, weak access control, and uncontrolled content delivery.

---

## 🔐 Core Features

### Secure Upload Pipeline

- Upload premium video content
- Convert to HLS streaming format (`.m3u8 + .ts`)
- Apply AES-128 encryption
- Store assets securely in Azure Blob Storage

### Authenticated Streaming

- JWT-based access control
- Session validation using MongoDB
- Protected streaming endpoints

### Controlled Access

- Short-lived signed storage access
- Backend proxy delivery
- No direct client exposure to raw storage URLs

### Secure Playback

- Encrypted HLS segments
- HTTPS delivery
- Browser playback via HLS.js

---

## 🎥 How It Works

```text
Upload Video
   ↓
Process with FFmpeg
   ↓
HLS Segments + AES Encryption
   ↓
Store in Azure Blob Storage
   ↓
User Login
   ↓
JWT + Session Validation
   ↓
Backend Proxy Streams Media
   ↓
Secure Playback
