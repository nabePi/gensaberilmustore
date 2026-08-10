declare module 'midtrans-client' {
  export interface MidtransClientOptions {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }

  export interface MidtransItemDetail {
    id: string;
    price: number;
    quantity: number;
    name: string;
  }

  export interface MidtransTransactionParameter {
    transaction_details: { order_id: string; gross_amount: number };
    customer_details?: {
      first_name?: string;
      email?: string;
      phone?: string;
      shipping_address?: { address?: string; city?: string };
    };
    item_details?: MidtransItemDetail[];
    enabled_payments?: string[];
  }

  export interface MidtransSnapTransactionResponse {
    token: string;
    redirect_url: string;
  }

  export interface MidtransVaNumber {
    bank: string;
    va_number: string;
  }

  export interface MidtransTransactionStatusResponse {
    order_id: string;
    transaction_status: string;
    fraud_status?: string;
    gross_amount: string;
    va_numbers?: MidtransVaNumber[];
  }

  export class Snap {
    constructor(options: MidtransClientOptions);
    createTransaction(
      parameter: MidtransTransactionParameter,
    ): Promise<MidtransSnapTransactionResponse>;
  }

  export class CoreApi {
    constructor(options: MidtransClientOptions);
    transaction: {
      status(transactionId: string): Promise<MidtransTransactionStatusResponse>;
    };
  }
}
