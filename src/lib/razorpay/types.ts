export type RazorpaySubscriptionEvent =
  | "subscription.activated"
  | "subscription.charged"
  | "subscription.halted"
  | "subscription.cancelled"
  | "subscription.completed"
  | "subscription.pending_deactivated";

export interface RazorpaySubscriptionEntity {
  id: string; // Razorpay subscription ID
  plan_id: string;
  status: string;
  current_end: number; // Unix timestamp (seconds)
  notes: {
    user_id?: string; // Our Supabase user ID (set at creation)
    [key: string]: string | undefined;
  };
}

export interface RazorpayWebhookPayload {
  event: RazorpaySubscriptionEvent;
  payload: {
    subscription: {
      entity: RazorpaySubscriptionEntity;
    };
  };
}
