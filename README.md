# Order Infra ☁️

![AWS CDK](https://img.shields.io/badge/AWS%20CDK-2.140-blue?logo=amazonaws) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript) ![AWS](https://img.shields.io/badge/AWS-Learning-yellow?logo=amazonaws) ![Practice](https://img.shields.io/badge/Practice-Project-blue)

This repository defines the **infrastructure** for an **Ordering System** using the **AWS Cloud Development Kit (CDK)** with **TypeScript**. It's a practice project to enhance my AWS skills, provisioning resources for the ordering system to run on.

## 🚀 Project Purpose
This project is a hands-on exercise to learn **AWS infrastructure as code (IaC)** with CDK using TypeScript. The `order-infra` repo provisions all necessary AWS resources for the ordering system, ensuring scalability and reliability.

## 🛠️ Tech Stack
- **IaC Tool**: AWS CDK 2.140 🛠️
- **Language**: TypeScript 5.0 📘
- **Build Tool**: npm 📦
- **AWS Services**:
  - **DynamoDB**: For storing orders 📊
  - **Lambda**: For running order processing logic ⚡
  - **API Gateway**: For exposing order endpoints 🌍
  - **IAM**: For secure permissions 🔒
  - **CloudWatch**: For monitoring and logging 📈

## 🌐 AWS Resources (Provisioned)
- **DynamoDB Table**: `OrdersTable` (partition key: `orderId`) 📋
- **Lambda Function**: `OrderFunction` (runs order processing logic) ⚙️
- **API Gateway**: REST API for `/orders` endpoints 🌐
- **IAM Roles**: Least-privilege roles for Lambda to access DynamoDB 🔐
- **CloudWatch Logs**: For debugging and monitoring 📊

## 📂 Repository Structure
```
order-infra/
├── src/
│   ├── lib/           # CDK stack definitions
│   └── bin/           # CDK app entry point
├── test/              # Unit tests
├── package.json       # npm dependencies
├── tsconfig.json      # TypeScript configuration
├── cdk.json
└── README.md
```

## 🏁 Getting Started
1. **Clone the repository**:
   ```bash
   git clone https://github.com/locngoduc/order-infra.git
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Deploy the CDK stack** (requires AWS credentials and CDK CLI):
   ```bash
   npm run build
   cdk deploy
   ```

## 🔗 Related Repositories
- **Application**: [order-service](https://github.com/locngoduc/order-service.git) (Backend service)
- **Orchestrator**: [order-orchestrator](https://github.com/locngoduc/order-orchestrator.git) (Deployment coordination)

## 📚 Learning Goals
- Understand AWS CDK with TypeScript for defining cloud infrastructure
- Provision and manage AWS resources like DynamoDB and Lambda
- Integrate IaC with modern TypeScript practices

## 💡 Why This Impresses
- **AWS CDK Mastery**: Uses TypeScript-based CDK to define a complete cloud architecture
- **Resource Integration**: Seamlessly connects DynamoDB, Lambda, and API Gateway
- **Best Practices**: Implements least-privilege IAM roles and monitoring

---

*Built with 🔧 and ☁️ as a learning project for AWS mastery.*
