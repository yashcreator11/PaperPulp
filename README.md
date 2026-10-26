# 🏭 WMIND – Wonderbiz Manufacturing Intelligence & Networking Devices

## 📌 Overview

**WMIND** (Wonderbiz Manufacturing Intelligence and Networking Devices) is a full-stack industrial manufacturing intelligence platform designed to collect, manage, visualize, and analyze real-time data from manufacturing assets. 

The platform enables seamless communication between field-level devices and asset-level systems, supporting: 

- ✅ Real-time monitoring
- ✅ Historical analysis
- ✅ Reporting
- ✅ AI-powered Root Cause Analysis (RCA)

WMIND is built using a **modular, event-driven, and scalable microservice architecture**, making it suitable for **Industry 4.0** and smart manufacturing environments.

---

## 🎯 Problem Statement

Manufacturing environments often suffer from:

- ❌ Disconnected industrial devices
- ❌ Limited real-time visibility into machine health
- ❌ Manual and time-consuming troubleshooting
- ❌ Poor scalability and lack of advanced analytics

**WMIND solves these challenges by providing:**

- ✅ Centralized device and asset management
- ✅ Real-time and historical signal monitoring
- ✅ Automated alerts and notifications
- ✅ Intelligent RCA using Large Language Models

---

## 🧠 Key Capabilities

| Capability | Description |
|-----------|-------------|
| 🔧 **Device Onboarding** | Industrial device onboarding and configuration |
| 📡 **ModbusTCP** | Data acquisition from industrial devices |
| 🏭 **Asset Hierarchy** | Asset hierarchy management and signal mapping |
| 🔄 **Event-Driven** | Event-driven data flow using RabbitMQ |
| 📊 **Time-Series** | Time-series data storage using InfluxDB |
| 📈 **Visualization** | Real-time and historical signal visualization |
| 📑 **Reports** | Report generation (CSV, PDF, Excel) |
| 🔐 **Security** | Role-based user access and security |
| 🤖 **AI-RCA** | AI-powered Root Cause Analysis |
| 🐳 **Docker** | Containerized deployment using Docker |

---

## 🏗️ High-Level Architecture

WMIND follows a **distributed microservice architecture** to ensure scalability, reliability, and loose coupling. 

<img width="593" height="727" alt="Architecture hld" src="https://github.com/user-attachments/assets/dc1c0d8e-cecb-41a4-b808-3a90c10222bf" />

<img width="593" height="400" alt="diagram-export-22-12-2025-14_03_52" src="https://github.com/user-attachments/assets/171e1e1e-59c9-4661-8bb7-722ecc393291" />



### 🔹 **Web Client (React)**
- Secure user interface
- Device, asset, signal, report, and analytics management

### 🔹 **Device Service (.NET Core)**
- Manages device onboarding and configuration
- Communicates with industrial devices using ModbusTCP
- Publishes real-time signal data to RabbitMQ

### 🔹 **Asset Service (.NET Core)**
- Manages asset hierarchy and configurations
- Consumes signal data from RabbitMQ
- Maps signals to their corresponding assets

### 🔹 **Message Broker (RabbitMQ)**
- Reliable asynchronous communication
- Loose coupling between services
- Improved scalability and fault tolerance

### 🔹 **Time-Series Database (InfluxDB)**
- Stores high-frequency signal data with timestamps
- Optimized for time-based querying and analytics

### 🔹 **RCA Service (Node.js + LLMs)**
- Intelligent Root Cause Analysis
- Uses LLaMA / Gemini with Qdrant vector database
- Provides contextual explanations for anomalies

### 🔹 **Relational Database (SQL Server)**
- Stores metadata, configurations, users, and mappings

---

## 🛠️ Technology Stack

### **Frontend**
- ⚛️ **ReactJS** - Modern UI framework
- 📊 **Recharts** - Data visualization
- 🎯 **Driver.js** - Guided user tour
- 🔗 **Axios** - HTTP client
- 🎨 **Tailwind CSS & shadcn/ui** - Styling

### **Backend**
- 🔷 **ASP.NET Core (C#)** - Main backend services
- 🟢 **Node.js** - RCA Service

### **Databases**
- 🗄️ **SQL Server** - Metadata & Configurations
- ⏱️ **InfluxDB** - Time-Series Signal Data
- 🧠 **Qdrant** - Vector Database

### **Messaging & Protocols**
- 🐰 **RabbitMQ** - Message broker
- 📡 **ModbusTCP** - Industrial protocol

### **DevOps & Deployment**
- 🐳 **Docker** - Container-based hosting
- 📦 **Docker Compose** - Orchestration

### **Testing**
- 🌐 **Selenium** - UI Automation
- 🧪 **PyTest** - Python testing

---

## 📊 Core Features

### 🔧 **Device Management**
- ✅ Add, update, and delete devices
- ✅ Bulk upload via CSV / Excel
- ✅ Soft delete and recovery
- ✅ Secure access with Two-Factor Authentication (2FA)

### 🏭 **Asset Management**
- ✅ Hierarchical asset structure
- ✅ Signal selection per asset
- ✅ Device-to-asset mapping

### 📡 **Signal Monitoring**
- ✅ Real-time signal visualization
- ✅ Historical trend analysis
- ✅ Zoom and spike inspection

### 🔔 **Notifications**
- ✅ Automatic alert generation
- ✅ Read / unread status tracking
- ✅ Persistent notification history

### 📑 **Reporting**
- ✅ Date-range based reports
- ✅ CSV, PDF, and Excel export
- ✅ Asset and signal-based filtering

### 🧠 **Root Cause Analysis (RCA)**
- ✅ AI-driven anomaly explanation
- ✅ LLM-powered insights
- ✅ Faster troubleshooting and diagnosis

### 🔐 **Security**
- ✅ JWT-based authentication
- ✅ Role-based access control
- ✅ Secure REST APIs

### 🐳 **Deployment**
- ✅ Dockerized frontend and backend services
- ✅ Environment-specific configurations
- ✅ Ready for CI/CD integration

---

## 📈 Future Enhancements

- 🎨 Advanced visualization dashboards
- 📊 Predictive analytics and forecasting
- 🔔 Configurable alarm thresholds and alert rules
- 📱 Mobile application support
- ⚙️ Full CI/CD automation

---

## 🐳 Run Locally – Dockerized Setup Guide

### 📋 Prerequisites

Ensure the following are installed:

```bash
✅ Docker
✅ Docker Compose
✅ Git
```

### **Step 1: Clone the Repository**

```bash
git clone <repository-url>
cd <project-root>
```

### **Step 2: Create `docker-compose.yml`**

Create a file in the project root with the following services:

```yaml
# docker-compose.yml
# Includes:  SQL Server, InfluxDB, RabbitMQ, Qdrant,
# Backend services, API Gateway, AI/RCA Server, Frontend
```

### **Step 3: Create `.env` File**

```env
# Database
SA_PASSWORD=<strong-password>
JWT_KEY=<your-jwt-secret>

# RabbitMQ
RABBIT_USER=guest
RABBIT_PASS=guest

# InfluxDB
INFLUX_ORG=Wonderbiz
INFLUX_BUCKET=SignalValueTeleMentry

# LLM API Keys
GROQ_API_KEY=<your-groq-key>
GEMINI_API_KEY=<your-gemini-key>
```

> ⚠️ **Note:** Do not start all services yet.

### **Step 4: Build Docker Images**

```bash
docker compose build
```

### **Step 5: Start InfluxDB Only**

```bash
docker compose up -d influxdb
```

### **Step 6: Initialize InfluxDB**

1. Open: **http://localhost:8086**
2. Create username & password
3. Set organization: `Wonderbiz`
4. Create bucket: `signals`
5. Generate API token

### **Step 7: Update `.env`**

```env
INFLUX_TOKEN=<generated-token>
INFLUX_ORG=Wonderbiz
INFLUX_BUCKET=SignalValueTeleMentry
```

### **Step 8: Start All Services**

```bash
docker compose up -d
```

### **Step 9: Access Services**

| Service | URL |
|---------|-----|
| 🌐 **Frontend** | http://localhost:5000 |
| 🐰 **RabbitMQ UI** | http://localhost:15672 | 
| ⏱️ **InfluxDB UI** | http://localhost:8086 |
| 📊 **vector DB** | http://localhost:6333 |

### **Step 10: Verify Containers**

```bash
docker ps
docker compose logs -f
```

### **Step 11: Stop Application**

```bash
# Stop services
docker compose down

# Stop and remove volumes
docker compose down -v
```

---

## 🏁 Conclusion

**WMIND** is a scalable, secure, and intelligent manufacturing intelligence platform that bridges the gap between industrial devices and actionable insights.

With **real-time monitoring**, **advanced analytics**, **AI-powered Root Cause Analysis**, and **modern deployment practices**, WMIND is well-positioned for smart factory and **Industry 4.0** use cases.

---

<div align="center">

**Prepared by:** WMIND Project Team

**Last Updated:** January 2026

</div>
#   P a p e r P u l p  
 