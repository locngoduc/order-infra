#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { OrderInfraStack } from '../lib/order-infra-stack';

import * as dotenv from 'dotenv';
import * as path from 'path';

const envFile = process.env.ENV || '.env.dev';
dotenv.config({ path: path.resolve(__dirname, '..', envFile) });

const envName = process.env.ENV_NAME;
const account = process.env.ACCOUNT_ID;
const region = process.env.REGION;

if (!account || !region || !envName) {
  throw new Error('Missing environment variables.');
}

const app = new cdk.App();
new OrderInfraStack(app, `OrderInfraStack-${envName}`, {
  env: { account, region },
});