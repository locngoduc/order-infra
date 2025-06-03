# Order Infra ☁️

![AWS CDK](https://img.shields.io/badge/AWS%20CDK-2.140-blue?logo=amazonaws) ![Java](https://img.shields.io/badge/Java-21-orange?logo=java) ![AWS](https://img.shields.io/badge/AWS-Learning-yellow?logo=amazonaws) ![Practice](https://img.shields.io/badge/Practice-Project-blue)

This repository defines the **infrastructure** for an **Ordering System** using the **AWS Cloud Development Kit (CDK)** with **Java**. It’s a practice project to enhance my AWS skills, provisioning resources for the Java-based `order-service` to run on.

## 🚀 Project Purpose
This project is a hands-on exercise to learn **AWS infrastructure as code (IaC)** with CDK using Java. The `order-infra` repo provisions all necessary AWS resources for the ordering system, ensuring scalability and reliability for the `order-service` application.

## 🛠️ Tech Stack
- **IaC Tool**: AWS CDK 2.140 🛠️
- **Language**: Java 21 ☕
- **Build Tool**: Maven 📦
- **AWS Services**:
  - **DynamoDB**: For storing orders 📊
  - **Lambda**: For running order processing logic ⚡
  - **API Gateway**: For exposing order endpoints 🌍
  - **IAM**: For secure permissions 🔒
  - **CloudWatch**: For monitoring and logging 📈

## 🌐 AWS Resources (Provisioned)
- **DynamoDB Table**: `OrdersTable` (partition key: `orderId`) 📋
- **Lambda Function**: `OrderFunction` (runs Java code from `order-service`) ⚙️
- **API Gateway**: REST API for `/orders` endpoints 🌐
- **IAM Roles**: Least-privilege roles for Lambda to access DynamoDB 🔐
- **CloudWatch Logs**: For debugging and monitoring 📊

## 📂 Repository Structure
```
order-infra/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/example/orderinfra/
│   │   │       ├── stack/       # CDK stack definitions
│   │   │       └── construct/   # Custom constructs
│   └── test/
│       └── java/                # Unit tests
├── pom.xml                      # Maven dependencies
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
   mvn install
   ```
3. **Deploy the CDK stack** (requires AWS credentials and CDK CLI):
   ```bash
   mvn compile exec:java -Dexec.mainClass="com.example.orderinfra.App"
   ```

## 🔗 Related Repositories
- **Application**: [order-service](https://github.com/locngoduc/order-service.git) (Java backend)
- **Orchestrator**: [order-orchestrator](https://github.com/locngoduc/order-orchestrator.git) (Deployment coordination)

## 📚 Learning Goals
- Understand AWS CDK with Java for defining cloud infrastructure.
- Provision and manage AWS resources like DynamoDB and Lambda.
- Integrate IaC with a Java application.

## 💡 Why This Impresses
- **AWS CDK Mastery**: Uses Java-based CDK to define a complete cloud architecture.
- **Resource Integration**: Seamlessly connects DynamoDB, Lambda, and API Gateway.
- **Best Practices**: Implements least-privilege IAM roles and monitoring.

---

*Built with 🔧 and ☁️ as a learning project for AWS mastery.*
