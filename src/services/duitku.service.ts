import { createHash } from "node:crypto";
import { env } from "../config/env";
import { HttpError } from "../middlewares/errorHandler";

// Field order below follows Duitku's "Request Transaction" (Pay/Inquiry v2) spec.
// Verify against https://docs.duitku.com if Duitku changes their API.
function requestSignature(merchantOrderId: string, paymentAmount: number): string {
  const raw = `${env.duitku.merchantCode}${merchantOrderId}${paymentAmount}${env.duitku.apiKey}`;
  return createHash("md5").update(raw).digest("hex");
}

// Duitku's callback signature uses a different field order than the request signature.
function callbackSignature(merchantOrderId: string, amount: string): string {
  const raw = `${env.duitku.merchantCode}${amount}${merchantOrderId}${env.duitku.apiKey}`;
  return createHash("md5").update(raw).digest("hex");
}

// The "Get Payment Method" endpoint uses yet another scheme: SHA256 (not MD5)
// over merchantcode+amount+datetime+apiKey. Verify against current Duitku
// docs — this endpoint's field casing/order has changed across API versions.
function paymentMethodSignature(amount: number, datetime: string): string {
  const raw = `${env.duitku.merchantCode}${amount}${datetime}${env.duitku.apiKey}`;
  return createHash("sha256").update(raw).digest("hex");
}

function duitkuDatetime(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function requireConfigured() {
  if (!env.duitku.merchantCode || !env.duitku.apiKey) {
    throw new HttpError(500, "Duitku is not configured (missing merchant code or API key)");
  }
}

export type CreateTransactionInput = {
  merchantOrderId: string;
  paymentAmount: number;
  paymentMethod: string;
  productDetails: string;
  email: string;
  phoneNumber?: string;
  customerName: string;
  returnUrl: string;
  callbackUrl: string;
};

export type PaymentMethodOption = {
  paymentMethod: string;
  paymentName: string;
  paymentImage: string;
  totalFee: string;
};

export type CreateTransactionResult = {
  paymentUrl: string;
  reference: string;
  statusCode: string;
  statusMessage: string;
};

export type DuitkuCallbackPayload = {
  merchantCode?: string;
  amount?: string;
  merchantOrderId?: string;
  resultCode?: string;
  reference?: string;
  signature?: string;
};

export const duitkuService = {
  async createTransaction(input: CreateTransactionInput): Promise<CreateTransactionResult> {
    requireConfigured();

    const res = await fetch(`${env.duitku.baseUrl}/webapi/api/merchant/v2/inquiry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchantCode: env.duitku.merchantCode,
        paymentAmount: input.paymentAmount,
        paymentMethod: input.paymentMethod,
        merchantOrderId: input.merchantOrderId,
        productDetails: input.productDetails,
        email: input.email,
        phoneNumber: input.phoneNumber,
        customerVaName: input.customerName,
        callbackUrl: input.callbackUrl,
        returnUrl: input.returnUrl,
        signature: requestSignature(input.merchantOrderId, input.paymentAmount),
      }),
    });

    const body = (await res.json().catch(() => null)) as {
      paymentUrl?: string;
      reference?: string;
      statusCode?: string;
      statusMessage?: string;
    } | null;

    if (!res.ok || !body?.paymentUrl) {
      throw new HttpError(502, body?.statusMessage ?? "Failed to create Duitku transaction");
    }

    return {
      paymentUrl: body.paymentUrl,
      reference: body.reference ?? "",
      statusCode: body.statusCode ?? "",
      statusMessage: body.statusMessage ?? "",
    };
  },

  async getPaymentMethods(amount: number): Promise<PaymentMethodOption[]> {
    requireConfigured();

    const datetime = duitkuDatetime();

    const res = await fetch(`${env.duitku.baseUrl}/webapi/api/merchant/paymentmethod/getpaymentmethod`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchantcode: env.duitku.merchantCode,
        amount,
        datetime,
        signature: paymentMethodSignature(amount, datetime),
      }),
    });

    const body = (await res.json().catch(() => null)) as {
      paymentFee?: PaymentMethodOption[];
      responseMessage?: string;
    } | null;

    if (!res.ok || !body?.paymentFee) {
      throw new HttpError(502, body?.responseMessage ?? "Failed to load Duitku payment methods");
    }

    return body.paymentFee;
  },

  verifyCallback(payload: DuitkuCallbackPayload): boolean {
    requireConfigured();

    if (
      !payload.merchantCode ||
      !payload.amount ||
      !payload.merchantOrderId ||
      !payload.signature ||
      payload.merchantCode !== env.duitku.merchantCode
    ) {
      return false;
    }

    const expected = callbackSignature(payload.merchantOrderId, payload.amount);
    return expected === payload.signature;
  },
};
