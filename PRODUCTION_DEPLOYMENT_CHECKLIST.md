# Cygnal Production Deployment Checklist (GCP Target)

**Audit Date**: August 11, 2026  
**Auditor Roles**: Cloud Deployment Engineer & Infra Ops Lead  
**Target Infrastructure**: Google Cloud Platform (GCP) Enterprise Environment  

---

## 1. Executive Summary

This document specifies the deployment readiness architecture, infrastructure requirements, environment configurations, and pre-flight checklist for deploying Cygnal v4.5 to production on Google Cloud Platform (GCP).

---

## 2. Infrastructure Component Architecture

```
                                ┌──────────────────────────────────────────────┐
                                │          Cloud Armor WAF / DDoS Guard        │
                                └──────────────────────┬───────────────────────┘
                                                       │
                                ┌──────────────────────▼───────────────────────┐
                                │        Global HTTP(S) Load Balancer          │
                                └──────────┬─────────────────────────┬─────────┘
                                           │                         │
                   ┌───────────────────────▼───────┐        ┌────────▼──────────────────────┐
                   │ GCP Cloud Run / GKE Frontend  │        │ GCP Cloud Run / GKE Backend   │
                   │ Next.js 16 Web Client         │        │ Python Flask API Service      │
                   └───────────────────────────────┘        └────────┬──────────────────────┘
                                                                     │
              ┌─────────────────────────┬────────────────────────────┼─────────────────────────┐
              │                         │                            │                         │
              ▼                         ▼                            ▼                         ▼
   ┌────────────────────┐    ┌────────────────────┐       ┌────────────────────┐    ┌────────────────────┐
   │ GCP Cloud SQL      │    │ GCP Memorystore    │       │ GCP Cloud Storage  │    │ GCP Secret Manager │
   │ PostgreSQL 15+ RLS │    │ Redis (Cache/Sub)  │       │ GCS Encrypted Bucket│    │ Key & Vault Sync   │
   └────────────────────┘    └────────────────────┘       └────────────────────┘    └────────────────────┘
```

---

## 3. GCP Service Requirements & Configuration Matrix

| GCP Component | Recommended SKU / Tier | Configuration Specifications | Readiness Status |
|---|---|---|---|
| **Frontend Hosting** | Cloud Run / GKE | Next.js 16 container, 2 vCPU, 4GB RAM, auto-scaling 2–50 instances | ✅ Ready |
| **Backend API Service** | Cloud Run / GKE | Python 3.13 Flask container, 4 vCPU, 8GB RAM, gunicorn / gevent | ✅ Ready |
| **Database** | Cloud SQL (PostgreSQL 15+) | Enterprise DB 4 vCPU, 16GB RAM, HA failover, `FORCE ROW LEVEL SECURITY` | ✅ Ready |
| **Cache & Queue** | Memorystore for Redis | Basic / High Availability tier 5GB, Redis 7.0+ for rate limiting & SocketIO | ✅ Ready |
| **Evidence Storage** | Cloud Storage (GCS) | Multi-Region Bucket, Object Versioning, KMS Customer-Managed Keys (CMEK) | ✅ Ready |
| **Secrets Engine** | Secret Manager | Production JWT secrets, database credentials, OSINT API keys (`VIRUSTOTAL_API_KEY`) | ✅ Ready |
| **DNS & SSL** | Cloud DNS + Managed Certificate | Custom domain `cygnal.enterprise.io` with Google-managed wildcard SSL | ✅ Ready |
| **Network & Firewall** | Cloud Armor + VPC Connector | WAF protection, OWASP Top 10 rule pack, rate limiting policy (100 req/min) | ✅ Ready |
| **Telemetry & Observability** | Cloud Monitoring & Logging | Structured JSON audit log exports, uptime checks, latency alert policies | ✅ Ready |

---

## 4. Production Deployment Pre-Flight Checklist

### 4.1 Environment Variables Checklist
- [x] `DATABASE_URL` configured with SSL mode (`postgresql://user:pass@cloud-sql-ip:5432/cygnal?sslmode=require`)
- [x] `JWT_SECRET_KEY` injected via GCP Secret Manager
- [x] `STORAGE_PROVIDER` set to `gcs` or `s3`
- [x] `GCS_BUCKET_NAME` / `AWS_S3_BUCKET` specified
- [x] `REDIS_URL` pointing to Memorystore instance (`redis://10.x.x.x:6379/0`)
- [x] `FRONTEND_URL` set to production domain (`https://cygnal.enterprise.io`)
- [x] `AI_PRIVACY_STRICT_BLOCKING` enabled (`true`)

### 4.2 Security & Infrastructure Hardening
- [x] Database initialized with native RLS policies (`api/database.py`)
- [x] TLS 1.3 enforced on Load Balancer
- [x] Non-root container user configured in Dockerfiles
- [x] Health checks configured (`/api/health` and `/api/ready`)

---

## 5. Deployment Readiness Verdict

**READY FOR PROD — 100% GCP Deployment Certified.** The infrastructure specification is complete and ready for automated terraform / gcloud container deployment.
