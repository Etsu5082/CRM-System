# Kubernetes Deployment Guide

## Directory Structure

```
k8s/
├── namespace.yaml                    # CRM Namespace
├── configmap.yaml                    # ConfigMaps
├── secrets.yaml                      # Secrets (DO NOT commit)
├── auth-service-deployment.yaml      # Auth Service
├── customer-service-deployment.yaml  # Customer Service
├── sales-activity-service-deployment.yaml  # Sales Activity Service
├── opportunity-service-deployment.yaml     # Opportunity Service
├── analytics-service-deployment.yaml       # Analytics Service
├── api-gateway-deployment.yaml       # API Gateway
└── ingress.yaml                      # Ingress configuration
```

## Quick Start

### 1. Create Namespace
```bash
kubectl apply -f namespace.yaml
```

### 2. Create Secrets
```bash
# Edit secrets.yaml with your values
kubectl apply -f secrets.yaml
```

### 3. Create ConfigMap
```bash
kubectl apply -f configmap.yaml
```

### 4. Deploy Infrastructure (PostgreSQL, Kafka, Redis)
```bash
# Using Helm
helm install postgresql bitnami/postgresql --namespace crm-system --values postgresql-values.yaml
helm install kafka bitnami/kafka --namespace crm-system --values kafka-values.yaml
helm install redis bitnami/redis --namespace crm-system --values redis-values.yaml
```

### 5. Deploy Microservices
```bash
kubectl apply -f auth-service-deployment.yaml
kubectl apply -f customer-service-deployment.yaml
kubectl apply -f sales-activity-service-deployment.yaml
kubectl apply -f opportunity-service-deployment.yaml
kubectl apply -f analytics-service-deployment.yaml
kubectl apply -f api-gateway-deployment.yaml
```

### 6. Deploy Ingress
```bash
kubectl apply -f ingress.yaml
```

### 7. Verify Deployment
```bash
kubectl get pods -n crm-system
kubectl get services -n crm-system
kubectl get ingress -n crm-system
```

## Scaling

```bash
# Manual scaling
kubectl scale deployment auth-service --replicas=5 -n crm-system

# HPA is configured automatically for CPU and memory
kubectl get hpa -n crm-system
```

## Monitoring

```bash
# View logs
kubectl logs -f deployment/auth-service -n crm-system

# Port forward for local access
kubectl port-forward svc/auth-service 3100:3100 -n crm-system
```
